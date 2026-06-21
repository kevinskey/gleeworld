import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const auditionSchema = z.object({
  // Registration info (for new users)
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  confirmPassword: z.string().optional(),
  
  // Basic info
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  phone: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^[\+]?[1-9][\d]{0,2}[\s\-\.]?[\(]?[\d]{1,3}[\)]?[\s\-\.]?[\d]{3,4}[\s\-\.]?[\d]{3,4}$/, "Please enter a valid phone number"),
  
  // Audition section — what they're auditioning for. Drives downstream
  // conditional fields (instrument-years only matters for instrumental).
  sectionType: z.enum(['vocal', 'instrumental'], {
    required_error: 'Please choose vocal or instrumental',
  }),

  // Musical background
  sangInMiddleSchool: z.boolean().nullable().default(null),
  sangInHighSchool: z.boolean().nullable().default(null),
  highSchoolYears: z.string().optional(),
  playsInstrument: z.boolean().nullable().default(null),
  instrumentDetails: z.string().optional(),
  yearsInstrumentExperience: z.number().int().min(0).nullable().optional(),
  isSoloist: z.boolean().nullable().default(null),
  soloistRating: z.string().optional(),
  highSchoolSection: z.string().optional(),

  // Music skills
  readsMusic: z.boolean().nullable().default(null),
  canDance: z.boolean().nullable().default(null),
  interestedInVoiceLessons: z.boolean().nullable().default(null),
  interestedInMusicFundamentals: z.boolean().nullable().default(null),

  // Merch — included on the form so admins can pre-order shirts based on the
  // accepted cohort without a follow-up survey.
  tshirtSize: z.enum(['S', 'M', 'L', 'XL', 'XXL', 'XXXL'], {
    required_error: 'Please pick a t-shirt size',
  }),
  
  // Leadership and personality
  personalityDescription: z.string().min(50, "Please describe your personality (minimum 50 words)").refine((val) => {
    const wordCount = val.trim().split(/\s+/).filter(word => word.length > 0).length;
    return wordCount >= 50;
  }, "Please write at least 50 words"),
  interestedInLeadership: z.boolean().nullable().default(null),
  additionalInfo: z.string().optional(),
  
  // Audition scheduling
  auditionDate: z.date({ required_error: "Please select an audition date" }),
  auditionTime: z.string({ required_error: "Please select an audition time" }),
}).refine((data) => {
  // Only require password confirmation for new registrations
  if (data.password) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type AuditionFormData = z.infer<typeof auditionSchema>;

interface AuditionFormContextType {
  form: UseFormReturn<AuditionFormData>;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  capturedImage: string | null;
  setCapturedImage: (image: string | null) => void;
  nextPage: () => void;
  previousPage: () => void;
  canProceed: () => boolean;
  isNewUser: boolean;
  setIsNewUser: (isNew: boolean) => void;
}

const AuditionFormContext = createContext<AuditionFormContextType | undefined>(undefined);

export function useAuditionForm() {
  const context = useContext(AuditionFormContext);
  if (!context) {
    throw new Error('useAuditionForm must be used within AuditionFormProvider');
  }
  return context;
}

interface AuditionFormProviderProps {
  children: ReactNode;
}

export function AuditionFormProvider({ children }: AuditionFormProviderProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const { user } = useAuth();
  const totalPages = user ? 5 : 6; // Add registration page for non-users

  const form = useForm<AuditionFormData>({
    resolver: zodResolver(auditionSchema),
    defaultValues: {
      email: user?.email || "",
      firstName: "",
      lastName: "",
      phone: "",
      password: "",
      confirmPassword: "",
      sangInMiddleSchool: null,
      sangInHighSchool: null,
      playsInstrument: null,
      yearsInstrumentExperience: null,
      isSoloist: null,
      readsMusic: null,
      canDance: null,
      interestedInVoiceLessons: null,
      interestedInMusicFundamentals: null,
      interestedInLeadership: null,
    },
  });

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const canProceed = (): boolean => {
    const values = form.getValues();
    const errors = form.formState.errors;
    
    // Debug logging for all pages
    console.log(`🔍 Page ${currentPage} validation:`, {
      values,
      errors,
      user: !!user
    });
    
    switch (currentPage) {
      case 1: // Registration (for new users) or Basic Info (for existing users)
        if (!user && isNewUser) {
          return !!(values.email && values.password && values.confirmPassword && 
                   values.password === values.confirmPassword);
        }
        return !!(values.firstName && values.lastName && values.email && values.phone);
      case 2: // Basic Information (for new users) or Musical Background (for existing users)
        if (!user) {
          return !!(values.firstName && values.lastName && values.phone);
        }
        // Musical background — sectionType is the only hard requirement.
        return !!values.sectionType;
      case 3: // Musical Background or Music Skills
        // For new users this is musical background; require sectionType.
        if (!user) return !!values.sectionType;
        return true;
      case 4: // Music Skills or Personal Info
        if (!user) {
          return true; // Music skills for new users
        }
        const personalityText = values.personalityDescription?.trim() || '';
        const wordCount = personalityText ? personalityText.split(/\s+/).filter(word => word.length > 0).length : 0;
        const hasValidPersonality = !!(values.personalityDescription && wordCount >= 50);
        const hasNoErrors = Object.keys(errors).length === 0;
        
        console.log('Personal Info validation:', {
          hasValidPersonality,
          hasNoErrors,
          wordCount,
          errors: Object.keys(errors)
        });
        
        return hasValidPersonality && hasNoErrors;
      case 5: // Personal Info or Selfie & Scheduling
        if (!user) {
          const personalityText = values.personalityDescription?.trim() || '';
          const wordCount = personalityText ? personalityText.split(/\s+/).filter(word => word.length > 0).length : 0;
          return !!(values.personalityDescription && wordCount >= 50);
        }
        // Final page for existing users: must have slot + photo + tshirt.
        console.log('Final page validation:', {
          auditionDate: values.auditionDate,
          auditionTime: values.auditionTime,
          capturedImage,
          tshirtSize: values.tshirtSize,
        });
        return !!(values.auditionDate && values.auditionTime && capturedImage && values.tshirtSize);
      case 6: // Selfie & Scheduling (for new users only)
        return !!(values.auditionDate && values.auditionTime && capturedImage && values.tshirtSize);
      default:
        return false;
    }
  };

  const value: AuditionFormContextType = {
    form,
    currentPage,
    setCurrentPage,
    totalPages,
    capturedImage,
    setCapturedImage,
    nextPage,
    previousPage,
    canProceed,
    isNewUser,
    setIsNewUser,
  };

  return (
    <AuditionFormContext.Provider value={value}>
      {children}
    </AuditionFormContext.Provider>
  );
}