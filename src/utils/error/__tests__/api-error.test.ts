import { describe, it, expect } from 'vitest';
import { APIError } from '@/lib/error/error-manager';

describe('APIError', () => {
  it('toJSON includes core fields', () => {
    const err = new APIError('msg', 418, 'CODE_X', { test: 'context' });
    const json = err.toJSON();
    expect(json.name).toBe('APIError');
    expect(json.message).toBe('msg');
    expect(json.code).toBe('CODE_X');
    expect(json.statusCode).toBe(418);
    expect(json.context).toEqual({ test: 'context' });
  });

  it('fromError returns APIError if already APIError', () => {
    const original = new APIError('test', 400, 'TEST_CODE');
    const result = APIError.fromError(original);
    expect(result).toBe(original);
  });

  it('fromError converts Error to APIError', () => {
    const error = new Error('test error');
    const result = APIError.fromError(error);
    expect(result).toBeInstanceOf(APIError);
    expect(result.message).toBe('test error');
    expect(result.statusCode).toBe(500);
    expect(result.code).toBe('UNKNOWN_ERROR');
  });

  it('fromError handles unknown error', () => {
    const result = APIError.fromError('string error');
    expect(result).toBeInstanceOf(APIError);
    expect(result.message).toBe('Unknown error occurred');
    expect(result.statusCode).toBe(500);
    expect(result.code).toBe('UNKNOWN_ERROR');
  });

  it('static factory method - notFound', () => {
    const err = APIError.notFound('Resource not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Resource not found');
  });

  it('static factory method - unauthorized', () => {
    const err = APIError.unauthorized();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('static factory method - badRequest', () => {
    const err = APIError.badRequest('Invalid input');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
    expect(err.message).toBe('Invalid input');
  });

  it('static factory method - forbidden', () => {
    const err = APIError.forbidden();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('static factory method - conflict', () => {
    const err = APIError.conflict('Duplicate entry');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
  });

  it('static factory method - internal', () => {
    const err = APIError.internal();
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
  });

  it('constructor builds correct instance', () => {
    const err = new APIError('Custom message', 404, 'NOT_FOUND');
    expect(err).toBeInstanceOf(APIError);
    expect(err.message).toBe('Custom message');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });

  it('captures context when provided', () => {
    const context = { userId: 'user123', action: 'updateProfile' };
    const err = new APIError('Profile update failed', 400, 'UPDATE_FAILED', context);
    
    expect(err.context).toEqual(context);
    expect(err.toJSON().context).toEqual(context);
  });

  it('static factory method - invalidToken', () => {
    const err = APIError.invalidToken('Token expired');
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('INVALID_TOKEN');
    expect(err.message).toBe('Token expired');
  });

  it('static factory method - insufficientPermissions', () => {
    const err = APIError.insufficientPermissions('Admin access required');
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('INSUFFICIENT_PERMISSIONS');
    expect(err.message).toBe('Admin access required');
  });

  it('fromError returns same instance for APIError', () => {
    const orig = new APIError('x', 500, 'Y');
    expect(APIError.fromError(orig)).toBe(orig);
  });

  it('fromError handles plain object', () => {
    const src: any = { message: 'custom error message' };
    const err = APIError.fromError(src);
    expect(err.message).toBe('Unknown error occurred');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('UNKNOWN_ERROR');
  });

  it('context is optional', () => {
    const err = new APIError('message', 400, 'CODE');
    expect(err.context).toBeUndefined();
    const json = err.toJSON();
    expect(json.context).toBeUndefined();
  });
});
