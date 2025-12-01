"use client";

import { useState } from "react";
import type { MatchResult } from "@/types/job";
import MatchScore from "./MatchScore";
import CompanyInsightCard from "./CompanyInsightCard";
import type { RemotePreference } from "@/types/profile";

interface JobMatchCardProps {
  match: MatchResult;
}

const formatRemotePreference = (pref: RemotePreference): string => {
  const map: Record<RemotePreference, string> = {
    remote: "Fully Remote",
    hybrid: "Hybrid",
    onsite: "On-Site",
    flexible: "Flexible",
  };
  return map[pref];
};

export default function JobMatchCard({ match }: JobMatchCardProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const { job, score, explanation, matchedSkills, insightCard, isApproximate } = match;

  // Truncate description for preview
  const descriptionPreview = job.description.length > 200 
    ? job.description.substring(0, 200) + "..."
    : job.description;

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-start gap-3 mb-2">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{job.title}</h3>
              <p className="text-lg text-gray-700 font-medium">{job.company}</p>
            </div>
            {isApproximate && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                Approximate
              </span>
            )}
          </div>

          {/* Job Details */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
            {job.location && (
              <span className="flex items-center gap-1">
                <span>📍</span>
                {job.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <span>🏢</span>
              {formatRemotePreference(job.remotePreference)}
            </span>
            {job.salaryRange && (
              <span className="flex items-center gap-1">
                <span>💰</span>
                {job.salaryRange}
              </span>
            )}
          </div>
        </div>

        {/* Match Score */}
        <div className="md:min-w-[180px]">
          <MatchScore score={score} />
        </div>
      </div>

      {/* Explanation Section - Prominently Displayed */}
      <div className="bg-matcha-light/30 border-l-4 border-matcha-accent p-4 rounded-r-lg mb-4">
        <h4 className="font-semibold text-gray-900 mb-2">Why This Job Fits You</h4>
        <p className="text-gray-700 leading-relaxed">{explanation}</p>
      </div>

      {/* Matched Skills */}
      {matchedSkills.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Your Matching Skills</h4>
          <div className="flex flex-wrap gap-2">
            {matchedSkills.map((skill) => (
              <span
                key={skill}
                className="px-3 py-1 bg-matcha-accent text-white rounded-full text-sm font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Company Insight Card */}
      {insightCard && (
        <div className="mb-4">
          <CompanyInsightCard insight={insightCard} />
        </div>
      )}

      {/* Job Description */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-gray-900">Job Description</h4>
          <button
            type="button"
            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
            className="text-matcha-primary hover:text-matcha-secondary text-sm font-medium"
          >
            {isDescriptionExpanded ? "Show Less" : "Show More"}
          </button>
        </div>
        <div className="text-gray-700 whitespace-pre-wrap">
          {isDescriptionExpanded ? job.description : descriptionPreview}
        </div>
      </div>

      {/* Required Skills (if different from matched skills) */}
      {job.requiredSkills.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Required Skills</h4>
          <div className="flex flex-wrap gap-2">
            {job.requiredSkills.map((skill) => (
              <span
                key={skill}
                className={`px-3 py-1 rounded-full text-sm ${
                  matchedSkills.includes(skill)
                    ? "bg-matcha-accent text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

