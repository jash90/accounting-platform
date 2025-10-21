#!/bin/bash

# ============================================
# CRM Accounting Platform - Initial Setup Script
# ============================================

echo "🚀 Setting up CRM Accounting Platform..."

# 1. Create project directory and initialize
mkdir accounting-crm-platform
cd accounting-crm-platform

# 2. Initialize monorepo with pnpm
npm install -g pnpm
pnpm init

# 3. Set up workspace configuration
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - apps/*
  - packages/*
EOF

# 4. Create directory structure
mkdir -p apps/web
mkdir -p apps/api  
mkdir -p packages/database
mkdir -p packages/ui
mkdir -p packages/core
mkdir -p packages/types
mkdir -p infrastructure
mkdir -p docs

# 5. Initialize Next.js web app
cd apps/web
pnpm create next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"

# 6. Add essential dependencies for web app
pnpm add @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/auth-ui-react @supabase/auth-ui-shared
pnpm add @tanstack/react-query @tanstack/react-query-devtools
pnpm add zustand immer
pnpm add react-hook-form @hookform/resolvers zod
pnpm add date-fns date-fns-tz
pnpm add recharts
pnpm add lucide-react
pnpm add sonner
pnpm add -D @types/node

# 7. Install shadcn/ui
pnpm dlx shadcn-ui@latest init -y

# 8. Add shadcn components we'll need
pnpm dlx shadcn-ui@latest add alert alert-dialog badge button calendar card checkbox command dialog dropdown-menu form input label navigation-menu popover select separator sheet table tabs textarea toast

cd ../..

# 9. Initialize API backend
cd apps/api
pnpm init
pnpm add express cors helmet morgan compression dotenv
pnpm add @trpc/server @trpc/client
pnpm add @prisma/client prisma
pnpm add ioredis bullmq
pnpm add jsonwebtoken argon2
pnpm add zod
pnpm add winston
pnpm add -D @types/node @types/express @types/cors @types/jsonwebtoken
pnpm add -ันD typescript ts-node nodemon tsx

# Create basic API structure
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

cd ../..

# 10. Set up shared database package
cd packages/database
pnpm init
pnpm add @prisma/client prisma
pnpm add zod

# Initialize Prisma
pnpm dlx prisma init

# Create Prisma schema
cat > prisma/schema.prisma << 'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Organizations (Tenants)
model Organization {
  id        String   @id @default(cuid())
  name      String
  nip       String?  @unique
  regon     String?
  plan      Plan     @default(STARTER)
  settings  Json     @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  users     User[]
  clients   Client[]
  documents Document[]
  tasks     Task[]
}

// Users
model User {
  id             String    @id @default(cuid())
  email          String    @unique
  passwordHash   String
  firstName      String
  lastName       String
  role           UserRole  @default(USER)
  emailVerified  Boolean   @default(false)
  mfaEnabled     Boolean   @default(false)
  mfaSecret      String?
  lastLoginAt    DateTime?
  failedAttempts Int       @default(0)
  lockedUntil    DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  sessions       Session[]
  activities     ActivityLog[]
  assignedTasks  Task[]
}

// Sessions
model Session {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token        String   @unique
  refreshToken String   @unique
  ipAddress    String?
  userAgent    String?
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  lastActivity DateTime @default(now())
}

// Clients
model Client {
  id             String   @id @default(cuid())
  name           String
  nip            String?
  regon          String?
  vatNumber      String?
  email          String?
  phone          String?
  address        Json?
  taxSettings    Json     @default("{}")
  customFields   Json     @default("{}")
  status         ClientStatus @default(ACTIVE)
  tags           String[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  
  documents      Document[]
  tasks          Task[]
  invoices       Invoice[]
}

// Documents
model Document {
  id           String   @id @default(cuid())
  filename     String
  mimeType     String
  size         Int
  url          String
  category     String?
  extractedData Json?
  tags         String[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  clientId     String?
  client       Client?  @relation(fields: [clientId], references: [id])
  
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
}

// Tasks
model Task {
  id          String   @id @default(cuid())
  title       String
  description String?
  dueDate     DateTime?
  priority    Priority @default(MEDIUM)
  status      TaskStatus @default(TODO)
  recurring   Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  completedAt DateTime?
  
  assigneeId  String?
  assignee    User?    @relation(fields: [assigneeId], references: [id])
  
  clientId    String?
  client      Client?  @relation(fields: [clientId], references: [id])
  
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
}

// Invoices
model Invoice {
  id            String   @id @default(cuid())
  invoiceNumber String
  issueDate     DateTime
  dueDate       DateTime
  items         Json
  totalNet      Decimal  @db.Decimal(10, 2)
  totalVat      Decimal  @db.Decimal(10, 2)
  totalGross    Decimal  @db.Decimal(10, 2)
  currency      String   @default("PLN")
  status        InvoiceStatus @default(DRAFT)
  paidAt        DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  clientId      String
  client        Client   @relation(fields: [clientId], references: [id])
}

// Activity Logs
model ActivityLog {
  id        String   @id @default(cuid())
  action    String
  entity    String
  entityId  String
  oldValue  Json?
  newValue  Json?
  metadata  Json?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  
  userId    String
  user      User     @relation(fields: [userId], references: [id])
}

// Enums
enum Plan {
  STARTER
  PROFESSIONAL
  BUSINESS
  ENTERPRISE
}

enum UserRole {
  SUPER_ADMIN
  ADMIN
  ACCOUNTANT
  ASSISTANT
  CLIENT
  USER
}

enum ClientStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  ARCHIVED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  ON_HOLD
  COMPLETED
  CANCELLED
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  PARTIALLY_PAID
  OVERDUE
  CANCELLED
}
EOF

cd ../..

# 11. Set up shared UI package
cd packages/ui
pnpm init
pnpm add react react-dom
pnpm add class-variance-authority clsx tailwind-merge
pnpm add -D @types/react @types/react-dom typescript

cd ../..

# 12. Set up shared types package
cd packages/types
pnpm init
pnpm add zod
pnpm add -D typescript

cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

cd ../..

# 13. Create root configuration files

# Root package.json scripts
cat > package.json << 'EOF'
{
  "name": "accounting-crm-platform",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "pnpm run --parallel dev",
    "dev:web": "pnpm --filter web dev",
    "dev:api": "pnpm --filter api dev",
    "build": "pnpm run --recursive build",
    "test": "pnpm run --recursive test",
    "lint": "pnpm run --recursive lint",
    "db:push": "pnpm --filter database db:push",
    "db:migrate": "pnpm --filter database db:migrate",
    "db:studio": "pnpm --filter database db:studio",
    "clean": "pnpm run --recursive clean && rm -rf node_modules",
    "install:all": "pnpm install"
  }
}
EOF

# Environment variables template
cat > .env.example << 'EOF'
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/accounting_crm"
DIRECT_URL="postgresql://user:password@localhost:5432/accounting_crm"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Secrets
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"

# External APIs
GUS_API_KEY=""
VIES_API_URL="https://ec.europa.eu/taxation_customs/vies/services/checkVatService"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="noreply@accounting-crm.pl"

# Storage
STORAGE_BUCKET="documents"
STORAGE_REGION="eu-central-1"

# AI Services (optional for now)
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""

# Monitoring (optional for now)
SENTRY_DSN=""

# Environment
NODE_ENV="development"
EOF

# Docker Compose for local development
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: accounting_postgres
    environment:
      POSTGRES_USER: accounting_user
      POSTGRES_PASSWORD: accounting_pass
      POSTGRES_DB: accounting_crm
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: accounting_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  mailhog:
    image: mailhog/mailhog
    container_name: accounting_mailhog
    ports:
      - "1025:1025"
      - "8025:8025"

volumes:
  postgres_data:
  redis_data:
EOF

# Git ignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output

# Next.js
.next/
out/
build/
dist/

# Production
*.production

# Misc
.DS_Store
*.pem
.idea/
.vscode/

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Local env files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo

# Prisma
migrations/
EOF

# 14. Initialize git repository
git init
git add .
git commit -m "Initial commit: CRM Accounting Platform setup"

# 15. Final setup instructions
cat << 'EOF'

✅ Initial setup complete!

📝 Next steps:

1. Copy .env.example to .env and fill in your credentials:
   cp .env.example .env

2. Start the database services:
   docker-compose up -d

3. Push the database schema:
   pnpm db:push

4. Install all dependencies:
   pnpm install:all

5. Start development servers:
   pnpm dev

📂 Project structure created:
   accounting-crm-platform/
   ├── apps/
   │   ├── web/          # Next.js frontend
   │   └── api/          # Node.js backend
   ├── packages/
   │   ├── database/     # Prisma schemas
   │   ├── ui/          # Shared components
   │   ├── core/        # Business logic
   │   └── types/       # TypeScript types
   └── infrastructure/  # Docker & configs

🚀 Ready to build your accounting CRM platform!

EOF

echo "✨ Setup script completed successfully!"