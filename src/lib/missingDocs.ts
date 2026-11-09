import { toBase64 } from '@/lib/utils';

const UPLOAD_WEBHOOK_URL = 'https://hook.eu2.make.com/m2ow857a46axrtmhq26yzw84d8ibm8gv';

// A document the office is still missing for one employee
export interface MissingDoc {
  employeeRecordId: string;
  monthlyReportId: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  fileType: string;
  accountantComments: string;
}

export async function fetchMissingDocs(employerRecordId: string): Promise<MissingDoc[]> {
  const response = await fetch(`/api/missing-docs?employerRecordId=${employerRecordId}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}, message: ${await response.text()}`);
  }
  const data: Partial<MissingDoc>[] = await response.json();
  return data.map((item) => ({
    employeeRecordId: item.employeeRecordId || '',
    monthlyReportId: item.monthlyReportId || '',
    firstName: item.firstName || '',
    lastName: item.lastName || '',
    idNumber: item.idNumber || '',
    fileType: item.fileType || '',
    accountantComments: item.accountantComments || '',
  }));
}

// Uploads files for one missing document row
export async function uploadMissingDocFiles(doc: MissingDoc, files: File[], employerId: string) {
  const filesData = await Promise.all(
    files.map(async (file) => ({
      contentType: file.type,
      fileName: file.name,
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      file: (await toBase64(file)).split(',')[1],
    }))
  );

  const response = await fetch(UPLOAD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileType: doc.fileType,
      files: filesData,
      remarks: doc.accountantComments || '',
      employeeId: doc.employeeRecordId,
      employerId,
      monthlyReportId: doc.monthlyReportId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Upload failed for ${doc.firstName} ${doc.lastName}: ${response.status}`);
  }
}
