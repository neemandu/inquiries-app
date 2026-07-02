"use client";

import { useState, useEffect } from "react";
import FileUploadComponent from "./FileUploadComponent";
import { GeneralInquiry } from "@/lib/types";
import { toBase64 } from "@/lib/utils";
import { toast } from "sonner";

interface YearlyFormProps {
  yearlyData?: GeneralInquiry[];
  recordId?: string;
  employer?: string;
  focusIndex?: number | null;
  focusRecordId?: string | null;
  canForceClose?: boolean;
}

export default function YearlyForm({
  yearlyData,
  recordId,
  employer,
  focusIndex,
  focusRecordId,
  canForceClose = false,
}: YearlyFormProps) {
  console.log("Yearly data", yearlyData);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [forceClose, setForceClose] = useState<{ [key: string]: string }>({});
  const [forceCloseAck, setForceCloseAck] = useState<{ [key: string]: boolean }>({});
  const [files, setFiles] = useState<{ [key: string]: File[] }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate answers from yearlyData whenever the dataset changes.
  useEffect(() => {
    if (!yearlyData) {
      setAnswers({});
      setForceClose({});
      setForceCloseAck({});
      return;
    }

    const initialAnswers = yearlyData.reduce(
      (acc, item, index) => {
        if (item.answer != null && item.answer !== undefined) {
          acc[`${index}-${item.question}`] = item.answer;
        }
        return acc;
      },
      {} as Record<string, string>
    );
    const initialForceClose = yearlyData.reduce(
      (acc, item, index) => {
        acc[`${index}-${item.question}`] = '';
        return acc;
      },
      {} as Record<string, string>
    );
    const initialForceCloseAck = yearlyData.reduce(
      (acc, item, index) => {
        acc[`${index}-${item.question}`] = false;
        return acc;
      },
      {} as Record<string, boolean>
    );

    setAnswers(initialAnswers);
    setForceClose(initialForceClose);
    setForceCloseAck(initialForceCloseAck);
  }, [yearlyData]);

  useEffect(() => {
    if (answers) {
      // This useEffect is no longer needed as answers are now managed by the parent
      // and the initial population is handled by the yearlyData prop.
      // Keeping it for now as it might be re-introduced or removed later.
    }
  }, [answers]);

  useEffect(() => {
    if (focusIndex === null || focusIndex === undefined) return;
    const target = document.getElementById(`general-inquiry-${focusIndex}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focusIndex, yearlyData]);

  useEffect(() => {
    if (!focusRecordId) return;
    const target = document.getElementById(`general-inquiry-${focusRecordId}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focusRecordId, yearlyData]);

  const handleAnswerChange = (questionKey: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionKey]: value }));
  };

  const handleFilesChange = (questionKey: string, newFiles: File[]) => {
    setFiles((prev) => ({ ...prev, [questionKey]: newFiles }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recordId || !yearlyData) return;

    // No validation - allow sending even if mandatory fields are empty

    // Only send records that have been changed (have answers or files)
    const changedItems = yearlyData.reduce(
      (acc, item, index) => {
        const questionKey = `${index}-${item.question}`;
        const hasAnswer = answers[questionKey]?.trim();
        const hasFiles = files[questionKey] && files[questionKey].length > 0;
        const hasForce = canForceClose ? (forceClose[questionKey] || '').trim() : '';
        if (hasAnswer || hasFiles || hasForce) {
          acc.push({ item, questionKey, index });
        }
        return acc;
      },
      [] as { item: GeneralInquiry; questionKey: string; index: number }[]
    );

    if (changedItems.length === 0) {
      toast.error("לא בוצעו שינויים. אנא מלא לפחות שדה אחד כדי לשלוח.", {
        duration: 5000,
      });
      return;
    }

    const missingAck = changedItems.some(({ questionKey }) => {
      const hasForce = canForceClose ? (forceClose[questionKey] || '').trim() : '';
      return hasForce && !forceCloseAck[questionKey];
    });

    if (missingAck) {
      toast.error('נא לאשר את ההצהרה לפני שליחת הבירור', { duration: 4000 });
      return;
    }

    setIsSubmitting(true);
    const loadingToastId = toast.loading("שולח נתונים...");

    const sets = await Promise.all(
      changedItems.map(async ({ item, questionKey }) => {
        const itemFiles = files[questionKey] || [];
        const encodedFiles = await Promise.all(
          itemFiles.map(async (f) => ({
            name: f.name,
            data: await toBase64(f),
          }))
        );

        return {
          ...item,
          answer: answers[questionKey] || "",
          forceClose: canForceClose ? (forceClose[questionKey] || "") : "",
          files: encodedFiles,
        };
      })
    );

    try {
      const res = await fetch("/api/yearly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sets, recordId }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("הנתונים נשלחו בהצלחה!", {
        id: loadingToastId,
        duration: 5000,
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to submit yearly data:", error);
      toast.error(
        `שגיאה בשליחת הנתונים: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        { id: loadingToastId, duration: 5000 }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!yearlyData) {
    return (
      <div dir="rtl" className="text-center">
        טוען נתונים...
      </div>
    );
  }

  if (isSubmitting) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin"></div>
        <h2 className="mt-8 text-xl font-semibold text-gray-800 text-center">
          נא לא לסגור את החלון. הפעולה יכולה לקחת מספר דקות.
        </h2>
      </div>
    );
  }

  return (
    <div dir="rtl" className="yearly-form space-y-4">
      <div className="mb-4 border-b border-gray-100 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">בירורים כלליים</h2>
        {employer && <p className="text-gray-500 text-sm mt-0.5">{employer}</p>}
      </div>
      <div className="mb-4 inline-block rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2">
        הערה: ניתן להגיש את הטופס גם אם חלק מהבירורים טרם הושלמו
      </div>

      <form onSubmit={handleSubmit}>
        {yearlyData.map((item, index) => {
          const questionKey = `${index}-${item.question}`;
          return (
          <div
            key={`${item.question}-${index}`}
            className="yearly-set"
            id={`general-inquiry-${item.recordId}`}
            data-index={index}
          >
              <label>
                {index + 1}) {item.chen}: {item.question}
                {item.isTextMandatory && <span className="required">*</span>}
              </label>
              <div style={{ direction: "rtl", margin: "0.5rem 0" }}>
                סכום: <span dir="ltr">{item.sum}</span>
              </div>
              <div className="form-group">
                <input
                  key={`input-${item.question}-${index}`}
                  type="text"
                  value={answers[questionKey] || ""}
                  onChange={(e) =>
                    handleAnswerChange(questionKey, e.target.value)
                  }
                />
              </div>
              {canForceClose && (
                <div className="form-group">
                  <label className="block text-sm font-medium mb-1">סגירת בירור בכוח</label>
                  <select
                    value={forceClose[questionKey] || ""}
                    onChange={(e) =>
                      setForceClose((prev) => ({ ...prev, [questionKey]: e.target.value }))
                    }
                    className="border border-gray-300 rounded px-2 py-1 text-right"
                    dir="rtl"
                  >
                    <option value="">בחר/י סיבה</option>
                    <option value="הוצאה פרטית – לרשום כנגד כרטיס חו״ז בעלים.">הוצאה פרטית – לרשום כנגד כרטיס חו״ז בעלים.</option>
                    <option value="הוצאה עסקית בלי אסמכתא – לא אצליח להשיג מסמך; לרשום כהוצאה עסקית על בסיס הצהרתי.">הוצאה עסקית בלי אסמכתא – לא אצליח להשיג מסמך; לרשום כהוצאה עסקית על בסיס הצהרתי.</option>
                    <option value="החשבונית הועברה ונבדקה – העברתי למערכת את החשבוניות הנכונה (בדקתי ש- ספק/תאריך/סכום תואמים); מבקש לסגור את הבירור.">החשבונית הועברה ונבדקה – העברתי למערכת את החשבוניות הנכונה (בדקתי ש- ספק/תאריך/סכום תואמים); מבקש לסגור את הבירור.</option>
                  </select>
                  <label className="mt-2 flex items-start gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={forceCloseAck[questionKey] || false}
                      onChange={(e) =>
                        setForceCloseAck((prev) => ({ ...prev, [questionKey]: e.target.checked }))
                      }
                    />
                    <span>אני מאשר/ת שהאחריות על ההצהרה והשלכותיה היא על יי.</span>
                  </label>
                </div>
              )}
              <div className="form-group flex flex-col gap-3 sm:flex-row sm:items-start">
                <FileUploadComponent
                  onFilesChange={(newFiles) =>
                    handleFilesChange(questionKey, newFiles)
                  }
                  isMandatory={item.isDocMandatory}
                />
                {item.docs.length > 0 && (
                  <ul className="flex flex-col gap-1 list-disc pr-4">
                    {item.docs.map((doc) => (
                      <li key={doc.id}>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ textDecoration: "underline" }}
                          title={doc.filename}
                        >
                          {doc.filename?.length && doc.filename?.length > 10
                            ? doc.filename?.slice(0, 10) + "..."
                            : doc.filename}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {item.remarks && (
                <p className="mt-2 text-sm text-primary">הערות: {item.remarks}</p>
              )}
            </div>
          )
        })}
        {yearlyData.length > 0 ? (
          <button type="submit" disabled={isSubmitting}>
          שלח
          </button>
        ) : (
          <div dir="" className="text-center">
            אין עוד בירורים
          </div>
        )}
      </form>
      <style jsx>{`
        .yearly-form {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }
        .yearly-set {
          margin-bottom: 1.25rem;
          padding: 1.25rem;
          text-align: right;
          max-width: 100%;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          box-shadow: 0 1px 2px oklch(0.21 0.03 264 / 0.04), 0 8px 24px -18px oklch(0.21 0.03 264 / 0.25);
        }
        .yearly-set > label:first-child {
          display: block;
          font-weight: 600;
          color: #111827;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        .yearly-set label {
          display: block;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        .required {
          color: red;
          margin-inline-end: 0.25rem;
          font-weight: bold;
        }
        .form-group {
          margin-top: 0.5rem;
          max-width: 100%;
        }
        .form-group :global(.file-upload) {
          display: block;
          max-width: 100%;
        }
        input[type="text"],
        select {
          width: 100%;
          max-width: 500px;
          padding: 0.5rem 0.65rem;
          font-size: 1em;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          box-sizing: border-box;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        input[type="text"]:focus,
        select:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px oklch(0.62 0.19 270 / 0.25);
        }
        @media (max-width: 640px) {
          input[type="text"],
          select {
            max-width: 100%;
          }
        }
        button[type="submit"] {
          display: block;
          margin: 2rem auto 0;
          padding: 0.7rem 1.75rem;
          background: linear-gradient(100deg, oklch(0.44 0.24 277), oklch(0.5 0.23 264));
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 1em;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 6px 16px -8px oklch(0.44 0.24 277 / 0.7);
          transition: opacity 0.15s, transform 0.05s, box-shadow 0.15s;
        }
        button[type="submit"]:disabled {
          background: #cbd5e1;
          box-shadow: none;
          cursor: not-allowed;
        }
        button[type="submit"]:hover:not(:disabled) {
          opacity: 0.94;
          box-shadow: 0 8px 20px -8px oklch(0.44 0.24 277 / 0.8);
        }
        button[type="submit"]:active:not(:disabled) {
          transform: scale(0.98);
        }
        .logo-container {
          text-align: center;
          margin-bottom: 1rem;
        }
        .logo-container img {
          max-width: 200px;
        }
        hr {
          border: none;
          border-top: 1px solid #eee;
          margin: 2rem 0;
        }
      `}</style>
    </div>
  );
}






