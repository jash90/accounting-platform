/**
 * Client Service - Core Business Logic
 * Handles all client-related operations with proper error handling,
 * validation, and integration with external services
 */

import { eq, and, or, sql, desc, asc, isNull, ilike, inArray } from 'drizzle-orm';
import {
  db,
  clients,
  clientContacts,
  clientTimelineEvents,
  clientValidationHistory,
  type Client,
  type NewClient,
  type ClientContact,
  type NewClientContact,
  type ClientTimelineEvent,
} from '../../../../../backend/src/db';
import type {
  CreateClientInput,
  UpdateClientInput,
  ListClientsQuery,
  CreateClientContactInput,
} from '../validators/client.schema';
import { fetchCompanyByNIP } from '../integrations/gus.service';
import { validateEUVAT } from '../integrations/vies.service';
import { cleanNIP } from '../utils/nip';
import { cleanREGON } from '../utils/regon';

// ============================================================================
// Types
// ============================================================================

export interface ClientWithRelations extends Client {
  contacts?: ClientContact[];
  timeline?: ClientTimelineEvent[];
  assignedUser?: { id: string; email: string; firstName: string; lastName: string };
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface RiskAssessment {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high';
  factors: string[];
  assessedAt: Date;
}

// ============================================================================
// Client Service Class
// ============================================================================

export class ClientService {
  /**
   * Create a new client
   */
  async createClient(
    data: CreateClientInput,
    userId: string
  ): Promise<ClientWithRelations> {
    // Clean and normalize tax identifiers
    const cleanedData = this.normalizeClientData(data);

    // Check for duplicate NIP
    if (cleanedData.nip) {
      const existing = await this.findByNIP(cleanedData.nip);
      if (existing && !existing.deletedAt) {
        throw new Error('Klient z tym numerem NIP już istnieje');
      }
    }

    // Perform risk assessment
    const riskAssessment = await this.assessRisk(cleanedData);

    // Insert client
    const [client] = await db
      .insert(clients)
      .values({
        ...cleanedData,
        riskScore: riskAssessment.score,
        riskLevel: riskAssessment.level,
        riskFactors: riskAssessment.factors,
        lastRiskAssessment: new Date(),
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    // Create timeline event
    await this.createTimelineEvent({
      clientId: client.id,
      eventType: 'created',
      title: 'Klient utworzony',
      description: `Klient ${client.companyName} został dodany do systemu`,
      userId,
    });

    return this.getClientWithRelations(client.id);
  }

  /**
   * Update an existing client
   */
  async updateClient(
    id: string,
    data: Partial<UpdateClientInput>,
    userId: string
  ): Promise<ClientWithRelations> {
    // Get current client for optimistic locking
    const current = await this.getClient(id);
    if (!current) {
      throw new Error('Klient nie znaleziony');
    }

    if (current.deletedAt) {
      throw new Error('Nie można edytować usuniętego klienta');
    }

    // Check version for optimistic locking
    if (data.version && data.version !== current.version) {
      throw new Error(
        'Klient został zmodyfikowany przez innego użytkownika. Odśwież dane i spróbuj ponownie.'
      );
    }

    // Clean and normalize data
    const cleanedData = this.normalizeClientData(data);

    // Re-assess risk if relevant data changed
    let riskUpdate = {};
    if (this.shouldReassessRisk(data)) {
      const riskAssessment = await this.assessRisk({
        ...current,
        ...cleanedData,
      });
      riskUpdate = {
        riskScore: riskAssessment.score,
        riskLevel: riskAssessment.level,
        riskFactors: riskAssessment.factors,
        lastRiskAssessment: new Date(),
      };
    }

    // Update client
    const [updated] = await db
      .update(clients)
      .set({
        ...cleanedData,
        ...riskUpdate,
        version: sql`${clients.version} + 1`,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, id))
      .returning();

    // Create timeline event
    await this.createTimelineEvent({
      clientId: id,
      eventType: 'updated',
      title: 'Klient zaktualizowany',
      description: `Dane klienta ${updated.companyName} zostały zaktualizowane`,
      userId,
    });

    return this.getClientWithRelations(id);
  }

  /**
   * Get client by ID with relations
   */
  async getClient(id: string): Promise<Client | null> {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1);

    return client || null;
  }

  /**
   * Get client with all relations
   */
  async getClientWithRelations(id: string): Promise<ClientWithRelations> {
    const client = await this.getClient(id);
    if (!client) {
      throw new Error('Klient nie znaleziony');
    }

    // Load contacts
    const contacts = await db
      .select()
      .from(clientContacts)
      .where(eq(clientContacts.clientId, id));

    // Load recent timeline events
    const timeline = await db
      .select()
      .from(clientTimelineEvents)
      .where(eq(clientTimelineEvents.clientId, id))
      .orderBy(desc(clientTimelineEvents.occurredAt))
      .limit(50);

    return {
      ...client,
      contacts,
      timeline,
    };
  }

  /**
   * List clients with pagination and filtering
   */
  async listClients(
    query: ListClientsQuery,
    userId?: string
  ): Promise<PaginatedResult<ClientWithRelations>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
      clientType,
      taxForm,
      assignedUserId,
      tags,
      search,
      minRiskScore,
      maxRiskScore,
      riskLevel,
      createdAfter,
      createdBefore,
      includeDeleted = false,
    } = query;

    // Build where conditions
    const conditions: any[] = [];

    if (!includeDeleted) {
      conditions.push(isNull(clients.deletedAt));
    }

    if (status) {
      conditions.push(eq(clients.status, status));
    }

    if (clientType) {
      conditions.push(eq(clients.clientType, clientType));
    }

    if (taxForm) {
      conditions.push(eq(clients.taxForm, taxForm));
    }

    if (assignedUserId) {
      conditions.push(eq(clients.assignedUserId, assignedUserId));
    }

    if (minRiskScore !== undefined) {
      conditions.push(sql`${clients.riskScore} >= ${minRiskScore}`);
    }

    if (maxRiskScore !== undefined) {
      conditions.push(sql`${clients.riskScore} <= ${maxRiskScore}`);
    }

    if (riskLevel) {
      conditions.push(eq(clients.riskLevel, riskLevel));
    }

    if (createdAfter) {
      conditions.push(sql`${clients.createdAt} >= ${createdAfter}`);
    }

    if (createdBefore) {
      conditions.push(sql`${clients.createdAt} <= ${createdBefore}`);
    }

    if (search) {
      conditions.push(
        or(
          ilike(clients.companyName, `%${search}%`),
          ilike(clients.nip, `%${search}%`),
          ilike(clients.email, `%${search}%`)
        )
      );
    }

    if (tags && tags.length > 0) {
      // Search in JSONB array
      conditions.push(sql`${clients.tags} ?| array[${tags.join(',')}]`);
    }

    // Count total
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(clients)
      .where(and(...conditions));

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    // Fetch data
    const orderColumn: any = clients[sortBy as keyof typeof clients] || clients.createdAt;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    const results = await db
      .select()
      .from(clients)
      .where(and(...conditions))
      .orderBy(orderFn(orderColumn))
      .limit(limit)
      .offset(offset);

    // Load relations for each client
    const clientsWithRelations = await Promise.all(
      results.map((client) => this.getClientWithRelations(client.id))
    );

    return {
      data: clientsWithRelations,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  /**
   * Soft delete client
   */
  async deleteClient(id: string, userId: string): Promise<void> {
    await db
      .update(clients)
      .set({
        deletedAt: new Date(),
        deletedBy: userId,
        status: 'archived',
      })
      .where(eq(clients.id, id));

    await this.createTimelineEvent({
      clientId: id,
      eventType: 'status_changed',
      title: 'Klient usunięty',
      description: 'Klient został przeniesiony do archiwum',
      userId,
    });
  }

  /**
   * Restore soft-deleted client
   */
  async restoreClient(id: string, userId: string): Promise<ClientWithRelations> {
    const [restored] = await db
      .update(clients)
      .set({
        deletedAt: null,
        deletedBy: null,
        status: 'inactive',
      })
      .where(eq(clients.id, id))
      .returning();

    await this.createTimelineEvent({
      clientId: id,
      eventType: 'status_changed',
      title: 'Klient przywrócony',
      description: 'Klient został przywrócony z archiwum',
      userId,
    });

    return this.getClientWithRelations(id);
  }

  /**
   * Find client by NIP
   */
  async findByNIP(nip: string): Promise<Client | null> {
    const cleaned = cleanNIP(nip);
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.nip, cleaned))
      .limit(1);

    return client || null;
  }

  /**
   * Enrich client data from GUS
   */
  async enrichFromGUS(id: string, userId: string): Promise<ClientWithRelations> {
    const client = await this.getClient(id);
    if (!client || !client.nip) {
      throw new Error('Klient nie ma numeru NIP');
    }

    const gusResponse = await fetchCompanyByNIP(client.nip);

    if (!gusResponse.success || !gusResponse.data) {
      throw new Error(
        gusResponse.error?.message || 'Nie udało się pobrać danych z GUS'
      );
    }

    const gusData = gusResponse.data;

    // Update client with GUS data
    await db
      .update(clients)
      .set({
        regon: gusData.regon || client.regon,
        krs: gusData.krs || client.krs,
        addressStreet: gusData.street || client.addressStreet,
        addressCity: gusData.city || client.addressCity,
        addressPostalCode: gusData.postalCode || client.addressPostalCode,
        addressProvince: gusData.province || client.addressProvince,
        pkdPrimary: gusData.pkdMain || client.pkdPrimary,
        gusDataFetched: true,
        gusDataFetchedAt: new Date(),
        gusData: gusData as any,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, id));

    await this.createTimelineEvent({
      clientId: id,
      eventType: 'updated',
      title: 'Dane pobrane z GUS',
      description: 'Dane firmy zostały zaktualizowane z bazy GUS',
      userId,
    });

    return this.getClientWithRelations(id);
  }

  /**
   * Validate EU VAT number
   */
  async validateVATEU(
    id: string,
    userId: string
  ): Promise<{ valid: boolean; details?: any }> {
    const client = await this.getClient(id);
    if (!client || !client.vatEu) {
      throw new Error('Klient nie ma numeru VAT UE');
    }

    // Extract country code and number
    const countryCode = client.vatEu.slice(0, 2);
    const vatNumber = client.vatEu.slice(2);

    const viesResponse = await validateEUVAT(countryCode, vatNumber);

    // Save validation history
    await db.insert(clientValidationHistory).values({
      clientId: id,
      validationType: 'VAT_EU',
      isValid: viesResponse.success && (viesResponse.data?.valid || false),
      validationData: viesResponse.data as any,
      errorMessage: viesResponse.error?.message,
      validatedBy: userId,
    });

    if (viesResponse.success && viesResponse.data) {
      // Update client
      await db
        .update(clients)
        .set({
          vatEuValidated: viesResponse.data.valid,
          vatEuValidatedAt: new Date(),
        })
        .where(eq(clients.id, id));

      await this.createTimelineEvent({
        clientId: id,
        eventType: 'updated',
        title: viesResponse.data.valid
          ? 'VAT UE zweryfikowany pozytywnie'
          : 'VAT UE zweryfikowany negatywnie',
        description: `Numer VAT UE został zweryfikowany w systemie VIES`,
        userId,
      });
    }

    return {
      valid: viesResponse.data?.valid || false,
      details: viesResponse.data,
    };
  }

  /**
   * Assess client risk
   */
  async assessRisk(data: Partial<Client>): Promise<RiskAssessment> {
    let score = 0;
    const factors: string[] = [];

    // Tax identification completeness
    if (!data.nip && !data.regon) {
      score += 20;
      factors.push('Brak podstawowych identyfikatorów podatkowych');
    }

    // Address completeness
    if (!data.addressStreet || !data.addressCity || !data.addressPostalCode) {
      score += 15;
      factors.push('Niekompletny adres');
    }

    // Contact information
    if (!data.email && !data.phone) {
      score += 15;
      factors.push('Brak danych kontaktowych');
    }

    // GUS data verification
    if (!data.gusDataFetched) {
      score += 10;
      factors.push('Dane nie zostały zweryfikowane w bazie GUS');
    }

    // VAT status
    if (data.vatPayer && !data.vatEuValidated && data.vatEu) {
      score += 10;
      factors.push('Numer VAT UE nie został zweryfikowany');
    }

    // Business size indicators
    if (data.employeeCount && data.employeeCount > 250) {
      score -= 5; // Lower risk for larger companies
      factors.push('Duże przedsiębiorstwo');
    }

    // Annual revenue (convert decimal string to number)
    if (data.annualRevenue && parseFloat(data.annualRevenue) < 100000) {
      score += 10;
      factors.push('Niski roczny obrót');
    }

    // Determine risk level
    let level: 'low' | 'medium' | 'high';
    if (score < 30) {
      level = 'low';
    } else if (score < 60) {
      level = 'medium';
    } else {
      level = 'high';
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      level,
      factors,
      assessedAt: new Date(),
    };
  }

  /**
   * Add contact to client
   */
  async addContact(
    data: CreateClientContactInput
  ): Promise<ClientContact> {
    const [contact] = await db
      .insert(clientContacts)
      .values(data)
      .returning();

    return contact;
  }

  /**
   * Create timeline event
   */
  private async createTimelineEvent(data: {
    clientId: string;
    eventType: string;
    title: string;
    description?: string;
    userId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await db.insert(clientTimelineEvents).values({
      ...data,
      eventType: data.eventType as any,
    });
  }

  /**
   * Normalize client data (clean tax identifiers, etc.)
   */
  private normalizeClientData(data: Partial<CreateClientInput | UpdateClientInput>): any {
    const normalized: any = { ...data };

    if (normalized.nip) {
      normalized.nip = cleanNIP(normalized.nip);
    }

    if (normalized.regon) {
      normalized.regon = cleanREGON(normalized.regon);
    }

    if (normalized.email) {
      normalized.email = normalized.email.toLowerCase().trim();
    }

    return normalized;
  }

  /**
   * Check if risk should be reassessed based on changed data
   */
  private shouldReassessRisk(data: Partial<UpdateClientInput>): boolean {
    const riskRelevantFields = [
      'nip',
      'regon',
      'addressStreet',
      'addressCity',
      'email',
      'phone',
      'vatPayer',
      'employeeCount',
      'annualRevenue',
    ];

    return riskRelevantFields.some((field) => field in data);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let clientServiceInstance: ClientService | null = null;

export function getClientService(): ClientService {
  if (!clientServiceInstance) {
    clientServiceInstance = new ClientService();
  }
  return clientServiceInstance;
}
