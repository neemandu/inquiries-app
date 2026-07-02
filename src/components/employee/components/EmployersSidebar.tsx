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
  // Inline pill badge, used in the expanded layout.
  const badge = (count: number) => (
    <span
      className={`h-5 min-w-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-sm ring-1 ${
        count > 0
          ? "bg-red-500 text-white ring-red-600/20"
          : "bg-emerald-500 text-white ring-emerald-600/20"
      }`}
    >
      {count}
    </span>
  );

  // Floating dot badge anchored to an icon, used in the collapsed rail.
  const floatingBadge = (count: number) => (
    <span
      className={`absolute -top-2 -left-2 h-4 min-w-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center shadow-sm ring-1 ring-white ${
        count > 0 ? "bg-red-500 text-white" : "bg-emerald-500 text-white"
      }`}
    >
      {count}
    </span>
  );

  const itemClasses = (active: boolean) =>
    `w-full flex items-center rounded-lg transition-colors text-gray-700 bg-white hover:bg-accent/70 hover:text-accent-foreground ${
      isOpen
        ? "justify-between gap-3 px-3 py-2.5 h-auto min-h-[44px]"
        : "justify-center p-0 h-11 w-11 mx-auto"
    } ${
      active
        ? "bg-accent text-accent-foreground font-semibold ring-1 ring-inset ring-primary/20"
        : ""
    }`;

  return (
    <div className="w-full space-y-3" dir="rtl">
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="icon"
          className="border border-gray-200 bg-white text-primary shadow-sm hover:bg-accent hover:text-accent-foreground rounded-full"
          onClick={onToggle}
          aria-label={isOpen ? "כווץ תפריט" : "הרחב תפריט"}
        >
          {isOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </Button>
      </div>

      {/* Accounting inquiries */}
      <Card className={`card-elevated border-gray-200/70 rounded-xl ${isOpen ? "py-4" : "py-3"}`}>
        {isOpen && (
          <CardHeader className="px-4 pb-1">
            <CardTitle className="text-base font-semibold text-gray-900 text-center">בירורים</CardTitle>
          </CardHeader>
        )}
        <CardContent className={`space-y-2 ${isOpen ? "px-3" : "px-2"}`}>
          <Button
            onClick={() => onViewChange("pending-inquiries")}
            variant="ghost"
            title="בירורי הנהלת חשבונות"
            className={itemClasses(activeView === "pending-inquiries")}
          >
            {isOpen ? (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  <span className="font-medium text-sm truncate">בירורי הנהלת חשבונות</span>
                </div>
                {badge(notificationCounts?.["pending-inquiries"] ?? 0)}
              </>
            ) : (
              <span className="relative flex items-center justify-center">
                <Folder className="w-5 h-5 text-yellow-500" />
                {floatingBadge(notificationCounts?.["pending-inquiries"] ?? 0)}
              </span>
            )}
          </Button>

          <Button
            onClick={onShowYearlyForm}
            variant="ghost"
            title="בירורים כלליים"
            className={itemClasses(false)}
          >
            {isOpen ? (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="font-medium text-sm truncate">בירורים כלליים</span>
                </div>
                {yearlyInquiriesCount !== undefined && badge(yearlyInquiriesCount)}
              </>
            ) : (
              <span className="relative flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
                {yearlyInquiriesCount !== undefined && floatingBadge(yearlyInquiriesCount)}
              </span>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Employer actions */}
      <Card className={`card-elevated border-gray-200/70 rounded-xl ${isOpen ? "py-4" : "py-3"}`}>
        {isOpen && (
          <CardHeader className="px-4 pb-1">
            <CardTitle className="text-base font-semibold text-gray-900 text-center">מעסיקים</CardTitle>
          </CardHeader>
        )}
        <CardContent className={`space-y-2 ${isOpen ? "px-3" : "px-2"}`}>
          {navigationItems.map((item) => {
            const count = notificationCounts?.[item.id as keyof typeof notificationCounts] ?? 0;
            const showBadge = item.id === "vacations" || item.id === "monthly-report";
            const active = activeView === item.id;

            return (
              <Button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                variant="ghost"
                title={item.label}
                className={itemClasses(active)}
              >
                {isOpen ? (
                  <>
                    <div className="flex items-center gap-2 min-w-0">
                      <Image src={item.icon} alt="" width={20} height={20} className="flex-shrink-0" />
                      <span className="font-medium text-sm truncate">{item.label}</span>
                    </div>
                    {showBadge && badge(count)}
                  </>
                ) : (
                  <span className="relative flex items-center justify-center">
                    <Image src={item.icon} alt={item.label} width={22} height={22} />
                    {showBadge && floatingBadge(count)}
                  </span>
                )}
              </Button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
