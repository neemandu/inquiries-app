'use client';

import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import AddEmployee from '@/components/employee/components/AddEmployee';
import EmployeeRecognition from '@/components/employee/components/EmployeeRecognition';
import PaySlip from '@/components/employee/components/PaySlip';
import Vacations from '@/components/employee/components/Vacations';
import EmployersSidebar from '@/components/employee/components/EmployersSidebar';
import { ColumnSettingsType, ViewType, Employee, ApiResponse, LeavingReason, DynamicColumnSettings, InquiryData, Period } from '@/lib/types';
import { fetchMonthlyEmployeesData, updateColumnSetting } from '@/lib/utils';
import Image from 'next/image';
import MonthlyReport from '@/components/employee/components/MonthlyReport';
import YearlyForm from '@/components/inquiries/components/YearlyForm';
import AdminDropdown from '@/components/employee/components/AdminDropdown';
import PeriodDropdown from '@/components/employee/components/PeriodDropdown';
import SupplierTable from '@/components/inquiries/components/SupplierTable';
import DocumentUpload from '@/components/employee/components/DocumentUpload';

export default function EmployeesPage() {
  const { user, isLoaded } = useUser();
  const [activeView, setActiveView] = useState<ViewType | null>(null);
  const [columnSettings, setColumnSettings] = useState<ColumnSettingsType>({
    travel: true,
    competition: true,
    ignoreFiles: false,
    accounting: false,
    salary: true,
    other: true
  });
  const [dynamicColumnSettings, setDynamicColumnSettings] = useState<DynamicColumnSettings>({});
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [leavingReasons, setLeavingReasons] = useState<LeavingReason[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>(['הכל']);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>('הכל');
  const [showYearlyForm, setShowYearlyForm] = useState<boolean>(false);
  const [inquiryData, setInquiryData] = useState<InquiryData | null>(null);
  const [changeTime, setChangeTime] = useState<string>('');
  const [employeerName, setEmployeerName] = useState<string>('');
  const [selectedEmployerEmail, setSelectedEmployerEmail] = useState<string | null>(null);
  const [selectedEmployerRecordId, setSelectedEmployerRecordId] = useState<string | null>(null);
  const [selectedEmployerName, setSelectedEmployerName] = useState<string>('');
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [notificationCounts, setNotificationCounts] = useState<{
    'monthly-report'?: number;
    'vacations'?: number;
  }>({});

  const loadEmployeeData = useCallback(async () => {
    if (isLoaded && user?.emailAddresses?.[0]?.emailAddress) {
      setLoading(true);
      try {
        // Check if user is admin (@cpateam.co.il or neemandu@gmail.com)
        const userEmail = user.emailAddresses[0].emailAddress;
        const isAdmin = userEmail.endsWith('@cpateam.co.il') || userEmail === 'neemandu@gmail.com';
        
        // For admin users, use selected employer email if available
        // For regular users, use their email
        const identifier = isAdmin && selectedEmployerEmail ? selectedEmployerEmail : user.emailAddresses[0].emailAddress;
        
        const data = await fetchMonthlyEmployeesData(identifier, selectedPeriodId || undefined);
        console.log('Employee data for period:', selectedPeriodId, data);
        if (data) {
          // Create a compatible ApiResponse for backward compatibility
          const compatibleApiResponse: ApiResponse = {
            recordId: data.recordId,
            changeTime: data.changeTime,
            is161Must: data.is161Must,
            employees: [], // Will be populated below
            columnNames: data.columnNames.map(col => ({
              columnNameRecordId: col.columnNameRecordId,
              columnName: col.columnName,
              isOn: col.isOn,
              recordId: col.recordId || ''
            })),
            leavingReasons: data.leavingReasons,
            link101: data.link101
          };

          // Use employees directly from the response
          const employees: Employee[] = data.employees;

          compatibleApiResponse.employees = employees;
          setApiResponse(compatibleApiResponse);
          setEmployees(employees);
          setChangeTime(data.changeTime);
          console.log('Updated apiResponse with new data for period:', selectedPeriodId);
          
          if (data.columnNames) {
            const newDynamicSettings: DynamicColumnSettings = {};
            data.columnNames.forEach((col) => {
              newDynamicSettings[col.columnNameRecordId] = col.isOn ?? false;
            });
            setDynamicColumnSettings(newDynamicSettings);
          }
          if (data.leavingReasons) {
            setLeavingReasons(data.leavingReasons);
          }
          if (data.periods) {
            setPeriods(data.periods);
          }
        }
      } catch (error) {
        console.error('Failed to load employee data:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [isLoaded, user, selectedEmployerEmail, selectedPeriodId]);

  useEffect(() => {
    loadEmployeeData();
  }, [loadEmployeeData]);

  useEffect(() => {
    const fetchInquiryData = async () => {
      // For admin users, use selected employer record ID if available, otherwise use apiResponse recordId
      const userEmail = user?.emailAddresses?.[0]?.emailAddress;
      const isAdmin = userEmail?.endsWith('@cpateam.co.il') || userEmail === 'neemandu@gmail.com';
      const recordIdToUse = isAdmin && selectedEmployerRecordId ? selectedEmployerRecordId : apiResponse?.recordId;
      
      if (recordIdToUse) {
        setLoading(true);
        try {
          const res = await fetch(`/api/inquiries/data?recordId=${recordIdToUse}`);
          if (res.ok) {
            const data: InquiryData = await res.json();
            console.log('Inquiry data', data);
            setInquiryData(data);
            if (data?.monthly) {
              const uniqueSuppliers = ['הכל', ...new Set(data.monthly.map((item) => item.supplier))];
              setSuppliers(uniqueSuppliers as string[]);
            }
            setEmployeerName(data.employer);
          } else {
            console.error('Failed to fetch inquiry data');
          }
        } catch (error) {
          console.error('Error fetching inquiry data:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchInquiryData();
  }, [apiResponse, selectedEmployerRecordId, user]);

  const toggleDynamicColumn = async (columnNameRecordId: string) => {
    if (!apiResponse) return;
    const newValue = !dynamicColumnSettings[columnNameRecordId];
    setDynamicColumnSettings(prev => ({ ...prev, [columnNameRecordId]: newValue }));
    // try {
    //   const updatedColumnNames = apiResponse.columnNames.map(col =>
    //     col.columnNameRecordId === columnNameRecordId ? { ...col, isOn: newValue } : col
    //   );
    //   const updatedApiResponse = { ...apiResponse, columnNames: updatedColumnNames };
    //   const success = await updateColumnSetting(apiResponse.recordId, updatedApiResponse);
    //   if (!success) {
    //     // Optionally show a toast here, e.g. toast.error('Failed to update column setting');
    //     setDynamicColumnSettings(prev => ({ ...prev, [columnNameRecordId]: !newValue }));
    //     return;
    //   }
    //   setApiResponse(updatedApiResponse);
    // } catch (error) {
    //   console.error('Failed to update column setting:', error);
    //   setDynamicColumnSettings(prev => ({ ...prev, [columnNameRecordId]: !newValue }));
    //   // Optionally show a toast here too
    // }
  };

  const toggleColumn = async (column: keyof ColumnSettingsType) => {
    if (!apiResponse) {
      console.warn('No API response available for column update');
      return;
    }

    const newValue = !columnSettings[column];

    setColumnSettings(prev => ({
      ...prev,
      [column]: newValue
    }));

    try {
      console.log(`Updating column ${column} to ${newValue}`);

      const updatedColumnNames = apiResponse.columnNames.map(col => {
        if (!col.columnName || typeof col.columnName !== 'string') {
          return col;
        }

        let shouldUpdate = false;
        if (column === 'travel' && (col.columnName.includes('traveling') || col.columnName.includes('travel'))) {
          shouldUpdate = true;
        } else if (column === 'competition' && col.columnName.includes('competition')) {
          shouldUpdate = true;
        } else if (column === 'salary' && col.columnName.includes('salary')) {
          shouldUpdate = true;
        } else if (column === 'accounting' && col.columnName.includes('accounting')) {
          shouldUpdate = true;
        } else if (column === 'ignoreFiles' && (col.columnName.includes('files') || col.columnName.includes('ignore'))) {
          shouldUpdate = true;
        } else if (column === 'other' && !col.columnName.includes('traveling') && !col.columnName.includes('travel') &&
          !col.columnName.includes('competition') && !col.columnName.includes('salary') &&
          !col.columnName.includes('accounting') && !col.columnName.includes('files') && !col.columnName.includes('ignore')) {
          shouldUpdate = true;
        }

        return shouldUpdate ? { ...col, isOn: newValue } : col;
      });

      const updatedApiResponse: ApiResponse = {
        ...apiResponse,
        columnNames: updatedColumnNames
      };

      const success = await updateColumnSetting(apiResponse.recordId, updatedApiResponse);
      if (!success) {
        throw new Error('Failed to update column setting');
      }

      setApiResponse(updatedApiResponse);
      loadEmployeeData();
      window.location.reload();

      console.log(`Column update successful: column=${column}, newValue=${newValue}`);
    } catch (error) {
      console.error('Failed to update column setting:', error);
      setColumnSettings(prev => ({
        ...prev,
        [column]: !newValue
      }));
    }
  };

  const handleSupplierSelect = (supplier: string) => {
    setSelectedSupplier(supplier);
    setShowYearlyForm(false);
    setActiveView(null);
  };

  const handleShowYearlyForm = () => {
    setShowYearlyForm(true);
    setSelectedSupplier(null);
    setActiveView(null);
  };

  const handlePeriodSelect = (periodId: string) => {
    setSelectedPeriodId(periodId);
    // Reset any existing view state to ensure fresh data display
    setActiveView('monthly-report');
  };

  // Calculate missing items count for monthly-report
  const calculateMonthlyReportMissing = useCallback(async () => {
    if (!apiResponse?.recordId) return 0;
    
    try {
      // Fetch missing docs from the same API used by Vacations component
      const response = await fetch(`/api/missing-docs?employerRecordId=${apiResponse.recordId}`);
      if (!response.ok) return 0;
      
      const missingDocs = await response.json();
      let missingCount = missingDocs?.length || 0;
      
      // Add count of missing required fields from employees data
      if (apiResponse.employees) {
        for (const employee of apiResponse.employees) {
          for (const column of employee.columns) {
            if (column.isMust) {
              const hasValue = column.oldValue !== undefined && 
                              column.oldValue !== null && 
                              column.oldValue !== '';
              if (!hasValue) {
                missingCount++;
              }
            }
          }
        }
      }
      
      return missingCount;
    } catch (error) {
      console.error('Error calculating monthly report missing items:', error);
      return 0;
    }
  }, [apiResponse]);

  // Calculate vacations count (missing docs count)
  const calculateVacationsCount = useCallback(async () => {
    if (!apiResponse?.recordId) return 0;
    
    try {
      const response = await fetch(`/api/missing-docs?employerRecordId=${apiResponse.recordId}`);
      if (!response.ok) return 0;
      
      const data = await response.json();
      return data?.length || 0;
    } catch (error) {
      console.error('Error calculating vacations count:', error);
      return 0;
    }
  }, [apiResponse]);

  // Update notification counts when API response changes
  useEffect(() => {
    const updateNotificationCounts = async () => {
      if (!apiResponse?.recordId) {
        setNotificationCounts({});
        return;
      }

      const [monthlyReportCount, vacationsCount] = await Promise.all([
        calculateMonthlyReportMissing(),
        calculateVacationsCount()
      ]);

      setNotificationCounts({
        'monthly-report': monthlyReportCount,
        'vacations': vacationsCount
      });
    };

    updateNotificationCounts();
  }, [apiResponse, calculateMonthlyReportMissing, calculateVacationsCount]);

  const renderMainContent = () => {
    if (loading) {
      return <div dir="rtl" className="flex items-center justify-center h-64"><div className="text-lg text-gray-600">טוען נתונים...</div></div>;
    }

    // For admin users, use selected employer record ID if available, otherwise use apiResponse recordId
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;
    const isAdmin = userEmail?.endsWith('@cpateam.co.il') || userEmail === 'neemandu@gmail.com';
    const recordIdToUse = isAdmin && selectedEmployerRecordId ? selectedEmployerRecordId : apiResponse?.recordId;
    
    // Get the selected period status
    const selectedPeriodStatus = selectedPeriodId 
      ? periods.find(p => p.recordId === selectedPeriodId)?.status 
      : undefined;

    if (showYearlyForm) {
      return <YearlyForm yearlyData={inquiryData?.general} employer={inquiryData?.employer} recordId={recordIdToUse} />;
    }

    if (selectedSupplier) {
      return <SupplierTable supplierId={selectedSupplier} employer={inquiryData?.employer} monthlyData={inquiryData?.monthly} recordId={recordIdToUse} />;
    }

    switch (activeView) {
      case 'monthly-report':
        return <MonthlyReport key={`monthly-report-${selectedPeriodId || 'default'}`} {...{
          columnSettings, onColumnToggle: toggleColumn, dynamicColumnSettings,
          onDynamicColumnToggle: toggleDynamicColumn, apiResponse, clientRecordId: recordIdToUse || '', onRefetchData: loadEmployeeData, selectedPeriodStatus
        }} />;
      case 'add-employee':
        return <AddEmployee recordId={recordIdToUse || ''} changeTime={changeTime} link101={apiResponse?.link101 || ''} />;
      case 'employee-recognition':
        return <EmployeeRecognition employees={employees} leavingReasons={leavingReasons} is161Must={apiResponse?.is161Must}/>;
      case 'pay-slip':
        return <PaySlip recordId={recordIdToUse} employees={employees} />;
      case 'vacations':
        return <Vacations recordId={recordIdToUse || ''} />;
      case 'document-upload':
        return <DocumentUpload employees={employees} recordId={recordIdToUse || ''} />;
      default:
        return <MonthlyReport key={`monthly-report-${selectedPeriodId || 'default'}`} {...{ columnSettings, onColumnToggle: toggleColumn, dynamicColumnSettings, onDynamicColumnToggle: toggleDynamicColumn, apiResponse, clientRecordId: recordIdToUse || '', onRefetchData: loadEmployeeData, selectedPeriodStatus }} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="w-full p-4 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="logo-container flex items-center gap-3">
            <Image
              src="/big_logo.jpg"
              alt="לוגו"
              width={200}
              height={200}
            />
            <span className="text-2xl font-bold" dir="rtl">Connect</span>
          </div>
          <div className="flex items-center gap-4">
            {isLoaded && (
              <span className="text-right" dir="rtl" style={{ fontWeight: 'bold' }}>{employeerName}</span>
            )}
            <SignedIn>
              <UserButton appearance={{
                elements: {
                  userButtonPopoverActionButton__manageAccount: {
                    display: 'none'
                  }
                }
              }} />
            </SignedIn>
          </div>
        </div>
      </header>

      <main className="mx-auto p-6 w-full">
        <SignedIn>
          {/* Admin dropdown for @cpateam.co.il users and neemandu@gmail.com */}
          {isLoaded && user?.emailAddresses?.[0]?.emailAddress && (
            (user.emailAddresses[0].emailAddress.endsWith('@cpateam.co.il') || 
             user.emailAddresses[0].emailAddress === 'neemandu@gmail.com')
          ) && (
            <div className="flex flex-col items-end gap-2">
              <AdminDropdown
                onEmployerSelect={(employerEmail, employerRecordId, employerName) => {
                  setSelectedEmployerEmail(employerEmail);
                  setSelectedEmployerRecordId(employerRecordId);
                  setSelectedEmployerName(employerName);
                }}
                selectedEmployerName={selectedEmployerName}
              />
              {periods.length > 0 && (
                <PeriodDropdown
                  periods={periods}
                  selectedPeriodId={selectedPeriodId}
                  onPeriodSelect={handlePeriodSelect}
                />
              )}
            </div>
          )}
          
          <div className="flex h-full">
            <div className="flex-1">
              {/* Regular period display for non-admin users */}
              {isLoaded && user?.emailAddresses?.[0]?.emailAddress && 
               !(user.emailAddresses[0].emailAddress.endsWith('@cpateam.co.il') || 
                 user.emailAddresses[0].emailAddress === 'neemandu@gmail.com') && 
               (activeView) && (
                <div className="flex justify-center items-center mb-4">
                  <span className="text-center text-xl font-bold text-gray-800" dir="rtl">
                    תקופת דיווח: <span className="text-blue-600">{changeTime}</span>
                  </span>
                </div>
              )}
              <div className="flex-1 bg-white rounded-lg border border-gray-200 p-6 shadow-sm max-w-[calc(100vw-320px)]">
                {renderMainContent()}
              </div>
            </div>
            <div className="w-[220px] mx-6">
              <EmployersSidebar
                activeView={loading ? undefined : activeView}
                onViewChange={(view) => {
                  setActiveView(view);
                  setSelectedSupplier(null);
                  setShowYearlyForm(false);
                }}
                suppliers={suppliers}
                selectedSupplier={loading ? null : selectedSupplier}
                onSupplierSelect={handleSupplierSelect}
                onShowYearlyForm={handleShowYearlyForm}
                notificationCounts={notificationCounts}
                yearlyInquiriesCount={inquiryData?.general?.length || 0}
              />
            </div>
          </div>
        </SignedIn>
        <SignedOut>
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">אנא התחבר כדי לצפות בדף זה</h2>
            <Link href="/sign-in" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">התחבר</Link>
          </div>
        </SignedOut>
      </main>
    </div>
  );
} 
