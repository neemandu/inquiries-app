"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ChevronDown } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Document, Page, pdfjs } from 'react-pdf';
import { useState } from 'react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const paySlipSchema = z.object({
  employeeName: z.string().min(1, {
    message: "יש לבחור שם עובד.",
  }),
  selectedMonth: z.string().min(1, {
    message: "יש לבחור חודש.",
  }),
});

type PaySlipFormValues = z.infer<typeof paySlipSchema>;

const employees = [
  { value: "yuval", label: "יובל בנגיימל" },
  { value: "employee1", label: "עובד 1" },
  { value: "employee2", label: "עובד 2" },
  { value: "employee3", label: "עובד 3" },
];

const months = [
  { value: "2025-04", label: "אפריל 2025", current: true },
  { value: "2025-03", label: "מרץ 2025", current: false },
  { value: "2025-02", label: "פברואר 2025", current: false },
  { value: "2025-01", label: "ינואר 2025", current: false },
  { value: "2024-12", label: "דצמבר 2024", current: false },
];

// Sample PDF URL - replace with your actual PDF URL or generate dynamically
const SAMPLE_PDF_URL = "/sample-payslip.pdf";

export default function PaySlip() {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfUrl, setPdfUrl] = useState<string>(SAMPLE_PDF_URL);
  const [showPdf, setShowPdf] = useState<boolean>(false);

  const form = useForm<PaySlipFormValues>({
    resolver: zodResolver(paySlipSchema),
    defaultValues: {
      employeeName: "yuval",
      selectedMonth: "2025-04",
    },
  });

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
  }

  function onSubmit(data: PaySlipFormValues) {
    console.log(data);
    // Generate PDF based on form data
    generatePaySlipPdf(data);
    setShowPdf(true);
  }

  function generatePaySlipPdf(data: PaySlipFormValues) {
    // Here you would generate the PDF based on the selected employee and month
    // For now, we'll use a sample PDF
    console.log("Generating pay slip for:", data);
    // In a real implementation, you would call an API to generate the PDF
    setPdfUrl(`${SAMPLE_PDF_URL}?employee=${data.employeeName}&month=${data.selectedMonth}`);
  }

  function downloadPaySlip() {
    const formData = form.getValues();
    console.log("Downloading pay slip for:", formData);
    
    // Create download link
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `payslip-${formData.employeeName}-${formData.selectedMonth}.pdf`;
    link.click();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Section */}
        <Card className="w-full">
          <CardContent className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" dir="rtl">
                {/* Download Icon */}
                <div className="flex justify-start">
                  <Button 
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={downloadPaySlip}
                    disabled={!showPdf}
                    className="flex items-center justify-center w-10 h-10 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Download className="w-6 h-6" />
                  </Button>
                </div>

                {/* שם העובד */}
                <FormField
                  control={form.control}
                  name="employeeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-lg font-medium text-gray-900 mb-3 text-right">
                        :שם העובד
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <select 
                            {...field}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-right text-lg appearance-none bg-white"
                          >
                            {employees.map((employee) => (
                              <option key={employee.value} value={employee.value}>
                                {employee.label}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center">
                            <ChevronDown className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      </div>
                      <FormMessage className="text-right" />
                    </FormItem>
                  )}
                />

                {/* בחר חודש */}
                <FormField
                  control={form.control}
                  name="selectedMonth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-medium text-gray-900 mb-4 text-center block">
                        בחר חודש
                      </FormLabel>
                      <FormControl>
                        <div className="bg-gray-50 rounded-lg border border-gray-300 p-4 max-w-md mx-auto">
                          <div className="space-y-2">
                            {months.map((month) => (
                              <label
                                key={month.value}
                                className="block cursor-pointer"
                              >
                                <Input
                                  type="radio"
                                  value={month.value}
                                  checked={field.value === month.value}
                                  onChange={() => field.onChange(month.value)}
                                  className="sr-only"
                                />
                                <div
                                  className={`px-4 py-3 rounded-lg text-center font-medium transition-colors ${
                                    field.value === month.value
                                      ? "bg-blue-600 text-white"
                                      : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                                  }`}
                                >
                                  {month.label}
                                </div>
                              </label>
                            ))}
                          </div>
                          {/* Dropdown arrow at bottom */}
                          <div className="flex justify-center mt-3">
                            <ChevronDown className="w-6 h-6 text-gray-400" />
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage className="text-right" />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <div className="flex justify-center pt-8">
                  <Button 
                    type="submit" 
                    className="px-16 py-4 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors text-lg"
                  >
                    הצג תלוש שכר
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* PDF Preview Section */}
        <Card className="w-full">
          <CardContent className="p-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">תצוגה מקדימה</h3>
            </div>
            
            {showPdf ? (
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div className="flex items-center justify-center p-8">
                      <div className="text-gray-500">טוען PDF...</div>
                    </div>
                  }
                  error={
                    <div className="flex items-center justify-center p-8">
                      <div className="text-red-500">שגיאה בטעינת הקובץ</div>
                    </div>
                  }
                >
                  <Page 
                    pageNumber={pageNumber} 
                    width={400}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </Document>
                
                {/* Page Navigation */}
                {numPages && numPages > 1 && (
                  <div className="flex items-center justify-center p-4 bg-gray-50 border-t">
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPageNumber(page => Math.max(1, page - 1))}
                        disabled={pageNumber <= 1}
                      >
                        הקודם
                      </Button>
                      <span className="text-sm text-gray-600">
                        עמוד {pageNumber} מתוך {numPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPageNumber(page => Math.min(numPages, page + 1))}
                        disabled={pageNumber >= numPages}
                      >
                        הבא
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center p-16 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <div className="text-gray-400 mb-2">
                    <Download className="w-12 h-12 mx-auto" />
                  </div>
                  <p className="text-gray-500">בחר עובד וחודש להצגת תלוש השכר</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 