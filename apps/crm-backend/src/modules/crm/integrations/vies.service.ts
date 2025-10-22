/**
 * VIES API Integration Service
 * VAT Information Exchange System - EU VAT Number Validation
 *
 * This service validates EU VAT numbers using the European Commission's VIES service
 * Implements caching, retry logic, and proper error handling
 *
 * API Documentation: https://ec.europa.eu/taxation_customs/vies/technicalInformation.html
 */

// ============================================================================
// Types
// ============================================================================

export interface VIESValidationResult {
  countryCode: string; // e.g., 'PL', 'DE', 'FR'
  vatNumber: string; // VAT number without country code
  requestDate: Date;
  valid: boolean;
  name?: string; // Company name (if provided by VIES)
  address?: string; // Company address (if provided by VIES)
}

export interface VIESApiError {
  code: string;
  message: string;
  details?: any;
}

export interface VIESApiResponse {
  success: boolean;
  data?: VIESValidationResult;
  error?: VIESApiError;
  cachedAt?: Date;
}

// ============================================================================
// Country Code Mapping
// ============================================================================

export const EU_COUNTRY_CODES = [
  'AT', // Austria
  'BE', // Belgium
  'BG', // Bulgaria
  'CY', // Cyprus
  'CZ', // Czech Republic
  'DE', // Germany
  'DK', // Denmark
  'EE', // Estonia
  'EL', // Greece
  'ES', // Spain
  'FI', // Finland
  'FR', // France
  'HR', // Croatia
  'HU', // Hungary
  'IE', // Ireland
  'IT', // Italy
  'LT', // Lithuania
  'LU', // Luxembourg
  'LV', // Latvia
  'MT', // Malta
  'NL', // Netherlands
  'PL', // Poland
  'PT', // Portugal
  'RO', // Romania
  'SE', // Sweden
  'SI', // Slovenia
  'SK', // Slovakia
] as const;

export type EUCountryCode = typeof EU_COUNTRY_CODES[number];

// ============================================================================
// VAT Number Format Validation
// ============================================================================

const VAT_REGEX_BY_COUNTRY: Record<string, RegExp> = {
  AT: /^U\d{8}$/, // Austria
  BE: /^\d{10}$/, // Belgium
  BG: /^\d{9,10}$/, // Bulgaria
  CY: /^\d{8}[A-Z]$/, // Cyprus
  CZ: /^\d{8,10}$/, // Czech Republic
  DE: /^\d{9}$/, // Germany
  DK: /^\d{8}$/, // Denmark
  EE: /^\d{9}$/, // Estonia
  EL: /^\d{9}$/, // Greece
  ES: /^[A-Z]\d{7}[A-Z]$|^\d{8}[A-Z]$|^[A-Z]\d{8}$/, // Spain
  FI: /^\d{8}$/, // Finland
  FR: /^[A-Z0-9]{2}\d{9}$/, // France
  HR: /^\d{11}$/, // Croatia
  HU: /^\d{8}$/, // Hungary
  IE: /^\d[A-Z0-9]\d{5}[A-Z]$|^\d{7}[A-Z]{2}$/, // Ireland
  IT: /^\d{11}$/, // Italy
  LT: /^\d{9}$|^\d{12}$/, // Lithuania
  LU: /^\d{8}$/, // Luxembourg
  LV: /^\d{11}$/, // Latvia
  MT: /^\d{8}$/, // Malta
  NL: /^\d{9}B\d{2}$/, // Netherlands
  PL: /^\d{10}$/, // Poland
  PT: /^\d{9}$/, // Portugal
  RO: /^\d{2,10}$/, // Romania
  SE: /^\d{12}$/, // Sweden
  SI: /^\d{8}$/, // Slovenia
  SK: /^\d{10}$/, // Slovakia
};

// ============================================================================
// VIES Service Class
// ============================================================================

export class VIESService {
  private baseUrl: string;
  private cacheEnabled: boolean;
  private cacheTTL: number; // in seconds
  private maxRetries: number;
  private retryDelay: number; // in milliseconds

  constructor(config?: {
    cacheEnabled?: boolean;
    cacheTTL?: number;
    maxRetries?: number;
    retryDelay?: number;
  }) {
    this.baseUrl = 'https://ec.europa.eu/taxation_customs/vies/services/checkVatService';
    this.cacheEnabled = config?.cacheEnabled ?? true;
    this.cacheTTL = config?.cacheTTL ?? 86400; // 24 hours
    this.maxRetries = config?.maxRetries ?? 3;
    this.retryDelay = config?.retryDelay ?? 1000;
  }

  /**
   * Validate EU VAT number
   */
  async validateVAT(
    countryCode: string,
    vatNumber: string
  ): Promise<VIESApiResponse> {
    // Normalize inputs
    const normalizedCountryCode = countryCode.toUpperCase().trim();
    const normalizedVatNumber = this.cleanVatNumber(vatNumber);

    // Validate country code
    if (!this.isValidCountryCode(normalizedCountryCode)) {
      return {
        success: false,
        error: {
          code: 'INVALID_COUNTRY_CODE',
          message: `Nieprawidłowy kod kraju: ${countryCode}. Dozwolone kody: ${EU_COUNTRY_CODES.join(', ')}`,
        },
      };
    }

    // Validate VAT number format
    const formatError = this.validateVatFormat(
      normalizedCountryCode,
      normalizedVatNumber
    );
    if (formatError) {
      return {
        success: false,
        error: formatError,
      };
    }

    // Check cache
    const cacheKey = `vies:${normalizedCountryCode}:${normalizedVatNumber}`;
    if (this.cacheEnabled) {
      try {
        const cached = await this.getFromCache(cacheKey);
        if (cached) {
          return {
            success: true,
            data: cached,
            cachedAt: new Date(),
          };
        }
      } catch (error) {
        console.warn('Cache read failed, continuing without cache:', error);
      }
    }

    // Fetch from VIES API with retry
    try {
      const result = await this.fetchWithRetry(
        normalizedCountryCode,
        normalizedVatNumber
      );

      // Cache the result
      if (this.cacheEnabled && result) {
        try {
          await this.saveToCache(cacheKey, result);
        } catch (error) {
          console.warn('Cache write failed:', error);
        }
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: this.parseError(error),
      };
    }
  }

  /**
   * Validate full VAT number (e.g., 'PL1234567890')
   */
  async validateFullVAT(fullVatNumber: string): Promise<VIESApiResponse> {
    const parsed = this.parseFullVatNumber(fullVatNumber);

    if (!parsed) {
      return {
        success: false,
        error: {
          code: 'INVALID_FORMAT',
          message: 'Nieprawidłowy format numeru VAT. Oczekiwany format: XX1234567890 (kod kraju + numer)',
        },
      };
    }

    return this.validateVAT(parsed.countryCode, parsed.vatNumber);
  }

  /**
   * Parse full VAT number into country code and number
   */
  private parseFullVatNumber(
    fullVatNumber: string
  ): { countryCode: string; vatNumber: string } | null {
    const cleaned = fullVatNumber.trim().toUpperCase();

    // Extract first 2 characters as country code
    const countryCode = cleaned.slice(0, 2);
    const vatNumber = cleaned.slice(2);

    if (this.isValidCountryCode(countryCode) && vatNumber.length > 0) {
      return { countryCode, vatNumber };
    }

    return null;
  }

  /**
   * Clean VAT number (remove spaces, hyphens, etc.)
   */
  private cleanVatNumber(vatNumber: string): string {
    return vatNumber.replace(/[\s\-\.]/g, '').toUpperCase();
  }

  /**
   * Validate if country code is valid EU country
   */
  private isValidCountryCode(countryCode: string): boolean {
    return EU_COUNTRY_CODES.includes(countryCode as EUCountryCode);
  }

  /**
   * Validate VAT number format for specific country
   */
  private validateVatFormat(
    countryCode: string,
    vatNumber: string
  ): VIESApiError | null {
    const regex = VAT_REGEX_BY_COUNTRY[countryCode];

    if (!regex) {
      return {
        code: 'FORMAT_VALIDATION_NOT_AVAILABLE',
        message: `Walidacja formatu dla kraju ${countryCode} nie jest dostępna`,
      };
    }

    if (!regex.test(vatNumber)) {
      return {
        code: 'INVALID_FORMAT',
        message: `Nieprawidłowy format numeru VAT dla kraju ${countryCode}`,
      };
    }

    return null;
  }

  /**
   * Fetch from VIES API with retry logic
   */
  private async fetchWithRetry(
    countryCode: string,
    vatNumber: string,
    attempt = 1
  ): Promise<VIESValidationResult> {
    try {
      return await this.makeApiRequest(countryCode, vatNumber);
    } catch (error) {
      if (attempt < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);
        return this.fetchWithRetry(countryCode, vatNumber, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Make actual API request to VIES
   */
  private async makeApiRequest(
    countryCode: string,
    vatNumber: string
  ): Promise<VIESValidationResult> {
    // Build SOAP request
    const soapRequest = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                        xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
        <soapenv:Header/>
        <soapenv:Body>
          <urn:checkVat>
            <urn:countryCode>${countryCode}</urn:countryCode>
            <urn:vatNumber>${vatNumber}</urn:vatNumber>
          </urn:checkVat>
        </soapenv:Body>
      </soapenv:Envelope>
    `.trim();

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': '',
        },
        body: soapRequest,
      });

      if (!response.ok) {
        throw new Error(`VIES API returned status ${response.status}`);
      }

      const xmlText = await response.text();
      return this.parseVIESResponse(countryCode, vatNumber, xmlText);
    } catch (error) {
      throw new Error(`Failed to validate VAT: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse VIES SOAP response
   */
  private parseVIESResponse(
    countryCode: string,
    vatNumber: string,
    xmlText: string
  ): VIESValidationResult {
    // Simple XML parsing (in production, use a proper XML parser)
    const validMatch = xmlText.match(/<valid>([^<]+)<\/valid>/);
    const nameMatch = xmlText.match(/<name>([^<]+)<\/name>/);
    const addressMatch = xmlText.match(/<address>([^<]+)<\/address>/);

    const valid = validMatch ? validMatch[1] === 'true' : false;

    return {
      countryCode,
      vatNumber,
      requestDate: new Date(),
      valid,
      name: nameMatch ? this.decodeXmlEntities(nameMatch[1]) : undefined,
      address: addressMatch ? this.decodeXmlEntities(addressMatch[1]) : undefined,
    };
  }

  /**
   * Decode XML entities
   */
  private decodeXmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  /**
   * Parse error to standard format
   */
  private parseError(error: any): VIESApiError {
    const message = error.message || 'Unknown error';

    if (message.includes('timeout')) {
      return {
        code: 'TIMEOUT',
        message: 'Przekroczono czas oczekiwania na odpowiedź z VIES',
      };
    }

    if (message.includes('INVALID_INPUT')) {
      return {
        code: 'INVALID_INPUT',
        message: 'Nieprawidłowe dane wejściowe',
      };
    }

    if (message.includes('SERVICE_UNAVAILABLE')) {
      return {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Usługa VIES jest obecnie niedostępna',
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'Nieoczekiwany błąd podczas walidacji VAT',
      details: message,
    };
  }

  /**
   * Cache operations
   */
  private async getFromCache(key: string): Promise<VIESValidationResult | null> {
    // Placeholder - implement Redis client
    return null;
  }

  private async saveToCache(key: string, data: VIESValidationResult): Promise<void> {
    // Placeholder - implement Redis client
  }

  /**
   * Utility: Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try validating a known valid VAT number
      const result = await this.validateVAT('PL', '5260250274');
      return result.success;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let viesServiceInstance: VIESService | null = null;

export function getVIESService(): VIESService {
  if (!viesServiceInstance) {
    viesServiceInstance = new VIESService();
  }
  return viesServiceInstance;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Quick helper to validate EU VAT number
 */
export async function validateEUVAT(
  countryCode: string,
  vatNumber: string
): Promise<VIESApiResponse> {
  const service = getVIESService();
  return service.validateVAT(countryCode, vatNumber);
}

/**
 * Quick helper to validate full VAT number (e.g., 'PL1234567890')
 */
export async function validateFullVATNumber(
  fullVatNumber: string
): Promise<VIESApiResponse> {
  const service = getVIESService();
  return service.validateFullVAT(fullVatNumber);
}
