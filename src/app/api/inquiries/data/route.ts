/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

// Helper to sanitize all strings in an object (removes real line breaks, fixes keys)
function sanitizeJsonObject(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(sanitizeJsonObject);
    } else if (obj && typeof obj === 'object') {
        const fixedObj: any = {};
        for (const [key, value] of Object.entries(obj)) {
            // Fix typo in key names
            let newKey = key;
            if (newKey === 'isTextManadatory') newKey = 'isTextMandatory';
            if (newKey === 'isDocsMandatory') newKey = 'isDocMandatory';

            fixedObj[newKey] = sanitizeJsonObject(value);
        }
        return fixedObj;
    } else if (typeof obj === 'string') {
        // Remove unescaped line breaks from strings
        return obj.replace(/[\r\n]+/g, ' ').trim();
    }
    return obj;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId');

    if (!recordId) {
        return NextResponse.json({ success: false, message: 'recordId is required' }, { status: 400 });
    }

    try {
        const response = await fetch(
            `https://kt08aagomj.execute-api.eu-west-2.amazonaws.com/default/getInquires?recordId=${recordId}`
        );
        console.log('response');
        console.log(response);
        if (!response.ok) {
            throw new Error(`Webhook failed with status: ${response.status}`);
        }

        // Even if the response says it's JSON, treat it as text first and parse
        const rawText = await response.text();
        let data;
        try {
            data = JSON.parse(rawText);
        } catch {
            // Attempt to fix obvious JSON issues (replace real line breaks in strings)
            // Fallback: remove all line breaks in the text and try again
            const fixed = rawText.replace(/[\r\n]+/g, ' ');
            data = JSON.parse(fixed);
        }

        // Sanitize object: fix bad fields, remove unescaped line breaks from all strings
        const sanitized = sanitizeJsonObject(data);

        return NextResponse.json(sanitized);
    } catch (error) {
        console.error('API Error:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ success: false, message }, { status: 500 });
    }
}
