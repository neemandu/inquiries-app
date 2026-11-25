import https from 'https';
import { URL } from 'url';

// Airtable configuration
const AIRTABLE_BASE_ID = 'appSs9FQQJtw6VYQV';
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

// Limits for Airtable requests from one container: at most 4 in flight, and at most 5 starts per
// rolling second (Airtable allows 5 req/s per base, a 429 blocks the whole base for ~30s)
const MAX_STARTS_PER_SECOND = 5;
const startTimes = [];

async function rateGate() {
  for (;;) {
    const now = Date.now();
    while (startTimes.length && now - startTimes[0] >= 1000) startTimes.shift();
    if (startTimes.length < MAX_STARTS_PER_SECOND) {
      startTimes.push(now);
      return;
    }
    await new Promise((r) => setTimeout(r, 1000 - (now - startTimes[0]) + 5));
  }
}

const MAX_CONCURRENT_REQUESTS = 4;
let activeRequests = 0;
const waitingRequests = [];

async function acquireSlot() {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests++;
    return;
  }
  // the slot is handed over directly by releaseSlot, so the counter stays unchanged
  await new Promise((resolve) => waitingRequests.push(resolve));
}

function releaseSlot() {
  const next = waitingRequests.shift();
  if (next) {
    next();
  } else {
    activeRequests--;
  }
}

// Module-level cache for reference data only (never client data): names / leaving reasons / employees table meta.
// Only successful results are cached.
const REF_CACHE_TTL_MS = 60 * 1000;
const refCache = new Map();

function refCacheGet(key) {
  const entry = refCache.get(key);
  if (entry && entry.expires > Date.now()) return entry.value;
  return undefined;
}

function refCacheSet(key, value) {
  refCache.set(key, { value, expires: Date.now() + REF_CACHE_TTL_MS });
}

// Native HTTPS request helper
function httpRequestRaw(url, options = {}, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(new URL(url), options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          console.error(`HTTP ${res.statusCode} - ${data}`);
          return reject(new Error(`HTTP Error ${res.statusCode}`));
        }

        try {
          resolve(JSON.parse(data));
        } catch (err) {
          console.error('Failed parsing JSON response:', data);
          reject(err);
        }
      });
    });

    req.on('error', (err) => {
      console.error('HTTPS request error:', err);
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function httpRequest(url, options = {}, body) {
  await acquireSlot();
  try {
    await rateGate();
    return await httpRequestRaw(url, options, body);
  } finally {
    releaseSlot();
  }
}

// Paging through any table; throws on any failure
async function listRecordsStrict(tableId, filterFormula) {
  let all = [];
  let offset;

  const baseUrl = new URL(`${BASE_URL}/${tableId}`);
  if (filterFormula) {
    baseUrl.searchParams.append('filterByFormula', filterFormula);
  }

  console.log(`listRecords START table=${tableId}`);
  console.log(`listRecords formula=${filterFormula}`);

  do {
    const url = offset ? `${baseUrl.toString()}&offset=${offset}` : baseUrl.toString();
    console.log(`listRecords url=${url}`);

    const options = {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`
      }
    };

    const data = await httpRequest(url, options);
    const count = data.records?.length || 0;
    console.log(`listRecords page count=${count} offset=${data.offset || 'none'}`);

    all.push(...(data.records || []));
    offset = data.offset;
  } while (offset);

  console.log(`listRecords END table=${tableId} total=${all.length}`);
  return all;
}

// Generic listRecords function: swallows every error and returns [] (behaviour kept as is)
async function listRecords(tableId, filterFormula) {
  try {
    return await listRecordsStrict(tableId, filterFormula);
  } catch (err) {
    console.error(`listRecords FAILED table=${tableId}`, err);
    return [];
  }
}

// Same as listRecords, but successful results are cached for a short time (reference tables only)
async function listRecordsCached(cacheKey, tableId, filterFormula) {
  const hit = refCacheGet(cacheKey);
  if (hit !== undefined) return hit;

  try {
    const recs = await listRecordsStrict(tableId, filterFormula);
    refCacheSet(cacheKey, recs);
    return recs;
  } catch (err) {
    console.error(`listRecords FAILED table=${tableId}`, err);
    return [];
  }
}

// Fetch field metadata for a specific table
async function getAllFieldsMeta(tableId) {
  console.log(`getAllFieldsMeta START table=${tableId}`);

  const url = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`;
  const options = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`
    }
  };

  const meta = await httpRequest(url, options);
  const tableMeta = meta.tables.find((t) => t.id === tableId);

  if (!tableMeta) {
    throw new Error(`Table metadata not found: ${tableId}`);
  }

  console.log(`getAllFieldsMeta END table=${tableId} fields=${tableMeta.fields.length}`);
  return tableMeta.fields;
}

// Throws on failure (like getAllFieldsMeta); only successful results are cached
async function getAllFieldsMetaCached(tableId) {
  const key = `meta:${tableId}`;
  const hit = refCacheGet(key);
  if (hit !== undefined) return hit;

  const fields = await getAllFieldsMeta(tableId);
  refCacheSet(key, fields);
  return fields;
}

function getFirstValue(value) {
  if (Array.isArray(value)) {
    return value.length ? value[0] : null;
  }
  return value ?? null;
}

function parseDateValue(value) {
  const first = getFirstValue(value);
  if (!first) return null;

  const d = new Date(first);
  if (isNaN(d.getTime())) return null;

  return d;
}

export const handler = async (event) => {
  // every request started by this invocation; awaited before returning so nothing is left dangling
  const inflight = [];
  const track = (p) => {
    inflight.push(p);
    return p;
  };

  try {
    console.log('===== HANDLER START =====');
    console.log('raw event:', JSON.stringify(event));

    const email = event.queryStringParameters?.email?.toLowerCase()?.trim();
    const periodId = event.queryStringParameters?.periodId?.trim();

    console.log('parsed email:', email);
    console.log('parsed periodId:', periodId);

    if (!email) {
      console.log('Missing email');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'email required' })
      };
    }

    if (!AIRTABLE_BASE_ID || !AIRTABLE_API_KEY) {
      console.error('Missing Airtable environment variables');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing Airtable environment variables' })
      };
    }

    const namesTable = 'tblIi5fdVDwYGL2wE';
    const empTable = 'tbllBNXOrsicm2vHD';
    const periodsTable = 'tblnDNKqwakYGQGOe';
    const colsTable = 'tblufbJ9SlOlH9zMB';

    // exact match only to "עובד"
    const stillWorkingFormula = `ARRAYJOIN({סטטוס עובד (from עובד)},',')='עובד'`;

    // ---- Round A: everything that does not depend on the config record ----
    console.log('--- ROUND A: CONFIG + INDEPENDENT FETCHES ---');
    const cfgP = track(listRecords('tblfKCMT4yWj11uu3', `{lowerCaseEmail}='${email}'`));

    // the meta request must never become an unhandled rejection (e.g. when the config is missing -> 404)
    const metaP = track(
      getAllFieldsMetaCached(empTable).then(
        (fields) => ({ ok: true, fields }),
        (error) => ({ ok: false, error })
      )
    );

    const nameRecsP = track(listRecordsCached('names', namesTable, 'TRUE()'));

    let empFormula;
    if (periodId) {
      empFormula =
        `AND(` +
        `{lowerCaseEmail}='${email}',` +
        `{periodRecordId}='${periodId}',` +
        `${stillWorkingFormula}` +
        `)`;
    } else {
      empFormula =
        `AND(` +
        `{lowerCaseEmail}='${email}',` +
        `${stillWorkingFormula}` +
        `)`;
    }
    const empFetchP = track(listRecords(empTable, empFormula));

    const leaveRecsP = track(listRecordsCached('leaving', 'tblsy3zYzZIjwcQ1N', 'TRUE()'));

    // changeTime with periodId does not need the config
    const chRecsEarlyP = periodId
      ? track(listRecords(periodsTable, `{recordId}='${periodId}'`))
      : null;

    // 1) Config
    console.log('--- STEP 1: CONFIG ---');
    const cfgRecs = await cfgP;
    console.log(`cfgRecs count=${cfgRecs.length}`);

    if (!cfgRecs.length) {
      console.log('No config found for email');
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Config not found for email' })
      };
    }

    const cfg = cfgRecs[0];
    const link101 = cfg.fields['קישור ל101'] ?? null;
    const canForceClose = cfg.fields['האם לאפשר לסגור בירור בכוח?'] ?? false;
    const is161Must = cfg.fields['האם מחויב ב161'] ?? false;
    const configId = cfg.id;

    console.log('configId:', configId);
    console.log('link101:', link101);
    console.log('canForceClose:', canForceClose);
    console.log('is161Must:', is161Must);

    // ---- Round B: everything that depends on configId, started immediately ----
    const periodFilter = periodId
      ? `{recordId}='${periodId}'`
      : `AND({employerRecordId}='${configId}', {סטטוס תקופה}='פתוחה')`;

    const chRecsP = periodId
      ? chRecsEarlyP
      : track(listRecords(periodsTable, periodFilter));

    const allPeriodFilter = `{employerRecordId}='${configId}'`;
    const allPeriodRecsP = track(listRecords(periodsTable, allPeriodFilter));

    const colFilter = `{record_id (from לקוח)}='${configId}'`;
    const colRecsP = track(listRecords(colsTable, colFilter));

    // 2) Column name mapping
    console.log('--- STEP 2: COLUMN NAME MAPPING ---');
    const nameRecs = await nameRecsP;
    console.log(`nameRecs count=${nameRecs.length}`);

    const nameMap = nameRecs.reduce((m, r) => {
      const raw = r.fields['שם העמודה'];
      if (typeof raw === 'string') {
        const key = raw.trim();
        if (key) m[key] = r.id;
      }
      return m;
    }, {});

    console.log(`nameMap keys count=${Object.keys(nameMap).length}`);

    // 3) Employees
    console.log('--- STEP 3: EMPLOYEES ---');
    const metaResult = await metaP;
    if (!metaResult.ok) {
      throw metaResult.error;
    }
    const empMeta = metaResult.fields;

    console.log('stillWorkingFormula:', stillWorkingFormula);

    let empRecs = [];

    if (periodId) {
      console.log('empFormula (period mode):', empFormula);

      empRecs = await empFetchP;
      console.log(`empRecs count (period mode)=${empRecs.length}`);
    } else {
      console.log('empFormula (latest mode):', empFormula);

      const allEmpRecs = await empFetchP;
      console.log(`allEmpRecs count=${allEmpRecs.length}`);

      allEmpRecs.slice(0, 10).forEach((r, i) => {
        console.log(`allEmpRecs[${i}]`, JSON.stringify({
          airtableId: r.id,
          recordId: r.fields['recordId'],
          status: r.fields['סטטוס עובד (from עובד)'],
          periodStatus: r.fields['periodStatus'],
          periodRecordId: r.fields['periodRecordId'],
          reportMonth: r.fields['חודש דיווח (from תקופת דיווח)']
        }));
      });

      const datedEmpRecs = allEmpRecs.filter((r, i) => {
        const rawDate = r.fields['חודש דיווח (from תקופת דיווח)'];
        const parsed = parseDateValue(rawDate);
        const valid = parsed !== null;

        console.log(`date check [${i}]`, JSON.stringify({
          airtableId: r.id,
          rawDate,
          parsed: parsed ? parsed.toISOString() : null,
          valid
        }));

        return valid;
      });

      console.log(`datedEmpRecs count=${datedEmpRecs.length}`);

      datedEmpRecs.sort((a, b) => {
        const aDate = parseDateValue(a.fields['חודש דיווח (from תקופת דיווח)']);
        const bDate = parseDateValue(b.fields['חודש דיווח (from תקופת דיווח)']);
        return bDate - aDate;
      });

      console.log('Top sorted dated records:');
      datedEmpRecs.slice(0, 10).forEach((r, i) => {
        const d = parseDateValue(r.fields['חודש דיווח (from תקופת דיווח)']);
        console.log(`sorted[${i}]`, JSON.stringify({
          airtableId: r.id,
          recordId: r.fields['recordId'],
          reportMonthRaw: r.fields['חודש דיווח (from תקופת דיווח)'],
          reportMonthParsed: d ? d.toISOString() : null,
          status: r.fields['סטטוס עובד (from עובד)']
        }));
      });

      if (datedEmpRecs.length > 0) {
        const latestDate = parseDateValue(
          datedEmpRecs[0].fields['חודש דיווח (from תקופת דיווח)']
        );

        console.log('latestDate selected:', latestDate ? latestDate.toISOString() : null);

        empRecs = datedEmpRecs.filter((r, i) => {
          const d = parseDateValue(r.fields['חודש דיווח (from תקופת דיווח)']);
          const match = d && latestDate && d.getTime() === latestDate.getTime();

          console.log(`latest match check [${i}]`, JSON.stringify({
            airtableId: r.id,
            recordId: r.fields['recordId'],
            reportMonthRaw: r.fields['חודש דיווח (from תקופת דיווח)'],
            reportMonthParsed: d ? d.toISOString() : null,
            matchesLatest: !!match
          }));

          return match;
        });
      } else {
        console.log('No dated employee records found');
        empRecs = [];
      }

      console.log(`empRecs final count (latest mode)=${empRecs.length}`);
      empRecs.forEach((r, i) => {
        console.log(`empRecs final [${i}]`, JSON.stringify({
          airtableId: r.id,
          recordId: r.fields['recordId'],
          status: r.fields['סטטוס עובד (from עובד)'],
          reportMonth: r.fields['חודש דיווח (from תקופת דיווח)']
        }));
      });
    }

    const employees = empRecs.map((rec, i) => {
      let id = rec.fields['recordId'];
      if (Array.isArray(id)) id = id[0];

      const columns = empMeta
        .filter((f) => Object.prototype.hasOwnProperty.call(nameMap, f.name))
        .map((f) => ({
          name: f.name,
          columnId: f.id,
          oldValue: Object.prototype.hasOwnProperty.call(rec.fields, f.name)
            ? rec.fields[f.name]
            : null,
          type: f.type,
          isMust: Boolean(rec.fields[`${f.name} חובה`])
        }));

      console.log(`employee mapped [${i}]`, JSON.stringify({
        id,
        columnCount: columns.length
      }));

      return { id, columns };
    });

    console.log(`employees mapped count=${employees.length}`);

    // 4) Leaving reasons
    console.log('--- STEP 4: LEAVING REASONS ---');
    const leaveRecs = await leaveRecsP;
    console.log(`leaveRecs count=${leaveRecs.length}`);

    const leavingReasons = leaveRecs.map((r) => ({
      Reason: r.fields['סיבה'] || r.fields['Reason'] || null
    }));

    // 5) changeTime
    console.log('--- STEP 5: CHANGE TIME ---');
    let changeTime = null;

    console.log('periodFilter for changeTime:', periodFilter);

    const chRecs = await chRecsP;
    console.log(`chRecs count=${chRecs.length}`);

    if (chRecs.length) {
      console.log('chRecs[0] חודש דיווח:', chRecs[0].fields['חודש דיווח']);
      const d = new Date(chRecs[0].fields['חודש דיווח']);

      if (!isNaN(d.getTime())) {
        changeTime = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      }
    }

    console.log('changeTime:', changeTime);

    // 6) all periods for this employer
    console.log('--- STEP 6: ALL PERIODS ---');
    console.log('allPeriodFilter:', allPeriodFilter);

    const allPeriodRecs = await allPeriodRecsP;
    console.log(`allPeriodRecs count=${allPeriodRecs.length}`);

    const periods = allPeriodRecs
      .map((r) => ({
        date: r.fields['חודש דיווח'] ?? null,
        status: r.fields['סטטוס תקופה'] ?? null,
        recordId: r.id
      }))
      .sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date) - new Date(a.date);
      });

    console.log(`periods count=${periods.length}`);
    periods.slice(0, 10).forEach((p, i) => {
      console.log(`periods[${i}]`, JSON.stringify(p));
    });

    // 7) ColumnNames based on employees and metadata table
    console.log('--- STEP 7: COLUMN NAMES ---');
    console.log('column filter:', colFilter);

    const colRecs = await colRecsP;
    console.log(`colRecs count=${colRecs.length}`);

    const colMap = {};
    colRecs.forEach((r, i) => {
      const colId = r.fields['שם של העמודה'];
      colMap[colId] = {
        recordId: r.id,
        isOn: r.fields['האם מוצגת'] === true
      };

      if (i < 10) {
        console.log(`colMap source [${i}]`, JSON.stringify({
          colId,
          recordId: r.id,
          isOn: r.fields['האם מוצגת'] === true
        }));
      }
    });

    const mustByColumn = {};
    employees.forEach((emp, i) => {
      console.log(`processing employee columns for mustByColumn [${i}] count=${emp.columns.length}`);
      emp.columns.forEach((col) => {
        if (col.isMust) {
          mustByColumn[col.columnId] = true;
        } else if (!(col.columnId in mustByColumn)) {
          mustByColumn[col.columnId] = false;
        }
      });
    });

    console.log(`mustByColumn keys count=${Object.keys(mustByColumn).length}`);

    const columnNames = empMeta
      .filter((f) => Object.prototype.hasOwnProperty.call(nameMap, f.name))
      .map((f) => {
        const entry = colMap[f.name] || { recordId: null, isOn: false };
        return {
          isOn: mustByColumn[f.id] ? true : entry.isOn,
          recordId: entry.recordId,
          columnName: f.name,
          columnNameRecordId: nameMap[f.name]
        };
      })
      .sort((a, b) => a.columnName.localeCompare(b.columnName));

    console.log(`columnNames count=${columnNames.length}`);
    columnNames.slice(0, 20).forEach((c, i) => {
      console.log(`columnNames[${i}]`, JSON.stringify(c));
    });

    const responseBody = {
      employees,
      leavingReasons,
      link101,
      changeTime,
      is161Must,
      recordId: configId,
      columnNames,
      periods,
      canForceClose
    };

    console.log('Response summary:', JSON.stringify({
      employeesCount: employees.length,
      leavingReasonsCount: leavingReasons.length,
      columnNamesCount: columnNames.length,
      periodsCount: periods.length,
      changeTime,
      configId
    }));

    console.log('===== HANDLER SUCCESS =====');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(responseBody)
    };
  } catch (err) {
    console.error('===== HANDLER FAILED =====');
    console.error(err);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        details: err.message
      })
    };
  } finally {
    await Promise.allSettled(inflight);
  }
};
