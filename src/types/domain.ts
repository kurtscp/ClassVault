/**
 * Domain-level error representation.
 * Standardizes application error handling across services and hooks (DT-2),
 * ensuring raw technical errors or stack traces never leak to the UI (UX-2).
 */
export class AppError extends Error {
  readonly code: string;
  readonly userMessage: string;

  constructor(code: string, userMessage: string, cause?: unknown) {
    super(userMessage);
    this.name = 'AppError';
    this.code = code;
    this.userMessage = userMessage;

    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}

