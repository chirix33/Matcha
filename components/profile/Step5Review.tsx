"use client";

import { useProfileFormContext } from "@/lib/contexts/ProfileFormContext";
import type { CompanySize, RemotePreference, SeniorityLevel } from "@/types/profile";

const formatSeniority = (level: SeniorityLevel): string => {
  const map: Record<SeniorityLevel, string> = {
    entry: "Entry Level",
    junior: "Junior",
    mid: "Mid-Level",
    senior: "Senior",
    lead: "Lead/Principal",
  };
  return map[level];
};

const formatCompanySize = (size: CompanySize): string => {
  const map: Record<CompanySize, string> = {
    small: "Small (1-50 employees)",
    medium: "Medium (51-500 employees)",
    large: "Large (500+ employees)",
  };
  return map[size];
};

const formatRemotePreference = (pref: RemotePreference): string => {
  const map: Record<RemotePreference, string> = {
    remote: "Fully Remote",
    hybrid: "Hybrid",
    onsite: "On-Site",
    flexible: "Flexible",
  };
  return map[pref];
};

export default function Step5Review() {
  const { formData, updateField, errors } = useProfileFormContext();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review & Submit</h2>
        <p className="text-gray-600">Please review your information before submitting.</p>
      </div>

      {/* Review Sections */}
      <div className="space-y-6 bg-gray-50 p-6 rounded-lg">
        {/* Basic Info */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
          <div className="bg-white p-4 rounded-md space-y-2">
            <p>
              <span className="font-medium">Name:</span> {formData.name || "Not provided"}
            </p>
            <p>
              <span className="font-medium">Email:</span> {formData.email || "Not provided"}
            </p>
            {formData.phone && (
              <p>
                <span className="font-medium">Phone:</span> {formData.phone}
              </p>
            )}
          </div>
        </section>

        {/* Skills */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Skills</h3>
          <div className="bg-white p-4 rounded-md">
            <p className="font-medium mb-2">Skills:</p>
            <div className="flex flex-wrap gap-2">
              {formData.skills.length > 0 ? (
                formData.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 bg-matcha-accent text-white rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-gray-500">No skills added</span>
              )}
            </div>
          </div>
        </section>

        {/* Experience */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Experience</h3>
          <div className="bg-white p-4 rounded-md space-y-2">
            <p>
              <span className="font-medium">Years of Experience:</span> {formData.yearsExperience}
            </p>
            <p>
              <span className="font-medium">Seniority Level:</span>{" "}
              {formatSeniority(formData.seniority)}
            </p>
            {formData.keyAchievements && (
              <div>
                <span className="font-medium">Key Achievements:</span>
                <p className="mt-1 text-gray-700 whitespace-pre-wrap">
                  {formData.keyAchievements}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Preferences */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Preferences</h3>
          <div className="bg-white p-4 rounded-md space-y-2">
            <div>
              <span className="font-medium">Desired Roles:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {formData.desiredRoles.length > 0 ? (
                  formData.desiredRoles.map((role) => (
                    <span
                      key={role}
                      className="px-3 py-1 bg-matcha-primary text-white rounded-full text-sm"
                    >
                      {role}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500">No roles specified</span>
                )}
              </div>
            </div>
            <p>
              <span className="font-medium">Company Size:</span>{" "}
              {formatCompanySize(formData.preferredCompanySize)}
            </p>
            <div>
              <span className="font-medium">Industries:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {formData.industries.length > 0 ? (
                  formData.industries.map((industry) => (
                    <span
                      key={industry}
                      className="px-3 py-1 bg-matcha-secondary text-white rounded-full text-sm"
                    >
                      {industry}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500">No industries specified</span>
                )}
              </div>
            </div>
            <p>
              <span className="font-medium">Remote Preference:</span>{" "}
              {formatRemotePreference(formData.remotePreference)}
            </p>
          </div>
        </section>
      </div>

      {/* Privacy Notice */}
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Privacy Notice</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <div>
            <p className="mb-2">
              <strong>Third-Party AI Services:</strong> This application uses:
            </p>
            <ul className="list-disc list-inside mt-1 ml-2 mb-2">
              <li>Hugging Face&apos;s Whisper AI service for speech-to-text transcription</li>
              <li>OpenAI&apos;s API for extracting and normalizing skills from transcripts</li>
            </ul>
            <p>
              Your audio is processed and immediately discarded. Transcripts are sent to OpenAI for skills extraction and then discarded. Only the extracted skills are stored in your profile.
            </p>
          </div>
          <p>
            <strong>Data Usage:</strong> Your profile data will be used to match you with
            relevant job opportunities. Personal identifiers (name, email, phone) are stored
            separately from anonymized profile features used for matching.
          </p>
          <p>
            <strong>English Only:</strong> The speech-to-text feature currently supports English
            speakers only.
          </p>
        </div>
      </div>

      {/* Consent Checkbox */}
      <div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.privacyConsent}
            onChange={(e) => updateField("privacyConsent", e.target.checked)}
            className="mt-1 w-5 h-5 text-matcha-primary border-gray-300 rounded focus:ring-matcha-primary"
            required
          />
          <span className="text-sm text-gray-700">
            I have read and agree to the privacy notice above. I understand that my audio data is
            processed by Hugging Face&apos;s Whisper AI service and my transcripts are processed by OpenAI&apos;s API for skills extraction. All data is immediately discarded after processing.{" "}
            <span className="text-red-500">*</span>
          </span>
        </label>
        {errors.privacyConsent && (
          <p className="mt-1 text-sm text-red-600">{errors.privacyConsent}</p>
        )}
      </div>
    </div>
  );
}

