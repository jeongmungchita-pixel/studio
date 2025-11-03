import { vi } from 'vitest';

// DI API Helpers 전용 Mock
export function createMockApiHelpers() {
  return {
    // Admin API handlers
    withAdminApiHandler: vi.fn((handler) => {
      return async (request: Request) => {
        // Mock admin user context
        const mockUser = {
          uid: 'admin-123',
          email: 'admin@example.com',
          role: 'SUPER_ADMIN',
          clubId: 'club-123'
        };
        
        try {
          const result = await handler(request, { user: mockUser });
          // Ensure result is a Response
          if (result instanceof Response) {
            return result;
          }
          // Convert non-Response results to Response
          return Response.json(result, { status: 200 });
        } catch (error: any) {
          return Response.json(
            { error: { message: error.message || 'Internal server error' } }, 
            { status: 500 }
          );
        }
      };
    }),

    // Club staff API handlers  
    withClubStaffApiHandler: vi.fn((handler) => async (request: Request) => {
      // Mock club staff user context
      const mockUser = {
        uid: 'staff-123',
        email: 'staff@example.com', 
        role: 'CLUB_MANAGER',
        clubId: 'club-123'
      };
      
      try {
        return await handler(request, { user: mockUser });
      } catch (error) {
        return Response.json(
          { error: { message: error.message } }, 
          { status: 500 }
        );
      }
    }),

    // Request body parser
    parseRequestBody: vi.fn().mockImplementation(async (request: Request) => {
      return await request.json();
    }),

    // API response creator
    createApiResponse: vi.fn().mockImplementation((data: any, status: number = 200) => {
      if (status >= 400) {
        return Response.json(
          { error: data }, 
          { status }
        );
      }
      return Response.json(data, { status });
    }),

    // Logging functions
    logApiRequest: vi.fn(),
    logAuditEvent: vi.fn(),

    // Error class
    ApiError: class extends Error {
      constructor(message: string, public statusCode: number = 500) {
        super(message);
        this.name = 'ApiError';
      }
    },

    // API services
    apiServices: {
      users: {
        updateStatus: vi.fn(),
        linkMember: vi.fn(),
      },
      members: {
        updateMember: vi.fn(),
        getMember: vi.fn(),
      },
      notifications: {
        markAsRead: vi.fn(),
      }
    }
  };
}

// Mock setup utility
export function setupApiHelpersMock() {
  const mockHelpers = createMockApiHelpers();
  
  vi.doMock('@/lib/di/api-helpers', () => mockHelpers);
  
  return mockHelpers;
}

// Reset mock utility
export function resetApiHelpersMock() {
  vi.clearAllMocks();
  vi.resetModules();
}
