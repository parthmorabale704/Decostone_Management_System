import React from 'react';

export function StockBadge({ status, quantity, minStock, unit = '' }) {
  let badgeClass = 'badge-in-stock';
  let label = 'In Stock';

  if (status === 'OUT_OF_STOCK' || quantity === 0) {
    badgeClass = 'badge-out-of-stock';
    label = 'Out of Stock';
  } else if (status === 'LOW_STOCK' || (minStock !== undefined && Number(quantity) <= Number(minStock))) {
    badgeClass = 'badge-low-stock';
    label = 'Low Stock';
  }

  return (
    <span className={`badge ${badgeClass}`}>
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: 'currentColor',
          display: 'inline-block'
        }}
      />
      {label} {quantity !== undefined ? `(${quantity} ${unit})` : ''}
    </span>
  );
}

export default StockBadge;
