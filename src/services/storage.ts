import { FileSystemUploadType, uploadAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../lib/env';
import { toUserMessage } from '../lib/errors';
import { contentTypeFromName, sanitizeFileName, validatePickedFile } from '../lib/files';
import { supabase } from '../lib/supabase';
import { Material, MaterialType } from '../types/database';
import { AppError } from '../types/domain';

export interface UploadableFile {
  name: string;
  size?: number | null;
  uri: string;
  file?: File;
  mimeType?: string;
}

export interface UploadMaterialParams {
  courseId: string;
  type: MaterialType;
  title: string;
  file: UploadableFile;
}

export interface BatchUploadProgressInfo {
  currentIndex: number;
  totalFiles: number;
  currentFileName: string;
}

export interface BatchUploadResult {
  succeeded: Material[];
  failed: Array<{ name: string; message: string }>;
}

export interface UploadBatchItem extends UploadableFile {
  title?: string;
}

export interface UploadMaterialBatchParams {
  courseId: string;
  type: MaterialType;
  files: UploadBatchItem[];
  onProgress?: (info: BatchUploadProgressInfo) => void;
}

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

async function verifyViaInfo(bucket: string, filePath: string, expectedSize: number): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage.from(bucket).info(filePath);
    return !error && data && typeof data.size === 'number' ? data.size === expectedSize : false;
  } catch {
    return false;
  }
}

async function verifyViaList(bucket: string, filePath: string, expectedSize: number): Promise<boolean> {
  try {
    const pathParts = filePath.split('/');
    const fileName = pathParts.pop() || '';
    const folder = pathParts.join('/');
    const { data, error } = await supabase.storage.from(bucket).list(folder, { search: fileName, limit: 1 });
    if (!error && data && data.length > 0) {
      const match = data.find((item) => item.name === fileName);
      return match?.metadata && typeof match.metadata.size === 'number' ? match.metadata.size === expectedSize : false;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Confirms that the uploaded file in storage matches the local file size.
 */
async function verifyStoredFileSize(bucket: string, filePath: string, expectedSize: number): Promise<boolean> {
  if (!expectedSize || expectedSize <= 0) return true;
  const infoMatches = await verifyViaInfo(bucket, filePath, expectedSize);
  if (infoMatches) return true;
  return verifyViaList(bucket, filePath, expectedSize);
}

/**
 * Streams files from native disk directly to the Supabase Storage REST endpoint (FH-2).
 * Approach A avoids loading 80 MB files into JavaScript RAM as Base64/ArrayBuffer.
 */
async function uploadNativeFile(storagePath: string, fileUri: string, mimeType: string): Promise<void> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.access_token) {
    throw new AppError('UNAUTHENTICATED', 'Your session has expired. Please sign in again.');
  }

  const cleanUrl = SUPABASE_URL.replace(/\/+$/, '');
  const uploadUrl = `${cleanUrl}/storage/v1/object/lms-files/${storagePath}`;

  const result = await uploadAsync(uploadUrl, fileUri, {
    httpMethod: 'POST',
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': mimeType,
      'x-upsert': 'false',
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new AppError('UPLOAD_FAILED', toUserMessage(result.body || 'Failed to upload file to storage.'));
  }
}

/**
 * Uploads files on the web using the browser File/Blob API (CD-5).
 */
async function uploadWebFile(storagePath: string, file: UploadableFile, mimeType: string): Promise<void> {
  let fileBody: Blob | File | undefined = file.file;
  if (!fileBody && file.uri) {
    const response = await fetch(file.uri);
    fileBody = await response.blob();
  }

  if (!fileBody) {
    throw new AppError('INVALID_FILE', 'No readable file was provided for upload.');
  }

  const { error } = await supabase.storage.from('lms-files').upload(storagePath, fileBody, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    throw new AppError('UPLOAD_FAILED', toUserMessage(error));
  }
}

function validateMaterialInput(file: UploadableFile, title: string): string {
  const validationError = validatePickedFile(file);
  if (validationError) {
    throw new AppError('INVALID_FILE', validationError);
  }
  const trimmed = title.trim();
  if (trimmed.length < 3 || trimmed.length > 80) {
    throw new AppError('INVALID_TITLE', 'Title must be between 3 and 80 characters.');
  }
  return trimmed;
}

async function insertMaterialRow(
  courseId: string,
  uploaderId: string,
  title: string,
  type: MaterialType,
  storagePath: string,
  file: UploadableFile,
  mimeType: string
): Promise<Material> {
  const { data, error } = await supabase
    .from('materials')
    .insert({
      course_id: courseId,
      uploader_id: uploaderId,
      title,
      type,
      file_path: storagePath,
      file_name: file.name,
      mime_type: mimeType,
      size_bytes: file.size ?? 0,
    })
    .select('id, course_id, uploader_id, title, type, file_path, file_name, mime_type, size_bytes, created_at')
    .single();

  if (error || !data) {
    // Delete orphan storage file if DB insert fails (FH-3)
    try {
      await supabase.storage.from('lms-files').remove([storagePath]);
    } catch {
      // Best-effort cleanup
    }
    throw new AppError('DB_INSERT_FAILED', toUserMessage(error || 'Failed to save material record.'));
  }

  return data as Material;
}

/**
 * Validates, uploads, confirms size, and persists material metadata to Supabase.
 */
export async function uploadMaterial(params: UploadMaterialParams): Promise<Material> {
  const { courseId, type, title, file } = params;
  const trimmedTitle = validateMaterialInput(file, title);

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new AppError('UNAUTHENTICATED', 'You must be signed in to upload materials.');
  }

  const mimeType = contentTypeFromName(file.name);
  const storagePath = `${courseId}/${generateUUID()}-${sanitizeFileName(file.name)}`;

  if (Platform.OS === 'web') {
    await uploadWebFile(storagePath, file, mimeType);
  } else {
    await uploadNativeFile(storagePath, file.uri, mimeType);
  }

  if (file.size && file.size > 0) {
    const sizeMatches = await verifyStoredFileSize('lms-files', storagePath, file.size);
    if (!sizeMatches) {
      await supabase.storage.from('lms-files').remove([storagePath]);
      throw new AppError('UPLOAD_SIZE_MISMATCH', "The upload didn't finish correctly. Try again.");
    }
  }

  return insertMaterialRow(courseId, userData.user.id, trimmedTitle, type, storagePath, file, mimeType);
}

/**
 * Uploads multiple materials sequentially to respect rate limits (FH-4).
 */
export async function uploadMaterialBatch(params: UploadMaterialBatchParams): Promise<BatchUploadResult> {
  const { courseId, type, files, onProgress } = params;
  const succeeded: Material[] = [];
  const failed: Array<{ name: string; message: string }> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.({ currentIndex: i + 1, totalFiles: files.length, currentFileName: file.name });
    const itemTitle = file.title?.trim() || file.name.replace(/\.[^/.]+$/, '').trim() || 'Untitled Material';

    try {
      const material = await uploadMaterial({ courseId, type, title: itemTitle, file });
      succeeded.push(material);
    } catch (error) {
      failed.push({ name: file.name, message: toUserMessage(error) });
    }
  }

  return { succeeded, failed };
}

/**
 * Generates a short-lived signed download URL (1 hour) for private bucket files (SEC-5).
 */
export async function getSignedUrl(filePath: string, bucket: string = 'lms-files'): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, 3600);
  if (error || !data?.signedUrl) {
    throw new AppError('SIGNED_URL_FAILED', toUserMessage(error || 'Failed to create signed URL.'));
  }
  return data.signedUrl;
}

/**
 * Performs safe two-step deletion: deletes storage object first, then the DB row (FH-3).
 */
export async function deleteMaterial(materialId: string, filePath: string): Promise<{ success: true }> {
  const { error: storageError } = await supabase.storage.from('lms-files').remove([filePath]);
  if (storageError) {
    throw new AppError('STORAGE_DELETE_FAILED', toUserMessage(storageError));
  }

  const { error: dbError } = await supabase.from('materials').delete().eq('id', materialId);
  if (dbError) {
    throw new AppError(
      'DB_DELETE_FAILED',
      'The file was removed from storage, but the record could not be deleted from the database. Try again.'
    );
  }

  return { success: true };
}
