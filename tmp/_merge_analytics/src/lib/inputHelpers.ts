/**
 * Sanitizes numeric input by removing non-digits and leading zeros
 * @param s - Input string
 * @returns Sanitized numeric string
 */
export const sanitizeNumber = (s: string) =>
  s.replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");

/**
 * Handles numeric input formatting to remove leading zeros
 * @param e - React change event from input
 * @param setter - State setter function
 */
export function handleNumericInput(e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) {
  const cleaned = sanitizeNumber(e.target.value);
  setter(cleaned);
}
