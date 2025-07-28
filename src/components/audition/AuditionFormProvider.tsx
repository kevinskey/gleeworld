import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const auditionSchema = z.object({
  // Basic info
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  
  // Musical background
  sangInMiddleSchool: z.boolean(),
  sangInHighSchool: z.boolean(),
  highSchoolYears: z.string().optional(),
  playsInstrument: z.boolean(),
  instrumentDetails: z.string().optional(),
  isSoloist: z.boolean(),
  soloistRating: z.string().optional(),
  highSchoolSection: z.string().optional(),
  
  // Music skills
  readsMusic: z.boolean(),
  interestedInVoiceLessons: z.boolean(),
  interestedInMusicFundamentals: z.boolean(),
  
  // Leadership and personality
  personalityDescription: z.string().min(10, "Please describe your personality"),
  interestedInLeadership: z.boolean(),
  additionalInfo: z.string().optional(),
  
  // Audition scheduling
  auditionDate: z.date({ required_error: "Please select an audition date" }),
  auditionTime: z.string({ required_error: "Please select an audition time" }),
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
  const totalPages = 5;

  const form = useForm<AuditionFormData>({
    resolver: zodResolver(auditionSchema),
    defaultValues: {
      sangInMiddleSchool: false,
      sangInHighSchool: false,
      playsInstrument: false,
      isSoloist: false,
      readsMusic: false,
      interestedInVoiceLessons: false,
      interestedInMusicFundamentals: false,
      interestedInLeadership: false,
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
    
    switch (currentPage) {
      case 1: // Basic Information
        return !!(values.firstName && values.lastName && values.email && values.phone);
      case 2: // Musical Background
        return true; // All fields are optional or conditional
      case 3: // Music Skills & Interests
        return true; // All fields are optional
      case 4: // Personal Information
        return !!(values.personalityDescription && values.personalityDescription.length >= 10);
      case 5: // Selfie & Scheduling
        return !!(values.auditionDate && values.auditionTime && capturedImage);
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
  };

  return (
    <AuditionFormContext.Provider value={value}>
      {children}
    </AuditionFormContext.Provider>
  );
}