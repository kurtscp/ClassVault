import { AppError } from '../types/domain';

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Maps arbitrary or system errors to predictable, user-friendly messages.
 * Prevents raw technical exceptions or stack traces from reaching screen UI (UX-2).
 */
export function toUserMessage(error: unknown): string {
  if (!error) {
    return 'Something went wrong. Try again in a moment.';
  }

  const rawMsg =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string'
      ? (error as { message: string }).message
      : '';

  const code =
    typeof error === 'object' && 'code' in error && typeof (error as { code: unknown }).code === 'string'
      ? (error as { code: string }).code
      : '';

  const lower = rawMsg.toLowerCase();

  // Authentication error mappings
  if (lower.includes('invalid login credentials') || lower.includes('invalid_grant')) {
    return 'Email or password is incorrect. Check both and try again.';
  }

  if (lower.includes('already registered') || lower.includes('user already exists')) {
    return 'An account with this email already exists. Sign in instead.';
  }

  // Network and transport failure mappings
  if (rawMsg.includes('Network request failed') || rawMsg.includes('Failed to fetch') || lower.includes('networkerror')) {
    return "We can't reach ClassVault. Check your connection and try again.";
  }

  // Row-level security and permission failure mappings
  if (code === '42501' || lower.includes('permission denied') || lower.includes('row-level security') || lower.includes('42501')) {
    return "Your account can't do this. Sign in with an instructor account.";
  }

  // Course enrollment RPC exceptions (pass through as-is)
  if (lower.includes('no course found with this code')) {
    return rawMsg.trim();
  }

  if (lower.includes('only students can enroll')) {
    return 'Only student accounts can enroll in courses.';
  }

  // Storage bucket limits
  if (lower.includes('exceeded the maximum allowed size') || lower.includes('payload too large') || lower.includes('file size limit')) {
    return 'This file is larger than 80 MB. Compress it or split it, then try again.';
  }

  // AppError instances carrying explicit userMessage
  if (isAppError(error) && error.userMessage) {
    return error.userMessage;
  }

  return 'Something went wrong. Try again in a moment.';
}

