'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import FileUploadComponent from './FileUploadComponent';
import { MonthlyInquiry } from '@/lib/types';
import { toBase64 } from '@/lib/utils';
import { toast } from 'sonner';

interface SupplierTableProps {
  supplierId: string;
  monthlyData?: MonthlyInquiry[];
  recordId?: string;
  employer?: string;
  canForceClose?: boolean;
  forceCloseMap?: Record<string, string>;
  onForceCloseChange?: (id: string, value: string) => void;
}

export default function SupplierTable({
  supplierId,
  monthlyData,
  recordId,
  employer,
  canForceClose = false,
  forceCloseMap,
  onForceCloseChange,
}: SupplierTableProps) {
  console.log('Supplier table data', monthlyData);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [initialAnswers, setInitialAnswers] = useState<{ [key: string]: string }>({});
  const [forceClose, setForceClose] = useState<{ [key: string]: string }>({});
  const [files, setFiles] = useState<{ [key: string]: File[] }>({});
  const [modifiedKeys, setModifiedKeys] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showForceCloseAckModal, setShowForceCloseAckModal] = useState(false);
  const [pendingForceCloseKey, setPendingForceCloseKey] = useState<string | null>(null);
  const [forceCloseAck, setForceCloseAck] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [sortKey, setSortKey] = useState<
    'supplier' | 'asm' | 'asm2' | 'date' | 'details' | 'hova' | 'prev' | 'question' | 'answer'
  >('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({
    supplier: '',
    asm: '',
    asm2: '',
    date: '',
    details: '',
    hova: '',
    prev: '',
    question: '',
    answer: '',
  });

  const filteredData = supplierId === 'הכל'
    ? monthlyData
    : monthlyData?.filter(item => item.supplier === supplierId);

  const columnFilteredData = useMemo(() => {
    if (!filteredData) return filteredData;
    return filteredData.filter((item) => {
      const answerVal = answers[`${item.recordId}`] || '';
      const checks: [keyof typeof columnFilters, string][] = [
        ['supplier', item.supplier || ''],
        ['asm', item.asm || ''],
        ['asm2', item.asm2 || ''],
        ['date', item.date || ''],
        ['details', item.details || ''],
        ['hova', String(item.hova ?? '')],
        ['prev', String(item.prev ?? '')],
        ['question', item.question || ''],
        ['answer', answerVal],
      ];
      return checks.every(([key, val]) => {
        const filterVal = columnFilters[key] || '';
        if (!filterVal) return true;
        return val.toLowerCase().includes(filterVal.toLowerCase());
      });
    });
  }, [filteredData, columnFilters, answers]);

  const sortedData = useMemo(() => {
    if (!columnFilteredData) return columnFilteredData;
    const getVal = (item: MonthlyInquiry) => {
      switch (sortKey) {
        case 'supplier': return item.supplier || '';
        case 'asm': return item.asm || '';
        case 'asm2': return item.asm2 || '';
        case 'date': return new Date(item.date).getTime() || 0;
        case 'details': return item.details || '';
        case 'hova': return Number(String(item.hova).replace(/,/g, '')) || 0;
        case 'prev': return Number(String(item.prev ?? '').replace(/,/g, '')) || 0;
        case 'question': return item.question || '';
        case 'answer': return answers[`${item.recordId}`] || '';
        default: return '';
      }
    };
    return [...columnFilteredData].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      if (sa < sb) return sortDir === 'asc' ? -1 : 1;
      if (sa > sb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [columnFilteredData, sortDir, sortKey, answers]);

  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
  }, [sortedData]);

  const handleSort = (key: typeof sortKey) => {
    setSortDir((prevDir) => (sortKey === key ? (prevDir === 'asc' ? 'desc' : 'asc') : 'asc'));
    setSortKey(key);
  };

  const renderSortIcon = (key: typeof sortKey) => {
    const active = sortKey === key;
    return (
      <span className="flex flex-col leading-none text-gray-400">
        <ChevronUp className={`w-3 h-3 ${active && sortDir === 'asc' ? 'text-blue-600' : ''}`} />
        <ChevronDown className={`w-3 h-3 ${active && sortDir === 'desc' ? 'text-blue-600' : ''}`} />
      </span>
    );
  };

  // Populate initial answers from data
  useEffect(() => {
    if (filteredData) {
      const initialAnswers: { [key: string]: string } = {};
      const initialForce: { [key: string]: string } = {};
      filteredData.forEach(item => {
        const key = `${item.recordId}`;
        initialAnswers[key] = item.answer || '';
        initialForce[key] = forceCloseMap?.[key] ?? forceClose[key] ?? '';
      });
      // Only initialize if answers is empty (first load or supplier change)
      if (Object.keys(answers).length === 0) {
        setAnswers(initialAnswers);
        setInitialAnswers(initialAnswers);
        setForceClose(initialForce);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredData, forceCloseMap]);

  // Add hover tooltips with the full text of each cell
  useEffect(() => {
    const cells = document.querySelectorAll<HTMLTableCellElement>('.supplier-table td, .supplier-table th');
    cells.forEach((cell) => {
      const field = cell.querySelector('textarea, input');
      const inputValue = (field as HTMLInputElement | HTMLTextAreaElement | null)?.value?.trim();
      const text = inputValue || cell.textContent?.trim();
      if (text && text.length > 0) {
        cell.title = text;
      } else {
        cell.removeAttribute('title');
      }
    });
  }, [filteredData, answers, files]);

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

  const handleForceCloseChange = (key: string, value: string) => {
    setForceClose(prev => ({ ...prev, [key]: value }));
    onForceCloseChange?.(key, value);
    setModifiedKeys(prev => new Set(prev).add(key));
    if (canForceClose && value.trim().length > 0 && !forceCloseAck) {
      setPendingForceCloseKey(key);
      setShowForceCloseAckModal(true);
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

    const hasForceClose = canForceClose
      ? modifiedItems.some(item => {
          const key = `${item.recordId}`;
          return (forceClose[key] || '').trim().length > 0;
        })
      : false;

    if (canForceClose && hasForceClose && !forceCloseAck) {
      toast.error('נא לאשר את ההצהרה לפני שליחת הבירור', { duration: 4000 });
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
          forceClose: canForceClose ? (forceClose[key] || '') : '',
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

      {canForceClose && (
        <div style={{ marginBottom: '1rem' }}>
    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>סגירה בכוח – בחר/י סיבה:</div>
    <ul style={{ margin: 0, paddingInlineStart: '1.25rem' }}>
      <li>הוצאה פרטית – לרשום כנגד כרטיס חו״ז בעלים.</li>
      <li>הוצאה עסקית בלי אסמכתא – לא אצליח להשיג מסמך; לרשום כהוצאה עסקית על בסיס הצהרתי.</li>
      <li>החשבונית הועברה ונבדקה – העברתי למערכת את החשבוניות הנכונה (בדקתי ש- ספק/תאריך/סכום תואמים); מבקש לסגור את הבירור.</li>
    </ul>
  </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit}>
      <button type="submit" disabled={isSubmitting}>
          {modifiedKeys.size === 0 ? 'שלח' : `שלח (${modifiedKeys.size} שינויים)`}
        </button>
        <br />
        <div ref={tableScrollRef} className="supplier-table-scroll">
          <table className="supplier-table">
          <thead>
            <tr className="sticky top-0 z-10 bg-white">
              <th className="cursor-pointer" onClick={() => handleSort('supplier')}>
                <div className="flex items-center gap-1">
                  שם ספק
                  {renderSortIcon('supplier')}
                </div>
              </th>
              <th className="cursor-pointer" onClick={() => handleSort('asm')}>
                <div className="flex items-center gap-1">
                  אסמ.
                  {renderSortIcon('asm')}
                </div>
              </th>
              <th className="cursor-pointer" onClick={() => handleSort('asm2')}>
                <div className="flex items-center gap-1">
                  אסמ. 2
                  {renderSortIcon('asm2')}
                </div>
              </th>
              <th className="cursor-pointer" onClick={() => handleSort('date')}>
                <div className="flex items-center gap-1">
                  תאריך
                  {renderSortIcon('date')}
                </div>
              </th>
              <th className="cursor-pointer" onClick={() => handleSort('details')}>
                <div className="flex items-center gap-1">
                  פרטים
                  {renderSortIcon('details')}
                </div>
              </th>
              <th className="cursor-pointer" onClick={() => handleSort('hova')}>
                <div className="flex items-center gap-1">
                  חובה
                  {renderSortIcon('hova')}
                </div>
              </th>
              <th className="cursor-pointer" onClick={() => handleSort('prev')}>
                <div className="flex items-center gap-1">
                  זכות
                  {renderSortIcon('prev')}
                </div>
              </th>
              <th className="cursor-pointer" onClick={() => handleSort('question')}>
                <div className="flex items-center gap-1">
                  שאלות
                  {renderSortIcon('question')}
                </div>
              </th>
              <th className="cursor-pointer" onClick={() => handleSort('answer')}>
                <div className="flex items-center gap-1">
                  תשובה מילולית
                  {renderSortIcon('answer')}
                </div>
              </th>
              <th>מסמכים</th>
              {canForceClose && <th>סגירת בירור בכוח</th>}
            </tr>
            <tr className="sticky top-10 z-10 bg-white">
              <th>
                <Input
                  value={columnFilters.supplier}
                  onChange={(e) => setColumnFilters((prev) => ({ ...prev, supplier: e.target.value }))}
                  placeholder="חיפוש ספק"
                  className="text-sm"
                />
              </th>
              <th>
                <Input
                  value={columnFilters.asm}
                  onChange={(e) => setColumnFilters((prev) => ({ ...prev, asm: e.target.value }))}
                  placeholder="חיפוש אסמ"
                  className="text-sm"
                />
              </th>
              <th>
                <Input
                  value={columnFilters.asm2}
                  onChange={(e) => setColumnFilters((prev) => ({ ...prev, asm2: e.target.value }))}
                  placeholder="חיפוש אסמ 2"
                  className="text-sm"
                />
              </th>
              <th>
                <Input
                  value={columnFilters.date}
                  onChange={(e) => setColumnFilters((prev) => ({ ...prev, date: e.target.value }))}
                  placeholder="תאריך"
                  className="text-sm"
                />
              </th>
              <th>
                <Input
                  value={columnFilters.details}
                  onChange={(e) => setColumnFilters((prev) => ({ ...prev, details: e.target.value }))}
                  placeholder="פרטים"
                  className="text-sm"
                />
              </th>
              <th>
                <Input
                  value={columnFilters.hova}
                  onChange={(e) => setColumnFilters((prev) => ({ ...prev, hova: e.target.value }))}
                  placeholder="חובה"
                  className="text-sm"
                />
              </th>
              <th>
                <Input
                  value={columnFilters.prev}
                  onChange={(e) => setColumnFilters((prev) => ({ ...prev, prev: e.target.value }))}
                  placeholder="זכות"
                  className="text-sm"
                />
              </th>
              <th>
                <Input
                  value={columnFilters.question}
                  onChange={(e) => setColumnFilters((prev) => ({ ...prev, question: e.target.value }))}
                  placeholder="שאלות"
                  className="text-sm"
                />
              </th>
              <th>
                <Input
                  value={columnFilters.answer}
                  onChange={(e) => setColumnFilters((prev) => ({ ...prev, answer: e.target.value }))}
                  placeholder="תשובה"
                  className="text-sm"
                />
              </th>
              <th />
              {canForceClose && <th />}
            </tr>
          </thead>
          <tbody>
            {sortedData?.map((item, index) => {
              const key = `${item.recordId}`;
              const isModified = modifiedKeys.has(key);
              return (
                <tr key={key + '-' + index} style={{ backgroundColor: isModified ? '#fff3cd' : 'transparent' }}>
                  <td title={item.supplier}>{item.supplier}</td>
                  <td title={item.asm}>{item.asm}</td>
                  <td title={item.asm2 ?? ''}>{item.asm2 ?? ''}</td>
                  <td title={new Date(item.date).toLocaleDateString('he-IL')}>{new Date(item.date).toLocaleDateString('he-IL')}</td>
                  <td title={item.details}>{item.details}</td>
                  <td title={item.hova}>{item.hova}</td>
                  <td title={item.prev ?? ''}>{item.prev ?? ''}</td>
                  <td title={item.question}>{item.question}</td>
                  <td title={answers[key] || ''}>
                    <textarea
                      style={{ border: item.isTextMandatory ? '1px solid red' : '1px solid #ccc' }}
                      value={answers[key] || ''}
                      onChange={(e) => handleAnswerChange(key, e.target.value)}
                      title={answers[key] || ''}
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
                  {canForceClose && (
                    <td>
                      <div className="flex items-center gap-2">
                        <span aria-hidden="true" title="סגירת בירור בכוח">✊</span>
                        <select
                          value={forceClose[key] || ''}
                          onChange={(e) => handleForceCloseChange(key, e.target.value)}
                          style={{
                            width: '100%',
                            border: item.isDocMandatory ? '1px solid red' : '1px solid #ccc',
                            padding: '0.25rem',
                            textAlign: 'right',
                          }}
                          dir="rtl"
                        >
                          <option value="">בחר/י סיבה</option>
                          <option value="הוצאה פרטית – לרשום כנגד כרטיס חו״ז בעלים.">הוצאה פרטית – לרשום כנגד כרטיס חו״ז בעלים.</option>
                          <option value="הוצאה עסקית בלי אסמכתא – לא אצליח להשיג מסמך; לרשום כהוצאה עסקית על בסיס הצהרתי.">הוצאה עסקית בלי אסמכתא – לא אצליח להשיג מסמך; לרשום כהוצאה עסקית על בסיס הצהרתי.</option>
                          <option value="החשבונית הועברה ונבדקה – העברתי למערכת את החשבוניות הנכונה (בדקתי ש- ספק/תאריך/סכום תואמים); מבקש לסגור את הבירור.">החשבונית הועברה ונבדקה – העברתי למערכת את החשבוניות הנכונה (בדקתי ש- ספק/תאריך/סכום תואמים); מבקש לסגור את הבירור.</option>
                        </select>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
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

      {canForceClose && showForceCloseAckModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" dir="rtl">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-3 text-right">אישור הצהרה</h3>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={forceCloseAck}
                onChange={(e) => setForceCloseAck(e.target.checked)}
              />
              <span>אני מאשר/ת שהאחריות על ההצהרה והשלכותיה היא עליי.</span>
            </label>
            <div className="flex gap-3 justify-start mt-4" dir="rtl">
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
                onClick={() => {
                  setShowForceCloseAckModal(false);
                  setPendingForceCloseKey(null);
                }}
                disabled={!forceCloseAck}
              >
                אישור
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded"
                onClick={() => {
                  if (pendingForceCloseKey) {
                    setForceClose(prev => ({ ...prev, [pendingForceCloseKey]: '' }));
                  }
                  setShowForceCloseAckModal(false);
                  setPendingForceCloseKey(null);
                }}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        table {
          table-layout: auto;
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
          table-layout: auto;
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1rem;
        }
        .supplier-table-scroll {
          width: 100%;
          overflow-x: auto;
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
        .supplier-table th:nth-child(6),
        .supplier-table td:nth-child(6),
        .supplier-table th:nth-child(7),
        .supplier-table td:nth-child(7) {
          white-space: nowrap;
          width: 1%;
        }
        .supplier-table th:nth-child(1),
        .supplier-table td:nth-child(1) {
          white-space: normal;
          width: 200px;
          max-width: 200px;
          word-break: break-word;
          overflow-wrap: break-word;
        }
        .supplier-table th:nth-child(5),
        .supplier-table td:nth-child(5) {
          white-space: normal;
          width: 200px;
          max-width: 200px;
          word-break: break-word;
          overflow-wrap: break-word;
        }
        .supplier-table th:nth-child(8),
        .supplier-table td:nth-child(8) {
          white-space: normal;
          width: 200px;
          max-width: 200px;
          word-break: break-word;
          overflow-wrap: break-word;
        }
        .supplier-table th:nth-child(9),
        .supplier-table td:nth-child(9) {
          white-space: normal;
          width: auto;
          min-width: 240px;
          word-break: break-word;
          overflow-wrap: break-word;
        }
        .supplier-table th:nth-child(10),
        .supplier-table td:nth-child(10) {
          white-space: normal;
          min-width: 220px;
          word-break: break-word;
          overflow-wrap: break-word;
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














