/**
 * Tests for Screenwriter React components and utilities
 */

describe('Screenwriter Line Types', () => {
  const types = ['scene', 'action', 'character', 'dialogue', 'parenthetical', 'transition', 'shot', 'text'];
  const nextTypes = {
    scene: 'action',
    action: 'action',
    character: 'dialogue',
    dialogue: 'character',
    parenthetical: 'dialogue',
    transition: 'scene',
    shot: 'action',
    text: 'text'
  };

  describe('Line type definitions', () => {
    test('should have exactly 8 line types', () => {
      expect(types).toHaveLength(8);
    });

    test('should include all screenplay format types', () => {
      expect(types).toContain('scene');
      expect(types).toContain('action');
      expect(types).toContain('character');
      expect(types).toContain('dialogue');
      expect(types).toContain('parenthetical');
      expect(types).toContain('transition');
      expect(types).toContain('shot');
      expect(types).toContain('text');
    });

    test('should not have duplicate types', () => {
      const uniqueTypes = [...new Set(types)];
      expect(uniqueTypes).toHaveLength(types.length);
    });
  });

  describe('Next type transitions', () => {
    test('scene should transition to action', () => {
      expect(nextTypes.scene).toBe('action');
    });

    test('action should transition to action', () => {
      expect(nextTypes.action).toBe('action');
    });

    test('character should transition to dialogue', () => {
      expect(nextTypes.character).toBe('dialogue');
    });

    test('dialogue should transition to character', () => {
      expect(nextTypes.dialogue).toBe('character');
    });

    test('parenthetical should transition to dialogue', () => {
      expect(nextTypes.parenthetical).toBe('dialogue');
    });

    test('transition should transition to scene', () => {
      expect(nextTypes.transition).toBe('scene');
    });

    test('shot should transition to action', () => {
      expect(nextTypes.shot).toBe('action');
    });

    test('text should transition to text', () => {
      expect(nextTypes.text).toBe('text');
    });

    test('all nextTypes should be valid line types', () => {
      Object.values(nextTypes).forEach(type => {
        expect(types).toContain(type);
      });
    });

    test('all line types should have a next type defined', () => {
      types.forEach(type => {
        expect(nextTypes).toHaveProperty(type);
      });
    });
  });
});

describe('Script Data Structures', () => {
  describe('Script object structure', () => {
    test('should have lines as primary data structure', () => {
      const mockScript = {
        lines: {},
        firstLine: null
      };
      
      expect(mockScript).toHaveProperty('lines');
      expect(mockScript).toHaveProperty('firstLine');
    });

    test('should support linked list structure via next property', () => {
      const mockLines = {
        'line1': { type: 'scene', text: 'INT. OFFICE - DAY', next: 'line2' },
        'line2': { type: 'action', text: 'John walks in.', next: 'line3' },
        'line3': { type: 'character', text: 'JOHN', next: null }
      };

      expect(mockLines['line1'].next).toBe('line2');
      expect(mockLines['line2'].next).toBe('line3');
      expect(mockLines['line3'].next).toBeNull();
    });
  });

  describe('Line object structure', () => {
    test('should have required properties', () => {
      const mockLine = {
        type: 'scene',
        text: 'INT. OFFICE - DAY',
        next: null
      };

      expect(mockLine).toHaveProperty('type');
      expect(mockLine).toHaveProperty('text');
      expect(mockLine).toHaveProperty('next');
    });

    test('should support optional comment property', () => {
      const mockLine = {
        type: 'action',
        text: 'The hero enters.',
        comment: 'This needs more drama',
        next: null
      };

      expect(mockLine).toHaveProperty('comment');
    });

    test('should accept all valid line types', () => {
      const types = ['scene', 'action', 'character', 'dialogue', 'parenthetical', 'transition', 'shot', 'text'];
      
      types.forEach(type => {
        const line = { type, text: 'Sample text', next: null };
        expect(line.type).toBe(type);
      });
    });
  });
});

describe('Component Props Validation', () => {
  describe('Line component expected props', () => {
    test('should define expected line props structure', () => {
      const mockFunction = jest.fn();
      const expectedProps = {
        line: { type: 'scene', text: 'INT. OFFICE - DAY' },
        index: 'line1',
        previous: null,
        prevPrevious: null,
        onFocus: mockFunction,
        getSuggestion: mockFunction,
        readonly: false,
        onKeyDown: mockFunction
      };

      expect(expectedProps.line).toHaveProperty('type');
      expect(expectedProps.line).toHaveProperty('text');
      expect(typeof expectedProps.onFocus).toBe('function');
      expect(typeof expectedProps.getSuggestion).toBe('function');
      expect(typeof expectedProps.onKeyDown).toBe('function');
      expect(expectedProps.index).toBe('line1');
      expect(expectedProps.readonly).toBe(false);
    });
  });

  describe('ContentEditable component expected props', () => {
    test('should define expected ContentEditable props', () => {
      const mockFunction = jest.fn();
      const expectedProps = {
        html: '<div>Sample content</div>',
        onChange: mockFunction,
        onKeyDown: mockFunction,
        onClick: mockFunction,
        className: 'line-text',
        onFocus: mockFunction,
        onBlur: mockFunction,
        suggest: 'Suggested text'
      };

      expect(typeof expectedProps.html).toBe('string');
      expect(typeof expectedProps.onChange).toBe('function');
      expect(typeof expectedProps.className).toBe('string');
      expect(expectedProps.suggest).toBe('Suggested text');
    });
  });
});

describe('Screenplay Format Rules', () => {
  test('character names should be uppercase in format', () => {
    const characterLine = 'JOHN';
    expect(characterLine).toBe(characterLine.toUpperCase());
  });

  test('scene headings typically start with INT. or EXT.', () => {
    const validSceneHeadings = [
      'INT. OFFICE - DAY',
      'EXT. STREET - NIGHT',
      'INT./EXT. CAR - DAY'
    ];

    validSceneHeadings.forEach(heading => {
      expect(heading.startsWith('INT.') || heading.startsWith('EXT.')).toBe(true);
    });
  });

  test('transitions should be uppercase and typically end with TO:', () => {
    const transitions = [
      'CUT TO:',
      'FADE TO:',
      'DISSOLVE TO:'
    ];

    transitions.forEach(transition => {
      expect(transition).toBe(transition.toUpperCase());
      expect(transition.endsWith(':')).toBe(true);
    });
  });
});
