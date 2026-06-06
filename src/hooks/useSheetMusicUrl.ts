import { useState, useEffect } from 'react';
import { getFileUrl } from '@/utils/storage';
import { getSecureFileUrl } from '@/utils/secureFileAccess';

/**
 * Hook to get the appropriate URL for sheet music files
 * Handles the complexity of signed URLs for private buckets
 */
export const useSheetMusicUrl = (pdfUrl: string | null) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const objectUrlsToRevoke: string[] = [];

    if (!pdfUrl) {
      setSignedUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Blob/data URLs are already safe to use directly
    if (pdfUrl.startsWith('blob:') || pdfUrl.startsWith('data:')) {
      setSignedUrl(pdfUrl);
      setLoading(false);
      setError(null);
      return;
    }

    // DO Spaces URLs OR our same-origin /cdn/ proxy paths are public —
    // use as-is, no signing or fetch needed.
    if (
      pdfUrl.includes('digitaloceanspaces.com') ||
      pdfUrl.includes('/cdn/') ||
      pdfUrl.startsWith('https://gleeworld.org/cdn/')
    ) {
      setSignedUrl(pdfUrl);
      setLoading(false);
      setError(null);
      return;
    }

    const trackObjectUrl = (url: string | null) => {
      if (url?.startsWith('blob:')) {
        objectUrlsToRevoke.push(url);
      }

      return url;
    };

    const setResolvedUrl = (url: string | null) => {
      if (cancelled) {
        if (url?.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }

        return;
      }

      setSignedUrl(url);
    };

    const getSecureOrStandardUrl = async (bucket: string, path: string) => {
      const secureUrl = await getSecureFileUrl(bucket, path);
      if (secureUrl) {
        return trackObjectUrl(secureUrl);
      }

      return await getFileUrl(bucket, path);
    };

    const extractBucketAndPath = (storageUrl: string) => {
      const signedPrefix = '/storage/v1/object/sign/';
      if (storageUrl.includes(signedPrefix)) {
        const afterBase = storageUrl.split(signedPrefix)[1];
        const segments = afterBase.split('/');
        const bucket = segments[0];
        const path = decodeURIComponent(segments.slice(1).join('/').split('?')[0]);

        return bucket && path ? { bucket, path } : null;
      }

      const objectPrefix = '/storage/v1/object/';
      if (!storageUrl.includes(objectPrefix)) {
        return null;
      }

      const afterBase = storageUrl.split(objectPrefix)[1];
      const segments = afterBase.split('/');
      const hasVisibilityPrefix = ['public', 'sign', 'authenticated'].includes(segments[0]);
      const bucketIndex = hasVisibilityPrefix ? 1 : 0;
      const pathIndex = bucketIndex + 1;
      const bucket = segments[bucketIndex];
      const path = decodeURIComponent(segments.slice(pathIndex).join('/').split('?')[0]);

      return bucket && path ? { bucket, path } : null;
    };

    const getUrl = async () => {
      setLoading(true);
      setError(null);

      try {
        const isSupabaseStorage = pdfUrl.includes('.supabase.co/storage/v1/object/');
        const isHttp = /^https?:\/\//.test(pdfUrl);

        if (isSupabaseStorage) {
          const extracted = extractBucketAndPath(pdfUrl);

          if (!extracted) {
            throw new Error('Could not resolve storage file path');
          }

          console.log('useSheetMusicUrl: Resolving storage file through secure download:', extracted);

          const url = await getSecureOrStandardUrl(extracted.bucket, extracted.path);
          if (!url) {
            throw new Error('Failed to resolve storage URL');
          }

          setResolvedUrl(url);
          return;
        }

        // Non-Supabase absolute URLs: use as-is
        if (isHttp && !isSupabaseStorage) {
          setResolvedUrl(pdfUrl);
          return;
        }

        // Handle storage-style paths like: bucket/folder/file.pdf
        const raw = pdfUrl.replace(/^https?:\/\/[^/]+\//, '');
        const parts = raw.split('/');
        const bucket = parts[0];
        if (!bucket) {
          setResolvedUrl(pdfUrl);
          return;
        }
        const pathWithQuery = parts.slice(1).join('/');
        const path = decodeURIComponent(pathWithQuery.split('?')[0]);

        const url = await getSecureOrStandardUrl(bucket, path);
        if (!url) {
          throw new Error('Failed to resolve file URL');
        }

        setResolvedUrl(url);
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error('Error getting sheet music URL:', err);
        setError(err instanceof Error ? err.message : 'Failed to load sheet music');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    getUrl();

    return () => {
      cancelled = true;
      objectUrlsToRevoke.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pdfUrl]);

  return { signedUrl, loading, error };
};