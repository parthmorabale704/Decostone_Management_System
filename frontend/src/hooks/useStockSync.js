import { useEffect } from 'react';
import { subscribeStockUpdated } from '../utils/stockEvents';

/**
 * Custom React hook to automatically trigger a silent refresh/update
 * whenever a stock transaction is confirmed in any component or modal.
 * @param {Function} onUpdate - Callback function called immediately on stock update
 */
export function useStockSync(onUpdate) {
  useEffect(() => {
    if (!onUpdate) return;
    const unsubscribe = subscribeStockUpdated((detail) => {
      onUpdate(detail);
    });
    return unsubscribe;
  }, [onUpdate]);
}
