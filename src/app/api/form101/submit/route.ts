import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyForm101Token } from '@/lib/form101/token';
import { form101Schema } from '@/lib/form101/schema';
import { generateForm101Pdf } from '@/lib/form101/pdf';
import { DocumentFile, uploadEmployerDocuments } from '@/lib/server/documents';
import { isSupportedTaxYear } from '@/lib/form101/years';

// Vercel rejects request bodies over 4.5 MB, so attachments are capped below that
const MAX_ATTACHMENTS_BASE64 = 3_500_000;

const bodySchema = z.object({
  token: z.string(),
  data: z.unknown(),
  attachments: z
    .array(
      z.object({
        fileName: z.string().trim().min(1).max(120),
        contentType: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp']),
        file: z.string().regex(/^[A-Za-z0-9+/=]+$/),
      })
    )
    .max(10),
});

// Public route (see middleware): the employee submits Form 101 through their personal link.
// The filled official form and the attachments are saved with the employer's documents.
export async function POST(request: Request) {
  try {
    const body = bodySchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ success: false, message: 'בקשה לא תקינה' }, { status: 400 });
    }
    const link = verifyForm101Token(body.data.token);
    if (!link) {
      return NextResponse.json({ success: false, message: 'הקישור אינו תקף או שפג תוקפו' }, { status: 401 });
    }
    if (!isSupportedTaxYear(link.taxYear)) {
      return NextResponse.json({ success: false, message: `טופס 101 לשנת ${link.taxYear} אינו זמין כעת` }, { status: 409 });
    }
    const attachmentsSize = body.data.attachments.reduce((sum, a) => sum + a.file.length, 0);
    if (attachmentsSize > MAX_ATTACHMENTS_BASE64) {
      return NextResponse.json({ success: false, message: 'הקבצים המצורפים גדולים מדי' }, { status: 413 });
    }

    // The tax year comes from the signed link, not from the browser
    const parsed = form101Schema.safeParse({ ...(body.data.data as object), taxYear: link.taxYear });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'יש שדות חסרים או שגויים בטופס', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const pdf = await generateForm101Pdf(parsed.data, link.employer);
    const pdfBase64 = Buffer.from(pdf).toString('base64');
    const { firstName, lastName, idNumber, passportNumber } = parsed.data.employee;
    const files: DocumentFile[] = [
      {
        contentType: 'application/pdf',
        fileName: `טופס 101 ${link.taxYear} - ${firstName} ${lastName}.pdf`,
        file: pdfBase64,
      },
      ...body.data.attachments,
    ];
    await uploadEmployerDocuments({
      employerId: link.employer.recordId,
      fileType: '101',
      remarks: `טופס 101 לשנת ${link.taxYear} - ${firstName} ${lastName} (${idNumber || passportNumber})`,
      files,
    });

    // The employee keeps a copy of what they submitted
    return NextResponse.json({ success: true, pdf: pdfBase64 });
  } catch (error) {
    console.error('Form 101 submit error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
