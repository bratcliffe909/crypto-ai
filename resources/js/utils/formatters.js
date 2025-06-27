// Formatting utilities

export const formatPrice = (price) => {
  if (price === null || price === undefined) return '-';
  
  if (price < 0.01) {
    return `$${price.toFixed(8)}`.replace(/\.?0+$/, '');
  } else if (price < 1) {
    return `$${price.toFixed(4)}`;
  } else if (price < 100) {
    return `$${price.toFixed(2)}`;
  } else {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  }
};

export const formatPercentage = (percentage) => {
  if (percentage === null || percentage === undefined) return '-';
  
  const formatted = percentage.toFixed(2);
  if (percentage > 0) {
    return `+${formatted}%`;
  }
  return `${formatted}%`;
};

export const formatMarketCap = (marketCap) => {
  if (!marketCap) return '-';
  
  if (marketCap >= 1e12) {
    return `$${(marketCap / 1e12).toFixed(2)}T`;
  } else if (marketCap >= 1e9) {
    return `$${(marketCap / 1e9).toFixed(2)}B`;
  } else if (marketCap >= 1e6) {
    return `$${(marketCap / 1e6).toFixed(2)}M`;
  } else if (marketCap >= 1e3) {
    return `$${(marketCap / 1e3).toFixed(2)}K`;
  }
  return `$${marketCap}`;
};

export const formatNumber = (num) => {
  if (!num) return '-';
  
  return new Intl.NumberFormat('en-US').format(num);
};

export const formatDate = (date) => {
  if (!date) return '-';
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
};
