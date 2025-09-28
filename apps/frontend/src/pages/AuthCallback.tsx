import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

export function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const provider = params.get('provider');
    const error = params.get('error');

    if (token) {
      // Store token and fetch user info
      localStorage.setItem('auth-token', token);
      fetchUserInfo(token);
    } else if (error) {
      // Redirect to login with error
      navigate(`/login?error=${error}&provider=${provider}`);
    } else {
      // No token or error, redirect to login
      navigate('/login');
    }
  }, [location, navigate]);

  const fetchUserInfo = async (token: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.user) {
        login(data.user, token);
        navigate('/dashboard');
      } else {
        navigate('/login?error=failed_to_get_user');
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      navigate('/login?error=failed_to_get_user');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}