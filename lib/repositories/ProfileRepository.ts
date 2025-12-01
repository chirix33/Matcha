import { query, getClient } from "@/lib/db/connection";
import type { ProfileData, AnonymizedProfile } from "@/types/profile";

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Profile {
  id: string;
  user_id: string;
  skills: string[];
  years_experience: number;
  seniority: "entry" | "junior" | "mid" | "senior" | "lead";
  key_achievements: string | null;
  desired_roles: string[];
  preferred_company_size: "small" | "medium" | "large";
  remote_preference: "remote" | "hybrid" | "onsite" | "flexible";
  privacy_consent: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ProfileFeatures {
  id: string;
  profile_id: string;
  skills: string[];
  years_experience: number;
  seniority: "entry" | "junior" | "mid" | "senior" | "lead";
  desired_roles: string[];
  preferred_company_size: "small" | "medium" | "large";
  industries: string[];
  remote_preference: "remote" | "hybrid" | "onsite" | "flexible";
  created_at: Date;
  updated_at: Date;
}

export class ProfileRepository {
  /**
   * Create or get user by email (with client for transactions)
   */
  private async findOrCreateUserWithClient(
    client: any,
    email: string,
    name: string,
    phone: string
  ): Promise<User> {
    // Try to find existing user
    const existingUser = await client.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      // Update user info if provided
      const updatedUser = await client.query(
        "UPDATE users SET name = $1, phone = $2 WHERE email = $3 RETURNING *",
        [name, phone || null, email]
      );
      return this.mapToUser(updatedUser.rows[0]);
    }

    // Create new user
    const newUser = await client.query(
      "INSERT INTO users (email, name, phone) VALUES ($1, $2, $3) RETURNING *",
      [email, name, phone || null]
    );
    return this.mapToUser(newUser.rows[0]);
  }

  /**
   * Create or get user by email (standalone)
   */
  async findOrCreateUser(email: string, name: string, phone: string): Promise<User> {
    // Try to find existing user
    const existingUser = await query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      // Update user info if provided
      const updatedUser = await query(
        "UPDATE users SET name = $1, phone = $2 WHERE email = $3 RETURNING *",
        [name, phone || null, email]
      );
      return this.mapToUser(updatedUser.rows[0]);
    }

    // Create new user
    const newUser = await query(
      "INSERT INTO users (email, name, phone) VALUES ($1, $2, $3) RETURNING *",
      [email, name, phone || null]
    );
    return this.mapToUser(newUser.rows[0]);
  }

  /**
   * Create profile with anonymized features
   */
  async createProfile(userEmail: string, profileData: ProfileData): Promise<Profile> {
    const client = await getClient();

    try {
      await client.query("BEGIN");

      // Find or create user
      const user = await this.findOrCreateUserWithClient(
        client,
        userEmail,
        profileData.name,
        profileData.phone
      );

      // Create profile
      const profileResult = await client.query(
        `INSERT INTO profiles (
          user_id, skills, years_experience, seniority, key_achievements,
          desired_roles, preferred_company_size, remote_preference, privacy_consent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          user.id,
          JSON.stringify(profileData.skills),
          profileData.yearsExperience,
          profileData.seniority,
          profileData.keyAchievements || null,
          JSON.stringify(profileData.desiredRoles),
          profileData.preferredCompanySize,
          profileData.remotePreference,
          profileData.privacyConsent,
        ]
      );

      const profile = this.mapToProfile(profileResult.rows[0]);

      // Create anonymized profile features
      await this.createOrUpdateProfileFeaturesWithClient(client, profile.id, profileData);

      await client.query("COMMIT");
      return profile;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get profile by email
   */
  async getProfileByEmail(email: string): Promise<Profile | null> {
    const result = await query(
      `SELECT p.* FROM profiles p
       INNER JOIN users u ON p.user_id = u.id
       WHERE u.email = $1
       ORDER BY p.created_at DESC
       LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToProfile(result.rows[0]);
  }

  /**
   * Update profile
   */
  async updateProfile(profileId: string, updates: Partial<ProfileData>): Promise<void> {
    const client = await getClient();

    try {
      await client.query("BEGIN");
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updates.skills !== undefined) {
        updateFields.push(`skills = $${paramIndex}`);
        updateValues.push(JSON.stringify(updates.skills));
        paramIndex++;
      }
      if (updates.yearsExperience !== undefined) {
        updateFields.push(`years_experience = $${paramIndex}`);
        updateValues.push(updates.yearsExperience);
        paramIndex++;
      }
      if (updates.seniority !== undefined) {
        updateFields.push(`seniority = $${paramIndex}`);
        updateValues.push(updates.seniority);
        paramIndex++;
      }
      if (updates.keyAchievements !== undefined) {
        updateFields.push(`key_achievements = $${paramIndex}`);
        updateValues.push(updates.keyAchievements || null);
        paramIndex++;
      }
      if (updates.desiredRoles !== undefined) {
        updateFields.push(`desired_roles = $${paramIndex}`);
        updateValues.push(JSON.stringify(updates.desiredRoles));
        paramIndex++;
      }
      if (updates.preferredCompanySize !== undefined) {
        updateFields.push(`preferred_company_size = $${paramIndex}`);
        updateValues.push(updates.preferredCompanySize);
        paramIndex++;
      }
      if (updates.remotePreference !== undefined) {
        updateFields.push(`remote_preference = $${paramIndex}`);
        updateValues.push(updates.remotePreference);
        paramIndex++;
      }
      if (updates.privacyConsent !== undefined) {
        updateFields.push(`privacy_consent = $${paramIndex}`);
        updateValues.push(updates.privacyConsent);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        await client.query("COMMIT");
        client.release();
        return;
      }

      updateValues.push(profileId);
      const updateQuery = `UPDATE profiles SET ${updateFields.join(", ")} WHERE id = $${paramIndex} RETURNING *`;
      const result = await client.query(updateQuery, updateValues);

      // Update profile features if profile was updated
      if (result.rows.length > 0) {
        // Get existing features to merge industries
        const existingFeatures = await client.query(
          "SELECT industries FROM profile_features WHERE profile_id = $1",
          [profileId]
        );
        const existingIndustries = existingFeatures.rows.length > 0
          ? (Array.isArray(existingFeatures.rows[0].industries)
              ? existingFeatures.rows[0].industries
              : JSON.parse(existingFeatures.rows[0].industries || "[]"))
          : [];

        const profile = this.mapToProfile(result.rows[0]);
        // Get full profile to merge updates
        const fullProfileResult = await client.query("SELECT * FROM profiles WHERE id = $1", [profileId]);
        if (fullProfileResult.rows.length > 0) {
          const existingProfile = this.mapToProfile(fullProfileResult.rows[0]);
          // Merge updates with existing data
          // Note: industries come from ProfileData, not from profiles table
          await this.createOrUpdateProfileFeaturesWithClient(client, profileId, {
            skills: updates.skills !== undefined ? updates.skills : existingProfile.skills,
            yearsExperience: updates.yearsExperience !== undefined ? updates.yearsExperience : existingProfile.years_experience,
            seniority: updates.seniority || existingProfile.seniority,
            desiredRoles: updates.desiredRoles !== undefined ? updates.desiredRoles : existingProfile.desired_roles,
            preferredCompanySize: updates.preferredCompanySize || existingProfile.preferred_company_size,
            industries: (updates as any).industries !== undefined ? (updates as any).industries : existingIndustries,
            remotePreference: updates.remotePreference || existingProfile.remote_preference,
            name: "", // Required but not used for features
            email: "", // Required but not used for features
            phone: "", // Required but not used for features
            privacyConsent: false, // Required but not used for features
          } as ProfileData);
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get profile by ID (internal use)
   */
  async getProfileById(profileId: string): Promise<Profile | null> {
    const result = await query("SELECT * FROM profiles WHERE id = $1", [profileId]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapToProfile(result.rows[0]);
  }

  /**
   * Get anonymized profile by profile ID
   */
  async getAnonymizedProfile(profileId: string): Promise<AnonymizedProfile | null> {
    const result = await query(
      "SELECT * FROM profile_features WHERE profile_id = $1",
      [profileId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const features = this.mapToProfileFeatures(result.rows[0]);
    return {
      skills: features.skills,
      yearsExperience: features.years_experience,
      seniority: features.seniority,
      desiredRoles: features.desired_roles,
      preferredCompanySize: features.preferred_company_size,
      industries: features.industries,
      remotePreference: features.remote_preference,
    };
  }

  /**
   * Create or update profile features (anonymized) - with client for transactions
   */
  private async createOrUpdateProfileFeaturesWithClient(
    client: any,
    profileId: string,
    profileData: ProfileData
  ): Promise<void> {
    // Check if features exist
    const existing = await client.query(
      "SELECT id FROM profile_features WHERE profile_id = $1",
      [profileId]
    );

    const anonymizedData = {
      skills: profileData.skills,
      years_experience: profileData.yearsExperience,
      seniority: profileData.seniority,
      desired_roles: profileData.desiredRoles,
      preferred_company_size: profileData.preferredCompanySize,
      industries: profileData.industries || [],
      remote_preference: profileData.remotePreference,
    };

    if (existing.rows.length > 0) {
      // Update existing features
      await client.query(
        `UPDATE profile_features SET
          skills = $1, years_experience = $2, seniority = $3,
          desired_roles = $4, preferred_company_size = $5,
          industries = $6, remote_preference = $7
          WHERE profile_id = $8`,
        [
          JSON.stringify(anonymizedData.skills),
          anonymizedData.years_experience,
          anonymizedData.seniority,
          JSON.stringify(anonymizedData.desired_roles),
          anonymizedData.preferred_company_size,
          JSON.stringify(anonymizedData.industries),
          anonymizedData.remote_preference,
          profileId,
        ]
      );
    } else {
      // Create new features
      await client.query(
        `INSERT INTO profile_features (
          profile_id, skills, years_experience, seniority,
          desired_roles, preferred_company_size, industries, remote_preference
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          profileId,
          JSON.stringify(anonymizedData.skills),
          anonymizedData.years_experience,
          anonymizedData.seniority,
          JSON.stringify(anonymizedData.desired_roles),
          anonymizedData.preferred_company_size,
          JSON.stringify(anonymizedData.industries),
          anonymizedData.remote_preference,
        ]
      );
    }
  }

  /**
   * Create or update profile features (anonymized) - standalone
   */
  private async createOrUpdateProfileFeatures(
    profileId: string,
    profileData: ProfileData
  ): Promise<void> {
    // Check if features exist
    const existing = await query(
      "SELECT id FROM profile_features WHERE profile_id = $1",
      [profileId]
    );

    const anonymizedData = {
      skills: profileData.skills,
      years_experience: profileData.yearsExperience,
      seniority: profileData.seniority,
      desired_roles: profileData.desiredRoles,
      preferred_company_size: profileData.preferredCompanySize,
      industries: profileData.industries || [],
      remote_preference: profileData.remotePreference,
    };

    if (existing.rows.length > 0) {
      // Update existing features
      await query(
        `UPDATE profile_features SET
          skills = $1, years_experience = $2, seniority = $3,
          desired_roles = $4, preferred_company_size = $5,
          industries = $6, remote_preference = $7
          WHERE profile_id = $8`,
        [
          JSON.stringify(anonymizedData.skills),
          anonymizedData.years_experience,
          anonymizedData.seniority,
          JSON.stringify(anonymizedData.desired_roles),
          anonymizedData.preferred_company_size,
          JSON.stringify(anonymizedData.industries),
          anonymizedData.remote_preference,
          profileId,
        ]
      );
    } else {
      // Create new features
      await query(
        `INSERT INTO profile_features (
          profile_id, skills, years_experience, seniority,
          desired_roles, preferred_company_size, industries, remote_preference
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          profileId,
          JSON.stringify(anonymizedData.skills),
          anonymizedData.years_experience,
          anonymizedData.seniority,
          JSON.stringify(anonymizedData.desired_roles),
          anonymizedData.preferred_company_size,
          JSON.stringify(anonymizedData.industries),
          anonymizedData.remote_preference,
        ]
      );
    }
  }

  // Mapper functions
  private mapToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      phone: row.phone,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapToProfile(row: any): Profile {
    return {
      id: row.id,
      user_id: row.user_id,
      skills: Array.isArray(row.skills) ? row.skills : JSON.parse(row.skills || "[]"),
      years_experience: row.years_experience,
      seniority: row.seniority,
      key_achievements: row.key_achievements,
      desired_roles: Array.isArray(row.desired_roles)
        ? row.desired_roles
        : JSON.parse(row.desired_roles || "[]"),
      preferred_company_size: row.preferred_company_size,
      remote_preference: row.remote_preference,
      privacy_consent: row.privacy_consent,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapToProfileFeatures(row: any): ProfileFeatures {
    return {
      id: row.id,
      profile_id: row.profile_id,
      skills: Array.isArray(row.skills) ? row.skills : JSON.parse(row.skills || "[]"),
      years_experience: row.years_experience,
      seniority: row.seniority,
      desired_roles: Array.isArray(row.desired_roles)
        ? row.desired_roles
        : JSON.parse(row.desired_roles || "[]"),
      preferred_company_size: row.preferred_company_size,
      industries: Array.isArray(row.industries) ? row.industries : JSON.parse(row.industries || "[]"),
      remote_preference: row.remote_preference,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

