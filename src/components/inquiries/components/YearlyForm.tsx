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
}

export default function YearlyForm({
  yearlyData,
  recordId,
  employer,
}: YearlyFormProps) {
  console.log("Yearly data", yearlyData);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [files, setFiles] = useState<{ [key: string]: File[] }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate answers from yearlyData on mount or when yearlyData changes
  useEffect(() => {
    if (yearlyData) {
      const initialAnswers: { [key: string]: string } = {};
      yearlyData.forEach((item, index) => {
        const questionKey = `${index}-${item.question}`;
        if (item.answer != null && item.answer !== undefined) {
          initialAnswers[questionKey] = item.answer;
        }
      });
      // Only update if different to prevent infinite loop
      const isDifferent =
        Object.keys(initialAnswers).some(
          (key) => initialAnswers[key] !== answers[key]
        ) ||
        Object.keys(answers).some(
          (key) => answers[key] !== initialAnswers[key]
        );
      if (isDifferent) {
        setAnswers(initialAnswers);
      }
    }
  }, [yearlyData]);

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

    setIsSubmitting(true);
    const loadingToastId = toast.loading("שולח נתונים...");

    // Only send records that have been changed (have answers or files)
    const changedItems = yearlyData.filter((item, index) => {
      const questionKey = `${index}-${item.question}`;
      const hasAnswer = answers[questionKey]?.trim();
      const hasFiles = files[questionKey] && files[questionKey].length > 0;
      return hasAnswer || hasFiles;
    });

    if (changedItems.length === 0) {
      toast.error("לא בוצעו שינויים. אנא מלא לפחות שדה אחד כדי לשלוח.", {
        duration: 5000,
      });
      setIsSubmitting(false);
      return;
    }

    const sets = await Promise.all(
      changedItems.map(async (item) => {
        // Find the original index in yearlyData
        const yearlyIndex = yearlyData.findIndex(
          (yearlyItem) => yearlyItem === item
        );
        const questionKey = `${yearlyIndex}-${item.question}`;
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
        <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        <h2 className="mt-8 text-xl font-semibold text-gray-800 text-center">
          נא לא לסגור את החלון. הפעולה יכולה לקחת מספר דקות.
        </h2>
      </div>
    );
  }

  return (
    <div dir="rtl">
      <h2>עדכון בירורים עבור: {employer}</h2>
      <div style={{ color: "red", marginBottom: "1rem" }}>
        הערה: ניתן להגיש את הטופס גם אם חלק מהבירורים טרם הושלמו
      </div>

      <form onSubmit={handleSubmit}>
        {yearlyData.map((item, index) => {
          const questionKey = `${index}-${item.question}`;
          return (
            <div key={`${item.question}-${index}`} className="yearly-set">
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
              <div className="form-group flex items-start gap-4">
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
                <p style={{ color: "blue" }}>הערות: {item.remarks}</p>
              )}
              <hr />
            </div>
          );
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
        .yearly-set {
          margin-bottom: 2rem;
          text-align: right;
        }
        .required {
          color: red;
          margin-inline-end: 0.25rem;
          font-weight: bold;
        }
        .form-group {
          margin-top: 0.5rem;
        }
        input[type="text"] {
          width: 100%;
          max-width: 500px;
          padding: 0.5rem;
          font-size: 1em;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        button[type="submit"] {
          display: block;
          margin: 2rem auto 0;
          padding: 0.75rem 1.5rem;
          background: #007bff;
          color: #fff;
          border: none;
          border-radius: 4px;
          font-size: 1em;
          cursor: pointer;
        }
        button[type="submit"]:disabled {
          background: #aaa;
        }
        button[type="submit"]:hover:not(:disabled) {
          background: #0069d9;
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
