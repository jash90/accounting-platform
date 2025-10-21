/**
 * Polish Postal Code Validator and Utilities
 *
 * Format: XX-XXX (5 digits with hyphen)
 * Example: 00-950 (Warsaw), 30-001 (Kraków)
 */

/**
 * Validates Polish postal code
 *
 * @param postalCode - Postal code to validate
 * @returns true if valid, false otherwise
 */
export function validatePostalCode(postalCode: string): boolean {
  if (!postalCode) return false;

  // Polish postal code format: XX-XXX
  const postalCodeRegex = /^\d{2}-\d{3}$/;

  return postalCodeRegex.test(postalCode);
}

/**
 * Formats postal code to standard format
 *
 * @param postalCode - Postal code to format
 * @returns Formatted postal code (XX-XXX)
 */
export function formatPostalCode(postalCode: string): string {
  if (!postalCode) return '';

  // Remove all non-digit characters
  const cleanCode = postalCode.replace(/\D/g, '');

  if (cleanCode.length !== 5) {
    return postalCode;
  }

  // Format as XX-XXX
  return `${cleanCode.slice(0, 2)}-${cleanCode.slice(2, 5)}`;
}

/**
 * Cleans postal code by removing formatting
 *
 * @param postalCode - Postal code with possible formatting
 * @returns Clean postal code (5 digits only)
 */
export function cleanPostalCode(postalCode: string): string {
  if (!postalCode) return '';
  return postalCode.replace(/\D/g, '');
}

/**
 * Validates and returns error message if invalid
 *
 * @param postalCode - Postal code to validate
 * @returns Error message or null if valid
 */
export function validatePostalCodeWithMessage(postalCode: string): string | null {
  if (!postalCode) {
    return 'Kod pocztowy jest wymagany';
  }

  const formatted = formatPostalCode(postalCode);

  if (!validatePostalCode(formatted)) {
    return 'Nieprawidłowy format kodu pocztowego (wymagany format: XX-XXX)';
  }

  return null;
}

/**
 * Polish provinces (województwa) mapping
 * Used for province detection and validation
 */
export const POLISH_PROVINCES = [
  { code: 'DS', name: 'dolnośląskie' },
  { code: 'KP', name: 'kujawsko-pomorskie' },
  { code: 'LU', name: 'lubelskie' },
  { code: 'LB', name: 'lubuskie' },
  { code: 'LD', name: 'łódzkie' },
  { code: 'MA', name: 'małopolskie' },
  { code: 'MZ', name: 'mazowieckie' },
  { code: 'OP', name: 'opolskie' },
  { code: 'PK', name: 'podkarpackie' },
  { code: 'PD', name: 'podlaskie' },
  { code: 'PM', name: 'pomorskie' },
  { code: 'SL', name: 'śląskie' },
  { code: 'SK', name: 'świętokrzyskie' },
  { code: 'WN', name: 'warmińsko-mazurskie' },
  { code: 'WP', name: 'wielkopolskie' },
  { code: 'ZP', name: 'zachodniopomorskie' },
] as const;

/**
 * Gets province name from code
 *
 * @param code - Province code
 * @returns Province name or null
 */
export function getProvinceName(code: string): string | null {
  const province = POLISH_PROVINCES.find((p) => p.code === code.toUpperCase());
  return province ? province.name : null;
}

/**
 * Validates province code
 *
 * @param code - Province code to validate
 * @returns true if valid, false otherwise
 */
export function validateProvinceCode(code: string): boolean {
  return POLISH_PROVINCES.some((p) => p.code === code.toUpperCase());
}
