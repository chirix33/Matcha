"use client";

import { useProfileFormContext } from "@/lib/contexts/ProfileFormContext";
import SpeechInput from "./SpeechInput";
import type { SeniorityLevel } from "@/types/profile";

const seniorityOptions: { value: SeniorityLevel; label: string }[] = [
  { value: "entry", label: "Entry Level" },
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid-Level" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead/Principal" },
];

export default function Step3Experience() {
  const { formData, updateField, errors } = useProfileFormContext();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Experience Summary</h2>
        <p className="text-gray-600">Tell us about your professional experience.</p>
      </div>

      <div className="space-y-4">
        {/* Years of Experience */}
        <div>
          <label
            htmlFor="yearsExperience"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Years of Experience{" "}
            <span className="text-red-500">*</span>
            <span className="ml-2 text-xs font-normal text-gray-500">
              (Critical Field - Highlighted)
            </span>
          </label>
          <input
            type="number"
            id="yearsExperience"
            min="0"
            max="50"
            value={formData.yearsExperience || ""}
            onChange={(e) => updateField("yearsExperience", parseInt(e.target.value) || 0)}
            className={`w-full px-4 py-2 border-2 border-matcha-accent rounded-md focus:outline-none focus:ring-2 focus:ring-matcha-primary bg-matcha-light/30 ${
              errors.yearsExperience ? "border-red-500" : ""
            }`}
            placeholder="0"
            required
          />
          {errors.yearsExperience && (
            <p className="mt-1 text-sm text-red-600">{errors.yearsExperience}</p>
          )}
        </div>

        {/* Seniority Level */}
        <div>
          <label htmlFor="seniority" className="block text-sm font-medium text-gray-700 mb-1">
            Seniority Level <span className="text-red-500">*</span>
            <span className="ml-2 text-xs font-normal text-gray-500">
              (Critical Field - Highlighted)
            </span>
          </label>
          <select
            id="seniority"
            value={formData.seniority}
            onChange={(e) => updateField("seniority", e.target.value as SeniorityLevel)}
            className={`w-full px-4 py-2 border-2 border-matcha-accent rounded-md focus:outline-none focus:ring-2 focus:ring-matcha-primary bg-matcha-light/30 ${
              errors.seniority ? "border-red-500" : ""
            }`}
            required
          >
            {seniorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.seniority && (
            <p className="mt-1 text-sm text-red-600">{errors.seniority}</p>
          )}
        </div>

        {/* Key Achievements */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Key Achievements
          </label>
          <SpeechInput
            value={formData.keyAchievements}
            onChange={(value) => updateField("keyAchievements", value)}
            placeholder="Describe your key achievements, projects, or notable work..."
            label=""
          />
        </div>
      </div>
    </div>
  );
}

