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

interface PaySlipData {
  Date: string;
  Docs: {
    [key: string]: string;
  };
}

// A4 dimensions at different DPI
const A4_WIDTH_96DPI = 794; // A4 width at 96 DPI (common for screens)

export default function PaySlip({ recordId, employees = [] }: PaySlipProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [showPdf, setShowPdf] = useState<boolean>(false);
  const [availablePdfs, setAvailablePdfs] = useState<PaySlipData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  
  // PDF viewing controls
  const [scale, setScale] = useState<number>(0.5);
  const [rotation, setRotation] = useState<number>(0);
  const [fitMode, setFitMode] = useState<'width' | 'page' | 'custom'>('custom');

  // Get unique document types from all available PDFs
  const getDocumentTypes = () => {
    const allTypes = new Set<string>();
    availablePdfs.forEach(pdf => {
      Object.keys(pdf.Docs).forEach(docType => {
        allTypes.add(docType);
      });
    });
    return Array.from(allTypes).map(type => ({
      value: type,
      label: type
    }));
  };

  // Get unique dates from available PDFs
  const getAvailableDates = () => {
    return availablePdfs.map(pdf => ({
      value: pdf.Date,
      label: formatDateToHebrew(pdf.Date)
    }));
  };

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
      employeeName: "",
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

  // Function to fetch PDFs for the employer
  const fetchPdfsForEmployer = async (employerRecordId: string) => {
    if (!employerRecordId) return;
    
    setLoading(true);
    setError("");
    setShowPdf(false); // Clear current PDF display
    setPdfUrl("");
    
    try {
      const response = await fetch(`https://hook.eu2.make.com/0dt1lukm4kv7zpiyylmefc9l8e1dtypq?recordId=${employerRecordId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const pdfData = await response.json();
      console.log("PDF data received:", pdfData);
      
      if (pdfData && Array.isArray(pdfData) && pdfData.length > 0) {
        setAvailablePdfs(pdfData);
        
        // Set default values after setting the state
        setTimeout(() => {
          const allTypes = new Set<string>();
          pdfData.forEach(pdf => {
            Object.keys(pdf.Docs).forEach(docType => {
              allTypes.add(docType);
            });
          });
          
          const documentTypes = Array.from(allTypes);
          const availableDates = pdfData.map(pdf => pdf.Date);
          
          if (documentTypes.length > 0 && availableDates.length > 0) {
            form.setValue("employeeName", documentTypes[0]);
            form.setValue("selectedMonth", availableDates[0]);
          }
        }, 0);
      } else {
        setError("לא נמצאו דוחות חודשיים עבור המעסיק הנבחר");
        setAvailablePdfs([]);
      }
    } catch (error) {
      console.error("Error fetching PDFs:", error);
      setError("שגיאה בטעינת תלושי השכר");
      setAvailablePdfs([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch PDFs when component loads with employer record ID
  useEffect(() => {
    if (recordId) {
      fetchPdfsForEmployer(recordId);
    }
  }, [recordId]);

  // Auto-display PDF when PDFs are loaded and form values change
  useEffect(() => {
    const currentValues = form.getValues();
    if (availablePdfs.length > 0 && currentValues.employeeName && currentValues.selectedMonth) {
      findAndDisplayPdf(currentValues);
    }
  }, [availablePdfs, form.watch("employeeName"), form.watch("selectedMonth")]);

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
    if (!availablePdfs || availablePdfs.length === 0) {
      setError("לא נמצאו דוחות חודשיים זמינים");
      return;
    }

    // Find PDF that matches the selected date
    const selectedDate = data.selectedMonth;
    const selectedDocType = data.employeeName;
    
    const matchingPdf = availablePdfs.find(pdf => pdf.Date === selectedDate);

    if (matchingPdf && matchingPdf.Docs[selectedDocType]) {
      setPdfUrl(matchingPdf.Docs[selectedDocType]);
      setShowPdf(true);
      setError("");
      setPageNumber(1); // Reset to first page
    } else {
      setError(`לא נמצא ${selectedDocType} עבור ${formatDateToHebrew(selectedDate)}`);
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
          <div className="text-lg text-gray-600" dir="rtl">טוען דוחות חודשיים...</div>
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
                              <div className="text-gray-500" dir="rtl">טוען PDF...</div>
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
                      <div className="text-lg mb-2">בחר סוג מסמך וחודש להצגת התלוש</div>
                      <div className="text-sm">התלוש יוצג בגודל A4 מלא</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Form Section */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardContent className="p-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 h-full" dir="rtl">
                    {/* סוג מסמך */}
                    <FormField
                      control={form.control}
                      name="employeeName"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between mb-4">
                            <FormLabel className="text-lg font-medium text-gray-900 text-right">
                              סוג מסמך:
                            </FormLabel>
                          </div>
                          <div className="relative">
                            <FormControl>
                              <select 
                                {...field}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-right text-lg appearance-none bg-white"
                              >
                                {getDocumentTypes().map((docType) => (
                                  <option key={docType.value} value={docType.value}>
                                    {docType.label}
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
                              {getAvailableDates().map((date) => (
                                <button
                                  key={date.value}
                                  type="button"
                                  onClick={() => {
                                    field.onChange(date.value);
                                  }}
                                  className={`w-full px-4 py-3 rounded-lg text-center font-medium transition-colors border ${
                                    field.value === date.value
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200"
                                  }`}
                                >
                                  {date.label}
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