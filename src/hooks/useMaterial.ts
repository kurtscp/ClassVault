import { useCallback } from 'react';
import { getMaterial, MaterialDetail } from '../services/materials';
import { useAsync, UseAsyncResult } from './useAsync';

export interface UseMaterialResult
  extends Omit<UseAsyncResult<MaterialDetail | null>, 'data'> {
  material: MaterialDetail | null;
}

/**
 * Hook fetching a single material with its parent course metadata.
 * Used by the material detail screen.
 */
export function useMaterial(materialId: string | undefined): UseMaterialResult {
  const fetcher = useCallback(async (): Promise<MaterialDetail | null> => {
    if (!materialId) return null;
    return getMaterial(materialId);
  }, [materialId]);

  const asyncState = useAsync<MaterialDetail | null>(fetcher, [materialId]);

  return {
    ...asyncState,
    material: asyncState.data ?? null,
  };
}
