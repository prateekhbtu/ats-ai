import { useState, useCallback } from 'react';
import { usageApi, type UsageStatus, ApiError } from '../lib/api';

/**
 * Hook for managing AI usage state and paywall visibility.
 * 
 * Use across all AI-powered pages (Editor, CoverLetters, Interview, Writing).
 */
export function useAiUsage() {
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [loading, setLoading] = useState(false);

  /** Fetch current usage status from the API */
  const refreshUsage = useCallback(async () => {
    setLoading(true);
    try {
      const status = await usageApi.getStatus();
      setUsage(status);
      return status;
    } catch {
      // Silently fail — usage tracking is non-critical
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check if an API error is an AI limit exceeded error.
   * If so, show the paywall modal and return true.
   * Otherwise return false (so the caller can handle normal errors).
   */
  const handleAiError = useCallback((err: unknown): boolean => {
    if (err instanceof ApiError && err.code === 'AI_LIMIT_EXCEEDED') {
      // Refresh usage to get latest counts
      refreshUsage();
      setShowPaywall(true);
      return true;
    }
    // Also check generic Error messages from the backend
    if (err instanceof Error && (
      err.message.includes('AI_LIMIT_EXCEEDED') || 
      err.message.includes('free AI request limit')
    )) {
      refreshUsage();
      setShowPaywall(true);
      return true;
    }
    return false;
  }, [refreshUsage]);

  const closePaywall = useCallback(() => {
    setShowPaywall(false);
  }, []);

  return {
    usage,
    showPaywall,
    loading,
    refreshUsage,
    handleAiError,
    closePaywall,
  };
}
