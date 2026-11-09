// Tax years with an official Form 101 edition loaded (see FORM_EDITIONS in pdf.ts).
// Shared by the browser and the server, so it holds no form files itself.
export const SUPPORTED_TAX_YEARS = [2026];

export const isSupportedTaxYear = (year: number) => SUPPORTED_TAX_YEARS.includes(year);

// The year a new employee's form is most likely for: from December on, hires usually start in the next
// tax year. It may not be supported yet — callers must not quietly fall back to an older edition.
export function expectedTaxYear(now = new Date()) {
  return now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
}
