# Upgrade tasks: mobile client portal and Form 101

What's still open after building the mobile client portal (Figma: "Client Portal mobile") and Form 101.
The code for all of it is committed. The open items are configuration, backend work outside this repo, and follow-ups.

Status as of 16 November 2026.

## 1. Before going to production (required)

### 1.1 Environment variables in Vercel

| Variable | Used by | Value | Without it |
|---|---|---|---|
| `FORM101_LINK_SECRET` | `src/lib/form101/token.ts` | Random string, at least 32 characters (`openssl rand -hex 32`). Don't reuse the local `.env` value. | Creating Form 101 links fails (500). |
| `JOIN_REQUEST_WEBHOOK_URL` | `src/app/api/join-request/route.ts` | URL of the Make scenario from 1.3 | Join requests fail ("השליחה נכשלה"). |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk | Already set | n/a |

Changing `FORM101_LINK_SECRET` invalidates all links already sent.

### 1.2 Clerk: email sign-in (mobile sign-in screen)

The mobile `/sign-in` (`src/components/auth/MobileSignIn.tsx`) signs in by email: a 6-digit code sent by email (default), or the account password ("כניסה עם סיסמה"). It replaced the design's phone/SMS step because Clerk couldn't send SMS to Israeli numbers.

- [ ] In the **production** Clerk instance, check that email is a sign-in identifier with **Email verification code**, and that **Password** is enabled. Development already has both.
- [ ] **Turn off phone-number sign-in** in both instances (User & Authentication), since SMS to Israel doesn't work.
- [ ] Customise the Clerk email template for the verification code (Hebrew, branding) if needed.
- [ ] Test on a real phone: send code, receive the email, verify, land on home. Also test password sign-in.

### 1.3 Make.com scenarios

- [ ] **Join request** (new scenario): a Custom webhook that receives `{ fullName, phone, email | null, submittedAt }` (phone in `+972…` format) and notifies the office or records the request. Put its URL in `JOIN_REQUEST_WEBHOOK_URL`.
- [ ] **Documents scenario** (`m2ow857a…`, existing): confirm it accepts Form 101 uploads sent as:
  - `fileType: "101"`, which is new; the existing types include "161" but not "101"
  - `recordId: -1`, since the new employee has no record yet, so the form is filed under the employer
  - `uploadType: "document"`, `employerId`, and `remarks` like `טופס 101 לשנת 2026 - <name> (<ID>)`
  - `files[0]`: the filled form PDF (about 570 KB), followed by the employee's attachments

  Decide where 101 forms should be stored and who gets notified.

#### Employee-management screens (mobile)

The screens are built, but these actions have no scenario yet. Until a scenario exists, its button shows a "not available yet" message and sends nothing. Once a scenario is ready, send its URL and payload so the stub can be replaced. The payloads below are suggestions.

- [ ] **Update employee** (new): saves the "עריכת פרטי עובד" screen (`MobileEmployeeForm.tsx`, edit mode). It needs the employee's record ID plus the same fields the add-employee scenario (`qv5d2vgs…`) receives: names, ID, department, start date, Form 101 status, pension status, and the employment-contract and pension files.
- [ ] **Archived employees list** (new): returns the employer's archived employees for the "ארכיון עובדים" screen (`MobileEmployeeArchive.tsx`). Suggested: `GET ?recordId=<employer>` → `[{ id, firstName, lastName }]`. The screen is always empty until this exists.
- [ ] **Restore from archive** (new): the "הוצאה מהארכיון" button. Suggested: `POST { employerId, recordIds: [...] }`. Decide whether a restored employee goes back into the current reporting period.
- [ ] **Delete employees** (new): the "מחיקת עובדים" button. Suggested: `POST { employerId, recordIds: [...] }`. Deleting is permanent, so a confirmation step will be added before it sends. Decide whether it deletes the Airtable records or only hides them, and what happens to their documents.
- [ ] **Employer clarifications** (new): data for the "בירורים" tab in "מערכת מעסיקים", such as "הבהרה בנוגע להסכם העסקה". It also needs a reply scenario (answer text plus a replacement document) for the "בירור מהות מסמך" screens. Until both exist, the tab always shows "אין נושאים פתוחים" and the reply screens aren't built.
- [ ] **Archive employee** (`6yvgowfq…`, existing): the mobile list archives several employees at once by sending one request per employee, all with the same leaving date, reason, remarks and 161 file. Confirm the scenario handles several requests arriving together.
- [ ] **Documents scenario** (`m2ow857a…`, existing): confirm it also accepts:
  - `fileType: "הסכם העסקה"`: a new type in the mobile "העלאת מסמך חדש" screen that the desktop form doesn't offer.
  - Missing-document uploads where `remarks` is the employer's own note ("הוסף הערה"). Before, it was always the office's comment on the missing document; the office's comment is still sent when the employer leaves the note empty.

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
- [ ] **`getMissingDocsByEmployer` Lambda: add a date** (when the document was requested) to each row. The mobile home screen previews the two "latest" missing documents, but without a date it can only take the first two in the order the Lambda returns them.
- [ ] **Documents webhook `0dt1lukm…`** (documents for download): add a Webhook response on the "no documents" path. It currently returns Make's default "Accepted". Mobile treats that as "no documents"; desktop now does too.
- [ ] **Security: ownership checks.** The `/api/*` routes don't check that the `email` or `recordId` in a request belongs to the signed-in user, so a signed-in user could request another employer's data. The new Form 101 link route does check this on the server (`src/lib/server/employer.ts`); the older routes should do the same.
- [ ] **Security: admin check on the server.** Admin status (`@cpateam.co.il`, `neemandu@gmail.com`) is only checked in the browser for most features. Use `src/lib/admin.ts` in server routes.
- [ ] **Security: exposed webhook URLs.** Nine Make webhook URLs are called directly from the browser, so anyone using the app can see them. Consider routing them through `/api/*` like the newer code does.
- [ ] **Form 101 storage:** the PDFs hold sensitive personal data (ID numbers, children, income). Decide where the Make scenario stores them, who can access them, and how long they're kept.

## 4. Design follow-ups

- [ ] **Four hidden dashboard frames** in Figma (`303:2703`, `303:2794`, `303:2909`, `303:3050`): hidden, with placeholder content only. Confirm with the designer whether any is meant to be a real screen (for example, an office-staff dashboard).
- [ ] **Screens that still use the desktop layout on mobile** (no Figma design yet):
  - Document upload (`DocumentUpload`) from the "סרוק / העלה מסמך חדש" buttons on the home screen and the inquiries screen. The button in the "מערכת מעסיקים" drawer opens the mobile "העלאת מסמך חדש" screen instead. In Figma, the inquiries button leads to a supplier-invoice upload flow that isn't built yet.
  - General inquiries (`YearlyForm`, opened by the home card "בירורים כלליים")
  - Admin employer and period dropdowns
- [ ] **Menu items shown as "בקרוב":** הגדרות (settings) and ארכיון (archive). The employee archive screen opens from the "ארכיון עובדים" button on the employee list, not from the menu. Decide whether the menu item should open it too or is meant for a different archive.
- [ ] **Figma frames with no outgoing link:** the employee list, archive and edit-employee frames. Two entry points were added in code: "הוספת עובד חדש" and "ארכיון עובדים" on the employee list. Ask the designer to add them to the design.
- [ ] **"קישור למילוי הטופס" entries** in the "שיוך לעובד" dropdown of the new-upload frame (`409:3101`): not built. Their purpose is unclear (possibly a Form 101 link per employee).
- [ ] **Small differences from Figma, decided during the build:**
  - The real logo replaces the "לוגו" placeholder; on signed-out screens the header has no user name, bell or menu.
  - Icons whose Figma export was wrong were replaced with matching Lucide icons.
  - Home screen (changed on request, 16 November 2026):
    - The progress card ("התקדמות בבירורים") and the "N בירורים פתוחים" line are removed.
    - Each system has a clickable title line with its total, "מערכת בירורים (N)" and "מערכת מעסיקים (N)", which opens the full list.
    - Under each title, only the two latest open items. Inquiries are sorted newest first; missing documents use the backend's order (see 3).
    - "מערכת מעסיקים" is always shown, with "אין מסמכים חסרים" when there's nothing open. Its title opens the "מסמכים חסרים" tab; an item opens that document's upload screen.
    - The "N בירורים כלליים" line is kept, since it opens a different screen.
  - "בירורים פתוחים" and "מערכת מעסיקים" screens: the counter line above the tabs is removed; each tab shows its count instead, e.g. "הבהרות (3)" or "מסמכים חסרים (12)". The employer "בירורים" tab always shows (0) until it has a data source. A tab at (0) shows the check mark from the clarifications empty state, on both screens (e.g. "אין חשבוניות חסרות", "אין מסמכים חסרים", "אין עובדים ממתינים לדיווח"); the monthly report still lists the employees under it. Tabs are sized to their labels, and wrap onto two lines only on narrow phones.
  - The inquiry screen has an added details line (date, amount, details).
  - The sign-in screen uses email (code or password) instead of the design's phone number, with an added "כניסה עם סיסמה" link. Its countdown now reads "ניתן לשלוח קוד חדש בעוד 00:59", since it's the resend cooldown, not the code's validity.
  - Missing-document screen: shows the employee's name and the office's comment, which aren't in the design. The design's "תאריך המסמך" row is left out because the missing-docs data has no document date.
  - The "מסמכים חסרים" tab header reads "N מסמכים חסרים". The frame says "בירורים פתוחים", which looked copied from the clarifications tab.
  - List rows (home screen, "בירורים פתוחים", "מערכת מעסיקים"): the whole row is tappable, not just its button. The "צירוף" and "מענה" buttons now read "השב"; "צפייה" and "עדכן" are unchanged.
  - "בירור מהות מסמך" (Figma: specific invoice empty / upload / sent), opened from the "הבהרות" tab, and from home-screen inquiries that need an answer:
    - "מה מהות המסמך?" shows the office's own question when the inquiry has one. A "פרטים" row is added when the inquiry has details.
    - The design's image placeholder shows the invoice when the office attached an image, a link for other files, and the design's icon otherwise.
    - "שמירה" and "שלח תשובה" both send the answer and the chosen file the same way and then show "תשובה נשלחה"; the backend has a single save. "שמירה" is active only after something changed. Confirm with the designer what "שמירה" should do differently.
    - "העלה מסמך נוסף" on the sent screen returns to the same inquiry's form.
  - "העלאת מסמך חסר" for inquiries (Figma: client-portal-dashboard-missing doc, its file-chosen state, and the sent frame client-portal - specific invoice), opened from the "חשבוניות חסרות" tab, and from home-screen inquiries that only lack their invoice. This follows the Figma note that a missing invoice should open this screen instead of the old one, which was removed (`MobileInquiryDetail`).
    - "המסמך החסר" shows the supplier. A "הערת המשרד" row is added when the inquiry has a question.
    - "הוסף הערה" is sent as the inquiry's answer; an earlier answer is kept when no remark is added. Confirm this with the office, since the backend has no separate remarks field for inquiries.
    - "שמירה" and "שמור ועבור למסמך הבא" (always shown below it) are both the dark-blue primary button, unlike the design's outlined "שמירה", and are dimmed until a file is chosen. The second saves and opens the next inquiry missing its invoice, in list order, or returns to the list after the last one. The employer "מסמך חסר" screen works the same way. "העלה מסמך חדש" on the sent screen opens the document upload screen.
  - "מערכת מעסיקים" bottom drawer: starts collapsed, showing only its handle; tapping the handle expands or collapses it.
  - Add/edit employee: the bottom button keeps the Figma label "חזור לרשימת הדיווחים" but returns to the employee list. The breadcrumb also includes "עריכת רשימת עובדים".

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
- **A failed missing-docs request looks the same as having none** (by request, 16 November 2026): the home screen and the "מסמכים חסרים" tab show 0 and the check mark, with no error message or retry. If the Lambda fails for a real employer, nobody sees that documents are missing. The fix in 3 (an empty list instead of a 500) narrows this to real failures.
- The home screen's "מערכת מעסיקים" count covers only missing documents. Employer clarifications have no data source yet (see 1.3), and employees waiting for the monthly report aren't counted.
- Documents for download: files from hosts that block downloading from the page are offered as links instead. The real hosting couldn't be checked, because the test account has no documents.

## 6. Not yet verified

- [x] `next build` (production build) succeeded on 14 November 2026. Run it again before release, since the screens below were added afterwards.
- [ ] Click-through on **desktop** after the shared-code refactors:
  - Monthly report save (`MonthlyReport` → `src/lib/monthlyReport.ts`)
  - Missing documents upload (`Vacations` → `src/lib/missingDocs.ts`)
  - Documents for download (`PaySlip` → `src/lib/employerDocuments.ts`)
  - Inquiry save (`InquiryDetail` → `saveMonthlyInquiry`)
  - Remove employee (`EmployeeRecognition`), which now uses `archiveEmployee` from `src/lib/employees.ts`
- [ ] Mobile employee and document screens against the **real** Make webhooks. None of these were submitted during testing, to avoid writing test data:
  - Add employee (`MobileEmployeeForm`), including the Form 101 link shown after saving
  - Archive the checked employees (`MobileEmployeeList`), with one or several employees
  - Missing-document upload (`MobileMissingDocUpload`), including "שמור ועבור למסמך הבא" and the "תשובה נשלחה" screen
  - New document upload (`MobileDocumentUpload`), for an employee and for "כללי"
- [ ] Employee list, edit screen and missing-document screen with **real data**. The test account has no employees in its period, and its missing-docs request fails (see 1.4), so they were only seen empty or with stand-in data.
- [ ] Mobile home screen with **real data**: the "מערכת מעסיקים" section was only tested with stand-in missing documents, because the test employer's request fails (see 1.4). On that account it currently shows no missing documents (see 5).
- [ ] "בירור מהות מסמך" and the inquiry "העלאת מסמך חסר" against the **real** `/api/suppliers` save, with an answer, a remark and a document. It was tested only with stand-in inquiries and a stubbed save, because the test account has no open inquiries.
- [ ] Form 101 against the **real** documents webhook. Testing used a local stand-in to avoid writing test data.
- [ ] Mobile screens on real devices (iOS Safari, Android Chrome). Testing was done in a 393×852 frame in desktop Chrome.
