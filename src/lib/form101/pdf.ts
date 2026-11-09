import 'server-only';
import fs from 'fs/promises';
import path from 'path';
import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import bidiFactory from 'bidi-js';
import { Form101ChildCounts, Form101Data, Form101Employer } from '@/lib/form101/schema';
import { SUPPORTED_TAX_YEARS } from '@/lib/form101/years';

// The official Tax Authority Form 101 has no fillable fields, so values are drawn at positions measured
// from each year's edition (PDF points, origin at the bottom-left). Forms live in src/assets/form101/<year>/.
const ASSETS_DIR = path.join(process.cwd(), 'src/assets/form101');
const FONT_SIZE = 9;
const INK = rgb(0.05, 0.1, 0.35);

const bidi = bidiFactory();

// pdf-lib draws glyphs left to right, so Hebrew (and mixed Hebrew/number) text is converted to visual order
function toVisual(value: string) {
  const levels = bidi.getEmbeddingLevels(value, 'rtl');
  const chars = value.split('');
  // Brackets in right-to-left runs are mirrored, then each run is reversed into visual order
  bidi.getMirroredCharactersMap(value, levels.levels).forEach((char, index) => (chars[index] = char));
  for (const [start, end] of bidi.getReorderSegments(value, levels)) {
    const reversed = chars.slice(start, end + 1).reverse();
    chars.splice(start, reversed.length, ...reversed);
  }
  return chars.join('');
}

type Align = 'right' | 'center' | 'left';

class FormWriter {
  constructor(private font: PDFFont) {}

  private width(chars: string[], size: number) {
    return chars.reduce((sum, char) => sum + this.font.widthOfTextAtSize(char, size), 0);
  }

  text(page: PDFPage, value: string | number | undefined | null, x: number, y: number, align: Align = 'right', maxWidth = 200, size = FONT_SIZE) {
    if (value === undefined || value === null || value === '') return;
    const chars = toVisual(String(value).replace(/\s+/g, ' ').trim()).split('');
    let fontSize = size;
    while (fontSize > 5 && this.width(chars, fontSize) > maxWidth) fontSize -= 0.5;
    const width = this.width(chars, fontSize);
    let cursor = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
    // Drawn one character at a time: the font's own layout would reverse Hebrew runs again
    for (const char of chars) {
      page.drawText(char, { x: cursor, y, size: fontSize, font: this.font, color: INK });
      cursor += this.font.widthOfTextAtSize(char, fontSize);
    }
  }

  // Tick inside a ❏ box whose left edge is x and bottom is y
  check(page: PDFPage, x: number, y: number, when = true) {
    if (!when) return;
    const line = (x1: number, y1: number, x2: number, y2: number) =>
      page.drawLine({ start: { x: x + x1, y: y + y1 }, end: { x: x + x2, y: y + y2 }, thickness: 1.2, color: INK });
    line(1.5, 4.5, 3.8, 1.5);
    line(3.8, 1.5, 8.5, 8.5);
  }
}

// yyyy-mm-dd → dd/mm/yyyy
function formatDate(iso?: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Writes a date around the form's pre-printed "/ /" marks (first slash at slashX, second at slashX + 13)
function dateOnSlashes(w: FormWriter, page: PDFPage, iso: string | undefined, slashX: number, y: number) {
  if (!iso) return;
  const [year, month, day] = iso.split('-');
  w.text(page, day, slashX - 1.5, y, 'right', 14);
  w.text(page, month, slashX + 9, y, 'center', 9, 7);
  w.text(page, year, slashX + 18, y, 'left', 24);
}

// Phone numbers are split around the form's pre-printed "/" into area code and number
function splitPhone(value?: string) {
  const digits = (value || '').replace(/[^\d]/g, '');
  if (!digits) return null;
  const prefixLength = /^0(5|7)/.test(digits) ? 3 : 2;
  return { prefix: digits.slice(0, prefixLength), number: digits.slice(prefixLength) };
}

// Deductions file numbers start with a pre-printed 9
const withoutLeadingNine = (value: string) => value.replace(/[^\d]/g, '').replace(/^9/, '');

function childCounts(w: FormWriter, page: PDFPage, counts: Partial<Form101ChildCounts>, rows: { y: number; yLeft?: number }[]) {
  // Right column: born / 1–2 / 3 years; left column: 4–5 / 6–17 / 18 years
  const right: [keyof Form101ChildCounts, number][] = [['born', 380], ['age1to2', 290], ['age3', 335]];
  const left: [keyof Form101ChildCounts, number][] = [['age4to5', 55], ['age6to17', 50], ['age18', 90]];
  rows.forEach(({ y, yLeft }, i) => {
    const [rightKey, rightX] = right[i];
    const rightValue = counts[rightKey];
    if (rightValue) {
      w.check(page, 499, y);
      w.text(page, rightValue, rightX, y + 2.5, 'center', 20);
    }
    const [leftKey, leftX] = left[i];
    const leftValue = counts[leftKey];
    if (leftValue && yLeft !== undefined) {
      w.check(page, 256, y);
      w.text(page, leftValue, leftX, yLeft + 2.5, 'center', 20);
    }
  });
}

type FillLayout = (doc: PDFDocument, w: FormWriter, data: Form101Data, employer: Form101Employer) => Promise<void>;

// Layout of edition 11.2025 (tax year 2026)
const fillLayout2026: FillLayout = async (doc, w, data, employer) => {
  const [p1, p2] = doc.getPages();
  const { employee, reliefs } = data;

  // ---- Page 1 ----
  w.text(p1, data.taxYear, 262, 741.8, 'center', 40, 11);

  // א. פרטי המעסיק
  w.text(p1, employer.name, 520, 662, 'right', 115);
  w.text(p1, employer.address, 410, 662, 'right', 190);
  w.text(p1, employer.phone, 203, 662, 'right', 85);
  w.text(p1, withoutLeadingNine(employer.deductionsFile), 40, 661, 'left', 55);

  // ב. פרטי העובד/ת
  if (employee.hasIsraeliId) w.text(p1, employee.idNumber, 535, 609, 'right', 92);
  else w.text(p1, employee.passportNumber, 535, 587, 'right', 92);
  w.text(p1, employee.lastName, 420, 609, 'right', 100);
  w.text(p1, employee.firstName, 308, 609, 'right', 95);
  w.text(p1, formatDate(employee.birthDate), 205, 609, 'right', 85);
  w.text(p1, formatDate(employee.aliyaDate), 113, 609, 'right', 80);
  w.text(p1, employee.street, 327, 587, 'right', 100);
  w.text(p1, employee.houseNumber, 223, 587, 'right', 40);
  w.text(p1, employee.city, 167, 587, 'right', 85);
  w.text(p1, employee.zip, 77, 587, 'right', 45);

  w.check(p1, 528, 553.7, employee.gender === 'male');
  w.check(p1, 528, 540.7, employee.gender === 'female');
  const maritalBoxes: Record<Form101Data['employee']['maritalStatus'], [number, number]> = {
    single: [489, 553.7],
    married: [430, 553.7],
    divorced: [363, 553.7],
    widowed: [489, 540.7],
    separated: [442, 540.7],
  };
  w.check(p1, ...maritalBoxes[employee.maritalStatus]);
  if (employee.hasIsraeliId) {
    w.check(p1, 310, employee.israeliResident ? 553.7 : 540.7);
    const kibbutzBoxes: Record<Form101Data['employee']['kibbutz'], [number, number]> = {
      no: [271, 553.7], 'yes-transferred': [249, 553.7], 'yes-not-transferred': [271, 540.7],
    };
    w.check(p1, ...kibbutzBoxes[employee.kibbutz]);
  }
  if (employee.healthFund.member === false) w.check(p1, 123, 553.7);
  if (employee.healthFund.member) {
    w.check(p1, 123, 540.7);
    w.text(p1, employee.healthFund.name, 70, 538.7, 'right', 38);
  }

  w.text(p1, employee.email, 537, 514, 'right', 125);
  const phone = splitPhone(employee.phone);
  if (phone) {
    w.text(p1, phone.number, 245, 514, 'left', 110);
    w.text(p1, phone.prefix, 237, 514, 'right', 22);
  }
  const mobile = splitPhone(employee.mobile);
  if (mobile) {
    w.text(p1, mobile.number, 79, 514, 'left', 120);
    w.text(p1, mobile.prefix, 71, 514, 'right', 26);
  }

  // ג. ילדים — 13 rows, 22pt apart (row lines measured from the form)
  data.children.forEach((child, i) => {
    const y = 447.4 - 22 * i;
    w.check(p1, 529, y, child.inCustody);
    w.check(p1, 517.5, y, child.receivesAllowance);
    w.text(p1, child.name, 513, y, 'right', 75);
    w.text(p1, child.idNumber, 397, y, 'center', 78);
    w.text(p1, formatDate(child.birthDate), 305, y, 'center', 95);
  });

  // ד. הכנסה ממעסיק זה
  const incomeRows: Record<Form101Data['income']['type'], number> = {
    monthly: 473.8, additional: 463.8, partial: 451.4, daily: 439.8, pension: 427.8, scholarship: 415.8,
  };
  w.check(p1, 238, incomeRows[data.income.type]);
  w.text(p1, formatDate(data.income.startDate), 78, 455, 'center', 85);

  // ה. הכנסות אחרות
  const { otherIncome } = data;
  if (!otherIncome.has) {
    w.check(p1, 237, 377.1);
  } else {
    w.check(p1, 237, 352.7);
    const otherBoxes: Record<Form101Data['income']['type'], [number, number]> = {
      monthly: [237, 342.7], additional: [237, 331.7], partial: [237, 320.7],
      daily: [119, 342.7], pension: [119, 331.7], scholarship: [119, 320.7],
    };
    otherIncome.types.forEach((type) => w.check(p1, ...otherBoxes[type]));
    w.check(p1, 235, 295.1, otherIncome.creditPoints === 'here');
    w.check(p1, 236, 271.8, otherIncome.creditPoints === 'other');
    w.check(p1, 236, 247.5, otherIncome.noStudyFund);
    w.check(p1, 236, 213.2, otherIncome.noPension);
  }

  // ו. בן/בת הזוג
  if (data.spouse) {
    const { spouse } = data;
    w.text(p1, spouse.idNumber, 535, 135, 'right', 92);
    w.text(p1, spouse.passportNumber, 535, 106, 'right', 92);
    w.text(p1, spouse.lastName, 420, 135, 'right', 100);
    w.text(p1, spouse.firstName, 310, 135, 'right', 95);
    w.text(p1, formatDate(spouse.birthDate), 204, 135, 'right', 85);
    w.text(p1, formatDate(spouse.aliyaDate), 114, 135, 'right', 80);
    if (!spouse.hasIncome) w.check(p1, 410, 114.7);
    else {
      w.check(p1, 282, 114.7);
      w.check(p1, 160, 114.7, spouse.incomeFromWork);
      w.check(p1, 81, 114.7, spouse.incomeOther);
    }
  }

  // ז. שינויים במהלך השנה — 3 rows
  data.changes.forEach((change, i) => {
    const y = [57, 40, 24][i];
    w.text(p1, formatDate(change.date), 505, y, 'center', 60);
    w.text(p1, change.description, 470, y, 'right', 180);
    dateOnSlashes(w, p1, change.notifiedDate, 145, y);
  });

  // ---- Page 2 ----
  w.text(p2, employee.hasIsraeliId ? employee.idNumber : employee.passportNumber, 168, 814, 'right', 90);

  // ח. פטור או זיכוי ממס
  w.check(p2, 511, 788.9, employee.hasIsraeliId && employee.israeliResident);
  w.check(p2, 511, 774.4, reliefs.disabled);
  w.check(p2, 511, 752.1, reliefs.disabledAllowance);
  if (reliefs.settlement) {
    w.check(p2, 511, 733.1);
    w.text(p2, formatDate(reliefs.settlement.from), 292, 735.6, 'center', 70);
    w.text(p2, reliefs.settlement.name, 438, 722.7, 'right', 140);
  }
  if (reliefs.newImmigrant) {
    w.check(p2, 512, 707.6);
    w.text(p2, formatDate(reliefs.newImmigrant.from), 370, 710.1, 'center', 70);
    w.text(p2, formatDate(reliefs.newImmigrant.noIncomeUntil), 220, 695.1, 'center', 60);
  }
  w.check(p2, 511, 667.3, reliefs.spouseNoIncome);
  w.check(p2, 511, 644.9, reliefs.singleParentFamily);
  if (reliefs.childrenInCustody) {
    w.check(p2, 511, 622.4);
    childCounts(w, p2, reliefs.childrenInCustody, [{ y: 601.7, yLeft: 598.1 }, { y: 589.8, yLeft: 589.8 }, { y: 578.4, yLeft: 578.4 }]);
  }
  if (reliefs.childrenOther) {
    w.check(p2, 511, 563.8);
    childCounts(w, p2, reliefs.childrenOther, [{ y: 554.1, yLeft: 550.6 }, { y: 542.3, yLeft: 542.3 }, { y: 530.9 }]);
  }
  w.check(p2, 511, 514.2, reliefs.singleParent);
  w.check(p2, 511, 496.2, reliefs.childrenNotInCustody);
  if (reliefs.disabledChildren) {
    w.check(p2, 511, 470.1);
    w.text(p2, reliefs.disabledChildren, 459, 475, 'center', 16, 8);
  }
  w.check(p2, 511, 447.3, reliefs.alimony);
  w.check(p2, 511, 432.3, reliefs.age16to18);
  if (reliefs.dischargedSoldier) {
    w.check(p2, 511, 417.3);
    w.text(p2, formatDate(reliefs.dischargedSoldier.start), 221, 419.8, 'center', 52);
    w.text(p2, formatDate(reliefs.dischargedSoldier.end), 87, 419.8, 'center', 60);
  }
  w.check(p2, 511, 392.9, reliefs.academicDegree);
  if (reliefs.reserveCombatDays) {
    w.check(p2, 511, 379.7);
    w.text(p2, reliefs.reserveCombatDays, 356, 381.5, 'center', 16, 8);
  }

  // ט. תיאום מס
  const { taxCoordination } = data;
  const coordinationBoxes = { 'no-income-until-start': 348.6, 'other-incomes': 319.6, 'assessor-approval': 240.4 } as const;
  if (taxCoordination.reason !== 'none') w.check(p2, 512, coordinationBoxes[taxCoordination.reason]);
  if (taxCoordination.reason === 'other-incomes') {
    taxCoordination.otherIncomes.forEach((income, i) => {
      const y = [281, 267, 253][i];
      w.text(p2, income.payer, 535, y, 'right', 88);
      w.text(p2, income.address, 440, y, 'right', 128);
      w.text(p2, withoutLeadingNine(income.deductionsFile), 242, y, 'left', 66);
      w.text(p2, income.incomeType, 201, y, 'center', 54);
      w.text(p2, income.monthlyIncome, 136, y, 'center', 70);
      w.text(p2, income.taxWithheld, 64, y, 'center', 68);
    });
  }

  // י. הצהרה — date and drawn signature above their lines
  w.text(p2, formatDate(data.declaration.date), 185, 189, 'center', 85);
  const signature = await doc.embedPng(data.signature);
  // Only ~12pt are free between the signature line and the declaration text above it
  const scale = Math.min(84 / signature.width, 13 / signature.height);
  p2.drawImage(signature, {
    x: 78 - (signature.width * scale) / 2,
    y: 187,
    width: signature.width * scale,
    height: signature.height * scale,
  });
};

// Form edition per tax year. To add a year:
// 1. Put the Tax Authority's PDF in src/assets/form101/<year>/form101.pdf and add the year to SUPPORTED_TAX_YEARS.
// 2. Compare its labels with the previous edition. If nothing moved, reuse the previous layout;
//    otherwise copy it into a new fillLayout<year> and adjust the positions that changed.
// 3. Generate a fully filled sample and check both pages visually before releasing.
const FORM_EDITIONS: Record<number, { file: string; fill: FillLayout }> = {
  2026: { file: '2026/form101.pdf', fill: fillLayout2026 },
};

for (const year of SUPPORTED_TAX_YEARS) {
  if (!FORM_EDITIONS[year]) throw new Error(`Form 101: no form edition registered for tax year ${year}`);
}

export async function generateForm101Pdf(data: Form101Data, employer: Form101Employer) {
  const edition = FORM_EDITIONS[data.taxYear];
  if (!edition) throw new Error(`Form 101 for tax year ${data.taxYear} is not available`);
  const [formBytes, fontBytes] = await Promise.all([
    fs.readFile(path.join(ASSETS_DIR, edition.file)),
    fs.readFile(path.join(ASSETS_DIR, 'Heebo.ttf')),
  ]);
  const doc = await PDFDocument.load(formBytes);
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: true });
  await edition.fill(doc, new FormWriter(font), data, employer);
  doc.setTitle(`טופס 101 - ${data.employee.firstName} ${data.employee.lastName} - ${data.taxYear}`);
  return doc.save();
}
