# Airtable schema

Base **בירורי לקוחות** (`appSs9FQQJtw6VYQV`), read from the Airtable meta API on 26 November 2026.
It is the only base the token can see. Field structure only, no record data.

| Table | ID | Fields | Views |
|---|---|---|---|
| [לקוחות](#לקוחות) | `tblfKCMT4yWj11uu3` | 60 | 7 |
| [בירורים כלליים](#בירורים-כלליים) | `tbl804qG1iPLVCvAG` | 35 | 38 |
| [רשימת לקוחות](#רשימת-לקוחות) | `tblMbQMqiUdcq0TDx` | 5 | 1 |
| [בירורים הוצאות שוטפות](#בירורים-הוצאות-שוטפות) | `tblYvwyOt8ZhwyKgt` | 48 | 83 |
| [עובדי משרד](#עובדי-משרד) | `tblHo4ptN9mViBrIR` | 8 | 2 |
| [עובדי לקוחות](#עובדי-לקוחות) | `tbl7xXIohwg5pMNUp` | 36 | 26 |
| [משימות](#משימות) | `tblSuEHc2ZHJVqyvg` | 18 | 23 |
| [עמודות](#עמודות) | `tblufbJ9SlOlH9zMB` | 7 | 1 |
| [טבלת תלושי שכר](#טבלת-תלושי-שכר) | `tblY6yBqKXdnP7lCj` | 7 | 1 |
| [שמות עמודות](#שמות-עמודות) | `tblIi5fdVDwYGL2wE` | 4 | 1 |
| [סיבות עזיבה](#סיבות-עזיבה) | `tblsy3zYzZIjwcQ1N` | 1 | 1 |
| [תקופות דיווח](#תקופות-דיווח) | `tblnDNKqwakYGQGOe` | 24 | 5 |
| [דיווחים חודשיים](#דיווחים-חודשיים) | `tbllBNXOrsicm2vHD` | 161 | 47 |
| [משוב לקוחות](#משוב-לקוחות) | `tbl1VLpRpdaTanSgU` | 12 | 1 |
| [חוסרים](#חוסרים) | `tblwicHQs93GvOgLf` | 162 | 48 |
| [לוגים](#לוגים) | `tbliBb52AuH08wO5z` | 8 | 1 |

## לקוחות

`tblfKCMT4yWj11uu3`, primary field: **כינוי העסק**

| Field | Type | Details |
|---|---|---|
| כינוי העסק | multilineText |  |
| מספר חברה | number |  |
| האם צריך טופס עזר ל161? | checkbox |  |
| שם בשקלולית | singleLineText |  |
| פעיל או לא | singleSelect | פעיל, לא פעיל |
| כרטיס לקוח | multilineText |  |
| סטטוס מעסיק | singleSelect | פעיל, לא פעיל, שני מלול |
| סטטוס תקופה | multipleLookupValues | סטטוס תקופה via תקופות דיווח |
| דואר אלקטרוני | multilineText |  |
| דואל מעסיקים 2 | singleLineText |  |
| מייל 2 מסמכים חסרים | singleLineText |  |
| אימייל חיבור למערכת | multilineText |  |
| סיסמה | singleLineText |  |
| paperless/SUMMIT | email |  |
| טלפון ראשי | phoneNumber |  |
| dropbox | multilineText |  |
| נתיב שמירת משכורות | multilineText |  |
| בירורים כלליים | multipleRecordLinks | → בירורים כלליים |
| record_id | formula | formula |
| בירורים הוצאות שוטפות | multipleRecordLinks | → בירורים הוצאות שוטפות |
| תשובות סגורות | count |  |
| אחראי  | multipleRecordLinks | → עובדי משרד |
| אימייל (from אחראי ) | multipleLookupValues | אימייל via אחראי  |
| משימות | multipleRecordLinks | → משימות |
| עובדי לקוחות | multipleRecordLinks | → עובדי לקוחות |
| קישור ל101 | url |  |
| האם מחויב ב161 | checkbox |  |
| תקופות דיווח | multipleRecordLinks | → תקופות דיווח |
| תקופת דיווח | multipleLookupValues | חודש דיווח via תקופות דיווח |
| תקופה נוכחית | multipleLookupValues | recordId via תקופות דיווח |
| משוב לקוחות | multipleRecordLinks | → משוב לקוחות |
| בדיקה1 | multipleRecordLinks | → בירורים הוצאות שוטפות |
| לקוח (from בדיקה1) | multipleLookupValues | לקוח via בדיקה1 |
| Fireberry ID | singleLineText |  |
| חוסרים (from עובדי לקוחות) | multipleLookupValues | חוסרים via עובדי לקוחות |
| כמות עובדים עם חוסרים | count |  |
| האם לאפשר לסגור בירור בכוח? | checkbox |  |
| תדירות מייל בירורים כלליים בימים | number |  |
| תדירות מייל בירורים הוצאות שוטפות בימים | number |  |
| תאריך שליחת מייל בירורים כלליים אחרון | date |  |
| תאריך שליחת מייל בירורים שוטפים אחרון | date |  |
| תאריך שליחת מייל בירורים כלליים הבא | formula | formula |
| תאריך שליחת מייל בירורים שוטפים הבא | formula | formula |
| לוגים | multipleRecordLinks | → לוגים |
| lowerCaseEmail | formula | formula |
| dropbox ascii | aiText |  |
| רשימת לקוחות | multipleRecordLinks | → רשימת לקוחות |
| קישור לטופס בירורים | formula | formula |
| סיכום כינוי העסק (כינוי העסק) | aiText |  |
| סה"כ ברורים שוטפים | rollup | סטטוס via בירורים הוצאות שוטפות |
| תשובות לשוטפות | rollup | סגור? via בירורים הוצאות שוטפות |
| בירורים כלליים 2 | multipleRecordLinks | → בירורים כלליים |
| עמודות | multipleRecordLinks | → עמודות |
| עובדי לקוחות copy | singleLineText |  |
| עובדי לקוחות copy | singleLineText |  |
| תיעוד שליחת סיסמה  | singleLineText |  |
| Records (Nested) | multipleRecordLinks | → לקוחות |
| From field: Records (Nested) | multipleRecordLinks | → לקוחות |
| דיווחים חודשיים | singleLineText |  |
| Field 60 | singleLineText |  |

## בירורים כלליים

`tbl804qG1iPLVCvAG`, primary field: **מזהה**

| Field | Type | Details |
|---|---|---|
| מזהה | autoNumber |  |
| האם חייב מסמך | singleSelect | כן, לא |
| האם חייב תשובה מילולית | singleSelect | כן, לא |
| סטטוס | singleSelect | פתוח, סגור, נשלח (פתוח) |
| סוג | singleSelect | חיצוני, פנימי |
| חן | multilineText |  |
| שאלה | multilineText |  |
| תשובה מילולית | multilineText |  |
| מסמכים | multipleAttachments |  |
| סכום | currency |  |
| הערות | multilineText |  |
| לקוח1 | multipleRecordLinks | → לקוחות |
| לקוח | multipleRecordLinks | → לקוחות |
| סוג בירור | singleLineText |  |
| recordId | formula | formula |
| תאריך יצירה | createdTime |  |
| תאריך עדכון | lastModifiedTime |  |
| כותרת | singleLineText |  |
| יעד לטיפול | multipleRecordLinks | → עובדי משרד |
| מזהה שאלה בקובץ | number |  |
| מזהה לקוח | multipleLookupValues | record_id via לקוח |
| אימייל (from יעד לטיפול) | multipleLookupValues | אימייל via יעד לטיפול |
| שם (from יעד לטיפול) | multipleLookupValues | שם via יעד לטיפול |
| האם נשלח למשרד | checkbox |  |
| האם לשלוח למשרד | formula | formula |
| אימייל (from אחראי ) (from לקוח) | multipleLookupValues | אימייל (from אחראי ) via לקוח |
| אימייל (from אחראי ) (from לקוח) 2 | multipleLookupValues | אימייל (from אחראי ) via לקוח |
| שם לקוח | multipleLookupValues | כינוי העסק via לקוח |
| קישור לרשומה | formula | formula |
| Records (Nested) | multipleRecordLinks | → בירורים כלליים |
| From field: Records (Nested) | multipleRecordLinks | → בירורים כלליים |
| Open URL | button |  |
| id | formula | formula |
| סטטוס סגירה בכוח | singleLineText |  |
| שם העובד של הלקוח | singleLineText |  |

## רשימת לקוחות

`tblMbQMqiUdcq0TDx`, primary field: **Id**

| Field | Type | Details |
|---|---|---|
| Id | autoNumber |  |
| לקוחות | multipleRecordLinks | → לקוחות |
| כינוי העסק (from לקוחות) | multipleLookupValues | כינוי העסק via לקוחות |
| כרטיס לקוח (from לקוחות) | multipleLookupValues | כרטיס לקוח via לקוחות |
| דואר אלקטרוני (from לקוחות) | multipleLookupValues | דואר אלקטרוני via לקוחות |

## בירורים הוצאות שוטפות

`tblYvwyOt8ZhwyKgt`, primary field: **מזהה**

| Field | Type | Details |
|---|---|---|
| מזהה | autoNumber |  |
| סוג | singleSelect | פנימי, חיצוני, A1zakidiab2016@gmail.com, `${item.recordId}`, סגור, אס.אמ.אס. סרביס מנג'מנט סיסטמס בעמ |
| סטטוס | singleSelect | פתוח, נשלח (פתוח), סגור, פנימי, נסגר על ידי קלוד, אס.אמ.אס. סרביס מנג'מנט סיסטמס בעמ |
| האם חייב מסמך | singleSelect | כן, לא |
| האם חייב תשובה מילולית | singleSelect | כן, לא |
| מספר כרטיס | singleLineText |  |
| שם ספק | singleLineText |  |
| תאריך | date |  |
| פרטים | singleLineText |  |
| הערות | multilineText |  |
| מסמכים | multipleAttachments |  |
| תשובה מילולית | multilineText |  |
| חובה | currency |  |
| זכות | currency |  |
| תנועה | singleLineText |  |
| מופנה ל- | singleLineText |  |
| תאריך עדכון | dateTime |  |
| זמן עדכון | lastModifiedTime |  |
| לקוח | multipleRecordLinks | → לקוחות |
| IDa | formula | formula |
| מזהה לקוח | multipleLookupValues | record_id via לקוח |
| שם (from יעד לטיפול) | multipleLookupValues | שם via יעד לטיפול |
| יעד לטיפול | multipleRecordLinks | → עובדי משרד |
| כותרת | singleLineText |  |
| מנה | singleLineText |  |
| ס"ת | singleLineText |  |
| חשבון נגדי | singleLineText |  |
| אסמ. | singleLineText |  |
| אס.2 | singleLineText |  |
| ערך | date |  |
| ת.נוסף 3 | date |  |
| יתרה | currency |  |
| אימייל (from אחראי ) (from לקוח) | multipleLookupValues | אימייל (from אחראי ) via לקוח |
| אימייל (from יעד לטיפול) | multipleLookupValues | אימייל via יעד לטיפול |
| האם נשלח למשרד | checkbox |  |
| האם לשלוח למשרד | formula | formula |
| לקוח copy | singleLineText |  |
| סגור? | formula | formula |
| קישור לרשומה | formula | formula |
| Field 39 | singleLineText |  |
| Created | createdTime |  |
| Subtasks | multipleRecordLinks | → בירורים הוצאות שוטפות |
| From field: Subtasks | multipleRecordLinks | → בירורים הוצאות שוטפות |
| האם לשלוח למשרד copy | formula | formula |
| לקוחות | multipleRecordLinks | → לקוחות |
| סטטוס סגירה בכוח | singleLineText |  |
| Created 2 | createdTime |  |
| בדיקה אוטומטית | multilineText |  |

## עובדי משרד

`tblHo4ptN9mViBrIR`, primary field: **שם**

| Field | Type | Details |
|---|---|---|
| שם | singleLineText |  |
| אימייל | email |  |
| בירורים כלליים | multipleRecordLinks | → בירורים כלליים |
| בירורים הוצאות שוטפות | multipleRecordLinks | → בירורים הוצאות שוטפות |
| לקוחות | multipleRecordLinks | → לקוחות |
| משימות | singleLineText |  |
| מזהה | formula | formula |
| Calculation | formula | formula |

## עובדי לקוחות

`tbl7xXIohwg5pMNUp`, primary field: **מספר עובד**

| Field | Type | Details |
|---|---|---|
| מספר עובד | autoNumber |  |
| שם פרטי | singleLineText |  |
| תעודת זהות | singleLineText |  |
| תקופת דיווח (from לקוח מקושר) | multipleLookupValues | תקופה נוכחית via לקוח מקושר |
| סטטוס תקופה (from לקוח מקושר) | multipleLookupValues | סטטוס תקופה via לקוח מקושר |
| תקופת דיווח (from לקוח מקושר) 2 | multipleLookupValues | תקופת דיווח via לקוח מקושר |
| שם משפחה | singleLineText |  |
| סטטוס עובד | singleSelect | עובד, לא עובד |
| לקוח מקושר | multipleRecordLinks | → לקוחות |
| אחראי  (from לקוח מקושר) | multipleLookupValues | אחראי  via לקוח מקושר |
| כינוי העסק (from לקוח מקושר) | multipleLookupValues | כינוי העסק via לקוח מקושר |
| record_id (from לקוח מקושר) | multipleLookupValues | record_id via לקוח מקושר |
| תאריך התחלה | date |  |
| מחלקה | singleLineText |  |
| פנסיה | multipleAttachments |  |
| הסכם העסקה | multipleAttachments |  |
| RECORD_ID | formula | formula |
| טבלת תלושי שכר | multipleRecordLinks | → טבלת תלושי שכר |
| תאריך עזיבה | date |  |
| סיבת עזיבה | multilineText |  |
| האם מילא 101 | checkbox |  |
| דיווחים חודשיים | multipleRecordLinks | → דיווחים חודשיים |
| 161 | multipleAttachments |  |
| הערות רואה חשבון | multilineText |  |
| CreatedAt | createdTime |  |
| חוסרים | multipleRecordLinks | → חוסרים |
| האם צריך טופס עזר ל161 | multipleLookupValues | האם צריך טופס עזר ל161? via לקוח מקושר |
| דואר אלקטרוני (from לקוח מקושר) | multipleLookupValues | דואר אלקטרוני via לקוח מקושר |
| אימייל (from אחראי ) (from לקוח מקושר) | multipleLookupValues | אימייל (from אחראי ) via לקוח מקושר |
| משימות | multipleRecordLinks | → משימות |
| דיווחים חודשיים copy | singleLineText |  |
| סטטוס פנסיה פעילה | singleLineText |  |
| employerRecordId | multipleLookupValues | record_id via לקוח מקושר |
| גרסה | number |  |
| עדכון אחרון | dateTime |  |
| משתמש מעדכן | singleLineText |  |

## משימות

`tblSuEHc2ZHJVqyvg`, primary field: **תאריך יצירה**

| Field | Type | Details |
|---|---|---|
| תאריך יצירה | dateTime |  |
| סטטוס | singleSelect | לא התחיל, בתהליך, בוצע |
| המשימה | multilineText |  |
| אחראי | multipleLookupValues | אחראי  via לקוח |
| לקוח | multipleRecordLinks | → לקוחות |
| דדליין | date |  |
| עובד | multipleRecordLinks | → עובדי לקוחות |
| שם פרטי (from עובד) | multipleLookupValues | שם פרטי via עובד |
| שם משפחה (from עובד) | multipleLookupValues | שם משפחה via עובד |
| אימייל אחראי | multipleLookupValues | אימייל (from אחראי ) via לקוח |
| recordId | formula | formula |
| תקופת דיווח | multipleRecordLinks | → תקופות דיווח |
| סטטוס תקופה (from תקופת דיווח) | multipleLookupValues | סטטוס תקופה via תקופת דיווח |
| חודש דיווח (from תקופת דיווח) | multipleLookupValues | חודש דיווח via תקופת דיווח |
| קישור לדיווח התקופתי הרלוונטי | multipleRecordLinks | → דיווחים חודשיים |
| הערות למשכורת | multilineText |  |
| האם השלח למשרד | checkbox |  |
| דיווחים חודשיים copy | multipleRecordLinks | → חוסרים |

## עמודות

`tblufbJ9SlOlH9zMB`, primary field: **RecordId**

| Field | Type | Details |
|---|---|---|
| RecordId | formula | formula |
| האם מוצגת | checkbox |  |
| לקוח | multipleRecordLinks | → לקוחות |
| record_id (from לקוח) | multipleLookupValues | record_id via לקוח |
| שם העמודה | multipleRecordLinks | → שמות עמודות |
| column record Id | multipleLookupValues | Calculation via שם העמודה |
| שם של העמודה | multipleLookupValues | שם העמודה via שם העמודה |

## טבלת תלושי שכר

`tblY6yBqKXdnP7lCj`, primary field: **תאריך**

| Field | Type | Details |
|---|---|---|
| תאריך | date |  |
| תלוש - קובץ | multipleAttachments |  |
| עובד | multipleRecordLinks | → עובדי לקוחות |
| RECORD_ID (from עובד) | multipleLookupValues | RECORD_ID via עובד |
| עובדי לקוחות copy | singleLineText |  |
| שם העובד | multipleLookupValues | שם פרטי via עובד |
| עובדי לקוחות copy | singleLineText |  |

## שמות עמודות

`tblIi5fdVDwYGL2wE`, primary field: **שם העמודה**

| Field | Type | Details |
|---|---|---|
| שם העמודה | singleLineText |  |
| עמודות | multipleRecordLinks | → עמודות |
| recordId | singleLineText |  |
| Calculation | formula | formula |

## סיבות עזיבה

`tblsy3zYzZIjwcQ1N`, primary field: **Reason**

| Field | Type | Details |
|---|---|---|
| Reason | singleLineText |  |

## תקופות דיווח

`tblnDNKqwakYGQGOe`, primary field: **מזהה**

| Field | Type | Details |
|---|---|---|
| מזהה | autoNumber |  |
| מעסיק | multipleRecordLinks | → לקוחות |
| אחראי מעסיק | multipleLookupValues | אחראי  via מעסיק |
| מייל מעסיק | multipleLookupValues | דואר אלקטרוני via מעסיק |
| מספר חברה | multipleLookupValues | מספר חברה via מעסיק |
| employerRecordId | multipleLookupValues | record_id via מעסיק |
| כינוי העסק (from מעסיק) | multipleLookupValues | כינוי העסק via מעסיק |
| חודש דיווח | date |  |
| סטטוס תקופה | singleSelect | פתוחה, סגורה |
| תקופת הדיווח הבאה | formula | formula |
| דיווחים חודשיים | multipleRecordLinks | → דיווחים חודשיים |
| recordId | formula | formula |
| קבצים כלליים | multipleAttachments |  |
| משימות | multipleRecordLinks | → משימות |
| דוח תמחיר | multipleAttachments |  |
| טופס 102 | multipleAttachments |  |
| תלוש לבן | multipleAttachments |  |
| אחוזים קופות גמל | multipleAttachments |  |
| סטטוס מעסיק | multipleLookupValues | סטטוס מעסיק via מעסיק |
| created time | createdTime |  |
| Fireberry ID | multipleLookupValues | Fireberry ID via מעסיק |
| lowerCaseEmail | multipleLookupValues | lowerCaseEmail via מעסיק |
| דיווחים חודשיים copy | multipleRecordLinks | → חוסרים |
| פעיל או לא | multipleLookupValues | פעיל או לא via מעסיק |

## דיווחים חודשיים

`tbllBNXOrsicm2vHD`, primary field: **מזהה**

| Field | Type | Details |
|---|---|---|
| מזהה | autoNumber |  |
| recordId | formula | formula |
| עובד | multipleRecordLinks | → עובדי לקוחות |
| אחראי מעסיק | multipleLookupValues | אחראי מעסיק via תקופת דיווח |
| מספר עובד (from עובד) | multipleLookupValues | מספר עובד via עובד |
| employerEmail | multipleLookupValues | דואר אלקטרוני (from לקוח מקושר) via עובד |
| employerRecordId | multipleLookupValues | record_id (from לקוח מקושר) via עובד |
| תעודת זהות | multipleLookupValues | תעודת זהות via עובד |
| שם פרטי (from עובד) | multipleLookupValues | שם פרטי via עובד |
| שם משפחה (from עובד) | multipleLookupValues | שם משפחה via עובד |
| חודש דיווח (from תקופת דיווח) | multipleLookupValues | חודש דיווח via תקופת דיווח |
| תקופת דיווח | multipleRecordLinks | → תקופות דיווח |
| סטטוס עובד (from עובד) | multipleLookupValues | סטטוס עובד via עובד |
| employeeRecordId | multipleLookupValues | RECORD_ID via עובד |
| כינוי העסק (from לקוח מקושר) (from עובד) | multipleLookupValues | כינוי העסק (from לקוח מקושר) via עובד |
| תאריך התחלה (from עובד) | multipleLookupValues | תאריך התחלה via עובד |
| periodRecordId | multipleLookupValues | recordId via תקופת דיווח |
| periodStatus | multipleLookupValues | סטטוס תקופה via תקופת דיווח |
| תעריף חודשי / שעתי | multilineText |  |
| תעריף חודשי / שעתי חובה | checkbox |  |
| נסיעות חודשי | multilineText |  |
| נסיעות חודשי חובה | checkbox |  |
| נסיעות יומי | multilineText |  |
| נסיעות יומי חובה | checkbox |  |
| שעות נוספות גלובליות | multilineText |  |
| שעות נוספות גלובליות חובה | checkbox |  |
| ימי עבודה בפועל | multilineText |  |
| ימי עבודה בפועל חובה | checkbox |  |
| שעות עבודה בפועל | multilineText |  |
| שעות עבודה בפועל חובה | checkbox |  |
| האם דיווחים מעודכנים במערכת הנוכחות | multilineText |  |
| האם דיווחים מעודכנים במערכת הנוכחות חובה | checkbox |  |
| האם צורף דוח נוכחות / מלווה | multilineText |  |
| האם צורף דוח נוכחות / מלווה חובה | checkbox |  |
| בונוס 1 כמות | number |  |
| בונוס 1 סכום | number |  |
| בונוס 1 הערות | multilineText |  |
| בונוס 2 כמות | number |  |
| בונוס 2 סכום | number |  |
| בונוס 2 הערות | multilineText |  |
| בונוס 3 הערות | multilineText |  |
| בונוס 3 כמות | number |  |
| בונוס 3 סכום | number |  |
| בונוס 4 הערות | multilineText |  |
| שווי ארוחות | multilineText |  |
| שווי ארוחות חובה | checkbox |  |
| שווי נייד | multilineText |  |
| שווי נייד חובה | checkbox |  |
| שווי רכב | multilineText |  |
| שווי רכב חובה | checkbox |  |
| שווי מתנה | multilineText |  |
| שווי מתנה חובה | checkbox |  |
| שי לחג | multilineText |  |
| שי לחג חובה | checkbox |  |
| ימי מחלה | multilineText |  |
| ימי מחלה חובה | checkbox |  |
| ימי חופשה | multilineText |  |
| ימי חופשה חובה | checkbox |  |
| ימי חג | multilineText |  |
| ימי חג חובה | checkbox |  |
| יום מיוחד | multilineText |  |
| יום מיוחד חובה | checkbox |  |
| יום מיוחד.1 | multilineText |  |
| יום מיוחד.1 חובה | checkbox |  |
| יום מיוחד.2 | multilineText |  |
| יום מיוחד.2 חובה | checkbox |  |
| החזר הוצאות | multilineText |  |
| החזר הוצאות חובה | checkbox |  |
| הלוואה לעובד | multilineText |  |
| הלוואה לעובד חובה | checkbox |  |
| עמלת מכירות | multilineText |  |
| עמלת מכירות חובה | checkbox |  |
| אחזקת רכב (ק"מ) | multilineText |  |
| אחזקת רכב (ק"מ) חובה | checkbox |  |
| הפקות | multilineText |  |
| הפקות חובה | checkbox |  |
| הפעלות | multilineText |  |
| הפעלות חובה | checkbox |  |
| תוספת ניהול | multilineText |  |
| תוספת ניהול חובה | checkbox |  |
| שעות נוספות 100% | multilineText |  |
| שעות נוספות 100% חובה | checkbox |  |
| שעות נוספות 125% | multilineText |  |
| שעות נוספות 125% חובה | checkbox |  |
| שעות נוספות 150% | multilineText |  |
| שעות נוספות 150% חובה | checkbox |  |
| שעות נוספות 175% | multilineText |  |
| שעות נוספות 175% חובה | checkbox |  |
| שעות נוספות 200% | multilineText |  |
| שעות נוספות 200% חובה | checkbox |  |
| חצי יום חופשה | multilineText |  |
| חצי יום חופשה חובה | checkbox |  |
| מילואים | multilineText |  |
| מילואים חובה | checkbox |  |
| הבראה | multilineText |  |
| הבראה חובה | checkbox |  |
| שונות | multilineText |  |
| שונות חובה | checkbox |  |
| רכיב שכר 1 | multilineText |  |
| רכיב שכר 1 חובה | checkbox |  |
| רכיב שכר 2 | multilineText |  |
| רכיב שכר 2 חובה | checkbox |  |
| רכיב שכר 3 | multilineText |  |
| רכיב שכר 3 חובה | checkbox |  |
| רכיב שכר 4 | multilineText |  |
| רכיב שכר 4 חובה | checkbox |  |
| רכיב שכר 5 | multilineText |  |
| רכיב שכר 5 חובה | checkbox |  |
| רכיב שכר 6 | multilineText |  |
| רכיב שכר 6 חובה | checkbox |  |
| רכיב שכר 7 | multilineText |  |
| רכיב שכר 7 חובה | checkbox |  |
| שעות היעדרות | multilineText |  |
| שעות היעדרות חובה | checkbox |  |
| ימי העדרות | multilineText |  |
| ימי העדרות חובה | checkbox |  |
| שעות הנקה | multilineText |  |
| שעות הנקה חובה | checkbox |  |
| שעות הריון | multilineText |  |
| שעות הריון חובה | checkbox |  |
| ימי אבל | multilineText |  |
| ימי אבל חובה | checkbox |  |
| שם פרטי | formula | formula |
| שם משפחה | formula | formula |
| בונוס 4 כמות | number |  |
| בונוס 4 סכום | number |  |
| בונוס 5 הערות | multilineText |  |
| בונוס 5 כמות | number |  |
| בונוס 5 סכום | number |  |
| מסמכים | multipleAttachments |  |
| אימייל אחראי | multipleLookupValues | אימייל (from אחראי ) (from לקוח מקושר) via עובד |
| להפסיק לנדנד לגבי מילואים? | checkbox |  |
| אישור מילואים | multipleAttachments |  |
| החזר הוצאות מסמכים | multipleAttachments |  |
| שווי ארוחות מסמכים | multipleAttachments |  |
| ימי מחלה מסמכים | multipleAttachments |  |
| שינוי בשכר בסיס מסמכים | multipleAttachments |  |
| להפסיק לנדנד לגבי החזר הוצאות? | checkbox |  |
| להפסיק לנדנד לגבי שווי ארוחות? | checkbox |  |
| להפסיק לנדנד לגבי ימי מחלה? | checkbox |  |
| להפסיק לנדנד לגבי הסכם העסקה? | checkbox |  |
| האם השכר השתנה (אוטומטי) | checkbox |  |
| הערות | multilineText |  |
| הערות רואה חשבון | multilineText |  |
| משימות | multipleRecordLinks | → משימות |
| CreatedAt | createdTime |  |
| lowerCaseEmail | multipleLookupValues | lowerCaseEmail via תקופת דיווח |
| חסר אישור מילואים | formula | formula |
| חסר הסכם שכר | formula | formula |
| חסר אישור ימי מחלה | formula | formula |
| חסר אישור שווי ארוחות | formula | formula |
| חסר אישור החזר הוצאות | formula | formula |
| פנסיה | multipleLookupValues | פנסיה via עובד |
| חסר פנסיה | formula | formula |
| האם צריך טופס עזר ל161 | multipleLookupValues | האם צריך טופס עזר ל161 via עובד |
| שעות שבת | number |  |
| שעות 100% | number |  |
| שעות שבת חובה | checkbox |  |
| שעות 100% חובה | checkbox |  |
| תאריך עזיבה | multipleLookupValues | תאריך עזיבה via עובד |
| תאריך עזיבה (from עובד) | multipleLookupValues | תאריך עזיבה via עובד |

## משוב לקוחות

`tbl1VLpRpdaTanSgU`, primary field: **נושא המשוב**

| Field | Type | Details |
|---|---|---|
| נושא המשוב | singleLineText |  |
| לקוח | multipleRecordLinks | → לקוחות |
| תאריך המשוב | date |  |
| סוג משוב | singleSelect | חיובי, שלילי, ניטרלי |
| פרטי המשוב | multilineText |  |
| דירוג שביעות רצון | number |  |
| מגיב | singleLineText |  |
| ערוץ קבלת המשוב | singleSelect | אימייל, טלפון, פגישה, טופס, אחר |
| מאפיינים עיקריים | multilineText |  |
| סיכום אוטומטי של המשוב | aiText |  |
| ניתוח סנטימנט אוטומטי | aiText |  |
| המלצות לשיפור | aiText |  |

## חוסרים

`tblwicHQs93GvOgLf`, primary field: **מזהה**

| Field | Type | Details |
|---|---|---|
| מזהה | autoNumber |  |
| recordId | formula | formula |
| אחראי מעסיק | multipleLookupValues | אחראי מעסיק via תקופת דיווח |
| עובד | multipleRecordLinks | → עובדי לקוחות |
| חוסרים | formula | formula |
| תאריך התחלה (from עובד) | multipleLookupValues | תאריך התחלה via עובד |
| סטטוס עובד (from עובד) | multipleLookupValues | סטטוס עובד via עובד |
| כינוי העסק (from לקוח מקושר) (from עובד) | multipleLookupValues | כינוי העסק (from לקוח מקושר) via עובד |
| employeeRecordId | multipleLookupValues | RECORD_ID via עובד |
| תעודת זהות | multipleLookupValues | תעודת זהות via עובד |
| שם פרטי (from עובד) | multipleLookupValues | שם פרטי via עובד |
| שם פרטי (from עובד) copy | multipleLookupValues | שם פרטי via עובד |
| שם משפחה (from עובד) | multipleLookupValues | שם משפחה via עובד |
| employerRecordId | multipleLookupValues | record_id (from לקוח מקושר) via עובד |
| employerEmail | multipleLookupValues | דואר אלקטרוני (from לקוח מקושר) via עובד |
| מספר עובד (from עובד) 2 | multipleLookupValues | מספר עובד via עובד |
| חודש דיווח (from תקופת דיווח) | multipleLookupValues | חודש דיווח via תקופת דיווח |
| תקופת דיווח | multipleRecordLinks | → תקופות דיווח |
| periodRecordId | multipleLookupValues | recordId via תקופת דיווח |
| periodStatus | multipleLookupValues | סטטוס תקופה via תקופת דיווח |
| תעריף חודשי / שעתי | multilineText |  |
| תעריף חודשי / שעתי חובה | checkbox |  |
| נסיעות חודשי | multilineText |  |
| נסיעות חודשי חובה | checkbox |  |
| נסיעות יומי | multilineText |  |
| נסיעות יומי חובה | checkbox |  |
| שעות נוספות גלובליות | multilineText |  |
| שעות נוספות גלובליות חובה | checkbox |  |
| ימי עבודה בפועל | multilineText |  |
| ימי עבודה בפועל חובה | checkbox |  |
| שעות עבודה בפועל | multilineText |  |
| שעות עבודה בפועל חובה | checkbox |  |
| האם דיווחים מעודכנים במערכת הנוכחות | multilineText |  |
| האם דיווחים מעודכנים במערכת הנוכחות חובה | checkbox |  |
| האם צורף דוח נוכחות / מלווה | multilineText |  |
| האם צורף דוח נוכחות / מלווה חובה | checkbox |  |
| בונוס 1 כמות | number |  |
| בונוס 1 סכום | number |  |
| בונוס 1 הערות | multilineText |  |
| בונוס 1 חובה | checkbox |  |
| בונוס 2 כמות | number |  |
| בונוס 2 סכום | number |  |
| בונוס 2 הערות | multilineText |  |
| בונוס 2 חובה | checkbox |  |
| בונוס 3 הערות | multilineText |  |
| בונוס 3 כמות | number |  |
| בונוס 3 סכום | number |  |
| בונוס 3 חובה | checkbox |  |
| בונוס 4 הערות | multilineText |  |
| בונוס 4 חובה | checkbox |  |
| שווי ארוחות | multilineText |  |
| שווי ארוחות חובה | checkbox |  |
| שווי נייד | multilineText |  |
| שווי נייד חובה | checkbox |  |
| שווי רכב | multilineText |  |
| שווי רכב חובה | checkbox |  |
| שווי מתנה | multilineText |  |
| שווי מתנה חובה | checkbox |  |
| שי לחג | multilineText |  |
| שי לחג חובה | checkbox |  |
| ימי מחלה | multilineText |  |
| ימי מחלה חובה | checkbox |  |
| ימי חופשה | multilineText |  |
| ימי חופשה חובה | checkbox |  |
| ימי חג | multilineText |  |
| ימי חג חובה | checkbox |  |
| יום מיוחד | multilineText |  |
| יום מיוחד חובה | checkbox |  |
| יום מיוחד.1 | multilineText |  |
| יום מיוחד.1 חובה | checkbox |  |
| יום מיוחד.2 | multilineText |  |
| יום מיוחד.2 חובה | checkbox |  |
| החזר הוצאות | multilineText |  |
| החזר הוצאות חובה | checkbox |  |
| הלוואה לעובד | multilineText |  |
| הלוואה לעובד חובה | checkbox |  |
| עמלת מכירות | multilineText |  |
| עמלת מכירות חובה | checkbox |  |
| אחזקת רכב (ק"מ) | multilineText |  |
| אחזקת רכב (ק"מ) חובה | checkbox |  |
| הפקות | multilineText |  |
| הפקות חובה | checkbox |  |
| הפעלות | multilineText |  |
| הפעלות חובה | checkbox |  |
| תוספת ניהול | multilineText |  |
| תוספת ניהול חובה | checkbox |  |
| שעות נוספות 100% | multilineText |  |
| שעות נוספות 100% חובה | checkbox |  |
| שעות נוספות 125% | multilineText |  |
| שעות נוספות 125% חובה | checkbox |  |
| שעות נוספות 150% | multilineText |  |
| שעות נוספות 150% חובה | checkbox |  |
| שעות נוספות 175% | multilineText |  |
| שעות נוספות 175% חובה | checkbox |  |
| שעות נוספות 200% | multilineText |  |
| שעות נוספות 200% חובה | checkbox |  |
| חצי יום חופשה | multilineText |  |
| חצי יום חופשה חובה | checkbox |  |
| מילואים | multilineText |  |
| מילואים חובה | checkbox |  |
| הבראה | multilineText |  |
| הבראה חובה | checkbox |  |
| שונות | multilineText |  |
| שונות חובה | checkbox |  |
| רכיב שכר 1 | multilineText |  |
| רכיב שכר 1 חובה | checkbox |  |
| רכיב שכר 2 | multilineText |  |
| רכיב שכר 2 חובה | checkbox |  |
| רכיב שכר 3 | multilineText |  |
| רכיב שכר 3 חובה | checkbox |  |
| רכיב שכר 4 | multilineText |  |
| רכיב שכר 4 חובה | checkbox |  |
| רכיב שכר 5 | multilineText |  |
| רכיב שכר 5 חובה | checkbox |  |
| רכיב שכר 6 | multilineText |  |
| רכיב שכר 6 חובה | checkbox |  |
| רכיב שכר 7 | multilineText |  |
| רכיב שכר 7 חובה | checkbox |  |
| שעות היעדרות | multilineText |  |
| שעות היעדרות חובה | checkbox |  |
| ימי העדרות | multilineText |  |
| ימי העדרות חובה | checkbox |  |
| שעות הנקה | multilineText |  |
| שעות הנקה חובה | checkbox |  |
| שעות הריון | multilineText |  |
| שעות הריון חובה | checkbox |  |
| ימי אבל | multilineText |  |
| ימי אבל חובה | checkbox |  |
| בונוס 4 כמות | number |  |
| בונוס 4 סכום | number |  |
| בונוס 5 הערות | multilineText |  |
| בונוס 5 כמות | number |  |
| בונוס 5 סכום | number |  |
| מסמכים | multipleAttachments |  |
| להפסיק לנדנד לגבי מילואים? | checkbox |  |
| אישור מילואים | multipleAttachments |  |
| החזר הוצאות מסמכים | multipleAttachments |  |
| שווי ארוחות מסמכים | multipleAttachments |  |
| ימי מחלה מסמכים | multipleAttachments |  |
| שינוי בשכר בסיס מסמכים | multipleAttachments |  |
| להפסיק לנדנד לגבי החזר הוצאות? | checkbox |  |
| להפסיק לנדנד לגבי שווי ארוחות? | checkbox |  |
| להפסיק לנדנד לגבי ימי מחלה? | checkbox |  |
| להפסיק לנדנד לגבי הסכם העסקה? | checkbox |  |
| האם השכר השתנה (אוטומטי) | checkbox |  |
| הערות | multilineText |  |
| הערות חובה | checkbox |  |
| הערות רואה חשבון | multilineText |  |
| משימות | multipleRecordLinks | → משימות |
| בונוס 5 חובה | checkbox |  |
| CreatedAt | createdTime |  |
| lowerCaseEmail | multipleLookupValues | lowerCaseEmail via תקופת דיווח |
| לקוחות | singleLineText |  |
| חסר אישור מילואים | formula | formula |
| חסר הסכם שכר | formula | formula |
| חסר אישור ימי מחלה | formula | formula |
| חסר אישור שווי ארוחות | formula | formula |
| חסר אישור החזר הוצאות | formula | formula |
| פנסיה | multipleLookupValues | פנסיה via עובד |
| חסר פנסיה | formula | formula |
| האם צריך טופס עזר ל161 | multipleLookupValues | האם צריך טופס עזר ל161 via עובד |
| כמות תווים בחוסרים | formula | formula |

## לוגים

`tbliBb52AuH08wO5z`, primary field: **מזהה**

| Field | Type | Details |
|---|---|---|
| מזהה | autoNumber |  |
| לקוח | multipleRecordLinks | → לקוחות |
| תאריך | dateTime |  |
| נושא המייל | singleLineText |  |
| תוכן המייל | richText |  |
| שם הסנריו במייק | singleLineText |  |
| תוכן מייל טקסטואלי | aiText |  |
| ריצה במייק | url |  |
