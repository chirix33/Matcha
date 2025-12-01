import { NextRequest, NextResponse } from "next/server";
import { HuggingFaceService } from "@/lib/services/ai/HuggingFaceService";
import { AIError } from "@/lib/services/ai/AIService";
import { auditLogger } from "@/lib/services/AuditLogger";

/**
 * POST /api/transcribe
 * 
 * Privacy Boundary: This endpoint receives ONLY audio data (no PII).
 * Audio is sent to Hugging Face Whisper API for transcription.
 * Audio data is processed and immediately discarded - never stored.
 * Only the transcript text is returned to the client.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audio } = body;

    if (!audio) {
      return NextResponse.json(
        { error: "Audio data is required" },
        { status: 400 }
      );
    }

    // Use AI Integration Service
    const hfService = new HuggingFaceService();
    const audioSize = typeof audio === "string" ? audio.length : 0;
    const transcript = await hfService.transcribeAudio(audio);

    // Audit log: Success (privacy boundary crossing logged after successful call)
    auditLogger.logHuggingFaceCall("transcribeAudio", "audio_data", audioSize, true);

    // Privacy: Audio data is automatically discarded after processing
    // We never store the raw audio

    return NextResponse.json({
      transcript,
      confidence: undefined, // Hugging Face Whisper doesn't always return confidence
    });
  } catch (error) {
    console.error("Transcription error:", error);
    
    // Audit log: Failure
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    auditLogger.logHuggingFaceCall("transcribeAudio", "audio_data", 0, false, errorMessage);
    
    // Handle AIError with appropriate status codes
    if (error instanceof AIError) {
      const statusCode = error.code === "TIMEOUT" ? 408 : error.code === "SERVICE_UNAVAILABLE" ? 503 : 500;
      return NextResponse.json(
        {
          error: error.message,
          transcript: "",
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Transcription failed",
        transcript: "",
      },
      { status: 500 }
    );
  }
}

