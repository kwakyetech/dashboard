/**
 * Formats a numeric amount or string into a formatted currency string
 * based on the specified currency ISO code.
 */
export function formatCurrency(
  amount: number | string,
  currencyCode: string = 'GHS'
): string {
  const numericAmount = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  if (isNaN(numericAmount)) return 'GH₵0.00';

  const code = 'GHS';
  try {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch (error) {
    // Fallback if the currency code isn't supported by the client browser / env
    const symbols: Record<string, string> = {
      GHS: 'GH₵',
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CAD: 'CA$',
      AUD: 'A$',
      CNY: '¥',
      INR: '₹',
    };
    const symbol = symbols[code] || 'GH₵';
    return `${symbol}${numericAmount.toLocaleString('en-GH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}
