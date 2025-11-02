/**
 * API Error utilities for backward compatibility
 * Wraps the unified error-manager for API routes
 */
import { APIError } from '@/lib/error/error-manager';

// Export APIError as ApiError for backward compatibility
export const ApiError = APIError;

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[]
): void {
  for (const field of requiredFields) {
    if (!data[field]) {
      throw new APIError(`Missing required field: ${field}`, 400, 'VALIDATION_ERROR');
    }
  }
}

/**
 * Validate field types
 */
export function validateFieldTypes(
  data: Record<string, any>,
  fieldTypes: Record<string, string>
): void {
  for (const [field, expectedType] of Object.entries(fieldTypes)) {
    if (data[field] !== undefined) {
      const actualType = typeof data[field];
      if (actualType !== expectedType) {
        throw new APIError(
          `Invalid type for field ${field}: expected ${expectedType}, got ${actualType}`,
          400,
          'VALIDATION_ERROR'
        );
      }
    }
  }
}

/**
 * Create a standardized API error response
 */
export function createErrorResponse(error: unknown): Response {
  if (error instanceof APIError) {
    return Response.json(
      {
        error: error.message,
        code: error.code,
        details: error.context
      },
      { status: error.statusCode }
    );
  }
  
  if (error instanceof Error) {
    return Response.json(
      {
        error: error.message,
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
  
  return Response.json(
    {
      error: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR'
    },
    { status: 500 }
  );
}

/**
 * Handle API error (alias for createErrorResponse for backward compatibility)
 */
export const handleApiError = createErrorResponse;
