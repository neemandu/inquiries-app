// index.mjs
import https from 'https';
import { URL, URLSearchParams } from 'url';

const BASE_ID = 'appSs9FQQJtw6VYQV';
const API_KEY = process.env.AIRTABLE_API_KEY;
const API_HOST = 'api.airtable.com';

function airtableGet(path, params = {}) {
  const url = new URL(`https://${API_HOST}/v0/${BASE_ID}/${path}`);
  if (Object.keys(params).length) {
    url.search = new URLSearchParams(params).toString();
  }
  console.log(url);
  const options = {
    method: 'GET',
    headers: { Authorization: `Bearer ${API_KEY}` }
  };
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // The body isn't logged: the employer record includes the "סיסמה" field and other private details
        try { console.log('Response status:', res.statusCode, 'bytes:', data.length);
        resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

export const handler = async (event) => {
  try {
    const employerRecordId = event.queryStringParameters?.employerRecordId;
    if (!employerRecordId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing employerRecordId' }) };
    }

    // 1) Fetch employer → get תקופה נוכחית
    const empList = await airtableGet('tblfKCMT4yWj11uu3', {
      filterByFormula: `{record_id}='${employerRecordId}'`
    });

    if (!empList.records?.length) {
      throw new Error(`No employer found with record_id = ${employerRecordId}`);
    }
    const employer = empList.records[0];

    const lookupValues = employer.fields['תקופה נוכחית'];
    if (!Array.isArray(lookupValues) || lookupValues.length === 0) {
     throw new Error(`Lookup field 'תקופה נוכחית' is empty on record ${employer.id}`);
    }

    const periodRecordId = lookupValues[0];
    console.log("periodRecordId: " + periodRecordId);
    console.log("employerRecordId: " + employerRecordId);
    const startDate = '2025-07-29';
    // 2) Fetch employees missing פנסיה or הסכם העסקה
    const empFilter = `
      AND(
        {record_id (from לקוח מקושר)} = '${employerRecordId}',
        OR(
          {פנסיה} = "",
          {הסכם העסקה} = "",
          {האם מילא 101} = 0,
  {סטטוס פנסיה פעילה} = "בבדיקה"
        ),
        OR(
          {סטטוס עובד} = "עובד",
          AND(
            {סטטוס עובד} = "לא עובד",
            {האם צריך טופס עזר ל161} = 1
          )
        )
      )
    `.replace(/\s+/g,' ');
    const empRes = await airtableGet('tbl7xXIohwg5pMNUp', { filterByFormula: empFilter });
    console.log(empRes.records?.length);
    const empReports = empRes.records || [];
    const empMap = {};
    (empRes.records || []).forEach(r => empMap[r.id] = r.fields);

    // 3) Fetch monthly reports with missing docs
    const rptFilter = `
      AND(
        CreatedAt > '${startDate}',
        {employerRecordId} = '${employerRecordId}',
        {periodRecordId} = '${periodRecordId}',
        OR(
          AND({מילואים} != '', {אישור מילואים} = ""),
          AND({החזר הוצאות} != '', {החזר הוצאות מסמכים} = ""),
          AND({שווי ארוחות} != '', {שווי ארוחות מסמכים} = ""),
          AND({ימי מחלה} != '', {ימי מחלה מסמכים} = ""),
          AND({האם השכר השתנה (אוטומטי)}, {שינוי בשכר בסיס מסמכים} = '')
        ),
        OR(
          {סטטוס עובד (from עובד)} = "עובד",
          AND(
            {סטטוס עובד (from עובד)} = "לא עובד",
            {האם צריך טופס עזר ל161} = 1
          )
        )
      )
    `.replace(/\s+/g,' ');
    const rptRes = await airtableGet('tbllBNXOrsicm2vHD', { filterByFormula: rptFilter });
    const reports = rptRes.records || [];
    const result = [];
  // 1) For each employee missing pension or contract, emit one record per missing field:
  empReports.forEach(empRec => {
    const f = empRec.fields;
    const empId      = empRec.id;
    const firstName  = f['שם פרטי'] || '';
    const lastName   = f['שם משפחה'] || '';
    const idNumber   = f['תעודת זהות'] || '';
    const empComment = f['הערות רואה חשבון'] || '';
    const recordId = f['RECORD_ID'] || '';

    [
      { missing: !f['פנסיה'],       fileType: 'פנסיה'  },
      { missing: !f['הסכם העסקה'],  fileType: 'הסכם העסקה' },
      { missing: !f['האם מילא 101'],  fileType: 'טופס 101' },
      { missing: f['סטטוס פנסיה פעילה'] === 'בבדיקה', fileType: 'אישור פנסיה פעילה' }
    ].forEach(({ missing, fileType }) => {
      if (!missing) return;
      result.push({
        recordId,
        employeeRecordId:   empId,
        monthlyReportId:    null,
        firstName,
        lastName,
        idNumber,
        fileType,
        accountantComments: empComment
      });
    });
  });

   // 2) For each monthly‐report row, emit one record per missing doc condition:
  reports.forEach(rec => {
    const f = rec.fields;
    const linked = f['employeeRecordId'];
    const empId  = Array.isArray(linked) ? linked[0] : linked;
    const emp    = empMap[empId] || {};
    const firstName = emp['שם פרטי'] || (Array.isArray(f['שם פרטי (from עובד)']) ? f['שם פרטי (from עובד)'][0] : f['שם פרטי (from עובד)']) || '';
    const lastName  = emp['שם משפחה'] || (Array.isArray(f['שם משפחה (from עובד)']) ? f['שם משפחה (from עובד)'][0] : f['שם משפחה (from עובד)']) || '';
    const idNumber  = emp['תעודת זהות'] || (Array.isArray(f['תעודת זהות']) ? f['תעודת זהות'][0] : f['תעודת זהות']) || '';
    const empComment = emp['הערות רואה חשבון'] || f['הערות רואה חשבון']  || '';

    [
      { ok: f['מילואים'] && !f['אישור מילואים'],                   fileType: '3010'  },
      { ok: f['החזר הוצאות'] && !f['החזר הוצאות מסמכים'],           fileType: 'הוצאות' },
      { ok: f['שווי ארוחות'] && !f['שווי ארוחות מסמכים'],             fileType: 'שווי ארוחות'   },
      { ok: f['ימי מחלה'] && !f['ימי מחלה מסמכים'],                  fileType: 'אישור מחלה'    },
      { ok: f['האם השכר השתנה (אוטומטי)'] === true 
          && !f['שינוי בשכר בסיס מסמכים'],                          fileType: 'הסכם העסקה'  }
    ].forEach(({ ok, fileType }) => {
      if (!ok) return;
      result.push({
        employeeRecordId:   empId,
        monthlyReportId:    rec.id,
        firstName,
        lastName,
        idNumber,
        fileType,
        accountantComments: empComment
      });
    });
  });

  // 3) return
  return {
    statusCode: 200,
    headers:    { 'Content-Type': 'application/json' },
    body:       JSON.stringify(result)
  };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
