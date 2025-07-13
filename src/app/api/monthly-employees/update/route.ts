import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(
      "https://h8vdwzo12d.execute-api.eu-west-2.amazonaws.com/default/updateMonthlyItems",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error proxying update request:", error);
    return NextResponse.json(
      { error: "Failed to update monthly employee data" },
      { status: 500 }
    );
  }
}
