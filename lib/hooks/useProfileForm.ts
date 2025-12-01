"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProfileData, FormStep, ValidationErrors } from "@/types/profile";

const STORAGE_KEY = "matcha_profile_draft";

const initialFormData: ProfileData = {
  name: "",
  email: "",
  phone: "",
  skills: [],
  yearsExperience: 0,
  seniority: "entry",
  keyAchievements: "",
  desiredRoles: [],
  preferredCompanySize: "medium",
  industries: [],
  remotePreference: "flexible",
  privacyConsent: false,
};

export function useProfileForm() {
  const [currentStep, setCurrentStep] = useState<FormStep>(1);
  const [formData, setFormData] = useState<ProfileData>(initialFormData);
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Load draft from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setFormData(parsed);
        } catch (e) {
          console.error("Failed to load draft:", e);
        }
      }
    }
  }, []);

  // Save draft to localStorage whenever formData changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    }
  }, [formData]);

  const updateField = useCallback(
    <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear error for this field when user types
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const validateStep = useCallback((step: FormStep): boolean => {
    const newErrors: ValidationErrors = {};

    switch (step) {
      case 1:
        if (!formData.name.trim()) newErrors.name = "Name is required";
        if (!formData.email.trim()) newErrors.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = "Invalid email format";
        }
        break;

      case 2:
        if (formData.skills.length === 0) {
          newErrors.skills = "At least one skill is required";
        }
        break;

      case 3:
        if (formData.yearsExperience < 0) {
          newErrors.yearsExperience = "Years of experience cannot be negative";
        }
        if (!formData.seniority) {
          newErrors.seniority = "Seniority level is required";
        }
        break;

      case 4:
        if (formData.desiredRoles.length === 0) {
          newErrors.desiredRoles = "At least one desired role is required";
        }
        if (formData.industries.length === 0) {
          newErrors.industries = "At least one industry is required";
        }
        break;

      case 5:
        if (!formData.privacyConsent) {
          newErrors.privacyConsent = "You must consent to privacy policy";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const nextStep = useCallback(() => {
    if (validateStep(currentStep)) {
      if (currentStep < 5) {
        setCurrentStep((prev) => (prev + 1) as FormStep);
      }
    }
  }, [currentStep, validateStep]);

  const previousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as FormStep);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: FormStep) => {
    setCurrentStep(step);
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setCurrentStep(1);
    setErrors({});
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return {
    currentStep,
    formData,
    errors,
    updateField,
    nextStep,
    previousStep,
    goToStep,
    resetForm,
    validateStep,
  };
}

