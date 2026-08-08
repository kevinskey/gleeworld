import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, getTenantSlug } from '@/integrations/supabase/client';
import { buildAuditionPages, canLeavePage, type AuditionPageId } from './auditionPages';

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
  playsInstrument: z.boolean().nullable().default(null),
  instrumentDetails: z.string().optional(),
  yearsInstrumentExperience: z.number().int().min(0).nullable().optional(),
  isSoloist: z.boolean().nullable().default(null),
  soloistRating: z.string().optional(),

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
  
  // Personality. Deliberately unconstrained: any amount of text is fine.
  // This used to carry three separate gates — a 50-CHARACTER .min() whose
  // message claimed words, a 50-word .refine(), and a word count in
  // canLeavePage — and they are all gone on purpose. Do not re-add a minimum.
  personalityDescription: z.string().optional(),
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

// Draft persistence — six pages of answers must survive a refresh, which is
// the entire complaint this feature exists to fix. sessionStorage (not
// localStorage) so a draft doesn't outlive the tab/visit.
const DRAFT_KEY = `audition-draft:${getTenantSlug()}`;

// Credentials are never written to storage. capturedImage lives in separate
// component state (not on the RHF form — see AuditionFormProvider below) and
// is therefore never part of `values` here, which matters because it's a
// base64 data URL big enough to blow the ~5MB sessionStorage quota by itself.
const OMIT_FROM_DRAFT = ['password', 'confirmPassword'] as const;

function readDraft(): Partial<AuditionFormData> {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function clearAuditionDraft() {
  sessionStorage.removeItem(DRAFT_KEY);
}

interface AuditionFormContextType {
  form: UseFormReturn<AuditionFormData>;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  pages: AuditionPageId[];
  currentPageId: AuditionPageId;
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
  const { user } = useAuth();
  const pages = useMemo(() => buildAuditionPages(!!user), [user]);
  const totalPages = pages.length;
  const currentPageId = pages[currentPage - 1];

  const draft = useMemo(() => readDraft(), []);

  const form = useForm<AuditionFormData>({
    resolver: zodResolver(auditionSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      password: "",
      confirmPassword: "",
      playsInstrument: null,
      yearsInstrumentExperience: null,
      isSoloist: null,
      readsMusic: null,
      canDance: null,
      interestedInVoiceLessons: null,
      interestedInMusicFundamentals: null,
      ...draft,
      // The draft round-trips through JSON, so a stored auditionDate arrives
      // as a string — revive it or the date picker gets a string where it
      // expects a Date. Email prefers the draft (it's what the visitor was
      // typing) but falls back to the signed-in user's address.
      email: draft.email || user?.email || "",
      auditionDate: draft.auditionDate
        ? new Date(draft.auditionDate as unknown as string)
        : undefined,
    },
  });

  // Persist every change so a refresh mid-interview restores the answers.
  // Credentials are stripped before the write lands in sessionStorage.
  useEffect(() => {
    const sub = form.watch((values) => {
      const snapshot = { ...values } as Record<string, unknown>;
      for (const key of OMIT_FROM_DRAFT) delete snapshot[key];
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot));
      } catch {
        // Quota or private-mode failure is not worth interrupting the form over.
      }
    });
    return () => sub.unsubscribe();
  }, [form]);

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
    return canLeavePage(pages[currentPage - 1], form.getValues(), {
      capturedImage,
      errors: form.formState.errors,
    });
  };

  const value: AuditionFormContextType = {
    form,
    currentPage,
    setCurrentPage,
    totalPages,
    pages,
    currentPageId,
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