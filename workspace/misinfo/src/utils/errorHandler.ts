// Comprehensive error handling system for MisinfoGuard

export interface ErrorInfo {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
  context?: string;
}

export class MisinfoGuardError extends Error {
  public code: string;
  public details?: any;
  public timestamp: number;
  public context?: string;

  constructor(code: string, message: string, details?: any, context?: string) {
    super(message);
    this.name = 'MisinfoGuardError';
    this.code = code;
    this.details = details;
    this.timestamp = Date.now();
    this.context = context;
  }

  toJSON(): ErrorInfo {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      context: this.context,
    };
  }
}

// Error codes
export const ERROR_CODES = {
  // API Errors
  API_KEY_MISSING: 'API_KEY_MISSING',
  API_KEY_INVALID: 'API_KEY_INVALID',
  API_RATE_LIMIT: 'API_RATE_LIMIT',
  API_NETWORK_ERROR: 'API_NETWORK_ERROR',
  API_TIMEOUT: 'API_TIMEOUT',
  API_SERVER_ERROR: 'API_SERVER_ERROR',

  // File Errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_INVALID_TYPE: 'FILE_INVALID_TYPE',
  FILE_CORRUPT: 'FILE_CORRUPT',
  FILE_READ_ERROR: 'FILE_READ_ERROR',

  // Analysis Errors
  ANALYSIS_FAILED: 'ANALYSIS_FAILED',
  OCR_FAILED: 'OCR_FAILED',
  AI_DETECTION_FAILED: 'AI_DETECTION_FAILED',
  QR_ANALYSIS_FAILED: 'QR_ANALYSIS_FAILED',

  // Storage Errors
  STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
  STORAGE_ACCESS_DENIED: 'STORAGE_ACCESS_DENIED',
  STORAGE_WRITE_ERROR: 'STORAGE_WRITE_ERROR',
  STORAGE_READ_ERROR: 'STORAGE_READ_ERROR',

  // Permission Errors
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  CAMERA_ACCESS_DENIED: 'CAMERA_ACCESS_DENIED',

  // General Errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  [ERROR_CODES.API_KEY_MISSING]: 'API key is required. Please configure your API keys in settings.',
  [ERROR_CODES.API_KEY_INVALID]: 'Invalid API key. Please check your configuration.',
  [ERROR_CODES.API_RATE_LIMIT]: 'API rate limit exceeded. Please try again later.',
  [ERROR_CODES.API_NETWORK_ERROR]: 'Network error occurred. Please check your connection.',
  [ERROR_CODES.API_TIMEOUT]: 'Request timed out. Please try again.',
  [ERROR_CODES.API_SERVER_ERROR]: 'Server error occurred. Please try again later.',

  [ERROR_CODES.FILE_TOO_LARGE]: 'File is too large. Maximum size is 10MB.',
  [ERROR_CODES.FILE_INVALID_TYPE]: 'Invalid file type. Only image files are supported.',
  [ERROR_CODES.FILE_CORRUPT]: 'File appears to be corrupted or unreadable.',
  [ERROR_CODES.FILE_READ_ERROR]: 'Failed to read the file. Please try again.',

  [ERROR_CODES.ANALYSIS_FAILED]: 'Analysis failed. Please try again.',
  [ERROR_CODES.OCR_FAILED]: 'Text extraction failed. The image may not contain readable text.',
  [ERROR_CODES.AI_DETECTION_FAILED]: 'AI detection failed. Please try again later.',
  [ERROR_CODES.QR_ANALYSIS_FAILED]: 'QR code analysis failed. No QR codes detected.',

  [ERROR_CODES.STORAGE_QUOTA_EXCEEDED]: 'Storage quota exceeded. Please clear some history.',
  [ERROR_CODES.STORAGE_ACCESS_DENIED]: 'Storage access denied. Please check permissions.',
  [ERROR_CODES.STORAGE_WRITE_ERROR]: 'Failed to save data. Please try again.',
  [ERROR_CODES.STORAGE_READ_ERROR]: 'Failed to read data. Please try again.',

  [ERROR_CODES.PERMISSION_DENIED]: 'Permission denied. Please grant necessary permissions.',
  [ERROR_CODES.CAMERA_ACCESS_DENIED]: 'Camera access denied. Please allow camera access.',

  [ERROR_CODES.UNKNOWN_ERROR]: 'An unknown error occurred. Please try again.',
  [ERROR_CODES.VALIDATION_ERROR]: 'Validation error. Please check your input.',
  [ERROR_CODES.NETWORK_ERROR]: 'Network error. Please check your internet connection.',
} as const;

// Error handler class
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ErrorInfo[] = [];
  private maxLogSize = 100;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Handle and log errors
  handle(error: Error | MisinfoGuardError, context?: string): MisinfoGuardError {
    let misinfoError: MisinfoGuardError;

    if (error instanceof MisinfoGuardError) {
      misinfoError = error;
    } else {
      // Convert regular errors to MisinfoGuardError
      const errorCode = this.categorizeError(error);
      misinfoError = new MisinfoGuardError(
        errorCode,
        ERROR_MESSAGES[errorCode] || error.message,
        { originalError: error.message, stack: error.stack },
        context
      );
    }

    // Log the error
    this.logError(misinfoError);

    // Report to analytics (if implemented)
    this.reportError(misinfoError);

    return misinfoError;
  }

  // Categorize errors based on their characteristics
  private categorizeError(error: Error): keyof typeof ERROR_CODES {
    const message = error.message.toLowerCase();

    // API errors
    if (message.includes('api key') || message.includes('unauthorized')) {
      return ERROR_CODES.API_KEY_INVALID;
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return ERROR_CODES.API_RATE_LIMIT;
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return ERROR_CODES.API_TIMEOUT;
    }
    if (message.includes('network') || message.includes('fetch')) {
      return ERROR_CODES.API_NETWORK_ERROR;
    }
    if (message.includes('server error') || message.includes('500')) {
      return ERROR_CODES.API_SERVER_ERROR;
    }

    // File errors
    if (message.includes('file too large') || message.includes('size')) {
      return ERROR_CODES.FILE_TOO_LARGE;
    }
    if (message.includes('invalid file') || message.includes('file type')) {
      return ERROR_CODES.FILE_INVALID_TYPE;
    }
    if (message.includes('corrupt') || message.includes('damaged')) {
      return ERROR_CODES.FILE_CORRUPT;
    }

    // Storage errors
    if (message.includes('quota') || message.includes('storage full')) {
      return ERROR_CODES.STORAGE_QUOTA_EXCEEDED;
    }
    if (message.includes('permission') || message.includes('access denied')) {
      return ERROR_CODES.PERMISSION_DENIED;
    }

    return ERROR_CODES.UNKNOWN_ERROR;
  }

  // Log error to local storage
  private logError(error: MisinfoGuardError): void {
    try {
      this.errorLog.unshift(error.toJSON());
      
      // Keep only the most recent errors
      if (this.errorLog.length > this.maxLogSize) {
        this.errorLog = this.errorLog.slice(0, this.maxLogSize);
      }

      // Save to storage (optional)
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({
          misinfoguard_error_log: this.errorLog.slice(0, 20) // Only save recent 20 errors
        }).catch(console.error);
      }
    } catch (storageError) {
      console.error('Failed to log error:', storageError);
    }
  }

  // Report error to analytics (placeholder)
  private reportError(error: MisinfoGuardError): void {
    // In a production environment, you might want to report errors to a service
    // like Sentry, Google Analytics, or a custom analytics endpoint
    console.error('MisinfoGuard Error:', {
      code: error.code,
      message: error.message,
      context: error.context,
      timestamp: new Date(error.timestamp).toISOString(),
    });
  }

  // Get error log
  getErrorLog(): ErrorInfo[] {
    return [...this.errorLog];
  }

  // Clear error log
  clearErrorLog(): void {
    this.errorLog = [];
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove(['misinfoguard_error_log']).catch(console.error);
    }
  }

  // Get user-friendly error message
  getUserFriendlyMessage(error: Error | MisinfoGuardError): string {
    if (error instanceof MisinfoGuardError) {
      return ERROR_MESSAGES[error.code as keyof typeof ERROR_MESSAGES] || error.message;
    }

    const errorCode = this.categorizeError(error);
    return ERROR_MESSAGES[errorCode];
  }

  // Check if error is recoverable
  isRecoverable(error: MisinfoGuardError): boolean {
    const recoverableErrors = [
      ERROR_CODES.API_NETWORK_ERROR,
      ERROR_CODES.API_TIMEOUT,
      ERROR_CODES.API_SERVER_ERROR,
      ERROR_CODES.FILE_READ_ERROR,
    ];

    return recoverableErrors.includes(error.code as any);
  }

  // Get retry delay for recoverable errors
  getRetryDelay(error: MisinfoGuardError, attempt: number): number {
    if (!this.isRecoverable(error)) {
      return 0;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    return Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  }
}

// Utility functions
export const errorHandler = ErrorHandler.getInstance();

export function createError(
  code: keyof typeof ERROR_CODES,
  message?: string,
  details?: any,
  context?: string
): MisinfoGuardError {
  return new MisinfoGuardError(
    code,
    message || ERROR_MESSAGES[code],
    details,
    context
  );
}

export function handleAsyncError<T>(
  promise: Promise<T>,
  context?: string
): Promise<T> {
  return promise.catch((error) => {
    throw errorHandler.handle(error, context);
  });
}

// Decorator for async functions
export function withErrorHandling(context?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        throw errorHandler.handle(error as Error, context || `${target.constructor.name}.${propertyName}`);
      }
    };
  };
}

