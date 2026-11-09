import { MonthlyInquiry } from '@/lib/types';
import { toBase64 } from '@/lib/utils';

// What a monthly inquiry still needs before it can be considered handled
export function getInquiryGaps(inquiry: MonthlyInquiry) {
  const missingAnswer =
    inquiry.isTextMandatory && (!inquiry.answer || inquiry.answer.trim().length === 0);
  const missingDocs = inquiry.isDocMandatory && (!inquiry.docs || inquiry.docs.length === 0);
  return { missingAnswer, missingDocs };
}

interface SaveInquiryParams {
  inquiry: MonthlyInquiry;
  answer: string;
  files: File[];
  forceClose: string;
  recordId: string;
}

// Sends an inquiry's answer and new documents; returns the updated inquiry and whether nothing is missing anymore
export async function saveMonthlyInquiry({ inquiry, answer, files, forceClose, recordId }: SaveInquiryParams) {
  const encodedFiles = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      data: await toBase64(file),
    }))
  );

  const res = await fetch('/api/suppliers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sets: [{ ...inquiry, verbalAnswer: answer, answer, forceClose, files: encodedFiles }],
      recordId,
    }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const updatedInquiry: MonthlyInquiry = {
    ...inquiry,
    answer,
    forceClose,
    docs: [
      ...(inquiry.docs || []),
      ...files.map((f) => ({ id: f.name, filename: f.name, url: '', type: f.type })),
    ],
  };
  const { missingAnswer, missingDocs } = getInquiryGaps(updatedInquiry);
  return { updatedInquiry, resolved: !missingAnswer && !missingDocs };
}

// "ינואר 2026" style label for an inquiry's date; empty when the date can't be parsed
export function inquiryMonthLabel(dateStr: string) {
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
}
