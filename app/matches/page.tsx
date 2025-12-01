"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import JobMatchesList from "@/components/matches/JobMatchesList";

function MatchesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // Get email from query params or localStorage
    const emailParam = searchParams.get("email");
    const storedEmail = typeof window !== "undefined" 
      ? localStorage.getItem("matcha_profile_email")
      : null;

    const userEmail = emailParam || storedEmail;
    
    if (!userEmail) {
      // Redirect to profile page if no email found
      router.push("/profile");
      return;
    }

    setEmail(userEmail);
    
    // Store email in localStorage for future use
    if (typeof window !== "undefined" && !storedEmail) {
      localStorage.setItem("matcha_profile_email", userEmail);
    }
  }, [searchParams, router]);

  if (!email) {
    return (
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-matcha-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Job Matches</h1>
              <p className="text-gray-600">
                Discover opportunities tailored to your skills and preferences
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              ← Back to Home
            </Link>
          </div>
        </div>

        {/* Matches List */}
        <JobMatchesList email={email} />
      </div>
    </main>
  );
}

export default function MatchesPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-matcha-primary mx-auto mb-4"></div>
                <p className="text-gray-600">Loading...</p>
              </div>
            </div>
          </div>
        </main>
      }
    >
      <MatchesPageContent />
    </Suspense>
  );
}

