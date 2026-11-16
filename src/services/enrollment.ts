import { toUserMessage } from '../lib/errors';
import { supabase } from '../lib/supabase';
import { AppError } from '../types/domain';

/**
 * Enrolls the authenticated student in a course using a 6-character join code (SEC-7).
 * Calls the enroll_with_code RPC function (SECURITY DEFINER) which validates the caller
 * is a student and inserts the enrollment row idempotently.
 *
 * @param joinCode 6-character alphanumeric course join code
 * @returns The enrolled course ID (uuid)
 */
export async function enrollWithCode(joinCode: string): Promise<string> {
  const cleanCode = joinCode.toUpperCase().trim();

  const { data, error } = await supabase.rpc('enroll_with_code', {
    p_join_code: cleanCode,
  });

  if (error) {
    throw new AppError(error.code ?? 'ENROLL_FAILED', toUserMessage(error), error);
  }

  if (!data) {
    throw new AppError('ENROLL_FAILED', 'Failed to enroll in course. Try again.');
  }

  return data as string;
}

/**
 * Retrieves the list of course IDs for which the specified student is enrolled.
 * Selects only course_id (DT-3) for filtering.
 *
 * @param studentId User ID of the student
 * @returns Array of course IDs
 */
export async function getMyEnrollments(studentId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', studentId);

  if (error) {
    throw new AppError(error.code ?? 'GET_ENROLLMENTS_FAILED', toUserMessage(error), error);
  }

  return (data as { course_id: string }[]).map((row) => row.course_id);
}

/**
 * Unenrolls the current student from the specified course.
 * RLS policy enrollments_delete_participant enforces student_id = auth.uid().
 *
 * @param courseId Course ID to unenroll from
 */
export async function unenrollFromCourse(courseId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError('AUTH_REQUIRED', 'You must be signed in to unenroll from a course.');
  }

  const { error } = await supabase
    .from('enrollments')
    .delete()
    .eq('course_id', courseId)
    .eq('student_id', user.id);

  if (error) {
    throw new AppError(error.code ?? 'UNENROLL_FAILED', toUserMessage(error), error);
  }
}
