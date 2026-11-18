import { useCallback } from 'react';
import {
  deleteCourse,
  EnrolledStudent,
  getCourse,
  listEnrolledStudents,
  removeStudent,
} from '../services/courses';
import { CourseListItem } from '../types/database';
import { useAsync, UseAsyncResult } from './useAsync';

export interface UseCourseResult
  extends Omit<UseAsyncResult<CourseListItem | null>, 'data'> {
  course: CourseListItem | null;
  removeCourse: () => Promise<void>;
  fetchStudents: () => Promise<EnrolledStudent[]>;
  kickStudent: (studentId: string) => Promise<void>;
}

/**
 * Hook providing data and management operations for a single course (P3.4).
 */
export function useCourse(courseId: string | undefined): UseCourseResult {
  const fetcher = useCallback(async (): Promise<CourseListItem | null> => {
    if (!courseId) {
      return null;
    }
    return getCourse(courseId);
  }, [courseId]);

  const asyncState = useAsync<CourseListItem | null>(fetcher, [courseId]);

  const removeCourse = useCallback(async () => {
    if (!courseId) {
      return;
    }
    await deleteCourse(courseId);
  }, [courseId]);

  const fetchStudents = useCallback(async (): Promise<EnrolledStudent[]> => {
    if (!courseId) {
      return [];
    }
    return listEnrolledStudents(courseId);
  }, [courseId]);

  const kickStudent = useCallback(
    async (studentId: string) => {
      if (!courseId) {
        return;
      }
      await removeStudent(courseId, studentId);
      await asyncState.refetch();
    },
    [courseId, asyncState]
  );

  return {
    ...asyncState,
    course: asyncState.data,
    removeCourse,
    fetchStudents,
    kickStudent,
  };
}

