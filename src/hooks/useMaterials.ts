import { useCallback } from 'react';
import {
  listMaterials,
  listMaterialsWithSubmissionStatus,
  MaterialSummary,
} from '../services/materials';
import { MaterialType, MaterialWithStatus } from '../types/database';
import { useAsync, UseAsyncResult } from './useAsync';

export interface UseMaterialsOptions {
  courseId: string | undefined;
  type?: MaterialType;
  studentId?: string;
}

export type AnyMaterialItem = MaterialSummary | MaterialWithStatus;

export interface UseMaterialsResult
  extends Omit<UseAsyncResult<AnyMaterialItem[]>, 'data'> {
  materials: AnyMaterialItem[];
}

/**
 * Hook providing materials list for a course, with optional type filtering and submission status.
 */
export function useMaterials(options: UseMaterialsOptions): UseMaterialsResult {
  const { courseId, type, studentId } = options;

  const fetcher = useCallback(async (): Promise<AnyMaterialItem[]> => {
    if (!courseId) {
      return [];
    }

    if (studentId) {
      return listMaterialsWithSubmissionStatus(courseId, type, studentId);
    }

    return listMaterials(courseId, type);
  }, [courseId, type, studentId]);

  const asyncState = useAsync<AnyMaterialItem[]>(fetcher, [courseId, type, studentId]);

  return {
    ...asyncState,
    materials: asyncState.data ?? [],
  };
}

