import { MonthlyInquiry } from '@/lib/types';

// What a monthly inquiry still needs before it can be considered handled
export function getInquiryGaps(inquiry: MonthlyInquiry) {
  const missingAnswer =
    inquiry.isTextMandatory && (!inquiry.answer || inquiry.answer.trim().length === 0);
  const missingDocs = inquiry.isDocMandatory && (!inquiry.docs || inquiry.docs.length === 0);
  return { missingAnswer, missingDocs };
}
