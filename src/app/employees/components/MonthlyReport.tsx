'use client';

import { useState } from 'react';
import ColumnSettings from './ColumnSettings';
import { ColumnSettingsType } from '../types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Settings } from "lucide-react";

interface MonthlyReportProps {
  columnSettings: ColumnSettingsType;
  onColumnToggle: (column: keyof ColumnSettingsType) => void;
}

interface EmployeeData {
  id: number;
  name: string;
  salary: number;
  travel: number;
  competition: boolean;
  fileUpload: boolean;
  accountantNotes: number;
}

// Generate sample data
const generateSampleData = (): EmployeeData[] => {
  return Array.from({ length: 5 }, (_, index) => ({
    id: index + 1,
    name: `עובד ${index + 1}`,
    salary: Math.floor(Math.random() * 10000 + 5000),
    travel: Math.floor(Math.random() * 1000),
    competition: Math.random() > 0.5,
    fileUpload: Math.random() > 0.5,
    accountantNotes: Math.floor(Math.random() * 500),
  }));
};

export default function MonthlyReport({ columnSettings, onColumnToggle }: MonthlyReportProps) {
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [employees] = useState<EmployeeData[]>(generateSampleData());

  const columns = [
    { key: 'id', label: 'מס', show: true },
    { key: 'name', label: 'שם העובד', show: true },
    { key: 'salary', label: 'שכר', show: columnSettings.salary },
    { key: 'travel', label: 'נסיעות', show: columnSettings.travel },
    { key: 'competition', label: 'תחרות', show: columnSettings.competition },
    { key: 'fileUpload', label: 'העלאת קבצים', show: columnSettings.ignoreFiles },
    { key: 'accountantNotes', label: 'הערות רואה חשבון', show: columnSettings.accounting },
  ];

  const visibleColumns = columns.filter(col => col.show);

  return (
    <>
      {/* Settings Button */}
      <div className="flex justify-end mb-4 relative">
        <Button 
          variant="ghost"
          size="icon"
          onClick={() => setShowSettingsPopup(!showSettingsPopup)}
          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
        >
          <Settings className="w-6 h-6" />
        </Button>

        <ColumnSettings 
          isOpen={showSettingsPopup}
          onClose={() => setShowSettingsPopup(false)}
          columnSettings={columnSettings}
          onColumnToggle={onColumnToggle}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" dir="rtl">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-300">
                  {visibleColumns.map((column, index) => (
                    <th 
                      key={column.key}
                      className={`px-4 py-3 text-right text-sm font-medium text-gray-900 ${
                        index < visibleColumns.length - 1 ? 'border-r border-gray-300' : ''
                      }`}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((employee, rowIndex) => (
                  <tr 
                    key={employee.id} 
                    className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                      rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                    }`}
                  >
                    {visibleColumns.map((column, colIndex) => (
                      <td 
                        key={column.key}
                        className={`px-4 py-4 text-right text-sm text-gray-900 ${
                          colIndex < visibleColumns.length - 1 ? 'border-r border-gray-200' : ''
                        }`}
                      >
                        {column.key === 'id' && employee.id}
                        {column.key === 'name' && employee.name}
                        {column.key === 'salary' && `₪${employee.salary.toLocaleString()}`}
                        {column.key === 'travel' && `₪${employee.travel.toLocaleString()}`}
                        {column.key === 'competition' && (employee.competition ? 'כן' : 'לא')}
                        {column.key === 'fileUpload' && (employee.fileUpload ? 'כן' : 'לא')}
                        {column.key === 'accountantNotes' && `₪${employee.accountantNotes.toLocaleString()}`}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
} 