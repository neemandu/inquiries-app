'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Period } from '@/lib/types';

interface PeriodDropdownProps {
  periods: Period[];
  selectedPeriodId: string | null;
  onPeriodSelect: (periodId: string) => void;
}

export default function PeriodDropdown({ periods, selectedPeriodId, onPeriodSelect }: PeriodDropdownProps) {
  const formatPeriodDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'פתוחה':
        return 'text-green-600';
      case 'סגורה':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="flex items-center gap-3 mb-4" dir="rtl">
      <span className="text-lg font-bold text-gray-800">תקופת דיווח:</span>
      <Select onValueChange={onPeriodSelect} value={selectedPeriodId || undefined}>
        <SelectTrigger className="w-64 text-lg font-semibold text-right bg-white border-2 border-gray-300" dir="rtl">
          <SelectValue placeholder="בחר תקופת דיווח" />
        </SelectTrigger>
        <SelectContent dir="rtl">
          {periods
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sort by date descending
            .map((period) => (
              <SelectItem key={period.recordId} value={period.recordId}>
                <div className="flex items-center justify-between w-full">
                  <span>{formatPeriodDate(period.date)}</span>
                  <span className={`text-xs mr-2 ${getStatusColor(period.status)}`}>
                    {period.status}
                  </span>
                </div>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
