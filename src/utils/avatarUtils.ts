import { supabase } from "@/integrations/supabase/client";

/**
 * Constructs a proper avatar URL from the stored avatar_url field
 * Handles both full URLs and file paths
 */
export const getAvatarUrl = (avatarUrl: string | null | undefined): string => {
  if (!avatarUrl) {
    return "/placeholder.svg";
  }

  // If it's already a full URL, return as is
  if (avatarUrl.startsWith('http')) {
    return avatarUrl;
  }

  // If it's a file path, construct the public URL
  if (avatarUrl.startsWith('avatars/')) {
    const { data } = supabase.storage
      .from('user-files')
      .getPublicUrl(avatarUrl);
    return data.publicUrl;
  }

  // Fallback to placeholder
  return "/placeholder.svg";
};

/**
 * Generates initials from a full name
 */
export const getInitials = (fullName: string | null | undefined): string => {
  if (!fullName) return "";
  
  return fullName
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2); // Limit to 2 characters
};