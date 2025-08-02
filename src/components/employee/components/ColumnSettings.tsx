"use client";

import { ColumnSettingsType, DynamicColumnSettings, ApiResponse } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from 'react';
import { Search, X } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  // Show all columns
  const allColumns = apiResponse?.columnNames || [];

  // Filter columns based on search term
  const filteredColumns = allColumns.filter(col => 
    col.columnName.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      // Only include columns that have been changed
      const changedColumns = allColumns
        .filter(col => {
          const currentSetting = dynamicColumnSettings[col.columnNameRecordId] || false;
          const originalSetting = col.isOn;
          return currentSetting !== originalSetting;
        })
        .map(col => ({
          recordId: col.recordId,
          columnNameRecordId: col.columnNameRecordId,
          isOn: dynamicColumnSettings[col.columnNameRecordId] || false
        }));

      const payload = {
        clientRecordId,
        columns: changedColumns
      };

      const response = await fetch('/api/update-columns', {
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
    <Card className="absolute top-full right-0 z-30 w-96 max-h-[80vh] overflow-hidden" dir="rtl">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium text-gray-900 text-right">
          הגדרות עמודות
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="חיפוש עמודות..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`pl-10 ${searchTerm ? 'pr-10' : 'pr-4'} text-right`}
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Select All / Deselect All Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="flex-1 text-xs"
          >
            בחר הכל
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeselectAll}
            className="flex-1 text-xs"
          >
            בטל הכל
          </Button>
        </div>

        {/* Columns List */}
        <div className="max-h-60 overflow-y-auto space-y-2">
          {filteredColumns.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-4">
              {searchTerm ? 'לא נמצאו עמודות מתאימות' : 'אין עמודות זמינות'}
            </div>
          ) : (
            filteredColumns.map((col) => (
              <div
                key={col.columnNameRecordId}
                className="flex items-center justify-between p-2 border border-gray-200 rounded-lg"
              >
                <span className="text-sm text-gray-700 text-right flex-1">
                  {col.columnName}
                </span>
                <Switch
                  checked={dynamicColumnSettings[col.columnNameRecordId] || false}
                  onCheckedChange={() => onDynamicColumnToggle(col.columnNameRecordId)}
                />
              </div>
            ))
          )}
        </div>

        {/* Results Count */}
        {searchTerm && (
          <div className="text-xs text-gray-500 text-center">
            נמצאו {filteredColumns.length} עמודות מתוך {allColumns.length}
          </div>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSaving ? 'שומר...' : 'שמור הגדרות'}
        </Button>
      </CardContent>
    </Card>
  );
} 