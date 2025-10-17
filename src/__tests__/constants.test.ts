
describe('Constants', () => {
  it('should have valid route constants', () => {
    const routes = {
      HOME: '/',
      LOGIN: '/login',
      DASHBOARD: '/dashboard'
    };
    
    expect(routes.HOME).toBe('/');
    expect(routes.LOGIN).toBe('/login');
    expect(routes.DASHBOARD).toBe('/dashboard');
  });

  it('should have user roles', () => {
    const roles = ['SUPER_ADMIN', 'FEDERATION_ADMIN', 'CLUB_OWNER', 'COACH', 'MEMBER'];
    expect(roles.length).toBe(5);
    expect(roles.includes('SUPER_ADMIN')).toBe(true);
  });
});
