'use client';

import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import AddEmployee from '@/components/employee/components/AddEmployee';
import EmployeeRecognition from '@/components/employee/components/EmployeeRecognition';
import PaySlip from '@/components/employee/components/PaySlip';
import Vacations from '@/components/employee/components/Vacations';
import EmployersSidebar from '@/components/employee/components/EmployersSidebar';
import { ColumnSettingsType, ViewType, Employee, ApiResponse, LeavingReason, DynamicColumnSettings, InquiryData } from '@/lib/types';
import { fetchEmployeeData, updateColumnSetting } from '@/lib/utils';
import Image from 'next/image';
import MonthlyReport from '@/components/employee/components/MonthlyReport';
import YearlyForm from '@/components/inquiries/components/YearlyForm';
import SupplierTable from '@/components/inquiries/components/SupplierTable';

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

  const loadEmployeeData = async () => {
    if (isLoaded && user?.emailAddresses?.[0]?.emailAddress) {
      setLoading(true);
      try {
        const data = await fetchEmployeeData(user?.emailAddresses?.[0]?.emailAddress);
        console.log('Employee data', data);
        if (data) {
          setApiResponse({ ...data, recordId: data.recordId });
          // setApiResponse({ ...data, recordId: 'recObnrdp6wLl26Pm' });
          setEmployees(data.employees);
          setChangeTime(data.changeTime);
          if (data.columnNames) {
            const newDynamicSettings: DynamicColumnSettings = {};
            data.columnNames.forEach(col => {
              newDynamicSettings[col.columnNameRecordId] = col.isOn ?? false;
            });
            setDynamicColumnSettings(newDynamicSettings);
          }
          if (data.leavingReasons) {
            setLeavingReasons(data.leavingReasons);
          }
        }
      } catch (error) {
        console.error('Failed to load employee data:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadEmployeeData();
  }, [isLoaded, user]);

  useEffect(() => {
    const fetchInquiryData = async () => {
      if (apiResponse?.recordId) {
        setLoading(true);
        try {
          const res = await fetch(`/api/inquiries/data?recordId=${apiResponse.recordId}`);
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
  }, [apiResponse]);

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

  const renderMainContent = () => {
    if (loading) {
      return <div dir="" className="flex items-center justify-center h-64"><div className="text-lg text-gray-600">...טוען נתוני עובדים</div></div>;
    }

    if (showYearlyForm) {
      return <YearlyForm yearlyData={inquiryData?.general} employer={inquiryData?.employer} recordId={apiResponse?.recordId} />;
    }

    if (selectedSupplier) {
      return <SupplierTable supplierId={selectedSupplier} employer={inquiryData?.employer} monthlyData={inquiryData?.monthly} recordId={apiResponse?.recordId} />;
    }

    switch (activeView) {
      case 'monthly-report':
        return <MonthlyReport {...{
          columnSettings, onColumnToggle: toggleColumn, dynamicColumnSettings,
          onDynamicColumnToggle: toggleDynamicColumn, employees, apiResponse, clientRecordId: apiResponse?.recordId || '', onRefetchData: loadEmployeeData
        }} />;
      case 'add-employee':
        return <AddEmployee recordId={apiResponse?.recordId || ''} changeTime={changeTime} />;
      case 'employee-recognition':
        return <EmployeeRecognition employees={employees} leavingReasons={leavingReasons} is161Must={apiResponse?.is161Must} changeTime={changeTime} />;
      case 'pay-slip':
        return <PaySlip recordId={apiResponse?.recordId} employees={employees} />;
      case 'vacations':
        return <Vacations recordId={apiResponse?.recordId || ''} link101={apiResponse?.link101 || ''} />;
      default:
        return <MonthlyReport {...{ columnSettings, onColumnToggle: toggleColumn, dynamicColumnSettings, onDynamicColumnToggle: toggleDynamicColumn, employees, apiResponse, clientRecordId: apiResponse?.recordId || '', onRefetchData: loadEmployeeData }} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="w-full p-4 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="logo-container">
            <Image src="https://i.imgur.com/J6mXT1Z.jpeg" alt="לוגו" width={200} height={200} />
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
          <div className="flex h-full">
            <div className="flex-1">
              <div className="flex justify-end items-center mb-2">
                <span className="text-right" dir="rtl" style={{ fontWeight: 'bold' }}>
                  תקופת דיווח: {changeTime}
                </span>
              </div>
              <div className="flex-1 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
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