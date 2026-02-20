/**
 * Calculate order commission (1% of product price)
 * @param {number} productPrice - Product price
 * @returns {number} Commission amount (rounded)
 */
function calculateCommission(productPrice) {
  const commission = (productPrice * 1) / 100;
  return Math.round(commission * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate commission for multiple products
 * @param {Array} items - Array of {price, quantity}
 * @returns {number} Total commission (rounded)
 */
function calculateTotalCommission(items) {
  let totalCommission = 0;
  items.forEach(item => {
    const itemTotal = item.price * item.quantity;
    totalCommission += calculateCommission(itemTotal);
  });
  return Math.round(totalCommission * 100) / 100; // Round to 2 decimal places
}

/**
 * Round price to 2 decimal places
 * @param {number} price - Price to round
 * @returns {number} Rounded price
 */
function roundPrice(price) {
  return Math.round(price * 100) / 100;
}

module.exports = {
  calculateCommission,
  calculateTotalCommission,
  roundPrice,
  ORDER_COMMISSION_PERCENTAGE: 1
};

