export const handler = async (event) => {
  try {
    console.log('Lambda triggered');
    console.log(event);

    if (!event.body || typeof event.body !== 'string') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing or invalid body' }),
      };
    }

    // Extract hex part after colon
    const colonIndex = event.body.indexOf(':');
    if (colonIndex === -1) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Colon not found in body' }),
      };
    }

    const hexPart = event.body.slice(colonIndex + 1).trim();
    console.log('Extracted hex length:', hexPart.length);
    console.log('First 20 hex bytes:', hexPart.slice(0, 40));

    // Convert hex to binary buffer
    const buffer = Buffer.from(hexPart, 'hex');
    console.log('Decoded buffer size:', buffer.length);

    // Convert to Base64
    const base64 = buffer.toString('base64');
    console.log('Final base64 length:', base64.length);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64 }),
    };

  } catch (err) {
    console.error('Lambda error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
