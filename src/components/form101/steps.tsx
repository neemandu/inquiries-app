'use client';

import { Plus, Trash2 } from 'lucide-react';
import {
  Form101ChildCounts,
  INCOME_TYPES,
  INCOME_TYPE_LABELS,
  MARITAL_STATUSES,
  MARITAL_STATUS_LABELS,
} from '@/lib/form101/schema';
import { Form101Draft } from '@/components/form101/draft';
import { Card, Checkbox, Choice, DateField, Field, Note, NumberInput, SecondaryButton, TextField } from '@/components/form101/fields';

export type Update = (mutate: (draft: Form101Draft) => void) => void;
interface StepProps {
  draft: Form101Draft;
  update: Update;
  errors: Record<string, string>;
}

const YES_NO = [
  { value: 'yes', label: 'כן' },
  { value: 'no', label: 'לא' },
] as const;
const yesNo = (value: boolean | null) => (value === null ? null : value ? 'yes' : 'no');

// ---- Step 1: intro ----
export function IntroStep({ employerName, taxYear }: { employerName: string; taxYear: number }) {
  const items = [
    ['פרטים אישיים ופרטי קשר', 'תעודת זהות כולל ספח, כתובת וטלפון'],
    ['פרטי בן/בת הזוג והילדים', 'מספרי זהות ותאריכי לידה'],
    ['הכנסות נוספות', 'שם המעסיק/המשלם, מספר תיק ניכויים והכנסה חודשית'],
    ['מסמכים להקלות במס', 'לפי הצורך: תעודת עולה, אישור ישוב מזכה, תעודת שחרור ועוד'],
  ];
  return (
    <>
      <Card title="ברוכים הבאים לתהליך הקליטה">
        <p className="text-[16px] leading-[1.5] text-black">
          {employerName ? `${employerName} מבקש/ת` : 'המעסיק מבקש/ת'} שתמלא/י טופס 101 (כרטיס עובד) לשנת המס {taxYear}.
          הטופס נדרש כדי שהמעסיק יחשב נכון את המס שלך ויעניק לך את ההקלות שמגיעות לך.
        </p>
      </Card>
      <Card title="מה נדרש להכין מראש?">
        <ol className="flex flex-col gap-3">
          {items.map(([title, detail], i) => (
            <li key={title} className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center bg-[#1e3465] text-[14px] font-bold text-white">{i + 1}</span>
              <span className="flex flex-col">
                <span className="font-semibold text-[#0f1a33]">{title}</span>
                <span className="text-[14px] text-[#6b7280]">{detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </Card>
      <Note>אפשר לשמור את הטיוטה ולהמשיך מאותו מכשיר מאוחר יותר. הקישור אישי – אין להעביר אותו לאחרים.</Note>
    </>
  );
}

// ---- Step 2: ב. פרטי העובד/ת ----
export function PersonalStep({ draft, update, errors }: StepProps) {
  const { employee } = draft;
  const set = <K extends keyof Form101Draft['employee']>(key: K, value: Form101Draft['employee'][K]) =>
    update((d) => {
      d.employee[key] = value;
    });
  return (
    <>
      <Note>אנא ודא/י כי השמות תואמים בדיוק את הרישום בתעודת הזהות למניעת עיכובים בדיווחי השכר.</Note>
      <Card>
        <Choice
          label="האם יש לך מספר תעודת זהות ישראלית?"
          required
          options={[...YES_NO]}
          value={yesNo(employee.hasIsraeliId)}
          onChange={(v) => set('hasIsraeliId', v === 'yes')}
        />
        {employee.hasIsraeliId ? (
          <TextField label="מספר תעודת זהות (9 ספרות)" hint="כולל ספרת ביקורת" required inputMode="numeric" maxLength={9}
            value={employee.idNumber} onChange={(v) => set('idNumber', v.replace(/\D/g, ''))} error={errors['employee.idNumber']} />
        ) : (
          <TextField label="מספר דרכון" required value={employee.passportNumber} onChange={(v) => set('passportNumber', v)}
            error={errors['employee.passportNumber']} />
        )}
        <TextField label="שם משפחה" required value={employee.lastName} onChange={(v) => set('lastName', v)} error={errors['employee.lastName']} />
        <TextField label="שם פרטי" required value={employee.firstName} onChange={(v) => set('firstName', v)} error={errors['employee.firstName']} />
        <DateField label="תאריך לידה" required value={employee.birthDate} onChange={(v) => set('birthDate', v)} error={errors['employee.birthDate']} />
        {employee.hasIsraeliId && (
          <DateField label="תאריך עלייה" hint="אם רלוונטי" value={employee.aliyaDate} onChange={(v) => set('aliyaDate', v)} />
        )}
      </Card>
      <Card title="כתובת ופרטי קשר">
        <TextField label="רחוב/שכונה" required value={employee.street} onChange={(v) => set('street', v)} error={errors['employee.street']} />
        <div className="flex gap-3">
          <TextField label="מספר" required value={employee.houseNumber} onChange={(v) => set('houseNumber', v)} error={errors['employee.houseNumber']} />
          <TextField label="מיקוד" inputMode="numeric" value={employee.zip} onChange={(v) => set('zip', v.replace(/\D/g, ''))} />
        </div>
        <TextField label="עיר/ישוב" required value={employee.city} onChange={(v) => set('city', v)} error={errors['employee.city']} />
        <TextField label="מספר טלפון נייד" type="tel" inputMode="tel" dir="ltr" value={employee.mobile} onChange={(v) => set('mobile', v)}
          error={errors['employee.mobile']} />
        <TextField label="מספר טלפון נוסף" type="tel" inputMode="tel" dir="ltr" value={employee.phone} onChange={(v) => set('phone', v)} />
        <TextField label="כתובת דואר אלקטרוני" type="email" inputMode="email" dir="ltr" value={employee.email} onChange={(v) => set('email', v)}
          error={errors['employee.email']} />
      </Card>
      <Card title="פרטים נוספים">
        <Choice label="מין" required value={employee.gender} onChange={(v) => set('gender', v)} error={errors['employee.gender']}
          options={[{ value: 'male', label: 'זכר' }, { value: 'female', label: 'נקבה' }]} />
        <Choice label="מצב משפחתי" required value={employee.maritalStatus} error={errors['employee.maritalStatus']}
          options={MARITAL_STATUSES.map((value) => ({ value, label: MARITAL_STATUS_LABELS[value] }))}
          onChange={(v) =>
            update((d) => {
              d.employee.maritalStatus = v;
              if (v === 'married' && !d.spouse) {
                d.spouse = { idNumber: '', passportNumber: '', lastName: '', firstName: '', birthDate: '', aliyaDate: '', hasIncome: false, incomeFromWork: false, incomeOther: false };
              }
            })
          } />
        {employee.maritalStatus === 'separated' && <Note>מצב פרוד/ה מחייב צירוף אישור פקיד השומה בשלב האחרון.</Note>}
        {employee.hasIsraeliId && (
          <>
            <Choice label="תושב/ת ישראל" required options={[...YES_NO]} value={yesNo(employee.israeliResident)}
              onChange={(v) => set('israeliResident', v === 'yes')} />
            <Choice label="חבר/ת קיבוץ/מושב שיתופי" required value={employee.kibbutz} onChange={(v) => set('kibbutz', v)}
              options={[
                { value: 'no', label: 'לא' },
                { value: 'yes-transferred', label: 'כן, הכנסותיי מועברות לקיבוץ' },
                { value: 'yes-not-transferred', label: 'כן, הכנסותיי אינן מועברות' },
              ]} />
          </>
        )}
        <Choice label="חבר/ה בקופת חולים" options={[...YES_NO]} value={yesNo(employee.healthFund.member)}
          onChange={(v) => update((d) => { d.employee.healthFund.member = v === 'yes'; })} />
        {employee.healthFund.member && (
          <TextField label="שם הקופה" required value={employee.healthFund.name}
            onChange={(v) => update((d) => { d.employee.healthFund.name = v; })} error={errors['employee.healthFund.name']} />
        )}
      </Card>
    </>
  );
}

// ---- Step 3: ד. הכנסה ממעסיק זה + ה. הכנסות אחרות ----
export function IncomeStep({ draft, update, errors }: StepProps) {
  const { income, otherIncome } = draft;
  const toggleType = (type: (typeof INCOME_TYPES)[number], checked: boolean) =>
    update((d) => {
      d.otherIncome.types = checked ? [...d.otherIncome.types, type] : d.otherIncome.types.filter((t) => t !== type);
    });
  return (
    <>
      <Card title="הכנסה ממעסיק זה">
        <Choice label="אני מקבל/ת" required value={income.type} onChange={(v) => update((d) => { d.income.type = v; })}
          options={INCOME_TYPES.map((value) => ({ value, label: INCOME_TYPE_LABELS[value] }))} />
        <DateField label="תאריך תחילת העבודה בשנת המס" required value={income.startDate}
          onChange={(v) => update((d) => { d.income.startDate = v; })} error={errors['income.startDate']} />
      </Card>
      <Card title="הכנסות אחרות">
        <Choice label="האם יש לך הכנסות נוספות ממשכורת, קצבה או מלגה?" required value={yesNo(otherIncome.has)}
          options={[{ value: 'no', label: 'אין לי הכנסות אחרות' }, { value: 'yes', label: 'יש לי הכנסות אחרות' }]}
          onChange={(v) => update((d) => { d.otherIncome.has = v === 'yes'; })} />
        {otherIncome.has && (
          <>
            <Field label="סוג ההכנסה האחרת" required error={errors['otherIncome.types']}>
              <div className="flex flex-col gap-2">
                {INCOME_TYPES.map((type) => (
                  <Checkbox key={type} checked={otherIncome.types.includes(type)} onChange={(c) => toggleType(type, c)}>
                    {INCOME_TYPE_LABELS[type]}
                  </Checkbox>
                ))}
              </div>
            </Field>
            <Choice label="נקודות זיכוי ומדרגות מס" required value={otherIncome.creditPoints} error={errors['otherIncome.creditPoints']}
              onChange={(v) => update((d) => { d.otherIncome.creditPoints = v; })}
              options={[
                { value: 'here', label: 'אבקש לקבל אותן כנגד הכנסה זו' },
                { value: 'other', label: 'אני מקבל/ת אותן בהכנסה האחרת' },
              ]} />
            <Checkbox checked={otherIncome.noStudyFund} onChange={(c) => update((d) => { d.otherIncome.noStudyFund = c; })}>
              אין מפרישים עבורי לקרן השתלמות בגין הכנסתי האחרת, או שכל הפרשות המעסיק לקרן השתלמות מצורפות להכנסתי האחרת
            </Checkbox>
            <Checkbox checked={otherIncome.noPension} onChange={(c) => update((d) => { d.otherIncome.noPension = c; })}>
              אין מפרישים עבורי לקצבה/לביטוח אובדן כושר עבודה/פיצויים בגין הכנסתי האחרת, או שכל ההפרשות מצורפות להכנסתי האחרת
            </Checkbox>
          </>
        )}
      </Card>
    </>
  );
}

// ---- Step 4: ג. ילדים + ו. בן/בת הזוג ----
export function FamilyStep({ draft, update, errors }: StepProps) {
  const { children, spouse, employee } = draft;
  return (
    <>
      {employee.hasIsraeliId ? (
        <Card title="ילדים שבשנת המס טרם מלאו להם 19">
          {children.length === 0 && <p className="text-[15px] text-[#6b7280]">לא נוספו ילדים.</p>}
          {children.map((child, i) => (
            <div key={i} className="flex flex-col gap-3 border-b border-[#eaeef6] pb-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#1e3465]">ילד/ה {i + 1}</span>
                <button type="button" aria-label={`הסרת ילד/ה ${i + 1}`} className="text-red-600"
                  onClick={() => update((d) => { d.children.splice(i, 1); })}>
                  <Trash2 className="size-5" />
                </button>
              </div>
              <TextField label="שם" required value={child.name} error={errors[`children.${i}.name`]}
                onChange={(v) => update((d) => { d.children[i].name = v; })} />
              <TextField label="מספר זהות" required inputMode="numeric" maxLength={9} value={child.idNumber} error={errors[`children.${i}.idNumber`]}
                onChange={(v) => update((d) => { d.children[i].idNumber = v.replace(/\D/g, ''); })} />
              <DateField label="תאריך לידה" required value={child.birthDate} error={errors[`children.${i}.birthDate`]}
                onChange={(v) => update((d) => { d.children[i].birthDate = v; })} />
              <Checkbox checked={child.inCustody} onChange={(c) => update((d) => { d.children[i].inCustody = c; })}>
                הילד/ה נמצא/ת בחזקתי
              </Checkbox>
              <Checkbox checked={child.receivesAllowance} onChange={(c) => update((d) => { d.children[i].receivesAllowance = c; })}>
                אני מקבל/ת בגינו/ה קצבת ילדים מביטוח לאומי
              </Checkbox>
            </div>
          ))}
          {children.length < 13 && (
            <SecondaryButton
              onClick={() => update((d) => {
                d.children.push({ name: '', idNumber: '', birthDate: '', inCustody: true, receivesAllowance: false });
              })}
            >
              <Plus className="size-4" /> הוספת ילד/ה
            </SecondaryButton>
          )}
          {errors.children && <span className="text-sm text-red-600">{errors.children}</span>}
        </Card>
      ) : (
        <Note>עובד/ת ללא מספר תעודת זהות ישראלית אינו/ה ממלא/ת את פרטי הילדים בטופס.</Note>
      )}

      {spouse ? (
        <Card title="פרטים על בן/בת הזוג">
          <TextField label="מספר זהות" hint="או מספר דרכון למטה" inputMode="numeric" maxLength={9} value={spouse.idNumber} error={errors['spouse.idNumber']}
            onChange={(v) => update((d) => { d.spouse!.idNumber = v.replace(/\D/g, ''); })} />
          <TextField label="מספר דרכון" hint="למי שאין מספר זהות" value={spouse.passportNumber}
            onChange={(v) => update((d) => { d.spouse!.passportNumber = v; })} />
          <TextField label="שם משפחה" required value={spouse.lastName} error={errors['spouse.lastName']}
            onChange={(v) => update((d) => { d.spouse!.lastName = v; })} />
          <TextField label="שם פרטי" required value={spouse.firstName} error={errors['spouse.firstName']}
            onChange={(v) => update((d) => { d.spouse!.firstName = v; })} />
          <DateField label="תאריך לידה" required value={spouse.birthDate} error={errors['spouse.birthDate']}
            onChange={(v) => update((d) => { d.spouse!.birthDate = v; })} />
          <DateField label="תאריך עלייה" hint="אם רלוונטי" value={spouse.aliyaDate}
            onChange={(v) => update((d) => { d.spouse!.aliyaDate = v; })} />
          <Choice label="הכנסות בן/בת הזוג" required value={yesNo(spouse.hasIncome)}
            options={[{ value: 'no', label: 'אין לבן/בת הזוג כל הכנסה' }, { value: 'yes', label: 'יש לבן/בת הזוג הכנסה' }]}
            onChange={(v) => update((d) => { d.spouse!.hasIncome = v === 'yes'; })} />
          {spouse.hasIncome && (
            <>
              <Checkbox checked={spouse.incomeFromWork} onChange={(c) => update((d) => { d.spouse!.incomeFromWork = c; })}>
                עבודה/קצבה/עסק
              </Checkbox>
              <Checkbox checked={spouse.incomeOther} onChange={(c) => update((d) => { d.spouse!.incomeOther = c; })}>
                הכנסה אחרת
              </Checkbox>
            </>
          )}
        </Card>
      ) : (
        <Note>פרטי בן/בת הזוג נדרשים רק למי שסימן/ה &quot;נשוי/אה&quot; בשלב הפרטים האישיים.</Note>
      )}
    </>
  );
}

// ---- Step 5: ח. פטור/זיכוי ממס + ט. תיאום מס + ז. שינויים ----
const COUNT_LABELS: [keyof Form101ChildCounts, string][] = [
  ['born', 'שנולדו בשנת המס'],
  ['age1to2', 'שימלאו להם שנה אחת עד שנתיים'],
  ['age3', 'שימלאו להם 3 שנים'],
  ['age4to5', 'שימלאו להם 4 עד 5 שנים'],
  ['age6to17', 'שימלאו להם 6 עד 17 שנים'],
  ['age18', 'שימלאו להם 18 שנים'],
];
const emptyCounts = () => ({ born: 0, age1to2: 0, age3: 0, age4to5: 0, age6to17: 0, age18: 0 });

function ChildCounts({ counts, keys, onChange }: {
  counts: Form101ChildCounts | Omit<Form101ChildCounts, 'age18'>;
  keys: (keyof Form101ChildCounts)[];
  onChange: (key: keyof Form101ChildCounts, value: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 pr-8">
      {COUNT_LABELS.filter(([key]) => keys.includes(key)).map(([key, label]) => (
        <div key={key} className="flex items-center gap-3">
          <span className="flex-1 text-[15px] text-[#0f1a33]">מספר ילדים {label}</span>
          <div className="w-16">
            <NumberInput aria-label={`מספר ילדים ${label}`} max={20} value={(counts as Form101ChildCounts)[key] ?? 0}
              onChange={(v) => onChange(key, v ?? 0)} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReliefsStep({ draft, update, errors }: StepProps) {
  const { reliefs, taxCoordination, changes } = draft;
  const flag = (key: 'disabled' | 'disabledAllowance' | 'spouseNoIncome' | 'singleParentFamily' | 'singleParent' | 'childrenNotInCustody' | 'alimony' | 'age16to18' | 'academicDegree') =>
    (checked: boolean) => update((d) => { d.reliefs[key] = checked; });
  return (
    <>
      <Note>סמן/י רק סעיפים שחלים עליך. לחלק מההקלות יש לצרף אישור – אפשר לצרף אותו בשלב הבא.</Note>
      <Card title="בקשה לפטור או זיכוי ממס">
        <Checkbox checked={reliefs.disabled} onChange={flag('disabled')}>
          אני נכה 100% / עיוור/ת לצמיתות (מצורף אישור משרד הביטחון/האוצר/פקיד השומה/תעודת עיוור)
        </Checkbox>
        {reliefs.disabled && (
          <div className="pr-8">
            <Checkbox checked={reliefs.disabledAllowance} onChange={flag('disabledAllowance')} error={errors['reliefs.disabledAllowance']}>
              בנוסף, אני מקבל/ת תגמול חודשי לפי חוק הנכים או חוק התגמולים לנפגעי פעולות איבה
            </Checkbox>
          </div>
        )}
        <Checkbox checked={!!reliefs.settlement}
          onChange={(c) => update((d) => { d.reliefs.settlement = c ? { from: '', name: '' } : null; })}>
          אני תושב/ת קבוע/ה בישוב מזכה ואין לי &quot;מרכז חיים&quot; נוסף (מצורף אישור הרשות על גבי טופס 1312א)
        </Checkbox>
        {reliefs.settlement && (
          <div className="flex flex-col gap-3 pr-8">
            <TextField label="שם הישוב" required value={reliefs.settlement.name} error={errors['reliefs.settlement.name']}
              onChange={(v) => update((d) => { d.reliefs.settlement!.name = v; })} />
            <DateField label="מתאריך" required value={reliefs.settlement.from} error={errors['reliefs.settlement.from']}
              onChange={(v) => update((d) => { d.reliefs.settlement!.from = v; })} />
          </div>
        )}
        <Checkbox checked={!!reliefs.newImmigrant}
          onChange={(c) => update((d) => { d.reliefs.newImmigrant = c ? { from: '', noIncomeUntil: '' } : null; })}>
          אני עולה חדש/ה או תושב/ת חוזר/ת (חובה לצרף תעודת עולה)
        </Checkbox>
        {reliefs.newImmigrant && (
          <div className="flex flex-col gap-3 pr-8">
            <DateField label="מתאריך" required value={reliefs.newImmigrant.from} error={errors['reliefs.newImmigrant.from']}
              onChange={(v) => update((d) => { d.reliefs.newImmigrant!.from = v; })} />
            <DateField label="לא הייתה לי הכנסה בישראל מתחילת שנת המס עד תאריך" value={reliefs.newImmigrant.noIncomeUntil}
              onChange={(v) => update((d) => { d.reliefs.newImmigrant!.noIncomeUntil = v; })} />
          </div>
        )}
        <Checkbox checked={reliefs.spouseNoIncome} onChange={flag('spouseNoIncome')}>
          בגין בן/בת זוגי המתגורר/ת עימי ואין לו/לה הכנסות בשנת המס (רק אם אחד מאיתנו בגיל פרישה, נכה או עיוור)
        </Checkbox>
        <Checkbox checked={reliefs.singleParentFamily} onChange={flag('singleParentFamily')}>
          אני הורה במשפחה חד הורית החי בנפרד ומבקש/ת נקודות זיכוי עבור ילדיי שבחזקתי
        </Checkbox>
        <Checkbox checked={!!reliefs.childrenInCustody}
          onChange={(c) => update((d) => { d.reliefs.childrenInCustody = c ? emptyCounts() : null; })}>
          בגין ילדיי שבחזקתי המפורטים בחלק ג (הורה במשפחה חד הורית שמקבל את קצבת הילדים, אשה נשואה או הורה יחיד)
        </Checkbox>
        {reliefs.childrenInCustody && (
          <ChildCounts counts={reliefs.childrenInCustody} keys={['born', 'age1to2', 'age3', 'age4to5', 'age6to17', 'age18']}
            onChange={(key, value) => update((d) => { d.reliefs.childrenInCustody![key] = value; })} />
        )}
        <Checkbox checked={!!reliefs.childrenOther}
          onChange={(c) => update((d) => {
            if (!c) d.reliefs.childrenOther = null;
            else d.reliefs.childrenOther = { born: 0, age1to2: 0, age3: 0, age4to5: 0, age6to17: 0 };
          })}>
          בגין ילדיי המפורטים בחלק ג (הורה שלא סימן את הסעיף הקודם, אשה לא נשואה שילדיה אינם בחזקתה, הורה יחיד)
        </Checkbox>
        {reliefs.childrenOther && (
          <ChildCounts counts={reliefs.childrenOther} keys={['born', 'age1to2', 'age3', 'age4to5', 'age6to17']}
            onChange={(key, value) => update((d) => {
              if (key !== 'age18') d.reliefs.childrenOther![key] = value;
            })} />
        )}
        <Checkbox checked={reliefs.singleParent} onChange={flag('singleParent')}>אני הורה יחיד לילדיי שבחזקתי</Checkbox>
        <Checkbox checked={reliefs.childrenNotInCustody} onChange={flag('childrenNotInCustody')}>
          בגין ילדיי שאינם בחזקתי ואני משתתף/ת בכלכלתם (הורה החי בנפרד שהמציא פסק דין למזונות)
        </Checkbox>
        <Checkbox checked={reliefs.disabledChildren !== null}
          onChange={(c) => update((d) => { d.reliefs.disabledChildren = c ? 1 : null; })}>
          אני הורה לילדים עם מוגבלות שטרם מלאו להם 19 ומקבל/ת בגינם גמלת ילד נכה (מצורף אישור)
        </Checkbox>
        {reliefs.disabledChildren !== null && (
          <div className="flex items-center gap-3 pr-8">
            <span className="flex-1 text-[15px]">מספר הילדים</span>
            <div className="w-16">
              <NumberInput aria-label="מספר ילדים עם מוגבלות" min={1} max={20} value={reliefs.disabledChildren}
                onChange={(v) => update((d) => { d.reliefs.disabledChildren = v ?? 1; })} />
            </div>
          </div>
        )}
        <Checkbox checked={reliefs.alimony} onChange={flag('alimony')}>
          בגין מזונות לבן/בת זוגי לשעבר – למי שנישא/ה בשנית (מצורף פסק דין)
        </Checkbox>
        <Checkbox checked={reliefs.age16to18} onChange={flag('age16to18')}>
          מלאו לי או לבן/בת זוגי 16 שנים וטרם מלאו 18 בשנת המס
        </Checkbox>
        <Checkbox checked={!!reliefs.dischargedSoldier}
          onChange={(c) => update((d) => { d.reliefs.dischargedSoldier = c ? { start: '', end: '' } : null; })}>
          אני חייל/ת משוחרר/ת או שירתתי בשירות לאומי (מצורפת תעודת שחרור/סיום שירות)
        </Checkbox>
        {reliefs.dischargedSoldier && (
          <div className="flex flex-col gap-3 pr-8">
            <DateField label="תאריך תחילת השירות" required value={reliefs.dischargedSoldier.start} error={errors['reliefs.dischargedSoldier.start']}
              onChange={(v) => update((d) => { d.reliefs.dischargedSoldier!.start = v; })} />
            <DateField label="תאריך סיום השירות" required value={reliefs.dischargedSoldier.end} error={errors['reliefs.dischargedSoldier.end']}
              onChange={(v) => update((d) => { d.reliefs.dischargedSoldier!.end = v; })} />
          </div>
        )}
        <Checkbox checked={reliefs.academicDegree} onChange={flag('academicDegree')}>
          בגין סיום לימודים לתואר אקדמי, התמחות או לימודי מקצוע (מצורפת הצהרה בטופס 119)
        </Checkbox>
        <Checkbox checked={reliefs.reserveCombatDays !== null}
          onChange={(c) => update((d) => { d.reliefs.reserveCombatDays = c ? 1 : null; })}>
          שירתתי כלוחם/לוחמת מילואים בשנת המס הקודמת (מצורף אישור צה&quot;ל)
        </Checkbox>
        {reliefs.reserveCombatDays !== null && (
          <div className="flex items-center gap-3 pr-8">
            <span className="flex-1 text-[15px]">סה&quot;כ ימי מילואים</span>
            <div className="w-20">
              <NumberInput aria-label="ימי מילואים" min={1} max={365} value={reliefs.reserveCombatDays}
                onChange={(v) => update((d) => { d.reliefs.reserveCombatDays = v ?? 1; })} />
            </div>
          </div>
        )}
      </Card>

      <Card title="בקשה לתיאום מס">
        <Choice label="תיאום מס" value={taxCoordination.reason}
          onChange={(v) => update((d) => {
            d.taxCoordination.reason = v;
            if (v === 'other-incomes' && d.taxCoordination.otherIncomes.length === 0) {
              d.taxCoordination.otherIncomes.push({ payer: '', address: '', deductionsFile: '', incomeType: '', monthlyIncome: '', taxWithheld: '' });
            }
          })}
          options={[
            { value: 'none', label: 'לא מבקש/ת תיאום מס' },
            { value: 'no-income-until-start', label: 'לא הייתה לי הכנסה מתחילת השנה עד תחילת העבודה כאן' },
            { value: 'other-incomes', label: 'יש לי הכנסות נוספות ממשכורת' },
            { value: 'assessor-approval', label: 'פקיד השומה אישר תיאום (אישור מצורף)' },
          ]} />
        {taxCoordination.reason === 'other-incomes' && (
          <>
            {taxCoordination.otherIncomes.map((income, i) => (
              <div key={i} className="flex flex-col gap-3 border-b border-[#eaeef6] pb-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1e3465]">הכנסה נוספת {i + 1}</span>
                  <button type="button" aria-label={`הסרת הכנסה ${i + 1}`} className="text-red-600"
                    onClick={() => update((d) => { d.taxCoordination.otherIncomes.splice(i, 1); })}>
                    <Trash2 className="size-5" />
                  </button>
                </div>
                <TextField label="שם המעסיק/המשלם" required value={income.payer} error={errors[`taxCoordination.otherIncomes.${i}.payer`]}
                  onChange={(v) => update((d) => { d.taxCoordination.otherIncomes[i].payer = v; })} />
                <TextField label="כתובת" value={income.address} onChange={(v) => update((d) => { d.taxCoordination.otherIncomes[i].address = v; })} />
                <TextField label="מספר תיק ניכויים" inputMode="numeric" maxLength={9} value={income.deductionsFile}
                  onChange={(v) => update((d) => { d.taxCoordination.otherIncomes[i].deductionsFile = v.replace(/\D/g, ''); })} />
                <TextField label="סוג ההכנסה" hint="עבודה/קצבה/מלגה/אחר" value={income.incomeType}
                  onChange={(v) => update((d) => { d.taxCoordination.otherIncomes[i].incomeType = v; })} />
                <div className="flex gap-3">
                  <TextField label="הכנסה חודשית" inputMode="decimal" value={income.monthlyIncome}
                    onChange={(v) => update((d) => { d.taxCoordination.otherIncomes[i].monthlyIncome = v; })} />
                  <TextField label="המס שנוכה" inputMode="decimal" value={income.taxWithheld}
                    onChange={(v) => update((d) => { d.taxCoordination.otherIncomes[i].taxWithheld = v; })} />
                </div>
              </div>
            ))}
            {taxCoordination.otherIncomes.length < 3 && (
              <SecondaryButton onClick={() => update((d) => {
                d.taxCoordination.otherIncomes.push({ payer: '', address: '', deductionsFile: '', incomeType: '', monthlyIncome: '', taxWithheld: '' });
              })}>
                <Plus className="size-4" /> הוספת הכנסה נוספת
              </SecondaryButton>
            )}
            {errors['taxCoordination.otherIncomes'] && <span className="text-sm text-red-600">{errors['taxCoordination.otherIncomes']}</span>}
          </>
        )}
      </Card>

      <Card title="שינויים במהלך השנה">
        <p className="text-[15px] text-[#6b7280]">ממלאים רק אם חל שינוי בפרטים לאחר מסירת טופס קודם השנה.</p>
        {changes.map((change, i) => (
          <div key={i} className="flex flex-col gap-3 border-b border-[#eaeef6] pb-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#1e3465]">שינוי {i + 1}</span>
              <button type="button" aria-label={`הסרת שינוי ${i + 1}`} className="text-red-600"
                onClick={() => update((d) => { d.changes.splice(i, 1); })}>
                <Trash2 className="size-5" />
              </button>
            </div>
            <DateField label="תאריך השינוי" required value={change.date} error={errors[`changes.${i}.date`]}
              onChange={(v) => update((d) => { d.changes[i].date = v; })} />
            <TextField label="פרטי השינוי" required value={change.description} error={errors[`changes.${i}.description`]}
              onChange={(v) => update((d) => { d.changes[i].description = v; })} />
            <DateField label="תאריך ההודעה" required value={change.notifiedDate} error={errors[`changes.${i}.notifiedDate`]}
              onChange={(v) => update((d) => { d.changes[i].notifiedDate = v; })} />
          </div>
        ))}
        {changes.length < 3 && (
          <SecondaryButton onClick={() => update((d) => { d.changes.push({ date: '', description: '', notifiedDate: '' }); })}>
            <Plus className="size-4" /> הוספת שינוי
          </SecondaryButton>
        )}
      </Card>
    </>
  );
}
