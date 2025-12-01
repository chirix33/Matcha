import type { AnonymizedProfile } from "@/types/profile";
import type { Job, SkillMatch, ExperienceMatch, PreferenceMatch, ScoreBreakdown, MatchFeatures } from "@/types/job";
import type { SeniorityLevel } from "@/types/profile";

export class MatchFeatureExtractor {
  /**
   * Extract skill match information
   */
  extractSkillMatch(profile: AnonymizedProfile, job: Job): SkillMatch {
    const matched = profile.skills.filter((skill) =>
      job.requiredSkills.some(
        (requiredSkill) => requiredSkill.toLowerCase() === skill.toLowerCase()
      )
    );

    const scorePerSkill = 10;
    const score = matched.length * scorePerSkill;
    const totalPossible = job.requiredSkills.length * scorePerSkill;

    return {
      matched,
      score,
      totalPossible,
    };
  }

  /**
   * Extract experience level from job title/description
   */
  private extractJobLevel(job: Job): SeniorityLevel | "unknown" {
    const titleLower = job.title.toLowerCase();
    const roleLower = job.role.toLowerCase();
    const descriptionLower = job.description.toLowerCase();
    const combined = `${titleLower} ${roleLower} ${descriptionLower}`;

    if (combined.includes("entry") || combined.includes("intern") || combined.includes("graduate")) {
      return "entry";
    }
    if (combined.includes("junior") || combined.includes("jr")) {
      return "junior";
    }
    if (combined.includes("senior") || combined.includes("sr") || combined.includes("lead") || combined.includes("principal")) {
      return "senior";
    }
    if (combined.includes("lead") || combined.includes("principal") || combined.includes("architect")) {
      return "lead";
    }
    if (combined.includes("mid") || combined.includes("middle")) {
      return "mid";
    }

    return "unknown";
  }

  /**
   * Determine experience alignment
   */
  extractExperienceMatch(profile: AnonymizedProfile, job: Job): ExperienceMatch {
    const jobLevel = this.extractJobLevel(job);
    const profileLevel = profile.seniority;

    let alignment: ExperienceMatch["alignment"] = "mismatch";

    if (jobLevel === "unknown") {
      // If we can't determine job level, use a simple heuristic based on years
      if (profile.yearsExperience <= 2) {
        alignment = profileLevel === "entry" || profileLevel === "junior" ? "entry" : "mismatch";
      } else if (profile.yearsExperience <= 5) {
        alignment = profileLevel === "junior" || profileLevel === "mid" ? "mid" : "mismatch";
      } else {
        alignment = profileLevel === "mid" || profileLevel === "senior" || profileLevel === "lead" ? "senior" : "mismatch";
      }
    } else {
      // Map profile level to job level alignment
      const alignmentMap: Record<SeniorityLevel, Record<SeniorityLevel | "unknown", ExperienceMatch["alignment"]>> = {
        entry: {
          entry: "entry",
          junior: "entry",
          mid: "mismatch",
          senior: "mismatch",
          lead: "mismatch",
          unknown: "entry",
        },
        junior: {
          entry: "entry",
          junior: "junior",
          mid: "junior",
          senior: "mismatch",
          lead: "mismatch",
          unknown: "junior",
        },
        mid: {
          entry: "mismatch",
          junior: "junior",
          mid: "mid",
          senior: "mid",
          lead: "mismatch",
          unknown: "mid",
        },
        senior: {
          entry: "mismatch",
          junior: "mismatch",
          mid: "mid",
          senior: "senior",
          lead: "senior",
          unknown: "senior",
        },
        lead: {
          entry: "mismatch",
          junior: "mismatch",
          mid: "mismatch",
          senior: "senior",
          lead: "lead",
          unknown: "lead",
        },
      };

      alignment = alignmentMap[profileLevel][jobLevel] || "mismatch";
    }

    return {
      profileYears: profile.yearsExperience,
      profileLevel,
      jobLevel,
      alignment,
    };
  }

  /**
   * Extract preference match information
   */
  extractPreferenceMatch(profile: AnonymizedProfile, job: Job): PreferenceMatch {
    // Role match
    const roleMatch = profile.desiredRoles.some(
      (role) => role.toLowerCase() === job.role.toLowerCase()
    );

    // Industry matches (array of booleans for each profile industry)
    const industryMatches = profile.industries.map((industry) =>
      industry.toLowerCase() === job.industry.toLowerCase()
    );

    // Company size match
    const companySizeMatch = profile.preferredCompanySize === job.companySize;

    // Remote preference match
    let remoteMatch: boolean | "partial" = false;
    if (profile.remotePreference === job.remotePreference) {
      remoteMatch = true;
    } else if (
      profile.remotePreference === "flexible" ||
      job.remotePreference === "flexible"
    ) {
      remoteMatch = "partial";
    }

    return {
      role: roleMatch,
      industry: industryMatches,
      companySize: companySizeMatch,
      remote: remoteMatch,
    };
  }

  /**
   * Calculate score breakdown for keyword matching
   */
  calculateScoreBreakdown(profile: AnonymizedProfile, job: Job): ScoreBreakdown {
    const skillMatch = this.extractSkillMatch(profile, job);
    const preferenceMatch = this.extractPreferenceMatch(profile, job);
    const experienceMatch = this.extractExperienceMatch(profile, job);

    // Role score
    const roleScore = preferenceMatch.role ? 20 : 0;

    // Industry score (15 per matched industry)
    const industryScore = preferenceMatch.industry.filter(Boolean).length * 15;

    // Company size score
    const companySizeScore = preferenceMatch.companySize ? 10 : 0;

    // Remote preference score
    let remoteScore = 0;
    if (preferenceMatch.remote === true) {
      remoteScore = 10;
    } else if (preferenceMatch.remote === "partial") {
      remoteScore = 5;
    }

    // Experience score (simplified - 5 points if aligned)
    const experienceScore = experienceMatch.alignment !== "mismatch" ? 5 : 0;

    return {
      skills: skillMatch.score,
      role: roleScore,
      industry: industryScore,
      companySize: companySizeScore,
      remote: remoteScore,
      experience: experienceScore,
    };
  }

  /**
   * Build complete match features object
   */
  buildMatchFeatures(profile: AnonymizedProfile, job: Job): MatchFeatures {
    return {
      skillMatch: this.extractSkillMatch(profile, job),
      experienceMatch: this.extractExperienceMatch(profile, job),
      preferenceMatch: this.extractPreferenceMatch(profile, job),
      scoreBreakdown: this.calculateScoreBreakdown(profile, job),
    };
  }
}

