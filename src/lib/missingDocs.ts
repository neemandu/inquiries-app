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

const toFilesData = (files: File[]) =>
  Promise.all(
    files.map(async (file) => ({
      contentType: file.type,
      fileName: file.name,
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      file: (await toBase64(file)).split(',')[1],
    }))
  );

// Uploads files for one missing document row; remarks default to the office's comment on the row
export async function uploadMissingDocFiles(doc: MissingDoc, files: File[], employerId: string, remarks?: string) {
  const filesData = await toFilesData(files);

  const response = await fetch(UPLOAD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileType: doc.fileType,
      files: filesData,
      remarks: remarks?.trim() || doc.accountantComments || '',
      employeeId: doc.employeeRecordId,
      employerId,
      monthlyReportId: doc.monthlyReportId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Upload failed for ${doc.firstName} ${doc.lastName}: ${response.status}`);
  }
}

// Document types the employer can upload (same values the desktop upload form sends)
export const DOCUMENT_TYPES = [
  { value: 'פנסיה', label: 'פנסיה' },
  { value: 'מילואים', label: 'מילואים' },
  { value: 'הסכם העסקה', label: 'הסכם העסקה' },
  { value: 'דוח מלווה', label: 'דוח מלווה' },
  { value: 'שווי ארוחות', label: 'שווי ארוחות' },
  { value: 'רישיון נהיגה', label: 'רישיון רכב' },
  { value: '161', label: '161' },
  { value: 'other', label: 'אחר' },
];

// Uploads a new document for one employee, or for the employer in general when employeeId is empty
// (same payload as the desktop upload form)
export async function uploadEmployerDocument({
  employerId,
  employeeId,
  fileType,
  files,
  remarks = '',
}: {
  employerId: string;
  employeeId: string;
  fileType: string;
  files: File[];
  remarks?: string;
}) {
  const response = await fetch(UPLOAD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recordId: employeeId || -1,
      employerId,
      uploadType: 'document',
      remarks,
      fileType,
      files: await toFilesData(files),
    }),
  });
  if (!response.ok) {
    throw new Error(`Document upload failed: ${response.status}`);
  }
}
