"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const vacationRowSchema = z.object({
  id: z.number(),
  employeeName: z.string().optional(),
  form101: z.string().optional(),
  exemption: z.string().optional(),
  incomeTransfer: z.string().optional(),
  accountantNotes: z.string().optional(),
});

const vacationsSchema = z.object({
  rows: z.array(vacationRowSchema),
});

type VacationsFormValues = z.infer<typeof vacationsSchema>;
type VacationRow = z.infer<typeof vacationRowSchema>;

const createEmptyRow = (id: number): VacationRow => ({
  id,
  employeeName: "",
  form101: "",
  exemption: "",
  incomeTransfer: "",
  accountantNotes: "",
});

export default function Vacations() {
  const form = useForm<VacationsFormValues>({
    resolver: zodResolver(vacationsSchema),
    defaultValues: {
      rows: Array.from({ length: 15 }, (_, index) => createEmptyRow(index + 1)),
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "rows",
  });

  function onSubmit(data: VacationsFormValues) {
    // Filter out empty rows
    const filledRows = data.rows.filter(row => 
      row.employeeName || row.form101 || row.exemption || row.incomeTransfer || row.accountantNotes
    );
    console.log("Vacation data:", filledRows);
    // Here you would typically send the data to your API
  }

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" dir="rtl">
              {/* Table */}
              <div className="overflow-hidden border border-gray-300 rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-300">
                      <th className="px-4 py-4 text-center text-sm font-medium text-gray-900 border-l border-gray-300">
                        מס
                      </th>
                      <th className="px-4 py-4 text-center text-sm font-medium text-gray-900 border-l border-gray-300">
                        שם העובד
                      </th>
                      <th className="px-4 py-4 text-center text-sm font-medium text-gray-900 border-l border-gray-300">
                        101
                      </th>
                      <th className="px-4 py-4 text-center text-sm font-medium text-gray-900 border-l border-gray-300">
                        פטירה
                      </th>
                      <th className="px-4 py-4 text-center text-sm font-medium text-gray-900 border-l border-gray-300">
                        הכנסה העתקה
                      </th>
                      <th className="px-4 py-4 text-center text-sm font-medium text-gray-900">
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
                        <td className="px-4 py-4 border-l border-gray-200 text-center">
                          <FormField
                            control={form.control}
                            name={`rows.${index}.employeeName`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    {...field}
                                    className="text-center border-0 bg-transparent focus:bg-white focus:border-gray-300 rounded-md p-2"
                                    placeholder=""
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-4 py-4 border-l border-gray-200 text-center">
                          <FormField
                            control={form.control}
                            name={`rows.${index}.form101`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    {...field}
                                    className="text-center border-0 bg-transparent focus:bg-white focus:border-gray-300 rounded-md p-2"
                                    placeholder=""
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-4 py-4 border-l border-gray-200 text-center">
                          <FormField
                            control={form.control}
                            name={`rows.${index}.exemption`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    {...field}
                                    className="text-center border-0 bg-transparent focus:bg-white focus:border-gray-300 rounded-md p-2"
                                    placeholder=""
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-4 py-4 border-l border-gray-200 text-center">
                          <FormField
                            control={form.control}
                            name={`rows.${index}.incomeTransfer`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    {...field}
                                    className="text-center border-0 bg-transparent focus:bg-white focus:border-gray-300 rounded-md p-2"
                                    placeholder=""
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <FormField
                            control={form.control}
                            name={`rows.${index}.accountantNotes`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    {...field}
                                    className="text-center border-0 bg-transparent focus:bg-white focus:border-gray-300 rounded-md p-2"
                                    placeholder=""
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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