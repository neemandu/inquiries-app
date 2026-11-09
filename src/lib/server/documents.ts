import 'server-only';

// Same Make.com scenario the app's "העלאת מסמכים" screen posts employee documents to
const DOCUMENTS_WEBHOOK_URL = 'https://hook.eu2.make.com/m2ow857a46axrtmhq26yzw84d8ibm8gv';

export interface DocumentFile {
  contentType: string;
  fileName: string;
  file: string; // base64 without the data URL prefix
}

export async function uploadEmployerDocuments(params: {
  employerId: string;
  fileType: string;
  remarks: string;
  files: DocumentFile[];
}) {
  const response = await fetch(DOCUMENTS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // The employee has no record yet; -1 is what the app sends for documents not tied to an employee
      recordId: -1,
      employerId: params.employerId,
      uploadType: 'document',
      remarks: params.remarks,
      fileType: params.fileType,
      files: params.files,
    }),
  });
  if (!response.ok) {
    throw new Error(`Documents webhook failed with status: ${response.status}`);
  }
}
