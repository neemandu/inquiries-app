import Image from 'next/image';
import { ViewType } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EmployersSidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  suppliers: string[];
  selectedSupplier: string | null;
  onSupplierSelect: (supplier: string) => void;
  onShowYearlyForm: () => void;
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
    label: 'הסרת עובד',
    icon: '/icons/remove.png',
  },
  {
    id: 'pay-slip' as ViewType,
    label: 'תלושי שכר',
    icon: '/icons/order.png',
  },
  {
    id: 'vacations' as ViewType,
    label: 'חוסרים',
    icon: '/icons/alarm.png',
  },
];

export default function EmployersSidebar({
  activeView,
  onViewChange,
  suppliers,
  selectedSupplier,
  onSupplierSelect,
  onShowYearlyForm,
}: EmployersSidebarProps) {
  return (
    <div className="w-80 space-y-6">
      {/* בירורים Section */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-900 text-center" dir="rtl">
            בירורים
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {suppliers.map((supplier) => (
            <Button
              key={supplier}
              onClick={() => onSupplierSelect(supplier)}
              variant={selectedSupplier === supplier ? "default" : "ghost"}
              className={`w-full flex items-center justify-start gap-4 px-4 py-3 h-auto text-black ${
                selectedSupplier === supplier
                  ? 'bg-purple-100 border border-purple-300 hover:bg-purple-200' 
                  : 'bg-white hover:bg-purple-50'
              }`}
              dir="rtl"
            >
              <span className="font-medium text-base">{supplier}</span>
            </Button>
          ))}
          <Button
            onClick={onShowYearlyForm}
            variant="ghost"
            className="w-full flex items-center justify-start gap-4 px-4 py-3 h-auto text-black bg-white hover:bg-purple-50"
            dir="rtl"
          >
            <span className="font-medium text-base">בירורים כלליים&gt;&gt;</span>
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
              className={`w-full flex items-center justify-start gap-4 px-4 py-3 h-auto text-black ${
                activeView === item.id 
                  ? 'bg-purple-100 border border-purple-300 hover:bg-purple-200' 
                  : 'bg-white hover:bg-purple-50'
              }`}
              dir="rtl"
            >
              <Image 
                src={item.icon} 
                alt={item.id} 
                width={20} 
                height={20}
                className="flex-shrink-0"
              />
              <span className="font-medium text-base">{item.label}</span>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
} 