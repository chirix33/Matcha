"use client";

interface MatchScoreProps {
  score: number;
  showBreakdown?: boolean;
  breakdown?: {
    skills: number;
    role: number;
    industry: number;
    companySize: number;
    remote: number;
    experience: number;
  };
}

export default function MatchScore({ score, showBreakdown = false, breakdown }: MatchScoreProps) {
  // Determine color based on score
  const getScoreColor = (s: number) => {
    if (s >= 80) return "bg-green-500";
    if (s >= 60) return "bg-yellow-500";
    if (s >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  // Determine text color
  const getTextColor = (s: number) => {
    if (s >= 80) return "text-green-700";
    if (s >= 60) return "text-yellow-700";
    if (s >= 40) return "text-orange-700";
    return "text-red-700";
  };

  // Get match quality label
  const getMatchLabel = (s: number) => {
    if (s >= 80) return "Excellent Match";
    if (s >= 60) return "Good Match";
    if (s >= 40) return "Fair Match";
    return "Low Match";
  };

  return (
    <div className="space-y-2">
      {/* Score Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-16 h-16 rounded-full ${getScoreColor(score)} flex items-center justify-center text-white font-bold text-lg`}>
            {score}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-600">Match Score</div>
            <div className={`text-sm font-semibold ${getTextColor(score)}`}>
              {getMatchLabel(score)}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-300 ${getScoreColor(score)}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>

      {/* Score Breakdown (Optional) */}
      {showBreakdown && breakdown && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-600 mb-2">Score Breakdown:</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Skills:</span>
              <span className="font-medium">{breakdown.skills}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Role:</span>
              <span className="font-medium">{breakdown.role}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Industry:</span>
              <span className="font-medium">{breakdown.industry}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Company Size:</span>
              <span className="font-medium">{breakdown.companySize}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Remote:</span>
              <span className="font-medium">{breakdown.remote}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Experience:</span>
              <span className="font-medium">{breakdown.experience}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

