export const handler = async (event) => {
  console.log("Lambda invoked");

  // Config (set in Lambda env vars)
  const AIRTABLE_BASE_ID = 'appSs9FQQJtw6VYQV';
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

  const TABLE_ID  = "tblufbJ9SlOlH9zMB";
  const VIEW_ID   = "viwEWv9M93f5ShY0S";
  const ENDPOINT  = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_ID}`;

  // Minimal wrapper around fetch
  const airtableRequest = async (url, opts = {}) => {
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type":  "application/json",
      },
      ...opts,
    });
    const body = await res.json();
    return { ok: res.ok, status: res.status, body };
  };

  try {
    const { clientRecordId, columns = [] } = JSON.parse(event.body);
    console.log(`Processing client ${clientRecordId} with ${columns.length} columns`);

    for (const { columnNameRecordId, isOn } of columns) {
      console.log(` → Column ${columnNameRecordId}`);

      // 1) Search for an existing link-record
      const formula   = `AND({record_id (from לקוח)}="${clientRecordId}",{column record Id}="${columnNameRecordId}")`;
      const searchUrl = `${ENDPOINT}?filterByFormula=${encodeURIComponent(formula)}&view=${VIEW_ID}&maxRecords=1`;

      const search = await airtableRequest(searchUrl, { method: "GET" });
      if (!search.ok) {
        console.error(`   ✖ Search failed (${search.status})`);
        continue;
      }

      if (search.body.records.length > 0) {
        // 2a) Update existing record
        const recId = search.body.records[0].id;
        await airtableRequest(`${ENDPOINT}/${recId}`, {
          method: "PATCH",
          body: JSON.stringify({
            fields: { "fldgzRYbPEVNj2IUG": isOn }
          })
        });
        console.log("   ✔ Updated record");
      } else {
        // 2b) Create new link-record
        await airtableRequest(ENDPOINT, {
          method: "POST",
          body: JSON.stringify({
            fields: {
              "fld5X9XWPa8hi5ZK2": [columnNameRecordId],
              "fld9dSlNFviVFkbPQ": [clientRecordId],
              "fldgzRYbPEVNj2IUG": isOn
            }
          })
        });
        console.log("   ✔ Created record");
      }
    }

    console.log("All columns processed");
    return { statusCode: 200, body: "" };
  } catch (error) {
    console.error("Handler error:", error);
    return { statusCode: 500, body: "Internal Server Error" };
  }
};
