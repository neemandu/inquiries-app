'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import { MonthlyInquiry, Docs } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toBase64 } from '@/lib/utils';
import { toast } from 'sonner';
import { FileText, ChevronRight, ChevronLeft } from 'lucide-react';

interface InquiryDetailProps {
  inquiry: MonthlyInquiry;
  employer?: string;
  recordId?: string;
  canForceClose?: boolean;
  onBack: () => void;
  onUpdate?: (inquiry: MonthlyInquiry, resolved?: boolean) => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export default function InquiryDetail({
  inquiry,
  employer,
  recordId,
  canForceClose = false,
  onBack,
  onUpdate,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: InquiryDetailProps) {
  const [answer, setAnswer] = useState(inquiry.answer || '');
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'loading' | 'image' | 'pdf' | 'gview' | 'error'>('loading');
  const [previewFiles, setPreviewFiles] = useState<Docs[]>([]);
  const [forceClose, setForceClose] = useState(inquiry.forceClose || '');
  const [forceCloseAck, setForceCloseAck] = useState(false);
  const hasMultipleDocs = previewFiles.length > 1;
  const isNewDoc = (doc: Docs) => doc.url?.startsWith('blob:');

  const meta = useMemo(() => {
    const missingAnswer = inquiry.isTextMandatory && (!answer || answer.trim().length === 0);
    const hasDocs = (inquiry.docs && inquiry.docs.length > 0) || (newFiles && newFiles.length > 0);
    const missingDocs = inquiry.isDocMandatory && !hasDocs;
    const isOpen = missingAnswer || missingDocs;
    return { missingAnswer, missingDocs, isOpen };
  }, [answer, inquiry, newFiles]);

  const selectedDoc = previewFiles[selectedDocIndex];
  const formattedDate = new Date(inquiry.date).toLocaleDateString('he-IL');

  useEffect(() => {
    setSelectedDocIndex(0);
  }, [inquiry.recordId]);

  useEffect(() => {
    setAnswer(inquiry.answer || '');
    setNewFiles([]);
    setForceClose(inquiry.forceClose || '');
    setForceCloseAck(false);
  }, [inquiry.recordId, inquiry.answer, inquiry.forceClose]);

  useEffect(() => {
    const baseDocs = inquiry.docs || [];
    const blobDocs = newFiles.map((file) => {
      const key = `${file.name}-${file.size}-${file.lastModified}`;
      return {
        id: key,
        filename: file.name,
        url: URL.createObjectURL(file),
        type: file.type,
      };
    });
    setPreviewFiles([...baseDocs, ...blobDocs]);
    setSelectedDocIndex(0);
    return () => {
      blobDocs.forEach((doc) => {
        if (doc.url && doc.url.startsWith('blob:')) {
          URL.revokeObjectURL(doc.url);
        }
      });
    };
  }, [inquiry.docs, inquiry.recordId, newFiles]);

  useEffect(() => {
    if (selectedDocIndex >= previewFiles.length) {
      setSelectedDocIndex(previewFiles.length > 0 ? previewFiles.length - 1 : 0);
    }
  }, [selectedDocIndex, previewFiles.length]);

  const handleDocNavigate = (direction: 'prev' | 'next') => {
    if (previewFiles.length === 0) return;
    setSelectedDocIndex((prev) => {
      const next =
        direction === 'next'
          ? (prev + 1) % previewFiles.length
          : (prev - 1 + previewFiles.length) % previewFiles.length;
      return next;
    });
  };

  const handleRemoveDoc = () => {
    const doc = previewFiles[selectedDocIndex];
    if (!doc || !isNewDoc(doc)) return; // only allow removing newly added files
    // Revoke blob URL
    if (doc.url && doc.url.startsWith('blob:')) {
      URL.revokeObjectURL(doc.url);
    }
    // Remove from newFiles state
    const docKey = doc.id || doc.filename || '';
    setNewFiles((prev) =>
      prev.filter((f) => `${f.name}-${f.size}-${f.lastModified}` !== docKey && f.name !== doc.filename)
    );
    // Remove from preview list
    setPreviewFiles((prev) => prev.filter((_, idx) => idx !== selectedDocIndex));
    setSelectedDocIndex((prev) => (prev > 0 ? prev - 1 : 0));
  };

  useEffect(() => {
    const url = selectedDoc?.url || selectedDoc?.file;
    if (!url) {
      setViewMode('error');
      return;
    }
    const mime = (selectedDoc?.type || '').toLowerCase();
    const cleanUrl = url.split('?')[0].toLowerCase();
    if (mime.startsWith('image/')) {
      setViewMode('image');
    } else if (mime.includes('pdf')) {
      setViewMode('pdf');
    } else if (cleanUrl.endsWith('.pdf')) {
      setViewMode('pdf');
    } else if (/\.(jpg|jpeg|png|gif|webp|svg)$/.test(cleanUrl)) {
      setViewMode('image');
    } else if (/\.(doc|docx|xls|xlsx|ppt|pptx)$/.test(cleanUrl)) {
      setViewMode('gview');
    } else {
      // Default to image; fallback on error
      setViewMode('image');
    }
  }, [selectedDoc]);

  const handleImageError = () => {
    setViewMode('error');
  };

  const handleFileChange = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);
    setNewFiles((prev) => {
      const merged = [...prev, ...incoming];
      const seen = new Set<string>();
      const unique: File[] = [];
      merged.forEach((f) => {
        const key = `${f.name}-${f.size}-${f.lastModified}`;
        if (seen.has(key)) return;
        seen.add(key);
        unique.push(f);
      });
      return unique;
    });
  };

  const isResolved = () => {
    const hasAnswer = !inquiry.isTextMandatory || (!!answer && answer.trim().length > 0);
    const hasDocs =
      !inquiry.isDocMandatory ||
      (inquiry.docs && inquiry.docs.length > 0) ||
      (newFiles && newFiles.length > 0);
    return !!hasAnswer && !!hasDocs;
  };

  const handleSave = async () => {
    if (!recordId) {
      toast.error('חסר מזהה מעסיק לשמירת הבירור');
      return;
    }
    if (canForceClose && forceClose.trim() && !forceCloseAck) {
      toast.error('נא לאשר את ההצהרה לפני שליחת הבירור');
      return;
    }

    setIsSaving(true);
    try {
      const encodedFiles = await Promise.all(
        newFiles.map(async (file) => ({
          name: file.name,
          data: await toBase64(file),
        }))
      );

      const payload = {
        sets: [
          {
            ...inquiry,
            verbalAnswer: answer,
            answer,
            forceClose,
            files: encodedFiles,
          },
        ],
        recordId,
      };

      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const combinedDocs = [
        ...(inquiry.docs || []),
        ...newFiles.map((f) => ({
          id: f.name,
          filename: f.name,
          url: '',
          type: f.type,
        })),
      ];

      const updatedInquiry: MonthlyInquiry = {
        ...inquiry,
        answer,
        forceClose,
        docs: combinedDocs,
      };

      const resolved = isResolved();
      onUpdate?.(updatedInquiry, resolved);
      toast.success('הבירור נשמר בהצלחה');
      setNewFiles([]);
    } catch (error) {
      console.error('Failed to save inquiry', error);
      toast.error('שמירת הבירור נכשלה');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setAnswer(inquiry.answer || '');
    setNewFiles([]);
    setForceClose(inquiry.forceClose || '');
    setForceCloseAck(false);
  };

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900">{inquiry.supplier}</h2>
          <p className="text-gray-600 text-sm">{employer}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {meta.isOpen && (
            <span className="rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-semibold">
              פתוח
            </span>
          )}
          {meta.missingAnswer && (
            <span className="rounded-full bg-red-100 text-red-700 px-3 py-1 text-xs font-semibold">
              חסר מענה
            </span>
          )}
          {meta.missingDocs && (
            <span className="rounded-full bg-orange-100 text-orange-800 px-3 py-1 text-xs font-semibold">
              חסר מסמך
            </span>
          )}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onPrev} disabled={!hasPrev}>
              <ChevronRight className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onNext} disabled={!hasNext}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">
            {isSaving ? 'שומר...' : 'שמירת בירור'}
          </Button>
          <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">
            חזרה
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">פרטי בירור</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ספק</Label>
                <Input value={inquiry.supplier} readOnly />
              </div>
              <div className="space-y-2">
                <Label>תאריך</Label>
                <Input value={formattedDate} readOnly />
              </div>
              <div className="space-y-2">
                <Label>אסמ.</Label>
                <Input value={inquiry.asm} readOnly />
              </div>
              <div className="space-y-2">
                <Label>אסמ. 2</Label>
                <Input value={inquiry.asm2 || ''} readOnly />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>חובה</Label>
                <Input
                  value={`${(() => {
                    const cleaned = String(inquiry.hova ?? 0).replace(/,/g, '').trim();
                    const num = Number(cleaned);
                    return Number.isNaN(num) ? inquiry.hova ?? '' : num.toLocaleString('he-IL');
                  })()} ₪`}
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label>זכות</Label>
                <Input
                  value={`${(() => {
                    const cleaned = String(inquiry.prev ?? 0).replace(/,/g, '').trim();
                    const num = Number(cleaned);
                    return Number.isNaN(num) ? inquiry.prev ?? '' : num.toLocaleString('he-IL');
                  })()} ₪`}
                  readOnly
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-blue-700">שאלה</Label>
              <textarea
                className="w-full rounded-md border border-blue-300 p-3 text-base min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={inquiry.question}
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                תשובה מילולית
                {inquiry.isTextMandatory && <span className="text-red-500">*</span>}
              </Label>
              <textarea
                className={`w-full rounded-md p-3 text-sm min-h-[140px] border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  inquiry.isTextMandatory && meta.missingAnswer ? 'border-red-500' : 'border-gray-300'
                }`}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="כתבו את המענה כאן..."
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                העלאת מסמכים
                {inquiry.isDocMandatory && <span className="text-red-500">*</span>}
              </Label>
              <div className="flex flex-col gap-3">
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFileChange(e.target.files)}
                  className={`block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${
                    inquiry.isDocMandatory && meta.missingDocs ? 'border border-red-500 rounded-md' : ''
                  }`}
                />
                {canForceClose && (
                  <div className="flex flex-col gap-1 w-full">
                  <Label className="text-sm font-medium">סגירת בירור בכוח</Label>
                  <Select value={forceClose} onValueChange={setForceClose} dir="rtl">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="בחר/י סיבה" />
                    </SelectTrigger>
                    <SelectContent className="text-right" dir="rtl">
                      <SelectItem value="הוצאה פרטית – לרשום כנגד כרטיס חו״ז בעלים.">הוצאה פרטית – לרשום כנגד כרטיס חו״ז בעלים.</SelectItem>
                      <SelectItem value="הוצאה עסקית בלי אסמכתא – לא אצליח להשיג מסמך; לרשום כהוצאה עסקית על בסיס הצהרתי.">הוצאה עסקית בלי אסמכתא – לא אצליח להשיג מסמך; לרשום כהוצאה עסקית על בסיס הצהרתי.</SelectItem>
                      <SelectItem value="החשבונית הועברה ונבדקה – העברתי למערכת את החשבוניות הנכונה (בדקתי ש- ספק/תאריך/סכום תואמים); מבקש לסגור את הבירור.">החשבונית הועברה ונבדקה – העברתי למערכת את החשבוניות הנכונה (בדקתי ש- ספק/תאריך/סכום תואמים); מבקש לסגור את הבירור.</SelectItem>
                    </SelectContent>
                  </Select>
                  <label className="mt-2 flex items-start gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={forceCloseAck}
                      onChange={(e) => setForceCloseAck(e.target.checked)}
                    />
                    <span>אני מאשר/ת שהאחריות על ההצהרה והשלכותיה היא עליי.</span>
                  </label>
                  </div>
                )}
              </div>
              {newFiles.length > 0 && (
                <p className="text-sm text-gray-700">
                  {newFiles.length} קבצים נבחרו לשליחה: {newFiles.map((f) => f.name).join(', ')}
                </p>
              )}
              {inquiry.isDocMandatory && meta.missingDocs && (
                <p className="text-xs text-red-600">נדרש לצרף מסמך</p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleReset} disabled={isSaving}>
                ביטול שינויים
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'שומר...' : 'שמירת בירור'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 h-full">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-lg text-gray-900">תצוגת קבצים</CardTitle>
              <div className="flex items-center gap-2">
                {hasMultipleDocs && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => handleDocNavigate('prev')}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-600">
                      {selectedDocIndex + 1}/{previewFiles.length}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => handleDocNavigate('next')}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </>
                )}
                {selectedDoc && isNewDoc(selectedDoc) && (
                  <Button variant="destructive" size="sm" onClick={handleRemoveDoc}>
                    הסר קובץ
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedDoc ? (
              <div className="space-y-3">
                <div className="aspect-[3/4] w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  {viewMode === 'pdf' && (
                    <div className="w-full h-full">
                      {(() => {
                        const raw = selectedDoc.url || selectedDoc.file || '';
                        const pdfFit = raw.includes('#') ? raw : `${raw}#view=FitH`;
                        const gview = `https://docs.google.com/gview?url=${encodeURIComponent(raw)}&embedded=true#zoom=page-fit`;
                        return (
                          <object
                            data={pdfFit}
                            type="application/pdf"
                            className="w-full h-full min-h-[600px]"
                          >
                            <iframe
                              src={gview}
                              className="h-full w-full border-0"
                              title={selectedDoc.filename}
                              style={{ minHeight: '600px' }}
                            />
                          </object>
                        );
                      })()}
                    </div>
                  )}
                  {viewMode === 'gview' && (
                    <iframe
                      src={`https://docs.google.com/gview?url=${encodeURIComponent(selectedDoc.url || selectedDoc.file || '')}&embedded=true#zoom=page-fit`}
                      className="h-full w-full border-0 bg-slate-50 min-h-[600px]"
                      title={selectedDoc.filename}
                    />
                  )}
                  {viewMode === 'image' && (
                    <div className="w-full h-full flex items-start justify-center p-4 bg-slate-100 overflow-auto">
                      <img
                        src={selectedDoc.url || selectedDoc.file || ''}
                        alt={selectedDoc.filename}
                        className="object-contain shadow-sm"
                        style={{ width: '100%', height: 'auto', maxWidth: '100%' }}
                        onError={handleImageError}
                      />
                    </div>
                  )}
                  {viewMode === 'error' && (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-slate-500 text-center">
                      <FileText className="w-12 h-12 mb-2 text-slate-400" />
                      <h3 className="font-semibold text-slate-700 mb-1">לא ניתן להציג תצוגה מקדימה</h3>
                      <p className="text-sm mb-4 max-w-xs">הקובץ אינו נתמך לתצוגה ישירה</p>
                      <Button variant="outline" onClick={() => window.open(selectedDoc.url || selectedDoc.file || '', '_blank')}>
                        פתח קובץ בחלון חדש
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-900">{selectedDoc.filename}</p>
                  {(selectedDoc.url || selectedDoc.file) && (
                    <a
                      href={selectedDoc.url || selectedDoc.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 text-sm underline"
                    >
                      פתח קובץ
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
                אין קבצים מצורפים לבירור זה
              </div>
            )}

            {inquiry.docs && inquiry.docs.length > 1 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-900">קבצים נוספים</p>
                <ul className="space-y-2 text-sm text-gray-800">
                  {inquiry.docs.map((doc, idx) => (
                    <li key={doc.id || doc.url || idx} className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDocIndex(idx)}
                        className={`text-right truncate flex-1 ${idx === selectedDocIndex ? 'font-semibold text-blue-700' : 'text-gray-800'}`}
                        title={doc.filename}
                      >
                      {doc.filename}
                    </button>
                      {(doc.url || doc.file) && (
                        <a
                          href={doc.url || doc.file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline whitespace-nowrap"
                        >
                          פתח
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
