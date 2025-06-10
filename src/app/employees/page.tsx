'use client';

import { SignedIn, SignedOut } from '@clerk/nextjs';
import Link from 'next/link';
import { useState } from 'react';
import MonthlyReport from './components/MonthlyReport';
import AddEmployee from './components/AddEmployee';
import EmployeeRecognition from './components/EmployeeRecognition';
import PaySlip from './components/PaySlip';
import Vacations from './components/Vacations';
import EmployersSidebar from './components/EmployersSidebar';
import { ColumnSettingsType, ViewType } from './types';
import Image from 'next/image';

export default function EmployeesPage() {
  const [activeView, setActiveView] = useState<ViewType>('monthly-report'); // Default to monthly report
  const [columnSettings, setColumnSettings] = useState<ColumnSettingsType>({
    travel: true,
    competition: true,
    ignoreFiles: false,
    accounting: false,
    salary: true,
    other: true
  });

  const toggleColumn = (column: keyof ColumnSettingsType) => {
    setColumnSettings(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  // Render different content based on active view
  const renderMainContent = () => {
    switch (activeView) {
      case 'monthly-report':
        return <MonthlyReport columnSettings={columnSettings} onColumnToggle={toggleColumn} />;
      case 'add-employee':
        return <AddEmployee />;
      case 'employee-recognition':
        return <EmployeeRecognition />;
      case 'pay-slip':
        return <PaySlip />;
      case 'vacations':
        return <Vacations />;
      default:
        return <MonthlyReport columnSettings={columnSettings} onColumnToggle={toggleColumn} />;
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