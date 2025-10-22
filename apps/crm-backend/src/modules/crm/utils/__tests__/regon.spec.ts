/**
 * REGON Validator Tests
 */

import { describe, it, expect } from 'vitest';
import {
  validateREGON,
  formatREGON,
  cleanREGON,
  validateREGONWithMessage,
  getREGONType,
} from '../regon';

describe('REGON Validator', () => {
  describe('validateREGON', () => {
    it('should validate correct 9-digit REGON numbers', () => {
      expect(validateREGON('010531112')).toBe(true);
      expect(validateREGON('123456785')).toBe(true);
    });

    it('should validate correct 14-digit REGON numbers', () => {
      expect(validateREGON('01053111200000')).toBe(true);
      expect(validateREGON('12345678512347')).toBe(true);
    });

    it('should reject invalid REGON numbers', () => {
      expect(validateREGON('000000000')).toBe(false); // Invalid checksum
      expect(validateREGON('123456789')).toBe(false); // Invalid checksum
      expect(validateREGON('12345678901234')).toBe(false); // Invalid 14-digit
    });

    it('should reject REGON with invalid length', () => {
      expect(validateREGON('12345678')).toBe(false); // Too short
      expect(validateREGON('123456789012345')).toBe(false); // Too long
      expect(validateREGON('')).toBe(false); // Empty
    });

    it('should reject REGON with non-numeric characters', () => {
      expect(validateREGON('01053111A')).toBe(false);
      expect(validateREGON('010-531-112')).toBe(false); // With hyphens (before cleaning)
    });

    it('should handle REGON with formatting characters after cleaning', () => {
      const dirty = '010-531-112';
      expect(validateREGON(cleanREGON(dirty))).toBe(true);
    });
  });

  describe('formatREGON', () => {
    it('should format 9-digit REGON', () => {
      expect(formatREGON('010531112')).toBe('010-531-112');
      expect(formatREGON('123456785')).toBe('123-456-785');
    });

    it('should format 14-digit REGON', () => {
      expect(formatREGON('01053111200000')).toBe('010-531-112-00000');
      expect(formatREGON('12345678512347')).toBe('123-456-785-12347');
    });

    it('should return original input if length is invalid', () => {
      expect(formatREGON('12345')).toBe('12345');
      expect(formatREGON('123456789012345')).toBe('123456789012345');
    });

    it('should handle already formatted REGON', () => {
      expect(formatREGON('010-531-112')).toBe('010-531-112');
    });

    it('should handle empty input', () => {
      expect(formatREGON('')).toBe('');
    });
  });

  describe('cleanREGON', () => {
    it('should remove hyphens', () => {
      expect(cleanREGON('010-531-112')).toBe('010531112');
    });

    it('should remove spaces', () => {
      expect(cleanREGON('010 531 112')).toBe('010531112');
    });

    it('should remove both hyphens and spaces', () => {
      expect(cleanREGON('010-531 112')).toBe('010531112');
    });

    it('should handle clean input', () => {
      expect(cleanREGON('010531112')).toBe('010531112');
    });

    it('should handle empty input', () => {
      expect(cleanREGON('')).toBe('');
    });
  });

  describe('validateREGONWithMessage', () => {
    it('should return null for valid 9-digit REGON', () => {
      expect(validateREGONWithMessage('010531112')).toBeNull();
    });

    it('should return null for valid 14-digit REGON', () => {
      expect(validateREGONWithMessage('01053111200000')).toBeNull();
    });

    it('should return error message for empty REGON', () => {
      const result = validateREGONWithMessage('');
      expect(result).toBe('REGON jest wymagany');
    });

    it('should return error message for invalid length', () => {
      const result = validateREGONWithMessage('12345678');
      expect(result).toBe('REGON musi składać się z 9 lub 14 cyfr');
    });

    it('should return error message for non-numeric characters', () => {
      const result = validateREGONWithMessage('01053111A');
      expect(result).toBe('REGON może zawierać tylko cyfry');
    });

    it('should return error message for invalid checksum', () => {
      const result = validateREGONWithMessage('123456789');
      expect(result).toBe('Nieprawidłowa suma kontrolna REGON');
    });
  });

  describe('getREGONType', () => {
    it('should return "9" for 9-digit REGON', () => {
      expect(getREGONType('010531112')).toBe('9');
      expect(getREGONType('123456785')).toBe('9');
    });

    it('should return "14" for 14-digit REGON', () => {
      expect(getREGONType('01053111200000')).toBe('14');
      expect(getREGONType('12345678512347')).toBe('14');
    });

    it('should return "invalid" for invalid length', () => {
      expect(getREGONType('12345')).toBe('invalid');
      expect(getREGONType('123456789012345')).toBe('invalid');
      expect(getREGONType('')).toBe('invalid');
    });

    it('should handle formatted REGON after cleaning', () => {
      expect(getREGONType(cleanREGON('010-531-112'))).toBe('9');
      expect(getREGONType(cleanREGON('010-531-112-00000'))).toBe('14');
    });
  });

  describe('Real-world REGON examples', () => {
    it('should validate known valid Polish company REGONs', () => {
      const validREGONs = [
        '010531112', // 9-digit example
        '01053111200000', // 14-digit example
      ];

      validREGONs.forEach((regon) => {
        expect(validateREGON(regon)).toBe(true);
      });
    });
  });
});
