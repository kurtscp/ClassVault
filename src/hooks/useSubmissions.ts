import { useCallback, useState } from 'react';

import {
  getMySubmission,
  gradeSubmission,
  listSubmissionsForExercise,
  type SubmissionWithStudent,
} from '../services/submissions';
import { type Submission } from '../types/database';
import { useAsync } from './useAsync';
import { useAuth } from './useAuth';

export interface UseMySubmissionResult {
  submission: Submission | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook providing the authenticated student's own submission for an exercise.
 */
export function useMySubmission(materialId: string | undefined): UseMySubmissionResult {
  const { user } = useAuth();
  const studentId = user?.id;

  const fetcher = useCallback(async (): Promise<Submission | null> => {
    if (!materialId || !studentId) return null;
    return getMySubmission(materialId, studentId);
  }, [materialId, studentId]);

  const { data, error, isLoading, refetch } = useAsync<Submission | null>(fetcher, [
    materialId,
    studentId,
  ]);

  return {
    submission: data,
    isLoading,
    error,
    refetch,
  };
}

export interface UseSubmissionsResult {
  submissions: SubmissionWithStudent[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  grade: (submissionId: string, gradeValue: number) => Promise<Submission>;
  isGrading: boolean;
}

/**
 * Hook providing the course instructor with all student submissions for an exercise.
 */
export function useSubmissions(materialId: string | undefined): UseSubmissionsResult {
  const [isGrading, setIsGrading] = useState(false);

  const fetcher = useCallback(async (): Promise<SubmissionWithStudent[]> => {
    if (!materialId) return [];
    return listSubmissionsForExercise(materialId);
  }, [materialId]);

  const { data, error, isLoading, refetch } = useAsync<SubmissionWithStudent[]>(fetcher, [
    materialId,
  ]);

  const grade = useCallback(
    async (submissionId: string, gradeValue: number): Promise<Submission> => {
      setIsGrading(true);
      try {
        const result = await gradeSubmission(submissionId, gradeValue);
        await refetch();
        return result;
      } finally {
        setIsGrading(false);
      }
    },
    [refetch]
  );

  return {
    submissions: data ?? [],
    isLoading,
    error,
    refetch,
    grade,
    isGrading,
  };
}
