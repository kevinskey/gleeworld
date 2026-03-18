export interface MessengerProfileLike {
  user_id: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  phone_number?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  status?: string | null;
}

export interface NormalizedMessengerProfile extends MessengerProfileLike {
  user_id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
}

const cleanString = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const getMessengerDisplayName = (profile: Partial<MessengerProfileLike>) => {
  const fullName = cleanString(profile.full_name);
  if (fullName) return fullName;

  const fallbackName = cleanString([profile.first_name, profile.last_name].filter(Boolean).join(' '));
  if (fallbackName) return fallbackName;

  const email = cleanString(profile.email);
  if (email) return email.split('@')[0];

  return 'Unknown';
};

export const getMessengerPhoneNumber = (profile: Partial<MessengerProfileLike>) => {
  return cleanString(profile.phone_number) || cleanString(profile.phone) || null;
};

export const normalizeMessengerProfile = <T extends MessengerProfileLike>(profile: T): Omit<T, 'user_id' | 'full_name' | 'email' | 'phone_number'> & NormalizedMessengerProfile => {
  return {
    ...profile,
    user_id: profile.user_id || '',
    full_name: getMessengerDisplayName(profile),
    email: cleanString(profile.email) || '',
    phone_number: getMessengerPhoneNumber(profile),
  };
};
