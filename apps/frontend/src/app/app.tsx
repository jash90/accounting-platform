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
import { AIAgentDashboard } from '../pages/ai-agents/AIAgentDashboard';
import { AgentChat } from '../pages/ai-agents/AgentChat';
import { KnowledgeBase } from '../pages/ai-agents/KnowledgeBase';
import { AgentAnalytics } from '../pages/ai-agents/AgentAnalytics';
import { AgentSettings } from '../pages/ai-agents/AgentSettings';

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
          <Route path="/ai-agents" element={<AIAgentDashboard />} />
          <Route path="/ai-agents/chat/:agentId?" element={<AgentChat />} />
          <Route path="/ai-agents/knowledge" element={<KnowledgeBase />} />
          <Route path="/ai-agents/analytics" element={<AgentAnalytics />} />
          <Route path="/ai-agents/settings" element={<AgentSettings />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </QueryClientProvider>
  );
}

export default App;
