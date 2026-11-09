import 'server-only';
import { currentUser } from '@clerk/nextjs/server';
import { isAdminEmail } from '@/lib/admin';

const EMPLOYER_BY_EMAIL_URL =
  'https://7k7a7oe9rl.execute-api.eu-west-2.amazonaws.com/default/getMonthlyEmployeesDataByEmployeeId';
const INQUIRIES_URL = 'https://kt08aagomj.execute-api.eu-west-2.amazonaws.com/default/getInquires';

// Resolves the employer the signed-in user acts for on the server, instead of trusting the browser.
// Admins may pick any employer; everyone else gets the employer linked to their own email.
export async function resolveEmployerForCurrentUser(requestedRecordId?: string) {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;
  if (!email) return null;

  let recordId: string | undefined;
  if (isAdminEmail(email) && requestedRecordId) {
    recordId = requestedRecordId;
  } else {
    const response = await fetch(`${EMPLOYER_BY_EMAIL_URL}?email=${encodeURIComponent(email)}`);
    if (!response.ok) throw new Error(`Employer lookup failed with status: ${response.status}`);
    recordId = (await response.json())?.recordId;
  }
  if (!recordId) return null;

  // The employer's display name comes with its inquiries data (the response may contain raw line breaks)
  const inquiries = await fetch(`${INQUIRIES_URL}?recordId=${encodeURIComponent(recordId)}`);
  const raw = inquiries.ok ? await inquiries.text() : '';
  let name = '';
  try {
    name = String(JSON.parse(raw.replace(/[\r\n]+/g, ' '))?.employer ?? '').trim();
  } catch {
    name = '';
  }
  return { recordId, name };
}
