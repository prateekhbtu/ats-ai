/**
 * GoogleSignInButton – Shows Google's branded popup and exchanges the
 * credential (id_token) with our backend via AuthContext.googleLogin().
 */
import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Props {
  variant?: 'signin' | 'signup';
  redirectTo?: string;
  onError?: (message: string) => void;
}

export function GoogleSignInButton({
  variant = 'signin',
  redirectTo = '/dashboard',
  onError,
}: Props) {
  const { googleLogin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      onError?.('Google did not return a credential. Please try again.');
      return;
    }
    setLoading(true);
    try {
      await googleLogin(credentialResponse.credential);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <button
        disabled
        className="w-full bg-white border border-gray-300 text-gray-400 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-3 cursor-not-allowed opacity-60 shadow-sm"
      >
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Signing in with Google...
      </button>
    );
  }

  return (
    <div className="w-full [&>div]:w-full [&>div>div]:w-full [&_iframe]:w-full">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() =>
          onError?.('Google sign-in was cancelled or failed. Please try again.')
        }
        useOneTap={false}
        text={variant === 'signup' ? 'signup_with' : 'signin_with'}
        shape="rectangular"
        theme="outline"
        logo_alignment="left"
        width={400}
      />
    </div>
  );
}
