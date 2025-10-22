/**
 * Polish Tax ID Validators
 * Client-side validation for NIP, REGON, PESEL, KRS, and postal codes
 */

// ============================================================================
// NIP (Numer Identyfikacji Podatkowej) Validation
// ============================================================================

/**
 * Validate NIP checksum
 * @param nip - 10-digit NIP number
 * @returns true if valid, false otherwise
 */
export function validateNIP(nip: string): boolean {
  if (!nip) return false;

  // Remove all non-digits
  const digits = nip.replace(/\D/g, '');

  // Must be exactly 10 digits
  if (digits.length !== 10) return false;

  // Checksum weights
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];

  // Calculate checksum
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * weights[i];
  }

  const checksum = sum % 11;
  const lastDigit = parseInt(digits[9]);

  // Checksum 10 is invalid
  if (checksum === 10) return false;

  return checksum === lastDigit;
}

/**
 * Format NIP with dashes (XXX-XXX-XX-XX)
 */
export function formatNIP(nip: string): string {
  const digits = nip.replace(/\D/g, '');
  if (digits.length !== 10) return nip;

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`;
}

/**
 * Clean NIP (remove formatting)
 */
export function cleanNIP(nip: string): string {
  return nip.replace(/\D/g, '');
}

// ============================================================================
// REGON (Rejestr Gospodarki Narodowej) Validation
// ============================================================================

/**
 * Validate REGON checksum (9 or 14 digits)
 * @param regon - REGON number (9 or 14 digits)
 * @returns true if valid, false otherwise
 */
export function validateREGON(regon: string): boolean {
  if (!regon) return false;

  // Remove all non-digits
  const digits = regon.replace(/\D/g, '');

  // Must be 9 or 14 digits
  if (digits.length !== 9 && digits.length !== 14) return false;

  if (digits.length === 9) {
    return validateREGON9(digits);
  } else {
    // For 14-digit REGON, validate both 9-digit and 14-digit parts
    return validateREGON9(digits.slice(0, 9)) && validateREGON14(digits);
  }
}

function validateREGON9(regon: string): boolean {
  const weights = [8, 9, 2, 3, 4, 5, 6, 7];

  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(regon[i]) * weights[i];
  }

  const checksum = sum % 11;
  const lastDigit = parseInt(regon[8]);

  // Checksum 10 means 0
  const expected = checksum === 10 ? 0 : checksum;

  return expected === lastDigit;
}

function validateREGON14(regon: string): boolean {
  const weights = [2, 4, 8, 5, 0, 9, 7, 3, 6, 1, 2, 4, 8];

  let sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(regon[i]) * weights[i];
  }

  const checksum = sum % 11;
  const lastDigit = parseInt(regon[13]);

  // Checksum 10 means 0
  const expected = checksum === 10 ? 0 : checksum;

  return expected === lastDigit;
}

/**
 * Format REGON with dashes
 */
export function formatREGON(regon: string): string {
  const digits = regon.replace(/\D/g, '');

  if (digits.length === 9) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}`;
  } else if (digits.length === 14) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}-${digits.slice(9, 14)}`;
  }

  return regon;
}

/**
 * Clean REGON (remove formatting)
 */
export function cleanREGON(regon: string): string {
  return regon.replace(/\D/g, '');
}

// ============================================================================
// PESEL (Personal Identification Number) Validation
// ============================================================================

/**
 * Validate PESEL checksum
 * @param pesel - 11-digit PESEL number
 * @returns true if valid, false otherwise
 */
export function validatePESEL(pesel: string): boolean {
  if (!pesel) return false;

  // Remove all non-digits
  const digits = pesel.replace(/\D/g, '');

  // Must be exactly 11 digits
  if (digits.length !== 11) return false;

  // Checksum weights
  const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];

  // Calculate checksum
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i]) * weights[i];
  }

  const checksum = (10 - (sum % 10)) % 10;
  const lastDigit = parseInt(digits[10]);

  return checksum === lastDigit;
}

/**
 * Format PESEL with dashes (YYMMDD-XXXXX)
 */
export function formatPESEL(pesel: string): string {
  const digits = pesel.replace(/\D/g, '');
  if (digits.length !== 11) return pesel;

  return `${digits.slice(0, 6)}-${digits.slice(6, 11)}`;
}

/**
 * Clean PESEL (remove formatting)
 */
export function cleanPESEL(pesel: string): string {
  return pesel.replace(/\D/g, '');
}

/**
 * Extract birth date from PESEL
 */
export function extractBirthDateFromPESEL(pesel: string): Date | null {
  const digits = pesel.replace(/\D/g, '');
  if (digits.length !== 11) return null;

  let year = parseInt(digits.slice(0, 2));
  let month = parseInt(digits.slice(2, 4));
  const day = parseInt(digits.slice(4, 6));

  // Determine century from month
  if (month > 80) {
    year += 1800;
    month -= 80;
  } else if (month > 60) {
    year += 2200;
    month -= 60;
  } else if (month > 40) {
    year += 2100;
    month -= 40;
  } else if (month > 20) {
    year += 2000;
    month -= 20;
  } else {
    year += 1900;
  }

  try {
    return new Date(year, month - 1, day);
  } catch {
    return null;
  }
}

// ============================================================================
// KRS (Krajowy Rejestr Sądowy) Validation
// ============================================================================

/**
 * Validate KRS format
 * @param krs - 10-digit KRS number
 * @returns true if valid format, false otherwise
 */
export function validateKRS(krs: string): boolean {
  if (!krs) return false;

  // Remove all non-digits
  const digits = krs.replace(/\D/g, '');

  // Must be exactly 10 digits
  return digits.length === 10;
}

/**
 * Format KRS with leading zeros
 */
export function formatKRS(krs: string): string {
  const digits = krs.replace(/\D/g, '');
  return digits.padStart(10, '0');
}

/**
 * Clean KRS (remove formatting)
 */
export function cleanKRS(krs: string): string {
  return krs.replace(/\D/g, '');
}

// ============================================================================
// Polish Postal Code Validation
// ============================================================================

/**
 * Validate Polish postal code format (XX-XXX)
 * @param postalCode - Postal code string
 * @returns true if valid format, false otherwise
 */
export function validatePostalCode(postalCode: string): boolean {
  if (!postalCode) return false;

  const regex = /^\d{2}-\d{3}$/;
  return regex.test(postalCode);
}

/**
 * Format postal code with dash (XX-XXX)
 */
export function formatPostalCode(postalCode: string): string {
  const digits = postalCode.replace(/\D/g, '');
  if (digits.length !== 5) return postalCode;

  return `${digits.slice(0, 2)}-${digits.slice(2, 5)}`;
}

/**
 * Clean postal code (remove formatting)
 */
export function cleanPostalCode(postalCode: string): string {
  return postalCode.replace(/\D/g, '');
}

// ============================================================================
// Phone Number Validation (Polish)
// ============================================================================

/**
 * Validate Polish phone number
 * @param phone - Phone number string
 * @returns true if valid format, false otherwise
 */
export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;

  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // Polish phone numbers are 9 digits
  // With country code: +48 or 0048 followed by 9 digits
  if (digits.length === 9) return true;
  if (digits.length === 11 && digits.startsWith('48')) return true;

  return false;
}

/**
 * Format phone number (XXX XXX XXX or +48 XXX XXX XXX)
 */
export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 9) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
  } else if (digits.length === 11 && digits.startsWith('48')) {
    return `+48 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 11)}`;
  }

  return phone;
}

/**
 * Clean phone number (remove formatting)
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}
