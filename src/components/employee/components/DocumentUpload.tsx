"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import React from "react";
import { Employee } from "@/lib/types";

const documentUploadSchema = z.object({
  employeeId: z.string().min(1, {
    message: "יש לבחור עובד.",
  }),
  documentType: z.string().min(1, {
    message: "יש לבחור סוג מסמך.",
  }),
  remarks: z.string().optional(),
});

type DocumentUploadFormValues = z.infer<typeof documentUploadSchema>;

const documentTypes = [
  { value: "pension", label: "פנסיה" },
  { value: "miluim", label: "מילואים" },
  { value: "161", label: "161" },
  { value: "other", label: "אחר" },
];

export default function DocumentUpload({ 
  employees,
  recordId 
}: { 
  employees: Employee[],
  recordId: string 
}) {
  const form = useForm<DocumentUploadFormValues>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: {
      employeeId: "",
      documentType: "",
      remarks: "",
    },
  });

  // State for uploaded file
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);

  // Helper to convert file to base64
  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const handleFileChange = (file: File | null) => {
    setUploadedFile(file);
    setFileError(null);
  };

  async function onSubmit(data: DocumentUploadFormValues) {
    // Validate that a file is uploaded
    if (!uploadedFile) {
      setFileError('יש להעלות מסמך');
      return;
    }

    try {
      const loadingToast = toast.loading('מעלה מסמך...');
      
      // Convert file to base64
      const base64 = await fileToBase64(uploadedFile);
      const base64Data = base64.split(',')[1];

      const payload = {
        recordId: data.employeeId,
        fileType: data.documentType,
        remarks: data.remarks,
        file: {
          contentType: uploadedFile.type,
          fileName: uploadedFile.name,
          file: base64Data,
        },
      };

      const response = await fetch('https://hook.eu2.make.com/m2ow857a46axrtmhq26yzw84d8ibm8gv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      toast.dismiss(loadingToast);

      if (response.ok) {
        toast.success('המסמך הועלה בהצלחה', {
          description: 'המסמך נשמר במערכת',
          duration: 4000,
        });
        form.reset();
        setUploadedFile(null);
        setFileError(null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error('שגיאה בהעלאת המסמך', {
          description: errorData.message || `קוד שגיאה: ${response.status}`,
          duration: 5000,
        });
      }
    } catch (error) {
      toast.error('שגיאה בחיבור לשרת', {
        description: 'אנא בדוק את החיבור לאינטרנט ונסה שוב',
        duration: 5000,
      });
      console.error('Submission error:', error);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" dir="rtl">
              {/* שם העובד */}
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-start gap-4">
                      <FormLabel className="block text-lg font-medium text-gray-900 mb-3 text-right">
                        שם העובד:
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} dir="rtl">
                        <FormControl>
                          <SelectTrigger className="w-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-right text-base">
                            <SelectValue placeholder="בחר עובד" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="text-right">
                          {employees && employees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id} className="text-right">
                              {employee.columns.find(column => column.name === "firstName")?.oldValue} {employee.columns.find(column => column.name === "lastName")?.oldValue}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage className="text-right" />
                  </FormItem>
                )}
              />

              {/* סוג מסמך */}
              <FormField
                control={form.control}
                name="documentType"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-start gap-4">
                      <FormLabel className="block text-lg font-medium text-gray-900 mb-3 text-right">
                        סוג מסמך:
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} dir="rtl">
                        <FormControl>
                          <SelectTrigger className="w-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-right text-base">
                            <SelectValue placeholder="בחר סוג מסמך" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="text-right">
                          {documentTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value} className="text-right">
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage className="text-right" />
                  </FormItem>
                )}
              />

              {/* העלאת מסמך */}
              <FormItem>
                <div className="flex items-start justify-start gap-4">
                  <FormLabel className="block text-lg font-medium text-gray-900 mb-3 text-right mt-1">
                    העלאת מסמך:
                  </FormLabel>
                  <div className="flex flex-col gap-2">
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                      >
                        לחצו לבחירת קובץ
                      </label>
                    </div>
                    {uploadedFile && (
                      <span className="text-sm text-green-600 text-right">
                        ✓ {uploadedFile.name}
                      </span>
                    )}
                    {fileError && (
                      <span className="text-sm text-red-600 text-right">{fileError}</span>
                    )}
                  </div>
                </div>
              </FormItem>

              {/* הערות */}
              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-lg font-medium text-gray-900 mb-3 text-right">
                      הערות:
                    </FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        rows={3}
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-right text-base resize-none"
                        placeholder="הערות נוספות..."
                      />
                    </FormControl>
                    <FormMessage className="text-right" />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <div className="flex justify-center">
                <Button
                  type="submit"
                  className="px-16 py-4 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors text-lg"
                >
                  העלה מסמך
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 