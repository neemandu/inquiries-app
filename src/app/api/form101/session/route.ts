import { NextResponse } from 'next/server';
import { verifyForm101Token } from '@/lib/form101/token';
import { isSupportedTaxYear } from '@/lib/form101/years';

// Public route (see middleware): tells the employee's wizard which employer and tax year the link is for
export async function GET(request: Request) {
  const payload = verifyForm101Token(new URL(request.url).searchParams.get('t'));
  if (!payload) {
    return NextResponse.json({ success: false, message: 'הקישור אינו תקף או שפג תוקפו' }, { status: 401 });
  }
  if (!isSupportedTaxYear(payload.taxYear)) {
    return NextResponse.json({ success: false, message: `טופס 101 לשנת ${payload.taxYear} אינו זמין כעת. נא לפנות למעסיק.` }, { status: 409 });
  }
  return NextResponse.json({
    success: true,
    employerName: payload.employer.name,
    taxYear: payload.taxYear,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    linkId: payload.jti,
  });
}
