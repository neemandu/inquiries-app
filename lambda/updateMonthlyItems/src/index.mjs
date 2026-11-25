import https from 'https';
import { URL } from 'url';

// Airtable configuration
const AIRTABLE_BASE_ID  = 'appSs9FQQJtw6VYQV';
const AIRTABLE_API_KEY  = process.env.AIRTABLE_API_KEY;
const WORKER_TABLE      = 'tbllBNXOrsicm2vHD';
const TASK_TABLE        = 'tblSuEHc2ZHJVqyvg';
const BASE_URL          = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

// HTTP helper using native https
async function httpRequest(url, opts = {}, body) {
  console.log(`HTTP ${opts.method || 'GET'} ${url}`, body ? JSON.stringify(body) : '');
  return new Promise((resolve, reject) => {
    const req = https.request(new URL(url), opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Response status', res.statusCode, 'body', data);
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
        resolve(JSON.parse(data));
      });
    });
    req.on('error', err => { console.error('Request error', err); reject(err); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Update a record field
async function updateRecord(tableId, recordId, fields) {
  const url = `${BASE_URL}/${tableId}/${recordId}`;
  return httpRequest(url,
    { method: 'PATCH', headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' }},
    { fields }
  );
}

// Create records (batch up to 10)
async function createRecords(tableId, records) {
  const url = `${BASE_URL}/${tableId}`;
  const opts = { method: 'POST', headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' }};
  const created = [];
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10).map(fields => ({ fields }));
    console.log(`Creating tasks batch #${i/10+1}`);
    const res = await httpRequest(url, opts, { records: batch });
    created.push(...res.records);
  }
  return created;
}

// Lambda handler
export const handler = async (event) => {
  console.log('Handler invoked', JSON.stringify(event));
  try {
    const payload = event.body ? JSON.parse(event.body) : [];
    console.log('Payload', payload);
    if (!Array.isArray(payload) || payload.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ message: 'No items to process' }) };
    }

    // 1) Get employerRecordId from first worker record
    const firstId = payload[0].id;
    console.log('Fetching worker record', firstId);
    const workerRec = await httpRequest(
      `${BASE_URL}/${WORKER_TABLE}/${firstId}`,
      { method: 'GET', headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` }}
    );
    const employerLink = workerRec.fields['employerRecordId'];
    const periodLink = workerRec.fields['periodRecordId'];
    const employerId = Array.isArray(employerLink) ? employerLink[0] : employerLink;
    const periodRecordId = Array.isArray(periodLink) ? periodLink[0] : periodLink;
    console.log('EmployerRecordId', employerId);
    console.log('periodRecordId', periodRecordId);

    const taskRecords = [];
    const updatePromises = [];

    // Today's date for deadline logic
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const deadlineDay = 9;

    // 2) Iterate and build tasks + updates
    for (const item of payload) {
      const recId = item.id;
      // Extract first and last name from columns
      let firstName = '';
      let lastName = '';
      const fnCol = item.columns.find(c => c.name === 'שם פרטי (from עובד)');
      const lnCol = item.columns.find(c => c.name === 'שם משפחה (from עובד)');
      if (fnCol) firstName = fnCol.newValue ?? fnCol.oldValue ?? '';
      if (lnCol) lastName = lnCol.newValue ?? lnCol.oldValue ?? '';
      console.log(`Processing record ${recId}`);
      for (const col of item.columns) {
        const { name, oldValue, newValue } = col;
        if (newValue !== oldValue) {    

          // Prepare update for worker table
          updatePromises.push(updateRecord(WORKER_TABLE, recId, { [name]: newValue }));
          const url = `${BASE_URL}/${WORKER_TABLE}/${recId}`;
          const updated = await httpRequest(
            url,
            { method: 'GET', headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' } }
          );

          // Build task entry
          let dlMonth = currentMonth;
          let dlYear = currentYear;
          if (currentDay >= deadlineDay) {
            dlMonth = currentMonth + 1;
            if (dlMonth > 11) { dlMonth = 0; dlYear++; }
          }
          const dlDate = new Date(dlYear, dlMonth, deadlineDay).toISOString().split('T')[0];  
          const nameOfEmployee = `${updated.fields['שם פרטי (from עובד)']} ${updated.fields['שם משפחה (from עובד)']}`
          const desc = `שינוי בעמודת: ${name}. ערך ישן: ${oldValue}. ערך חדש: ${newValue} עבור העובד: ${nameOfEmployee}`;
          taskRecords.push({ 'המשימה': desc, 'דדליין': dlDate, 'תקופת דיווח': [periodRecordId], 'לקוח': [employerId], 'עובד': updated.fields['employeeRecordId'] });
        }
      }
    }

    // Execute tasks creation and updates
    const createdTasks = taskRecords.length ? await createRecords(TASK_TABLE, taskRecords) : [];
    console.log('Created tasks count', createdTasks.length);

    const updates = await Promise.all(updatePromises);
    console.log('Worker updates completed', updates.length);

    return {
      statusCode: 200,
      body: JSON.stringify({ tasksCreated: createdTasks.length, recordsUpdated: updates.length })
    };
  } catch (err) {
    console.error('Handler error', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
