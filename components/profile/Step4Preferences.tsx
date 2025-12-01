"use client";

import { useState } from "react";
import { useProfileFormContext } from "@/lib/contexts/ProfileFormContext";
import type { CompanySize, RemotePreference } from "@/types/profile";

const companySizeOptions: { value: CompanySize; label: string }[] = [
  { value: "small", label: "Small (1-50 employees)" },
  { value: "medium", label: "Medium (51-500 employees)" },
  { value: "large", label: "Large (500+ employees)" },
];

const remoteOptions: { value: RemotePreference; label: string }[] = [
  { value: "remote", label: "Fully Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-Site" },
  { value: "flexible", label: "Flexible" },
];

const commonRoles = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "DevOps Engineer",
  "Data Engineer",
  "Data Scientist",
  "Product Manager",
  "UI/UX Designer",
  "QA Engineer",
  "Mobile Developer",
  "Cloud Architect",
];

const commonIndustries = [
  "Technology",
  "Finance",
  "Healthcare",
  "E-commerce",
  "Education",
  "Gaming",
  "Consulting",
  "Startup",
  "Enterprise",
  "Non-profit",
];

export default function Step4Preferences() {
  const { formData, updateField, errors } = useProfileFormContext();
  const [roleInput, setRoleInput] = useState("");
  const [industryInput, setIndustryInput] = useState("");

  const addRole = () => {
    const trimmed = roleInput.trim();
    if (trimmed && !formData.desiredRoles.includes(trimmed)) {
      updateField("desiredRoles", [...formData.desiredRoles, trimmed]);
      setRoleInput("");
    }
  };

  const removeRole = (role: string) => {
    updateField(
      "desiredRoles",
      formData.desiredRoles.filter((r) => r !== role)
    );
  };

  const addIndustry = () => {
    const trimmed = industryInput.trim();
    if (trimmed && !formData.industries.includes(trimmed)) {
      updateField("industries", [...formData.industries, trimmed]);
      setIndustryInput("");
    }
  };

  const removeIndustry = (industry: string) => {
    updateField(
      "industries",
      formData.industries.filter((i) => i !== industry)
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Preferences</h2>
        <p className="text-gray-600">Tell us what you&apos;re looking for in your next role.</p>
      </div>

      <div className="space-y-4">
        {/* Desired Roles */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Desired Roles <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRole();
                }
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-matcha-primary"
              placeholder="Type a role and press Enter"
              list="common-roles"
            />
            <button
              type="button"
              onClick={addRole}
              className="px-4 py-2 bg-matcha-primary text-white rounded-md hover:bg-matcha-secondary"
            >
              Add
            </button>
          </div>
          <datalist id="common-roles">
            {commonRoles.map((role) => (
              <option key={role} value={role} />
            ))}
          </datalist>

          {/* Role Tags */}
          {formData.desiredRoles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.desiredRoles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-matcha-primary text-white rounded-full text-sm"
                >
                  {role}
                  <button
                    type="button"
                    onClick={() => removeRole(role)}
                    className="hover:text-red-200"
                    aria-label={`Remove ${role}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {errors.desiredRoles && (
            <p className="mt-1 text-sm text-red-600">{errors.desiredRoles}</p>
          )}
        </div>

        {/* Company Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Company Size
          </label>
          <div className="space-y-2">
            {companySizeOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center p-3 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="companySize"
                  value={option.value}
                  checked={formData.preferredCompanySize === option.value}
                  onChange={(e) =>
                    updateField("preferredCompanySize", e.target.value as CompanySize)
                  }
                  className="mr-3"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Industries - Multiple Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Industries <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={industryInput}
              onChange={(e) => setIndustryInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addIndustry();
                }
              }}
              className={`flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-matcha-primary ${
                errors.industries ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Type an industry and press Enter"
              list="common-industries"
            />
            <button
              type="button"
              onClick={addIndustry}
              className="px-4 py-2 bg-matcha-primary text-white rounded-md hover:bg-matcha-secondary"
            >
              Add
            </button>
          </div>
          <datalist id="common-industries">
            {commonIndustries.map((industry) => (
              <option key={industry} value={industry} />
            ))}
          </datalist>

          {/* Industry Tags */}
          {formData.industries.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.industries.map((industry) => (
                <span
                  key={industry}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-matcha-secondary text-white rounded-full text-sm"
                >
                  {industry}
                  <button
                    type="button"
                    onClick={() => removeIndustry(industry)}
                    className="hover:text-red-200"
                    aria-label={`Remove ${industry}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {errors.industries && (
            <p className="mt-1 text-sm text-red-600">{errors.industries}</p>
          )}
        </div>

        {/* Remote Preference */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Remote Work Preference
          </label>
          <div className="grid grid-cols-2 gap-2">
            {remoteOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center p-3 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="remotePreference"
                  value={option.value}
                  checked={formData.remotePreference === option.value}
                  onChange={(e) =>
                    updateField("remotePreference", e.target.value as RemotePreference)
                  }
                  className="mr-2"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
