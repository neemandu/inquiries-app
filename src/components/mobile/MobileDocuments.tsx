'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { EmployerDocumentsMonth, fetchEmployerDocuments } from '@/lib/employerDocuments';
import { inquiryMonthLabel } from '@/lib/inquiries';
import Breadcrumbs from '@/components/mobile/Breadcrumbs';
import MaskIcon from '@/components/mobile/MaskIcon';
import { mobilePrimaryButton } from '@/components/auth/MobileAuthHeader';

interface DocumentItem {
  key: string;
  label: string;
  fileName: string;
  url: string;
}

interface MobileDocumentsProps {
  recordId?: string;
  onHome: () => void;
}

const secondaryButton =
  'flex items-center justify-center border border-[#849acb] bg-white px-[14px] py-2 text-[16px] font-semibold text-[#0f1a33]';

function fileExtension(url: string) {
  const match = new URL(url, window.location.href).pathname.match(/\.([a-z0-9]{2,5})$/i);
  return match ? match[1] : 'pdf';
}

// Downloads through a blob so the file is saved instead of opened; fails when the host blocks cross-origin reads
async function downloadFile({ url, fileName }: DocumentItem) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `${fileName}.${fileExtension(url)}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

// Monthly documents prepared by the office, newest month first (Figma: Client Portal mobile / Documents for download)
export default function MobileDocuments({ recordId, onHome }: MobileDocumentsProps) {
  const [months, setMonths] = useState<EmployerDocumentsMonth[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [blocked, setBlocked] = useState<DocumentItem[]>([]);

  const load = useCallback(async () => {
    if (!recordId) return;
    setLoadFailed(false);
    setMonths(null);
    try {
      setMonths(await fetchEmployerDocuments(recordId));
    } catch (error) {
      console.error('Failed to load employer documents', error);
      setLoadFailed(true);
    }
  }, [recordId]);

  useEffect(() => {
    load();
  }, [load]);

  const sections = [...(months ?? [])]
    .sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime())
    .map((month) => {
      const monthName = inquiryMonthLabel(month.Date) || month.Date;
      return {
        title: monthName,
        items: Object.entries(month.Docs)
          .filter(([, url]) => !!url)
          .map(([type, url]): DocumentItem => ({ key: `${month.Date}|${type}`, label: type, fileName: `${type} ${monthName}`, url })),
      };
    })
    .filter((section) => section.items.length > 0);
  const allItems = sections.flatMap((section) => section.items);

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const downloadSelected = async () => {
    setDownloading(true);
    setBlocked([]);
    const failed: DocumentItem[] = [];
    for (const item of allItems.filter((i) => selected.has(i.key))) {
      try {
        await downloadFile(item);
      } catch (error) {
        console.error('Direct download failed, offering a link instead', error);
        failed.push(item);
      }
    }
    setBlocked(failed);
    setDownloading(false);
  };

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pb-[100px] pt-5 leading-[normal]">
      <Breadcrumbs crumbs={[{ label: 'דף הבית', onClick: onHome }, { label: 'מסמכים בגישה מהירה' }]} />

      <div className="flex w-full flex-col gap-4">
        <h1 className="text-[16px] font-bold text-[#1e3465]">מסמכים בגישה מהירה</h1>

        {loadFailed ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-[16px] text-[#0f1a33]">לא ניתן לטעון כרגע את המסמכים</p>
            <button type="button" onClick={load} className={secondaryButton}>נסו שוב</button>
          </div>
        ) : months === null ? (
          <p className="py-16 text-center text-lg text-gray-600">טוען נתונים...</p>
        ) : allItems.length === 0 ? (
          <p className="py-10 text-center text-[16px] text-[#6b7280]">אין מסמכים זמינים להורדה</p>
        ) : (
          sections.map((section) => (
            <section key={section.title} className="flex flex-col gap-3">
              {sections.length > 1 && <h2 className="text-[14px] font-semibold text-[#6b7280]">{section.title}</h2>}
              {section.items.map((item) => {
                const checked = selected.has(item.key);
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggle(item.key)}
                    className="flex h-[70px] w-full items-center justify-between border-[0.5px] border-[#eaeef6] bg-white p-4 drop-shadow-[0_4px_10px_rgba(0,0,0,0.05)]"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-[#0f1a33]">
                      <MaskIcon src="/icons/mobile/file-text.svg" size={20} />
                      <span className="truncate text-[14px] font-semibold">{item.label}</span>
                    </span>
                    <span className="text-[#0f1a33]">
                      <MaskIcon src={`/icons/mobile/${checked ? 'checkbox-checked' : 'checkbox-empty'}.svg`} size={16} />
                    </span>
                  </button>
                );
              })}
            </section>
          ))
        )}
      </div>

      {allItems.length > 0 && (
        <button
          type="button"
          onClick={downloadSelected}
          disabled={selected.size === 0 || downloading}
          className={`${mobilePrimaryButton} gap-2 text-[15px]`}
        >
          <Download className="size-5" aria-hidden />
          {downloading ? 'מוריד...' : 'הורדת המסמכים שנבחרו'}
        </button>
      )}

      {blocked.length > 0 && (
        <div className="flex flex-col gap-2 border border-[#eaeef6] bg-white p-4 text-[14px]">
          <p className="text-[#0f1a33]">לא ניתן היה להוריד את המסמכים הבאים אוטומטית. הקישו כדי לפתוח:</p>
          {blocked.map((item) => (
            <a key={item.key} href={item.url} target="_blank" rel="noreferrer" className="text-[#365fb7] underline">
              {item.fileName}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
