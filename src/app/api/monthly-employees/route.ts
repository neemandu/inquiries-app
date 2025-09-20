import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const periodId = searchParams.get("periodId");

  if (!email) {
    return NextResponse.json(
      { success: false, message: "Email is required" },
      { status: 400 }
    );
  }

  try {
    let url = `https://7k7a7oe9rl.execute-api.eu-west-2.amazonaws.com/default/getMonthlyEmployeesDataByEmployeeId?email=${encodeURIComponent(
      email
    )}`;
    
    if (periodId) {
      url += `&periodId=${encodeURIComponent(periodId)}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`AWS API failed with status: ${response.status}`);
    }

    const data = await response.json();

    // The API already returns data in the format we need:
    // { employees: [{ id: string, columns: [{ name, columnId, oldValue, type, isMust }] }] }

    return NextResponse.json(data);
  } catch (error) {
    console.error("API Error:", error);
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
