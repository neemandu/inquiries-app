'use client';

import { useState, useEffect } from 'react';
import ColumnSettings from './ColumnSettings';
import { ColumnSettingsType, ApiResponse, DynamicColumnSettings, EditableEmployee, EditableColumn } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Settings, Save, Upload } from "lucide-react";
import { updateMonthlyEmployeeData, fetchMonthlyEmployeesData } from '@/lib/utils';
import { toast } from 'sonner';
import { useUser } from '@clerk/nextjs';

interface ColumnNameConfig {
  isOn: boolean;
  recordId: string | null;
  columnName: string;
  columnNameRecordId: string;
}

interface MonthlyReportProps {
  columnSettings: ColumnSettingsType;
  onColumnToggle: (column: keyof ColumnSettingsType) => void;
  dynamicColumnSettings: DynamicColumnSettings;
  onDynamicColumnToggle: (columnNameRecordId: string) => void;
  apiResponse: ApiResponse | null;
  clientRecordId: string;
  onRefetchData?: () => void;
}

export default function MonthlyReport({ 
  columnSettings, 
  onColumnToggle, 
  dynamicColumnSettings, 
  onDynamicColumnToggle, 
  apiResponse, 
  clientRecordId, 
  onRefetchData 
}: MonthlyReportProps) {
  const { user } = useUser();
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [editableEmployees, setEditableEmployees] = useState<EditableEmployee[]>([]);
  const [columnNames, setColumnNames] = useState<ColumnNameConfig[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Load monthly employees data from the new API
  const loadMonthlyEmployeesData = async () => {
    if (!user?.emailAddresses?.[0]?.emailAddress) return;
    
    setIsLoading(true);
    try {
      const data = await fetchMonthlyEmployeesData(user.emailAddresses[0].emailAddress);
      if (data?.employees) {
        // Store columnNames configuration for filtering
        if (data.columnNames) {
          setColumnNames(data.columnNames);
        }

        // Convert API response format to EditableEmployee format
        const filteredEmployees: EditableEmployee[] = data.employees.map(employee => ({
          id: employee.id,
          columns: employee.columns.map(col => ({
            name: col.name,
            columnId: col.columnId,
            oldValue: Array.isArray(col.oldValue) ? col.oldValue.join(', ') : (col.oldValue ?? ''),
            type: col.type === 'multilineText' ? 'string' : 
                  col.type === 'autoNumber' ? 'autoNumber' : 
                  col.type === 'multipleRecordLinks' ? 'string' : 
                  col.type === 'multipleLookupValues' ? 'string' : 'string',
            isMust: col.isMust,
            newValue: Array.isArray(col.oldValue) ? col.oldValue.join(', ') : (col.oldValue ?? '')
          } as EditableColumn))
        }));
        setEditableEmployees(filteredEmployees);
        console.log('filteredEmployees', filteredEmployees);
      }
    } catch (error) {
      console.error('Failed to load monthly employees data:', error);
      toast.error('שגיאה בטעינת נתוני העובדים');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadMonthlyEmployeesData();
  }, [user]);

  // Helper function to get employee name for display
  const getEmployeeName = (employee: EditableEmployee): string => {
    const firstNameCol = employee.columns.find((col: EditableColumn) => 
      col.name.includes('שם פרטי') || col.name.includes('First Name') || col.columnId.includes('firstName')
    );
    const lastNameCol = employee.columns.find((col: EditableColumn) => 
      col.name.includes('שם משפחה') || col.name.includes('Last Name') || col.columnId.includes('lastName')
    );
    
    const firstName = firstNameCol?.oldValue || '';
    const lastName = lastNameCol?.oldValue || '';
    
    return `${firstName} ${lastName}`.trim() || `עובד ${employee.id.slice(-4)}`;
  };

  // Get columns for display, ensuring "הערות רואה חשבון" is leftmost
  const getDisplayColumns = () => {
    if (editableEmployees.length === 0) return [];

    // Get all unique column types from all employees
    const allColumns = new Map<string, { name: string; columnId: string; type: string }>();
    
    editableEmployees.forEach(employee => {
      employee.columns.forEach((col: EditableColumn) => {
        if (!allColumns.has(col.columnId)) {
          allColumns.set(col.columnId, {
            name: col.name,
            columnId: col.columnId,
            type: col.type
          });
        }
      });
    });

    // Base columns that are always shown
    const baseColumns = [
      { key: 'id', label: 'מס', show: true, isEditable: false },
      { key: 'name', label: 'שם העובד', show: true, isEditable: false },
    ];

    // Convert map to array and create column objects, filtering by isOn property
    const dynamicColumns = Array.from(allColumns.values())
      .filter(col => {
        // Check if this column should be shown based on columnNames configuration
        const columnConfig = columnNames.find(config => 
          config.columnName === col.name || 
          config.columnNameRecordId === col.columnId
        );
        return columnConfig ? columnConfig.isOn : true; // Show by default if no config found
      })
      .map(col => ({
        key: col.columnId,
        label: col.name,
        show: true,
        isEditable: col.type !== 'autoNumber', // Don't allow editing auto-generated fields
        type: col.type
      }));

    // Find and separate "הערות רואה חשבון" column
    const accountantNotesIndex = dynamicColumns.findIndex(col => col.label.includes('הערות רואה חשבון'));
    let accountantNotesColumn = null;
    
    if (accountantNotesIndex !== -1) {
      accountantNotesColumn = dynamicColumns.splice(accountantNotesIndex, 1)[0];
    }

    // Combine columns with accountant notes as leftmost editable column
    const finalColumns = [...baseColumns];
    if (accountantNotesColumn) {
      finalColumns.push(accountantNotesColumn);
    }
    finalColumns.push(...dynamicColumns);

    return finalColumns;
  };

  // Handle input change for editable cells
  const handleCellChange = (employeeId: string, columnId: string, value: string | number) => {
    setEditableEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        return {
          ...emp,
          columns: emp.columns.map((col: EditableColumn) => {
            if (col.columnId === columnId) {
              // Validate salary cannot be lower than oldValue
              if (col.name.includes('שכר') && (col.type === 'int' || col.type === 'autoNumber')) {
                const numValue = typeof value === 'string' ? parseFloat(value) : value;
                const oldValue = typeof col.oldValue === 'number' ? col.oldValue : parseFloat(String(col.oldValue));
                if (numValue < oldValue) {
                  setErrors(prev => ({
                    ...prev,
                    [`${employeeId}_${columnId}`]: 'לא ניתן לעדכן שכר נמוך יותר מחודש קודם'
                  }));
                } else {
                  setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[`${employeeId}_${columnId}`];
                    return newErrors;
                  });
                }
              }
              return { ...col, newValue: value };
            }
            return col;
          })
        };
      }
      return emp;
    }));
  };

  // Handle file upload for doc type columns
  const handleFileUpload = (employeeId: string, columnId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileData = e.target?.result as string;
      const fileValue = {
        fileName: file.name,
        fileData: fileData.split(',')[1] // Remove data:type;base64, prefix
      };
      
      // For file uploads, we need to handle the value differently in the state
      setEditableEmployees(prev => prev.map(emp => {
        if (emp.id === employeeId) {
          return {
            ...emp,
            columns: emp.columns.map((col: EditableColumn) => {
              if (col.columnId === columnId) {
                return { ...col, newValue: fileValue as unknown as string | number };
              }
              return col;
            })
          };
        }
        return emp;
      }));
    };
    reader.readAsDataURL(file);
  };

  // Validate form before submission
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    let isValid = true;

    editableEmployees.forEach(employee => {
      employee.columns.forEach((column: EditableColumn) => {
        const key = `${employee.id}_${column.columnId}`;
        
        // Check if isMust fields are filled
        if (column.isMust && (!column.newValue || column.newValue === column.oldValue)) {
          newErrors[key] = 'שדה חובה - יש לעדכן ערך';
          isValid = false;
        }

        // Check salary validation
        if (column.name.includes('שכר') && (column.type === 'int' || column.type === 'autoNumber') && column.newValue !== undefined) {
          const numValue = typeof column.newValue === 'string' ? parseFloat(column.newValue) : column.newValue as number;
          const oldValue = typeof column.oldValue === 'number' ? column.oldValue : parseFloat(String(column.oldValue));
          if (numValue < oldValue) {
            newErrors[key] = 'לא ניתן לעדכן שכר נמוך יותר מחודש קודם';
            isValid = false;
          }
        }
      });
    });

    setErrors(newErrors);
    return isValid;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('יש שגיאות בטופס', {
        description: 'אנא תקן את השגיאות לפני השמירה'
      });
      return;
    }

    setIsSaving(true);
    try {
      // Filter and convert only employees with changes and only changed columns
      const updateData = editableEmployees
        .map(emp => {
          // Filter only columns that have been changed
          const changedColumns = emp.columns
            .filter(col => {
              // Check if newValue exists and is different from oldValue
              if (col.newValue === undefined || col.newValue === null) {
                return false;
              }
              
              // Convert file objects to strings for comparison
              let newValue = col.newValue;
              let oldValue = col.oldValue;
              
              if (typeof newValue === 'object' && newValue !== null && 'fileName' in newValue) {
                newValue = (newValue as { fileName: string }).fileName;
              }
              
              if (typeof oldValue === 'object' && oldValue !== null && 'fileName' in oldValue) {
                oldValue = (oldValue as { fileName: string }).fileName;
              }
              
              // Return true only if values are different
              return newValue !== oldValue;
            })
            .map(col => {
              // Convert file objects to strings for API compatibility
              let newValue = col.newValue;
              let oldValue = col.oldValue;
              
              if (typeof newValue === 'object' && newValue !== null && 'fileName' in newValue) {
                newValue = (newValue as { fileName: string }).fileName;
              }
              
              if (typeof oldValue === 'object' && oldValue !== null && 'fileName' in oldValue) {
                oldValue = (oldValue as { fileName: string }).fileName;
              }
              
              return {
                name: col.name,
                columnId: col.columnId,
                oldValue: oldValue,
                newValue: newValue,
                type: col.type,
                isMust: col.isMust
              };
            });

          return {
            id: emp.id,
            columns: changedColumns
          };
        })
        // Filter out employees that have no changed columns
        .filter(emp => emp.columns.length > 0);

      const success = await updateMonthlyEmployeeData(updateData);
      if (success) {
        toast.success('הנתונים נשמרו בהצלחה');
        if (onRefetchData) {
          onRefetchData();
        }
        // Reload the monthly data to get fresh values
        await loadMonthlyEmployeesData();
      } else {
        toast.error('שגיאה בשמירת הנתונים');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('שגיאה בשמירת הנתונים');
    } finally {
      setIsSaving(false);
    }
  };

  // Render editable cell
  const renderEditableCell = (employee: EditableEmployee, column: { key: string; label: string; show: boolean; isEditable: boolean; type?: string }) => {
    if (!column.isEditable) {
      // Non-editable cells (ID, Name)
      if (column.key === 'id') {
        const index = editableEmployees.findIndex(emp => emp.id === employee.id);
        return index + 1;
      }
      if (column.key === 'name') {
        return getEmployeeName(employee);
      }
      return '';
    }

    const employeeColumn = employee.columns.find((col: EditableColumn) => col.columnId === column.key);
    if (!employeeColumn) return '';

    const errorKey = `${employee.id}_${column.key}`;
    const hasError = errors[errorKey];
    const isMustClass = employeeColumn.isMust ? 'border-red-500 border-2' : '';
    const errorClass = hasError ? 'border-red-500' : '';

    if (employeeColumn.type === 'doc') {
      return (
        <div className="flex flex-col gap-2">
          {typeof employeeColumn.oldValue === 'object' && employeeColumn.oldValue.fileName && (
            <div className="text-xs text-gray-600">
              קובץ קיים: {employeeColumn.oldValue.fileName}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileUpload(employee.id, column.key, file);
                }
              }}
              className={`${isMustClass} ${errorClass}`}
            />
            <Upload className="w-4 h-4 text-gray-400" />
          </div>
          {hasError && <div className="text-xs text-red-500">{hasError}</div>}
        </div>
      );
    }

    if (employeeColumn.type === 'int' || employeeColumn.type === 'autoNumber') {
      const isReadOnly = employeeColumn.type === 'autoNumber';
      return (
        <div className="flex flex-col">
          <Input
            type="number"
            value={employeeColumn.newValue as number || ''}
            onChange={(e) => handleCellChange(employee.id, column.key, parseFloat(e.target.value) || 0)}
            className={`${isMustClass} ${errorClass} ${isReadOnly ? 'bg-gray-100' : ''}`}
            placeholder={`${employeeColumn.oldValue}`}
            readOnly={isReadOnly}
          />
          {hasError && <div className="text-xs text-red-500 mt-1">{hasError}</div>}
        </div>
      );
    }

    // String type
    return (
      <div className="flex flex-col">
        <Input
          type="text"
          value={employeeColumn.newValue as string || ''}
          onChange={(e) => handleCellChange(employee.id, column.key, e.target.value)}
          className={`${isMustClass} ${errorClass}`}
          placeholder={`${employeeColumn.oldValue}`}
        />
        {hasError && <div className="text-xs text-red-500 mt-1">{hasError}</div>}
      </div>
    );
  };

  const columns = getDisplayColumns();
  const visibleColumns = columns.filter(col => col.show);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">טוען נתוני העובדים...</div>
      </div>
    );
  }

  return (
    <>
      {/* Header with Settings and Save buttons */}
      <div className="flex justify-between items-center mb-4">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'שומר...' : 'שמור שינויים'}
        </Button>

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
            onRefetchData={onRefetchData}
          />
        </div>
      </div>

      {/* Table */}
      <Card className="bg-gray-50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" dir="rtl">
              <thead>
                <tr className="bg-gray-50">
                  {visibleColumns.map((column, index) => (
                    <th
                      key={column.key}
                      className={`px-4 py-3 text-right text-sm font-medium text-gray-900 border-r border-gray-300`}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {editableEmployees.map((employee, rowIndex) => (
                  <tr
                    key={employee.id}
                    className={`border-t border-gray-200 hover:bg-gray-50 transition-colors ${
                      rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                    }`}
                  >
                    {visibleColumns.map((column, colIndex) => (
                      <td
                        key={column.key}
                        className={`px-4 py-4 text-right text-sm border-r border-gray-200`}
                      >
                        {renderEditableCell(employee, column)}
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