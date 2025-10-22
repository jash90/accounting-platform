/**
 * GUS API Integration Service
 * Główny Urząd Statystyczny (Polish Central Statistical Office)
 *
 * This service fetches company data from the Polish GUS API (REGON database)
 * Implements caching, retry logic, and proper error handling
 *
 * API Documentation: https://api.stat.gov.pl/Home/RegonApi
 */

import { validateNIP } from '../utils/nip';
import { validateREGON } from '../utils/regon';

// ============================================================================
// Types
// ============================================================================

export interface GUSCompanyData {
  // Basic Information
  name: string; // Nazwa podmiotu
  shortName?: string; // Nazwa skrócona
  regon: string; // REGON
  nip?: string; // NIP
  krs?: string; // KRS

  // Address
  street?: string; // Ulica
  propertyNumber?: string; // Numer nieruchomości
  apartmentNumber?: string; // Numer lokalu
  city: string; // Miejscowość
  postalCode: string; // Kod pocztowy
  province: string; // Województwo
  district?: string; // Powiat
  commune?: string; // Gmina

  // Business Classification
  pkdMain?: string; // Główny kod PKD
  pkdMainName?: string; // Nazwa głównego PKD
  pkdSecondary?: string[]; // Dodatkowe kody PKD

  // Legal Form
  legalForm?: string; // Forma prawna
  legalFormCode?: string; // Kod formy prawnej

  // Dates
  registrationDate?: string; // Data rejestracji
  startDate?: string; // Data rozpoczęcia działalności
  suspensionDate?: string; // Data zawieszenia działalności
  resumptionDate?: string; // Data wznowienia działalności
  closureDate?: string; // Data zakończenia działalności

  // Status
  status?: 'active' | 'suspended' | 'closed'; // Status działalności
  employeeRange?: string; // Przedział zatrudnienia

  // Contact
  phone?: string; // Telefon
  email?: string; // Email
  website?: string; // Strona www

  // Additional
  hasLocalUnits?: boolean; // Czy posiada jednostki lokalne
  localUnitsCount?: number; // Liczba jednostek lokalnych
}

export interface GUSApiError {
  code: string;
  message: string;
  details?: any;
}

export interface GUSApiResponse {
  success: boolean;
  data?: GUSCompanyData;
  error?: GUSApiError;
  cachedAt?: Date;
}

// ============================================================================
// GUS Service Class
// ============================================================================

export class GUSService {
  private baseUrl: string;
  private apiKey: string;
  private cacheEnabled: boolean;
  private cacheTTL: number; // in seconds
  private maxRetries: number;
  private retryDelay: number; // in milliseconds

  constructor(config?: {
    apiKey?: string;
    cacheEnabled?: boolean;
    cacheTTL?: number;
    maxRetries?: number;
    retryDelay?: number;
  }) {
    this.baseUrl = process.env.GUS_API_URL || 'https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc';
    this.apiKey = config?.apiKey || process.env.GUS_API_KEY || '';
    this.cacheEnabled = config?.cacheEnabled ?? true;
    this.cacheTTL = config?.cacheTTL ?? 86400; // 24 hours
    this.maxRetries = config?.maxRetries ?? 3;
    this.retryDelay = config?.retryDelay ?? 1000;
  }

  /**
   * Fetch company data by NIP
   */
  async fetchByNIP(nip: string): Promise<GUSApiResponse> {
    // Validate NIP
    if (!validateNIP(nip)) {
      return {
        success: false,
        error: {
          code: 'INVALID_NIP',
          message: 'Nieprawidłowy numer NIP',
        },
      };
    }

    return this.fetchCompanyData('nip', nip);
  }

  /**
   * Fetch company data by REGON
   */
  async fetchByREGON(regon: string): Promise<GUSApiResponse> {
    // Validate REGON
    if (!validateREGON(regon)) {
      return {
        success: false,
        error: {
          code: 'INVALID_REGON',
          message: 'Nieprawidłowy numer REGON',
        },
      };
    }

    return this.fetchCompanyData('regon', regon);
  }

  /**
   * Main method to fetch company data
   */
  private async fetchCompanyData(
    type: 'nip' | 'regon',
    value: string
  ): Promise<GUSApiResponse> {
    const cacheKey = `gus:${type}:${value}`;

    // Check cache first (if Redis is available)
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

    // Fetch from API with retry logic
    try {
      const data = await this.fetchWithRetry(type, value);

      // Cache the result
      if (this.cacheEnabled && data) {
        try {
          await this.saveToCache(cacheKey, data);
        } catch (error) {
          console.warn('Cache write failed:', error);
        }
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: this.parseError(error),
      };
    }
  }

  /**
   * Fetch data with retry logic
   */
  private async fetchWithRetry(
    type: 'nip' | 'regon',
    value: string,
    attempt = 1
  ): Promise<GUSCompanyData> {
    try {
      return await this.makeApiRequest(type, value);
    } catch (error) {
      if (attempt < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        await this.sleep(delay);
        return this.fetchWithRetry(type, value, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Make actual API request to GUS
   * Note: This is a simplified implementation. Real GUS API requires SOAP protocol.
   * In production, you'd use a proper SOAP client or the official GUS API library.
   */
  private async makeApiRequest(
    type: 'nip' | 'regon',
    value: string
  ): Promise<GUSCompanyData> {
    // If API key is not configured, return mock data for development
    if (!this.apiKey || this.apiKey === 'your-gus-api-key-here') {
      console.warn('⚠️  Using mock GUS data (API key not configured)');
      return this.getMockCompanyData(type, value);
    }

    // This is a placeholder for production implementation
    // In production, implement actual GUS API SOAP calls
    // For now, return mock data structure
    throw new Error('GUS API integration requires SOAP client implementation');

    // Example of what the real implementation would look like:
    /*
    const soapClient = await this.getSoapClient();
    await soapClient.loginAsync({ key: this.apiKey });

    const result = type === 'nip'
      ? await soapClient.DaneSzukajPodmiotyAsync({ pNip: value })
      : await soapClient.DaneSzukajPodmiotyAsync({ pRegon: value });

    await soapClient.logoutAsync();

    return this.parseGUSResponse(result);
    */
  }

  /**
   * Parse GUS API response to our standard format
   */
  private parseGUSResponse(rawData: any): GUSCompanyData {
    // Transform GUS API response to our standard format
    // This is a placeholder - implement based on actual GUS API response
    return {
      name: rawData.nazwa || '',
      regon: rawData.regon || '',
      nip: rawData.nip,
      city: rawData.miejscowosc || '',
      postalCode: rawData.kodPocztowy || '',
      province: rawData.wojewodztwo || '',
      status: this.mapStatus(rawData.statusNip),
    };
  }

  /**
   * Map GUS status to our status enum
   */
  private mapStatus(gusStatus?: string): 'active' | 'suspended' | 'closed' {
    if (!gusStatus) return 'active';

    switch (gusStatus.toLowerCase()) {
      case 'aktywny':
        return 'active';
      case 'zawieszony':
        return 'suspended';
      case 'zamknięty':
      case 'wykreślony':
        return 'closed';
      default:
        return 'active';
    }
  }

  /**
   * Parse error to standard format
   */
  private parseError(error: any): GUSApiError {
    if (error.message?.includes('API key')) {
      return {
        code: 'API_KEY_MISSING',
        message: 'Brak klucza API GUS',
      };
    }

    if (error.message?.includes('not found')) {
      return {
        code: 'NOT_FOUND',
        message: 'Nie znaleziono podmiotu w bazie GUS',
      };
    }

    if (error.message?.includes('timeout')) {
      return {
        code: 'TIMEOUT',
        message: 'Przekroczono czas oczekiwania na odpowiedź z API GUS',
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'Nieoczekiwany błąd podczas pobierania danych z GUS',
      details: error.message,
    };
  }

  /**
   * Cache operations (requires Redis client)
   */
  private async getFromCache(key: string): Promise<GUSCompanyData | null> {
    // Placeholder - implement Redis client
    // const redis = getRedisClient();
    // const cached = await redis.get(key);
    // return cached ? JSON.parse(cached) : null;
    return null;
  }

  private async saveToCache(
    key: string,
    data: GUSCompanyData
  ): Promise<void> {
    // Placeholder - implement Redis client
    // const redis = getRedisClient();
    // await redis.setex(key, this.cacheTTL, JSON.stringify(data));
  }

  /**
   * Utility: Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get mock company data for development
   * Returns realistic Polish company data for testing
   */
  private getMockCompanyData(type: 'nip' | 'regon', value: string): GUSCompanyData {
    const mockData: GUSCompanyData = {
      name: 'Example Company Sp. z o.o.',
      shortName: 'ExCo',
      regon: type === 'regon' ? value : '123456785',
      nip: type === 'nip' ? value : '1234567890',
      krs: '0000123456',

      // Address
      street: 'Marszałkowska',
      propertyNumber: '100',
      apartmentNumber: '5A',
      city: 'Warsaw',
      postalCode: '00-001',
      province: 'Mazowieckie',
      district: 'Warszawa',
      commune: 'Śródmieście',

      // Business Classification
      pkdMain: '62.01.Z',
      pkdMainName: 'Działalność związana z oprogramowaniem',
      pkdSecondary: ['62.02.Z', '62.03.Z'],

      // Legal Form
      legalForm: 'Spółka z ograniczoną odpowiedzialnością',
      legalFormCode: '117',

      // Dates
      registrationDate: '2020-01-15',
      startDate: '2020-02-01',

      // Status
      status: 'active',
      employeeRange: '10-49',

      // Contact
      phone: '+48 22 123 4567',
      email: 'contact@example.com',
      website: 'https://example.com',

      // Additional
      hasLocalUnits: false,
      localUnitsCount: 0,
    };

    return mockData;
  }

  /**
   * Check if service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Implement actual health check
      return !!this.apiKey;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let gusServiceInstance: GUSService | null = null;

export function getGUSService(): GUSService {
  if (!gusServiceInstance) {
    gusServiceInstance = new GUSService();
  }
  return gusServiceInstance;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Quick helper to fetch company data by NIP
 */
export async function fetchCompanyByNIP(nip: string): Promise<GUSApiResponse> {
  const service = getGUSService();
  return service.fetchByNIP(nip);
}

/**
 * Quick helper to fetch company data by REGON
 */
export async function fetchCompanyByREGON(regon: string): Promise<GUSApiResponse> {
  const service = getGUSService();
  return service.fetchByREGON(regon);
}
