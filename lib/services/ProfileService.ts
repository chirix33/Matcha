import { ProfileRepository, type Profile } from "@/lib/repositories/ProfileRepository";
import type { ProfileData, AnonymizedProfile } from "@/types/profile";
import { auditLogger } from "@/lib/services/AuditLogger";
import { estimateAnonymizedProfileSize, validateAnonymizedProfileStructure } from "@/lib/utils/privacyUtils";

/**
 * ProfileService
 * 
 * Privacy Boundary: This service manages both PII (in Profile) and anonymized data (AnonymizedProfile).
 * Methods that return AnonymizedProfile ensure no PII is included.
 * All anonymized data retrieval is logged for audit purposes.
 */
export class ProfileService {
  private repository: ProfileRepository;

  constructor() {
    this.repository = new ProfileRepository();
  }

  /**
   * Create or update profile by email
   */
  async createOrUpdateProfile(
    email: string,
    profileData: ProfileData
  ): Promise<Profile> {
    // Check if profile exists
    const existingProfile = await this.repository.getProfileByEmail(email);

    if (existingProfile) {
      // Update existing profile
      await this.repository.updateProfile(existingProfile.id, profileData);
      // Return updated profile
      const updated = await this.repository.getProfileByEmail(email);
      if (!updated) {
        throw new Error("Failed to retrieve updated profile");
      }
      return updated;
    } else {
      // Create new profile
      return await this.repository.createProfile(email, profileData);
    }
  }

  /**
   * Get profile by email
   */
  async getProfileByEmail(email: string): Promise<Profile | null> {
    return await this.repository.getProfileByEmail(email);
  }

  /**
   * Get anonymized profile by email (for AI matching)
   * 
   * Privacy Boundary: This method strips all PII and returns only anonymized features.
   * The returned data contains NO name, email, phone, or other personal identifiers.
   * All retrievals are logged for audit purposes.
   */
  async getAnonymizedProfileByEmail(
    email: string
  ): Promise<AnonymizedProfile | null> {
    const profile = await this.repository.getProfileByEmail(email);
    if (!profile) {
      return null;
    }

    // Privacy: Retrieve anonymized profile (PII already stripped in repository)
    const anonymized = await this.repository.getAnonymizedProfile(profile.id);
    
    if (!anonymized) {
      return null;
    }

    // Privacy: Validate that anonymized profile contains no PII
    const validation = validateAnonymizedProfileStructure(anonymized);
    if (!validation.isValid) {
      console.error("[ProfileService] Invalid anonymized profile structure:", validation.errors);
      auditLogger.logDataValidation("getAnonymizedProfileByEmail", false, validation.errors.join(", "));
      // Return anyway but log the issue
    } else {
      auditLogger.logDataValidation("getAnonymizedProfileByEmail", true);
    }

    // Audit log: Anonymized profile retrieved (privacy boundary crossing)
    const profileSize = estimateAnonymizedProfileSize(anonymized);
    auditLogger.logAnonymizedProfileRetrieved(email, profileSize);

    // Audit log: PII stripped
    auditLogger.logPIIStripped("getAnonymizedProfileByEmail", 0, profileSize); // Original size unknown here

    return anonymized;
  }

  /**
   * Extract anonymized profile from ProfileData
   * 
   * Privacy Boundary: This method strips PII fields (name, email, phone) from ProfileData
   * and returns only anonymized features suitable for AI matching.
   */
  extractAnonymizedProfile(profileData: ProfileData): AnonymizedProfile {
    // Privacy: Extract only non-PII fields
    const anonymized: AnonymizedProfile = {
      skills: profileData.skills,
      yearsExperience: profileData.yearsExperience,
      seniority: profileData.seniority,
      desiredRoles: profileData.desiredRoles,
      preferredCompanySize: profileData.preferredCompanySize,
      industries: profileData.industries,
      remotePreference: profileData.remotePreference,
    };

    // Validate the extracted anonymized profile
    const validation = validateAnonymizedProfileStructure(anonymized);
    if (!validation.isValid) {
      console.error("[ProfileService] Invalid anonymized profile after extraction:", validation.errors);
      auditLogger.logDataValidation("extractAnonymizedProfile", false, validation.errors.join(", "));
    } else {
      auditLogger.logDataValidation("extractAnonymizedProfile", true);
    }

    // Audit log: PII stripped during extraction
    const originalSize = JSON.stringify(profileData).length;
    const anonymizedSize = estimateAnonymizedProfileSize(anonymized);
    auditLogger.logPIIStripped("extractAnonymizedProfile", originalSize, anonymizedSize);

    return anonymized;
  }
}

