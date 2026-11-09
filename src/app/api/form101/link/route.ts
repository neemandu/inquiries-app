import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveEmployerForCurrentUser } from '@/lib/server/employer';
import { createForm101Token } from '@/lib/form101/token';
import { SUPPORTED_TAX_YEARS, isSupportedTaxYear } from '@/lib/form101/years';

// Signed-in employers create a personal Form 101 link for a new employee.
// The employer details for section א are fixed into the signed link.
const bodySchema = z.object({
  employerRecordId: z.string().trim().optional(),
  address: z.string().trim().min(3, 'נא להזין את כתובת המעסיק').max(80),
  phone: z.string().trim().min(7, 'נא להזין את טלפון המעסיק').max(20),
  deductionsFile: z.string().trim().regex(/^9\d{8}$/, 'מספר תיק ניכויים הוא 9 ספרות שמתחילות ב-9'),
  taxYear: z.number({ required_error: 'נא לבחור שנת מס' }).int().refine(isSupportedTaxYear, `טופס 101 זמין לשנות המס: ${SUPPORTED_TAX_YEARS.join(', ')}`),
});

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const employer = await resolveEmployerForCurrentUser(parsed.data.employerRecordId);
    if (!employer) {
      return NextResponse.json({ success: false, message: 'לא נמצא מעסיק עבור המשתמש' }, { status: 403 });
    }
    const { token, payload } = createForm101Token(
      {
        recordId: employer.recordId,
        name: employer.name,
        address: parsed.data.address,
        phone: parsed.data.phone,
        deductionsFile: parsed.data.deductionsFile,
      },
      parsed.data.taxYear
    );
    const url = new URL(`/form101?t=${token}`, request.url).toString();
    return NextResponse.json({ success: true, url, expiresAt: new Date(payload.exp * 1000).toISOString() });
  } catch (error) {
    console.error('Form 101 link error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
