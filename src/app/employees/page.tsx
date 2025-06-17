'use client';

import { SignedIn, SignedOut, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import MonthlyReport from './components/MonthlyReport';
import AddEmployee from './components/AddEmployee';
import EmployeeRecognition from './components/EmployeeRecognition';
import PaySlip from './components/PaySlip';
import Vacations from './components/Vacations';
import EmployersSidebar from './components/EmployersSidebar';
import { ColumnSettingsType, ViewType, Employee, ApiResponse } from './types';
import { fetchEmployeeData, updateColumnSetting } from '@/lib/utils';
import Image from 'next/image';

export default function EmployeesPage() {
  const { user, isLoaded } = useUser();
  const [activeView, setActiveView] = useState<ViewType>('monthly-report'); 
  const [columnSettings, setColumnSettings] = useState<ColumnSettingsType>({
    travel: true,
    competition: true,
    ignoreFiles: false,
    accounting: false,
    salary: true,
    other: true
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);

  // Fetch employee data when user is loaded
  useEffect(() => {
    const loadEmployeeData = async () => {
      if (isLoaded && user?.emailAddresses?.[0]?.emailAddress) {
        setLoading(true);
        // const email = user.emailAddresses[0].emailAddress;
        
        try {
          // const data = await fetchEmployeeData(email);
          const data = await fetchEmployeeData('neemandu@gmail.com');
          console.log(data);

          if (data) {
            setApiResponse(data);
            setEmployees(data.employees);
            
            // Update column settings based on API response
            if (data.columnNames) {
              const newColumnSettings: ColumnSettingsType = {
                travel: true,
                competition: true,
                ignoreFiles: false,
                accounting: false,
                salary: true,
                other: true
              };
              
              // Map API column settings to our local settings
              data.columnNames.forEach(col => {
                // Check if col.column exists and is a string before calling includes
                if (!col.column || typeof col.column !== 'string') {
                  return; // Skip this iteration if column is undefined/null/not a string
                }
                
                if (col.column.includes('traveling') || col.column.includes('travel')) {
                  newColumnSettings.travel = col.isOn ?? true;
                } else if (col.column.includes('competition')) {
                  newColumnSettings.competition = col.isOn ?? true;
                } else if (col.column.includes('salary')) {
                  newColumnSettings.salary = col.isOn ?? true;
                } else if (col.column.includes('accounting')) {
                  newColumnSettings.accounting = col.isOn ?? false;
                } else if (col.column.includes('files') || col.column.includes('ignore')) {
                  newColumnSettings.ignoreFiles = col.isOn ?? false;
                } else {
                  newColumnSettings.other = col.isOn ?? true;
                }
              });
              
              setColumnSettings(newColumnSettings);
            }
          }
        } catch (error) {
          console.error('Failed to load employee data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadEmployeeData();
  }, [isLoaded, user]);

  const toggleColumn = async (column: keyof ColumnSettingsType) => {
    if (!apiResponse) {
      console.warn('No API response available for column update');
      return;
    }

    const newValue = !columnSettings[column];
    
    // Update local state immediately for better UX
    setColumnSettings(prev => ({
      ...prev,
      [column]: newValue
    }));
    
    // Make API call to update column setting in database
    try {
      console.log(`Updating column ${column} to ${newValue}`);
      
      // Create updated API response with the new column setting
      const updatedColumnNames = apiResponse.columnNames.map(col => {
        // Map local column types to API column names
        let shouldUpdate = false;
        
        // Check if col.column exists and is a string before calling includes
        if (!col.column || typeof col.column !== 'string') {
          return col; // Return the column unchanged if column is undefined/null/not a string
        }
        
        if (column === 'travel' && (col.column.includes('traveling') || col.column.includes('travel'))) {
          shouldUpdate = true;
        } else if (column === 'competition' && col.column.includes('competition')) {
          shouldUpdate = true;
        } else if (column === 'salary' && col.column.includes('salary')) {
          shouldUpdate = true;
        } else if (column === 'accounting' && col.column.includes('accounting')) {
          shouldUpdate = true;
        } else if (column === 'ignoreFiles' && (col.column.includes('files') || col.column.includes('ignore'))) {
          shouldUpdate = true;
        } else if (column === 'other' && !col.column.includes('traveling') && !col.column.includes('travel') && 
                   !col.column.includes('competition') && !col.column.includes('salary') && 
                   !col.column.includes('accounting') && !col.column.includes('files') && !col.column.includes('ignore')) {
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
      
      // Update local API response state with the new data
      setApiResponse(updatedApiResponse);
      
      console.log(`Column update successful: column=${column}, newValue=${newValue}`);
    } catch (error) {
      console.error('Failed to update column setting:', error);
      // Revert local state on error
      setColumnSettings(prev => ({
        ...prev,
        [column]: !newValue
      }));
    }
  };

  // Render different content based on active view
  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">טוען נתוני עובדים...</div>
        </div>
      );
    }

    switch (activeView) {
      case 'monthly-report':
        return (
          <MonthlyReport 
            columnSettings={columnSettings} 
            onColumnToggle={toggleColumn}
            employees={employees}
            apiResponse={apiResponse}
          />
        );
      case 'add-employee':
        return <AddEmployee recordId={apiResponse?.recordId || ''} />;
      case 'employee-recognition':
        return <EmployeeRecognition />;
      case 'pay-slip':
        return <PaySlip recordId={apiResponse?.recordId} employees={employees} />;
      case 'vacations':
        return <Vacations />;
      default:
        return (
          <MonthlyReport 
            columnSettings={columnSettings} 
            onColumnToggle={toggleColumn}
            employees={employees}
            apiResponse={apiResponse}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="w-full p-4 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            <Image src="/logo.jpg" alt="logo" width={50} height={50} />
          </Link>
          <div className="flex items-center gap-4">
            <SignedIn>
              <div className="text-sm text-gray-600">
                {user?.emailAddresses?.[0]?.emailAddress}
              </div>
              <Link 
                href="/dashboard"
                className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Dashboard
              </Link>
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <SignedIn>
          <div className="flex gap-6 h-full">
            {/* Main Content Section */}
            <div className="flex-1 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              {renderMainContent()}
            </div>

            {/* Right Sidebar */}
            <EmployersSidebar activeView={activeView} onViewChange={setActiveView} />
          </div>
        </SignedIn>

        <SignedOut>
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              אנא התחבר כדי לצפות בדף זה
            </h2>
            <Link 
              href="/sign-in"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              התחבר
            </Link>
          </div>
        </SignedOut>
      </main>
    </div>
  );
} 