import React, { useState, useEffect } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Countries } from './pages/Countries';
import { Centers } from './pages/Centers';
import { UsersPage } from './pages/Users';
import { CandidatesPage } from './pages/Candidates';
import { SchedulesPage } from './pages/Schedules';
import { BatchesPage } from './pages/Batches';
import { AssessmentsPage } from './pages/Assessments';
import { AuditLogsPage } from './pages/AuditLogs';
import { SettingsPage } from './pages/Settings';
import { ResultsPage } from './pages/Results';
import { PracticalTasksPage } from './pages/PracticalTasks';
import { LotteryManagementPage } from './pages/LotteryManagement';
import { MonitoringPage } from './pages/Monitoring';
import { ReportsPage } from './pages/Reports';
import { IDCardManagementPage } from './pages/IDCardManagement';
import { ConfigurationPage } from './pages/Configuration';
import { ComplaintsPage } from './pages/Complaints';
import { UserProfilePage } from './pages/UserProfilePage';
import { SystemNotificationsPage } from './pages/SystemNotificationsPage';
import { EvaluationSheetRegister } from './pages/EvaluationSheetRegister';

// Phase 03 Center Admin Pages
import { ReservationManagementPage } from './pages/ReservationManagement';
import { CandidateEnrollmentPage } from './pages/CandidateEnrollment';
import { CandidatePhotosPage } from './pages/CandidatePhotos';
import { AssessorsPage } from './pages/AssessorsPage';
import { SupportStaffPage } from './pages/SupportStaffPage';
import { AssessmentMonitoringPage } from './pages/AssessmentMonitoringPage';
import { PhotoVerificationQueuePage } from './pages/PhotoVerificationQueuePage';

// Phase 04 Assessor Pages
import { AssessorDashboard } from './pages/assessor/AssessorDashboard';
import { AssessorTodayAssessments } from './pages/assessor/AssessorTodayAssessments';
import { AssessorAssignedCandidates } from './pages/assessor/AssessorAssignedCandidates';
import { AssessorCandidateVerification } from './pages/assessor/AssessorCandidateVerification';
import { AssessorPracticalTask } from './pages/assessor/AssessorPracticalTask';
import { AssessorPracticalWorkspace } from './pages/assessor/AssessorPracticalWorkspace';
import { AssessorEvidencePage } from './pages/assessor/AssessorEvidencePage';
import { AssessorEvaluationPage } from './pages/assessor/AssessorEvaluationPage';
import { AssessorAssessmentHistory } from './pages/assessor/AssessorAssessmentHistory';
import { AssessorNotifications } from './pages/assessor/AssessorNotifications';
import { AssessorAIHelp } from './pages/assessor/AssessorAIHelp';
import { AssessorProfile } from './pages/assessor/AssessorProfile';

// Phase 06 Support Staff Pages
import { SupportStaffNotifications } from './pages/support/SupportStaffNotifications';
import { SupportStaffProfile } from './pages/support/SupportStaffProfile';

const RouterContent: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  const getInitialPath = () => {
    const rawPath = window.location.pathname;
    if (!rawPath || rawPath === '/') {
      return '/dashboard';
    }
    return rawPath;
  };

  const [currentPath, setCurrentPath] = useState<string>(getInitialPath);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/dashboard');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (newPath: string) => {
    // Strip query parameters for routing component match if needed, but preserve state
    window.history.pushState({}, '', newPath);
    setCurrentPath(newPath.split('?')[0]);
    window.dispatchEvent(new Event('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If not authenticated, always show Login view
  if (!isAuthenticated || currentPath === '/login') {
    return <Login onNavigate={navigate} />;
  }

  const renderContent = () => {
    switch (currentPath) {
      case '/dashboard':
      case '/support/dashboard':
        if (user?.role === 'ASSESSOR') {
          return (
            <ProtectedRoute allowedRoles={['ASSESSOR', 'SUPER_ADMIN']} onNavigate={navigate}>
              <AssessorDashboard onNavigate={navigate} />
            </ProtectedRoute>
          );
        }
        return <Dashboard onNavigate={navigate} />;

      case '/countries':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']} onNavigate={navigate}>
            <Countries />
          </ProtectedRoute>
        );

      case '/centers':
        return (
          <ProtectedRoute allowedRoles={['GLOBAL_ADMIN', 'SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'COUNTRY_ADMIN', 'CENTER_ADMIN']} onNavigate={navigate}>
            <Centers key={currentPath + (window.location.search || '')} onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/users':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN']} onNavigate={navigate}>
            <UsersPage onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/candidates':
      case '/support/candidates':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN', 'SUPPORT_STAFF']} onNavigate={navigate}>
            <CandidatesPage onNavigate={navigate} mode="entry" />
          </ProtectedRoute>
        );

      case '/enrollment-pending':
      case '/support/enrollment-pending':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN', 'ORGANIZER']} onNavigate={navigate}>
            <CandidatesPage onNavigate={navigate} mode="enrollment-pending" />
          </ProtectedRoute>
        );

      case '/cbt-exam-pending':
      case '/cbt/pending':
      case '/support/cbt-exam-pending':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN', 'CBT_TEST_SUPPORT']} onNavigate={navigate}>
            <CandidatesPage onNavigate={navigate} mode="cbt-pending" />
          </ProtectedRoute>
        );

      case '/cbt-confirmed':
      case '/cbt-exam-confirmed':
      case '/cbt/confirmed':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN', 'CBT_TEST_SUPPORT']} onNavigate={navigate}>
            <CandidatesPage onNavigate={navigate} mode="cbt-confirmed" />
          </ProtectedRoute>
        );

      case '/practical-pending':
      case '/practical/pending':
      case '/assessor/practical-pending':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN', 'ASSESSOR']} onNavigate={navigate}>
            <CandidatesPage onNavigate={navigate} mode="practical-pending" />
          </ProtectedRoute>
        );

      case '/practical-confirmed':
      case '/practical/confirmed':
      case '/assessor/practical-confirmed':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN', 'ASSESSOR']} onNavigate={navigate}>
            <CandidatesPage onNavigate={navigate} mode="practical-confirmed" />
          </ProtectedRoute>
        );

      case '/evaluation-sheet-register':
      case '/evaluation-sheets':
      case '/assessor/evaluation-sheet-register':
      case '/assessor/evaluation-sheets':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN', 'ASSESSOR']} onNavigate={navigate}>
            <EvaluationSheetRegister onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/enroll-verify':
      case '/support/enroll-verify':
      case '/enrollment-verify':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN', 'ORGANIZER']} onNavigate={navigate}>
            <CandidatesPage onNavigate={navigate} mode="enroll-verify" />
          </ProtectedRoute>
        );

      case '/candidate-exit-list':
      case '/support/candidate-exit-list':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN', 'SUPPORT_STAFF']} onNavigate={navigate}>
            <CandidatesPage onNavigate={navigate} mode="exit" />
          </ProtectedRoute>
        );

      case '/reservations':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN']} onNavigate={navigate}>
            <ReservationManagementPage onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/enrollment':
      case '/intake':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN']} onNavigate={navigate}>
            <CandidateEnrollmentPage onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/candidate-photos':
      case '/photos':
      case '/support/photos':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN']} onNavigate={navigate}>
            <CandidatePhotosPage onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/photo-verification-queue':
      case '/photo-queue':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'GLOBAL_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN', 'SUPPORT_STAFF']} onNavigate={navigate}>
            <PhotoVerificationQueuePage onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/assessors':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN']} onNavigate={navigate}>
            <AssessorsPage onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/support-staff':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN']} onNavigate={navigate}>
            <SupportStaffPage onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/assessment-monitoring':
      case '/live-activity':
      case '/support/assessment-support':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN', 'SUPPORT_STAFF', 'ORGANIZER', 'CBT_TEST_SUPPORT']} onNavigate={navigate}>
            <AssessmentMonitoringPage onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/schedules':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN']} onNavigate={navigate}>
            <SchedulesPage />
          </ProtectedRoute>
        );

      case '/batches':
      case '/support/batches':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN']} onNavigate={navigate}>
            <BatchesPage onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/assessments':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN']} onNavigate={navigate}>
            <AssessmentsPage />
          </ProtectedRoute>
        );

      case '/audit':
      case '/admin/audit':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN']} onNavigate={navigate}>
            <AuditLogsPage />
          </ProtectedRoute>
        );

      case '/settings':
        return <SettingsPage />;

      case '/config':
      case '/configuration':
      case '/admin/configuration':
      case '/super-admin/configuration':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']} onNavigate={navigate}>
            <ConfigurationPage onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/tasks':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN']} onNavigate={navigate}>
            <PracticalTasksPage onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/lottery':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN']} onNavigate={navigate}>
            <LotteryManagementPage onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/results':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN']} onNavigate={navigate}>
            <ResultsPage onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/reports':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN']} onNavigate={navigate}>
            <ReportsPage onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/monitoring':
      case '/super-admin/monitoring':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN']} onNavigate={navigate}>
            <MonitoringPage onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/global/governance':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']} onNavigate={navigate}>
            <MonitoringPage onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/id-card':
      case '/id-cards':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN']} onNavigate={navigate}>
            <IDCardManagementPage onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/complaints':
      case '/admin/complaints':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COUNTRY_ACCOUNT', 'CENTER_ADMIN']} onNavigate={navigate}>
            <ComplaintsPage onNavigate={navigate} />
          </ProtectedRoute>
        );

      // Phase 04 Assessor Routes
      case '/assessor/dashboard':
        return (
          <ProtectedRoute allowedRoles={['ASSESSOR', 'SUPER_ADMIN']} onNavigate={navigate}>
            <AssessorDashboard onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/assessor/assessments/today':
        return (
          <ProtectedRoute allowedRoles={['ASSESSOR', 'SUPER_ADMIN']} onNavigate={navigate}>
            <AssessorTodayAssessments onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/assessor/assessments/assigned':
        return (
          <ProtectedRoute allowedRoles={['ASSESSOR', 'SUPER_ADMIN']} onNavigate={navigate}>
            <AssessorAssignedCandidates onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/assessor/assessments/history':
        return (
          <ProtectedRoute allowedRoles={['ASSESSOR', 'SUPER_ADMIN']} onNavigate={navigate}>
            <AssessorAssessmentHistory onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/assessor/candidate-verification':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']} onNavigate={navigate}>
            <AssessorCandidateVerification onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/assessor/practical-task':
        return (
          <ProtectedRoute allowedRoles={['ASSESSOR', 'SUPER_ADMIN']} onNavigate={navigate}>
            <AssessorPracticalTask onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/assessor/practical-workspace':
        return (
          <ProtectedRoute allowedRoles={['ASSESSOR', 'SUPER_ADMIN']} onNavigate={navigate}>
            <AssessorPracticalWorkspace onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/assessor/evidence':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']} onNavigate={navigate}>
            <AssessorEvidencePage onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/assessor/evaluation':
        return (
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']} onNavigate={navigate}>
            <AssessorEvaluationPage onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/assessor/notifications':
        return (
          <ProtectedRoute allowedRoles={['ASSESSOR', 'SUPER_ADMIN']} onNavigate={navigate}>
            <AssessorNotifications onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/assessor/ai-help':
        return (
          <ProtectedRoute allowedRoles={['ASSESSOR', 'SUPER_ADMIN']} onNavigate={navigate}>
            <AssessorAIHelp />
          </ProtectedRoute>
        );

      case '/assessor/profile':
        return (
          <ProtectedRoute allowedRoles={['ASSESSOR', 'SUPER_ADMIN']} onNavigate={navigate}>
            <AssessorProfile />
          </ProtectedRoute>
        );

      case '/support/notifications':
        return (
          <ProtectedRoute allowedRoles={['SUPPORT_STAFF', 'ORGANIZER', 'CBT_TEST_SUPPORT', 'CENTER_ADMIN', 'SUPER_ADMIN']} onNavigate={navigate}>
            <SupportStaffNotifications onNavigate={navigate} />
          </ProtectedRoute>
        );

      case '/notifications':
        return <SystemNotificationsPage onNavigate={navigate} />;

      case '/support/profile':
      case '/profile':
        return <UserProfilePage onNavigate={navigate} />;

      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <AppShell currentPath={currentPath} onNavigate={navigate}>
      {renderContent()}
    </AppShell>
  );
};

export function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <AuthProvider>
          <NotificationProvider>
            <RouterContent />
          </NotificationProvider>
        </AuthProvider>
      </ToastProvider>
    </LanguageProvider>
  );
}

export default App;
