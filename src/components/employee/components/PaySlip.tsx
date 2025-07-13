"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ChevronDown, ZoomIn, ZoomOut, RotateCw, Printer } from "lucide-react";
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

import { PDFResponse, Employee } from "@/lib/types";

// Set up PDF.js worker - using legacy worker for better Node.js 20 compatibility
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;

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

// A4 dimensions at different DPI
const A4_WIDTH_96DPI = 794; // A4 width at 96 DPI (common for screens)

export default function PaySlip({ recordId, employees = [] }: PaySlipProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [showPdf, setShowPdf] = useState<boolean>(false);
  const [availablePdfs, setAvailablePdfs] = useState<PDFResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  
  // PDF viewing controls
  const [scale, setScale] = useState<number>(0.5);
  const [rotation, setRotation] = useState<number>(0);
  const [fitMode, setFitMode] = useState<'width' | 'page' | 'custom'>('custom');

  // Convert employees to the format expected by the dropdown
  const employeeOptions = employees.map(emp => {
    const firstNameCol = emp.columns.find(col => 
      col.name === 'שם פרטי' || col.name.includes('שם פרטי')
    );
    const lastNameCol = emp.columns.find(col => 
      col.name === 'שם משפחה' || col.name.includes('שם משפחה')
    );
    
    const firstName = Array.isArray(firstNameCol?.oldValue) ? firstNameCol.oldValue.join(', ') : String(firstNameCol?.oldValue || '');
    const lastName = Array.isArray(lastNameCol?.oldValue) ? lastNameCol.oldValue.join(', ') : String(lastNameCol?.oldValue || '');
    
    return {
      value: emp.id,
      label: `${firstName} ${lastName}`
    };
  });

  const form = useForm<PaySlipFormValues>({
    resolver: zodResolver(paySlipSchema),
    defaultValues: {
      employeeName: employeeOptions.length > 0 ? employeeOptions[0].value : "",
      selectedMonth: "",
    },
  });

  // Calculate PDF width based on fit mode and container
  const calculatePdfWidth = () => {
    const containerWidth = window.innerWidth * 0.45; // Adjust for grid layout
    
    switch (fitMode) {
      case 'width':
        return Math.min(containerWidth, A4_WIDTH_96DPI);
      case 'page':
        return containerWidth * 0.9;
      case 'custom':
        return A4_WIDTH_96DPI * scale;
      default:
        return A4_WIDTH_96DPI;
    }
  };

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

  // PDF Control Functions
  const zoomIn = () => {
    setFitMode('custom');
    setScale(prev => Math.min(prev + 0.25, 3.0));
  };

  const zoomOut = () => {
    setFitMode('custom');
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const rotateClockwise = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const printPdf = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  // Function to fetch PDFs for a specific employee
  const fetchPdfsForEmployee = async (employeeRecordId: string) => {
    if (!employeeRecordId) return;
    
    setLoading(true);
    setError("");
    setShowPdf(false); // Clear current PDF display
    setPdfUrl("");
    
    try {
      const response = await fetch(`https://hook.eu2.make.com/1qr8sx2y62843ve29y5agc0c26tl8r1s?recordId=${employeeRecordId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const pdfData = await response.json();
      console.log("PDF data received:", pdfData);
      
      if (pdfData && pdfData.documents && Array.isArray(pdfData.documents) && pdfData.documents.length > 0) {
        setAvailablePdfs(pdfData);
        // Set default month to the first available PDF date
        form.setValue("selectedMonth", pdfData.documents[0].date);
      } else {
        setError("לא נמצאו תלושי שכר עבור העובד הנבחר");
        setAvailablePdfs(null);
      }
    } catch (error) {
      console.error("Error fetching PDFs:", error);
      setError("שגיאה בטעינת תלושי השכר");
      setAvailablePdfs(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch PDFs when component loads with first employee
  useEffect(() => {
    if (employeeOptions.length > 0) {
      const firstEmployeeId = employeeOptions[0].value;
      fetchPdfsForEmployee(firstEmployeeId);
    }
  }, [employeeOptions.length]);

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

  // Cleanup effect to ensure scrolling is restored when component unmounts
  useEffect(() => {
    return () => {
      // Re-enable scrolling on cleanup
      document.body.style.overflow = '';
    };
  }, []);

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
        <div className="flex h-full items-center justify-end text-right">
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
        <div className="flex h-full items-center justify-end">
          <div className="text-lg text-gray-600">לא נמצאו עובדים</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 p-4`}>
      <div className={`max-w-7xl mx-auto h-full`}>
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 h-full`}>
          
          {/* PDF Preview Section */}
          <div className={`lg:col-span-2`}>
            <Card className="h-full">
              <CardContent className="p-2 h-full">
                {showPdf && pdfUrl ? (
                  <div className="h-full flex flex-col">
                    {/* PDF Controls Toolbar */}
                    <div className="flex items-center justify-between p-3 bg-gray-100 border-b rounded-t-lg">
                      <div className="flex items-center space-x-2">
                        {/* Left side controls */}
                        <Button 
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={downloadPaySlip}
                          disabled={!showPdf || !pdfUrl}
                          className="flex items-center space-x-1 text-purple-600 hover:bg-purple-50"
                        >
                          <Download className="w-4 h-4" />
                          <span>הורד</span>
                        </Button>
                        <Button 
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={printPdf}
                          disabled={!showPdf || !pdfUrl}
                          className="flex items-center space-x-1 text-green-600 hover:bg-green-50"
                        >
                          <Printer className="w-4 h-4" />
                          <span>הדפס</span>
                        </Button>
                      </div>
                      
                      {/* Center controls */}
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1 bg-white rounded-lg px-2 py-1">
                          <Button 
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={zoomOut}
                            disabled={scale <= 0.5}
                            className="p-1"
                          >
                            <ZoomOut className="w-4 h-4" />
                          </Button>
                          <span className="text-sm font-medium px-2">{Math.round(scale * 100)}%</span>
                          <Button 
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={zoomIn}
                            disabled={scale >= 3.0}
                            className="p-1"
                          >
                            <ZoomIn className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <Button 
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={rotateClockwise}
                          className="p-1"
                        >
                          <RotateCw className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* PDF Display */}
                    <div className="flex-1 border border-gray-300 rounded-b-lg overflow-auto bg-white">
                      <div className="flex justify-center p-4">
                        <Document
                          file={pdfUrl}
                          onLoadSuccess={onDocumentLoadSuccess}
                          loading={
                            <div className="flex items-center justify-center h-full text-right">
                              <div className="text-gray-500">...טוען PDF</div>
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
                            width={calculatePdfWidth()}
                            rotate={rotation}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            className="shadow-lg"
                          />
                        </Document>
                      </div>
                    </div>
                    
                    {/* Page Navigation */}
                    {numPages && numPages > 1 && (
                      <div className="flex items-center justify-center p-4 bg-gray-50 border-t rounded-b-lg">
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
                    <div className="text-center text-gray-500">
                      <div className="text-lg mb-2">בחר עובד וחודש להצגת תלוש השכר</div>
                      <div className="text-sm">התלוש יוצג בגודל A4 מלא</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Form Section - Right Side (hidden in fullscreen) */}
          {/* {!isFullScreen && ( */}
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
                              <FormLabel className="text-lg font-medium text-gray-900 text-right">
                                שם העובד:
                              </FormLabel>
                            </div>
                            <div className="relative">
                              <FormControl>
                                <select 
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    // Fetch PDFs for the newly selected employee
                                    fetchPdfsForEmployee(e.target.value);
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
          {/* )} */}
        </div>
      </div>
    </div>
  );
} 