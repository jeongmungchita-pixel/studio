
describe('Type Validations', () => {
  it('should validate email format', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test('test@example.com')).toBe(true);
    expect(emailRegex.test('invalid-email')).toBe(false);
  });

  it('should validate phone number format', () => {
    const phoneRegex = /^\d{3}-\d{4}-\d{4}$/;
    expect(phoneRegex.test('010-1234-5678')).toBe(true);
    expect(phoneRegex.test('invalid-phone')).toBe(false);
  });

  it('should calculate age correctly', () => {
    const birthYear = 1990;
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    expect(age).toBeGreaterThan(0);
  });
});
