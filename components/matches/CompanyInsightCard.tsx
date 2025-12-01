"use client";

import { useState } from "react";
import type { CompanyInsight } from "@/types/job";
import type { CompanySize } from "@/types/profile";

interface CompanyInsightCardProps {
  insight: CompanyInsight;
}

const formatCompanySize = (size: CompanySize): string => {
  const map: Record<CompanySize, string> = {
    small: "Small (1-50 employees)",
    medium: "Medium (51-500 employees)",
    large: "Large (500+ employees)",
  };
  return map[size];
};

export default function CompanyInsightCard({ insight }: CompanyInsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-blue-900">Company Overview</h4>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          {isExpanded ? "Show Less" : "Show More"}
        </button>
      </div>

      <div className="space-y-2 text-sm text-blue-800">
        <div>
          <span className="font-medium">Company Size:</span> {formatCompanySize(insight.companySize)}
        </div>
        {insight.industries.length > 0 && (
          <div>
            <span className="font-medium">Industries:</span> {insight.industries.join(", ")}
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-blue-200 space-y-3">
          {insight.description && (
            <div>
              <h5 className="font-medium text-blue-900 mb-1">About the Company</h5>
              <p className="text-sm text-blue-800">{insight.description}</p>
            </div>
          )}

          {insight.keyResponsibilities && insight.keyResponsibilities.length > 0 && (
            <div>
              <h5 className="font-medium text-blue-900 mb-2">Key Responsibilities</h5>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                {insight.keyResponsibilities.map((responsibility, index) => (
                  <li key={index}>{responsibility}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

