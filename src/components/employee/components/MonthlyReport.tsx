'use client';

import { useState } from 'react';
import ColumnSettings from './ColumnSettings';
import { ColumnSettingsType, Employee, ApiResponse, DynamicColumnSettings } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Settings } from "lucide-react";

interface MonthlyReportProps {
  columnSettings: ColumnSettingsType;
  onColumnToggle: (column: keyof ColumnSettingsType) => void;
  dynamicColumnSettings: DynamicColumnSettings;
  onDynamicColumnToggle: (columnNameRecordId: string) => void;
  employees: Employee[];
  apiResponse: ApiResponse | null;
  clientRecordId: string;
}

interface EmployeeData {
  id: number;
  name: string;
  salary: number;
  travel: number;
  competition: boolean;
  fileUpload: boolean;
  accountantNotes: number;
  [key: string]: string | number | boolean; // Allow dynamic properties
}

// Convert API employee data to display format
const convertEmployeeData = (apiEmployees: Employee[]): EmployeeData[] => {
  return apiEmployees.map((employee, index) => ({
    id: index + 1,
    name: `${employee.firstName} ${employee.lastName}`,
    salary: employee.salary || 0,
    travel: 0, // This would need to be calculated based on your business logic
    competition: false, // This would need to be determined based on your business logic
    fileUpload: false, // This would need to be determined based on your business logic
    accountantNotes: 0, // This would need to be calculated based on your business logic
  }));
};

// Generate sample data as fallback
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

export default function MonthlyReport({ columnSettings, onColumnToggle, dynamicColumnSettings, onDynamicColumnToggle, employees, apiResponse, clientRecordId }: MonthlyReportProps) {
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  
  // Use API data if available, otherwise fallback to sample data
  const displayEmployees = employees.length > 0 ? convertEmployeeData(employees) : generateSampleData();

  // Create dynamic columns based on API response
  const getDynamicColumns = () => {
    if (!apiResponse?.columnNames) {
      // Fallback to static columns if no API data
      return [
        { key: 'id', label: 'מס', show: true },
      ];
    }

    // Always show basic columns
    const baseColumns = [
      { key: 'id', label: 'מס', show: true },
      { key: 'name', label: 'שם העובד', show: true },
    ];

    // Add dynamic columns from API response based on dynamicColumnSettings
    const dynamicColumns = apiResponse.columnNames
      .filter(col => dynamicColumnSettings[col.columnNameRecordId] === true)
      .map(col => ({
        key: col.columnNameRecordId, // Use recordId as key
        label: col.columnName, // Use column name as label
        show: col.isOn,
        recordId: col.recordId
      }));


    return [...baseColumns, ...dynamicColumns];
  };

  const columns = getDynamicColumns();
  const visibleColumns = columns.filter(col => col.show);

  // Render cell content based on column type
  const renderCellContent = (column: { key: string; label: string; show: boolean }, employee: EmployeeData) => {
    switch (column.key) {
      case 'id':
        return employee.id;
      case 'name':
        return employee.name;
      case 'salary':
        return `₪${employee.salary.toLocaleString()}`;
      case 'travel':
        return `₪${employee.travel.toLocaleString()}`;
      case 'competition':
        return employee.competition ? 'כן' : 'לא';
      case 'fileUpload':
        return employee.fileUpload ? 'כן' : 'לא';
      case 'accountantNotes':
        return `₪${employee.accountantNotes.toLocaleString()}`;
      default:
        // For dynamic columns, show placeholder data or actual data if available
        if (employee[column.key] !== undefined) {
          return employee[column.key];
        }
        return '₪0'; // Default placeholder for dynamic columns
    }
  };

  return (
    <>
      {/* Settings Button */}
      <div className="flex justify-end items-center mb-4">
        
        <div className="relative">
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
            dynamicColumnSettings={dynamicColumnSettings}
            onDynamicColumnToggle={onDynamicColumnToggle}
            apiResponse={apiResponse}
            clientRecordId={clientRecordId}
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-[1000px]">
            <table className="w-full overflow-x-auto" dir="rtl">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-300">
                  {visibleColumns.map((column, index) => (
                    <th 
                      key={column.key}
                      className={`px-4 py-3 text-right text-sm font-medium text-gray-900 ${
                        index < visibleColumns.length - 0 ? 'border-r border-gray-300' : ''
                      }`}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayEmployees.map((employee, rowIndex) => (
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
                          colIndex < visibleColumns.length - 0 ? 'border-r border-gray-200' : ''
                        }`}
                      >
                        {renderCellContent(column, employee)}
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