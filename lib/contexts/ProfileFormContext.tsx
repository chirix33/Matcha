"use client";

import { createContext, useContext, ReactNode } from "react";
import { useProfileForm } from "@/lib/hooks/useProfileForm";
import type { ProfileData, FormStep, ValidationErrors } from "@/types/profile";

interface ProfileFormContextType {
  currentStep: FormStep;
  formData: ProfileData;
  errors: ValidationErrors;
  updateField: <K extends keyof ProfileData>(
    field: K,
    value: ProfileData[K]
  ) => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: FormStep) => void;
  resetForm: () => void;
  validateStep: (step: FormStep) => boolean;
}

const ProfileFormContext = createContext<ProfileFormContextType | undefined>(
  undefined
);

export function ProfileFormProvider({ children }: { children: ReactNode }) {
  const formState = useProfileForm();

  return (
    <ProfileFormContext.Provider value={formState}>
      {children}
    </ProfileFormContext.Provider>
  );
}

export function useProfileFormContext() {
  const context = useContext(ProfileFormContext);
  if (context === undefined) {
    throw new Error(
      "useProfileFormContext must be used within a ProfileFormProvider"
    );
  }
  return context;
}

