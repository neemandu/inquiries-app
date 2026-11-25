import https from 'https';
import { URL } from 'url';

// Airtable config
const AIRTABLE_BASE_ID = 'appSs9FQQJtw6VYQV';
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const PERIODS_TABLE    = 'tblnDNKqwakYGQGOe';
const BASE_URL         = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

// --- HTTP helper ---
async function httpRequest(url, opts = {}, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(new URL(url), opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// --- List records with paging ---
async function listRecords(tableId, filterFormula = '') {
  let all = [], offset;
  const base = new URL(`${BASE_URL}/${tableId}`);
  if (filterFormula) base.searchParams.append('filterByFormula', filterFormula);

  do {
    const page = new URL(base.toString());
    if (offset) page.searchParams.set('offset', offset);

    const res = await httpRequest(page.toString(), {
      method: 'GET',
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });

    if (!res || !Array.isArray(res.records)) {
      throw new Error('Airtable list response malformed');
    }

    all.push(...res.records);
    offset = res.offset;
  } while (offset);

  return all;
}

// --- Lambda handler ---
export const handler = async (event) => {
  try {
    const employerId = event.queryStringParameters?.recordId;
    const formula = employerId ? `AND({employerRecordId}='${employerId.replace(/'/g, "\\'")}', {פעיל או לא}='פעיל')` : `{פעיל או לא}='פעיל'`;

    const rows = await listRecords(PERIODS_TABLE, formula);

    const byEmployer = new Map();

    for (const r of rows) {
      const f = r.fields || {};

      let empId = f['employerRecordId'];
      if (Array.isArray(empId)) empId = empId[0] || null;

      
      let empEmail = f['lowerCaseEmail'];
      if (Array.isArray(empEmail)) empEmail = empEmail[0] || null;

      let empName = f['כינוי העסק (from מעסיק)'];
      if (Array.isArray(empName)) empName = empName[0] || '';
      // 🔹 Strip newlines and trim spaces
      if (empName) empName = empName.replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();

      if (!empId) continue;

      const key = `${empId}::${empName}`;
      if (!byEmployer.has(key)) {
        byEmployer.set(key, {
          employerName: empName || '',
          employerRecordId: empId,
          employerEmail: empEmail,
          periods: []
        });
      }

      byEmployer.get(key).periods.push({
        date: f['חודש דיווח'] ?? null,
        recordId: r.id
      });
    }

    const result = Array.from(byEmployer.values());

    // 🔹 Sort periods descending by date
    result.forEach(emp => {
      emp.periods.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date) - new Date(a.date);
      });
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(result)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
