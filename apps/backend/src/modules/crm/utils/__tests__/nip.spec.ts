/**
 * NIP Validator Tests
 */

import { describe, it, expect } from 'vitest';
import { validateNIP, formatNIP, cleanNIP, validateNIPWithMessage } from '../nip';

describe('NIP Validator', () => {
  describe('validateNIP', () => {
    it('should validate correct NIP numbers', () => {
      expect(validateNIP('5260250274')).toBe(true);
      expect(validateNIP('1234563218')).toBe(true);
      expect(validateNIP('7773030027')).toBe(true);
    });

    it('should reject invalid NIP numbers', () => {
      expect(validateNIP('1234567890')).toBe(false); // Invalid checksum
      expect(validateNIP('0000000000')).toBe(false); // Invalid checksum
      expect(validateNIP('9999999999')).toBe(false); // Invalid checksum
    });

    it('should reject NIP with invalid length', () => {
      expect(validateNIP('123456789')).toBe(false); // Too short
      expect(validateNIP('12345678901')).toBe(false); // Too long
      expect(validateNIP('')).toBe(false); // Empty
    });

    it('should reject NIP with non-numeric characters', () => {
      expect(validateNIP('123456789A')).toBe(false);
      expect(validateNIP('123-456-78-90')).toBe(false); // With hyphens
      expect(validateNIP('123 456 78 90')).toBe(false); // With spaces
    });

    it('should handle NIP with formatting characters after cleaning', () => {
      // Note: validateNIP expects clean input, use cleanNIP first
      const dirty = '526-025-02-74';
      expect(validateNIP(cleanNIP(dirty))).toBe(true);
    });
  });

  describe('formatNIP', () => {
    it('should format valid NIP numbers', () => {
      expect(formatNIP('5260250274')).toBe('526-025-02-74');
      expect(formatNIP('1234563218')).toBe('123-456-32-18');
    });

    it('should return original input if length is invalid', () => {
      expect(formatNIP('123')).toBe('123');
      expect(formatNIP('12345678901')).toBe('12345678901');
    });

    it('should handle already formatted NIP', () => {
      expect(formatNIP('526-025-02-74')).toBe('526-025-02-74');
    });

    it('should handle empty input', () => {
      expect(formatNIP('')).toBe('');
    });
  });

  describe('cleanNIP', () => {
    it('should remove hyphens', () => {
      expect(cleanNIP('526-025-02-74')).toBe('5260250274');
    });

    it('should remove spaces', () => {
      expect(cleanNIP('526 025 02 74')).toBe('5260250274');
    });

    it('should remove both hyphens and spaces', () => {
      expect(cleanNIP('526-025 02-74')).toBe('5260250274');
    });

    it('should handle clean input', () => {
      expect(cleanNIP('5260250274')).toBe('5260250274');
    });

    it('should handle empty input', () => {
      expect(cleanNIP('')).toBe('');
    });
  });

  describe('validateNIPWithMessage', () => {
    it('should return null for valid NIP', () => {
      expect(validateNIPWithMessage('5260250274')).toBeNull();
    });

    it('should return error message for empty NIP', () => {
      const result = validateNIPWithMessage('');
      expect(result).toBe('NIP jest wymagany');
    });

    it('should return error message for invalid length', () => {
      const result = validateNIPWithMessage('123456789');
      expect(result).toBe('NIP musi składać się z 10 cyfr');
    });

    it('should return error message for non-numeric characters', () => {
      const result = validateNIPWithMessage('123456789A');
      expect(result).toBe('NIP może zawierać tylko cyfry');
    });

    it('should return error message for invalid checksum', () => {
      const result = validateNIPWithMessage('1234567890');
      expect(result).toBe('Nieprawidłowa suma kontrolna NIP');
    });
  });

  describe('Real-world NIP examples', () => {
    it('should validate known valid Polish company NIPs', () => {
      // These are example NIPs (may not be real companies)
      const validNIPs = [
        '5260250274',
        '1234563218',
        '7773030027',
      ];

      validNIPs.forEach((nip) => {
        expect(validateNIP(nip)).toBe(true);
      });
    });
  });
});
