const PROD_BASE_URL = "https://cpateam.vercel.app";
const DEV_BASE_URL = "http://localhost:3000";

export const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NODE_ENV === "development" ? DEV_BASE_URL : PROD_BASE_URL;
};

export const getMonthlyInquiryUrl = (recordId: string, inquiryId: string) => {
  const base = getBaseUrl();
  const params = new URLSearchParams({
    inquiryType: "monthly",
    recordId,
    inquiryId,
  });
  return `${base}/?${params.toString()}`;
};

export const getGeneralInquiryUrl = (recordId: string, generalId: string) => {
  const base = getBaseUrl();
  const params = new URLSearchParams({
    inquiryType: "general",
    recordId,
    generalId,
  });
  return `${base}/?${params.toString()}`;
};
