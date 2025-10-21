/**
 * PESEL (Powszechny Elektroniczny System Ewidencji Ludności) Validator
 * Polish National Identification Number - 11 digits
 *
 * Format: YYMMDDZZZXQ where:
 * - YY: year of birth (last 2 digits)
 * - MM: month of birth (with century encoding)
 * - DD: day of birth
 * - ZZZ: serial number
 * - X: sex (even = female, odd = male)
 * - Q: checksum
 *
 * Example: 44051401458
 */

/**
 * Validates Polish PESEL
 *
 * @param pesel - PESEL number to validate
 * @returns true if valid, false otherwise
 */
export function validatePESEL(pesel: string): boolean {
  if (!pesel) return false;

  // Remove spaces
  const cleanPesel = pesel.replace(/\s/g, '');

  // Must be exactly 11 digits
  if (!/^\d{11}$/.test(cleanPesel)) {
    return false;
  }

  // Validate checksum
  const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];

  const sum = cleanPesel
    .slice(0, 10)
    .split('')
    .reduce((acc, digit, index) => {
      return acc + parseInt(digit, 10) * weights[index];
    }, 0);

  const checksum = (10 - (sum % 10)) % 10;
  const expectedChecksum = parseInt(cleanPesel[10], 10);

  if (checksum !== expectedChecksum) {
    return false;
  }

  // Validate date
  const birthDate = extractBirthDateFromPESEL(cleanPesel);
  if (!birthDate) {
    return false;
  }

  return true;
}

/**
 * Extracts birth date from PESEL
 *
 * @param pesel - PESEL number
 * @returns Date object or null if invalid
 */
export function extractBirthDateFromPESEL(pesel: string): Date | null {
  if (!pesel || pesel.length !== 11) return null;

  let year = parseInt(pesel.slice(0, 2), 10);
  let month = parseInt(pesel.slice(2, 4), 10);
  const day = parseInt(pesel.slice(4, 6), 10);

  // Decode century from month
  if (month >= 81 && month <= 92) {
    // 1800-1899
    year += 1800;
    month -= 80;
  } else if (month >= 1 && month <= 12) {
    // 1900-1999
    year += 1900;
  } else if (month >= 21 && month <= 32) {
    // 2000-2099
    year += 2000;
    month -= 20;
  } else if (month >= 41 && month <= 52) {
    // 2100-2199
    year += 2100;
    month -= 40;
  } else if (month >= 61 && month <= 72) {
    // 2200-2299
    year += 2200;
    month -= 60;
  } else {
    return null; // Invalid month encoding
  }

  // Validate date
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null; // Invalid date
  }

  return date;
}

/**
 * Extracts sex from PESEL
 *
 * @param pesel - PESEL number
 * @returns 'M' for male, 'F' for female, or null if invalid
 */
export function extractSexFromPESEL(pesel: string): 'M' | 'F' | null {
  if (!pesel || pesel.length !== 11) return null;

  const sexDigit = parseInt(pesel[9], 10);

  // Even = female, odd = male
  return sexDigit % 2 === 0 ? 'F' : 'M';
}

/**
 * Formats PESEL for display (adds spaces)
 *
 * @param pesel - PESEL number
 * @returns Formatted PESEL (YYMMDD XXXXX)
 */
export function formatPESEL(pesel: string): string {
  if (!pesel) return '';

  const cleanPesel = pesel.replace(/\s/g, '');

  if (cleanPesel.length !== 11) {
    return pesel;
  }

  // Format: YYMMDD XXXXX
  return `${cleanPesel.slice(0, 6)} ${cleanPesel.slice(6, 11)}`;
}

/**
 * Cleans PESEL by removing formatting characters
 *
 * @param pesel - PESEL number with possible formatting
 * @returns Clean PESEL
 */
export function cleanPESEL(pesel: string): string {
  if (!pesel) return '';
  return pesel.replace(/\s/g, '');
}

/**
 * Validates and returns error message if invalid
 *
 * @param pesel - PESEL number to validate
 * @returns Error message or null if valid
 */
export function validatePESELWithMessage(pesel: string): string | null {
  if (!pesel) {
    return 'PESEL jest wymagany';
  }

  const cleanPesel = cleanPESEL(pesel);

  if (cleanPesel.length !== 11) {
    return 'PESEL musi składać się z 11 cyfr';
  }

  if (!/^\d{11}$/.test(cleanPesel)) {
    return 'PESEL może zawierać tylko cyfry';
  }

  const birthDate = extractBirthDateFromPESEL(cleanPesel);
  if (!birthDate) {
    return 'PESEL zawiera nieprawidłową datę urodzenia';
  }

  if (!validatePESEL(cleanPesel)) {
    return 'Nieprawidłowa suma kontrolna PESEL';
  }

  return null;
}

/**
 * Calculates age from PESEL
 *
 * @param pesel - PESEL number
 * @returns Age in years or null if invalid
 */
export function calculateAgeFromPESEL(pesel: string): number | null {
  const birthDate = extractBirthDateFromPESEL(pesel);
  if (!birthDate) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}
