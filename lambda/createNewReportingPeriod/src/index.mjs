import https from 'https';
import { URL } from 'url';

// Airtable configuration
const AIRTABLE_BASE_ID = 'appSs9FQQJtw6VYQV';
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;
const PERIOD_TABLE = 'tblnDNKqwakYGQGOe';
const WORKER_TABLE = 'tbllBNXOrsicm2vHD';

// Fireberry configuration
const FIREBERRY_API_BASE = 'https://api.fireberry.com/v1';
const FIREBERRY_TOKEN     = '866ea83a-743c-43e0-9c33-325938119492';
const FIREBERRY_ORG_ID    = '1fdebb5f-069b-4e33-9466-d519a95f6e3a';

// Native HTTPS request helper
async function httpRequest(url, options = {}, body) {
  console.log('httpRequest:', options.method, url, body ? 'with body' : 'no body');
  return new Promise((resolve, reject) => {
    const req = https.request(new URL(url), options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('httpRequest response status:', res.statusCode, 'data length:', data.length);
        if (res.statusCode < 200 || res.statusCode >= 300) {
          console.error(`HTTP Error ${res.statusCode}: ${data}`);
          return reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
        try { resolve(JSON.parse(data)); } catch (err) { reject(err); }
      });
    });
    req.on('error', err => { console.error('httpRequest error:', err); reject(err); });
    if (body) { console.log('httpRequest writing body:', JSON.stringify(body)); req.write(JSON.stringify(body)); }
    req.end();
  });
}

async function searchFireberry(customerBusinessId) {
  const payload = JSON.stringify({
    query: `(pcfCustomerBusiness = ${customerBusinessId})`,
    fields: "*",
    sort_by: "pcfSalarysReportToDate",
    page_size: 500,
    sort_type: "desc",
    objecttype: "1001"
  });

  const options = {
    hostname: "api.fireberry.com",
    path: "/api/query",
    method: "POST",
    headers: {
      "tokenid": `${FIREBERRY_TOKEN}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload)
    }
  };

  const responseBody = await new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = "";
      res.on("data", chunk => (data += chunk));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(
            new Error(
              `Fireberry HTTP ${res.statusCode}: ${data?.slice(0, 500) || ""}`
            )
          );
        }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });

  // Parse and extract customobject1001id
  try {
    const json = JSON.parse(responseBody);
    const first =
      json?.data?.Data && Array.isArray(json.data.Data) && json.data.Data[0];
    return first?.customobject1001id ?? null;
  } catch (e) {
    throw new Error(`Failed to parse Fireberry response: ${e.message}`);
  }
}

/** Fireberry - patch a record’s field */
async function updateFireberryRecord(recordId) {
  if (!recordId) {
    throw new Error("recordId is required");
  }

  const payload = JSON.stringify({
    pcfsystemfield5: "1"
  });

  const options = {
    hostname: "api.powerlink.co.il",
    path: `/api/record/1001/${recordId}`,
    method: "PUT",
    headers: {
      "tokenid": `${FIREBERRY_TOKEN}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload)
    }
  };

  const responseBody = await new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = "";
      res.on("data", chunk => (data += chunk));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(
            new Error(
              `Update failed (HTTP ${res.statusCode}): ${data?.slice(0, 500)}`
            )
          );
        }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });

  try {
    const json = JSON.parse(responseBody);
    return json?.success === true;
  } catch (e) {
    throw new Error(`Failed to parse update response from fireberry: ${e.message}`);
  }
}


// List records with pagination
async function listRecords(tableId, filterFormula) {
  console.log(`listRecords: tableId=${tableId}, filterFormula=${filterFormula}`);
  let all = [], offset;
  const urlObj = new URL(`${BASE_URL}/${tableId}`);
  urlObj.searchParams.append('filterByFormula', filterFormula);

  do {
    const pageUrl = offset ? `${urlObj.toString()}&offset=${offset}` : urlObj.toString();
    console.log('Fetching pageUrl:', pageUrl);
    const res = await httpRequest(pageUrl, { method: 'GET', headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } });
    console.log(`Fetched ${res.records.length} records from ${tableId}`);
    all.push(...res.records);
    offset = res.offset;
  } while (offset);

  console.log(`Total records fetched from ${tableId}: ${all.length}`);
  return all;
}

// Update a single record
async function updateRecord(tableId, recordId, fields) {
  console.log(`updateRecord: table=${tableId}, record=${recordId}, fields=`, fields);
  const url = `${BASE_URL}/${tableId}/${recordId}`;
  const res = await httpRequest(url, { method: 'PATCH', headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' } }, { fields });
  console.log('updateRecord result:', res);
  return res;
}

// Create records in batches
async function createRecords(tableId, records) {
  console.log(`createRecords: table=${tableId}, totalRecords=${records.length}`);
  const url = `${BASE_URL}/${tableId}`;
  const opts = { method: 'POST', headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' } };
  const created = [];
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10).map(fields => ({ fields }));
    console.log(`Creating batch #${i/10 + 1}`, batch);
    const res = await httpRequest(url, opts, { records: batch });
    console.log(`Batch #${i/10 +1} created record IDs:`, res.records.map(r => r.id));
    created.push(...res.records);
  }
  console.log(`Total created records: ${created.length}`);
  return created;
}

// Get worker table fields metadata
async function getWorkerFields() {
  console.log('Fetching worker table metadata');
  const url = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`;
  const meta = await httpRequest(url, { method: 'GET', headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } });
  const tbl = meta.tables.find(t => t.id === WORKER_TABLE);
  if (!tbl) throw new Error(`Metadata for table ${WORKER_TABLE} not found`);
  const fieldsMeta = tbl.fields.map(f => ({ id: f.id, name: f.name }));
  console.log('Worker fields metadata:', fieldsMeta);
  return fieldsMeta;
}

async function getRecord(tableId, recordId) {
  console.log(`getRecord: table=${tableId}, recordId=${recordId}`);
  const url = `${BASE_URL}/${tableId}/${recordId}`;
  const res = await httpRequest(url, { method: 'GET', headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } });
  // Shape it similar to listRecords’ items for downstream compatibility
  // (Airtable single-record GET already returns the record object)
  console.log('getRecord result id:', res.id);
  return res;
}

// Lambda handler
export const handler = async (event) => {
  console.log('Handler invoked with event:', JSON.stringify(event));
  try {
    // Parse businessName from request body
    let { recordId, reportPeriodId } = JSON.parse(event.body || '{}');
    console.log('recordId param:', recordId);
    console.log('reportPeriodId:', reportPeriodId);
    if (!recordId) return { statusCode: 400, body: JSON.stringify({ error: 'recordId required' }) };

    
    recordId = Array.isArray(recordId) ? recordId[0] : recordId;
    reportPeriodId = Array.isArray(reportPeriodId) ? reportPeriodId[0] : reportPeriodId;
    // 1) Resolve the "current period" (by ID when supplied; otherwise open period by filter)
    console.log('Step 1: resolving target period');
    let periods = [];
    let companyNumber = -1;
    let fireberryID = "-1";
    // 1) Close existing open period
    if (reportPeriodId) {
      // Fetch that exact period by record ID (no filter)
      const period = await getRecord(PERIOD_TABLE, reportPeriodId);
      periods = [period];

      const rawLookup = period.fields['מספר חברה'];
      fireberryID = period.fields['Fireberry ID'];
      companyNumber = Array.isArray(rawLookup) ? rawLookup[0] : rawLookup;
      console.log('מספר חברה (company number) from specific period:', companyNumber);
    } else {
      // Original behavior: find an open period for this employer
      periods = await listRecords(PERIOD_TABLE, `{employerRecordId}='${recordId}'`);
      if (periods.length > 0) {
        periods.sort((a, b) => {
          const da = new Date(a.fields['חודש דיווח'] || 0);
          const db = new Date(b.fields['חודש דיווח'] || 0);
          return db - da;
        });

        const rawLookup = periods[0].fields['מספר חברה'];
        companyNumber = Array.isArray(rawLookup) ? rawLookup[0] : rawLookup;
        console.log('מספר חברה (company number) from open period:', companyNumber);
      }
    }
    
    console.log('Open periods:', periods);
    const d = new Date();
    let nextDate = `${String(d.getMonth()+1).padStart(2,'0')}/01/${d.getFullYear()}`;
    const [mm, dd, yyyy] = nextDate.split('/');
    const nextDateISO = `${yyyy}-${mm}-${dd}`;
    let isNewPeriodAlreadyExists = false;
    if (periods.length > 0) {
      for (let i = 0; i < periods.length; i += 1) {
        const current = periods[i];

        const currentStatus = current.fields['סטטוס תקופה'];
        const currentDate = current.fields['חודש דיווח'];
        console.log('Current period status:', currentStatus);
        console.log('Current period Date:', currentDate);
        
        if(currentDate === nextDateISO){
          isNewPeriodAlreadyExists = true;
          if (currentStatus === 'סגורה') {
            console.log('Opening period record:', current.id);
            const upd = await updateRecord(PERIOD_TABLE, current.id, { 'סטטוס תקופה': 'פתוחה' });
            console.log('Period open update response:', upd);
          }
        }
        else if (currentStatus !== 'סגורה') {
          console.log('Closing period record:', current.id);
          const upd = await updateRecord(PERIOD_TABLE, current.id, { 'סטטוס תקופה': 'סגורה' });
          console.log('Period close update response:', upd);
        }
      }
    }
    if(isNewPeriodAlreadyExists){
      console.log('New Period already exists');
      return { statusCode: 200, body: JSON.stringify({ 'info': 'Period already exists' }) };
    }
    // 2) Create new period record
    console.log('Step 2: creating new period record');
    // Wrap employer ID in array for linked record
    const newPeriods = await createRecords(PERIOD_TABLE, [{ 'מעסיק': [recordId], 'חודש דיווח': nextDate }]);
    console.log('New period response:', newPeriods);
    const newPeriodId = newPeriods[0]?.id;
    console.log('New period ID:', newPeriodId);

    // 3) Fetch worker records for previous period
    const prevPeriodId = periods[0]?.id || '';
    console.log('Step 3: fetching worker records for period:', prevPeriodId);


    const statusIsOved = `REGEX_MATCH(ARRAYJOIN({סטטוס עובד (from עובד)},','),'(^|,)עובד(,|$)')`;

    const workers = await listRecords(WORKER_TABLE, `AND({employerRecordId}='${recordId}', {periodRecordId}='${prevPeriodId}', ${statusIsOved})`);
    console.log(`Fetched ${workers.length} worker records`);

    // 4) Duplicate workers
    console.log('Step 4: preparing to duplicate worker records');
	
	  // find every field whose name includes "חובה"
    const fieldsMeta = await getWorkerFields();
	  const mandatoryFields = fieldsMeta
	  .map(f => f.name)
	  .filter(name => name.includes('חובה'));

    // your explicit list
    const compensationFields = [
      'תעריף חודשי / שעתי',
      'נסיעות חודשי',
      'שעות נוספות גלובליות',
      'שווי רכב',
      'רכיב שכר 1',
      'רכיב שכר 2',
      'רכיב שכר 3',
      'רכיב שכר 4'
    ];

    // union them (and dedupe just in case)
    const fieldsToCopy = [...new Set([
      ...mandatoryFields,
      ...compensationFields
    ])];

	
	  const toCreate = workers.map(rec => {
	  const newFields = {};

	  // always link to the new period
	  newFields['תקופת דיווח'] = [ newPeriodId ];
    console.log("worker");
	  const orig = rec.fields['עובד'];
    console.log(orig);
    let workerLink = [];

    if (Array.isArray(orig) && orig.length > 0) {
      const first = orig[0];
      // if Airtable gave you an object, grab its .id
      // otherwise assume it's already the ID string
      const id = (typeof first === 'object' && first.id)
        ? first.id
        : first;
      workerLink = [ id ];
    }

    newFields['עובד'] = workerLink;

	  // copy only the chosen fields (or null if missing)
	  fieldsToCopy.forEach(name => {
		  newFields[name] = rec.fields[name] ?? null;
	  });

	    return newFields;
	  });

    console.log('All worker duplication payloads prepared');

    const created = await createRecords(WORKER_TABLE, toCreate);
    console.log('Duplicated workers count:', created.length);

    // ───────────────────────────────────
    //Step 5: Fireberry lookup & update
    console.log('Step 5: Fireberry integration');
    console.log(`fireberryID = ${fireberryID}`);
    if(fireberryID !== "-1"){
      const fireSearch = await searchFireberry(fireberryID);
      if (fireSearch) {
        const fireUpdate = await updateFireberryRecord(fireSearch);
        console.log('Fireberry update response:', fireUpdate);
      } else {
        console.log(`No Fireberry record matched fireberryID = ${fireberryID}`);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ newPeriodId, duplicatedCount: created.length })
    };
  }
  catch (err) {
    console.error('Handler error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
