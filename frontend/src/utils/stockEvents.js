export const STOCK_UPDATED_EVENT = 'decostone:stock-updated';

/**
 * Emit an instant stock update event across the entire frontend.
 * @param {Object} transactionData - Metadata of the completed transaction
 */
export function emitStockUpdated(transactionData) {
  try {
    const event = new CustomEvent(STOCK_UPDATED_EVENT, { detail: transactionData });
    window.dispatchEvent(event);
  } catch (err) {
    console.error('Failed to emit stock updated event:', err);
  }
}

/**
 * Subscribe to real-time stock update events.
 * @param {Function} callback - Handler called when stock changes
 * @returns {Function} unsubscribe function
 */
export function subscribeStockUpdated(callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => {
    try {
      callback(e.detail);
    } catch (err) {
      console.error('Error in stock update listener:', err);
    }
  };
  window.addEventListener(STOCK_UPDATED_EVENT, handler);
  return () => {
    window.removeEventListener(STOCK_UPDATED_EVENT, handler);
  };
}
