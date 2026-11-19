import { FileSystemUploadType, uploadAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../lib/env';
import { toUserMessage } from '../lib/errors';
import { contentTypeFromName, sanitizeFileName, validatePickedFile } from '../lib/files';
import { supabase } from '../lib/supabase';
import { Submission } from '../types/database';
import { AppError } from '../types/domain';
import { UploadableFile } from './storage';

export interface SubmitExerciseParams {
  courseId: string;
  materialId: string;
  file: UploadableFile;
}

export interface SubmissionWithStudent extends Submission {
  student: {
    id: string;
    full_name: string;
  } | null;
}

/**
 * Generates an RFC-compliant v4 UUID for unique storage object naming.
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Checks storage metadata via info or list to confirm the uploaded file matches expected size.
 */
async function verifyStoredFileSize(
  bucket: string,
  filePath: string,
  expectedSize: number
): Promise<boolean> {
  if (!expectedSize || expectedSize <= 0) return true;
  try {
    const { data, error } = await supabase.storage.from(bucket).info(filePath);
    if (!error && data && typeof data.size === 'number') {
      return data.size === expectedSize;
    }
  } catch {
    // Proceed to fallback list search below
  }

  try {
    const parts = filePath.split('/');
    const name = parts.pop() || '';
    const folder = parts.join('/');
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, { search: name, limit: 1 });
    if (!error && data && data.length > 0) {
      const match = data.find((item) => item.name === name);
      return match?.metadata && typeof match.metadata.size === 'number'
        ? match.metadata.size === expectedSize
        : false;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Streams files directly from native disk to Supabase Storage endpoint (FH-2).
 * Avoids loading 80 MB files into JavaScript RAM as Base64 or ArrayBuffer.
 */
async function uploadNativeSubmission(
  storagePath: string,
  fileUri: string,
  mimeType: string
): Promise<void> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.access_token) {
    throw new AppError('UNAUTHENTICATED', 'Your session has expired. Please sign in again.');
  }

  const cleanUrl = SUPABASE_URL.replace(/\/+$/, '');
  const uploadUrl = `${cleanUrl}/storage/v1/object/submission-files/${storagePath}`;

  const result = await uploadAsync(uploadUrl, fileUri, {
    httpMethod: 'POST',
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': mimeType,
      'x-upsert': 'true',
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new AppError('UPLOAD_FAILED', toUserMessage(result.body || 'Failed to upload file to storage.'));
  }
}

/**
 * Uploads submission file on web using browser File/Blob API (CD-5).
 */
async function uploadWebSubmission(
  storagePath: string,
  file: UploadableFile,
  mimeType: string
): Promise<void> {
  let fileBody: Blob | File | undefined = file.file;
  if (!fileBody && file.uri) {
    const response = await fetch(file.uri);
    fileBody = await response.blob();
  }

  if (!fileBody) {
    throw new AppError('INVALID_FILE', 'No readable file was provided for upload.');
  }

  const { error } = await supabase.storage
    .from('submission-files')
    .upload(storagePath, fileBody, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    throw new AppError('UPLOAD_FAILED', toUserMessage(error));
  }
}

/**
 * Removes an existing submission file from storage prior to replacing it (FH-3).
 */
async function deleteOldSubmissionFile(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from('submission-files')
    .remove([filePath]);

  if (error) {
    throw new AppError(
      'STORAGE_DELETE_FAILED',
      toUserMessage(error || 'Failed to remove old submission file.')
    );
  }
}

/**
 * Inserts or updates the submissions record and cleans up storage if DB write fails (FH-3).
 */
async function saveSubmissionRow(
  materialId: string,
  studentId: string,
  storagePath: string,
  file: UploadableFile,
  mimeType: string
): Promise<Submission> {
  const { data, error } = await supabase
    .from('submissions')
    .upsert(
      {
        material_id: materialId,
        student_id: studentId,
        file_path: storagePath,
        file_name: file.name,
        mime_type: mimeType,
        size_bytes: file.size ?? 0,
        grade: null,
        graded_by: null,
        graded_at: null,
      },
      { onConflict: 'material_id,student_id' }
    )
    .select(
      'id, material_id, student_id, file_path, file_name, mime_type, size_bytes, grade, graded_by, graded_at, created_at'
    )
    .single();

  if (error || !data) {
    try {
      await supabase.storage.from('submission-files').remove([storagePath]);
    } catch {
      // Best-effort cleanup of orphan storage object
    }
    throw new AppError('DB_INSERT_FAILED', toUserMessage(error || 'Failed to record your submission.'));
  }

  return data as Submission;
}

/**
 * Validates, uploads, and upserts a student's exercise submission.
 * Enforces safe two-step replacement: deletes old storage file first, then uploads new file.
 */
export async function submitExercise(params: SubmitExerciseParams): Promise<Submission> {
  const { courseId, materialId, file } = params;

  const validationError = validatePickedFile(file);
  if (validationError) {
    throw new AppError('INVALID_FILE', validationError);
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new AppError('UNAUTHENTICATED', 'You must be signed in to submit an exercise.');
  }
  const studentId = userData.user.id;

  const existing = await getStudentSubmission(materialId, studentId);
  if (existing?.file_path) {
    await deleteOldSubmissionFile(existing.file_path);
  }

  const mimeType = contentTypeFromName(file.name);
  const storagePath = `${courseId}/${studentId}/${materialId}-${generateUUID()}-${sanitizeFileName(file.name)}`;

  if (Platform.OS === 'web') {
    await uploadWebSubmission(storagePath, file, mimeType);
  } else {
    await uploadNativeSubmission(storagePath, file.uri, mimeType);
  }

  if (file.size && file.size > 0) {
    const sizeOk = await verifyStoredFileSize('submission-files', storagePath, file.size);
    if (!sizeOk) {
      await supabase.storage.from('submission-files').remove([storagePath]);
      throw new AppError('UPLOAD_SIZE_MISMATCH', "The upload didn't finish correctly. Try again.");
    }
  }

  return saveSubmissionRow(materialId, studentId, storagePath, file, mimeType);
}

/**
 * Fetches the authenticated student's own submission for a given exercise material.
 * RLS: submissions_select_own_or_instructor ensures student or course instructor only.
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

/**
 * Alias for getStudentSubmission adhering to prompt specification.
 */
export async function getMySubmission(
  materialId: string,
  studentId: string
): Promise<Submission | null> {
  return getStudentSubmission(materialId, studentId);
}

/**
 * Lists all student submissions for an exercise with student names.
 * Used by instructors to review and grade submissions.
 * RLS: submissions_select_own_or_instructor allows instructor to read all submissions in their course.
 */
export async function listSubmissionsForExercise(
  materialId: string
): Promise<SubmissionWithStudent[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select(
      'id, material_id, student_id, file_path, file_name, mime_type, size_bytes, grade, graded_by, graded_at, created_at, student:profiles!student_id(id, full_name)'
    )
    .eq('material_id', materialId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(
      error.code ?? 'LIST_SUBMISSIONS_FAILED',
      toUserMessage(error),
      error
    );
  }

  return (data ?? []) as unknown as SubmissionWithStudent[];
}

/**
 * Updates a submission with a score from 0-100.
 * RLS: submissions_update_grade_instructor restricts updates to course instructor.
 */
export async function gradeSubmission(
  submissionId: string,
  grade: number
): Promise<Submission> {
  if (typeof grade !== 'number' || grade < 0 || grade > 100 || isNaN(grade)) {
    throw new AppError('INVALID_GRADE', 'Grade must be a number between 0 and 100.');
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new AppError('UNAUTHENTICATED', 'You must be signed in to grade submissions.');
  }

  const { data, error } = await supabase
    .from('submissions')
    .update({
      grade,
      graded_by: userData.user.id,
      graded_at: new Date().toISOString(),
    })
    .eq('id', submissionId)
    .select(
      'id, material_id, student_id, file_path, file_name, mime_type, size_bytes, grade, graded_by, graded_at, created_at'
    )
    .single();

  if (error || !data) {
    throw new AppError(
      error?.code ?? 'GRADE_SUBMISSION_FAILED',
      toUserMessage(error || 'Failed to update submission grade.'),
      error
    );
  }

  return data as Submission;
}

/**
 * Generates a short-lived (1-hour) signed download URL from private submission-files bucket (SEC-5).
 */
export async function getSubmissionSignedUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('submission-files')
    .createSignedUrl(filePath, 3600);

  if (error || !data?.signedUrl) {
    throw new AppError(
      'SIGNED_URL_FAILED',
      toUserMessage(error || 'Failed to generate download link.')
    );
  }

  return data.signedUrl;
}
