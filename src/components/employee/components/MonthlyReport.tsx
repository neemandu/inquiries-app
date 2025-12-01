'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ColumnSettings from './ColumnSettings';
import { ColumnSettingsType, ApiResponse, DynamicColumnSettings, EditableEmployee, EditableColumn } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Settings, Save, Upload } from "lucide-react";
import { updateMonthlyEmployeeData } from '@/lib/utils';
import { toast } from 'sonner';

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
  onSaveAndNavigate?: () => void;
  onDiscardAndNavigate?: () => void;
  onHasChangesChange?: (hasChanges: boolean) => void;
  onSaveRefSet?: (saveRef: () => Promise<void>) => void;
  selectedPeriodStatus?: string;
}

export default function MonthlyReport({ 
  columnSettings, 
  onColumnToggle, 
  dynamicColumnSettings, 
  onDynamicColumnToggle, 
  apiResponse, 
  clientRecordId, 
  onRefetchData,
  onSaveAndNavigate,
  onDiscardAndNavigate,
  onHasChangesChange,
  onSaveRefSet,
  selectedPeriodStatus
}: MonthlyReportProps) {
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [editableEmployees, setEditableEmployees] = useState<EditableEmployee[]>([]);
  const [columnNames, setColumnNames] = useState<ColumnNameConfig[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showMiluimPopup, setShowMiluimPopup] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedColumnName, setSelectedColumnName] = useState<string>('');
  const [showUnsavedChangesPopup, setShowUnsavedChangesPopup] = useState(false);
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [missingDocs, setMissingDocs] = useState<unknown[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Load monthly employees data from the apiResponse prop instead of making a new API call
  const loadMonthlyEmployeesData = useCallback(() => {
    if (!apiResponse?.employees) return;
    
    setIsLoading(true);
    try {
        // Store columnNames configuration for filtering
      if (apiResponse.columnNames) {
        setColumnNames(apiResponse.columnNames);
        }

        // Convert API response format to EditableEmployee format
      const filteredEmployees: EditableEmployee[] = apiResponse.employees.map(employee => ({
          id: employee.id,
          columns: employee.columns.map(col => ({
            name: col.name,
            columnId: col.columnId,
            oldValue: Array.isArray(col.oldValue) ? col.oldValue.join(', ') : (col.oldValue ?? ''),
            type: col.type === 'multilineText' ? 'string' : 
                  col.type === 'autoNumber' ? 'autoNumber' : 
                col.type === 'number' ? 'number' : 
                  col.type === 'multipleRecordLinks' ? 'string' : 
                  col.type === 'multipleLookupValues' ? 'string' : 'string',
            isMust: col.isMust,
            newValue: Array.isArray(col.oldValue) ? col.oldValue.join(', ') : (col.oldValue ?? '')
          } as EditableColumn))
        }));
        setEditableEmployees(filteredEmployees);
        console.log('filteredEmployees', filteredEmployees);
    } catch (error) {
      console.error('Failed to load monthly employees data:', error);
      toast.error('שגיאה בטעינת נתוני העובדים');
    } finally {
      setIsLoading(false);
    }
  }, [apiResponse]);

  // Load data when apiResponse changes
  useEffect(() => {
    loadMonthlyEmployeesData();
  }, [loadMonthlyEmployeesData]);

  // Fetch missing documents data
  const fetchMissingDocs = useCallback(async () => {
    if (!clientRecordId) return;
    
    try {
      const response = await fetch(`/api/missing-docs?employerRecordId=${clientRecordId}`);
      if (response.ok) {
        const data = await response.json();
        setMissingDocs(data || []);
      } else {
        console.error('Failed to fetch missing documents');
        setMissingDocs([]);
      }
    } catch (error) {
      console.error('Error fetching missing documents:', error);
      setMissingDocs([]);
    }
  }, [clientRecordId]);

  // Fetch missing docs when component mounts
  useEffect(() => {
    fetchMissingDocs();
  }, [fetchMissingDocs]);

  // Provide save function reference to parent
  useEffect(() => {
    if (onSaveRefSet) {
      onSaveRefSet(handleSave);
    }
  }, [onSaveRefSet]);

  // Scroll table to the right on initial load
  useEffect(() => {
    if (tableContainerRef.current) {
      // Scroll to the right to show the rightmost columns
      tableContainerRef.current.scrollLeft = tableContainerRef.current.scrollWidth;
    }
  }, [editableEmployees]);

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
      { key: 'name', label: 'שם העובד', show: true, isEditable: false, isFrozen: true },
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
        type: col.type,
        isFrozen: false
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
              // Check for columns that need document upload popup
              const columnsNeedingDocs = [
                "מילואים",
                "החזר הוצאות", 
                "שווי ארוחות", 
                "ימי מחלה", 
                "תעריף חודשי / שעתי"
              ];
              
              if (columnsNeedingDocs.includes(col.name)) {
                // Store the employee ID and column name, then show popup
                setSelectedEmployeeId(employeeId);
                setSelectedColumnName(col.name);
                setTimeout(() => setShowMiluimPopup(true), 100);
              }
              
              // Validate salary cannot be lower than oldValue
              if (col.name === "תעריף חודשי / שעתי" ||
                col.name === "נסיעות חודשי" ||
                col.name === "שעות נוספות גלובליות") {
                const numValue = typeof value === 'string' ? parseFloat(value) : value;
                const oldValue = typeof col.oldValue === 'number' ? col.oldValue : parseFloat(String(col.oldValue));
                if (numValue < oldValue) {
                  setErrors(prev => ({
                    ...prev,
                    [`${employeeId}_${columnId}`]: 'לא ניתן לעדכן ערך נמוך יותר מחודש קודם'
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

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Get file type based on column name
  const getFileTypeForColumn = (columnName: string): string => {
    switch (columnName) {
      case "מילואים":
        return "3010";
      case "החזר הוצאות":
        return "הוצאות";
      case "שווי ארוחות":
        return "שווי ארוחות";
      case "ימי מחלה":
        return "אישור מחלה";
      case "תעריף חודשי / שעתי":
        return "הסכם העסקה";
      default:
        return columnName;
    }
  };

  // Handle file upload for document popup
  const handleMiluimFileUpload = async () => {
    if (!selectedFile) {
      toast.error('יש לבחור קובץ');
      return;
    }

    setUploadingFile(true);
    try {
      const base64 = await fileToBase64(selectedFile);
      const base64Data = base64.split(',')[1];

      const fileType = getFileTypeForColumn(selectedColumnName);

      const payload = {
        recordId: selectedEmployeeId,
        employerId: clientRecordId,
        uploadType: "document",
        remarks: `מסמך עבור ${selectedColumnName}`,
        fileType: fileType,
        files: [{
          contentType: selectedFile.type,
          fileName: selectedFile.name,
          file: base64Data,
        }]
      };

      const response = await fetch('https://hook.eu2.make.com/m2ow857a46axrtmhq26yzw84d8ibm8gv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success('הקובץ הועלה בהצלחה');
        setShowMiluimPopup(false);
        setSelectedFile(null);
        setSelectedEmployeeId('');
        setSelectedColumnName('');
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error('שגיאה בהעלאת הקובץ', {
          description: errorData.message || `קוד שגיאה: ${response.status}`,
        });
      }
    } catch (error) {
      toast.error('שגיאה בחיבור לשרת', {
        description: 'אנא בדוק את החיבור לאינטרנט ונסה שוב',
      });
      console.error('Upload error:', error);
    } finally {
      setUploadingFile(false);
    }
  };

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Filter and convert only employees with changes and only changed columns
      const updateData = editableEmployees
        .map(emp => {
          // Filter only columns that have been changed
          const changedColumns = emp.columns
            .filter(col => {
              console.log('col', col);
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
              let newValue = col.newValue;
              let oldValue = col.oldValue;
              
              if (typeof newValue === 'object' && newValue !== null && 'fileName' in newValue) {
                newValue = (newValue as { fileName: string }).fileName;
              }
              if (typeof oldValue === 'object' && oldValue !== null && 'fileName' in oldValue) {
                oldValue = (oldValue as { fileName: string }).fileName;
              }
              
              // Convert to number if type is number or autoNumber
              if (
                (col.type === 'number' || col.type === 'autoNumber' || col.type === 'int') &&
                newValue !== undefined &&
                newValue !== null &&
                newValue !== ''
              ) {
                newValue = Number(newValue);
              }
              if (
                (col.type === 'number' || col.type === 'autoNumber' || col.type === 'int') &&
                oldValue !== undefined &&
                oldValue !== null &&
                oldValue !== ''
              ) {
                oldValue = Number(oldValue);
              }

              // Map type to backend-compatible values
              const backendType: 'string' | 'int' | 'doc' | 'autoNumber' =
                col.type === 'number' ? 'int'
                : col.type === 'multilineText' ? 'string'
                : col.type;

              return {
                name: col.name,
                columnId: col.columnId,
                oldValue: oldValue,
                newValue: newValue,
                type: backendType,
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
      const columnsToCheck = [
        "מילואים",
        "החזר הוצאות",
        "שווי ארוחות",
        "ימי מחלה",
        "תעריף חודשי / שעתי"
      ];
      const specialColumnChanged = updateData.some(emp =>
        emp.columns.some(col => columnsToCheck.includes(col.name))
      );

      if (success) {
        toast.success('הנתונים נשמרו בהצלחה');
        // Download CSV file after successful save
        downloadCSV();
        if (specialColumnChanged) {
          toast(
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-lg font-bold text-red-700" dir='rtl'>
                עבור שינויים ב: מילואים, החזר הוצאות, שווי ארוחות, ימי מחלה ושינוי שכר בסיס אנא העלו מסמכים רלוונטים דרך אזור &quot;מסמכים חסרים&quot;
              </span>
            </div>,
            {
              duration: 10000,
              position: "top-center",
              style: { minWidth: 400, background: "#fff" },
            }
          );
        }
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
  }, [editableEmployees, loadMonthlyEmployeesData, onRefetchData]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return editableEmployees.some(emp => 
      emp.columns.some(col => {
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
        
        return newValue !== oldValue;
      })
    );
  }, [editableEmployees]);

  // Notify parent of changes
  useEffect(() => {
    if (onHasChangesChange) {
      onHasChangesChange(hasUnsavedChanges());
    }
  }, [editableEmployees, onHasChangesChange]);

  // Validate all required fields and missing documents
  const validateAllRequiredFieldsAndDocs = () => {
    const issues: string[] = [];

    if (missingDocs.length > 0) {
      const missingForm101 = missingDocs.filter(
        (doc: unknown) => (doc as { fileType?: string })?.fileType === "טופס 101"
      );

      missingForm101.forEach((doc: unknown) => {
        const details = doc as {
          firstName?: string;
          lastName?: string;
          employeeRecordId?: string;
          idNumber?: string;
          fileType?: string;
        };

        const fullName = `${details.firstName ?? ""} ${details.lastName ?? ""}`.trim();
        const identifier = details.employeeRecordId || details.idNumber || "עובד לא מזוהה";
        const displayName = fullName || identifier;

        issues.push(`חסר מסמך ${details.fileType ?? "נדרש"} עבור ${displayName}`);
      });
    }

    for (const employee of editableEmployees) {
      for (const column of employee.columns) {
        if (column.isMust) {
          const hasOldValue =
            column.oldValue !== undefined && column.oldValue !== null && column.oldValue !== "";
          const hasNewValue =
            column.newValue !== undefined && column.newValue !== null && column.newValue !== "";

          if (!hasOldValue && !hasNewValue) {
            const employeeName = getEmployeeName(employee);
            issues.push(`שדה חובה "${column.name}" חסר עבור ${employeeName}`);
          }
        }
      }
    }

    setValidationIssues(issues);
    return issues.length === 0;
  };

  // Handle save and continue navigation
  const handleSaveAndNavigate = async () => {
    await handleSave();
    if (onSaveAndNavigate) {
      onSaveAndNavigate();
    }
  };

  // Handle discard changes and navigate
  const handleDiscardAndNavigate = () => {
    if (onDiscardAndNavigate) {
      onDiscardAndNavigate();
    }
    // Reset all changes
    loadMonthlyEmployeesData();
  };

  // Handle column sorting
  const handleSort = (columnKey: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === columnKey && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: columnKey, direction });
  };

  // Sort employees based on sort configuration
  const getSortedEmployees = () => {
    if (!sortConfig) return editableEmployees;

    return [...editableEmployees].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      if (sortConfig.key === 'name') {
        aValue = getEmployeeName(a);
        bValue = getEmployeeName(b);
      } else {
        const aColumn = a.columns.find(col => col.columnId === sortConfig.key);
        const bColumn = b.columns.find(col => col.columnId === sortConfig.key);
        
        // Handle different value types, including file objects
        const aRawValue = aColumn?.newValue ?? aColumn?.oldValue ?? '';
        const bRawValue = bColumn?.newValue ?? bColumn?.oldValue ?? '';
        
        // Convert file objects to strings for sorting
        aValue = typeof aRawValue === 'object' && aRawValue !== null && 'fileName' in aRawValue 
          ? (aRawValue as { fileName: string }).fileName 
          : aRawValue;
        bValue = typeof bRawValue === 'object' && bRawValue !== null && 'fileName' in bRawValue 
          ? (bRawValue as { fileName: string }).fileName 
          : bRawValue;
      }

      // Handle different data types
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Convert to strings for comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (aStr < bStr) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aStr > bStr) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Generate and download CSV file
  const downloadCSV = () => {
    const columns = getDisplayColumns();
    const visibleColumns = columns.filter(col => col.show);
    const sortedEmployees = getSortedEmployees();

    // Create CSV headers
    const headers = visibleColumns.map(col => col.label);
    const csvHeaders = headers.join(',');

    // Create CSV rows
    const csvRows = sortedEmployees.map(employee => {
      const rowData = visibleColumns.map(column => {
        let cellValue = '';
        
        if (column.key === 'name') {
          cellValue = getEmployeeName(employee);
        } else {
          const employeeColumn = employee.columns.find(col => col.columnId === column.key);
          if (employeeColumn) {
            // Use new value if available, otherwise use old value
            const value = employeeColumn.newValue ?? employeeColumn.oldValue ?? '';
            cellValue = String(value);
          }
        }
        
        // Escape CSV values (handle commas, quotes, newlines)
        if (cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n')) {
          cellValue = `"${cellValue.replace(/"/g, '""')}"`;
        }
        
        return cellValue;
      });
      
      return rowData.join(',');
    });

    // Combine headers and rows
    const csvContent = [csvHeaders, ...csvRows].join('\n');

    // Create and download file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    // Generate filename with current date
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    link.setAttribute('download', `monthly-report-${dateStr}.csv`);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render editable cell
  const renderEditableCell = (employee: EditableEmployee, column: { key: string; label: string; show: boolean; isEditable: boolean; type?: string; isFrozen?: boolean }) => {
    if (!column.isEditable) {
      // Non-editable cells (Name)
      if (column.key === 'name') {
        return getEmployeeName(employee);
      }
      return '';
    }

    const employeeColumn = employee.columns.find((col: EditableColumn) => col.columnId === column.key);
    if (!employeeColumn) return '';

    const errorKey = `${employee.id}_${column.key}`;
    const hasError = errors[errorKey];
    
    // Check if mandatory field has a current value (only check newValue, not oldValue)
    // This ensures red border shows when user clears a field, even if it had an old value
    const hasValue = employeeColumn.newValue !== undefined && 
                    employeeColumn.newValue !== null && 
                    String(employeeColumn.newValue).trim() !== '';
    
    // Only show red border if it's mandatory AND has no current value AND is not a "הערות" column
    const isMustClass = employeeColumn.isMust && !hasValue && !employeeColumn.name.includes('הערות') ? 'border-red-500 border-2' : '';
    const errorClass = hasError ? 'border-red-500' : '';

    if (employeeColumn.type === 'doc') {
      return (
        <div className="flex flex-col gap-2 w-full" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
          {typeof employeeColumn.oldValue === 'object' && employeeColumn.oldValue.fileName && (
            <div className="text-xs text-gray-600 whitespace-normal break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              קובץ קיים: {employeeColumn.oldValue.fileName}
            </div>
          )}
          <div className="flex items-center gap-2 w-full">
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileUpload(employee.id, column.key, file);
                }
              }}
              className={`w-full max-w-full min-w-0 ${isMustClass} ${errorClass}`}
              style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
            />
            <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </div>
          {hasError && <div className="text-xs text-red-500 whitespace-normal break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{hasError}</div>}
        </div>
      );
    }

    if (employeeColumn.type === 'number' || employeeColumn.type === 'autoNumber') {
      const isReadOnly = employeeColumn.type === 'autoNumber';
      return (
        <div className="flex flex-col w-full" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
          <Input
            type="number"
            value={employeeColumn.newValue as number || ''}
            onChange={(e) => handleCellChange(employee.id, column.key, parseFloat(e.target.value) || 0)}
            className={`w-full max-w-full min-w-0 ${isMustClass} ${errorClass} ${isReadOnly ? 'bg-gray-100' : ''}`}
            placeholder={`${employeeColumn.oldValue}`}
            readOnly={isReadOnly}
            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
          />
          {hasError && <div className="text-xs text-red-500 mt-1 whitespace-normal break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{hasError}</div>}
        </div>
      );
    }

    // String type
    return (
        <div className="flex flex-col w-full" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
          <Input
            type="text"
            value={employeeColumn.newValue as string || ''}
            onChange={(e) => handleCellChange(employee.id, column.key, e.target.value)}
            className={`w-full max-w-full min-w-0 ${isMustClass} ${errorClass}`}
            placeholder={`${employeeColumn.oldValue}`}
            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
          />
          {hasError && <div className="text-xs text-red-500 mt-1 whitespace-normal break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{hasError}</div>}
        </div>
    );
  };

  const columns = getDisplayColumns();
  const visibleColumns = columns.filter(col => col.show);
  
  // Calculate column width - 20% smaller than original
  const minColumnWidth = 160; // 20% smaller than 200px
  const columnWidth = `${minColumnWidth}px`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600" dir="rtl">טוען נתונים...</div>
      </div>
    );
  }

  return (
    <>
      {/* Header with Settings and Save buttons */}
      <div className="flex items-center mb-4 gap-2 w-full max-w-none" dir="rtl">
        {/* Gear Icon (rightmost in RTL) */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettingsPopup(!showSettingsPopup)}
            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          >
            <Settings className="w-6 h-6" />
          </Button>
          {showSettingsPopup && (
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
          )}
        </div>
        {/* Blue Close Period Button */}
        <Button
          onClick={() => {
            if (validateAllRequiredFieldsAndDocs()) {
              setShowConfirmClose(true);
            } else {
              setShowValidationPopup(true);
            }
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          disabled={isClosing || selectedPeriodStatus === 'סגורה'}
        >
          אישור מידע וסגירת תקופת דיווח
        </Button>
        {/* Green Save Button (leftmost in RTL, separated) */}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white mr-auto"
          dir="rtl"
        >
          <Save className="w-4 h-4"  />
          {isSaving ? 'שומר...' : 'שמור שינויים'}
        </Button>
      </div>

      {/* Unsaved Changes Popup */}
      {showUnsavedChangesPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center border border-gray-200 pointer-events-auto">
            <div className="text-lg font-bold text-gray-800 mb-4">
              יש שינויים שלא נשמרו
            </div>
            <div className="text-sm text-gray-600 mb-6">
              האם תרצה לשמור את השינויים לפני המעבר?
            </div>
            <div className="flex justify-center gap-4">
              <Button
                onClick={handleSaveAndNavigate}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700 text-white px-6"
              >
                {isSaving ? 'שומר...' : 'שמור ומעבר'}
              </Button>
              <Button
                onClick={handleDiscardAndNavigate}
                className="bg-red-600 hover:bg-red-700 text-white px-6"
              >
                בטל שינויים
              </Button>
              <Button
                onClick={() => {
                  setShowUnsavedChangesPopup(false);
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6"
              >
                המשך עריכה
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* מילואים Popup */}
      {showMiluimPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center border border-gray-200 pointer-events-auto">
            <div className="text-lg font-bold text-gray-800 mb-4">
              אנא העלה טופס 3010
            </div>
            <div className="mb-6">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {selectedFile && (
                <div className="mt-2 text-sm text-gray-600">
                  נבחר: {selectedFile.name}
                </div>
              )}
            </div>
            <div className="flex justify-center gap-4">
              <Button
                onClick={handleMiluimFileUpload}
                disabled={!selectedFile || uploadingFile}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                {uploadingFile ? 'מעלה...' : 'העלה קובץ'}
              </Button>
              <Button
                onClick={() => {
                  setShowMiluimPopup(false);
                  setSelectedFile(null);
                  setSelectedEmployeeId('');
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6"
              >
                ביטול
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Popup */}
      {showMiluimPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center border border-gray-200 pointer-events-auto">
            <div className="text-lg font-bold text-gray-800 mb-4">
              אנא העלה מסמך עבור: {selectedColumnName}
            </div>
            <div className="mb-6">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {selectedFile && (
                <div className="mt-2 text-sm text-gray-600">
                  נבחר: {selectedFile.name}
                </div>
              )}
            </div>
            <div className="flex justify-center gap-4">
              <Button
                onClick={handleMiluimFileUpload}
                disabled={!selectedFile || uploadingFile}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                {uploadingFile ? 'מעלה...' : 'העלה קובץ'}
              </Button>
              <Button
                onClick={() => {
                  setShowMiluimPopup(false);
                  setSelectedFile(null);
                  setSelectedEmployeeId('');
                  setSelectedColumnName('');
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6"
              >
                ביטול
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Popup */}
      {showValidationPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center border border-gray-200 pointer-events-auto">
            <div className="text-lg font-bold text-red-600 mb-4" dir="rtl">
              אנא השלימו את כל הדיווחים החודשיים והמסמכים החסרים
            </div>
            {validationIssues.length > 0 && (
              <div className="mt-4 max-h-48 overflow-y-auto text-right pr-2" dir="rtl">
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-2">
                  {validationIssues.map((issue, index) => (
                    <li key={`${issue}-${index}`}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-center gap-4 mt-6">
              <Button
                onClick={() => {
                  setShowValidationPopup(false);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                הבנתי
              </Button>
            </div>
          </div>
        </div>
      )}

      {showConfirmClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center border border-gray-200 pointer-events-auto">
            <div className="text-lg font-bold text-gray-800 mb-4">
              לאחר סגירת תקופת הדיווח לא תינתן אפשרות לשינויים נוספים עבור תקופה זו. האם הינך בטוח?
            </div>
            <div className="flex justify-center gap-6 mt-6">
              <Button
                onClick={async () => {
                  setIsClosing(true);
                  try {
                    const res = await fetch("/api/create-reporting-period", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ recordId: clientRecordId }),
                    });
                    if (res.ok) {
                      setShowConfirmClose(false);
                      // Download CSV file before reloading
                      downloadCSV();
                      toast.success("התקופה נסגרה בהצלחה והקובץ הורד");
                      // Small delay to allow download to start before reload
                      setTimeout(() => {
                        window.location.reload();
                      }, 1000);
                    } else {
                      toast.error("שגיאה בסגירת התקופה");
                    }
                  } catch {
                    toast.error("שגיאה בחיבור לשרת");
                  } finally {
                    setIsClosing(false);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                disabled={isClosing}
              >
                כן
              </Button>
              <Button
                onClick={() => setShowConfirmClose(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6"
              >
                לא
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="bg-gray-50 w-full max-w-none">
        <CardContent className="p-0">
          <div ref={tableContainerRef} className="overflow-auto w-full h-[calc(100vh-300px)]" style={{ minWidth: '100%' }}>
            <table className="w-full table-auto" dir="rtl" >
              <thead>
                <tr className="bg-gray-50">
                  {visibleColumns.map((column) => (
                    <th
                      key={column.key}
                      className={`px-6 py-4 text-right font-medium text-gray-900 border-r border-gray-300 min-w-[128px] cursor-pointer hover:bg-gray-100 transition-colors select-none ${
                        column.isFrozen ? 'sticky top-0 right-0 bg-gray-50 z-20 border-l-2 border-gray-300 shadow-[4px_0_4px_-2px_rgba(0,0,0,0.1)]' : 'sticky top-0 bg-gray-50 z-10'
                      }`}
                      style={{ 
                        width: columnWidth,
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                        whiteSpace: 'normal'
                      }}
                      onClick={() => handleSort(column.key)}
                    >
                      <div className="flex items-center justify-center gap-2 whitespace-normal break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                        <span style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{column.label}</span>
                        {sortConfig?.key === column.key && (
                          <span className="text-sm">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getSortedEmployees().map((employee, rowIndex) => (
                  <tr
                    key={employee.id}
                    className={`border-t border-gray-200 hover:bg-gray-50 transition-colors ${
                      rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                    }`}
                  >
                    {visibleColumns.map((column) => {
                     return (
                        <td
                          key={column.key}
                          className={`px-2 py-2 text-right border-r border-gray-200 whitespace-normal break-words
                            ${column.isFrozen
                              ? `sticky right-0 z-20 border-l-2 border-gray-300 ${
                                  rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-100'
                                } shadow-[4px_0_4px_-2px_rgba(0,0,0,0.1)]`
                              : rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            }`}
                        >
                          {renderEditableCell(employee, column)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <br />
      <div className="flex justify-between items-center mb-4">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
          dir="rtl"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'שומר...' : 'שמור שינויים'}
        </Button>

      </div>
    </>
  );
} 