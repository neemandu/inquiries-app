import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch('https://p4r75rrbca.execute-api.eu-west-2.amazonaws.com/default/UpdateColumnsForEmployer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // For this specific API, treat empty response as success
    const responseText = await response.text();
    
    if (responseText.trim() === '') {
      return NextResponse.json({ success: true });
    }

    // If there is content, try to parse as JSON
    try {
      const data = JSON.parse(responseText);
      return NextResponse.json(data);
    } catch {
      // If JSON parsing fails, still treat as success for this API
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error("API Error:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
} 