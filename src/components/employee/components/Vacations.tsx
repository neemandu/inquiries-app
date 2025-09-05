"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface FileData {
  name: string;
  file: File;
}

interface RowData {
  employeeRecordId: string;
  monthlyReportId: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  fileType: string;
  accountantComments: string;
  files: FileData[];
}

interface ApiResponseItem {
  employeeRecordId?: string;
  monthlyReportId?: string;
  firstName?: string;
  lastName?: string;
  idNumber?: string;
  fileType?: string;
  accountantComments?: string;
}

export default function Vacations({ recordId }: { recordId: string }) {
  const [rows, setRows] = React.useState<RowData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<string>("");
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    if (!recordId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching data for recordId:', recordId);
      const url = `/api/missing-docs?employerRecordId=${recordId}`;
      console.log('API URL:', url);
      
      const response = await fetch(url);
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error text:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('API response data:', data);
      
      // Transform the API response to match your RowData interface
      const transformedRows: RowData[] = data.map((item: ApiResponseItem) => ({
        employeeRecordId: item.employeeRecordId || "",
        monthlyReportId: item.monthlyReportId || "",
        firstName: item.firstName || "",
        lastName: item.lastName || "",
        idNumber: item.idNumber || "",
        fileType: item.fileType || "",
        accountantComments: item.accountantComments || "",
        files: [],
      }));
      
      console.log('Transformed rows:', transformedRows);
      setRows(transformedRows);
    } catch (err) {
      console.error('Error fetching data:', err);
      console.error('Error details:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace'
      });
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Scroll table to the right on initial load
  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollLeft = tableContainerRef.current.scrollWidth;
    }
  }, [rows]);

  // Handle file upload for a specific row
  const handleFileUpload = (rowIdx: number, files: FileList | null) => {
    if (!files) return;
    
    console.log(`Adding ${files.length} files to row ${rowIdx}`);
    console.log('Files:', Array.from(files).map(f => f.name));
    
    const uploadedFiles: FileData[] = Array.from(files).map((file) => ({
      name: file.name,
      file: file, // Store the actual File object
    }));
    
    console.log('Uploaded files:', uploadedFiles);
    
    setRows((prev) => {
      const newRows = prev.map((row, idx) =>
        idx === rowIdx
          ? { ...row, files: [...row.files, ...uploadedFiles] }
          : row
      );
      console.log('New rows state:', newRows);
      return newRows;
    });
  };

  // Remove a file from a row
  const handleRemoveFile = (rowIdx: number, fileIdx: number) => {
    setRows((prev) =>
      prev.map((row, idx) =>
        idx === rowIdx
          ? { ...row, files: row.files.filter((_, i) => i !== fileIdx) }
          : row
      )
    );
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Submit all files
  const handleSubmitAll = async () => {
    setUploading(true);
    setUploadProgress("מתחיל העלאה...");

    try {
      let uploadedRows = 0;

      for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx];
        
        // Skip rows with no files
        if (row.files.length === 0) continue;
        
        setUploadProgress(`מעלה קבצים עבור ${row.firstName} ${row.lastName} (${row.files.length} קבצים)`);
        
        try {
          // Convert all files for this row to base64
          const filesData = await Promise.all(
            row.files.map(async (fileData) => {
              const base64File = await fileToBase64(fileData.file);
              return {
                contentType: fileData.file.type,
                fileName: fileData.name,
                file: base64File
              };
            })
          );
          
          const payload = {
            fileType: row.fileType,
            files: filesData,
            remarks: row.accountantComments || "",
            employeeId: row.employeeRecordId,
            employerId: recordId,
            monthlyReportId: row.monthlyReportId
          };

          const response = await fetch('https://hook.eu2.make.com/m2ow857a46axrtmhq26yzw84d8ibm8gv', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`Upload failed for ${row.firstName} ${row.lastName}: ${response.status}`);
          }

          uploadedRows++;
          console.log(`Successfully uploaded ${row.files.length} files for: ${row.firstName} ${row.lastName}`);
          
        } catch (rowError) {
          console.error(`Error uploading files for ${row.firstName} ${row.lastName}:`, rowError);
        }
      }

      setUploadProgress(`העלאה הושלמה! הועלו קבצים עבור ${uploadedRows} עובדים`);
      
      // Clear all files and refresh the table data
      setTimeout(() => {
        setRows(prev => prev.map(row => ({ ...row, files: [] })));
        setUploadProgress("");
        fetchData();
      }, 3000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(`שגיאה בהעלאה: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    } finally {
      setUploading(false);
    }
  };

  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="w-full">
          <CardContent className="p-8">
            <div className="text-center" dir="rtl">טוען...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="w-full">
          <CardContent className="p-8">
            <div className="text-center text-red-500">שגיאה: {error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardContent className="p-8">

          {/* Submit Button */}
          <div className="mb-6 flex justify-center">
            <Button
              onClick={handleSubmitAll}
              disabled={uploading || rows.every(row => row.files.length === 0)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
            >
              {uploading ? "מעלה קבצים..." : "העלה את כל הקבצים"}
            </Button>
          </div>

          {/* Upload Progress */}
          {uploading && uploadProgress && (
            <div className="mb-4 text-center text-blue-600">
              {uploadProgress}
            </div>
          )}

          <div ref={tableContainerRef} className="overflow-x-auto border border-gray-300 rounded-lg" dir="rtl">
            <table className="w-full" dir="rtl">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-300">
                  <th className="px-4 py-4 text-center text-sm font-medium text-gray-900 border-l border-gray-300">מס</th>
                  <th className="px-4 py-4 text-center text-sm font-medium text-gray-900 border-l border-gray-300">שם פרטי</th>
                  <th className="px-4 py-4 text-center text-sm font-medium text-gray-900 border-l border-gray-300">שם משפחה</th>
                  <th className="px-4 py-4 text-center text-sm font-medium text-gray-900 border-l border-gray-300">תעודת זהות</th>
                  <th className="px-4 py-4 text-center text-sm font-medium text-gray-900 border-l border-gray-300">סוג קובץ</th>
                  <th className="px-4 py-4 text-center text-sm font-medium text-gray-900 border-l border-gray-300">הערות רואה חשבון</th>
                  <th className="px-4 py-4 text-center text-sm font-medium text-gray-900">קובץ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr key={row.employeeRecordId} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-4 border-l border-gray-200 text-center">{rowIdx + 1}</td>
                    <td className="px-4 py-4 border-l border-gray-200 text-center">{row.firstName}</td>
                    <td className="px-4 py-4 border-l border-gray-200 text-center">{row.lastName}</td>
                    <td className="px-4 py-4 border-l border-gray-200 text-center">{row.idNumber}</td>
                    <td className="px-4 py-4 border-l border-gray-200 text-center">{row.fileType}</td>
                    <td className="px-4 py-4 border-l border-gray-200 text-center text-sm">
                      {row.accountantComments || "-"}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex flex-col items-center space-y-2">
                        {!row.fileType.includes('101') && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => fileInputRefs.current[rowIdx]?.click()}
                            >
                              העלה קבצים ({row.files.length})
                            </Button>
                            <input
                              ref={el => { fileInputRefs.current[rowIdx] = el; }}
                              type="file"
                              multiple
                              className="hidden"
                              onChange={(e) => handleFileUpload(rowIdx, e.target.files)}
                            />
                          </>
                        )}
                        {row.files.length > 0 && (
                          <ul className="text-xs text-right space-y-1">
                            {row.files.map((file, fileIdx) => (
                              <li key={fileIdx} className="flex items-center justify-between gap-2">
                                <span>{file.name}</span>
                                {!row.fileType.includes('101') && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500"
                                    onClick={() => handleRemoveFile(rowIdx, fileIdx)}
                                  >
                                    ×
                                  </Button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 