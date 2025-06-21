"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { useEffect, useState } from "react";

// File type for file objects
interface FileData {
  name: string | null;
  url: string | null;
}

// Employee data structure from API
interface EmployeeData {
  recordId: string | null;
  firstName: string | null;
  lastName: string | null;
  "101": FileData;
  pension: FileData;
  workFile: FileData;
  accountantRemark: string | null;
}

// API response structure
interface ApiResponse {
  employees: EmployeeData[];
}

const fileSchema = z.object({
  name: z.string().nullable(),
  url: z.string().nullable(),
});

const employeeRowSchema = z.object({
  recordId: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  file101: fileSchema,
  pensionFile: fileSchema,
  workFile: fileSchema,
  accountantRemark: z.string().nullable(),
});

const vacationsSchema = z.object({
  rows: z.array(employeeRowSchema),
});

type VacationsFormValues = z.infer<typeof vacationsSchema>;
type EmployeeRow = z.infer<typeof employeeRowSchema>;

// Utility function to truncate file names
const truncateFileName = (fileName: string | null, maxLength: number = 15): string => {
  if (!fileName) return '-';
  if (fileName.length <= maxLength) return fileName;
  return fileName.substring(0, maxLength) + '...';
};

interface VacationsProps {
  recordId?: string;
}

export default function Vacations({ recordId }: VacationsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<VacationsFormValues>({
    resolver: zodResolver(vacationsSchema),
    defaultValues: {
      rows: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "rows",
  });

  // Extract fetchData function so it can be reused
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const url = recordId 
        ? `https://hook.eu2.make.com/m0rzm7d63afsoerxyvvpxnl6gkzo67yv?recordId=${encodeURIComponent(recordId)}`
        : 'https://hook.eu2.make.com/m0rzm7d63afsoerxyvvpxnl6gkzo67yv';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data: ApiResponse[] = await response.json();
      console.log('data', data);
      
      // Transform API data to match our form structure
      const transformedRows: EmployeeRow[] = [];
      
      if (data && data.length > 0 && data[0].employees) {
        data[0].employees.forEach((employee) => {
          transformedRows.push({
            recordId: employee.recordId,
            firstName: employee.firstName,
            lastName: employee.lastName,
            file101: employee["101"],
            pensionFile: employee.pension,
            workFile: employee.workFile,
            accountantRemark: employee.accountantRemark,
          });
        });
      }

      replace(transformedRows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data from API
  useEffect(() => {
    fetchData();
  }, [replace]);

  // Handle file download
  const handleFileDownload = (fileData: FileData, fileName: string) => {
    if (fileData.url) {
      const link = document.createElement('a');
      link.href = fileData.url;
      link.download = fileData.name || fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Handle file upload (integrated with new upload URL)
  const handleFileUpload = (recordId: string | null, fileType: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && recordId) {
        const formData = new FormData();
        formData.append('recordId', recordId);
        formData.append('fileType', fileType);
        formData.append('file', file);
        try {
          const response = await fetch('https://hook.eu2.make.com/1rlskau3wk1osy99blebq3n9qppl81pw', {
            method: 'POST',
            body: formData,
          });
          if (!response.ok) {
            throw new Error('File upload failed');
          }
          console.log('File uploaded successfully');
          
          // Refetch the data to update the UI with new file information
          await fetchData();
          
          // Optionally show a success message here
        } catch (err) {
          alert('שגיאה בהעלאת הקובץ: ' + (err instanceof Error ? err.message : '')); // Hebrew: Error uploading file
        }
      }
    };
    input.click();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-lg">טוען נתונים...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-red-600">שגיאה בטעינת הנתונים: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardContent className="p-8">
          <Form {...form}>
            <div className="space-y-8" dir="rtl">
              {/* Table */}
              <div className="overflow-hidden border border-gray-300 rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-300">
                      <th className="px-4 py-4 text-center text-sm font-medium text-gray-900 border-l border-gray-300">
                        מס
                      </th>
                      <th className="px-4 py-4 text-center text-sm font-medium text-gray-900 border-l border-gray-300">
                        שם פרטי
                      </th>
                      <th className="px-4 py-4 text-center text-sm font-medium text-gray-900 border-l border-gray-300">
                        שם משפחה
                      </th>
                      <th className="px-4 py-4 text-center text-sm font-medium text-gray-900 border-l border-gray-300">
                        קובץ 101
                      </th>
                      <th className="px-4 py-4 text-center text-sm font-medium text-gray-900 border-l border-gray-300">
                        קובץ פנסיה
                      </th>
                      <th className="px-4 py-4 text-center text-sm font-medium text-gray-900 border-l border-gray-300">
                        קובץ עבודה
                      </th>
                      <th className="px-4 py-4 text-center text-sm font-medium text-gray-900 min-w-64">
                        הערות רואה חשבון
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => (
                      <tr key={field.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-4 border-l border-gray-200 text-center">
                          {index + 1}
                        </td>
                        {/* First Name - Readonly */}
                        <td className="px-4 py-4 border-l border-gray-200 text-center">
                          <div className="text-gray-700 p-2">
                            {field.firstName || '-'}
                          </div>
                        </td>
                        {/* Last Name - Readonly */}
                        <td className="px-4 py-4 border-l border-gray-200 text-center">
                          <div className="text-gray-700 p-2">
                            {field.lastName || '-'}
                          </div>
                        </td>
                        {/* 101 File */}
                        <td className="px-4 py-4 border-l border-gray-200 text-center">
                          <div className="flex flex-col items-center space-y-2">
                            {field.file101?.name ? (
                              <>
                                <span className="text-sm text-gray-700" title={field.file101.name}>{truncateFileName(field.file101.name)}</span>
                                <div className="flex space-x-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleFileDownload(field.file101, 'file-101')}
                                    className="text-xs"
                                  >
                                    הורד
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleFileUpload(field.recordId, '101')}
                                    className="text-xs"
                                  >
                                    עדכן
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleFileUpload(field.recordId, '101')}
                                className="text-xs"
                              >
                                העלה קובץ
                              </Button>
                            )}
                          </div>
                        </td>
                        {/* Pension File */}
                        <td className="px-4 py-4 border-l border-gray-200 text-center">
                          <div className="flex flex-col items-center space-y-2">
                            {field.pensionFile?.name ? (
                              <>
                                <span className="text-sm text-gray-700" title={field.pensionFile.name}>{truncateFileName(field.pensionFile.name)}</span>
                                <div className="flex space-x-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleFileDownload(field.pensionFile, 'pension-file')}
                                    className="text-xs"
                                  >
                                    הורד
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleFileUpload(field.recordId, 'pension')}
                                    className="text-xs"
                                  >
                                    עדכן
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleFileUpload(field.recordId, 'pension')}
                                className="text-xs"
                              >
                                העלה קובץ
                              </Button>
                            )}
                          </div>
                        </td>
                        {/* Work File */}
                        <td className="px-4 py-4 border-l border-gray-200 text-center">
                          <div className="flex flex-col items-center space-y-2">
                            {field.workFile?.name ? (
                              <>
                                <span className="text-sm text-gray-700" title={field.workFile.name}>{truncateFileName(field.workFile.name)}</span>
                                <div className="flex space-x-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleFileDownload(field.workFile, 'work-file')}
                                    className="text-xs"
                                  >
                                    הורד
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleFileUpload(field.recordId, 'workFile')}
                                    className="text-xs"
                                  >
                                    עדכן
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleFileUpload(field.recordId, 'workFile')}
                                className="text-xs"
                              >
                                העלה קובץ
                              </Button>
                            )}
                          </div>
                        </td>
                        {/* Accountant Remark - Readonly */}
                        <td className="px-4 py-4 text-center">
                          <div className="text-gray-700 p-2">
                            {field.accountantRemark || '-'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 