/**
 * Invitation Accept Page
 *
 * Page for employees to accept invitations and join companies
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { rbacAPI } from '../../services/rbac-api';
import { useAuthStore } from '../../stores/auth';
import { Building2, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface InvitationDetails {
  id: string;
  email: string;
  companyId: string;
  companyName: string;
  role: 'owner' | 'employee';
  expiresAt: string;
  invitedBy: string;
}

export function InvitationAccept() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    verifyInvitation();
  }, [token]);

  async function verifyInvitation() {
    try {
      setLoading(true);
      const response = await rbacAPI.invitation.verifyInvitation(token!);
      setInvitation(response.invitation);
      setError(null);
    } catch (err) {
      console.error('Failed to verify invitation:', err);
      setError(err instanceof Error ? err.message : 'Invalid or expired invitation');
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptInvitation() {
    if (!token || !isAuthenticated) {
      setError('You must be logged in to accept this invitation');
      return;
    }

    try {
      setAccepting(true);
      const response = await rbacAPI.invitation.acceptInvitation({ token });
      setSuccess(true);
      setError(null);

      // Redirect to company dashboard after 2 seconds
      setTimeout(() => {
        navigate(`/company/${response.companyId}/dashboard`);
      }, 2000);
    } catch (err) {
      console.error('Failed to accept invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <a
              href="/login"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Go to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Aboard!</h2>
            <p className="text-gray-600 mb-4">
              You have successfully joined {invitation?.companyName}.
            </p>
            <p className="text-sm text-gray-500">Redirecting to company dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const expiresAt = invitation ? new Date(invitation.expiresAt) : null;
  const isExpired = expiresAt && expiresAt < new Date();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-8 py-6 text-white">
          <Building2 className="h-12 w-12 mb-3" />
          <h1 className="text-2xl font-bold">Company Invitation</h1>
          <p className="text-blue-100 mt-1">You've been invited to join a company</p>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-6">
          {invitation && (
            <>
              {/* Company Info */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {invitation.companyName}
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Invited Email:</span>
                    <span className="font-medium text-gray-900">{invitation.email}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Role:</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                      {invitation.role}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Expires:</span>
                    <span className={`font-medium ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                      {expiresAt?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expiration Warning */}
              {isExpired && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <Clock className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <p className="text-sm text-red-700">
                        This invitation has expired. Please contact the company owner for a new invitation.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Email Mismatch Warning */}
              {!isExpired && user && invitation.email !== user.email && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        This invitation was sent to <strong>{invitation.email}</strong>, but you are logged in as <strong>{user.email}</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Not Authenticated */}
              {!isAuthenticated && !isExpired && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-blue-400" />
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        Please log in or create an account to accept this invitation.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-8 py-4 bg-gray-50 flex items-center justify-end space-x-3">
          <a
            href="/login"
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Go to Login
          </a>
          {isAuthenticated && !isExpired && (
            <button
              onClick={handleAcceptInvitation}
              disabled={accepting}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {accepting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Accepting...
                </>
              ) : (
                'Accept Invitation'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
