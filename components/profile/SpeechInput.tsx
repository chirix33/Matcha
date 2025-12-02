"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { startRecording, stopRecording, transcribeAudio } from "@/lib/services/speechToText";
import { asrFailureTracker, ASRErrorType, ASRFailureTracker } from "@/lib/services/ASRFailureTracker";

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
  const [isDisabled, setIsDisabled] = useState(false);
  const [hasWarning, setHasWarning] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);

  // Check failure tracker status on mount and periodically
  useEffect(() => {
    const checkStatus = () => {
      const stats = asrFailureTracker.getStats();
      setIsDisabled(stats.shouldDisable);
      setHasWarning(stats.hasWarning);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleStartRecording = useCallback(async () => {
    // Check if speech-to-text should be disabled
    if (asrFailureTracker.shouldDisableSpeechToText()) {
      setTranscriptionError("Speech-to-text is temporarily disabled due to repeated failures. Please use text input.");
      setShowFallback(true);
      setIsDisabled(true);
      return;
    }

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

          // Track the attempt
          if (result.error || result.isPoorQuality || !result.transcript) {
            // Determine error type
            let errorType = result.errorType;
            if (!errorType) {
              if (result.isPoorQuality) {
                errorType = ASRErrorType.POOR_QUALITY;
              } else if (!result.transcript) {
                errorType = ASRErrorType.EMPTY_RESULT;
              } else {
                errorType = ASRErrorType.UNKNOWN;
              }
            }

            // Track failure
            asrFailureTracker.trackAttempt(
              false,
              errorType,
              result.transcript?.length || 0
            );

            // Update UI state
            const stats = asrFailureTracker.getStats();
            setIsDisabled(stats.shouldDisable);
            setHasWarning(stats.hasWarning);

            // Show appropriate error message
            const errorMessage = getErrorMessage(errorType, result.isPoorQuality);
            setTranscriptionError(errorMessage);
            setShowFallback(true);
          } else {
            // Track success
            asrFailureTracker.trackAttempt(
              true,
              undefined,
              result.transcript.length
            );

            // Append transcript to existing value or replace if empty
            const newValue = value ? `${value} ${result.transcript}` : result.transcript;
            onChange(newValue);
            setShowFallback(false);

            // Update UI state
            const stats = asrFailureTracker.getStats();
            setIsDisabled(stats.shouldDisable);
            setHasWarning(stats.hasWarning);
          }
        } catch (err) {
          console.error("Transcription error:", err);
          
          // Categorize and track error
          const errorForCategorization = err instanceof Error ? err : err ? String(err) : undefined;
          const errorType = ASRFailureTracker.categorizeError(errorForCategorization);
          asrFailureTracker.trackAttempt(false, errorType);

          // Update UI state
          const stats = asrFailureTracker.getStats();
          setIsDisabled(stats.shouldDisable);
          setHasWarning(stats.hasWarning);

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
      
      // Categorize microphone error
      const errorType = ASRErrorType.MICROPHONE_DENIED;
      asrFailureTracker.trackAttempt(false, errorType);

      // Update UI state
      const stats = asrFailureTracker.getStats();
      setIsDisabled(stats.shouldDisable);
      setHasWarning(stats.hasWarning);

      setTranscriptionError("Microphone access denied. Please use text input.");
      setShowFallback(true);
      setIsRecording(false);
    }
  }, [value, onChange]);

  // Helper function to get user-friendly error messages
  const getErrorMessage = (errorType?: ASRErrorType, isPoorQuality?: boolean): string => {
    if (isPoorQuality) {
      return "Transcription quality is poor. Please try speaking more clearly or use text input.";
    }

    switch (errorType) {
      case ASRErrorType.TIMEOUT:
        return "Transcription timed out. Please try again or use text input.";
      case ASRErrorType.SERVICE_UNAVAILABLE:
        return "Speech-to-text service is temporarily unavailable. Please use text input.";
      case ASRErrorType.MICROPHONE_DENIED:
        return "Microphone access denied. Please enable microphone permissions or use text input.";
      case ASRErrorType.NETWORK_ERROR:
        return "Network error. Please check your connection and try again, or use text input.";
      case ASRErrorType.EMPTY_RESULT:
        return "No transcription received. Please try again or use text input.";
      case ASRErrorType.POOR_QUALITY:
        return "Transcription quality is poor. Please try speaking more clearly or use text input.";
      default:
        return "Transcription failed. Please use text input.";
    }
  };

  // Handle manual re-enable
  const handleReEnable = useCallback(() => {
    asrFailureTracker.resetFailureTracking();
    setIsDisabled(false);
    setHasWarning(false);
    setTranscriptionError(null);
    setShowFallback(false);
  }, []);

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

      {/* Warning Banner (High failure rate but not disabled) */}
      {hasWarning && !isDisabled && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-md p-3 text-sm text-yellow-800">
          <p className="font-semibold mb-1">⚠️ High Error Rate Detected</p>
          <p>
            Speech-to-text is experiencing issues. If problems continue, it will be automatically disabled.
            You can continue using text input at any time.
          </p>
        </div>
      )}

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
          disabled={isTranscribing || isDisabled}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            isRecording
              ? "bg-red-500 hover:bg-red-600 text-white"
              : isDisabled
              ? "bg-gray-400 text-gray-600 cursor-not-allowed"
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
          ) : isDisabled ? (
            <span className="flex items-center gap-2">
              🚫 Disabled
            </span>
          ) : (
            <span className="flex items-center gap-2">
              🎤 Record
            </span>
          )}
        </button>
      </div>

      {/* Fallback Text Input Notice */}
      {showFallback && !isDisabled && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 text-sm text-yellow-800">
          <p>
            <strong>Fallback Mode:</strong> Speech-to-text encountered an error. Please use the text
            input above.
          </p>
        </div>
      )}

      {/* Disabled State Notice */}
      {isDisabled && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
          <p className="font-semibold mb-2">
            🚫 Speech-to-Text Temporarily Disabled
          </p>
          <p className="mb-2">
            Speech-to-text has been automatically disabled due to repeated failures. 
            Please use the text input above to continue.
          </p>
          <button
            type="button"
            onClick={handleReEnable}
            className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-xs font-medium"
          >
            Re-enable Speech-to-Text
          </button>
        </div>
      )}
    </div>
  );
}

