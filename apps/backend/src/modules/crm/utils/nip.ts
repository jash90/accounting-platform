/**
 * NIP (Numer Identyfikacji Podatkowej) Validator
 * Polish Tax Identification Number - 10 digits with checksum
 *
 * Format: XXXXXXXXXX (10 digits)
 * Example: 5260250274
 */

/**
 * Validates Polish NIP (Tax Identification Number)
 * Uses checksum algorithm with weights [6, 5, 7, 2, 3, 4, 5, 6, 7]
 *
 * @param nip - NIP number to validate (can include hyphens)
 * @returns true if valid, false otherwise
 */
export function validateNIP(nip: string): boolean {
  if (!nip) return false;

  // Remove hyphens and spaces
  const cleanNip = nip.replace(/[-\s]/g, '');

  // Check if it's exactly 10 digits
  if (!/^\d{10}$/.test(cleanNip)) {
    return false;
  }

  // Checksum weights for positions 0-8
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];

  // Calculate checksum
  const sum = cleanNip
    .slice(0, 9)
    .split('')
    .reduce((acc, digit, index) => {
      return acc + parseInt(digit, 10) * weights[index];
    }, 0);

  const checksum = sum % 11;
  const expectedChecksum = parseInt(cleanNip[9], 10);

  // Checksum of 10 is invalid
  if (checksum === 10) {
    return false;
  }

  return checksum === expectedChecksum;
}

/**
 * Formats NIP for display (adds hyphens)
 *
 * @param nip - NIP number
 * @returns Formatted NIP (XXX-XXX-XX-XX or XXX-XX-XX-XXX)
 */
export function formatNIP(nip: string): string {
  if (!nip) return '';

  const cleanNip = nip.replace(/[-\s]/g, '');

  if (cleanNip.length !== 10) {
    return nip;
  }

  // Format: XXX-XXX-XX-XX (most common)
  return `${cleanNip.slice(0, 3)}-${cleanNip.slice(3, 6)}-${cleanNip.slice(6, 8)}-${cleanNip.slice(8, 10)}`;
}

/**
 * Cleans NIP by removing formatting characters
 *
 * @param nip - NIP number with possible formatting
 * @returns Clean NIP (10 digits only)
 */
export function cleanNIP(nip: string): string {
  if (!nip) return '';
  return nip.replace(/[-\s]/g, '');
}

/**
 * Validates and returns error message if invalid
 *
 * @param nip - NIP number to validate
 * @returns Error message or null if valid
 */
export function validateNIPWithMessage(nip: string): string | null {
  if (!nip) {
    return 'NIP jest wymagany';
  }

  const cleanNip = cleanNIP(nip);

  if (cleanNip.length !== 10) {
    return 'NIP musi składać się z 10 cyfr';
  }

  if (!/^\d{10}$/.test(cleanNip)) {
    return 'NIP może zawierać tylko cyfry';
  }

  if (!validateNIP(cleanNip)) {
    return 'Nieprawidłowa suma kontrolna NIP';
  }

  return null;
}
