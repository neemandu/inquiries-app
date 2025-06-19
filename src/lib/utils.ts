import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { AddEmployee, ApiResponse, PDFResponse } from "@/app/employees/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function fetchEmployeeData(
  email: string
): Promise<ApiResponse | null> {
  try {
    const response = await fetch(
      `https://hook.eu2.make.com/orcsdly3165xy9ig2ncqenggv18adl23?email=${encodeURIComponent(
        email
      )}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ApiResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching employee data:", error);
    return null;
  }
}

export async function updateColumnSetting(
  recordId: string,
  updatedApiResponse: ApiResponse
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://hook.eu2.make.com/duxu4qucp2j1oe8522b7ylfl9f6fnq39?recordId=${encodeURIComponent(
        recordId
      )}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employees: updatedApiResponse.employees,
          columnNames: updatedApiResponse.columnNames,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error("Error updating column setting:", error);
    return false;
  }
}

export async function addEmployee(
  updatedApiResponse: AddEmployee
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://hook.eu2.make.com/qv5d2vgs8b992av1tpd9a880abbh7yyu`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          record_id: updatedApiResponse.record_id,
          firstName: updatedApiResponse.firstName,
          lastName: updatedApiResponse.lastName,
          startDate: updatedApiResponse.startDate,
          is101Full: updatedApiResponse.is101Full,
          pension: updatedApiResponse.pension,
          workFile: updatedApiResponse.workFile,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error("Error updating column setting:", error);
    return false;
  }
}

export async function GetPDF(recordId: string): Promise<PDFResponse | null> {
  try {
    const response = await fetch(
      `https://hook.eu2.make.com/1qr8sx2y62843ve29y5agc0c26tl8r1s?recordId=${encodeURIComponent(
        recordId
      )}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: PDFResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching employee data:", error);
    return null;
  }
}

// export async function addEmployeeRecognition(
//   updatedApiResponse: EmployeeRecognition
// ): Promise<boolean> {
//   try {
//     const response = await fetch(
//       `https://hook.eu2.make.com/6yvgowfqvfq0maax195lb7s0x2ayb53m`,
//     );
//   }
// }

// https://hook.eu2.make.com/m0rzm7d63afsoerxyvvpxnl6gkzo67yv
