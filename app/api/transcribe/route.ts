import { NextRequest, NextResponse } from "next/server";
import { HuggingFaceService } from "@/lib/services/ai/HuggingFaceService";
import { AIError } from "@/lib/services/ai/AIService";

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
    const transcript = await hfService.transcribeAudio(audio);

    // Privacy: Audio data is automatically discarded after processing
    // We never store the raw audio

    return NextResponse.json({
      transcript,
      confidence: undefined, // Hugging Face Whisper doesn't always return confidence
    });
  } catch (error) {
    console.error("Transcription error:", error);
    
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

