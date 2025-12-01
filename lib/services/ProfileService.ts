import { ProfileRepository, type Profile } from "@/lib/repositories/ProfileRepository";
import type { ProfileData, AnonymizedProfile } from "@/types/profile";

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
   */
  async getAnonymizedProfileByEmail(
    email: string
  ): Promise<AnonymizedProfile | null> {
    const profile = await this.repository.getProfileByEmail(email);
    if (!profile) {
      return null;
    }

    const anonymized = await this.repository.getAnonymizedProfile(profile.id);
    return anonymized;
  }

  /**
   * Extract anonymized profile from ProfileData
   */
  extractAnonymizedProfile(profileData: ProfileData): AnonymizedProfile {
    return {
      skills: profileData.skills,
      yearsExperience: profileData.yearsExperience,
      seniority: profileData.seniority,
      desiredRoles: profileData.desiredRoles,
      preferredCompanySize: profileData.preferredCompanySize,
      industries: profileData.industries,
      remotePreference: profileData.remotePreference,
    };
  }
}

