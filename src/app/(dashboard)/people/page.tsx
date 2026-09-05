'use client'

import React, { useState, useEffect } from 'react';
import { 
  Users, Home, Calendar, Clock, Sparkles, CheckSquare, 
  FileText, User, ChevronRight, RefreshCw, AlertTriangle
} from 'lucide-react';
import { PeopleHeader, DEMO_PERSONAS, Persona } from '@/components/people/PeopleHeader';
import { EmployeeDashboardView } from '@/components/people/EmployeeDashboardView';
import { SupervisorDashboardView } from '@/components/people/SupervisorDashboardView';
import { HrDashboardView } from '@/components/people/HrDashboardView';
import { ExecutiveDashboardView } from '@/components/people/ExecutiveDashboardView';
import { EmployeeDirectory } from '@/components/people/EmployeeDirectory';
import { LeaveManagementView } from '@/components/people/LeaveManagementView';
import { ApprovalsInboxView } from '@/components/people/ApprovalsInboxView';
import { TimeAttendanceView } from '@/components/people/TimeAttendanceView';
import { PolicyMasterView } from '@/components/people/PolicyMasterView';
import { ReportsView } from '@/components/people/ReportsView';
import { OtJobCostingView } from '@/components/people/OtJobCostingView';
import { CasesManagementView } from '@/components/people/CasesManagementView';
import { AiWorkforceRegistryView } from '@/components/people/AiWorkforceRegistryView';
import { Language, TRANSLATIONS } from '@/lib/peopleTranslations';

export default function PeoplePage() {
  const [currentPersona, setCurrentPersona] = useState<Persona>(DEMO_PERSONAS[0]); // Default HR Manager
  const [lang, setLang] = useState<Language>('th');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load Dashboard data for current persona
  const fetchDashboard = async () => {
    try {
      setLoading(true);
      // Fetch employee id for persona
      const empRes = await fetch(`/api/people/employees?search=${currentPersona.code}&limit=1`);
      const empJson = await empRes.json();
      const empId = empJson.data?.[0]?.id || '';

      const res = await fetch(`/api/people/dashboard?role=${currentPersona.role}&employee_id=${empId}&date=2026-09-05`);
      const json = await res.json();
      if (json.success) {
        setDashboardData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [currentPersona]);

  const t = TRANSLATIONS[lang];

  return (
    <div className="min-h-screen pb-20 md:pb-10 w-full max-w-7xl mx-auto px-2 sm:px-4">
      {/* 1. Header with Persona Switcher, Multi-language & Navigation Tabs */}
      <PeopleHeader
        currentPersona={currentPersona}
        onSelectPersona={(p) => {
          setCurrentPersona(p);
          // If switching to Employee, switch to dashboard or leave
          if (p.role === 'Employee' && (activeTab === 'policies' || activeTab === 'exceptions')) {
            setActiveTab('dashboard');
          }
        }}
        lang={lang}
        onSelectLang={setLang}
        notificationCount={currentPersona.role === 'Supervisor' ? 2 : 1}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onRequestLeaveClick={() => {
          setActiveTab('leave');
          setShowRequestModal(true);
        }}
      />

      {/* 2. Main Content View Area */}
      <main className="transition-all duration-200">
        {activeTab === 'dashboard' && (
          <>
            {/* Dynamic Dashboard based on User Role */}
            {currentPersona.role === 'Employee' ? (
              <EmployeeDashboardView
                currentPersona={currentPersona}
                employeeData={dashboardData?.employeeData}
                lang={lang}
                onRequestLeave={() => {
                  setActiveTab('leave');
                  setShowRequestModal(true);
                }}
                onNavigateTab={setActiveTab}
              />
            ) : currentPersona.role === 'Supervisor' || currentPersona.role === 'Manager' ? (
              <SupervisorDashboardView
                currentPersona={currentPersona}
                supervisorData={dashboardData?.supervisorData}
                pendingApprovalsCount={dashboardData?.kpi?.pendingApprovalsCount || 2}
                lang={lang}
                onNavigateTab={setActiveTab}
              />
            ) : currentPersona.role === 'Executive' ? (
              <ExecutiveDashboardView
                currentPersona={currentPersona}
                kpi={dashboardData?.kpi}
                departments={dashboardData?.departments}
                factoryReadiness={dashboardData?.factoryReadiness}
                lang={lang}
              />
            ) : (
              /* HR Officer, HR Manager, System Admin */
              <HrDashboardView
                currentPersona={currentPersona}
                kpi={dashboardData?.kpi}
                departments={dashboardData?.departments}
                factoryReadiness={dashboardData?.factoryReadiness}
                alerts={dashboardData?.alerts}
                lang={lang}
                onNavigateTab={setActiveTab}
              />
            )}
          </>
        )}

        {activeTab === 'employees' && (
          <EmployeeDirectory currentPersona={currentPersona} />
        )}

        {activeTab === 'leave' && (
          <LeaveManagementView
            currentPersona={currentPersona}
            onRequestLeave={() => setShowRequestModal(true)}
            showRequestModal={showRequestModal}
            setShowRequestModal={setShowRequestModal}
          />
        )}

        {activeTab === 'ot_costing' && (
          <OtJobCostingView currentPersona={currentPersona} />
        )}

        {activeTab === 'approvals' && (
          <ApprovalsInboxView currentPersona={currentPersona} />
        )}

        {activeTab === 'cases' && (
          <CasesManagementView currentPersona={currentPersona} />
        )}

        {activeTab === 'attendance' && (
          <TimeAttendanceView currentPersona={currentPersona} initialTab="daily" />
        )}

        {activeTab === 'exceptions' && (
          <TimeAttendanceView currentPersona={currentPersona} initialTab="exceptions" />
        )}

        {activeTab === 'ai_workforce' && (
          <AiWorkforceRegistryView currentPersona={currentPersona} />
        )}

        {activeTab === 'policies' && (
          <PolicyMasterView currentPersona={currentPersona} />
        )}

        {activeTab === 'reports' && (
          <ReportsView />
        )}
      </main>

      {/* 3. Mobile Bottom Navigation Bar (Section 44, 77) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 p-1 text-[10px] font-bold ${
            activeTab === 'dashboard' ? 'text-amber-600' : 'text-slate-500'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>{t.navHome}</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex flex-col items-center gap-0.5 p-1 text-[10px] font-bold ${
            activeTab === 'attendance' ? 'text-amber-600' : 'text-slate-500'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span>{t.navAttendance}</span>
        </button>

        {/* Quick Leave Floating Button */}
        <button
          onClick={() => {
            setActiveTab('leave');
            setShowRequestModal(true);
          }}
          className="-mt-5 w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/40 active:scale-95"
          title="ยื่นคำขอลาทันที"
        >
          <Sparkles className="w-5 h-5" />
        </button>

        <button
          onClick={() => setActiveTab('leave')}
          className={`flex flex-col items-center gap-0.5 p-1 text-[10px] font-bold ${
            activeTab === 'leave' ? 'text-amber-600' : 'text-slate-500'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span>{t.navLeave}</span>
        </button>

        <button
          onClick={() => setActiveTab(currentPersona.role.includes('Supervisor') || currentPersona.role.includes('Manager') ? 'approvals' : 'employees')}
          className={`flex flex-col items-center gap-0.5 p-1 text-[10px] font-bold ${
            activeTab === 'approvals' || activeTab === 'employees' ? 'text-amber-600' : 'text-slate-500'
          }`}
        >
          <Users className="w-5 h-5" />
          <span>{currentPersona.role.includes('Supervisor') || currentPersona.role.includes('Manager') ? 'อนุมัติ' : 'พนักงาน'}</span>
        </button>
      </div>
    </div>
  );
}
