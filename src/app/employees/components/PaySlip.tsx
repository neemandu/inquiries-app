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

import { Document, Page, pdfjs } from 'react-pdf';
import { useState, useEffect } from 'react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { GetPDF } from '@/lib/utils';
import { PDFResponse, Employee } from '../types';

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

interface PaySlipProps {
  recordId?: string;
  employees?: Employee[];
}

export default function PaySlip({ recordId, employees = [] }: PaySlipProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [showPdf, setShowPdf] = useState<boolean>(false);
  const [availablePdfs, setAvailablePdfs] = useState<PDFResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Convert employees to the format expected by the dropdown
  const employeeOptions = employees.map(emp => ({
    value: emp.recordId,
    label: `${emp.firstName} ${emp.lastName}`
  }));

  const form = useForm<PaySlipFormValues>({
    resolver: zodResolver(paySlipSchema),
    defaultValues: {
      employeeName: employeeOptions.length > 0 ? employeeOptions[0].value : "",
      selectedMonth: "",
    },
  });

  // Function to format date to Hebrew month name
  const formatDateToHebrew = (dateString: string) => {
    const date = new Date(dateString);
    const months = [
      "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
      "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${month} ${year}`;
  };

  // Fetch PDFs when recordId changes
  useEffect(() => {
    const fetchPdfs = async () => {
      if (!recordId) return;
      
      setLoading(true);
      setError("");
      
      try {
        const pdfData = await GetPDF(recordId);
        // const pdfData = await GetPDF('rechKPRW47oYHToBB');
        
        console.log(pdfData);
        if (pdfData && Array.isArray(pdfData) && pdfData.length > 0) {
          // Extract the documents from the array response
          const documentsData = pdfData[0];
          setAvailablePdfs(documentsData);
          // Set default month to the first available PDF date
          if (documentsData.documents && documentsData.documents.length > 0) {
            form.setValue("selectedMonth", documentsData.documents[0].date);
          }
        } else {
          setError("לא נמצאו תלושי שכר");
        }
      } catch (error) {
        console.error("Error fetching PDFs:", error);
        setError("שגיאה בטעינת תלושי השכר");
      } finally {
        setLoading(false);
      }
    };

    fetchPdfs();
  }, [recordId]);

  // Auto-display PDF when PDFs are loaded and form values change
  useEffect(() => {
    const currentValues = form.getValues();
    if (availablePdfs?.documents && availablePdfs.documents.length > 0) {
      // If no month is selected, use the first available one
      if (!currentValues.selectedMonth) {
        const firstDate = availablePdfs.documents[0].date;
        form.setValue("selectedMonth", firstDate);
        findAndDisplayPdf({...currentValues, selectedMonth: firstDate});
      } else {
        findAndDisplayPdf(currentValues);
      }
    }
  }, [availablePdfs, form.watch("selectedMonth")]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
  }

  function onSubmit(data: PaySlipFormValues) {
    console.log(data);
    // Find matching PDF based on form data
    findAndDisplayPdf(data);
  }

  function findAndDisplayPdf(data: PaySlipFormValues) {
    if (!availablePdfs?.documents) {
      setError("לא נמצאו תלושי שכר זמינים");
      return;
    }

    // Find PDF that matches the exact selected date
    const selectedDate = data.selectedMonth; // e.g., "2025-06-01"
    
    // Find PDF that matches the selected date exactly
    const matchingPdf = availablePdfs.documents.find(pdf => {
      return pdf.date === selectedDate;
    });

    if (matchingPdf) {
      setPdfUrl(matchingPdf.pdfUrl);
      setShowPdf(true);
      setError("");
      setPageNumber(1); // Reset to first page
    } else {
      setError(`לא נמצא תלוש שכר עבור ${formatDateToHebrew(selectedDate)}`);
      setShowPdf(false);
    }
  }

  function downloadPaySlip() {
    const formData = form.getValues();
    console.log("Opening pay slip for:", formData);
    
    if (!pdfUrl) {
      setError("אין תלוש שכר זמין להצגה");
      return;
    }
    
    // Open PDF in new window
    window.open(pdfUrl, '_blank');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="flex h-full items-center justify-center">
          <div className="text-lg text-gray-600">טוען תלושי שכר...</div>
        </div>
      </div>
    );
  }

  if (!recordId) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="flex h-full items-center justify-center">
          <div className="text-lg text-gray-600">לא נמצא מזהה רשומה</div>
        </div>
      </div>
    );
  }

  if (employeeOptions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="flex h-full items-center justify-center">
          <div className="text-lg text-gray-600">לא נמצאו עובדים</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto h-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          
          {/* PDF Preview Section - Left Side */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardContent className="p-2 h-full">
                {showPdf && pdfUrl ? (
                  <div className="h-full flex flex-col">
                    <div className="flex-1 border border-gray-300 rounded-lg overflow-hidden bg-white">
                      <div className="flex justify-start mb-6">
                        <div className="flex justify-start mb-6">
                      <Button 
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={downloadPaySlip}
                        disabled={!showPdf || !pdfUrl}
                        className="flex items-center justify-center w-10 h-10 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Download className="w-6 h-6" />
                      </Button>
                    </div>
                     </div>
                      <Document
                        file={pdfUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={
                          <div className="flex items-center justify-center h-full">
                            <div className="text-gray-500">טוען PDF...</div>
                          </div>
                        }
                        error={
                          <div className="flex items-center justify-center h-full">
                            <div className="text-red-500">שגיאה בטעינת הקובץ</div>
                          </div>
                        }
                      >
                        <Page 
                          pageNumber={pageNumber} 
                          width={Math.min(600, window.innerWidth * 0.5)}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                        />
                      </Document>
                    </div>
                    
                    {/* Page Navigation */}
                    {numPages && numPages > 1 && (
                      <div className="flex items-center justify-center p-4 bg-gray-50 border-t mt-4 rounded-lg">
                        <div className="flex items-center space-x-4">
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
                  <div className="flex items-center justify-center h-full border-2 border-dashed border-gray-300 rounded-lg bg-gray-100">
                    
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Form Section - Right Side */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardContent className="p-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 h-full" dir="rtl">
                    

                    {/* שם העובד */}
                    <FormField
                      control={form.control}
                      name="employeeName"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between mb-4">
                            {/* <input 
                              type="checkbox" 
                              className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500" 
                              defaultChecked 
                            /> */}
                            <FormLabel className="text-lg font-medium text-gray-900 text-right">
                              :שם העובד
                            </FormLabel>
                          </div>
                          <div className="relative">
                                                         <FormControl>
                               <select 
                                 {...field}
                                 onChange={(e) => {
                                   field.onChange(e);
                                   // Auto-trigger PDF display when employee changes
                                   setTimeout(() => {
                                     const currentValues = form.getValues();
                                     findAndDisplayPdf({...currentValues, employeeName: e.target.value});
                                   }, 100);
                                 }}
                                 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-right text-lg appearance-none bg-white"
                               >
                                 {employeeOptions.map((employee) => (
                                   <option key={employee.value} value={employee.value}>
                                     {employee.label}
                                   </option>
                                 ))}
                               </select>
                             </FormControl>
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                              <ChevronDown className="w-5 h-5 text-gray-400" />
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
                        <FormItem className="flex-1">
                          <FormLabel className="text-lg font-medium text-gray-900 mb-4 text-right block">
                            בחר חודש
                          </FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              {availablePdfs?.documents && availablePdfs?.documents.map((month) => (
                                                               <button
                                 key={month.date}
                                 type="button"
                                 onClick={() => {
                                   field.onChange(month.date);
                                   // Auto-trigger PDF display when month changes
                                   setTimeout(() => {
                                     const currentValues = form.getValues();
                                     findAndDisplayPdf({...currentValues, selectedMonth: month.date});
                                   }, 100);
                                 }}
                                 className={`w-full px-4 py-3 rounded-lg text-center font-medium transition-colors border ${
                                   field.value === month.date
                                     ? "bg-blue-600 text-white border-blue-600"
                                     : "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200"
                                 }`}
                                                                >
                                  {formatDateToHebrew(month.date)}
                                </button>
                              ))}
                              
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

                    {/* Error Message */}
                    {error && (
                      <div className="text-center text-red-600 text-sm">
                        {error}
                      </div>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 