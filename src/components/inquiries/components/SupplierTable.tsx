'use client';

import React, { useState, useEffect, useRef } from 'react';
import FileUploadComponent from './FileUploadComponent';
import { MonthlyInquiry } from '@/lib/types';
import { toBase64 } from '@/lib/utils';
import { toast } from 'sonner';

interface SupplierTableProps {
  supplierId: string;
  monthlyData?: MonthlyInquiry[];
  recordId?: string;
  employer?: string;
}

export default function SupplierTable({ supplierId, monthlyData, recordId, employer }: SupplierTableProps) {
  console.log('Supplier table data', monthlyData);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [initialAnswers, setInitialAnswers] = useState<{ [key: string]: string }>({});
  const [files, setFiles] = useState<{ [key: string]: File[] }>({});
  const [modifiedKeys, setModifiedKeys] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const filteredData = supplierId === 'הכל'
    ? monthlyData
    : monthlyData?.filter(item => item.supplier === supplierId);

  // Populate initial answers from data
  useEffect(() => {
    if (filteredData) {
      const initialAnswers: { [key: string]: string } = {};
      filteredData.forEach(item => {
        const key = `${item.recordId}`;
        initialAnswers[key] = item.answer || '';
      });
      // Only initialize if answers is empty (first load or supplier change)
      if (Object.keys(answers).length === 0) {
        setAnswers(initialAnswers);
        setInitialAnswers(initialAnswers);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredData]);

  const handleAnswerChange = (key: string, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
    
    // Track if this answer was modified
    const initialValue = initialAnswers[key] || '';
    if (value !== initialValue) {
      setModifiedKeys(prev => new Set(prev).add(key));
    } else {
      setModifiedKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  };

  const handleFilesChange = (key: string, newFiles: File[]) => {
    setFiles(prev => {
      const updated = { ...prev, [key]: newFiles };

      // Calculate total size across all selected files (in bytes)
      const totalSize = Object.values(updated)
        .flat()
        .reduce((sum, f) => sum + (f?.size || 0), 0);

      // If total >= 3MB, open confirmation modal
      if (totalSize >= 5 * 1024 * 1024) {
        setShowConfirmSubmit(true);
      }

      return updated;
    });
    
    // Mark as modified when files are added/changed
    if (newFiles.length > 0) {
      setModifiedKeys(prev => new Set(prev).add(key));
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recordId || !filteredData) return;

    // Filter only modified items
    const modifiedItems = filteredData.filter(item => {
      const key = `${item.recordId}`;
      return modifiedKeys.has(key);
    });

    if (modifiedItems.length === 0) {
      toast.success('לא נמצאו שינויים לשליחה', { duration: 3000 });
      return;
    }

    setIsSubmitting(true);

    const sets = await Promise.all(
      modifiedItems.map(async item => {
        const key = `${item.recordId}`;
        const itemFiles = files[key] || [];
        const encodedFiles = await Promise.all(
          itemFiles.map(async f => ({
            name: f.name,
            data: await toBase64(f),
          }))
        );

        return {
          ...item,
          verbalAnswer: answers[key] || '',
          files: encodedFiles,
        };
      })
    );

    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sets, recordId }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`הנתונים נשלחו בהצלחה! (${modifiedItems.length} רשומות עודכנו)`, { duration: 5000 });
      
      // Clear modified keys after successful submission
      setModifiedKeys(new Set());
      setInitialAnswers({...answers});
      
      // Refresh the page after successful response
      window.location.reload();
    } catch (error) {
      console.error('Failed to submit supplier data:', error);
      toast.error(`שגיאה בשליחת הנתונים: ${error instanceof Error ? error.message : 'Unknown error'}`, { duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!monthlyData) {
    return <div dir="rtl" className="text-center">טוען נתונים...</div>;
  }

  if (isSubmitting) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        <h2 className="mt-8 text-xl font-semibold text-gray-800 text-center">נא לא לסגור את החלון. הפעולה יכולה לקחת מספר דקות.</h2>
      </div>
    );
  }
  console.log('filteredData', filteredData);

  return (
    <div dir="rtl">
      <h2>עדכון בירורים עבור: {employer}</h2>
      <div style={{ color: 'red', marginBottom: '1rem' }}>
        הערה: ניתן להגיש את הטופס גם אם חלק מהבירורים טרם הושלמו
      </div>
      {modifiedKeys.size > 0 && (
        <div style={{ color: 'green', marginBottom: '1rem' }}>
          {modifiedKeys.size} רשומות שונו ויישלחו
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit}>
      <button type="submit" disabled={isSubmitting}>
          {modifiedKeys.size === 0 ? 'שלח' : `שלח (${modifiedKeys.size} שינויים)`}
        </button>
        <br />
        <table className="supplier-table">
          <colgroup>
            <col style={{ width: '12%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '30%' }} />
            <col style={{ width: '30%' }} />
            <col style={{ width: '20%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>שם ספק</th>
              <th>אסמ.</th>
              <th>אסמ. 2</th>
              <th>תאריך</th>
              <th>פרטים</th>
              <th>חובה</th>
              <th>זכות</th>
              <th>שאלות</th>
              <th>תשובה מילולית</th>
              <th>מסמכים</th>
            </tr>
          </thead>
          <tbody>
            {filteredData?.map((item, index) => {
              const key = `${item.recordId}`;
              const isModified = modifiedKeys.has(key);
              return (
                <tr key={key + '-' + index} style={{ backgroundColor: isModified ? '#fff3cd' : 'transparent' }}>
                  <td>{item.supplier}</td>
                  <td>{item.asm}</td>
                  <td>{item.asm2}</td>
                  <td>{new Date(item.date).toLocaleDateString('he-IL')}</td>
                  <td>{item.details}</td>
                  <td>{item.hova}</td>
                  <td>{item.prev}</td>
                  <td>{item.question}</td>
                  <td>
                    <textarea
                      style={{ border: item.isTextMandatory ? '1px solid red' : '1px solid #ccc' }}
                      value={answers[key] || ''}
                      onChange={(e) => handleAnswerChange(key, e.target.value)}
                      placeholder="תשובה..."
                    />
                  </td>
                  <td>
                    <FileUploadComponent
                      onFilesChange={(newFiles) => handleFilesChange(key, newFiles)}
                      isMandatory={item.isDocMandatory}
                    />
                    {item.docs.length > 0 && (
                      <ul className="flex flex-col gap-1 list-disc pr-4 w-full">
                        {item.docs.map((doc) => (
                          <li key={doc.id}>
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ textDecoration: 'underline' }}
                              title={doc.filename}
                            >
                              {doc.filename?.length && doc.filename?.length > 10 ? doc.filename?.slice(0, 10) + '...' : doc.filename}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button type="submit" disabled={isSubmitting}>
          {modifiedKeys.size === 0 ? 'שלח' : `שלח (${modifiedKeys.size} שינויים)`}
        </button>
      </form>

      {showConfirmSubmit && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" dir="rtl">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-3 text-right">האם לשלוח את הקבצים?</h3>
            <p className="text-sm text-gray-700 mb-6 text-right">הקבצים שצירפת מגיעים לנפח של לפחות 5MB. האם ברצונך לשלוח את מה שמילאת עד כה?</p>
            <div className="flex gap-3 justify-start" dir="rtl">
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={() => {
                  setShowConfirmSubmit(false);
                  // Trigger form submit programmatically
                  formRef.current?.requestSubmit();
                }}
              >
                כן
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded"
                onClick={() => setShowConfirmSubmit(false)}
              >
                לא
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        table {
          table-layout: fixed;
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1rem;
        }
        th,
        td {
          border: 1px solid #ccc;
          padding: 0.5rem;
          overflow: hidden;
        }
        th {
          background: #eee;
        }
        th:nth-child(2),
        td:nth-child(2) {
          width: 150px;
        }
        th:nth-child(10),
        td:nth-child(10) {
          width: 300px;
        }
        th:nth-child(11),
        td:nth-child(11) {
          width: 300px;
        }
        table th,
        table td {
          font-size: 0.85em;
        }
        textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 0.5rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 1em;
          resize: vertical;
        }
        button[type="submit"] {
          display: block;
          margin: 1rem auto 0;
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
        .supplier-table {
          table-layout: fixed;
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1rem;
        }
        .supplier-table th,
        .supplier-table td {
          border: 1px solid #ccc;
          padding: 0.5rem;
          overflow: hidden;
          text-align: right;
          font-size: 0.85em;
        }
        .supplier-table th {
          background: #eee;
        }
        textarea {
          width: 100%;
          min-height: 50px;
          box-sizing: border-box;
        }
        .logo-container {
          text-align: center;
          margin-bottom: 1rem;
        }
        .logo-container img {
          max-width: 200px;
        }
      `}</style>
    </div>
  );
} 
