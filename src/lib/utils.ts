import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  AddEmployee,
  ApiResponse,
  PDFResponse,
  EmployeeResponse,
  UpdateMonthlyEmployeesPayload,
  AdminClientsResponse,
} from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function fetchEmployeeData(
  email: string
): Promise<ApiResponse | null> {
  try {
    const response = await fetch(
      `/api/monthly-employees?email=${encodeURIComponent(email)}`
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

export async function fetchMonthlyEmployeesData(
  email: string,
  periodId?: string
): Promise<EmployeeResponse | null> {
  try {
    let url = `/api/monthly-employees?email=${encodeURIComponent(email)}`;
    if (periodId) {
      url += `&periodId=${encodeURIComponent(periodId)}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: EmployeeResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching monthly employees data:", error);
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
): Promise<{ success: boolean; message?: string; code?: string }> {
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
          tz: updatedApiResponse.tz,
          startDate: updatedApiResponse.startDate,
          is101Full: updatedApiResponse.is101Full,
          pension: updatedApiResponse.pension,
          workFile: updatedApiResponse.workFile,
          department: updatedApiResponse.department,
        }),
      }
    );

    const contentType = response.headers.get("content-type") || "";
    let responseData: unknown = null;

    try {
      if (contentType.includes("application/json")) {
        responseData = await response.json();
      } else {
        const text = await response.text();
        if (text) {
          try {
            responseData = JSON.parse(text) as unknown;
          } catch {
            responseData = { message: text };
          }
        } else {
          responseData = null;
        }
      }
    } catch {
      responseData = null;
    }

    const topLevelData =
      typeof responseData === "object" && responseData !== null
        ? (responseData as Record<string, unknown>)
        : null;

    // Make webhook may wrap the actual payload in a stringified "body" field.
    let data = topLevelData;
    const wrappedBody = topLevelData?.body;
    if (typeof wrappedBody === "string") {
      try {
        const parsedBody = JSON.parse(wrappedBody) as unknown;
        if (typeof parsedBody === "object" && parsedBody !== null) {
          data = parsedBody as Record<string, unknown>;
        }
      } catch {
        // Keep top-level data if body isn't valid JSON.
      }
    } else if (typeof wrappedBody === "object" && wrappedBody !== null) {
      data = wrappedBody as Record<string, unknown>;
    }

    const message =
      (typeof data?.message === "string" && data.message) ||
      (typeof data?.error === "string" && data.error) ||
      (typeof data?.description === "string" && data.description) ||
      undefined;
    const code = typeof data?.code === "string" ? data.code : undefined;
    const rawSuccess = data?.success;
    const bodySuccess =
      typeof rawSuccess === "boolean"
        ? rawSuccess
        : typeof rawSuccess === "string"
        ? rawSuccess.toLowerCase() === "true"
          ? true
          : rawSuccess.toLowerCase() === "false"
          ? false
          : undefined
        : undefined;
    const hasFailureCode = typeof code === "string" && code.length > 0 && code !== "OK";

    if (!response.ok || bodySuccess === false || (bodySuccess !== true && hasFailureCode)) {
      return {
        success: false,
        message: message || `HTTP error! status: ${response.status}`,
        code,
      };
    }

    return { success: true, message, code };
  } catch (error) {
    console.error("Error updating column setting:", error);
    return { success: false, message: "שגיאה בתקשורת עם השרת" };
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

export async function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function updateMonthlyEmployeeData(
  updateData: UpdateMonthlyEmployeesPayload
): Promise<boolean> {
  try {
    const response = await fetch(`/api/monthly-employees/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error("Error updating monthly employee data:", error);
    return false;
  }
}

export async function fetchAdminClients(): Promise<AdminClientsResponse | null> {
  try {
    const response = await fetch("/api/admin-clients", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: AdminClientsResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching admin clients:", error);
    return null;
  }
}
