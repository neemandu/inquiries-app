import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      "https://t076re7x4e.execute-api.eu-west-2.amazonaws.com/default/getClientsEmails",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`AWS API failed with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("API Error:", error);
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
