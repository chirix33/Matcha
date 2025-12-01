"use client";

import { useState, useEffect } from "react";
import type { MatchResult } from "@/types/job";
import JobMatchCard from "./JobMatchCard";

interface JobMatchesListProps {
  email: string;
}

interface MatchesResponse {
  matches: MatchResult[];
  isApproximate: boolean;
  message?: string;
}

export default function JobMatchesList({ email }: JobMatchesListProps) {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApproximate, setIsApproximate] = useState(false);
  const [approximateMessage, setApproximateMessage] = useState<string | undefined>();

  useEffect(() => {
    const fetchMatches = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/matches", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch job matches");
        }

        const data: MatchesResponse = await response.json();
        setMatches(data.matches || []);
        setIsApproximate(data.isApproximate || false);
        setApproximateMessage(data.message);
      } catch (err) {
        console.error("Error fetching matches:", err);
        setError(err instanceof Error ? err.message : "Failed to load job matches");
      } finally {
        setIsLoading(false);
      }
    };

    if (email) {
      fetchMatches();
    }
  }, [email]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-matcha-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Finding your perfect job matches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Matches</h3>
        <p className="text-red-800">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Matches Found</h3>
        <p className="text-gray-600 mb-4">
          We couldn't find any job matches for your profile at this time.
        </p>
        <p className="text-sm text-gray-500">
          Try updating your profile with more skills or adjusting your preferences.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Approximate Match Warning */}
      {isApproximate && approximateMessage && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-yellow-600 text-xl">⚠️</span>
            <div>
              <h4 className="font-semibold text-yellow-900 mb-1">Note</h4>
              <p className="text-sm text-yellow-800">{approximateMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Your Job Matches ({matches.length})
        </h2>
        <p className="text-sm text-gray-600">
          Sorted by match score
        </p>
      </div>

      {/* Matches List */}
      <div className="space-y-6">
        {matches.map((match) => (
          <JobMatchCard key={match.job.id} match={match} />
        ))}
      </div>
    </div>
  );
}

