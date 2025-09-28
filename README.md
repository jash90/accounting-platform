# Accounting Platform

A full-stack accounting platform built with modern technologies and best practices.

## 🚀 Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **TanStack Query** for data fetching and caching
- **Zustand** for state management

### Backend
- **Hono** - Fast, lightweight web framework
- **Drizzle ORM** - Type-safe database toolkit
- **PostgreSQL** - Robust relational database
- **JWT** for authentication
- **bcryptjs** for password hashing

### Development
- **Nx** - Monorepo management
- **TypeScript** - Type safety across the stack
- **ESLint & Prettier** - Code quality and formatting

## 📁 Project Structure

```
accounting-platform/
├── apps/
│   ├── frontend/          # React frontend application
│   └── backend/           # Hono backend API
├── libs/
│   └── shared-types/      # Shared TypeScript types
├── drizzle/               # Database migrations
└── package.json
```

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 13+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd accounting-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your database credentials:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/accounting_platform
   JWT_SECRET=your-super-secret-jwt-key
   PORT=3001
   VITE_API_URL=http://localhost:3001/api
   ```

4. **Set up the database**
   ```bash
   # Generate database migrations
   npm run db:generate
   
   # Run migrations
   npm run db:migrate
   ```

5. **Start the development servers**
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or start them separately
   npm run dev:frontend  # Frontend on http://localhost:4200
   npm run dev:backend   # Backend on http://localhost:3001
   ```

## 🔐 Authentication Features

- **User Registration** - Create new accounts with email validation
- **User Login** - Secure authentication with JWT tokens
- **Password Reset** - Email-based password recovery
- **Protected Routes** - Route protection based on authentication status
- **Persistent Sessions** - User sessions persist across browser refreshes

## 📊 Database Schema

The application includes the following main tables:

- **users** - User account information
- **password_reset_tokens** - Password reset token management
- **email_verification_tokens** - Email verification tokens

## 🚀 Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run dev:frontend` - Start only the frontend
- `npm run dev:backend` - Start only the backend
- `npm run build:all` - Build both applications
- `npm run test` - Run all tests
- `npm run db:generate` - Generate database migrations
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle Studio for database management

## 🏗️ Development

### Adding New Features

1. **Backend API**: Add new routes in `apps/backend/src/routes/`
2. **Frontend Pages**: Add new pages in `apps/frontend/src/pages/`
3. **Shared Types**: Add shared interfaces in `libs/shared-types/src/`
4. **Database**: Update schema in `apps/backend/src/db/schema.ts`

### Code Quality

The project uses ESLint and Prettier for code quality and formatting. Run:

```bash
npx nx lint frontend
npx nx lint backend
```

## 🔧 Configuration

### Frontend Configuration
- Vite config: `apps/frontend/vite.config.ts`
- Tailwind config: `apps/frontend/tailwind.config.js`
- TypeScript config: `apps/frontend/tsconfig.json`

### Backend Configuration
- Drizzle config: `drizzle.config.ts`
- TypeScript config: `apps/backend/tsconfig.json`

## 📝 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/reset-password` - Request password reset
- `POST /api/auth/confirm-reset-password` - Confirm password reset
- `GET /api/auth/me` - Get current user (protected)

### Health Check
- `GET /health` - Server health status

## 🚀 Deployment

### Frontend Deployment
The frontend can be deployed to any static hosting service (Vercel, Netlify, etc.):

```bash
npm run build:all
# Deploy the dist/apps/frontend directory
```

### Backend Deployment
The backend can be deployed to any Node.js hosting service:

```bash
npm run build:all
# Deploy the dist/apps/backend directory
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.