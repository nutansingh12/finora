import { useEffect, useRef } from 'react';
import { usePortfolioStore } from '@/store/portfolioStore';
import { useAuthStore } from '@/store/authStore';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Silently refreshes watchlist stock prices every 5 minutes while the user is logged in.
 * Place this hook once in the Layout so it runs across all pages.
 */
export function useAutoRefresh() {
  const { isAuthenticated } = useAuthStore();
  const silentRefreshStocks = usePortfolioStore((s) => s.silentRefreshStocks);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      silentRefreshStocks();
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAuthenticated, silentRefreshStocks]);
}
