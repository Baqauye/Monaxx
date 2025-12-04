// utils.ts
export const formatCompactNumber = (num: number): string => {
  if (num === undefined || num === null || isNaN(num)) return '0';

  // Handle very small numbers (no compact notation needed, just precision)
  if (Math.abs(num) < 1000 && Math.abs(num) > 0.001) {
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  const formatter = Intl.NumberFormat('en-US', {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 2,
  });

  return formatter.format(num).toLowerCase();
};
