export const handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
   // 1. Parse the incoming body
   let payload;
   try {
     payload = typeof event.body === 'string'
       ? JSON.parse(event.body)
       : event.body;
   } catch (err) {
     return {
       statusCode: 400,
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ message: 'Invalid JSON in request body' }),
     };
   }
 
   // 2. Extract the real arrays (unwrap if necessary)
   let allColumns = [];
   if (Array.isArray(payload.allColumns) && payload.allColumns.length > 0 && Array.isArray(payload.allColumns[0].allColumnsNames)) {
     // they sent: allColumns: [ { allColumnsNames: [...] } ]
     allColumns = payload.allColumns[0].allColumnsNames;
   } else {
     allColumns = payload.allColumns || [];
   }
 
   let clientsColumns = [];
   if (Array.isArray(payload.clientsColumns) && payload.clientsColumns.length > 0 && Array.isArray(payload.clientsColumns[0].columnNames)) {
     // they sent: clientsColumns: [ { columnNames: [...] } ]
     clientsColumns = payload.clientsColumns[0].columnNames;
   } else {
     clientsColumns = payload.clientsColumns || [];
   }
 
   // 3. Build a lookup map by columnNameRecordId
   const clientsById = clientsColumns.reduce((map, col) => {
     map[col.columnNameRecordId] = col;
     return map;
   }, {});
 
   // 4. Left-join: walk allColumns, keep existing or create default
   const joined = allColumns.map(({ columnNameRecordId, name }) => {
     const existing = clientsById[columnNameRecordId];
     if (existing) {
       return existing;
     }
     return {
       isOn: false,
       recordId: '-1',
       columnNameRecordId,
       columnName: name,
     };
   });
 
   // 5. Return via API Gateway proxy
   return {
     statusCode: 200,
     headers: {
       'Content-Type':                'application/json',
       'Access-Control-Allow-Origin': '*',          // adjust for your CORS needs
       'Access-Control-Allow-Methods': 'POST,OPTIONS',
       'Access-Control-Allow-Headers': 'Content-Type',
     },
     body: JSON.stringify(joined),
   };
 };