/**
 * ClassVault File Utilities
 * Validates, normalizes, and inspects files before upload (FH-1, FH-2, FH-4).
 * Single source of truth for allowed extensions, content types, and upload size caps.
 */

export const ALLOWED_EXTENSIONS = ['pdf', 'ppt', 'pptx'] as const;
export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

// 80 MB hard cap enforced across storage and application layers (FH-1)
export const MAX_FILE_BYTES = 83_886_080;

/**
 * Extracts and lowercases the extension from a file name.
 * Returns an empty string if no extension exists.
 */
export function getExtension(name: string): string {
  const trimmed = name.trim();
  const lastDot = trimmed.lastIndexOf('.');
  if (lastDot === -1 || lastDot === trimmed.length - 1) {
    return '';
  }
  return trimmed.slice(lastDot + 1).toLowerCase();
}

/**
 * Normalizes file names for safe storage keys:
 * lowercases, replaces whitespace runs with hyphens, and removes non-alphanumeric/delimiter chars.
 */
export function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '');
}

/**
 * Maps a file extension to its standardized MIME type.
 * Derives content type strictly from the file extension because mobile OS pickers
 * (especially Android) frequently misreport presentation files as application/octet-stream.
 */
export function contentTypeFromName(name: string): string {
  const ext = getExtension(name);
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'ppt':
      return 'application/vnd.ms-powerpoint';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    default:
      return 'application/octet-stream';
  }
}

export interface PickedFileInfo {
  name: string;
  size?: number | null;
}

/**
 * Validates a single file against allowed extensions and size boundaries.
 * Returns null if valid, or an actionable user-facing error message (UX-2).
 */
export function validatePickedFile(file: PickedFileInfo): string | null {
  const ext = getExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext as AllowedExtension)) {
    return 'ClassVault accepts PDF, PPT, and PPTX files. Choose a different file.';
  }

  if (file.size !== undefined && file.size !== null) {
    if (file.size === 0) {
      return 'This file is empty. Choose a different file.';
    }
    if (file.size > MAX_FILE_BYTES) {
      return 'This file is larger than 80 MB. Compress it or split it, then try again.';
    }
  }

  return null;
}

export interface FileValidationError {
  name: string;
  message: string;
}

export interface BatchFileValidationResult<T> {
  valid: T[];
  errors: FileValidationError[];
}

/**
 * Validates multiple files individually for batch upload reporting (FH-4).
 * Separates valid files from rejected files so valid ones can still proceed.
 */
export function validatePickedFiles<T extends PickedFileInfo>(
  files: T[]
): BatchFileValidationResult<T> {
  const valid: T[] = [];
  const errors: FileValidationError[] = [];

  for (const file of files) {
    const message = validatePickedFile(file);
    if (message) {
      errors.push({ name: file.name, message });
    } else {
      valid.push(file);
    }
  }

  return { valid, errors };
}
