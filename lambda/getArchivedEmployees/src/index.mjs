// getArchivedEmployees: an employer's archived employees (סטטוס עובד = "לא עובד"), for the mobile "ארכיון עובדים" screen.
// GET ?employerRecordId=rec… → [{ id, firstName, lastName, idNumber, leavingDate, leavingReason }]

// Airtable access (key from the function's environment variables, set from lambda/.env)
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appSs9FQQJtw6VYQV';
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

// עובדי לקוחות
const EMPLOYEES_TABLE = 'tbl7xXIohwg5pMNUp';
const STATUS_FIELD = 'סטטוס עובד';
const ACTIVE = 'עובד';
const ARCHIVED = 'לא עובד';

const RECORD_ID = /^rec[A-Za-z0-9]{14}$/;

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

async function airtable(path, { method = 'GET', params, body } = {}) {
  const url = new URL(`${BASE_URL}/${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      for (const v of [].concat(value)) url.searchParams.append(key, v);
    }
  }
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Airtable ${method} ${path} failed (${res.status}): ${JSON.stringify(data.error ?? data)}`);
  }
  return data;
}

// All records matching a formula, following Airtable's pages
async function listAll(table, filterByFormula, fields) {
  const records = [];
  let offset;
  do {
    const page = await airtable(table, {
      params: { filterByFormula, 'fields[]': fields, pageSize: '100', ...(offset ? { offset } : {}) },
    });
    records.push(...(page.records ?? []));
    offset = page.offset;
  } while (offset);
  return records;
}

function chunks(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

// Reads { employerId, recordIds } from a POST body and loads those employees, making sure every one of
// them belongs to that employer. Returns { error } (a response) or { employerId, employees }.
async function loadEmployerEmployees(event, fields) {
  let payload;
  try {
    payload = typeof event.body === 'string' ? JSON.parse(event.body) : event.body ?? {};
  } catch {
    return { error: json(400, { error: 'Invalid JSON body' }) };
  }
  const { employerId, recordIds } = payload ?? {};
  if (!RECORD_ID.test(employerId ?? '')) return { error: json(400, { error: 'Missing or invalid employerId' }) };
  if (!Array.isArray(recordIds) || recordIds.length === 0 || recordIds.length > 50) {
    return { error: json(400, { error: 'recordIds must be a list of 1 to 50 record IDs' }) };
  }
  const ids = [...new Set(recordIds)];
  if (!ids.every((id) => RECORD_ID.test(id))) return { error: json(400, { error: 'Invalid record ID in recordIds' }) };

  const formula = `AND({record_id (from לקוח מקושר)}='${employerId}', OR(${ids.map((id) => `RECORD_ID()='${id}'`).join(',')}))`;
  const employees = await listAll(EMPLOYEES_TABLE, formula, [STATUS_FIELD, ...fields]);
  const found = new Set(employees.map((r) => r.id));
  const unknown = ids.filter((id) => !found.has(id));
  if (unknown.length) {
    // Nothing is changed when any ID isn't one of this employer's employees
    return { error: json(404, { error: 'Some employees were not found for this employer', recordIds: unknown }) };
  }
  return { employerId, employees, updatedBy: typeof payload.updatedBy === 'string' ? payload.updatedBy : '' };
}

export const handler = async (event) => {
  try {
    if (!AIRTABLE_API_KEY) return json(500, { error: 'AIRTABLE_API_KEY is not set' });
    const employerRecordId = event.queryStringParameters?.employerRecordId ?? '';
    if (!RECORD_ID.test(employerRecordId)) return json(400, { error: 'Missing or invalid employerRecordId' });

    const records = await listAll(
      EMPLOYEES_TABLE,
      `AND({record_id (from לקוח מקושר)}='${employerRecordId}', {${STATUS_FIELD}}='${ARCHIVED}')`,
      ['שם פרטי', 'שם משפחה', 'תעודת זהות', 'תאריך עזיבה', 'סיבת עזיבה'],
    );
    return json(
      200,
      records.map(({ id, fields: f }) => ({
        id,
        firstName: f['שם פרטי'] ?? '',
        lastName: f['שם משפחה'] ?? '',
        idNumber: f['תעודת זהות'] ?? '',
        leavingDate: f['תאריך עזיבה'] ?? null,
        leavingReason: f['סיבת עזיבה'] ?? '',
      })),
    );
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message });
  }
};
