import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';

import { toUserMessage } from '../lib/errors';
import { enrollWithCode, unenrollFromCourse } from '../services/enrollment';

export interface UseEnrollmentOptions {
  onCoursesRefetch?: () => void;
}

export interface UseEnrollmentResult {
  enroll: (code: string) => Promise<string | undefined>;
  isEnrolling: boolean;
  unenroll: (courseId: string) => Promise<void>;
  isUnenrolling: boolean;
  error: string | null;
}

export function useEnrollment(options?: UseEnrollmentOptions): UseEnrollmentResult {
  const router = useRouter();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isUnenrolling, setIsUnenrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enroll = useCallback(
    async (code: string): Promise<string | undefined> => {
      setIsEnrolling(true);
      setError(null);
      try {
        const courseId = await enrollWithCode(code);
        options?.onCoursesRefetch?.();
        router.replace('/(app)/(tabs)');
        return courseId;
      } catch (err) {
        const msg = toUserMessage(err);
        setError(msg);
        throw err;
      } finally {
        setIsEnrolling(false);
      }
    },
    [router, options]
  );

  const unenroll = useCallback(
    async (courseId: string): Promise<void> => {
      setIsUnenrolling(true);
      setError(null);
      try {
        await unenrollFromCourse(courseId);
        options?.onCoursesRefetch?.();
        router.replace('/(app)/(tabs)');
      } catch (err) {
        const msg = toUserMessage(err);
        setError(msg);
        throw err;
      } finally {
        setIsUnenrolling(false);
      }
    },
    [router, options]
  );

  return {
    enroll,
    isEnrolling,
    unenroll,
    isUnenrolling,
    error,
  };
}
