"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ColumnSettingsType } from '../types';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";

interface ColumnSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  columnSettings: ColumnSettingsType;
  onColumnToggle: (column: keyof ColumnSettingsType) => void;
}

const columnSettingsSchema = z.object({
  travel: z.boolean(),
  competition: z.boolean(),
  ignoreFiles: z.boolean(),
  accounting: z.boolean(),
  salary: z.boolean(),
  other: z.boolean(),
});

type ColumnSettingsFormValues = z.infer<typeof columnSettingsSchema>;

export default function ColumnSettings({ 
  isOpen, 
  onClose, 
  columnSettings, 
  onColumnToggle 
}: ColumnSettingsProps) {
  const form = useForm<ColumnSettingsFormValues>({
    resolver: zodResolver(columnSettingsSchema),
    defaultValues: {
      travel: columnSettings.travel,
      competition: columnSettings.competition,
      ignoreFiles: columnSettings.ignoreFiles,
      accounting: columnSettings.accounting,
      salary: columnSettings.salary,
      other: columnSettings.other,
    },
  });

  function onSubmit(data: ColumnSettingsFormValues) {
    // Apply all changes
    Object.keys(data).forEach((key) => {
      const typedKey = key as keyof ColumnSettingsType;
      if (data[typedKey] !== columnSettings[typedKey]) {
        onColumnToggle(typedKey);
      }
    });
    onClose();
  }

  if (!isOpen) return null;

  const settingsConfig = [
    { key: 'travel' as keyof ColumnSettingsType, label: 'נסיעות' },
    { key: 'competition' as keyof ColumnSettingsType, label: 'תחרות' },
    { key: 'ignoreFiles' as keyof ColumnSettingsType, label: 'התעלמות קבצים' },
    { key: 'accounting' as keyof ColumnSettingsType, label: 'רואה חשבון' },
    { key: 'salary' as keyof ColumnSettingsType, label: 'שכר' },
    { key: 'other' as keyof ColumnSettingsType, label: 'אחר' },
  ];

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/40 bg-opacity-50 z-20"
        onClick={onClose}
      />
      {/* Popup */}
      <Card className="absolute top-12 right-0 z-30 w-72" dir="rtl">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900 text-right">
            ניהול עמודות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {settingsConfig.map((setting) => (
                <FormField
                  key={setting.key}
                  control={form.control}
                  name={setting.key}
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel className="text-gray-700 text-base">
                        {setting.label}
                      </FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-purple-600"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ))}
              
              <div className="mt-6 flex justify-center">
                <Button 
                  type="submit"
                  className="px-8 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                  variant="secondary"
                >
                  אישור
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
} 