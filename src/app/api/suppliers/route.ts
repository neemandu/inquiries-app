import { NextResponse } from "next/server";

const WEBHOOK_URL =
  "https://hook.eu2.make.com/p1blghe3lplkmnn6215xpmkbiyry3d5w";

// Configure body size limit for file uploads
export const runtime = "nodejs";
export const bodyParser = {
  sizeLimit: "15mb",
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sets, recordId } = body;

    if (!recordId) {
      return NextResponse.json(
        { success: false, message: "recordId is required for submission." },
        { status: 400 }
      );
    }

    const url = `${WEBHOOK_URL}?recordId=${recordId}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sets }),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status: ${response.status}`);
    }
    return NextResponse.json({
      success: true,
      message: "Form submitted successfully",
    });
  } catch (error) {
    console.error("API Error:", error);
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
