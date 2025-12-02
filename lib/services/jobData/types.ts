/**
 * TypeScript interfaces for JSearch API response structure
 */

export interface JSearchJobHighlights {
  Qualifications?: string[];
  Responsibilities?: string[];
  Benefits?: string[];
}

export interface JSearchJobResponse {
  job_id: string;
  job_title: string;
  employer_name: string;
  employer_logo?: string | null;
  employer_website?: string | null;
  job_publisher: string;
  job_employment_type: string;
  job_employment_types: string[];
  job_apply_link: string;
  job_apply_is_direct: boolean;
  apply_options: Array<{
    publisher: string;
    apply_link: string;
    is_direct: boolean;
  }>;
  job_description: string;
  job_is_remote: boolean;
  job_posted_at: string | null;
  job_posted_at_timestamp: number | null;
  job_posted_at_datetime_utc: string | null;
  job_location: string;
  job_city?: string;
  job_state?: string;
  job_country: string;
  job_latitude?: number;
  job_longitude?: number;
  job_benefits?: string[] | null;
  job_google_link: string;
  job_salary?: string | null;
  job_min_salary?: number | null;
  job_max_salary?: number | null;
  job_salary_period?: string | null;
  job_highlights?: JSearchJobHighlights;
  job_onet_soc?: string;
  job_onet_job_zone?: string;
}

export interface JSearchApiResponse {
  status: string;
  request_id: string;
  parameters: {
    query: string;
    page: number;
    num_pages: number;
    date_posted?: string;
    country?: string;
    language?: string;
    work_from_home?: boolean;
    employment_types?: string;
    job_requirements?: string;
  };
  data: JSearchJobResponse[];
}

export interface JSearchSearchFilters {
  page?: number;
  num_pages?: number;
  date_posted?: "all" | "today" | "3days" | "week" | "month";
  country?: string;
  language?: string;
  work_from_home?: boolean;
  employment_types?: string; // Comma-separated: "FULLTIME,CONTRACTOR,PARTTIME,INTERN"
  job_requirements?: string;
}

interface CacheEntry {
  data: import("@/types/job").Job[];
  timestamp: number;
}

export type JSearchCache = Map<string, CacheEntry>;

