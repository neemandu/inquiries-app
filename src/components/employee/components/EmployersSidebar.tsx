import Image from "next/image";
import { ViewType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Folder, Mail } from "lucide-react";

interface EmployersSidebarProps {
  activeView?: ViewType | null;
  onViewChange: (view: ViewType) => void;
  onShowYearlyForm: () => void;
  notificationCounts?: {
    "monthly-report"?: number;
    vacations?: number;
    "pending-inquiries"?: number;
  };
  yearlyInquiriesCount?: number;
  isOpen: boolean;
  onToggle: () => void;
}

const navigationItems = [
  { id: "monthly-report" as ViewType, label: "דיווח חודשי", icon: "/icons/alerts.png" },
  { id: "add-employee" as ViewType, label: "הוספת עובד", icon: "/icons/add.png" },
  { id: "employee-recognition" as ViewType, label: "הסרת עובד", icon: "/icons/remove.png" },
  { id: "pay-slip" as ViewType, label: "דוחות חודשיים", icon: "/icons/order.png" },
  { id: "vacations" as ViewType, label: "מסמכים חסרים", icon: "/icons/alarm.png" },
  { id: "document-upload" as ViewType, label: "העלאת מסמכים", icon: "/icons/upload.png" },
];

export default function EmployersSidebar({
  activeView,
  onViewChange,
  onShowYearlyForm,
  notificationCounts,
  yearlyInquiriesCount,
  isOpen,
  onToggle,
}: EmployersSidebarProps) {
  const renderBadge = (count: number, compact = false) => (
    <span
      className={`rounded-full font-bold flex items-center justify-center flex-shrink-0 ${
        compact ? "h-4 min-w-4 px-1 text-[9px]" : "h-5 min-w-5 px-2 text-xs"
      } ${count > 0 ? "bg-red-500 text-white" : "bg-green-500 text-white"}`}
    >
      {count}
    </span>
  );

  return (
    <div className="w-full space-y-4" dir="rtl">
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="icon"
          className="border border-gray-300 bg-white hover:bg-gray-100"
          onClick={onToggle}
        >
          {isOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </Button>
      </div>

      <Card className="shadow-sm">
        {isOpen && (
          <CardHeader>
            <CardTitle className="text-lg font-medium text-gray-900 text-center">בירורים</CardTitle>
          </CardHeader>
        )}
        <CardContent className={`space-y-3 ${isOpen ? 'pr-0' : 'pr-2'}`}>
          <Button
            onClick={() => onViewChange("pending-inquiries")}
            variant={activeView === "pending-inquiries" ? "default" : "ghost"}
            className={`w-full flex items-center ${
              isOpen ? "justify-between pl-4 pr-2 gap-3" : "justify-center px-2 gap-2"
            } py-3 h-auto min-h-[44px] text-black bg-white hover:bg-purple-50 ${
              activeView === "pending-inquiries"
                ? "border-b-[2px] border-purple-500 border-solid"
                : ""
            }`}
          >
            {isOpen ? (
              <>
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-yellow-500" />
                  <span className="font-medium text-base">בירורי הנהלת חשבונות</span>
                </div>
                {renderBadge(notificationCounts?.["pending-inquiries"] ?? 0, false)}
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-yellow-500" />
                {renderBadge(notificationCounts?.["pending-inquiries"] ?? 0, true)}
              </div>
            )}
          </Button>
          <Button
            onClick={onShowYearlyForm}
            variant="ghost"
            className={`w-full flex items-center ${
              isOpen ? "justify-between pl-4 pr-2 gap-3" : "justify-center px-2 gap-2"
            } py-3 h-auto min-h-[44px] text-black bg-white hover:bg-purple-50`}
          >
            {isOpen ? (
              <>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-base">בירורים כלליים</span>
                </div>
                {yearlyInquiriesCount !== undefined && renderBadge(yearlyInquiriesCount, false)}
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-blue-600" />
                {yearlyInquiriesCount !== undefined && renderBadge(yearlyInquiriesCount, true)}
              </div>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        {isOpen && (
          <CardHeader>
            <CardTitle className="text-lg font-medium text-gray-900 text-right">מעסיקים</CardTitle>
          </CardHeader>
        )}
        <CardContent className={`space-y-3 ${isOpen ? 'pr-0' : 'pr-2'}`}>
          {navigationItems.map((item) => {
            const count = notificationCounts?.[item.id as keyof typeof notificationCounts] ?? 0;
            const showBadge = item.id === "vacations" || item.id === "monthly-report";

            return (
              <Button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                variant={activeView === item.id ? "default" : "ghost"}
                className={`w-full flex items-center ${
                  isOpen ? "justify-start gap-4 pl-4 pr-2" : "justify-center px-2 gap-2"
                } py-3 h-auto min-h-[44px] text-black bg-white hover:bg-purple-50 ${
                  activeView === item.id
                    ? "border-b-[2px] border-purple-500 border-solid"
                    : ""
                }`}
              >
                {isOpen ? (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-shrink-0">
                        <Image src={item.icon} alt={item.label} width={20} height={20} className="flex-shrink-0" />
                      </div>
                      <span className="font-medium text-base">{item.label}</span>
                    </div>
                    {showBadge && renderBadge(count)}
                  </>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-shrink-0">
                      <Image src={item.icon} alt={item.label} width={20} height={20} className="flex-shrink-0" />
                    </div>
                    {showBadge && renderBadge(count, true)}
                  </div>
                )}
              </Button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
