/**
 * Error Banner Component
 * Displays general (non-field-specific) error messages
 */

import { X, AlertCircle } from 'lucide-react';

export interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  autoDismiss?: boolean;
  autoDismissDelay?: number; // in milliseconds
}

export function ErrorBanner({
  message,
  onDismiss,
  autoDismiss = false,
  autoDismissDelay = 5000,
}: ErrorBannerProps) {
  // Auto-dismiss after delay
  if (autoDismiss && onDismiss) {
    setTimeout(() => {
      onDismiss();
    }, autoDismissDelay);
  }

  return (
    <div className="rounded-md bg-red-50 border border-red-200 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-red-800">{message}</p>
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
                aria-label="Zamknij"
              >
                <span className="sr-only">Zamknij</span>
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
