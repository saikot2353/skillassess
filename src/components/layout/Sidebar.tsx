import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Globe2, Building2, Users2, CalendarDays, 
  Layers, UserCheck, ClipboardCheck, BookOpen, Shuffle, 
  Award, Activity, MessageSquareWarning, ShieldAlert, Settings2,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X,
  FileText, CreditCard, Sliders, Shield, UserCircle,
  Bell, Sparkles, Wrench, CheckCircle2
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Role, Center } from '../../types';
import { StorageService, STORAGE_KEYS } from '../../services/storageService';

export interface SidebarProps {
  isOpen: boolean; // Mobile drawer visibility
  isCollapsed: boolean; // Desktop collapsed state
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  currentPath: string;
  onNavigate: (path: string) => void;
}

interface SubItem {
  id: string;
  path: string;
  labelKey: string;
}

interface NavGroup {
  id: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  subItems?: SubItem[];
  allowedRoles?: Role[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isCollapsed,
  onToggleCollapse,
  onCloseMobile,
  currentPath,
  onNavigate,
}) => {
  const { isRTL, language, t } = useLanguage();
  const { user } = useAuth();

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    countries: false,
    centers: false,
    users: false,
    assessments: false,
    tasks: false,
    lottery: false,
    monitoring: false,
    reports: false,
    config: false,
    assessment: true,
    'practical-assessment': true,
  });

  const isAssessor = user?.role === 'ASSESSOR';
  const isCenterAdmin = user?.role === 'CENTER_ADMIN';
  const isSupportStaff = user?.role === 'SUPPORT_STAFF' || user?.role === 'ORGANIZER';
  const isCbtTestSupport = user?.role === 'CBT_TEST_SUPPORT';
  const center = (isCenterAdmin || isSupportStaff || isCbtTestSupport) && user?.centerId
    ? StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []).find(c => c.id === user.centerId)
    : null;

  const superAdminNavGroups: NavGroup[] = [
    {
      id: 'dashboard',
      labelKey: 'dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'countries',
      labelKey: 'countryManagement',
      icon: Globe2,
      allowedRoles: ['SUPER_ADMIN'],
      subItems: [
        { id: 'all-countries', path: '/countries', labelKey: 'allCountries' },
        { id: 'create-country', path: '/countries?action=create', labelKey: 'createCountry' },
        { id: 'country-details', path: '/countries?view=details', labelKey: 'countryDetails' },
      ],
    },
    {
      id: 'centers',
      labelKey: 'centerManagement',
      icon: Building2,
      allowedRoles: ['SUPER_ADMIN', 'COUNTRY_ACCOUNT'],
      subItems: [
        { id: 'all-centers', path: '/centers', labelKey: 'allCenters' },
        { id: 'create-center', path: '/centers?action=create', labelKey: 'createCenter' },
        { id: 'center-details', path: '/centers?view=details', labelKey: 'centerDetails' },
        { id: 'center-status', path: '/centers?status=ACTIVE', labelKey: 'centerStatus' },
      ],
    },
    {
      id: 'users',
      labelKey: 'userManagement',
      icon: Users2,
      allowedRoles: ['SUPER_ADMIN', 'COUNTRY_ACCOUNT'],
      subItems: [
        { id: 'country-accounts', path: '/users?role=COUNTRY_ACCOUNT', labelKey: 'countryAccounts' },
        { id: 'center-admins', path: '/users?role=CENTER_ADMIN', labelKey: 'centerAdmins' },
        { id: 'assessors', path: '/users?role=ASSESSOR', labelKey: 'assessors' },
        { id: 'support-staff', path: '/users?role=SUPPORT_STAFF', labelKey: 'supportStaff' },
        { id: 'organizers', path: '/users?role=ORGANIZER', labelKey: 'organizers' },
      ],
    },
    {
      id: 'assessments',
      labelKey: 'assessmentManagement',
      icon: ClipboardCheck,
      subItems: [
        { id: 'schedules', path: '/schedules', labelKey: 'schedules' },
        { id: 'batches', path: '/batches', labelKey: 'batches' },
        { id: 'candidates', path: '/candidates', labelKey: 'candidates' },
        { id: 'candidates-pending', path: '/enrollment-pending', labelKey: 'enrollmentPending' },
        { id: 'candidates-cbt-pending', path: '/cbt-exam-pending', labelKey: 'cbtExamPending' },
        { id: 'candidates-cbt-confirmed', path: '/cbt-confirmed', labelKey: 'cbtConfirmed' },
        { id: 'candidates-practical-pending', path: '/practical-pending', labelKey: 'practicalPending' },
        { id: 'candidates-practical-confirmed', path: '/practical-confirmed', labelKey: 'practicalConfirmed' },
        { id: 'candidates-eval-register', path: '/evaluation-sheet-register', labelKey: 'evaluationSheetRegister' },
        { id: 'candidates-verify', path: '/enroll-verify', labelKey: 'enrollVerify' },
        { id: 'candidates-exit', path: '/candidate-exit-list', labelKey: 'candidateExitList' },
        { id: 'assessments-list', path: '/assessments', labelKey: 'assessments' },
        { id: 'results', path: '/results', labelKey: 'results' },
      ],
    },
    {
      id: 'tasks',
      labelKey: 'practicalTaskManagement',
      icon: BookOpen,
      allowedRoles: ['SUPER_ADMIN', 'ASSESSOR'],
      subItems: [
        { id: 'task-pool', path: '/tasks', labelKey: 'taskPool' },
        { id: 'worksheets', path: '/tasks?tab=worksheets', labelKey: 'worksheets' },
        { id: 'task-allocation', path: '/tasks?tab=allocations', labelKey: 'taskAllocation' },
      ],
    },
    {
      id: 'lottery',
      labelKey: 'lotteryManagement',
      icon: Shuffle,
      allowedRoles: ['SUPER_ADMIN'],
      subItems: [
        { id: 'assessor-lottery', path: '/lottery?tab=assessor', labelKey: 'candidateAssessorLottery' },
        { id: 'task-lottery', path: '/lottery?tab=task', labelKey: 'practicalTaskLottery' },
      ],
    },
    {
      id: 'monitoring',
      labelKey: 'monitoring',
      icon: Activity,
      allowedRoles: ['SUPER_ADMIN', 'COUNTRY_ACCOUNT'],
      subItems: [
        { id: 'live-activity', path: '/monitoring?tab=live', labelKey: 'liveActivity' },
        { id: 'assessment-monitoring', path: '/monitoring?tab=assessments', labelKey: 'assessmentMonitoring' },
        { id: 'assessor-monitoring', path: '/monitoring?tab=assessors', labelKey: 'assessorMonitoring' },
        { id: 'center-monitoring', path: '/monitoring?tab=centers', labelKey: 'centerMonitoring' },
      ],
    },
    {
      id: 'reports',
      labelKey: 'reports',
      icon: FileText,
      subItems: [
        { id: 'daily-report', path: '/reports?tab=daily', labelKey: 'dailyReport' },
        { id: 'monthly-report', path: '/reports?tab=monthly', labelKey: 'monthlyReport' },
        { id: 'center-wise-report', path: '/reports?tab=center', labelKey: 'centerWiseReport' },
        { id: 'assessor-wise-report', path: '/reports?tab=assessor', labelKey: 'assessorWiseReport' },
        { id: 'occupation-wise-report', path: '/reports?tab=occupation', labelKey: 'occupationWiseReport' },
        { id: 'batch-wise-report', path: '/reports?tab=batch', labelKey: 'batchWiseReport' },
        { id: 'result-report', path: '/reports?tab=result', labelKey: 'resultReport' },
      ],
    },
    {
      id: 'id-card',
      labelKey: 'idCard',
      path: '/id-card',
      icon: CreditCard,
      allowedRoles: ['SUPER_ADMIN', 'COUNTRY_ACCOUNT'],
    },
    {
      id: 'config',
      labelKey: 'configuration',
      icon: Sliders,
      allowedRoles: ['SUPER_ADMIN'],
      subItems: [
        { id: 'apro-config', path: '/config?tab=apro', labelKey: 'aproConfig' },
        { id: 'serial-config', path: '/config?tab=serial', labelKey: 'serialConfig' },
        { id: 'assessment-settings', path: '/config?tab=assessment', labelKey: 'assessmentSettings' },
        { id: 'system-settings', path: '/config?tab=system', labelKey: 'systemSettings' },
      ],
    },
    {
      id: 'complaints',
      labelKey: 'complaints',
      path: '/complaints',
      icon: MessageSquareWarning,
    },
    {
      id: 'audit',
      labelKey: 'auditLogs',
      path: '/audit',
      icon: ShieldAlert,
      allowedRoles: ['SUPER_ADMIN', 'COUNTRY_ACCOUNT'],
    },
    {
      id: 'profile',
      labelKey: 'profile',
      path: '/settings',
      icon: UserCircle,
    },
  ];

  const centerAdminNavGroups: NavGroup[] = [
    {
      id: 'dashboard',
      labelKey: 'dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'schedules',
      labelKey: 'schedules',
      path: '/schedules',
      icon: CalendarDays,
    },
    {
      id: 'batches',
      labelKey: 'batchManagement',
      path: '/batches',
      icon: Layers,
    },
    {
      id: 'reservations',
      labelKey: 'reservation',
      icon: CreditCard,
      subItems: [
        { id: 'res-import', path: '/reservations?tab=import', labelKey: 'reservationImport' },
        { id: 'res-preload', path: '/reservations?tab=preload', labelKey: 'preloadedCandidates' },
      ],
    },
    {
      id: 'candidates',
      labelKey: 'candidates',
      icon: UserCheck,
      subItems: [
        { id: 'can-list', path: '/candidates', labelKey: 'candidateList' },
        { id: 'can-pending', path: '/enrollment-pending', labelKey: 'enrollmentPending' },
        { id: 'can-cbt-pending', path: '/cbt-exam-pending', labelKey: 'cbtExamPending' },
        { id: 'can-cbt-confirmed', path: '/cbt-confirmed', labelKey: 'cbtConfirmed' },
        { id: 'can-practical-pending', path: '/practical-pending', labelKey: 'practicalPending' },
        { id: 'can-practical-confirmed', path: '/practical-confirmed', labelKey: 'practicalConfirmed' },
        { id: 'can-eval-register', path: '/evaluation-sheet-register', labelKey: 'evaluationSheetRegister' },
        { id: 'can-verify', path: '/enroll-verify', labelKey: 'enrollVerify' },
        { id: 'can-exit-list', path: '/candidate-exit-list', labelKey: 'candidateExitList' },
        { id: 'can-enroll', path: '/enrollment', labelKey: 'enrollment' },
        { id: 'can-photos', path: '/candidate-photos', labelKey: 'photos' },
      ],
    },
    {
      id: 'assessors',
      labelKey: 'assessors',
      icon: Users2,
      subItems: [
        { id: 'ass-list', path: '/assessors?tab=list', labelKey: 'assessorList' },
        { id: 'ass-schedule', path: '/assessors?tab=schedule', labelKey: 'assessorSchedule' },
      ],
    },
    {
      id: 'support-staff',
      labelKey: 'supportStaff',
      path: '/support-staff',
      icon: UserCircle,
    },
    {
      id: 'monitoring',
      labelKey: 'assessmentMonitoring',
      icon: ClipboardCheck,
      subItems: [
        { id: 'mon-pipeline', path: '/assessment-monitoring?tab=pipeline', labelKey: 'assessmentMonitoring' },
        { id: 'mon-practical', path: '/assessment-monitoring?tab=practical', labelKey: 'practicalAssessmentMonitoring' },
        { id: 'mon-evidence', path: '/assessment-monitoring?tab=evidence', labelKey: 'evidenceStatus' },
      ],
    },
    {
      id: 'results',
      labelKey: 'results',
      path: '/results',
      icon: Award,
    },
    {
      id: 'reports',
      labelKey: 'reports',
      icon: FileText,
      subItems: [
        { id: 'rep-daily', path: '/reports?tab=daily', labelKey: 'dailyReport' },
        { id: 'rep-batch', path: '/reports?tab=batch', labelKey: 'batchWiseReport' },
        { id: 'rep-assessor', path: '/reports?tab=assessor', labelKey: 'assessorWiseReport' },
        { id: 'rep-monthly', path: '/reports?tab=monthly', labelKey: 'monthlyReport' },
        { id: 'rep-occupation', path: '/reports?tab=occupation', labelKey: 'occupationWiseReport' },
      ],
    },
    {
      id: 'live-activity',
      labelKey: 'liveActivity',
      path: '/live-activity',
      icon: Activity,
    },
    {
      id: 'complaints',
      labelKey: 'complaints',
      path: '/complaints',
      icon: MessageSquareWarning,
    },
    {
      id: 'profile',
      labelKey: 'profile',
      path: '/settings',
      icon: Settings2,
    },
  ];

  const assessorNavGroups: NavGroup[] = [
    {
      id: 'dashboard',
      labelKey: 'dashboard',
      path: '/assessor/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'assessment',
      labelKey: 'assessmentManagement',
      icon: ClipboardCheck,
      subItems: [
        { id: 'ass-today', path: '/assessor/assessments/today', labelKey: 'todaysAssessments' },
        { id: 'ass-candidates', path: '/assessor/assessments/assigned', labelKey: 'assignedCandidates' },
        { id: 'ass-history', path: '/assessor/assessments/history', labelKey: 'assessmentHistory' },
      ],
    },
    {
      id: 'practical-assessment',
      labelKey: 'practicalTaskManagement',
      icon: Wrench,
      subItems: [
        { id: 'pra-pending', path: '/assessor/practical-pending', labelKey: 'practicalPending' },
        { id: 'pra-confirmed', path: '/assessor/practical-confirmed', labelKey: 'practicalConfirmed' },
        { id: 'pra-eval-register', path: '/assessor/evaluation-sheet-register', labelKey: 'evaluationSheetRegister' },
        { id: 'pra-verify', path: '/assessor/candidate-verification', labelKey: 'candidateVerification' },
        { id: 'pra-task', path: '/assessor/practical-task', labelKey: 'practicalTask' },
        { id: 'pra-evidence', path: '/assessor/evidence', labelKey: 'evidence' },
        { id: 'pra-eval', path: '/assessor/evaluation', labelKey: 'evaluationRating' },
      ],
    },
    {
      id: 'notifications',
      labelKey: 'notifications',
      path: '/assessor/notifications',
      icon: Bell,
    },
    {
      id: 'ai-help',
      labelKey: 'aiHelp',
      path: '/assessor/ai-help',
      icon: Sparkles,
    },
    {
      id: 'profile',
      labelKey: 'profile',
      path: '/assessor/profile',
      icon: UserCircle,
    },
  ];

  const supportStaffNavGroups: NavGroup[] = [
    {
      id: 'dashboard',
      labelKey: 'dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'candidates',
      labelKey: 'candidates',
      icon: UserCheck,
      subItems: [
        { id: 'can-list', path: '/candidates', labelKey: 'candidateList' },
        { id: 'can-pending', path: '/enrollment-pending', labelKey: 'enrollmentPending' },
        { id: 'can-cbt-pending', path: '/cbt-exam-pending', labelKey: 'cbtExamPending' },
        { id: 'can-cbt-confirmed', path: '/cbt-confirmed', labelKey: 'cbtConfirmed' },
        { id: 'can-verify', path: '/enroll-verify', labelKey: 'enrollVerify' },
        { id: 'can-exit-list', path: '/candidate-exit-list', labelKey: 'candidateExitList' },
        { id: 'can-photos', path: '/candidate-photos', labelKey: 'photos' },
      ],
    },
    {
      id: 'batches',
      labelKey: 'batchManagement',
      path: '/batches',
      icon: Layers,
    },
    {
      id: 'assessment-support',
      labelKey: 'assessmentSupport',
      icon: ClipboardCheck,
      subItems: [
        { id: 'sup-activities', path: '/assessment-monitoring?tab=live', labelKey: 'todaysActivities' },
        { id: 'sup-monitoring', path: '/assessment-monitoring?tab=pipeline', labelKey: 'assessmentMonitoring' },
      ],
    },
    {
      id: 'notifications',
      labelKey: 'notifications',
      path: '/support/notifications',
      icon: Bell,
    },
    {
      id: 'profile',
      labelKey: 'profile',
      path: '/profile',
      icon: UserCircle,
    },
  ];

  const cbtTestSupportNavGroups: NavGroup[] = [
    {
      id: 'dashboard',
      labelKey: 'dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'cbt-exam-pending',
      labelKey: 'cbtExamPending',
      path: '/cbt-exam-pending',
      icon: ClipboardCheck,
    },
    {
      id: 'cbt-exam-confirmed',
      labelKey: 'cbtConfirmed',
      path: '/cbt-confirmed',
      icon: CheckCircle2,
    },
    {
      id: 'candidates',
      labelKey: 'candidates',
      icon: UserCheck,
      subItems: [
        { id: 'cbt-can-pending', path: '/cbt-exam-pending', labelKey: 'cbtExamPending' },
        { id: 'cbt-can-confirmed', path: '/cbt-confirmed', labelKey: 'cbtConfirmed' },
        { id: 'cbt-can-list', path: '/candidates', labelKey: 'candidateList' },
        { id: 'cbt-can-photos', path: '/candidate-photos', labelKey: 'photos' },
      ],
    },
    {
      id: 'batches',
      labelKey: 'batchManagement',
      path: '/batches',
      icon: Layers,
    },
    {
      id: 'assessment-support',
      labelKey: 'assessmentSupport',
      icon: Activity,
      subItems: [
        { id: 'cbt-monitoring', path: '/assessment-monitoring?tab=pipeline', labelKey: 'assessmentMonitoring' },
        { id: 'cbt-activities', path: '/assessment-monitoring?tab=live', labelKey: 'todaysActivities' },
      ],
    },
    {
      id: 'notifications',
      labelKey: 'notifications',
      path: '/support/notifications',
      icon: Bell,
    },
    {
      id: 'profile',
      labelKey: 'profile',
      path: '/profile',
      icon: UserCircle,
    },
  ];

  const navGroups = isAssessor 
    ? assessorNavGroups 
    : (isCbtTestSupport
        ? cbtTestSupportNavGroups
        : (isSupportStaff
            ? supportStaffNavGroups
            : (isCenterAdmin ? centerAdminNavGroups : superAdminNavGroups)));

  // Auto-expand active group based on currentPath
  useEffect(() => {
    const activeGroup = navGroups.find(g => {
      if (g.path && currentPath.startsWith(g.path)) return true;
      if (g.subItems) {
        return g.subItems.some(sub => currentPath.startsWith(sub.path.split('?')[0]));
      }
      return false;
    });

    if (activeGroup?.subItems) {
      setExpandedGroups(prev => ({ ...prev, [activeGroup.id]: true }));
    }
  }, [currentPath]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleNavigate = (path: string) => {
    onNavigate(path);
    onCloseMobile();
  };

  const isVisible = (group: NavGroup) => {
    if (!group.allowedRoles || !user) return true;
    return group.allowedRoles.includes(user.role);
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-white select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#E8D9D2] bg-[#FFFCF8]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-[#7A2E3A] text-white flex items-center justify-center font-bold text-xs tracking-wider shrink-0 shadow-sm">
              360
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <span className="text-sm font-bold text-[#3F3030] tracking-tight block">
                  {t.brand.name}
                </span>
                <span className="text-[10px] text-[#806F6F] font-medium tracking-wide truncate block" title={center ? (language === 'ar' ? center.nameAr : center.nameEn) : undefined}>
                  {isAssessor 
                    ? (language === 'ar' ? 'بوابة المقيّم المعتمد' : 'Assessor Certified Portal')
                    : (isCbtTestSupport
                        ? (center ? `${language === 'ar' ? center.nameAr : center.nameEn} • ${t.roles.CBT_TEST_SUPPORT}` : (language === 'ar' ? 'دعم اختبار CBT' : 'CBT Test Support Operations'))
                        : (user?.role === 'ORGANIZER'
                            ? (center ? `${language === 'ar' ? center.nameAr : center.nameEn} • ${t.roles.ORGANIZER}` : (language === 'ar' ? 'منسق المركز المعتمد' : 'Center Organizer Operations'))
                            : (isSupportStaff
                                ? (center ? `${language === 'ar' ? center.nameAr : center.nameEn} • ${language === 'ar' ? 'فريق الدعم' : 'Support Staff'}` : (language === 'ar' ? 'فريق الدعم التشغيلي' : 'Support Staff Operations'))
                                : (isCenterAdmin 
                                    ? (center ? (language === 'ar' ? center.nameAr : center.nameEn) : 'Center Administration')
                                    : 'Super Admin Governance'))))}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-stone-400 hover:text-stone-700 rounded-md"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-8.5rem)] text-xs font-medium">
          {navGroups.filter(isVisible).map(group => {
            const Icon = group.icon;
            const hasSub = !!group.subItems && group.subItems.length > 0;
            const isExpanded = !!expandedGroups[group.id];

            // Check if group itself or any child is active
            const isGroupActive = hasSub
              ? group.subItems!.some(sub => currentPath.startsWith(sub.path.split('?')[0]))
              : group.path === currentPath || (group.path !== '/dashboard' && currentPath.startsWith(group.path || ''));

            const label = (t.nav as Record<string, string>)[group.labelKey] || group.labelKey;

            return (
              <div key={group.id} className="space-y-0.5">
                {hasSub ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    title={isCollapsed ? label : undefined}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all text-start ${
                      isGroupActive
                        ? 'bg-[#F8ECEE] text-[#7A2E3A] font-semibold'
                        : 'text-[#3F3030] hover:text-[#7A2E3A] hover:bg-[#FFFCF8]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isGroupActive ? 'text-[#7A2E3A]' : 'text-[#806F6F]'}`} />
                      {!isCollapsed && <span className="truncate">{label}</span>}
                    </div>
                    {!isCollapsed && (
                      <span className="text-[#806F6F] shrink-0">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </span>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleNavigate(group.path || '/dashboard')}
                    title={isCollapsed ? label : undefined}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all text-start ${
                      isGroupActive
                        ? 'bg-[#7A2E3A] text-white font-semibold shadow-sm'
                        : 'text-[#3F3030] hover:text-[#7A2E3A] hover:bg-[#FFFCF8]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isGroupActive ? 'text-white' : 'text-[#806F6F]'}`} />
                    {!isCollapsed && <span className="truncate">{label}</span>}
                  </button>
                )}

                {/* Submenu accordion */}
                {hasSub && isExpanded && !isCollapsed && (
                  <div className={`space-y-0.5 pt-0.5 pb-1 ${isRTL ? 'pe-5 border-e border-[#E8D9D2]/70' : 'ps-5 border-s border-[#E8D9D2]/70'} ms-3 me-1`}>
                    {group.subItems!.map(sub => {
                      const subActive = currentPath === sub.path || currentPath === sub.path.split('?')[0];
                      const subLabel = (t.nav as Record<string, string>)[sub.labelKey] || sub.labelKey;

                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => handleNavigate(sub.path)}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] transition-colors text-start ${
                            subActive
                              ? 'bg-[#F8ECEE] text-[#7A2E3A] font-bold'
                              : 'text-[#806F6F] hover:text-[#3F3030] hover:bg-[#FFFCF8]'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${subActive ? 'bg-[#7A2E3A]' : 'bg-[#E8D9D2]'}`} />
                          <span className="truncate">{subLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer / Toggle */}
      <div className="p-3 border-t border-[#E8D9D2] bg-[#FFFCF8] flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#806F6F] font-mono">
            <Shield className="w-3.5 h-3.5 text-[#C9A24D]" />
            <span>{isSupportStaff ? (center ? `${center.code} • Ops` : 'Support Ops') : (isCenterAdmin ? (center ? center.code : 'Center Ops') : 'Gov. Level 1')}</span>
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 rounded text-[#806F6F] hover:text-[#3F3030] hover:bg-stone-100 transition-colors mx-auto"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          ) : (
            isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Backdrop - NO blur */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden transition-opacity"
          style={{ backgroundColor: 'rgba(63, 48, 48, 0.18)' }}
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 z-40 w-72 bg-white shadow-xl transition-transform duration-200 ease-in-out md:hidden ${
          isRTL
            ? isOpen ? 'translate-x-0 end-0' : 'translate-x-full end-0'
            : isOpen ? 'translate-x-0 start-0' : '-translate-x-full start-0'
        }`}
      >
        {sidebarContent}
      </div>

      {/* Desktop Fixed Sidebar */}
      <aside
        className={`hidden md:block shrink-0 transition-all duration-200 z-20 sticky top-0 h-screen ${
          isCollapsed ? 'w-16' : 'w-64'
        } ${
          isRTL ? 'border-s border-[#E8D9D2]' : 'border-e border-[#E8D9D2]'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

