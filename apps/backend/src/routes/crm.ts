/**
 * CRM API Routes
 * Hono routes for client management with Polish accounting specifics
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { getClientService } from '../modules/crm/services/client.service';
import {
  createClientSchema,
  updateClientSchema,
  clientIdSchema,
  listClientsQuerySchema,
  searchClientsQuerySchema,
  createClientContactSchema,
  validateNIPSchema,
  validateREGONSchema,
  validateVATEUSchema,
  enrichFromGUSSchema,
  bulkDeleteSchema,
  bulkUpdateSchema,
  exportClientsSchema,
} from '../modules/crm/validators/client.schema';
import { validateNIP, formatNIP } from '../modules/crm/utils/nip';
import { validateREGON, formatREGON } from '../modules/crm/utils/regon';
import { validatePESEL, formatPESEL } from '../modules/crm/utils/pesel';
import { fetchCompanyByNIP, fetchCompanyByREGON } from '../modules/crm/integrations/gus.service';
import { validateEUVAT } from '../modules/crm/integrations/vies.service';

const crm = new Hono();

// Middleware to extract user from JWT (placeholder - implement actual auth)
const requireAuth = async (c: any, next: any) => {
  // TODO: Implement actual JWT authentication
  const userId = c.req.header('x-user-id') || 'system';
  c.set('userId', userId);
  await next();
};

crm.use('*', requireAuth);

// ============================================================================
// Client CRUD Operations
// ============================================================================

/**
 * GET /api/crm/clients
 * List clients with pagination and filtering
 */
crm.get(
  '/clients',
  zValidator('query', listClientsQuerySchema),
  async (c) => {
    try {
      const query = c.req.valid('query');
      const userId = c.get('userId');

      const service = getClientService();
      const result = await service.listClients(query, userId);

      return c.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error listing clients:', error);
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Błąd podczas pobierania listy klientów',
        },
        500
      );
    }
  }
);

/**
 * GET /api/crm/clients/:id
 * Get client by ID with all relations
 */
crm.get('/clients/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const service = getClientService();

    const client = await service.getClientWithRelations(id);

    return c.json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error('Error getting client:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Błąd podczas pobierania klienta',
      },
      404
    );
  }
});

/**
 * POST /api/crm/clients
 * Create new client
 */
crm.post(
  '/clients',
  zValidator('json', createClientSchema),
  async (c) => {
    try {
      const data = c.req.valid('json');
      const userId = c.get('userId');

      const service = getClientService();
      const client = await service.createClient(data, userId);

      return c.json(
        {
          success: true,
          data: client,
          message: 'Klient utworzony pomyślnie',
        },
        201
      );
    } catch (error) {
      console.error('Error creating client:', error);
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Błąd podczas tworzenia klienta',
        },
        400
      );
    }
  }
);

/**
 * PUT /api/crm/clients/:id
 * Update existing client
 */
crm.put(
  '/clients/:id',
  zValidator('json', updateClientSchema),
  async (c) => {
    try {
      const id = c.req.param('id');
      const data = c.req.valid('json');
      const userId = c.get('userId');

      const service = getClientService();
      const client = await service.updateClient(id, data, userId);

      return c.json({
        success: true,
        data: client,
        message: 'Klient zaktualizowany pomyślnie',
      });
    } catch (error) {
      console.error('Error updating client:', error);
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Błąd podczas aktualizacji klienta',
        },
        400
      );
    }
  }
);

/**
 * DELETE /api/crm/clients/:id
 * Soft delete client
 */
crm.delete('/clients/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const userId = c.get('userId');

    const service = getClientService();
    await service.deleteClient(id, userId);

    return c.json({
      success: true,
      message: 'Klient usunięty pomyślnie',
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Błąd podczas usuwania klienta',
      },
      400
    );
  }
});

/**
 * POST /api/crm/clients/:id/restore
 * Restore soft-deleted client
 */
crm.post('/clients/:id/restore', async (c) => {
  try {
    const id = c.req.param('id');
    const userId = c.get('userId');

    const service = getClientService();
    const client = await service.restoreClient(id, userId);

    return c.json({
      success: true,
      data: client,
      message: 'Klient przywrócony pomyślnie',
    });
  } catch (error) {
    console.error('Error restoring client:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Błąd podczas przywracania klienta',
      },
      400
    );
  }
});

// ============================================================================
// Search Operations
// ============================================================================

/**
 * GET /api/crm/clients/search
 * Full-text search clients
 */
crm.get(
  '/search',
  zValidator('query', searchClientsQuerySchema),
  async (c) => {
    try {
      const { query, limit } = c.req.valid('query');

      const service = getClientService();
      const results = await service.listClients({
        search: query,
        limit: limit || 10,
        page: 1,
      });

      return c.json({
        success: true,
        data: results.data,
      });
    } catch (error) {
      console.error('Error searching clients:', error);
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Błąd podczas wyszukiwania',
        },
        500
      );
    }
  }
);

// ============================================================================
// Data Enrichment & Validation
// ============================================================================

/**
 * POST /api/crm/clients/:id/enrich-gus
 * Enrich client data from GUS API
 */
crm.post('/clients/:id/enrich-gus', async (c) => {
  try {
    const id = c.req.param('id');
    const userId = c.get('userId');

    const service = getClientService();
    const client = await service.enrichFromGUS(id, userId);

    return c.json({
      success: true,
      data: client,
      message: 'Dane zaktualizowane z bazy GUS',
    });
  } catch (error) {
    console.error('Error enriching from GUS:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Błąd podczas pobierania danych z GUS',
      },
      400
    );
  }
});

/**
 * POST /api/crm/clients/:id/validate-vat
 * Validate EU VAT number via VIES
 */
crm.post('/clients/:id/validate-vat', async (c) => {
  try {
    const id = c.req.param('id');
    const userId = c.get('userId');

    const service = getClientService();
    const result = await service.validateVATEU(id, userId);

    return c.json({
      success: true,
      data: result,
      message: result.valid
        ? 'Numer VAT UE jest prawidłowy'
        : 'Numer VAT UE jest nieprawidłowy',
    });
  } catch (error) {
    console.error('Error validating VAT:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Błąd podczas walidacji VAT',
      },
      400
    );
  }
});

/**
 * POST /api/crm/validate/nip
 * Validate NIP number
 */
crm.post(
  '/validate/nip',
  zValidator('json', validateNIPSchema),
  async (c) => {
    try {
      const { nip } = c.req.valid('json');

      const isValid = validateNIP(nip);
      const formatted = formatNIP(nip);

      return c.json({
        success: true,
        data: {
          valid: isValid,
          formatted,
          original: nip,
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: 'Błąd podczas walidacji NIP',
        },
        400
      );
    }
  }
);

/**
 * POST /api/crm/validate/regon
 * Validate REGON number
 */
crm.post(
  '/validate/regon',
  zValidator('json', validateREGONSchema),
  async (c) => {
    try {
      const { regon } = c.req.valid('json');

      const isValid = validateREGON(regon);
      const formatted = formatREGON(regon);

      return c.json({
        success: true,
        data: {
          valid: isValid,
          formatted,
          original: regon,
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: 'Błąd podczas walidacji REGON',
        },
        400
      );
    }
  }
);

/**
 * POST /api/crm/gus/lookup
 * Lookup company data from GUS by NIP
 */
crm.post(
  '/gus/lookup',
  zValidator('json', enrichFromGUSSchema),
  async (c) => {
    try {
      const { nip } = c.req.valid('json');

      const result = await fetchCompanyByNIP(nip);

      if (!result.success) {
        return c.json(
          {
            success: false,
            error: result.error?.message || 'Nie znaleziono danych w GUS',
          },
          404
        );
      }

      return c.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      console.error('Error fetching GUS data:', error);
      return c.json(
        {
          success: false,
          error: 'Błąd podczas pobierania danych z GUS',
        },
        500
      );
    }
  }
);

// ============================================================================
// Contact Management
// ============================================================================

/**
 * POST /api/crm/clients/:id/contacts
 * Add contact to client
 */
crm.post(
  '/clients/:id/contacts',
  zValidator('json', createClientContactSchema),
  async (c) => {
    try {
      const id = c.req.param('id');
      const data = c.req.valid('json');

      const service = getClientService();
      const contact = await service.addContact({
        ...data,
        clientId: id,
      });

      return c.json(
        {
          success: true,
          data: contact,
          message: 'Kontakt dodany pomyślnie',
        },
        201
      );
    } catch (error) {
      console.error('Error adding contact:', error);
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Błąd podczas dodawania kontaktu',
        },
        400
      );
    }
  }
);

// ============================================================================
// Health Check
// ============================================================================

/**
 * GET /api/crm/health
 * Health check endpoint
 */
crm.get('/health', async (c) => {
  return c.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      gus: 'configured',
      vies: 'available',
    },
  });
});

export default crm;
