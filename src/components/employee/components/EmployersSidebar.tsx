import Image from 'next/image';
import { ViewType } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EmployersSidebarProps {
  activeView?: ViewType | null;
  onViewChange: (view: ViewType) => void;
  onShowYearlyForm: () => void;
  notificationCounts?: {
    'monthly-report'?: number;
    'vacations'?: number;
    'pending-inquiries'?: number;
  };
  yearlyInquiriesCount?: number;
}

const navigationItems = [
  {
    id: 'monthly-report' as ViewType,
    label: 'דיווח חודשי',
    icon: '/icons/alerts.png',
  },
  {
    id: 'add-employee' as ViewType,
    label: 'הוספת עובד',
    icon: '/icons/add.png',
  },
  {
    id: 'employee-recognition' as ViewType,
    label: 'הסרת עובד',
    icon: '/icons/remove.png',
  },
  {
    id: 'pay-slip' as ViewType,
    label: 'דוחות חודשיים',
    icon: '/icons/order.png',
  },
  {
    id: 'vacations' as ViewType,
    label: 'מסמכים חסרים',
    icon: '/icons/alarm.png',
  },
  {
    id: 'document-upload' as ViewType,
    label: 'העלאת מסמכים',
    icon: '/icons/upload.png',
  },
];

export default function EmployersSidebar({
  activeView,
  onViewChange,
  onShowYearlyForm,
  notificationCounts,
  yearlyInquiriesCount,
}: EmployersSidebarProps) {
  return (
    <div className="w-72 space-y-6">
      {/* בירורים Section */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900 text-center" dir="rtl">
            בירורים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => onViewChange('pending-inquiries')}
            variant={activeView === 'pending-inquiries' ? "default" : "ghost"}
            className={`w-full grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 h-auto text-black mb-3 ${activeView === 'pending-inquiries'
                ? 'bg-purple-100 border border-purple-300 hover:bg-purple-200'
                : 'bg-white hover:bg-purple-50'
              }`}
            dir="rtl"
          >
            <span className="font-medium text-base text-right whitespace-normal break-words">
              📂 בירורי הנהלת חשבונות
            </span>
            <span className="rounded-full bg-red-500 text-white text-xs font-bold h-5 min-w-5 px-2 flex items-center justify-center flex-shrink-0">
              {notificationCounts?.['pending-inquiries'] ?? 0}
            </span>
          </Button>
          <div className="border-t-4 border-gray-400 my-4" />
          <Button
            onClick={onShowYearlyForm}
            variant="ghost"
            className="w-full grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 h-auto text-black bg-white hover:bg-purple-50"
            dir="rtl"
          >
            <span className="font-medium text-base text-right whitespace-normal break-words">
              📑 בירורים כלליים
            </span>
            {yearlyInquiriesCount !== undefined && (
              <span className="rounded-full bg-red-500 text-white text-xs font-bold h-5 min-w-5 px-2 flex items-center justify-center flex-shrink-0">
                {yearlyInquiriesCount}
              </span>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* מעסיקים Section */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900 text-right" dir="rtl">
            מעסיקים
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {navigationItems.map((item) => (
            <Button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              variant={activeView === item.id ? "default" : "ghost"}
              className={`w-full flex items-center justify-start gap-4 px-4 py-3 h-auto text-black ${activeView === item.id
                  ? 'bg-purple-100 border border-purple-300 hover:bg-purple-200'
                  : 'bg-white hover:bg-purple-50'
                }`}
              dir="rtl"
            >
              <div className="relative flex-shrink-0">
                <Image
                  src={item.icon}
                  alt={item.id}
                  width={20}
                  height={20}
                  className="flex-shrink-0"
                />
                {notificationCounts && 
                 notificationCounts[item.id as keyof typeof notificationCounts] && 
                 notificationCounts[item.id as keyof typeof notificationCounts]! > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    {notificationCounts[item.id as keyof typeof notificationCounts]}
                  </span>
                )}
              </div>
              <span className="font-medium text-base">{item.label}</span>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
} 
