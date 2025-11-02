import { describe, it, expect } from 'vitest';
import { HttpStatus } from '../http-status';

describe('HttpStatus', () => {
  describe('2xx Success', () => {
    it('should have correct success status codes', () => {
      expect(HttpStatus.OK).toBe(200);
      expect(HttpStatus.CREATED).toBe(201);
      expect(HttpStatus.ACCEPTED).toBe(202);
      expect(HttpStatus.NO_CONTENT).toBe(204);
    });
  });

  describe('3xx Redirection', () => {
    it('should have correct redirection status codes', () => {
      expect(HttpStatus.MOVED_PERMANENTLY).toBe(301);
      expect(HttpStatus.FOUND).toBe(302);
      expect(HttpStatus.NOT_MODIFIED).toBe(304);
      expect(HttpStatus.TEMPORARY_REDIRECT).toBe(307);
      expect(HttpStatus.PERMANENT_REDIRECT).toBe(308);
    });
  });

  describe('4xx Client Errors', () => {
    it('should have correct client error status codes', () => {
      expect(HttpStatus.BAD_REQUEST).toBe(400);
      expect(HttpStatus.UNAUTHORIZED).toBe(401);
      expect(HttpStatus.PAYMENT_REQUIRED).toBe(402);
      expect(HttpStatus.FORBIDDEN).toBe(403);
      expect(HttpStatus.NOT_FOUND).toBe(404);
      expect(HttpStatus.METHOD_NOT_ALLOWED).toBe(405);
      expect(HttpStatus.NOT_ACCEPTABLE).toBe(406);
      expect(HttpStatus.REQUEST_TIMEOUT).toBe(408);
      expect(HttpStatus.CONFLICT).toBe(409);
      expect(HttpStatus.GONE).toBe(410);
    });

    it('should have correct 4xx validation status codes', () => {
      expect(HttpStatus.LENGTH_REQUIRED).toBe(411);
      expect(HttpStatus.PRECONDITION_FAILED).toBe(412);
      expect(HttpStatus.PAYLOAD_TOO_LARGE).toBe(413);
      expect(HttpStatus.URI_TOO_LONG).toBe(414);
      expect(HttpStatus.UNSUPPORTED_MEDIA_TYPE).toBe(415);
      expect(HttpStatus.UNPROCESSABLE_ENTITY).toBe(422);
      expect(HttpStatus.TOO_MANY_REQUESTS).toBe(429);
    });
  });

  describe('5xx Server Errors', () => {
    it('should have correct server error status codes', () => {
      expect(HttpStatus.INTERNAL_SERVER_ERROR).toBe(500);
      expect(HttpStatus.NOT_IMPLEMENTED).toBe(501);
      expect(HttpStatus.BAD_GATEWAY).toBe(502);
      expect(HttpStatus.SERVICE_UNAVAILABLE).toBe(503);
      expect(HttpStatus.GATEWAY_TIMEOUT).toBe(504);
    });
  });

  describe('Status Code Categories', () => {
    it('should identify success codes (2xx)', () => {
      const successCodes = [
        HttpStatus.OK,
        HttpStatus.CREATED,
        HttpStatus.ACCEPTED,
        HttpStatus.NO_CONTENT
      ];
      
      successCodes.forEach(code => {
        expect(code >= 200 && code < 300).toBe(true);
      });
    });

    it('should identify redirection codes (3xx)', () => {
      const redirectCodes = [
        HttpStatus.MOVED_PERMANENTLY,
        HttpStatus.FOUND,
        HttpStatus.NOT_MODIFIED
      ];
      
      redirectCodes.forEach(code => {
        expect(code >= 300 && code < 400).toBe(true);
      });
    });

    it('should identify client error codes (4xx)', () => {
      const clientErrorCodes = [
        HttpStatus.BAD_REQUEST,
        HttpStatus.UNAUTHORIZED,
        HttpStatus.FORBIDDEN,
        HttpStatus.NOT_FOUND
      ];
      
      clientErrorCodes.forEach(code => {
        expect(code >= 400 && code < 500).toBe(true);
      });
    });

    it('should identify server error codes (5xx)', () => {
      const serverErrorCodes = [
        HttpStatus.INTERNAL_SERVER_ERROR,
        HttpStatus.BAD_GATEWAY,
        HttpStatus.SERVICE_UNAVAILABLE
      ];
      
      serverErrorCodes.forEach(code => {
        expect(code >= 500 && code < 600).toBe(true);
      });
    });
  });

  describe('Common Use Cases', () => {
    it('should have commonly used status codes', () => {
      // Most frequently used status codes
      expect(HttpStatus.OK).toBeDefined();
      expect(HttpStatus.CREATED).toBeDefined();
      expect(HttpStatus.BAD_REQUEST).toBeDefined();
      expect(HttpStatus.UNAUTHORIZED).toBeDefined();
      expect(HttpStatus.FORBIDDEN).toBeDefined();
      expect(HttpStatus.NOT_FOUND).toBeDefined();
      expect(HttpStatus.INTERNAL_SERVER_ERROR).toBeDefined();
    });

    it('should be usable in response objects', () => {
      const successResponse = {
        status: HttpStatus.OK,
        data: { message: 'Success' }
      };

      const errorResponse = {
        status: HttpStatus.BAD_REQUEST,
        error: 'Invalid input'
      };

      expect(successResponse.status).toBe(200);
      expect(errorResponse.status).toBe(400);
    });
  });
});
