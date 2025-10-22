export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ConfirmResetPasswordRequest {
  token: string;
  password: string;
}

export interface ApiError {
  error: string;
}

// ============================================================================
// CRM MODULE TYPES
// ============================================================================

export type ClientStatus = 'active' | 'inactive' | 'suspended' | 'archived';
export type ClientType = 'company' | 'sole_proprietor' | 'individual' | 'ngo' | 'public';
export type TaxForm = 'CIT' | 'PIT' | 'VAT' | 'FLAT_TAX' | 'LUMP_SUM' | 'TAX_CARD';
export type VATRate = '23' | '8' | '5' | '0' | 'EXEMPT' | 'NOT_APPLICABLE';
export type ContactRole = 'owner' | 'ceo' | 'cfo' | 'accountant' | 'assistant' | 'other';
export type TimelineEventType = 'created' | 'updated' | 'status_changed' | 'note_added' | 'document_uploaded' | 'email_sent' | 'meeting' | 'call' | 'task_completed' | 'payment_received';

export interface Client {
  id: string;
  companyName: string;
  shortName?: string | null;
  clientType: ClientType;
  status: ClientStatus;

  // Polish Tax Identifiers
  nip?: string | null;
  regon?: string | null;
  krs?: string | null;
  pesel?: string | null;

  // PKD Codes
  pkdPrimary?: string | null;
  pkdSecondary?: string[];

  // EU VAT
  vatEu?: string | null;
  vatEuValidated?: boolean | null;
  vatEuValidatedAt?: string | null;

  // Address
  addressStreet?: string | null;
  addressCity?: string | null;
  addressPostalCode?: string | null;
  addressProvince?: string | null;
  addressCountry?: string | null;

  // Correspondence Address
  correspondenceStreet?: string | null;
  correspondenceCity?: string | null;
  correspondencePostalCode?: string | null;
  correspondenceProvince?: string | null;
  correspondenceCountry?: string | null;

  // Contact
  email?: string | null;
  phone?: string | null;
  website?: string | null;

  // Tax Configuration
  taxForm?: TaxForm | null;
  vatRate?: VATRate | null;
  vatPayer?: boolean | null;
  vatExempt?: boolean | null;
  smallTaxpayer?: boolean | null;

  // ZUS
  zusReportingRequired?: boolean | null;
  zusNumber?: string | null;

  // Tax Office
  taxOffice?: string | null;
  taxOfficeCode?: string | null;

  // Business Details
  industry?: string | null;
  employeeCount?: number | null;
  annualRevenue?: string | null;

  // Risk Assessment
  riskScore?: number | null;
  riskLevel?: string | null;
  riskFactors?: string[];
  lastRiskAssessment?: string | null;

  // GUS Data
  gusDataFetched?: boolean | null;
  gusDataFetchedAt?: string | null;
  gusData?: Record<string, any> | null;

  // Custom Fields
  customFields?: Record<string, any>;
  tags?: string[];
  notes?: string | null;
  internalNotes?: string | null;

  // Relationships
  assignedUserId?: string | null;

  // Audit
  version?: number | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientContact {
  id: string;
  clientId: string;
  firstName: string;
  lastName: string;
  position?: string | null;
  department?: string | null;
  role?: ContactRole | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  isPrimary?: boolean | null;
  isActive?: boolean | null;
  canSign?: boolean | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientTimelineEvent {
  id: string;
  clientId: string;
  eventType: TimelineEventType;
  title: string;
  description?: string | null;
  metadata?: Record<string, any>;
  userId?: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface ClientDocument {
  id: string;
  clientId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  filePath: string;
  category?: string | null;
  tags?: string[];
  description?: string | null;
  metadata?: Record<string, any>;
  uploadedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientValidationHistory {
  id: string;
  clientId: string;
  validationType: string;
  isValid: boolean;
  validationData?: Record<string, any> | null;
  errorMessage?: string | null;
  validatedBy?: string | null;
  validatedAt: string;
}

// CRM API Request/Response Types
export interface CreateClientRequest {
  companyName: string;
  shortName?: string;
  clientType: ClientType;
  nip?: string;
  regon?: string;
  email?: string;
  phone?: string;
  addressCity?: string;
  addressStreet?: string;
  addressPostalCode?: string;
  taxForm?: TaxForm;
  // ... add other optional fields as needed
}

export interface UpdateClientRequest {
  companyName?: string;
  status?: ClientStatus;
  email?: string;
  phone?: string;
  notes?: string;
  // ... add other updatable fields as needed
}

export interface ListClientsQuery {
  page?: number;
  limit?: number;
  status?: ClientStatus;
  search?: string;
  assignedUserId?: string;
  clientType?: ClientType;
}

export interface ClientsListResponse {
  success: boolean;
  data: Client[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ClientDetailResponse {
  success: boolean;
  data: Client & {
    contacts?: ClientContact[];
    timeline?: ClientTimelineEvent[];
    documents?: ClientDocument[];
  };
}

export interface ValidationResponse {
  success: boolean;
  valid: boolean;
  data?: any;
  error?: string;
}
