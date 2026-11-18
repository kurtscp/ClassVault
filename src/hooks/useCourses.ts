import { useCallback } from 'react';
import { createCourse, CreateCourseParams, listCourses } from '../services/courses';
import { Course, CourseListItem } from '../types/database';
import { useAsync, UseAsyncResult } from './useAsync';

export interface UseCoursesResult
  extends Omit<UseAsyncResult<CourseListItem[]>, 'data'> {
  courses: CourseListItem[];
  create: (params: CreateCourseParams) => Promise<Course>;
}

/**
 * Hook managing the course list dashboard data (P3.2).
 * Automatically scoped by RLS depending on instructor or student session.
 */
export function useCourses(): UseCoursesResult {
  const asyncState = useAsync<CourseListItem[]>(listCourses, []);

  const create = useCallback(
    async (params: CreateCourseParams): Promise<Course> => {
      const created = await createCourse(params);
      await asyncState.refetch();
      return created;
    },
    [asyncState]
  );

  return {
    ...asyncState,
    courses: asyncState.data ?? [],
    create,
  };
}

