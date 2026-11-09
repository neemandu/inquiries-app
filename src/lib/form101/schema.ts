import { z } from 'zod';

// Data for the Israeli Tax Authority Form 101 (כרטיס עובד), sections א–י.
// Field rules follow "נספח א' - הוראות בדבר אופן מילוי השדות בטופס 101" where they apply.

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'נא להזין תאריך');
const optionalIsoDate = isoDate.optional().or(z.literal('').transform(() => undefined));
const text = (max: number) => z.string().trim().max(max);
const requiredText = (max: number, message: string) => z.string().trim().min(1, message).max(max);

// Israeli ID check digit (Luhn-like algorithm used by the Population Authority)
export function isValidIsraeliId(value: string) {
  const id = value.trim();
  if (!/^\d{5,9}$/.test(id)) return false;
  const padded = id.padStart(9, '0');
  const sum = [...padded].reduce((acc, digit, i) => {
    const n = Number(digit) * ((i % 2) + 1);
    return acc + (n > 9 ? n - 9 : n);
  }, 0);
  return sum % 10 === 0;
}

const israeliId = z.string().trim().refine(isValidIsraeliId, 'מספר זהות לא תקין');

export const INCOME_TYPES = ['monthly', 'additional', 'partial', 'daily', 'pension', 'scholarship'] as const;
export const INCOME_TYPE_LABELS: Record<(typeof INCOME_TYPES)[number], string> = {
  monthly: 'משכורת חודש',
  additional: 'משכורת בעד משרה נוספת',
  partial: 'משכורת חלקית',
  daily: 'שכר עבודה (עובד יומי)',
  pension: 'קצבה',
  scholarship: 'מלגה',
};

export const MARITAL_STATUSES = ['single', 'married', 'divorced', 'widowed', 'separated'] as const;
export const MARITAL_STATUS_LABELS: Record<(typeof MARITAL_STATUSES)[number], string> = {
  single: 'רווק/ה',
  married: 'נשוי/אה',
  divorced: 'גרוש/ה',
  widowed: 'אלמן/ה',
  separated: 'פרוד/ה',
};

const childSchema = z.object({
  name: requiredText(60, 'נא להזין את שם הילד'),
  idNumber: israeliId,
  birthDate: isoDate,
  inCustody: z.boolean(),
  receivesAllowance: z.boolean(),
});

const childCountsSchema = z.object({
  born: z.number().int().min(0).max(20),
  age1to2: z.number().int().min(0).max(20),
  age3: z.number().int().min(0).max(20),
  age4to5: z.number().int().min(0).max(20),
  age6to17: z.number().int().min(0).max(20),
  age18: z.number().int().min(0).max(20),
});

const otherIncomeSchema = z.object({
  payer: requiredText(60, 'נא להזין את שם המעסיק/המשלם'),
  address: text(80),
  deductionsFile: text(12),
  incomeType: text(20),
  monthlyIncome: text(12),
  taxWithheld: text(12),
});

export const form101Schema = z
  .object({
    taxYear: z.number().int().min(2024).max(2100),

    // ב. פרטי העובד/ת
    employee: z.object({
      hasIsraeliId: z.boolean(),
      idNumber: z.string().trim().optional(),
      passportNumber: z.string().trim().max(20).optional(),
      lastName: requiredText(40, 'נא להזין שם משפחה'),
      firstName: requiredText(40, 'נא להזין שם פרטי'),
      birthDate: isoDate,
      aliyaDate: optionalIsoDate,
      street: requiredText(60, 'נא להזין רחוב/שכונה'),
      houseNumber: requiredText(10, 'נא להזין מספר בית'),
      city: requiredText(40, 'נא להזין עיר/ישוב'),
      zip: text(10).optional(),
      phone: text(20).optional(),
      mobile: text(20).optional(),
      email: z.string().trim().email('כתובת דואר אלקטרוני לא תקינה').max(80).optional().or(z.literal('')),
      gender: z.enum(['male', 'female'], { errorMap: () => ({ message: 'נא לבחור מין' }) }),
      maritalStatus: z.enum(MARITAL_STATUSES, { errorMap: () => ({ message: 'נא לבחור מצב משפחתי' }) }),
      israeliResident: z.boolean(),
      kibbutz: z.enum(['no', 'yes-transferred', 'yes-not-transferred']),
      healthFund: z.object({ member: z.boolean().nullable(), name: text(30).optional() }),
    }).superRefine((employee, ctx) => {
      if (employee.hasIsraeliId) {
        if (!employee.idNumber || !isValidIsraeliId(employee.idNumber)) {
          ctx.addIssue({ code: 'custom', path: ['idNumber'], message: 'מספר זהות לא תקין' });
        }
      } else if (!employee.passportNumber) {
        ctx.addIssue({ code: 'custom', path: ['passportNumber'], message: 'נא להזין מספר דרכון' });
      }
      if (!employee.phone && !employee.mobile) {
        ctx.addIssue({ code: 'custom', path: ['mobile'], message: 'נא להזין מספר טלפון או טלפון נייד' });
      }
      if (employee.healthFund.member && !employee.healthFund.name) {
        ctx.addIssue({ code: 'custom', path: ['healthFund', 'name'], message: 'נא לציין את שם קופת החולים' });
      }
    }),

    // ג. ילדים שבשנת המס טרם מלאו להם 19
    children: z.array(childSchema).max(13, "בטופס יש מקום ל-13 ילדים"),

    // ד. הכנסה ממעסיק זה
    income: z.object({ type: z.enum(INCOME_TYPES), startDate: isoDate }),

    // ה. הכנסות אחרות
    otherIncome: z.object({
      has: z.boolean(),
      types: z.array(z.enum(INCOME_TYPES)),
      creditPoints: z.enum(['here', 'other']).nullable(),
      noStudyFund: z.boolean(),
      noPension: z.boolean(),
    }).superRefine((otherIncome, ctx) => {
      if (otherIncome.has && otherIncome.types.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['types'], message: 'נא לסמן את סוג ההכנסה האחרת' });
      }
      if (otherIncome.has && !otherIncome.creditPoints) {
        ctx.addIssue({ code: 'custom', path: ['creditPoints'], message: 'נא לבחור היכן לקבל נקודות זיכוי' });
      }
    }),

    // ו. בן/בת הזוג
    spouse: z
      .object({
        idNumber: z.string().trim().optional(),
        passportNumber: z.string().trim().max(20).optional(),
        lastName: requiredText(40, 'נא להזין שם משפחה של בן/בת הזוג'),
        firstName: requiredText(40, 'נא להזין שם פרטי של בן/בת הזוג'),
        birthDate: isoDate,
        aliyaDate: optionalIsoDate,
        hasIncome: z.boolean(),
        incomeFromWork: z.boolean(),
        incomeOther: z.boolean(),
      })
      .superRefine((spouse, ctx) => {
        if (!spouse.idNumber && !spouse.passportNumber) {
          ctx.addIssue({ code: 'custom', path: ['idNumber'], message: 'נא להזין מספר זהות או דרכון של בן/בת הזוג' });
        } else if (spouse.idNumber && !isValidIsraeliId(spouse.idNumber)) {
          ctx.addIssue({ code: 'custom', path: ['idNumber'], message: 'מספר זהות לא תקין' });
        }
      })
      .nullable(),

    // ז. שינויים במהלך השנה
    changes: z
      .array(z.object({ date: isoDate, description: requiredText(80, 'נא לתאר את השינוי'), notifiedDate: isoDate }))
      .max(3),

    // ח. בקשה לפטור או זיכוי ממס
    reliefs: z.object({
      disabled: z.boolean(),
      disabledAllowance: z.boolean(),
      settlement: z.object({ from: isoDate, name: requiredText(40, 'נא להזין את שם הישוב') }).nullable(),
      newImmigrant: z.object({ from: isoDate, noIncomeUntil: optionalIsoDate }).nullable(),
      spouseNoIncome: z.boolean(),
      singleParentFamily: z.boolean(),
      childrenInCustody: childCountsSchema.nullable(),
      childrenOther: childCountsSchema.omit({ age18: true }).nullable(),
      singleParent: z.boolean(),
      childrenNotInCustody: z.boolean(),
      disabledChildren: z.number().int().min(1).max(20).nullable(),
      alimony: z.boolean(),
      age16to18: z.boolean(),
      dischargedSoldier: z.object({ start: isoDate, end: isoDate }).nullable(),
      academicDegree: z.boolean(),
      reserveCombatDays: z.number().int().min(1).max(365).nullable(),
    }).superRefine((reliefs, ctx) => {
      if (reliefs.disabledAllowance && !reliefs.disabled) {
        ctx.addIssue({ code: 'custom', path: ['disabledAllowance'], message: 'סעיף 2ב מותנה בסימון סעיף 2א' });
      }
    }),

    // ט. בקשה לתיאום מס
    taxCoordination: z.object({
      reason: z.enum(['none', 'no-income-until-start', 'other-incomes', 'assessor-approval']),
      otherIncomes: z.array(otherIncomeSchema).max(3),
    }).superRefine((coordination, ctx) => {
      if (coordination.reason === 'other-incomes' && coordination.otherIncomes.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['otherIncomes'], message: 'נא לפרט את ההכנסות הנוספות' });
      }
    }),

    // י. הצהרה
    // A plain refinement (not z.literal) so an unconfirmed declaration doesn't stop the cross-section checks below
    declaration: z.object({ accepted: z.boolean().refine((accepted) => accepted, 'יש לאשר את ההצהרה'), date: isoDate }),
    // PNG data URL of the drawn signature
    signature: z
      .string()
      .regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, 'נא לחתום על הטופס')
      .max(400_000, 'החתימה גדולה מדי'),
  })
  // Rules are attached to each section so a wizard step is validated even while later sections are still empty
  .superRefine((data, ctx) => {
    // Without an Israeli ID the form doesn't allow filling in children (נספח א')
    if (!data.employee.hasIsraeliId && data.children.length) {
      ctx.addIssue({ code: 'custom', path: ['children'], message: 'עובד ללא מספר זהות אינו ממלא את פרטי הילדים' });
    }
    // Section ג lists only children who haven't turned 19 during the tax year
    data.children.forEach((child, i) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(child.birthDate)) return;
      const path = ['children', i, 'birthDate'];
      if (child.birthDate > `${data.taxYear}-12-31`) {
        ctx.addIssue({ code: 'custom', path, message: `תאריך הלידה מאוחר משנת המס ${data.taxYear}` });
      } else if (data.taxYear - Number(child.birthDate.slice(0, 4)) >= 19) {
        ctx.addIssue({ code: 'custom', path, message: `בטופס מפרטים רק ילדים שטרם מלאו להם 19 בשנת המס ${data.taxYear}` });
      }
    });
  });

export type Form101Data = z.infer<typeof form101Schema>;
export type Form101Child = Form101Data['children'][number];
export type Form101ChildCounts = z.infer<typeof childCountsSchema>;
export type Form101OtherIncome = Form101Data['taxCoordination']['otherIncomes'][number];

// Employer details for section א, fixed when the employer creates the employee's link
export interface Form101Employer {
  recordId: string;
  name: string;
  address: string;
  phone: string;
  deductionsFile: string;
}
