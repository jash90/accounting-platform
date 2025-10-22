/**
 * Backend Error Parser
 * Parses backend API errors into structured format for display
 */

export interface ParsedError {
  fieldErrors: Record<string, string>; // Field-specific errors mapped to field names
  generalError: string | null;          // General error message (non-field-specific)
}

export interface ZodError {
  code: string;
  path: (string | number)[];
  message: string;
}

/**
 * Parse backend error into structured format
 * Handles both Zod validation errors and simple string errors
 *
 * @param error - Error object from backend (can be Error object or raw backend response)
 * @returns Parsed error with field errors and general error
 */
export function parseBackendError(error: any): ParsedError {
  const result: ParsedError = {
    fieldErrors: {},
    generalError: null,
  };

  // If no error, return empty result
  if (!error) {
    return result;
  }

  // Handle Error object with backendError property (from API client)
  const backendError = error.backendError || error;

  // Case 1: Simple string error
  if (typeof backendError === 'string') {
    result.generalError = backendError;
    return result;
  }

  // Case 2: Zod validation error
  if (backendError.name === 'ZodError' && backendError.message) {
    try {
      // Parse the JSON string in the message field
      const zodErrors: ZodError[] = JSON.parse(backendError.message);

      // Map Zod errors to field errors
      zodErrors.forEach((zodError) => {
        if (zodError.path && zodError.path.length > 0) {
          // Get the field name from the path (first element)
          const fieldName = zodError.path[0].toString();

          // Store the error message for this field
          // If multiple errors for same field, keep the first one
          if (!result.fieldErrors[fieldName]) {
            result.fieldErrors[fieldName] = zodError.message;
          }
        } else {
          // Error without path goes to general error
          result.generalError = zodError.message;
        }
      });
    } catch (parseError) {
      // If parsing fails, treat as general error
      result.generalError = 'Błąd walidacji danych';
    }

    return result;
  }

  // Case 3: Object with message property
  if (backendError.message) {
    result.generalError = backendError.message;
    return result;
  }

  // Case 4: Fallback for unknown format
  result.generalError = 'Wystąpił nieoczekiwany błąd';
  return result;
}

/**
 * Check if error has field-specific validation errors
 */
export function hasFieldErrors(parsedError: ParsedError): boolean {
  return Object.keys(parsedError.fieldErrors).length > 0;
}

/**
 * Get error message for a specific field
 */
export function getFieldError(parsedError: ParsedError, fieldName: string): string | undefined {
  return parsedError.fieldErrors[fieldName];
}
