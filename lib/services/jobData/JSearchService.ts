import type { Job } from "@/types/job";
import type {
  JSearchApiResponse,
  JSearchJobResponse,
  JSearchSearchFilters,
  JSearchCache,
} from "./types";
import { createHash } from "crypto";

const JSEARCH_API_URL = "https://jsearch.p.rapidapi.com/search";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_SKILLS_PER_JOB = 15;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000; // 2 seconds initial delay

/**
 * Service for interacting with JSearch API to fetch job listings
 * Implements caching to respect the 200 requests/month free tier limit
 */
export class JSearchService {
  private apiKey: string;
  private cache: JSearchCache;
  private apiHost: string;

  constructor() {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      throw new Error("RAPIDAPI_KEY environment variable is not set");
    }
    this.apiKey = apiKey;
    this.apiHost = "jsearch.p.rapidapi.com";
    this.cache = new Map();
  }

  /**
   * Search for jobs using JSearch API
   * @param query - Search query string (e.g., "developer jobs in chicago")
   * @param filters - Optional search filters
   * @returns Array of Job objects
   */
  async searchJobs(
    query: string,
    filters: JSearchSearchFilters = {}
  ): Promise<Job[]> {
    // Check cache first
    const cacheKey = this.generateCacheKey(query, filters);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log(`[JSearchService] Returning cached results for query: ${query}`);
      return cached.data;
    }

    // Build URL with query parameters
    const url = new URL(JSEARCH_API_URL);
    url.searchParams.set("query", query);
    
    if (filters.page) url.searchParams.set("page", filters.page.toString());
    if (filters.num_pages) url.searchParams.set("num_pages", filters.num_pages.toString());
    if (filters.date_posted) url.searchParams.set("date_posted", filters.date_posted);
    if (filters.country) url.searchParams.set("country", filters.country);
    if (filters.language) url.searchParams.set("language", filters.language);
    if (filters.work_from_home !== undefined) {
      url.searchParams.set("work_from_home", filters.work_from_home.toString());
    }
    if (filters.employment_types) {
      url.searchParams.set("employment_types", filters.employment_types);
    }
    if (filters.job_requirements) {
      url.searchParams.set("job_requirements", filters.job_requirements);
    }

    // Retry logic for rate limits
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff: 2s, 4s
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          console.log(`[JSearchService] Retrying after ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        console.log(`[JSearchService] Fetching jobs from API: ${query}${attempt > 0 ? ` (retry ${attempt})` : ""}`);
        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "x-rapidapi-key": this.apiKey,
            "x-rapidapi-host": this.apiHost,
          },
        });

        if (!response.ok) {
          if (response.status === 429) {
            // Rate limit - retry if we have attempts left
            if (attempt < MAX_RETRIES) {
              lastError = new Error("Rate limit exceeded. Retrying...");
              continue; // Retry the loop
            }
            throw new Error("Rate limit exceeded. Please try again later.");
          }
          if (response.status === 401) {
            throw new Error("Invalid API key. Please check your RAPIDAPI_KEY.");
          }
          throw new Error(`JSearch API error: ${response.status} ${response.statusText}`);
        }

        const data: JSearchApiResponse = await response.json();

        if (data.status !== "OK" || !data.data || data.data.length === 0) {
          console.warn(`[JSearchService] No jobs found for query: ${query}`);
          return [];
        }

        // Transform JSearch response to internal Job type
        const jobs = data.data.map((job) => this.mapToJobType(job));

        // Cache results
        this.cache.set(cacheKey, {
          data: jobs,
          timestamp: Date.now(),
        });

        console.log(`[JSearchService] Fetched ${jobs.length} jobs, cached for 24 hours`);
        return jobs;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // If it's not a rate limit error, don't retry
        if (error instanceof Error && !error.message.includes("Rate limit")) {
          console.error("[JSearchService] Non-retryable error:", error);
          break; // Exit retry loop
        }
        
        // If we've exhausted retries, break
        if (attempt >= MAX_RETRIES) {
          console.error("[JSearchService] Max retries exceeded:", error);
          break; // Exit retry loop
        }
        
        // Otherwise, continue to retry
        console.warn(`[JSearchService] Attempt ${attempt + 1} failed, will retry:`, error);
      }
    }

    // All retries exhausted or non-retryable error
    console.error("[JSearchService] Error fetching jobs after retries:", lastError);
    
    // If we have cached data (even if expired), return it as fallback
    if (cached) {
      console.warn("[JSearchService] Using expired cache due to API error");
      return cached.data;
    }
    
    // Return empty array on error (matching will handle empty jobs gracefully)
    return [];
  }

  /**
   * Map JSearch API response to internal Job type
   */
  private mapToJobType(jsearchJob: JSearchJobResponse): Job {
    return {
      id: jsearchJob.job_id,
      title: jsearchJob.job_title,
      company: jsearchJob.employer_name,
      description: jsearchJob.job_description,
      requiredSkills: this.extractSkills(jsearchJob),
      role: jsearchJob.job_title,
      companySize: "medium", // Default - can be enhanced with AI inference later
      industry: "Technology", // Default - can be enhanced with AI inference later
      remotePreference: jsearchJob.job_is_remote ? "remote" : "onsite",
      location: jsearchJob.job_location,
      salaryRange: this.formatSalaryRange(
        jsearchJob.job_min_salary,
        jsearchJob.job_max_salary,
        jsearchJob.job_salary_period
      ),
      postedDate: jsearchJob.job_posted_at_datetime_utc
        ? new Date(jsearchJob.job_posted_at_datetime_utc)
        : undefined,
    };
  }

  /**
   * Extract skills from job highlights and description
   */
  private extractSkills(job: JSearchJobResponse): string[] {
    const skills = new Set<string>();

    // Extract from Qualifications array
    if (job.job_highlights?.Qualifications) {
      for (const qual of job.job_highlights.Qualifications) {
        const extracted = this.extractTechKeywords(qual);
        extracted.forEach((skill) => skills.add(skill));
      }
    }

    // Also extract from job description
    const descSkills = this.extractTechKeywords(job.job_description);
    descSkills.forEach((skill) => skills.add(skill));

    // Convert to array and limit
    return Array.from(skills).slice(0, MAX_SKILLS_PER_JOB);
  }

  /**
   * Extract technology keywords from text using common patterns
   */
  private extractTechKeywords(text: string): string[] {
    const skills: string[] = [];
    const lowerText = text.toLowerCase();

    // Common technology keywords and patterns
    const techPatterns = [
      // Languages
      /\b(python|java|javascript|typescript|go|rust|c\+\+|c#|ruby|php|swift|kotlin|scala|r|matlab)\b/gi,
      // Frameworks & Libraries
      /\b(react|angular|vue|svelte|next\.js|nuxt|express|fastapi|django|flask|spring|laravel|rails|asp\.net|\.net)\b/gi,
      // Databases
      /\b(mysql|postgresql|postgres|mongodb|cassandra|redis|elasticsearch|dynamodb|cosmos\s*db|sql\s*server|oracle)\b/gi,
      // Cloud & DevOps
      /\b(aws|azure|gcp|kubernetes|docker|terraform|ansible|jenkins|github\s*actions|gitlab|ci\/cd|devops)\b/gi,
      // Tools & Platforms
      /\b(git|github|gitlab|jira|confluence|figma|sketch|tableau|power\s*bi|salesforce|hubspot)\b/gi,
      // Specific AWS services
      /\b(s3|lambda|ec2|ecs|eks|rds|cloudfront|api\s*gateway|iam|cloudformation)\b/gi,
      // Specific Azure services
      /\b(azure\s*functions|azure\s*app\s*services|azure\s*sql|aks|azure\s*devops)\b/gi,
      // Testing & QA
      /\b(jest|mocha|cypress|selenium|junit|nunit|xunit|pytest|unittest)\b/gi,
      // Methodologies
      /\b(agile|scrum|kanban|saf|saas|microservices|rest\s*api|graphql|oauth)\b/gi,
    ];

    for (const pattern of techPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[0]) {
          // Normalize the skill name
          const skill = this.normalizeSkillName(match[0]);
          if (skill && skill.length > 1) {
            skills.push(skill);
          }
        }
      }
    }

    return skills;
  }

  /**
   * Normalize skill names (capitalize, handle special cases)
   */
  private normalizeSkillName(skill: string): string {
    // Handle special cases
    const specialCases: Record<string, string> = {
      "c++": "C++",
      "c#": "C#",
      ".net": ".NET",
      "asp.net": "ASP.NET",
      "next.js": "Next.js",
      "ci/cd": "CI/CD",
      "rest api": "REST API",
      "power bi": "Power BI",
      "github actions": "GitHub Actions",
      "azure app services": "Azure App Services",
      "azure functions": "Azure Functions",
      "azure sql": "Azure SQL",
      "azure devops": "Azure DevOps",
      "cosmos db": "Cosmos DB",
      "sql server": "SQL Server",
    };

    const lower = skill.toLowerCase().trim();
    if (specialCases[lower]) {
      return specialCases[lower];
    }

    // Capitalize first letter of each word
    return skill
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  /**
   * Format salary range string
   */
  private formatSalaryRange(
    min?: number | null,
    max?: number | null,
    period?: string | null
  ): string | undefined {
    if (!min && !max) {
      return undefined;
    }

    const formatCurrency = (amount: number): string => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };

    let range = "";
    if (min && max) {
      range = `${formatCurrency(min)} - ${formatCurrency(max)}`;
    } else if (min) {
      range = `${formatCurrency(min)}+`;
    } else if (max) {
      range = `Up to ${formatCurrency(max)}`;
    }

    if (period) {
      const periodMap: Record<string, string> = {
        YEAR: "/year",
        MONTH: "/month",
        WEEK: "/week",
        HOUR: "/hour",
      };
      range += periodMap[period.toUpperCase()] || "";
    }

    return range;
  }

  /**
   * Generate cache key from query and filters
   */
  private generateCacheKey(
    query: string,
    filters: JSearchSearchFilters
  ): string {
    const keyData = JSON.stringify({ query, filters });
    return createHash("md5").update(keyData).digest("hex");
  }

  /**
   * Clear expired cache entries (optional cleanup method)
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= CACHE_TTL_MS) {
        this.cache.delete(key);
      }
    }
  }
}

