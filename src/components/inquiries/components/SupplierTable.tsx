'use client';

import React, { useState } from 'react';
import FileUploadComponent from './FileUploadComponent';
import { MonthlyInquiry } from '@/lib/types';
import { toBase64 } from '@/lib/utils';

interface SupplierTableProps {
    supplierId: string;
    monthlyData?: MonthlyInquiry[];
    recordId?: string;
    employer?: string;
}

export default function SupplierTable({ supplierId, monthlyData, recordId, employer }: SupplierTableProps) {
    console.log(monthlyData);
    const [answers, setAnswers] = useState<{ [key: string]: string }>({});
    const [files, setFiles] = useState<{ [key: string]: File[] }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAnswerChange = (asm: string, value: string) => {
        setAnswers(prev => ({ ...prev, [asm]: value }));
    };

    const handleFilesChange = (asm: string, newFiles: File[]) => {
        setFiles(prev => ({ ...prev, [asm]: newFiles }));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!recordId || !filteredData) return;

        setIsSubmitting(true);

        const sets = await Promise.all(
            filteredData.map(async item => {
                const itemFiles = files[item.asm] || [];
                const encodedFiles = await Promise.all(
                    itemFiles.map(async f => ({
                        name: f.name,
                        data: await toBase64(f),
                    }))
                );

                return {
                    ...item,
                    verbalAnswer: answers[item.asm] || '',
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
            alert('הנתונים נשלחו בהצלחה!');
            window.location.reload();
        } catch (error) {
            console.error('Failed to submit supplier data:', error);
            alert(`שגיאה בשליחת הנתונים: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredData = supplierId === 'הכל'
        ? monthlyData
        : monthlyData?.filter(item => item.supplier === supplierId);

    if (!monthlyData) {
        return <div>טוען נתונים...</div>;
    }

    if (isSubmitting) {
        return <div>שולח נתונים...</div>;
    }

    return (
        <div dir="rtl">
            <div className="logo-container">
                <img src="https://i.imgur.com/J6mXT1Z.jpeg" alt="לוגו" />
            </div>
            <h2>עדכון בירורים עבור: {employer}</h2>
            <div style={{ color: 'red', marginBottom: '1rem' }}>
                הערה: ניתן להגיש את הטופס גם אם חלק מהבירורים טרם הושלמו
            </div>

            <form onSubmit={handleSubmit}>
                <table className="supplier-table">
                    <colgroup>
                        <col style={{ width: '8%' }} /> {/* שם ספק */}
                        <col style={{ width: '6%' }} /> {/* אסמ. */}
                        <col style={{ width: '6%' }} /> {/* אסמ. 2 */}
                        <col style={{ width: '7%' }} /> {/* תאריך */}
                        <col style={{ width: '18%' }} /> {/* פרטים */}
                        <col style={{ width: '7%' }} /> {/* חובה */}
                        <col style={{ width: '7%' }} /> {/* זכות */}
                        <col style={{ width: '8%' }} /> {/* שאלות */}
                        <col style={{ width: '20%' }} /> {/* תשובה מילולית */}
                        <col style={{ width: '13%' }} /> {/* מסמכים */}
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
                        {filteredData?.map((item, index) => (
                            <tr key={item.asm || index}>
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
                                        value={answers[item.asm] || ''}
                                        onChange={(e) => handleAnswerChange(item.asm, e.target.value)}
                                        placeholder="תשובה..."
                                        required={item.isTextManadatory}
                                    />
                                </td>
                                <td>
                                    <FileUploadComponent
                                        onFilesChange={(newFiles) => handleFilesChange(item.asm, newFiles)}
                                        isMandatory={item.isDocsMandatory}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button type="submit" disabled={isSubmitting}>שלח</button>
            </form>

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