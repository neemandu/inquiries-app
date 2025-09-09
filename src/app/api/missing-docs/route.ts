import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const employerRecordId = searchParams.get("employerRecordId");

  if (!employerRecordId) {
    return NextResponse.json(
      { success: false, message: "employerRecordId is required" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://w1zwtqc1jf.execute-api.eu-west-2.amazonaws.com/default/getMissingDocsByEmployer?employerRecordId=${employerRecordId}`,
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