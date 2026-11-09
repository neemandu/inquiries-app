// Monthly documents (pay slips, reports) the office prepared for an employer, by document type
export interface EmployerDocumentsMonth {
  Date: string;
  Docs: {
    [docType: string]: string;
  };
}

const DOCUMENTS_WEBHOOK_URL = 'https://hook.eu2.make.com/0dt1lukm4kv7zpiyylmefc9l8e1dtypq';

// An empty body or Make's default "Accepted" (the scenario ended without a webhook response) means no documents
export async function fetchEmployerDocuments(employerRecordId: string): Promise<EmployerDocumentsMonth[]> {
  const response = await fetch(`${DOCUMENTS_WEBHOOK_URL}?recordId=${employerRecordId}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const text = (await response.text()).trim();
  if (!text || text === 'Accepted') return [];
  const data = JSON.parse(text);
  return Array.isArray(data) ? data : [];
}
