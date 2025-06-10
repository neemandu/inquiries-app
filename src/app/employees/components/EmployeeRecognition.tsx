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
import React from "react";

const employeeRecognitionSchema = z.object({
  employeeName: z.string().min(2, {
    message: "שם העובד חייב להכיל לפחות 2 תווים.",
  }),
  departureDate: z.string().min(1, {
    message: "תאריך עזיבה הוא שדה חובה.",
  }),
  departureReason: z.string().min(1, {
    message: "סיבת עזיבה היא שדה חובה.",
  }),
  notes: z.string().optional(),
});

type EmployeeRecognitionFormValues = z.infer<typeof employeeRecognitionSchema>;

export default function EmployeeRecognition() {
  const form = useForm<EmployeeRecognitionFormValues>({
    resolver: zodResolver(employeeRecognitionSchema),
    defaultValues: {
      employeeName: "",
      departureDate: "",
      departureReason: "",
      notes: "",
    },
  });

  function onSubmit(data: EmployeeRecognitionFormValues) {
    console.log(data);
    // Here you would typically send the data to your API
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
                name="employeeName"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-start gap-4">
                    <FormLabel className="block text-lg font-medium text-gray-900 mb-3 text-right">
                      שם העובד:
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-sm px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-right text-lg">
                          <SelectValue placeholder="בחר עובד" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="אמיר כהן">אמיר כהן</SelectItem>
                        <SelectItem value="שרה לוי">שרה לוי</SelectItem>
                        <SelectItem value="דוד ישראלי">דוד ישראלי</SelectItem>
                        <SelectItem value="רות אברהם">רות אברהם</SelectItem>
                        <SelectItem value="יוסי מזרחי">יוסי מזרחי</SelectItem>
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
                name="departureDate"
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
                        placeholder="June 01, 2025"
                        className="bg-background pr-10 max-w-[150px]"
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
                            className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
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
                name="departureReason"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-start gap-4">
                    <FormLabel className="block text-lg font-medium text-gray-900 mb-3 text-right">
                      סיבת עזיבה:
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-sm px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-right text-lg">
                          <SelectValue placeholder="בחר סיבת עזיבה" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="התפטרות">התפטרות</SelectItem>
                        <SelectItem value="פיטורים">פיטורים</SelectItem>
                        <SelectItem value="פרישה">פרישה</SelectItem>
                        <SelectItem value="סיום חוזה">סיום חוזה</SelectItem>
                        <SelectItem value="מעבר למשרה אחרת">מעבר למשרה אחרת</SelectItem>
                        <SelectItem value="סיבות רפואיות">סיבות רפואיות</SelectItem>
                        <SelectItem value="אחר">אחר</SelectItem>
                      </SelectContent>
                    </Select>
                    </div>
                    <FormMessage className="text-right" />
                  </FormItem>
                )}
              />

              {/* הערות */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-lg font-medium text-gray-900 mb-3 text-right">
                      הערות: 
                    </FormLabel>
                    <FormControl>
                      <textarea 
                        {...field}
                        rows={4} 
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-right text-lg resize-none"
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