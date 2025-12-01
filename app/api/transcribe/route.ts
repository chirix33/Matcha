import { NextRequest, NextResponse } from "next/server";

const HUGGING_FACE_API_URL = "https://qhcp162snl1rmh0q.us-east-1.aws.endpoints.huggingface.cloud";
const TIMEOUT_MS = 60000; // 60 seconds - audio transcription can take longer

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

    // Use server-side environment variable (not NEXT_PUBLIC_)
    const apiKey = process.env.HUGGING_FACE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Hugging Face API key not configured" },
        { status: 500 }
      );
    }

    // Call Hugging Face Inference API with timeout
    // HuggingFace expects JSON format: { "inputs": base64String, "parameters": {} }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      // Log request info for debugging (without sensitive data)
      console.log(`[Transcribe] Sending request to HuggingFace API (audio length: ${audio.length} chars)`);

      const response = await fetch(`${HUGGING_FACE_API_URL}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: audio, // base64 encoded audio string
          parameters: {},
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Transcribe] HuggingFace API error: ${response.status} - ${errorText}`);
        
        // Handle model loading case
        if (response.status === 503) {
          throw new Error("Model is loading. Please try again in a few seconds.");
        }
        
        // Handle timeout from HuggingFace
        if (response.status === 504 || response.status === 408) {
          throw new Error("Request timed out. The audio might be too long. Please try a shorter recording.");
        }
        
        throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`[Transcribe] Success - received transcript (length: ${result.text?.length || 0})`);

      // Hugging Face Whisper returns { text: "transcript" }
      const transcript = result.text || "";

      // Privacy: Audio data is automatically discarded after processing
      // We never store the raw audio

      return NextResponse.json({
        transcript,
        confidence: result.confidence || undefined,
      });
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.error("[Transcribe] Request timeout after", TIMEOUT_MS, "ms");
        throw new Error("Transcription request timed out. Please try again with a shorter recording.");
      }
      throw fetchError;
    }
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Transcription failed",
        transcript: "",
      },
      { status: 500 }
    );
  }
}

