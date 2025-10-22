import {
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth';
import { AppLayout } from '../components/layout/AppLayout';
import { Login } from '../pages/Login';
import { Signup } from '../pages/Signup';
import { ForgotPassword } from '../pages/ForgotPassword';
import { ResetPassword } from '../pages/ResetPassword';
import { Dashboard } from '../pages/Dashboard';
import { AuthCallback } from '../pages/AuthCallback';
import { Invoices } from '../pages/Invoices';
import { Expenses } from '../pages/Expenses';
import { Clients } from '../pages/Clients';
import { Reports } from '../pages/Reports';
import { Settings } from '../pages/Settings';
import { SuperAdminGuard, CompanyOwnerGuard, CompanyMemberGuard } from '../components/guards/RoleGuards';
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { UserManagement } from '../pages/admin/UserManagement';
import { CompanyManagement } from '../pages/admin/CompanyManagement';
import { CompanyDashboard } from '../pages/company/CompanyDashboard';
import { InvitationAccept } from '../pages/invitation/InvitationAccept';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          }
        />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/invitation/accept" element={<InvitationAccept />} />

        {/* SuperAdmin Routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <SuperAdminGuard>
                <AppLayout />
              </SuperAdminGuard>
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="companies" element={<CompanyManagement />} />
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
        </Route>

        {/* Company Routes */}
        <Route
          path="/company/:companyId/*"
          element={
            <ProtectedRoute>
              <CompanyMemberGuard>
                <AppLayout />
              </CompanyMemberGuard>
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<CompanyDashboard />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* General Protected Routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </QueryClientProvider>
  );
}

export default App;
