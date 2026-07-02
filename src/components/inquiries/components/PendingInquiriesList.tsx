'use client';

import { useEffect, useMemo, useState } from 'react';
import { MonthlyInquiry } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SupplierTable from './SupplierTable';

interface PendingInquiriesListProps {
  inquiries?: MonthlyInquiry[];
  employer?: string;
  onSelect: (inquiry: MonthlyInquiry) => void;
  activeSupplier?: string | null;
  recordId?: string;
  canForceClose?: boolean;
}

type StatusFilter = 'missing-docs' | 'missing-answer' | 'all';
type SortOption = 'date-desc' | 'date-asc' | 'supplier';

export default function PendingInquiriesList({
  inquiries = [],
  employer,
  onSelect,
  activeSupplier,
  recordId,
  canForceClose = false,
}: PendingInquiriesListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [supplierFilter, setSupplierFilter] = useState<string>('הכל');
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');
  const [forceCloseMap, setForceCloseMap] = useState<Record<string, string>>({});

  const enriched = useMemo(() => {
    return inquiries.map((inquiry) => {
      const missingAnswer =
        inquiry.isTextMandatory && (!inquiry.answer || inquiry.answer.trim().length === 0);
      const missingDocs = inquiry.isDocMandatory && (!inquiry.docs || inquiry.docs.length === 0);
      return { inquiry, missingAnswer, missingDocs, isOpen: true };
    });
  }, [inquiries]);

  useEffect(() => {
    setForceCloseMap((prev) => {
      const updated: Record<string, string> = {};
      inquiries.forEach((inq) => {
        if (prev.hasOwnProperty(inq.recordId)) {
          updated[inq.recordId] = prev[inq.recordId];
        } else {
          updated[inq.recordId] = inq.forceClose || '';
        }
      });
      return updated;
    });
  }, [inquiries]);

  const supplierStats = useMemo(() => {
    const stats = new Map<string, { open: number }>();
    enriched.forEach(({ inquiry, isOpen }) => {
      const name = inquiry.supplier || 'לא ידוע';
      const entry = stats.get(name) || { open: 0 };
      if (isOpen) entry.open += 1;
      stats.set(name, entry);
    });
    return stats;
  }, [enriched]);

  const supplierList = useMemo(() => {
    const baseEntries = Array.from(supplierStats.entries()).map(([name, data]) => ({
      name,
      open: data.open,
    }));

    const term = searchTerm.trim().toLowerCase();
    const filtered =
      term.length > 0
        ? baseEntries.filter((entry) => entry.name.toLowerCase().includes(term))
        : baseEntries;

    filtered.sort((a, b) => {
      if (b.open !== a.open) return b.open - a.open;
      return a.name.localeCompare(b.name);
    });
    const totalOpen = filtered.reduce((sum, item) => sum + item.open, 0);
    return [{ name: 'הכל', open: totalOpen }, ...filtered];
  }, [supplierStats, searchTerm]);

  useEffect(() => {
    const supplierNames = supplierList.map((s) => s.name);
    if (activeSupplier && supplierNames.includes(activeSupplier)) {
      setSupplierFilter(activeSupplier);
      setStatusFilter('all');
    } else if (!activeSupplier) {
      setSupplierFilter('הכל');
      setStatusFilter('all');
    }
  }, [activeSupplier, supplierList]);

  const filtered = useMemo(() => {
    return enriched
      .filter(({ inquiry, missingAnswer, missingDocs }) => {
        if (supplierFilter !== 'הכל' && inquiry.supplier !== supplierFilter) {
          return false;
        }
        const matchesSearch =
          inquiry.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inquiry.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inquiry.details.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        switch (statusFilter) {
          case 'missing-answer':
            return missingAnswer;
          case 'missing-docs':
            return missingDocs;
          default:
            return true;
        }
      })
      .sort((a, b) => {
        if (sortBy === 'supplier') {
          return a.inquiry.supplier.localeCompare(b.inquiry.supplier);
        }
        const dateA = new Date(a.inquiry.date).getTime();
        const dateB = new Date(b.inquiry.date).getTime();
        return sortBy === 'date-asc' ? dateA - dateB : dateB - dateA;
      });
  }, [enriched, searchTerm, statusFilter, sortBy, supplierFilter]);

  const pendingCount = filtered.length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    const [y, m, d] = date.toISOString().split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  };

  const formatCurrency = (val: string | null) => {
    if (val === null || val === undefined || val === '') return '0';
    const cleaned = String(val).replace(/,/g, '').trim();
    const num = Number(cleaned);
    if (Number.isNaN(num)) return String(val);
    return num.toLocaleString('he-IL');
  };

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">בירורי הנהלת חשבונות</h2>
            <p className="text-gray-500 text-sm mt-0.5">{employer}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                תצוגת רשימה
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                תצוגת טבלה
              </Button>
            </div>
          </div>
        </div>
        {viewMode === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="חיפוש לפי ספק, נושא או תיאור"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="col-span-1 md:col-span-3"
            />
          </div>
        )}

        {viewMode === 'list' && (
          <div className="flex flex-wrap gap-2">
            {supplierList.map((supplier) => (
              <Button
                key={supplier.name}
                variant={supplierFilter === supplier.name ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSupplierFilter(supplier.name)}
                className="rounded-full flex items-center gap-2"
              >
                <span>{supplier.name}</span>
                <span className={`text-xs rounded-full px-2 py-0.5 font-semibold ${
                  supplierFilter === supplier.name
                    ? 'bg-white/25 text-white'
                    : 'bg-accent text-accent-foreground'
                }`}>
                  {supplier.open}
                </span>
              </Button>
            ))}
          </div>
        )}

        {viewMode === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="סינון" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="missing-answer">חסר מענה</SelectItem>
                  <SelectItem value="missing-docs">חסרים מסמכים</SelectItem>
                  <SelectItem value="all">הכל</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="מיון" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">תאריך (חדש קודם)</SelectItem>
                  <SelectItem value="date-asc">תאריך (ישן קודם)</SelectItem>
                  <SelectItem value="supplier">לפי ספק</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {viewMode === 'table' ? (
        <SupplierTable
          supplierId={activeSupplier || 'הכל'}
          employer={employer}
          monthlyData={inquiries}
          recordId={recordId}
          canForceClose={canForceClose}
          forceCloseMap={forceCloseMap}
          onForceCloseChange={(id, value) =>
            setForceCloseMap((prev) => ({
              ...prev,
              [id]: value,
            }))
          }
        />
      ) : pendingCount === 0 ? (
        <Card className="border-dashed border-2 border-gray-200 bg-gray-50">
          <CardContent className="py-10 text-center space-y-2">
            <p className="text-lg font-semibold text-gray-800">אין בירורים ממתינים</p>
            <p className="text-gray-600">נסה לשנות את הסינון או החיפוש.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map(({ inquiry }) => (
            <Card
              key={inquiry.recordId}
              className="rounded-xl hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/30 transition-all cursor-pointer"
              style={{ transitionProperty: 'box-shadow, transform, border-color' }}
              onClick={() => onSelect(inquiry)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-xl text-gray-900">{inquiry.supplier}</CardTitle>
                    <p className="text-sm text-gray-600">{inquiry.question}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">תאריך:</span>
                    <span>{formatDate(inquiry.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">מסמכים:</span>
                    <span>{inquiry.docs?.length || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">אסמ:</span>
                    <span>{inquiry.asm}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">חובה:</span>
                    <span>{formatCurrency(inquiry.hova)} ₪</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">זכות:</span>
                    <span>{formatCurrency(inquiry.prev ?? '')} ₪</span>
                  </div>
                </div>
                <p className="text-gray-800 text-sm leading-relaxed line-clamp-2">{inquiry.details}</p>
                <div className="flex justify-end">
                  <Button variant="outline">פתח</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

