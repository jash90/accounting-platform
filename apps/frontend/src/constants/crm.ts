/**
 * CRM Constants
 * Polish labels, options, and configuration for CRM module
 */

import type {
  ClientStatus,
  ClientType,
  TaxForm,
  VATRate,
  ContactRole,
  TimelineEventType,
} from '@accounting-platform/shared-types';

// ============================================================================
// Status Labels and Colors
// ============================================================================

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: 'Aktywny',
  inactive: 'Nieaktywny',
  suspended: 'Zawieszony',
  archived: 'Zarchiwizowany',
};

export const CLIENT_STATUS_COLORS: Record<
  ClientStatus,
  { bg: string; text: string; border: string }
> = {
  active: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
  },
  inactive: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-200',
  },
  suspended: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
  },
  archived: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
  },
};

// ============================================================================
// Client Type Labels
// ============================================================================

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  company: 'Spółka',
  sole_proprietor: 'Jednoosobowa działalność gospodarcza',
  individual: 'Osoba fizyczna',
  ngo: 'Organizacja pozarządowa',
  public: 'Instytucja publiczna',
};

// ============================================================================
// Tax Form Labels
// ============================================================================

export const TAX_FORM_LABELS: Record<TaxForm, string> = {
  CIT: 'CIT - Podatek dochodowy od osób prawnych',
  PIT: 'PIT - Podatek dochodowy od osób fizycznych',
  VAT: 'VAT - Podatek od towarów i usług',
  FLAT_TAX: 'Ryczałt ewidencjonowany',
  LUMP_SUM: 'Karta podatkowa',
  TAX_CARD: 'Karta podatkowa',
};

// ============================================================================
// VAT Rate Labels
// ============================================================================

export const VAT_RATE_LABELS: Record<VATRate, string> = {
  '23': '23%',
  '8': '8%',
  '5': '5%',
  '0': '0%',
  EXEMPT: 'Zwolniony',
  NOT_APPLICABLE: 'Nie dotyczy',
};

// ============================================================================
// Contact Role Labels
// ============================================================================

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  owner: 'Właściciel',
  ceo: 'Prezes / Dyrektor',
  cfo: 'Dyrektor finansowy',
  accountant: 'Księgowy',
  assistant: 'Asystent',
  other: 'Inny',
};

// ============================================================================
// Timeline Event Type Labels and Icons
// ============================================================================

export const TIMELINE_EVENT_LABELS: Record<TimelineEventType, string> = {
  created: 'Utworzono',
  updated: 'Zaktualizowano',
  status_changed: 'Zmieniono status',
  note_added: 'Dodano notatkę',
  document_uploaded: 'Przesłano dokument',
  email_sent: 'Wysłano e-mail',
  meeting: 'Spotkanie',
  call: 'Połączenie telefoniczne',
  task_completed: 'Ukończono zadanie',
  payment_received: 'Otrzymano płatność',
};

export const TIMELINE_EVENT_COLORS: Record<TimelineEventType, string> = {
  created: 'bg-blue-500',
  updated: 'bg-gray-500',
  status_changed: 'bg-purple-500',
  note_added: 'bg-yellow-500',
  document_uploaded: 'bg-green-500',
  email_sent: 'bg-indigo-500',
  meeting: 'bg-pink-500',
  call: 'bg-orange-500',
  task_completed: 'bg-teal-500',
  payment_received: 'bg-emerald-500',
};

// ============================================================================
// Risk Level Labels and Colors
// ============================================================================

export const RISK_LEVEL_LABELS = {
  low: 'Niskie',
  medium: 'Średnie',
  high: 'Wysokie',
};

export const RISK_LEVEL_COLORS = {
  low: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
  },
  medium: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
  },
  high: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
  },
};

// ============================================================================
// Polish Provinces (Województwa)
// ============================================================================

export const PROVINCES = [
  { value: 'dolnośląskie', label: 'Dolnośląskie' },
  { value: 'kujawsko-pomorskie', label: 'Kujawsko-Pomorskie' },
  { value: 'lubelskie', label: 'Lubelskie' },
  { value: 'lubuskie', label: 'Lubuskie' },
  { value: 'łódzkie', label: 'Łódzkie' },
  { value: 'małopolskie', label: 'Małopolskie' },
  { value: 'mazowieckie', label: 'Mazowieckie' },
  { value: 'opolskie', label: 'Opolskie' },
  { value: 'podkarpackie', label: 'Podkarpackie' },
  { value: 'podlaskie', label: 'Podlaskie' },
  { value: 'pomorskie', label: 'Pomorskie' },
  { value: 'śląskie', label: 'Śląskie' },
  { value: 'świętokrzyskie', label: 'Świętokrzyskie' },
  { value: 'warmińsko-mazurskie', label: 'Warmińsko-Mazurskie' },
  { value: 'wielkopolskie', label: 'Wielkopolskie' },
  { value: 'zachodniopomorskie', label: 'Zachodniopomorskie' },
];

// ============================================================================
// Form Field Labels
// ============================================================================

export const FIELD_LABELS = {
  // Basic Information
  companyName: 'Nazwa firmy',
  shortName: 'Skrócona nazwa',
  clientType: 'Typ klienta',
  status: 'Status',

  // Tax Identifiers
  nip: 'NIP',
  regon: 'REGON',
  krs: 'KRS',
  pesel: 'PESEL',

  // PKD Codes
  pkdPrimary: 'Główny kod PKD',
  pkdSecondary: 'Dodatkowe kody PKD',

  // EU VAT
  vatEu: 'Numer VAT UE',
  vatEuValidated: 'Zwalidowany VAT UE',

  // Address
  addressStreet: 'Ulica',
  addressCity: 'Miasto',
  addressPostalCode: 'Kod pocztowy',
  addressProvince: 'Województwo',
  addressCountry: 'Kraj',

  // Correspondence Address
  correspondenceStreet: 'Ulica (korespondencyjny)',
  correspondenceCity: 'Miasto (korespondencyjny)',
  correspondencePostalCode: 'Kod pocztowy (korespondencyjny)',
  correspondenceProvince: 'Województwo (korespondencyjne)',
  correspondenceCountry: 'Kraj (korespondencyjny)',

  // Contact
  email: 'E-mail',
  phone: 'Telefon',
  website: 'Strona internetowa',

  // Tax Configuration
  taxForm: 'Forma opodatkowania',
  vatRate: 'Stawka VAT',
  vatPayer: 'Płatnik VAT',
  vatExempt: 'Zwolniony z VAT',
  smallTaxpayer: 'Mały podatnik',

  // ZUS
  zusReportingRequired: 'Wymagana sprawozdawczość ZUS',
  zusNumber: 'Numer ZUS',

  // Tax Office
  taxOffice: 'Urząd skarbowy',
  taxOfficeCode: 'Kod urzędu skarbowego',

  // Business Details
  industry: 'Branża',
  employeeCount: 'Liczba pracowników',
  annualRevenue: 'Roczne przychody',

  // Risk Assessment
  riskScore: 'Wynik ryzyka',
  riskLevel: 'Poziom ryzyka',

  // Custom Fields
  tags: 'Tagi',
  notes: 'Notatki',
  internalNotes: 'Notatki wewnętrzne',

  // Contact Fields
  firstName: 'Imię',
  lastName: 'Nazwisko',
  position: 'Stanowisko',
  department: 'Dział',
  role: 'Rola',
  mobile: 'Telefon komórkowy',
  isPrimary: 'Główny kontakt',
  isActive: 'Aktywny',
  canSign: 'Upoważniony do podpisywania',

  // Dates
  createdAt: 'Data utworzenia',
  updatedAt: 'Data aktualizacji',
  gusDataFetchedAt: 'Dane GUS pobrane',
  lastRiskAssessment: 'Ostatnia ocena ryzyka',
};

// ============================================================================
// Action Labels
// ============================================================================

export const ACTION_LABELS = {
  save: 'Zapisz',
  cancel: 'Anuluj',
  delete: 'Usuń',
  edit: 'Edytuj',
  create: 'Utwórz',
  update: 'Aktualizuj',
  archive: 'Archiwizuj',
  restore: 'Przywróć',
  search: 'Szukaj',
  filter: 'Filtruj',
  export: 'Eksportuj',
  import: 'Importuj',
  close: 'Zamknij',
  back: 'Wstecz',
  next: 'Dalej',
  previous: 'Poprzedni',
  select: 'Wybierz',
  selectAll: 'Zaznacz wszystkie',
  deselectAll: 'Odznacz wszystkie',
  refresh: 'Odśwież',
  add: 'Dodaj',
  remove: 'Usuń',
  view: 'Zobacz',
  download: 'Pobierz',
  upload: 'Prześlij',
  enrichFromGUS: 'Pobierz z GUS',
  validateVAT: 'Waliduj VAT UE',
  newClient: 'Nowy klient',
  newContact: 'Nowy kontakt',
  bulkActions: 'Akcje zbiorcze',
  clearFilters: 'Wyczyść filtry',
};

// ============================================================================
// Table Column Labels
// ============================================================================

export const TABLE_COLUMNS = {
  companyName: 'Nazwa firmy',
  nip: 'NIP',
  status: 'Status',
  taxForm: 'Forma opodatkowania',
  city: 'Miasto',
  assignedUser: 'Przypisany',
  riskLevel: 'Ryzyko',
  createdAt: 'Data utworzenia',
  actions: 'Akcje',
};

// ============================================================================
// Tab Labels
// ============================================================================

export const TAB_LABELS = {
  overview: 'Przegląd',
  contacts: 'Kontakty',
  timeline: 'Historia',
  documents: 'Dokumenty',
  risk: 'Ocena ryzyka',
  financials: 'Finanse',
  settings: 'Ustawienia',
};

// ============================================================================
// Validation Messages
// ============================================================================

export const VALIDATION_MESSAGES = {
  required: 'To pole jest wymagane',
  invalidEmail: 'Nieprawidłowy adres e-mail',
  invalidNIP: 'Nieprawidłowy NIP',
  invalidREGON: 'Nieprawidłowy REGON',
  invalidPESEL: 'Nieprawidłowy PESEL',
  invalidKRS: 'Nieprawidłowy KRS',
  invalidPostalCode: 'Nieprawidłowy kod pocztowy',
  invalidPhone: 'Nieprawidłowy numer telefonu',
  invalidURL: 'Nieprawidłowy adres URL',
  minLength: (min: number) => `Minimalna długość: ${min} znaków`,
  maxLength: (max: number) => `Maksymalna długość: ${max} znaków`,
  atLeastOne: 'Wymagany co najmniej jeden identyfikator podatkowy (NIP, REGON lub KRS)',
};

// ============================================================================
// Pagination
// ============================================================================

export const PAGINATION = {
  itemsPerPage: [10, 20, 50, 100],
  defaultPerPage: 20,
  showing: (from: number, to: number, total: number) =>
    `Wyświetlanie ${from}-${to} z ${total}`,
  page: 'Strona',
  of: 'z',
};

// ============================================================================
// Empty States
// ============================================================================

export const EMPTY_STATES = {
  noClients: 'Brak klientów',
  noClientsDescription: 'Dodaj pierwszego klienta, aby rozpocząć',
  noContacts: 'Brak kontaktów',
  noContactsDescription: 'Dodaj kontakt do tego klienta',
  noTimeline: 'Brak wydarzeń',
  noTimelineDescription: 'Historia działań pojawi się tutaj',
  noDocuments: 'Brak dokumentów',
  noDocumentsDescription: 'Prześlij dokumenty związane z tym klientem',
  noResults: 'Brak wyników',
  noResultsDescription: 'Spróbuj zmienić kryteria wyszukiwania',
};

// ============================================================================
// Sort Options
// ============================================================================

export const SORT_OPTIONS = [
  { value: 'companyName', label: 'Nazwa firmy' },
  { value: 'createdAt', label: 'Data utworzenia' },
  { value: 'updatedAt', label: 'Data aktualizacji' },
  { value: 'status', label: 'Status' },
  { value: 'riskScore', label: 'Wynik ryzyka' },
  { value: 'annualRevenue', label: 'Przychody roczne' },
];

export const SORT_ORDER = {
  asc: 'Rosnąco',
  desc: 'Malejąco',
};
