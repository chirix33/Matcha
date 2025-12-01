"use client";

import { useState, useEffect, useCallback } from "react";
import { useProfileFormContext } from "@/lib/contexts/ProfileFormContext";
import SpeechInput from "./SpeechInput";

// Simple parsing fallback function
function parseSkillsFallback(transcript: string): string[] {
  return transcript
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export default function Step2Skills() {
  const { formData, updateField, errors } = useProfileFormContext();
  const [transcript, setTranscript] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  // Extract skills using OpenAI API
  const extractSkills = useCallback(async (text: string) => {
    if (!text.trim()) {
      updateField("skills", []);
      return;
    }

    setIsExtracting(true);
    setExtractionError(null);
    setUsedFallback(false);

    try {
      const response = await fetch("/api/extract-skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcript: text }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.skills && Array.isArray(data.skills) && data.skills.length > 0) {
        updateField("skills", data.skills);
      } else {
        // If API returns empty, try fallback
        const fallbackSkills = parseSkillsFallback(text);
        if (fallbackSkills.length > 0) {
          updateField("skills", fallbackSkills);
          setUsedFallback(true);
        } else {
          updateField("skills", []);
        }
      }
    } catch (error) {
      console.error("Skills extraction failed, using fallback:", error);
      // Fallback to simple parsing
      const fallbackSkills = parseSkillsFallback(text);
      updateField("skills", fallbackSkills);
      setUsedFallback(true);
      setExtractionError("AI extraction failed, using basic parsing");
    } finally {
      setIsExtracting(false);
    }
  }, [updateField]);

  // Initialize transcript from existing skills when component mounts
  useEffect(() => {
    if (formData.skills.length > 0 && !transcript) {
      setTranscript(formData.skills.join(", "));
    }
  }, [formData.skills, transcript]);

  const removeSkill = (skill: string) => {
    const updatedSkills = formData.skills.filter((s) => s !== skill);
    updateField("skills", updatedSkills);

    // Update transcript to reflect removed skill
    const updatedTranscript = updatedSkills.join(", ");
    setTranscript(updatedTranscript);
  };

  const handleManualExtract = () => {
    if (transcript.trim()) {
      extractSkills(transcript);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Skills</h2>
        <p className="text-gray-600">
          Record your skills using voice input. Click the "Add Skills" button to extract skills from your transcript. You can review and edit the transcript before proceeding.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Skills <span className="text-red-500">*</span>
            <span className="ml-2 text-xs font-normal text-gray-500">
              (Critical Field - Highlighted)
            </span>
          </label>

          {/* Speech Input for Skills - Voice Only */}
          <SpeechInput
            value={transcript}
            onChange={(value) => {
              setTranscript(value);
              setExtractionError(null);
              setUsedFallback(false);
            }}
            placeholder="Record your skills using the microphone button, or edit the transcript directly..."
            required
            error={errors.skills}
            className="border-2 border-matcha-accent rounded-lg p-3 bg-matcha-light/30"
          />

          {/* Manual Extract Button */}
          {transcript.trim() && !isExtracting && (
            <div className="mt-2">
              <button
                type="button"
                onClick={handleManualExtract}
                className="px-4 py-2 bg-matcha-secondary text-white rounded-md hover:bg-matcha-primary text-sm font-medium"
              >
                Add Skills
              </button>
            </div>
          )}

          {/* Loading Indicator */}
          {isExtracting && (
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
              <span className="animate-spin">⏳</span>
              <span>Adding skills...</span>
            </div>
          )}

          {/* Skills Tags Display */}
          {formData.skills.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Extracted Skills (click × to remove):
              </p>
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-matcha-accent text-white rounded-full text-sm"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="hover:text-red-200 font-bold"
                      aria-label={`Remove ${skill}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Error Messages */}
          {errors.skills && (
            <p className="mt-2 text-sm text-red-600">{errors.skills}</p>
          )}

          {extractionError && (
            <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-md p-2">
              <p className="text-sm text-yellow-800">{extractionError}</p>
            </div>
          )}

          {usedFallback && !extractionError && (
            <div className="mt-2 bg-blue-50 border border-blue-200 rounded-md p-2">
              <p className="text-sm text-blue-800">
                Using basic parsing. For better results, ensure your transcript clearly lists skills separated by commas.
              </p>
            </div>
          )}
        </div>

        {/* Privacy Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
          <p className="font-semibold mb-1">Privacy Notice: OpenAI API Usage</p>
          <p className="mb-2">
            <strong>Third-Party AI Service:</strong> When you click &quot;Add Skills&quot;, your transcript text is sent to <strong>OpenAI&apos;s API</strong> to extract and normalize skills.
          </p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li><strong>What is sent:</strong> Only the transcript text you enter or record (no personal information like name, email, or phone)</li>
            <li><strong>What happens:</strong> OpenAI processes the text to identify skills and immediately discards the transcript</li>
            <li><strong>What is stored:</strong> Only the extracted skills are saved to your profile</li>
            <li><strong>Privacy protection:</strong> The transcript is automatically checked and sanitized to remove any potential personal information before being sent</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
