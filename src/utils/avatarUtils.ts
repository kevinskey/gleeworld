import { supabase } from "@/integrations/supabase/client";

/**
 * Constructs a proper avatar URL from the stored avatar_url field
 * Handles both full URLs and file paths
 */
export const getAvatarUrl = (avatarUrl: string | null | undefined): string => {
  console.log('getAvatarUrl called with:', avatarUrl);
  
  if (!avatarUrl) {
    console.log('No avatar URL provided, using placeholder');
    return getRandomPlaceholderAvatar();
  }

  // If it's already a full URL, return as is
  if (avatarUrl.startsWith('http')) {
    console.log('Avatar URL is already a full URL');
    return avatarUrl;
  }

  // If it's a file path, construct the public URL
  if (avatarUrl.startsWith('avatars/')) {
    console.log('Avatar URL is a storage path, constructing public URL');
    const { data } = supabase.storage
      .from('user-files')
      .getPublicUrl(avatarUrl);
    console.log('Constructed public URL:', data.publicUrl);
    return data.publicUrl;
  }

  // Handle other possible storage paths
  if (avatarUrl.includes('/') && !avatarUrl.startsWith('http')) {
    console.log('Avatar URL appears to be a storage path, constructing public URL');
    const { data } = supabase.storage
      .from('user-files')
      .getPublicUrl(avatarUrl);
    console.log('Constructed public URL:', data.publicUrl);
    return data.publicUrl;
  }

  // Fallback to random placeholder
  console.log('Avatar URL format not recognized, using placeholder');
  return getRandomPlaceholderAvatar();
};

/**
 * Returns a random placeholder avatar from Unsplash
 */
export const getRandomPlaceholderAvatar = (): string => {
  const placeholders = [
    'https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1485833077593-4278bba3f11f?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1438565434616-3ef039228b15?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1501286353178-1ec881214838?w=150&h=150&fit=crop&crop=face'
  ];
  
  return placeholders[Math.floor(Math.random() * placeholders.length)];
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