import { toUserMessage } from '../lib/errors';
import { supabase } from '../lib/supabase';
import { Submission } from '../types/database';
import { AppError } from '../types/domain';

/**
 * Fetches the authenticated student's own submission for a given exercise material.
 * Returns null if no submission exists yet.
 * RLS policy submissions_select_own_or_instructor ensures only the student or
 * course instructor can read this row.
 */
export async function getStudentSubmission(
  materialId: string,
  studentId: string
): Promise<Submission | null> {
  const { data, error } = await supabase
    .from('submissions')
    .select(
      'id, material_id, student_id, file_path, file_name, mime_type, size_bytes, grade, graded_by, graded_at, created_at'
    )
    .eq('material_id', materialId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (error) {
    throw new AppError(
      error.code ?? 'GET_SUBMISSION_FAILED',
      toUserMessage(error),
      error
    );
  }

  return data as Submission | null;
}
