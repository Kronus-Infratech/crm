/**
 * Format currency in Indian Style (INR)
 * Example: 100000 -> ₹1,00,000
 * @param {number} amount
 * @returns {string}
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

/**
 * Format numbers in Indian style without currency symbol
 * Example: 100000 -> 1,00,000
 * @param {number} value
 * @returns {string}
 */
export const formatNumber = (value) => {
  return new Intl.NumberFormat('en-IN').format(value || 0);
};
