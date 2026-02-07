/**
 * Sample test file to verify Jest setup
 */

describe('Screenwriter - Basic Tests', () => {
  test('Jest is configured correctly', () => {
    expect(true).toBe(true);
  });

  test('Basic arithmetic works', () => {
    expect(2 + 2).toBe(4);
  });

  test('String manipulation works', () => {
    const str = 'Hello World';
    expect(str).toContain('Hello');
    expect(str.length).toBe(11);
  });

  test('Array operations work', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(arr).toHaveLength(5);
    expect(arr).toContain(3);
  });
});

describe('Screenwriter Types', () => {
  const types = ['scene', 'action', 'character', 'dialogue', 'parenthetical', 'transition', 'shot', 'text'];
  
  test('should have 8 line types', () => {
    expect(types).toHaveLength(8);
  });

  test('should include scene type', () => {
    expect(types).toContain('scene');
  });

  test('should include dialogue type', () => {
    expect(types).toContain('dialogue');
  });
});
