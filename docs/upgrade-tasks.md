# Upgrade tasks: mobile client portal and Form 101

What's still open after building the mobile client portal (Figma: "Client Portal mobile") and Form 101.
The code for all of it is committed. The open items are configuration, backend work outside this repo, and follow-ups.

Status as of 9 November 2026.

## 1. Before going to production (required)

### 1.1 Environment variables in Vercel

| Variable | Used by | Value | Without it |
|---|---|---|---|
| `FORM101_LINK_SECRET` | `src/lib/form101/token.ts` | Random string, at least 32 characters (`openssl rand -hex 32`). Don't reuse the local `.env` value. | Creating Form 101 links fails (500). |
| `JOIN_REQUEST_WEBHOOK_URL` | `src/app/api/join-request/route.ts` | URL of the Make scenario from 1.3 | Join requests fail ("השליחה נכשלה"). |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk | Already set | n/a |

Changing `FORM101_LINK_SECRET` invalidates all links already sent.

### 1.2 Clerk: phone sign-in (mobile sign-in screen)

The mobile `/sign-in` uses phone number plus SMS code (`src/components/auth/MobileSignIn.tsx`).

- [ ] In the Clerk dashboard, under User & Authentication, enable **Phone number** with **SMS verification code** as a sign-in method, in both the **development** and **production** instances.
- [ ] Check that Clerk is allowed to send SMS to Israeli numbers (+972), including any country restrictions.
- [ ] Make sure existing users have a verified phone number on their Clerk account. Users without one can't sign in on mobile. Desktop still uses email.
- [ ] Test the full flow on a real phone: send code, receive SMS, verify, land on home.

### 1.3 Make.com scenarios

- [ ] **Join request** (new scenario): a Custom webhook that receives `{ fullName, phone, email | null, submittedAt }` (phone in `+972…` format) and notifies the office or records the request. Put its URL in `JOIN_REQUEST_WEBHOOK_URL`.
- [ ] **Documents scenario** (`m2ow857a…`, existing): confirm it accepts Form 101 uploads sent as:
  - `fileType: "101"`, which is new; the existing types include "161" but not "101"
  - `recordId: -1`, since the new employee has no record yet, so the form is filed under the employer
  - `uploadType: "document"`, `employerId`, and `remarks` like `טופס 101 לשנת 2026 - <name> (<ID>)`
  - `files[0]`: the filled form PDF (about 570 KB), followed by the employee's attachments

  Decide where 101 forms should be stored and who gets notified.

### 1.4 Test data

- [ ] Test employer `recGkvJRQl1nkXU1I` has an empty "תקופה נוכחית". `getMissingDocsByEmployer` fails with *"Lookup field 'תקופה נוכחית' is empty"*. Link it to an open reporting period in Airtable (it's a lookup field, so the change goes on the linked period).

## 2. Recurring: Form 101 for each new tax year

Supported years: **2026** (edition 11.2025). The form has no fillable fields, so values are drawn at measured positions. A changed layout would put values in the wrong boxes without any error.

When the Tax Authority publishes the 2027 form at https://www.gov.il/he/service/itc101 (probably late November or December 2026):

- [ ] Save it as `src/assets/form101/2027/form101.pdf` and add `2027` to `SUPPORTED_TAX_YEARS` in `src/lib/form101/years.ts`.
- [ ] Compare its labels and boxes with the 2026 edition (`pdftotext -bbox`, plus a grid overlay render).
  - Nothing moved: register `2027: { file: '2027/form101.pdf', fill: fillLayout2026 }` in `FORM_EDITIONS` (`src/lib/form101/pdf.ts`).
  - Something moved: copy `fillLayout2026` to `fillLayout2027` and adjust what changed.
- [ ] If section ח gained or changed items, or the child age groups changed, update `src/lib/form101/schema.ts`, the wizard text in `src/components/form101/steps.tsx` and the layout.
- [ ] Generate a fully filled sample and check both pages visually before release.

Until 2027 is added, the link creator shows 2027 (from December on) as "טרם פורסם" and blocks it, and the server refuses 2027 links.

## 3. Backend improvements (outside this repo)

- [ ] **`getMissingDocsByEmployer` Lambda:** return an empty list, not a 500, when the employer has no current period.
- [ ] **Documents webhook `0dt1lukm…`** (documents for download): add a Webhook response on the "no documents" path. It currently returns Make's default "Accepted". Mobile treats that as "no documents"; desktop now does too.
- [ ] **Security: ownership checks.** The `/api/*` routes don't check that the `email` or `recordId` in a request belongs to the signed-in user, so a signed-in user could request another employer's data. The new Form 101 link route does check this on the server (`src/lib/server/employer.ts`); the older routes should do the same.
- [ ] **Security: admin check on the server.** Admin status (`@cpateam.co.il`, `neemandu@gmail.com`) is only checked in the browser for most features. Use `src/lib/admin.ts` in server routes.
- [ ] **Security: exposed webhook URLs.** Nine Make webhook URLs are called directly from the browser, so anyone using the app can see them. Consider routing them through `/api/*` like the newer code does.
- [ ] **Form 101 storage:** the PDFs hold sensitive personal data (ID numbers, children, income). Decide where the Make scenario stores them, who can access them, and how long they're kept.

## 4. Design follow-ups

- [ ] **Four hidden dashboard frames** in Figma (`303:2703`, `303:2794`, `303:2909`, `303:3050`): hidden, with placeholder content only. Confirm with the designer whether any is meant to be a real screen (for example, an office-staff dashboard).
- [ ] **Screens that still use the desktop layout on mobile** (no Figma design yet):
  - Add employee (`AddEmployee`) and remove employee (`EmployeeRecognition`)
  - Document upload (`DocumentUpload`, opened by "סרוק / העלה מסמך חדש")
  - General inquiries (`YearlyForm`, opened by the home card "בירורים כלליים")
  - Admin employer and period dropdowns
- [ ] **Menu items shown as "בקרוב":** הגדרות (settings) and ארכיון (archive) have no screens.
- [ ] **Small differences from Figma, decided during the build:**
  - The real logo replaces the "לוגו" placeholder; on signed-out screens the header has no user name, bell or menu.
  - Icons whose Figma export was wrong were replaced with matching Lucide icons.
  - The home screen's progress card is "התקדמות בבירורים" (inquiry completion), not daily progress.
  - The inquiry screen has an added details line (date, amount, details).
  - On the sign-in screen, the "תוקף הקוד: 00:59" countdown is really the resend cooldown; Clerk codes stay valid longer. Consider rewording it to "ניתן לשלוח קוד חדש בעוד 00:59".

## 5. Known limitations

### Form 101
- Not the Tax Authority's approved electronic-101 track: the signature is a drawn image. Approval would need a personal password, employer review, a certified electronic signature and archived versions; see the 2026 rules on gov.il.
- Links can be used more than once until they expire after 14 days, so whoever has the link can submit several times.
- "שמור להמשך" drafts are kept only on the employee's device.
- Attachments are capped at 2.5 MB in total, because of Vercel's 4.5 MB request limit.
- The "פרוד/ה" (separated) status reminds the employee to attach the assessor approval but doesn't enforce it.
- The employer address, phone and deductions file for section א are typed in once on each device when creating links.

### Other
- `/api/join-request` is public: it has a hidden bot-trap field but no rate limiting.
- Documents for download: files from hosts that block downloading from the page are offered as links instead. The real hosting couldn't be checked, because the test account has no documents.

## 6. Not yet verified

- [ ] `next build` (production build). Only the type check and lint were run while the dev server was running.
- [ ] Click-through on **desktop** after the shared-code refactors:
  - Monthly report save (`MonthlyReport` → `src/lib/monthlyReport.ts`)
  - Missing documents upload (`Vacations` → `src/lib/missingDocs.ts`)
  - Documents for download (`PaySlip` → `src/lib/employerDocuments.ts`)
  - Inquiry save (`InquiryDetail` → `saveMonthlyInquiry`)
- [ ] Form 101 against the **real** documents webhook. Testing used a local stand-in to avoid writing test data.
- [ ] Mobile screens on real devices (iOS Safari, Android Chrome). Testing was done in a 393×852 frame in desktop Chrome.
