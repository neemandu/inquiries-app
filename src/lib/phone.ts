// Israeli numbers (05X-XXXXXXX) are converted to E.164; numbers starting with + are kept as-is
export function toE164(input: string) {
  const digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('972')) return `+${digits}`;
  return `+972${digits.replace(/^0/, '')}`;
}

export function isValidPhone(input: string) {
  return /^\+\d{9,15}$/.test(toE164(input));
}
