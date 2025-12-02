import { NextRequest, NextResponse } from "next/server";
import { HuggingFaceService } from "@/lib/services/ai/HuggingFaceService";
import { AIError } from "@/lib/services/ai/AIService";
import { auditLogger } from "@/lib/services/AuditLogger";
import { ASRErrorType, ASRFailureTracker } from "@/lib/services/ASRFailureTracker";

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

    // Check for poor quality transcription (empty or very short)
    const minTranscriptLength = 10;
    const isPoorQuality = transcript.length > 0 && transcript.length < minTranscriptLength;

    return NextResponse.json({
      transcript,
      confidence: undefined, // Hugging Face Whisper doesn't always return confidence
      errorType: isPoorQuality ? ASRErrorType.POOR_QUALITY : undefined,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    
    // Audit log: Failure
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    auditLogger.logHuggingFaceCall("transcribeAudio", "audio_data", 0, false, errorMessage);
    
    // Categorize error for client-side tracking
    let errorType: ASRErrorType = ASRErrorType.UNKNOWN;
    
    // Handle AIError with appropriate status codes and error categorization
    if (error instanceof AIError) {
      // Map AIError codes to ASRErrorType
      if (error.code === "TIMEOUT") {
        errorType = ASRErrorType.TIMEOUT;
      } else if (error.code === "SERVICE_UNAVAILABLE") {
        errorType = ASRErrorType.SERVICE_UNAVAILABLE;
      } else {
        errorType = ASRFailureTracker.categorizeError(error);
      }
      
      const statusCode = error.code === "TIMEOUT" ? 408 : error.code === "SERVICE_UNAVAILABLE" ? 503 : 500;
      return NextResponse.json(
        {
          error: error.message,
          transcript: "",
          errorType,
        },
        { status: statusCode }
      );
    }

    // Categorize non-AIError errors
    const errorForCategorization = error instanceof Error ? error : error ? String(error) : undefined;
    errorType = ASRFailureTracker.categorizeError(errorForCategorization);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Transcription failed",
        transcript: "",
        errorType,
      },
      { status: 500 }
    );
  }
}

