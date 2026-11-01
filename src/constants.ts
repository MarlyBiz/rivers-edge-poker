export const CHIP_DENOMINATIONS = [
  1, 5, 10, 25, 50, 100, 500, 1000, 5000, 10000, 25000, 50000, 100000
];

export const CHIP_COLORS: Record<number, string> = {
  1: "#ffffff",      // White
  5: "#ef4444",      // Red
  10: "#3b82f6",     // Blue
  25: "#10b981",     // Green
  50: "#f59e0b",     // Orange
  100: "#1f2937",    // Black
  500: "#8b5cf6",    // Purple
  1000: "#fcd34d",   // Yellow
  5000: "#ec4899",   // Pink
  10000: "#06b6d4",  // Cyan
  25000: "#78350f",  // Brown
  50000: "#4b5563",  // Grey
  100000: "#111827"  // Deep Black
};

export const getChipLabel = (value: number): string => {
  if (value >= 1000) return `${value / 1000}K`;
  return value.toString();
};
