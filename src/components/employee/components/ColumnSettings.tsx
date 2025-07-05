"use client";

import { ColumnSettingsType, DynamicColumnSettings, ApiResponse } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from 'react';

interface ColumnSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  columnSettings: ColumnSettingsType;
  onColumnToggle: (column: keyof ColumnSettingsType) => void;
  dynamicColumnSettings: DynamicColumnSettings;
  onDynamicColumnToggle: (columnNameRecordId: string) => void;
  apiResponse: ApiResponse | null;
  clientRecordId: string;
  onRefetchData?: () => void;
}

export default function ColumnSettings({ 
  isOpen, 
  onClose, 
  dynamicColumnSettings,
  onDynamicColumnToggle,
  apiResponse,
  clientRecordId,
  onRefetchData
}: ColumnSettingsProps) {
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  // Show all columns
  const allColumns = apiResponse?.columnNames || [];

  const handleSelectAll = () => {
    allColumns.forEach(col => {
      if (!dynamicColumnSettings[col.columnNameRecordId]) {
        onDynamicColumnToggle(col.columnNameRecordId);
      }
    });
  };

  const handleDeselectAll = () => {
    allColumns.forEach(col => {
      if (dynamicColumnSettings[col.columnNameRecordId]) {
        onDynamicColumnToggle(col.columnNameRecordId);
      }
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Prepare the payload according to the API specification
      const columns = allColumns.map(col => ({
        recordId: col.recordId,
        columnNameRecordId: col.columnNameRecordId,
        isOn: dynamicColumnSettings[col.columnNameRecordId] || false
      }));

      const payload = {
        clientRecordId,
        columns
      };

      const response = await fetch('https://hook.eu2.make.com/6znp5rhy3zuquqnax180kq30cdlvp0b9', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Trigger data refetch if callback is provided
      if (onRefetchData) {
        onRefetchData();
      }

      // Close the popup after successful save
      onClose();
    } catch (error) {
      console.error('Failed to save column settings:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/40 bg-opacity-50 z-20"
        onClick={onClose}
      />
      
      {/* Popup */}
      <Card className="absolute top-12 right-0 z-30 w-96 max-h-[80vh] overflow-hidden" dir="rtl">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-gray-900 text-right">
            ניהול עמודות ({allColumns.length} עמודות)
          </CardTitle>

          {/* Bulk Actions */}
          <div className="flex gap-2 mt-3">
            <Button 
              type="button"
              variant="outline" 
              size="sm" 
              onClick={handleSelectAll}
              className="flex-1 text-xs"
            >
              בחר הכל
            </Button>
            <Button 
              type="button"
              variant="outline" 
              size="sm" 
              onClick={handleDeselectAll}
              className="flex-1 text-xs"
            >
              בטל בחירה
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 max-h-[50vh] overflow-y-auto">
          {/* Dynamic Columns */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 border-b pb-2">
              כל העמודות ({allColumns.length})
            </h4>
            
            {allColumns.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4">
                אין עמודות זמינות
              </div>
            ) : (
              allColumns.map((col) => (
                <div key={col.columnNameRecordId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {col.columnName || 'ללא שם'}
                    </div>
                  </div>
                  <Switch
                    checked={dynamicColumnSettings[col.columnNameRecordId] || false}
                    onCheckedChange={() => onDynamicColumnToggle(col.columnNameRecordId)}
                    className="data-[state=checked]:bg-purple-600 mr-3 "
                  />
                </div>
              ))
            )}
          </div>
        </CardContent>

        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              {Object.values(dynamicColumnSettings).filter(Boolean).length} מתוך {Object.keys(dynamicColumnSettings).length} עמודות
            </div>
            <Button 
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-8 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
              variant="secondary"
            >
              {isSaving ? 'שומר...' : 'שמור'}
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
} 