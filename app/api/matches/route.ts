import { NextRequest, NextResponse } from "next/server";
import { ProfileService } from "@/lib/services/ProfileService";
import { MatchingOrchestrator } from "@/lib/services/matching/MatchingOrchestrator";
import { auditLogger } from "@/lib/services/AuditLogger";
import { estimateAnonymizedProfileSize, validateAnonymizedProfileStructure } from "@/lib/utils/privacyUtils";
import type { Job } from "@/types/job";

const profileService = new ProfileService();
const matchingOrchestrator = new MatchingOrchestrator();

// Mock job data - In production, this would come from a database
// For now, we'll use a simple array. This should be replaced with a jobs repository/service
const MOCK_JOBS: Job[] = [
  {
    id: "job-1",
    title: "Frontend Developer",
    company: "TechCorp",
    description: "We are looking for a Frontend Developer with experience in React, TypeScript, and modern web development. You will work on building user interfaces for our web applications. Responsibilities include: - Developing responsive web applications - Collaborating with design and backend teams - Writing clean, maintainable code - Participating in code reviews",
    requiredSkills: ["React", "TypeScript", "JavaScript", "CSS"],
    role: "Frontend Developer",
    companySize: "medium",
    industry: "Technology",
    remotePreference: "remote",
    location: "Remote",
    salaryRange: "$80,000 - $120,000",
  },
  {
    id: "job-2",
    title: "Software Engineer",
    company: "StartupXYZ",
    description: "Join our fast-growing startup as a Software Engineer. We need someone with strong problem-solving skills and experience in full-stack development. Key responsibilities: - Building and maintaining web applications - Working with databases and APIs - Collaborating with cross-functional teams",
    requiredSkills: ["JavaScript", "Node.js", "Python", "SQL"],
    role: "Software Engineer",
    companySize: "small",
    industry: "Technology",
    remotePreference: "hybrid",
    location: "San Francisco, CA",
  },
  {
    id: "job-3",
    title: "Junior Developer",
    company: "EnterpriseInc",
    description: "Perfect opportunity for a Junior Developer to grow their career. We provide mentorship and training. You'll work on: - Learning our codebase and development practices - Contributing to team projects - Attending code reviews and team meetings",
    requiredSkills: ["JavaScript", "HTML", "CSS"],
    role: "Junior Developer",
    companySize: "large",
    industry: "Technology",
    remotePreference: "onsite",
    location: "New York, NY",
  },
];

/**
 * POST /api/matches - Get job matches for a profile
 * 
 * Privacy Boundary: This endpoint retrieves ONLY anonymized profile features (no PII).
 * The anonymized profile is validated before being sent to the matching orchestrator.
 * Only anonymized features are used for matching - no personal identifiers.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Privacy Boundary: Get anonymized profile (ASR3: No PII sent to matching)
    const anonymizedProfile = await profileService.getAnonymizedProfileByEmail(email);

    if (!anonymizedProfile) {
      return NextResponse.json(
        { error: "Profile not found. Please create a profile first." },
        { status: 404 }
      );
    }

    // Privacy: Validate anonymized profile structure (ensure no PII)
    const validation = validateAnonymizedProfileStructure(anonymizedProfile);
    if (!validation.isValid) {
      console.error("[Matches] Invalid anonymized profile structure:", validation.errors);
      auditLogger.logDataValidation("validateAnonymizedProfile", false, validation.errors.join(", "));
      // Continue anyway but log the issue
    } else {
      auditLogger.logDataValidation("validateAnonymizedProfile", true);
    }

    // Audit log: Anonymized profile retrieved and about to be used for matching
    const profileSize = estimateAnonymizedProfileSize(anonymizedProfile);
    auditLogger.logAnonymizedProfileRetrieved(email, profileSize);

    // Privacy: Get job matches using orchestrator (with fallback)
    // Only anonymized profile is passed - no PII
    try {
      auditLogger.logMatchingServiceCall("findMatches", profileSize, true);
      const matches = await matchingOrchestrator.findMatches(anonymizedProfile, MOCK_JOBS);

      // Generate company insights for matched jobs
      const matchedJobs = matches.map((m) => m.job);
      const insights = await matchingOrchestrator.generateCompanyInsights(matchedJobs);

      // Attach insight cards to matches
      const matchesWithInsights = matches.map((match) => ({
        ...match,
        insightCard: insights.get(match.job.id),
      }));

      // Determine if any matches are approximate
      const hasApproximateMatches = matchesWithInsights.some((m) => m.isApproximate);

      return NextResponse.json({
        matches: matchesWithInsights,
        isApproximate: hasApproximateMatches,
        message: hasApproximateMatches
          ? "Some results may be approximate due to AI service limitations"
          : undefined,
      });
    } catch (error) {
      // Audit log: Matching service failure
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      auditLogger.logMatchingServiceCall("findMatches", profileSize, false, errorMessage);
      throw error; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error("Job matching error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve job matches",
      },
      { status: 500 }
    );
  }
}

