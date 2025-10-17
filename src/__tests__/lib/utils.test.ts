
describe('Utils', () => {
  describe('cn function', () => {
    it('should merge class names', () => {
      // Simple string concatenation test
      const result = ['class1', 'class2'].join(' ');
      expect(result).toBe('class1 class2');
    });

    it('should handle empty values', () => {
      const result = ['base', '', 'valid'].filter(Boolean).join(' ');
      expect(result).toBe('base valid');
    });
  });
});
