import { toUserMessage } from '../lib/errors';
import { supabase } from '../lib/supabase';
import { Course, Material, MaterialType, MaterialWithStatus } from '../types/database';
import { AppError } from '../types/domain';

export type MaterialSummary = Pick<
  Material,
  'id' | 'course_id' | 'title' | 'type' | 'file_name' | 'size_bytes' | 'created_at'
>;

export type MaterialDetail = Material & {
  course: Pick<Course, 'id' | 'code' | 'title' | 'instructor_id'> | null;
};

interface EmbeddedSubmissionRow {
  id: string;
  student_id: string;
  grade: number | null;
  created_at: string;
}

interface MaterialQueryRow extends Material {
  submissions?: EmbeddedSubmissionRow[];
}

/**
 * Retrieves material summaries for a course, optionally filtered by material type.
 * Ordered newest first.
 */
export async function listMaterials(
  courseId: string,
  type?: MaterialType
): Promise<MaterialSummary[]> {
  let query = supabase
    .from('materials')
    .select('id, course_id, title, type, file_name, size_bytes, created_at')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;

  if (error) {
    throw new AppError(error.code ?? 'LIST_MATERIALS_FAILED', toUserMessage(error), error);
  }

  return (data as unknown as MaterialSummary[]) ?? [];
}

/**
 * Retrieves a single material with its parent course metadata for detail views.
 */
export async function getMaterial(materialId: string): Promise<MaterialDetail> {
  const { data, error } = await supabase
    .from('materials')
    .select(`
      id,
      course_id,
      uploader_id,
      title,
      type,
      file_path,
      file_name,
      mime_type,
      size_bytes,
      created_at,
      course:courses!course_id(id, code, title, instructor_id)
    `)
    .eq('id', materialId)
    .single();

  if (error || !data) {
    throw new AppError(
      'MATERIAL_NOT_FOUND',
      'Material not found. It may have been removed.',
      error
    );
  }

  return data as unknown as MaterialDetail;
}

/**
 * Retrieves materials for a course along with student-specific submission and grading status.
 * Exercises evaluate to 'not_submitted', 'submitted', or 'graded'.
 */
export async function listMaterialsWithSubmissionStatus(
  courseId: string,
  type?: MaterialType,
  studentId?: string
): Promise<MaterialWithStatus[]> {
  let query = supabase
    .from('materials')
    .select(`
      id,
      course_id,
      uploader_id,
      title,
      type,
      file_path,
      file_name,
      mime_type,
      size_bytes,
      created_at,
      submissions(id, student_id, grade, created_at)
    `)
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;

  if (error) {
    throw new AppError(
      error.code ?? 'LIST_MATERIALS_STATUS_FAILED',
      toUserMessage(error),
      error
    );
  }

  const rows = (data as unknown as MaterialQueryRow[]) ?? [];

  return rows.map((row) => {
    const { submissions, ...material } = row;

    if (material.type !== 'exercise') {
      return material;
    }

    // Match student's submission record (enforced also by RLS policy submissions_select_own_or_instructor)
    const studentSub = submissions?.find((s) => !studentId || s.student_id === studentId);

    if (!studentSub) {
      return {
        ...material,
        submission_status: 'not_submitted',
      };
    }

    if (studentSub.grade !== null && studentSub.grade !== undefined) {
      return {
        ...material,
        submission_status: 'graded',
        grade: Number(studentSub.grade),
      };
    }

    return {
      ...material,
      submission_status: 'submitted',
    };
  });
}

