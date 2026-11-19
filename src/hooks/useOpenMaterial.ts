import { useCallback, useState } from 'react';
import { Linking, Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { getSignedUrl } from '@/services/storage';
import { logMaterialView } from '@/services/views';

export interface OpenableMaterial {
  id: string;
  file_path?: string;
}

export interface UseOpenMaterialResult {
  open: (material: OpenableMaterial) => Promise<void>;
  openingId: string | null;
  error: string | null;
  clearError: () => void;
}

/**
 * Hook to request short-lived signed URLs and open materials in native viewers / browser.
 * Logs views for analytics asynchronously without blocking the open flow.
 * Supports both full Material records and partial MaterialSummary items.
 */
export function useOpenMaterial(): UseOpenMaterialResult {
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const open = useCallback(async (material: OpenableMaterial) => {
    if (openingId !== null) {
      return;
    }

    setError(null);
    setOpeningId(material.id);

    // Fire-and-forget view logging (do not await, non-blocking)
    void logMaterialView(material.id);

    try {
      let resolvedPath: string;
      if (material.file_path) {
        resolvedPath = material.file_path;
      } else {
        // Query storage path if caller passed a lightweight summary (DT-3)
        const { data, error: fetchError } = await supabase
          .from('materials')
          .select('file_path')
          .eq('id', material.id)
          .single();

        const fetchedPath = data && typeof data.file_path === 'string' ? data.file_path : null;
        if (fetchError || !fetchedPath) {
          throw new Error('File path not found');
        }
        resolvedPath = fetchedPath;
      }

      // Fetch 1-hour signed URL from private bucket (SEC-5)
      const signedUrl = await getSignedUrl(resolvedPath);

      // Hand off URL to OS viewer/browser without storing signed URL in persistent state (SEC-4)
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.open(signedUrl, '_blank', 'noopener');
        }
      } else {
        await Linking.openURL(signedUrl);
      }
    } catch {
      setError("We couldn't open this file. Check your connection and try again.");
    } finally {
      setOpeningId(null);
    }
  }, [openingId]);

  return { open, openingId, error, clearError };
}
