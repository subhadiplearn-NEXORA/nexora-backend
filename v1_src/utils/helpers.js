/**
 * src/utils/helpers.js
 * Small helper utilities
 */
function currencyFormat(amount) {
  return Number(amount).toFixed(2);
}

module.exports = { currencyFormat };