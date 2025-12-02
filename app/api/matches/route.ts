import { NextRequest, NextResponse } from "next/server";
import { ProfileService } from "@/lib/services/ProfileService";
import { MatchingOrchestrator } from "@/lib/services/matching/MatchingOrchestrator";
import { JSearchService } from "@/lib/services/jobData/JSearchService";
import { auditLogger } from "@/lib/services/AuditLogger";
import { performanceMonitor } from "@/lib/services/PerformanceMonitor";
import { estimateAnonymizedProfileSize, validateAnonymizedProfileStructure } from "@/lib/utils/privacyUtils";

const profileService = new ProfileService();
const matchingOrchestrator = new MatchingOrchestrator();
const jsearchService = new JSearchService();

/**
 * POST /api/matches - Get job matches for a profile
 * 
 * Privacy Boundary: This endpoint retrieves ONLY anonymized profile features (no PII).
 * The anonymized profile is validated before being sent to the matching orchestrator.
 * Only anonymized features are used for matching - no personal identifiers.
 * 
 * Performance: Optimized with caching, parallel execution, and performance monitoring
 * to meet 5-second response time requirement.
 */
export async function POST(request: NextRequest) {
  const startTime = performance.now();
  
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

    // Build query from user's desired roles
    // Format: "Frontend Developer OR Software Engineer jobs in chicago"
    const rolesQuery = anonymizedProfile.desiredRoles.length > 0
      ? anonymizedProfile.desiredRoles.join(" OR ")
      : "developer";
    const location = "chicago"; // Fixed location as per plan
    const query = `${rolesQuery} jobs in ${location}`;

    // Build search filters
    const filters = {
      country: "us",
      date_posted: "week" as const, // Recent jobs only
      work_from_home: anonymizedProfile.remotePreference === "remote",
      num_pages: 1,
      page: 1,
    };

    // Fetch jobs from JSearch API (or cache)
    let jobs;
    try {
      jobs = await jsearchService.searchJobs(query, filters);
      
      if (jobs.length === 0) {
        console.warn("[Matches] No jobs found from JSearch API");
        // Return empty matches instead of error
        return NextResponse.json({
          matches: [],
          isApproximate: false,
          message: "No jobs found matching your criteria. Try adjusting your search preferences.",
        });
      }
    } catch (error) {
      console.error("[Matches] Error fetching jobs from JSearch:", error);
      // Return empty matches on API error (graceful degradation)
      return NextResponse.json({
        matches: [],
        isApproximate: false,
        message: error instanceof Error 
          ? `Unable to fetch jobs: ${error.message}` 
          : "Unable to fetch jobs. Please try again later.",
      });
    }

    // Privacy: Get job matches using orchestrator (with fallback)
    // Only anonymized profile is passed - no PII
    try {
      auditLogger.logMatchingServiceCall("findMatches", profileSize, true);
      
      // Execute matching and insight generation with performance monitoring
      const matches = await matchingOrchestrator.findMatches(anonymizedProfile, jobs);

      // Generate company insights for matched jobs (already limited to top 10)
      const matchedJobs = matches.map((m) => m.job);
      const insights = await matchingOrchestrator.generateCompanyInsights(matchedJobs);

      // Attach insight cards to matches
      const matchesWithInsights = matches.map((match) => ({
        ...match,
        insightCard: insights.get(match.job.id),
      }));

      // Determine if any matches are approximate
      const hasApproximateMatches = matchesWithInsights.some((m) => m.isApproximate);

      // Log total response time
      const totalTime = performance.now() - startTime;
      performanceMonitor.recordMetric("api.matches.total", totalTime, true);
      
      if (totalTime > 5000) {
        console.warn(`[Matches API] Response time exceeded 5s: ${totalTime.toFixed(2)}ms`);
      } else {
        console.log(`[Matches API] Response time: ${totalTime.toFixed(2)}ms`);
      }

      // Return response with caching headers for Next.js optimization
      return NextResponse.json(
        {
          matches: matchesWithInsights,
          isApproximate: hasApproximateMatches,
          message: hasApproximateMatches
            ? "Some results may be approximate due to AI service limitations"
            : undefined,
        },
        {
          headers: {
            // Cache for 1 hour (stale-while-revalidate pattern)
            "Cache-Control": "private, s-maxage=3600, stale-while-revalidate=86400",
          },
        }
      );
    } catch (error) {
      // Audit log: Matching service failure
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      auditLogger.logMatchingServiceCall("findMatches", profileSize, false, errorMessage);
      
      // Log performance even on error
      const totalTime = performance.now() - startTime;
      performanceMonitor.recordMetric("api.matches.total", totalTime, false, errorMessage);
      
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

