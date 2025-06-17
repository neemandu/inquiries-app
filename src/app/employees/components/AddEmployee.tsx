"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import React from "react";
import { toast } from "sonner";

const addEmployeeSchema = z.object({
  firstName: z.string().min(2, {
    message: "שם פרטי חייב להכיל לפחות 2 תווים.",
  }),
  lastName: z.string().min(2, {
    message: "שם משפחה חייב להכיל לפחות 2 תווים.",
  }),
  startDate: z.string().min(1, {
    message: "תאריך תחילת עבודה הוא שדה חובה.",
  }),
  form101: z.string().min(1, {
    message: "יש לבחור אפשרות.",
  }),
  incomeFile: z.any().optional(),
  exemptionFile: z.any().optional(),
});

type AddEmployeeFormValues = z.infer<typeof addEmployeeSchema>;

// TODO: Uncomment this
// Helper function to convert file to base64
// const fileToBase64 = (file: File): Promise<string> => {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();
//     reader.readAsDataURL(file);
//     reader.onload = () => {
//       const result = reader.result as string;
//       // Remove the data:mime/type;base64, prefix
//       const base64 = result.split(',')[1];
//       resolve(base64);
//     };
//     reader.onerror = error => reject(error);
//   });
// };

// Helper function to format date to dd/mm/yyyy
const formatDateToAPI = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return dateString; // Return as is if not a valid date
  }
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

export default function AddEmployee() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<AddEmployeeFormValues>({
    resolver: zodResolver(addEmployeeSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      startDate: "",
      form101: "",
    },
  });

  async function onSubmit(data: AddEmployeeFormValues) {
    setIsSubmitting(true);
    
    try {

      // TODO: Uncomment this
      // Convert files to base64 if they exist
      // let pensionBase64 = "";
      // let workFileBase64 = "";
      
      // if (data.incomeFile instanceof File) {
      //   pensionBase64 = await fileToBase64(data.incomeFile);
      // }
      
      // if (data.exemptionFile instanceof File) {
      //   workFileBase64 = await fileToBase64(data.exemptionFile);
      // }
      
      // Transform data to match API format
      const apiData = {
        firstName: data.firstName,
        lastName: data.lastName,
        startDate: formatDateToAPI(data.startDate),
        is101Full: data.form101 === "כן",
        // pension: pensionBase64,
        // workFile: workFileBase64
      };
      
      // TODO: remove this
      toast.success(`apiData ${JSON.stringify(apiData)}`)
     
      // TODO: Uncomment this 
      // // Send POST request to backend
      // const response = await fetch('/api/employees', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(apiData),
      // });
      
      // if (!response.ok) {
      //   throw new Error(`HTTP error! status: ${response.status}`);
      // }
      
      // Show success toast
      // toast.success("העובד נוסף בהצלחה!", {
      //   description: `${data.firstName} ${data.lastName} נוסף למערכת`,
      //   duration: 5000,
      // });
      
      // Reset form on success
      form.reset();
      setDate(new Date("2025-06-01"));
      setMonth(new Date("2025-06-01"));
      
    } catch (error) {
      console.error('Error submitting form:', error);
      
      // Show error toast
      toast.error("שגיאה בהוספת העובד", {
        description: "אנא נסה שוב או פנה למנהל המערכת",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
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
      <div className="w-full" dir="rtl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* שם פרטי */}
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-start gap-4">
                  <FormLabel className="text-lg font-medium text-gray-900 text-right">
                    :שם פרטי
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="text-right text-lg h-10 max-w-sm"
                      dir="rtl"
                    />
                  </FormControl>
                  </div>
                  <FormMessage className="text-right" />
                </FormItem>
              )}
            />

            {/* שם משפחה */}
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-start gap-4">
                  <FormLabel className="text-lg font-medium text-gray-900 text-right">
                    :שם משפחה
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="text-right text-lg h-10 max-w-sm"
                      dir="rtl"
                    />
                  </FormControl>
                  </div>
                  <FormMessage className="text-right" />
                </FormItem>
              )}
            />

            {/* תאריך תחילת עבודה */}
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-start gap-4">
                  <FormLabel className="text-lg font-medium text-gray-900 text-right">
                    תאריך תחילת עבודה:
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
                    </div>
                  <FormMessage className="text-right" />
                </FormItem>
              )}
            />

            {/* הכנסה העתקה */}
            <FormField
              control={form.control}
              name="incomeFile"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-start gap-4">
                    <FormLabel className="text-lg font-medium text-gray-900 text-right">
                      הכנסה העתקה:
                    </FormLabel>
                    <div className="flex items-center gap-3">
                      <span className="text-purple-600 text-sm">
                        העלאת קובץ
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 bg-purple-100 text-purple-600 hover:bg-purple-200 border-purple-200"
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = ".pdf,.jpg,.jpeg,.png";
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement)
                              .files?.[0];
                            field.onChange(file);
                          };
                          input.click();
                        }}
                      >
                        <Upload className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                  <FormMessage className="text-right" />
                </FormItem>
              )}
            />

            {/* האם מילוא 101 */}
            <FormField
              control={form.control}
              name="form101"
              render={({ field }) => (
                <FormItem >
                  <div className="flex items-center justify-start gap-4">
                  <FormLabel className="text-lg font-medium text-gray-900 text-right">
                    האם מילוא 101:
                  </FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger className="w-[80px]">
                        <SelectValue placeholder="בחר אפשרות" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="כן">כן</SelectItem>
                        <SelectItem value="לא">לא</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  </div>
                  <FormMessage className="text-right" />
                </FormItem>
              )}
            />

            {/* פטירה פעילה */}
            <FormField
              control={form.control}
              name="exemptionFile"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-start gap-4">
                    <FormLabel className="text-lg font-medium text-gray-900 text-right">
                      פטירה פעילה:
                    </FormLabel>
                    <div className="flex items-center gap-3">
                      <span className="text-purple-600 text-sm">
                        העלאת קובץ
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 bg-purple-100 text-purple-600 hover:bg-purple-200 border-purple-200"
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = ".pdf,.jpg,.jpeg,.png";
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement)
                              .files?.[0];
                            field.onChange(file);
                          };
                          input.click();
                        }}
                      >
                        <Upload className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                  <FormDescription className="text-sm text-red-500 text-right mt-2">
                    • במידה זו העלאת קובץ ביחידות ברירת המחדל כי הינו שינוי
                    פטירה פעילה
                  </FormDescription>
                  <FormMessage className="text-right" />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="flex justify-center pt-8">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="px-16 py-4 bg-purple-600 hover:bg-purple-700 text-white font-medium text-lg h-auto disabled:opacity-50"
              >
                {isSubmitting ? "שולח..." : "שלח"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
