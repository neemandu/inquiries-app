import https from 'https';
import { URL } from 'url';

const AIRTABLE_BASE_ID  = 'appSs9FQQJtw6VYQV';
const AIRTABLE_API_KEY  = process.env.AIRTABLE_API_KEY;
const BASE_URL          = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

// Native HTTPS request helper
async function httpRequest(url, options = {}, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(new URL(url), options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          console.error(`HTTP ${res.statusCode} - ${data}`);
          return reject(new Error(`HTTP Error ${res.statusCode}`));
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Utility: GET a single Airtable record
async function getRecord(tableId, recordId) {
  console.log(`Fetching record ${recordId} from ${tableId}`);
  const url = `${BASE_URL}/${tableId}/${recordId}`;
  const options = {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` }
  };
  const data = await httpRequest(url, options);
  // Only the field count: the employer record includes the "סיסמה" field and other private details
  console.log(`Fetched record ${recordId} (${Object.keys(data.fields ?? {}).length} fields)`);
  return data.fields;
}

// Utility: LIST Airtable records with paging
async function listRecords(tableId, params) {
  console.log(`Listing records from ${tableId} with params`, params);
  let all = [];
  let offset;
  const baseUrl = new URL(`${BASE_URL}/${tableId}`);
  for (const [k, v] of Object.entries(params)) {
    if (k === 'sort') {
      v.forEach((s, i) => {
        baseUrl.searchParams.append(`sort[${i}][field]`, s.field);
        baseUrl.searchParams.append(`sort[${i}][direction]`, s.direction);
      });
    } else {
      baseUrl.searchParams.append(k, v);
    }
  }
  do {
    const pageUrl = offset ? `${baseUrl.toString()}&offset=${offset}` : baseUrl.toString();
    console.log(`Fetching page at ${pageUrl}`);
    const options = {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` }
    };
    const data = await httpRequest(pageUrl, options);
    console.log(`Page returned ${data.records.length} records`);
    all = all.concat(data.records);
    offset = data.offset;
  } while (offset);
  console.log(`Total records fetched: ${all.length}`);
  return all;
}

// Lambda handler
export const handler = async (event) => {
  console.log('Lambda invoked with event:', JSON.stringify(event));

  // 1) Extract recordId
  let recordId;
  try {
    console.log('Extracting recordId');
    if (event.queryStringParameters?.recordId) {
      recordId = event.queryStringParameters.recordId;
    } else {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      recordId = body.recordId || body.id || body.record_id;
    }
    if (!recordId) throw new Error('recordId not found');
    console.log('Determined recordId:', recordId);
  } catch (e) {
    console.error('Error extracting recordId:', e);
    return { statusCode: 400, body: JSON.stringify({ error: 'recordId is required' }) };
  }

  // 2) Fetch employer name
  let employer;
  try {
    console.log('Fetching employer');
    const fields = await getRecord('tblfKCMT4yWj11uu3', recordId);
    employer = fields['כינוי העסק'] || '';
    console.log('Employer name:', employer);
  } catch (err) {
    console.error('Failed fetching employer', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed fetching employer' }) };
  }

  // Construct filter formula
  const formula = `AND({מזהה לקוח}='${recordId}', {סטטוס}!='סגור', {סוג}='חיצוני')`;
  console.log('Using filter formula:', formula);

  // 3) General inquiries
  let general = [];
  try {
    console.log('Fetching general inquiries');
    const gen = await listRecords('tbl804qG1iPLVCvAG', {
      filterByFormula: formula,
      view: 'viwDR4cMm1wU23g0M',
      sort: [{ field: 'חן', direction: 'asc' }, { field: 'הערות', direction: 'desc' }]
    });
    general = gen.map(r => {
      console.log('Processing general record:', r.id);
      const f = r.fields;
      return {
        sum: Number(f['סכום'] || 0)
        .toLocaleString('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        }),
        chen: f['חן'] || '',
        docs: f['מסמכים'] || [],
        answer: f['תשובה מילולית'] || '',
        remarks: (f['הערות'] || '').replace(/"/g, ''),
        headline: f['כותרת'] || '',
        question: f['שאלה'] || '',
        recordId: r.id,
        supplier: Array.isArray(f['שם לקוח']) ? f['שם לקוח'].join(',') : f['שם לקוח'] || '',
        isDocMandatory: f['האם חייב מסמך'] === 'כן',
        isTextMandatory: f['האם חייב תשובה מילולית'] === 'כן'
      };
    });
    console.log(`General inquiries processed: ${general.length}`);
  } catch (err) {
    console.error('Failed fetching general inquiries', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed fetching general inquiries' }) };
  }

  // 4) Monthly inquiries
  let monthly = [];
  try {
    console.log('Fetching monthly inquiries');
    const mon = await listRecords('tblYvwyOt8ZhwyKgt', {
      filterByFormula: formula,
      view: 'viwp5M6XXUiiw88gU',
      sort: [{ field: 'חובה', direction: 'desc' }, { field: 'שם ספק', direction: 'desc' }]
    });
    monthly = mon.map(r => {
      const f = r.fields;
      return {
        supplier: f['שם ספק'] || '',
        asm: f['אסמ.'] || '',
        asm2: f['אס.2'] || '',
        date: f['תאריך'] || '',
        docs: f['מסמכים'] || [],
        hova: Number(f['חובה'] || 0)
        .toLocaleString('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        }),
        prev: Number(f['זכות'] || 0)
        .toLocaleString('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        }),
        answer: f['תשובה מילולית'] || '',
        details: (f['פרטים'] || '').replace(/"/g, ''),
        remarks: f['הערות'] || '',
        question: f['הערות'] || '',
        recordId: r.id,
        isDocsMandatory: f['האם חייב מסמך'] === 'כן',
        isTextMandatory: f['האם חייב תשובה מילולית'] === 'כן'
      };
    });
    console.log(`Monthly inquiries processed: ${monthly.length}`);
  } catch (err) {
    console.error('Failed fetching monthly inquiries', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed fetching monthly inquiries' }) };
  }

  console.log('Returning response');
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ employer, general, monthly })
  };
};
