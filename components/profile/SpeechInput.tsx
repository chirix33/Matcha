"use client";

import { useState, useRef, useCallback } from "react";
import { startRecording, stopRecording, transcribeAudio } from "@/lib/services/speechToText";

interface SpeechInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  className?: string;
}

export default function SpeechInput({
  value,
  onChange,
  placeholder = "Enter text or use voice input...",
  label,
  required = false,
  error,
  className = "",
}: SpeechInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const handleStartRecording = useCallback(async () => {
    try {
      setTranscriptionError(null);
      const recorder = await startRecording();
      recorderRef.current = recorder;
      setIsRecording(true);

      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        setIsRecording(false);
        setIsTranscribing(true);

        try {
          const result = await transcribeAudio(audioBlob, {
            language: "en",
            model: "openai/whisper-small",
          });

          if (result.error) {
            throw new Error(result.error);
          }

          // Append transcript to existing value or replace if empty
          const newValue = value ? `${value} ${result.transcript}` : result.transcript;
          onChange(newValue);
          setShowFallback(false);
        } catch (err) {
          console.error("Transcription error:", err);
          setTranscriptionError(
            err instanceof Error ? err.message : "Transcription failed. Please use text input."
          );
          setShowFallback(true);
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
    } catch (err) {
      console.error("Recording error:", err);
      setTranscriptionError("Microphone access denied. Please use text input.");
      setShowFallback(true);
      setIsRecording(false);
    }
  }, [value, onChange]);

  const handleStopRecording = useCallback(() => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.stop();
    }
  }, [isRecording]);

  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  }, [isRecording, handleStartRecording, handleStopRecording]);

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Privacy Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
        <p className="font-semibold mb-1">Privacy Notice</p>
        <p>
          Voice input uses Hugging Face&apos;s Whisper AI service. Audio is processed and
          immediately discarded. <strong>English speakers only.</strong> Please avoid sharing
          sensitive personal information in voice input.
        </p>
      </div>

      {/* Speech Input Controls */}
      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <textarea
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setTranscriptionError(null);
              setShowFallback(false);
            }}
            placeholder={placeholder}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-matcha-primary ${
              error || transcriptionError
                ? "border-red-500"
                : "border-gray-300"
            } ${showFallback ? "bg-yellow-50" : ""}`}
            rows={4}
            disabled={isTranscribing}
          />
          {(error || transcriptionError) && (
            <p className="mt-1 text-sm text-red-600">{error || transcriptionError}</p>
          )}
        </div>

        {/* Microphone Button */}
        <button
          type="button"
          onClick={handleToggleRecording}
          disabled={isTranscribing}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            isRecording
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-matcha-primary hover:bg-matcha-secondary text-white"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          {isTranscribing ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              Processing...
            </span>
          ) : isRecording ? (
            <span className="flex items-center gap-2">
              <span className="animate-pulse">🔴</span>
              Stop
            </span>
          ) : (
            <span className="flex items-center gap-2">
              🎤 Record
            </span>
          )}
        </button>
      </div>

      {/* Fallback Text Input Notice */}
      {showFallback && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 text-sm text-yellow-800">
          <p>
            <strong>Fallback Mode:</strong> Speech-to-text is unavailable. Please use the text
            input above.
          </p>
        </div>
      )}
    </div>
  );
}

