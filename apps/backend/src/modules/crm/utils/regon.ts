/**
 * REGON (Rejestr Gospodarki Narodowej) Validator
 * Polish National Business Registry Number - 9 or 14 digits with checksum
 *
 * Format:
 * - REGON-9: XXXXXXXXX (9 digits) - for legal entities
 * - REGON-14: XXXXXXXXXXXXXX (14 digits) - for branches/local units
 *
 * Example: 010531112 (9-digit) or 01053111200000 (14-digit)
 */

/**
 * Validates Polish REGON (9 or 14 digits)
 *
 * @param regon - REGON number to validate
 * @returns true if valid, false otherwise
 */
export function validateREGON(regon: string): boolean {
  if (!regon) return false;

  // Remove hyphens and spaces
  const cleanRegon = regon.replace(/[-\s]/g, '');

  // Must be 9 or 14 digits
  if (!/^\d{9}$/.test(cleanRegon) && !/^\d{14}$/.test(cleanRegon)) {
    return false;
  }

  if (cleanRegon.length === 9) {
    return validateREGON9(cleanRegon);
  } else {
    return validateREGON14(cleanRegon);
  }
}

/**
 * Validates 9-digit REGON
 * Checksum weights: [8, 9, 2, 3, 4, 5, 6, 7]
 *
 * @param regon - 9-digit REGON
 * @returns true if valid, false otherwise
 */
function validateREGON9(regon: string): boolean {
  const weights = [8, 9, 2, 3, 4, 5, 6, 7];

  const sum = regon
    .slice(0, 8)
    .split('')
    .reduce((acc, digit, index) => {
      return acc + parseInt(digit, 10) * weights[index];
    }, 0);

  const checksum = sum % 11;
  const expectedChecksum = parseInt(regon[8], 10);

  // Checksum of 10 means the last digit should be 0
  if (checksum === 10) {
    return expectedChecksum === 0;
  }

  return checksum === expectedChecksum;
}

/**
 * Validates 14-digit REGON
 * Checksum weights: [2, 4, 8, 5, 0, 9, 7, 3, 6, 1, 2, 4, 8]
 *
 * @param regon - 14-digit REGON
 * @returns true if valid, false otherwise
 */
function validateREGON14(regon: string): boolean {
  // First, validate the 9-digit prefix
  if (!validateREGON9(regon.slice(0, 9))) {
    return false;
  }

  // Then validate the full 14-digit checksum
  const weights = [2, 4, 8, 5, 0, 9, 7, 3, 6, 1, 2, 4, 8];

  const sum = regon
    .slice(0, 13)
    .split('')
    .reduce((acc, digit, index) => {
      return acc + parseInt(digit, 10) * weights[index];
    }, 0);

  const checksum = sum % 11;
  const expectedChecksum = parseInt(regon[13], 10);

  // Checksum of 10 means the last digit should be 0
  if (checksum === 10) {
    return expectedChecksum === 0;
  }

  return checksum === expectedChecksum;
}

/**
 * Formats REGON for display
 *
 * @param regon - REGON number
 * @returns Formatted REGON
 */
export function formatREGON(regon: string): string {
  if (!regon) return '';

  const cleanRegon = regon.replace(/[-\s]/g, '');

  if (cleanRegon.length === 9) {
    // Format: XXX-XXX-XXX
    return `${cleanRegon.slice(0, 3)}-${cleanRegon.slice(3, 6)}-${cleanRegon.slice(6, 9)}`;
  } else if (cleanRegon.length === 14) {
    // Format: XXX-XXX-XXX-XXXXX
    return `${cleanRegon.slice(0, 3)}-${cleanRegon.slice(3, 6)}-${cleanRegon.slice(6, 9)}-${cleanRegon.slice(9, 14)}`;
  }

  return regon;
}

/**
 * Cleans REGON by removing formatting characters
 *
 * @param regon - REGON number with possible formatting
 * @returns Clean REGON
 */
export function cleanREGON(regon: string): string {
  if (!regon) return '';
  return regon.replace(/[-\s]/g, '');
}

/**
 * Validates and returns error message if invalid
 *
 * @param regon - REGON number to validate
 * @returns Error message or null if valid
 */
export function validateREGONWithMessage(regon: string): string | null {
  if (!regon) {
    return 'REGON jest wymagany';
  }

  const cleanRegon = cleanREGON(regon);

  if (cleanRegon.length !== 9 && cleanRegon.length !== 14) {
    return 'REGON musi składać się z 9 lub 14 cyfr';
  }

  if (!/^\d+$/.test(cleanRegon)) {
    return 'REGON może zawierać tylko cyfry';
  }

  if (!validateREGON(cleanRegon)) {
    return 'Nieprawidłowa suma kontrolna REGON';
  }

  return null;
}

/**
 * Determines if REGON is 9-digit (main entity) or 14-digit (local unit)
 *
 * @param regon - REGON number
 * @returns Type of REGON
 */
export function getREGONType(regon: string): '9' | '14' | 'invalid' {
  const cleanRegon = cleanREGON(regon);

  if (cleanRegon.length === 9) return '9';
  if (cleanRegon.length === 14) return '14';
  return 'invalid';
}
