import { ASRErrorType, ASRFailureTracker } from "./ASRFailureTracker";

export interface TranscriptionOptions {
  language?: string;
  model?: string;
}

export interface TranscriptionResult {
  transcript: string;
  confidence?: number;
  error?: string;
  errorType?: ASRErrorType; // Error category for tracking
  isPoorQuality?: boolean; // Detected misrecognition (empty or very short transcript)
}

/**
 * Converts audio blob to base64 string for API transmission
 */
export async function audioBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix if present
      const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Calls the Next.js API route for transcription
 */
export async function transcribeAudio(
  audioBlob: Blob,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  try {
    const base64Audio = await audioBlobToBase64(audioBlob);

    const response = await fetch("/api/transcribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio: base64Audio,
        language: options.language || "en",
        model: options.model || "openai/whisper-small",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const transcript = data.transcript || "";
    
    // Detect misrecognitions (poor quality transcriptions)
    const minTranscriptLength = 10; // Minimum characters for quality check
    const isPoorQuality = transcript.length > 0 && transcript.length < minTranscriptLength;
    
    // Get error type from response or categorize the error
    const errorType = data.errorType || (data.error ? ASRFailureTracker.categorizeError(data.error) : undefined);
    
    return {
      transcript,
      confidence: data.confidence,
      errorType,
      isPoorQuality,
    };
  } catch (error) {
    // Categorize the error
    const errorForCategorization = error instanceof Error ? error : error ? String(error) : undefined;
    const errorType = ASRFailureTracker.categorizeError(errorForCategorization);
    
    return {
      transcript: "",
      error: error instanceof Error ? error.message : "Transcription failed",
      errorType,
      isPoorQuality: false, // No transcript to check quality
    };
  }
}

/**
 * Records audio from user's microphone
 */
export async function startRecording(): Promise<MediaRecorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = MediaRecorder.isTypeSupported("audio/webm")
    ? "audio/webm"
    : MediaRecorder.isTypeSupported("audio/mp4")
    ? "audio/mp4"
    : "audio/webm"; // fallback

  const recorder = new MediaRecorder(stream, { mimeType });
  return recorder;
}

/**
 * Stops recording and returns the audio blob
 */
export function stopRecording(recorder: MediaRecorder): Promise<Blob> {
  return new Promise((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        resolve(event.data);
      }
    };
    recorder.onerror = reject;
    recorder.stop();
    recorder.stream.getTracks().forEach((track) => track.stop());
  });
}

