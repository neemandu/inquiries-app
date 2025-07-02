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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import React from "react";
import { Employee, LeavingReason } from "@/lib/types";

const employeeRecognitionSchema = z.object({
  recordId: z.string().min(2, {
    message: "שם העובד חייב להכיל לפחות 2 תווים.",
  }),
  leavingDate: z.string().min(1, {
    message: "תאריך עזיבה הוא שדה חובה.",
  }),
  leavingReason: z.string().min(1, {
    message: "סיבת עזיבה היא שדה חובה.",
  }),
  remarks: z.string().optional(),
});

type EmployeeRecognitionFormValues = z.infer<typeof employeeRecognitionSchema>;

export default function EmployeeRecognition(
  { employees,
    leavingReasons,
    is161Must = false,
  }: {
    employees: Employee[],
    leavingReasons: LeavingReason[],
    is161Must?: boolean,
  }
) {


  const form = useForm<EmployeeRecognitionFormValues>({
    resolver: zodResolver(employeeRecognitionSchema),
    defaultValues: {
      recordId: "",
      leavingReason: "",
      leavingDate: "",
      remarks: "",
    },
  });

  // State for 161 file
  const [file161, setFile161] = React.useState<File | null>(null);
  const [file161Error, setFile161Error] = React.useState<string | null>(null);

  // Helper to convert file to base64
  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function onSubmit(data: EmployeeRecognitionFormValues) {
    // If 161 is required, validate
    if (is161Must && !file161) {
      setFile161Error('קובץ 161 הוא שדה חובה');
      return;
    }
    setFile161Error(null);
    let filePayload = undefined;
    if (is161Must && file161) {
      const base64 = await fileToBase64(file161);
      // Remove the prefix (data:...;base64,)
      const base64Data = base64.split(',')[1];
      filePayload = {
        contentType: file161.type,
        file: base64Data,
        file_name: file161.name,
      };
    }
    try {
      const loadingToast = toast.loading('מעבד את הבקשה...');
      const payload = is161Must ? { ...data, "161File": filePayload } : data;
      const response = await fetch('https://hook.eu2.make.com/6yvgowfqvfq0maax195lb7s0x2ayb53m', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      toast.dismiss(loadingToast);
      if (response.ok) {
        toast.success('העובד הוסר בהצלחה', {
          description: 'הנתונים נשמרו במערכת',
          duration: 4000,
        });
        form.reset();
        setFile161(null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error('שגיאה בשמירת הנתונים', {
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

  function isValidDate(date: Date | undefined) {
    if (!date) {
      return false;
    }
    return !isNaN(date.getTime());
  }

  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(
    new Date("2025-06-01")
  );

  const [month, setMonth] = React.useState<Date | undefined>(date);

  function formatDate(date: Date | undefined) {
    if (!date) {
      return "";
    }
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
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
                name="recordId"
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
                            <SelectItem key={employee.recordId} value={employee.recordId} className="text-right">{employee.firstName} {employee.lastName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage className="text-right" />
                  </FormItem>
                )}
              />

              {/* תאריך עזיבה */}
              <FormField
                control={form.control}
                name="leavingDate"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-start gap-4">
                      <FormLabel className="block text-lg font-medium text-gray-900 mb-3 text-right">
                        תאריך עזיבה:
                      </FormLabel>
                      <FormControl>
                        <div className="relative flex gap-2">
                          <Input
                            id="date"
                            value={field.value}
                            placeholder="01/06/2025"
                            className="w-sm bg-background pl-10 text-right text-base"
                            onChange={(e) => {
                              const date = new Date(e.target.value);
                              field.onChange(e.target.value);
                              if (isValidDate(date)) {
                                setDate(date);
                                setMonth(date);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "ArrowDown") {
                                e.preventDefault();
                                setOpen(true);
                              }
                            }}
                          />
                          <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                id="date-picker"
                                variant="ghost"
                                className="absolute top-1/2 left-2 size-6 -translate-y-1/2"
                              >
                                <CalendarIcon className="size-3.5" />
                                <span className="sr-only">Select date</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto overflow-hidden p-0"
                              align="end"
                              alignOffset={-8}
                              sideOffset={10}
                            >
                              <Calendar
                                mode="single"
                                selected={date}
                                captionLayout="dropdown"
                                month={month}
                                onMonthChange={setMonth}
                                onSelect={(date) => {
                                  setDate(date);
                                  field.onChange(formatDate(date));
                                  setOpen(false);
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </FormControl>
                      <FormMessage className="text-right" />
                    </div>
                  </FormItem>
                )}
              />

              {/* סיבת עזיבה */}
              <FormField
                control={form.control}
                name="leavingReason"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-start gap-4">
                      <FormLabel className="block text-lg font-medium text-gray-900 mb-3 text-right">
                        סיבת עזיבה:
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} dir="rtl">
                        <FormControl>
                          <SelectTrigger className="w-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-right text-base ">
                            <SelectValue placeholder="בחר סיבת עזיבה" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="text-right">
                          {leavingReasons && leavingReasons.map((reason) => (
                            <SelectItem key={reason.Reason} value={reason.Reason} className="text-right">{reason.Reason}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage className="text-right" />
                  </FormItem>
                )}
              />
               {/* קובץ 161 - required if is161Must */}
               {is161Must && (
                <div className="flex flex-row items-start gap-2">
                  <label className="block text-lg font-medium text-gray-900 mb-1 text-right">קובץ 161 <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={e => setFile161(e.target.files?.[0] || null)}
                    className="border border-gray-300 rounded-lg px-3 py-2"
                  />
                  {file161 && <span className="text-sm text-gray-700">{file161.name}</span>}
                  {file161Error && <span className="text-sm text-red-600">{file161Error}</span>}
                </div>
              )}


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
                        rows={1}
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-right text-base resize-none min-h-[60px]"
                        placeholder=""
                      />
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
                  שלח
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 