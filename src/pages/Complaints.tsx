import React, { useState, useEffect, useMemo } from 'react';
import { 
  MessageSquareWarning, AlertTriangle, CheckCircle2, Clock, 
  Search, Filter, Plus, Eye, CheckCircle, XCircle, Building2,
  Send, FileText, ChevronDown, ShieldAlert
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { Complaint, Center, Country, User } from '../types';
import { useAuth } from '../context/AuthContext';

interface ComplaintsPageProps {
  onNavigate?: (path: string) => void;
}

export const ComplaintsPage: React.FC<ComplaintsPageProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  const userCenterId = user?.centerId || 'ctr-sa-1';
  const isCenterAdmin = user?.role === 'CENTER_ADMIN';

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedCenter, setSelectedCenter] = useState<string>('ALL');

  // Resolution Modal
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [resolutionStatus, setResolutionStatus] = useState<Complaint['status']>('UNDER_REVIEW');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [assignedUser, setAssignedUser] = useState<string>('');

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    reportedBy: '',
    centerId: '',
    category: 'RESULT_DISPUTE' as Complaint['category'],
    priority: 'MEDIUM' as Complaint['priority'],
    subject: '',
    description: '',
  });

  const loadData = () => {
    const allComplaints = StorageService.get<Complaint[]>(STORAGE_KEYS.COMPLAINTS, []);
    const filtered = isCenterAdmin 
      ? allComplaints.filter(c => c.centerId === userCenterId)
      : allComplaints;
    setComplaints(filtered);
    setCenters(StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []));
    setCountries(StorageService.get<Country[]>(STORAGE_KEYS.COUNTRIES, []));
    setAllUsers(StorageService.get<User[]>(STORAGE_KEYS.USERS, []));
  };

  useEffect(() => {
    loadData();
  }, [userCenterId, isCenterAdmin]);

  // Filtered List
  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      if (isCenterAdmin && c.centerId !== userCenterId) return false;
      const q = searchTerm.toLowerCase();
      const matchesSearch = 
        c.complaintNumber.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        c.reportedBy.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q);

      const matchesCat = selectedCategory === 'ALL' || c.category === selectedCategory;
      const matchesStatus = selectedStatus === 'ALL' || c.status === selectedStatus;
      const matchesPriority = selectedPriority === 'ALL' || c.priority === selectedPriority;
      const matchesCenter = selectedCenter === 'ALL' || c.centerId === selectedCenter;

      return matchesSearch && matchesCat && matchesStatus && matchesPriority && matchesCenter;
    });
  }, [complaints, searchTerm, selectedCategory, selectedStatus, selectedPriority, selectedCenter, isCenterAdmin, userCenterId]);

  // KPIs
  const totalOpen = complaints.filter(c => c.status === 'OPEN').length;
  const totalUnderReview = complaints.filter(c => c.status === 'UNDER_REVIEW' || c.status === 'IN_PROGRESS').length;
  const totalActionRequired = complaints.filter(c => c.status === 'ACTION_REQUIRED').length;
  const totalResolved = complaints.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED').length;
  const totalUrgent = complaints.filter(c => c.priority === 'URGENT' || c.priority === 'HIGH').length;

  const handleOpenDetail = (comp: Complaint) => {
    setSelectedComplaint(comp);
    setResolutionStatus(comp.status);
    setResolutionNotes(comp.resolutionNotes || '');
    setAssignedUser(comp.assignedTo || '');
    setIsDetailModalOpen(true);
  };

  const handleSaveResolution = () => {
    if (!selectedComplaint) return;

    if ((resolutionStatus === 'RESOLVED' || resolutionStatus === 'CLOSED') && !resolutionNotes.trim()) {
      showToast(
        language === 'ar' 
          ? 'ملاحظات وتفاصيل القرار إلزامية لاعتماد حل أو إغلاق الشكوى' 
          : 'Resolution findings and remediation notes are mandatory to resolve or close a grievance ticket', 
        'warning'
      );
      return;
    }

    const assignedObj = allUsers.find(u => u.id === assignedUser);
    const prevStatus = selectedComplaint.status;

    const newHistoryEntry = {
      id: `cmph-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      complaintId: selectedComplaint.id,
      fromStatus: prevStatus,
      toStatus: resolutionStatus,
      changedBy: user?.name ? `${user.name} (${user.role})` : 'Administrator',
      changedAt: new Date().toISOString(),
      comment: resolutionNotes.trim() || undefined,
      assignedTo: assignedObj ? `${assignedObj.name} (${assignedObj.role})` : selectedComplaint.assignedToName
    };

    const updated: Complaint = {
      ...selectedComplaint,
      status: resolutionStatus,
      assignedTo: assignedUser || selectedComplaint.assignedTo,
      assignedToName: assignedObj ? `${assignedObj.name} (${assignedObj.role})` : selectedComplaint.assignedToName,
      resolutionNotes: resolutionNotes.trim() || selectedComplaint.resolutionNotes,
      resolvedAt: (resolutionStatus === 'RESOLVED' || resolutionStatus === 'CLOSED') 
        ? (selectedComplaint.resolvedAt || new Date().toISOString()) 
        : undefined,
      history: [...(selectedComplaint.history || []), newHistoryEntry]
    };

    StorageService.updateItem(STORAGE_KEYS.COMPLAINTS, updated);

    AuditService.log(
      'UPDATE_COMPLAINT', 
      'COMPLAINT', 
      `Supervisory action on complaint ${updated.complaintNumber}: transitioned from ${prevStatus} to ${updated.status}. Investigator: ${updated.assignedToName || 'Unassigned'}. Remarks: ${resolutionNotes.slice(0, 60)}...`, 
      updated.id, 
      'SUCCESS'
    );

    // Dispatch Notification into system
    const notif = {
      id: `notif-${Date.now()}`,
      titleEn: `Grievance ${updated.complaintNumber} Status: ${updated.status}`,
      titleAr: `تحديث تذكرة الشكوى ${updated.complaintNumber}: ${updated.status}`,
      messageEn: `Complaint ${updated.complaintNumber} transitioned to ${updated.status}. Investigator: ${updated.assignedToName || 'Unassigned'}.`,
      messageAr: `تم تحديث التذكرة ${updated.complaintNumber} إلى ${updated.status}. المكلف: ${updated.assignedToName || 'غير معين'}.`,
      type: updated.status === 'ACTION_REQUIRED' ? ('ALERT' as const) : (updated.status === 'RESOLVED' ? ('SUCCESS' as const) : ('INFO' as const)),
      targetRole: (isCenterAdmin ? 'CENTER_ADMIN' : 'ALL') as any,
      read: false,
      createdAt: new Date().toISOString(),
      link: '/complaints'
    };
    const currentNotifs = StorageService.get<any[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    StorageService.set(STORAGE_KEYS.NOTIFICATIONS, [notif, ...currentNotifs]);

    showToast(language === 'ar' ? 'تم تحديث حالة الشكوى وإضافة الإجراء لسجل التدقيق' : 'Grievance ticket updated, history logged, and notification dispatched', 'success');
    setIsDetailModalOpen(false);
    loadData();
  };

  const handleCreateComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCenterId = isCenterAdmin ? userCenterId : createForm.centerId;
    if (!createForm.reportedBy || !targetCenterId || !createForm.subject || !createForm.description) {
      showToast('Please fill in all mandatory fields', 'warning');
      return;
    }

    const ctr = centers.find(c => c.id === targetCenterId);
    const newCompId = `cmp-${Date.now()}`;
    const newCompNumber = `CMP-2026-00${complaints.length + 5}`;
    
    const newComp: Complaint = {
      id: newCompId,
      complaintNumber: newCompNumber,
      countryId: ctr ? ctr.countryId : (user?.countryId || 'cnt-sa'),
      centerId: targetCenterId,
      reportedBy: createForm.reportedBy,
      category: createForm.category,
      priority: createForm.priority,
      status: 'OPEN',
      subject: createForm.subject,
      description: createForm.description,
      createdAt: new Date().toISOString(),
      history: [
        {
          id: `cmph-${Date.now()}`,
          complaintId: newCompId,
          fromStatus: undefined,
          toStatus: 'OPEN',
          changedBy: createForm.reportedBy,
          changedAt: new Date().toISOString(),
          comment: 'Initial grievance registered into system register'
        }
      ]
    };

    StorageService.updateItem(STORAGE_KEYS.COMPLAINTS, newComp);
    AuditService.log(
      'UPDATE_COMPLAINT', 
      'COMPLAINT', 
      `Registered grievance ticket ${newComp.complaintNumber} (${newComp.category}) reported by ${newComp.reportedBy}`, 
      newComp.id, 
      'SUCCESS'
    );

    // Dispatch Notification
    const notif = {
      id: `notif-${Date.now()}`,
      titleEn: `New Grievance Ticket Logged: ${newComp.complaintNumber}`,
      titleAr: `تسجيل تذكرة شكوى جديدة: ${newComp.complaintNumber}`,
      messageEn: `Priority: ${newComp.priority} • Category: ${newComp.category} • Subject: ${newComp.subject}`,
      messageAr: `الأولوية: ${newComp.priority} • التصنيف: ${newComp.category} • الموضوع: ${newComp.subject}`,
      type: newComp.priority === 'URGENT' ? ('ALERT' as const) : ('WARNING' as const),
      targetRole: (isCenterAdmin ? 'CENTER_ADMIN' : 'ALL') as any,
      read: false,
      createdAt: new Date().toISOString(),
      link: '/complaints'
    };
    const currentNotifs = StorageService.get<any[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    StorageService.set(STORAGE_KEYS.NOTIFICATIONS, [notif, ...currentNotifs]);

    showToast(language === 'ar' ? 'تم تسجيل الشكوى بنجاح وإحالتها للمراجعة' : 'Complaint ticket logged successfully and notification dispatched', 'success');
    setIsCreateModalOpen(false);
    setCreateForm({
      reportedBy: '',
      centerId: '',
      category: 'RESULT_DISPUTE',
      priority: 'MEDIUM',
      subject: '',
      description: '',
    });
    loadData();
  };

  const getPriorityBadge = (p: Complaint['priority']) => {
    switch (p) {
      case 'URGENT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">URGENT</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">MEDIUM</span>;
      case 'LOW':
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">LOW</span>;
    }
  };

  const getCategoryLabel = (cat: Complaint['category']) => {
    switch (cat) {
      case 'RESULT_DISPUTE': return language === 'ar' ? 'اعتراض على النتائج' : 'Result Dispute';
      case 'EXAMINATION_CONDUCT': return language === 'ar' ? 'سير الاختبار' : 'Exam Conduct';
      case 'TECHNICAL_EQUIPMENT': return language === 'ar' ? 'الأجهزة والتقنية' : 'Technical / Equipment';
      case 'FACILITY': return language === 'ar' ? 'مرافق الورشة' : 'Facility & Safety';
      default: return language === 'ar' ? 'أخرى' : 'Other';
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header */}
      <PageHeader
        title={language === 'ar' ? 'إدارة الشكاوى والاعتراضات والتحكيم' : 'Grievance, Appeals & Integrity Arbitration'}
        subtitle={language === 'ar' ? 'متابعة طعون المرشحين، نزاعات تقييم الورش، وتوثيق الإجراءات التصحيحية' : 'Supervisory grievance redressal mechanism, candidate score re-evaluations, facility incidents, and arbitration outcomes'}
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: language === 'ar' ? 'الشكاوى والاعتراضات' : 'Grievances & Appeals' },
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            {language === 'ar' ? 'تسجيل بلاغ جديد' : 'Log New Grievance'}
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-[#E8D9D2] rounded-xl p-3.5 shadow-soft">
          <div className="flex items-center justify-between text-[#806F6F] mb-1">
            <span className="text-xs font-medium">{language === 'ar' ? 'إجمالي البلاغات' : 'Total Grievances'}</span>
            <MessageSquareWarning className="w-4 h-4 text-[#7A2E3A]" />
          </div>
          <p className="text-2xl font-bold font-mono text-[#3F3030]">{complaints.length}</p>
          <span className="text-[11px] text-[#806F6F]">{totalOpen} {language === 'ar' ? 'بانتظار الفرز' : 'open / intake'}</span>
        </div>

        <div className="bg-white border border-[#E8D9D2] rounded-xl p-3.5 shadow-soft">
          <div className="flex items-center justify-between text-[#806F6F] mb-1">
            <span className="text-xs font-medium">{language === 'ar' ? 'قيد التحكيم والمراجعة' : 'Under Review'}</span>
            <Clock className="w-4 h-4 text-[#C9A24D]" />
          </div>
          <p className="text-2xl font-bold font-mono text-[#C9A24D]">{totalUnderReview}</p>
          <span className="text-[11px] text-[#806F6F]">{language === 'ar' ? 'إحالة نشطة للتحقيق' : 'Active investigation'}</span>
        </div>

        <div className="bg-white border border-[#E8D9D2] rounded-xl p-3.5 shadow-soft">
          <div className="flex items-center justify-between text-[#806F6F] mb-1">
            <span className="text-xs font-medium">{language === 'ar' ? 'إجراء تصحيحي مطلوب' : 'Action Required'}</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-700">{totalActionRequired}</p>
          <span className="text-[11px] text-amber-600 font-medium">{language === 'ar' ? 'بانتظار تنفيذ التوصيات' : 'Remediation pending'}</span>
        </div>

        <div className="bg-white border border-[#E8D9D2] rounded-xl p-3.5 shadow-soft">
          <div className="flex items-center justify-between text-[#806F6F] mb-1">
            <span className="text-xs font-medium">{language === 'ar' ? 'تمت معالجتها ومغلقة' : 'Resolved & Settled'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-700">{totalResolved}</p>
          <span className="text-[11px] text-emerald-600 font-medium">{language === 'ar' ? 'قرارات رسمية معتمدة' : 'Formal rulings sealed'}</span>
        </div>

        <div className="bg-white border border-[#E8D9D2] rounded-xl p-3.5 shadow-soft col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[#806F6F] mb-1">
            <span className="text-xs font-medium">{language === 'ar' ? 'حالات طارئة وعاجلة' : 'Urgent Priority'}</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-rose-700">{totalUrgent}</p>
          <span className="text-[11px] text-rose-600 font-medium">{language === 'ar' ? 'أولوية رقابية قصوى' : 'High supervisory queue'}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E8D9D2] rounded-xl p-3 shadow-soft flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute start-3 top-2.5 text-[#806F6F]" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={language === 'ar' ? 'بحث بالرقم، مقدم الشكوى، الموضوع أو التفاصيل...' : 'Search by ticket #, reported by, subject, or description...'}
            className="w-full ps-9 pe-3 py-1.5 text-xs bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] placeholder-[#806F6F]/60 focus:outline-none focus:border-[#7A2E3A]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="text-xs bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg px-2.5 py-1.5 text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
          >
            <option value="ALL">{language === 'ar' ? 'كافة التصنيفات' : 'All Categories'}</option>
            <option value="RESULT_DISPUTE">{language === 'ar' ? 'اعتراض على النتائج' : 'Result Dispute'}</option>
            <option value="EXAMINATION_CONDUCT">{language === 'ar' ? 'سير الاختبار' : 'Exam Conduct'}</option>
            <option value="TECHNICAL_EQUIPMENT">{language === 'ar' ? 'الأجهزة والتقنية' : 'Technical / Equipment'}</option>
            <option value="FACILITY">{language === 'ar' ? 'مرافق الورشة' : 'Facility & Safety'}</option>
            <option value="OTHER">{language === 'ar' ? 'أخرى' : 'Other'}</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="text-xs bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg px-2.5 py-1.5 text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
          >
            <option value="ALL">{language === 'ar' ? 'كافة الحالات' : 'All Statuses'}</option>
            <option value="OPEN">{language === 'ar' ? 'مفتوحة (جديدة)' : 'OPEN'}</option>
            <option value="UNDER_REVIEW">{language === 'ar' ? 'قيد المراجعة والتحكيم' : 'UNDER REVIEW'}</option>
            <option value="ACTION_REQUIRED">{language === 'ar' ? 'إجراء تصحيحي مطلوب' : 'ACTION REQUIRED'}</option>
            <option value="RESOLVED">{language === 'ar' ? 'تم الحل والمعالجة' : 'RESOLVED'}</option>
            <option value="CLOSED">{language === 'ar' ? 'مغلقة نهائياً' : 'CLOSED'}</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={e => setSelectedPriority(e.target.value)}
            className="text-xs bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg px-2.5 py-1.5 text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
          >
            <option value="ALL">{language === 'ar' ? 'كافة الأولويات' : 'All Priorities'}</option>
            <option value="URGENT">URGENT</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>

          {/* Center Filter */}
          {!isCenterAdmin && (
            <select
              value={selectedCenter}
              onChange={e => setSelectedCenter(e.target.value)}
              className="text-xs bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg px-2.5 py-1.5 text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
            >
              <option value="ALL">{language === 'ar' ? 'كافة المراكز' : 'All Centers'}</option>
              {centers.map(c => (
                <option key={c.id} value={c.id}>{c.nameEn}</option>
              ))}
            </select>
          )}

          {(selectedCategory !== 'ALL' || selectedStatus !== 'ALL' || selectedPriority !== 'ALL' || selectedCenter !== 'ALL') && (
            <button
              onClick={() => {
                setSelectedCategory('ALL');
                setSelectedStatus('ALL');
                setSelectedPriority('ALL');
                setSelectedCenter('ALL');
              }}
              className="text-xs text-[#7A2E3A] hover:underline font-semibold"
            >
              {language === 'ar' ? 'إعادة التعيين' : 'Reset'}
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-[#E8D9D2] rounded-xl shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start border-collapse">
            <thead>
              <tr className="border-b border-[#E8D9D2] bg-[#FFFCF8] text-[#806F6F]">
                <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'رقم البلاغ' : 'Ticket #'}</th>
                <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'مقدم الشكوى' : 'Reported By'}</th>
                <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'التصنيف والموضوع' : 'Category & Subject'}</th>
                {!isCenterAdmin && <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المركز' : 'Center'}</th>}
                <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المكلف' : 'Investigator'}</th>
                <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'الأولوية' : 'Priority'}</th>
                <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="py-2.5 px-3 font-semibold text-end">{language === 'ar' ? 'الإجراء' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8D9D2]">
              {filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan={isCenterAdmin ? 7 : 8} className="py-8 text-center text-xs text-[#806F6F]">
                    {language === 'ar' ? 'لا توجد شكاوى أو اعتراضات مسجلة' : 'No grievances or appeals match the filter criteria.'}
                  </td>
                </tr>
              ) : (
                filteredComplaints.map(comp => (
                  <tr key={comp.id} className="hover:bg-[#FFFCF8]/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#7A2E3A]">
                      {comp.complaintNumber}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[#3F3030]">
                      <div className="truncate max-w-[160px]">{comp.reportedBy}</div>
                      <div className="text-[10px] text-[#806F6F] font-mono">{new Date(comp.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-[#3F3030] block truncate max-w-xs">{comp.subject}</span>
                      <span className="text-[10px] text-[#806F6F] block">{getCategoryLabel(comp.category)}</span>
                    </td>
                    {!isCenterAdmin && (
                      <td className="py-2.5 px-3 text-[#3F3030]">
                        {centers.find(c => c.id === comp.centerId)?.nameEn || comp.centerId}
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-xs text-[#3F3030]">
                      <span className="truncate max-w-[130px] block font-medium">
                        {comp.assignedToName || comp.assignedTo || '—'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {getPriorityBadge(comp.priority)}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant={
                        comp.status === 'RESOLVED' || comp.status === 'CLOSED' ? 'success' :
                        comp.status === 'ACTION_REQUIRED' ? 'warning' :
                        comp.status === 'UNDER_REVIEW' || comp.status === 'IN_PROGRESS' ? 'info' : 'maroon'
                      } size="sm">
                        {comp.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-end">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => handleOpenDetail(comp)}
                        leftIcon={<Eye className="w-3 h-3" />}
                      >
                        {language === 'ar' ? 'فحص وتحكيم' : 'Arbitrate'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RESOLUTION / DETAIL MODAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={
          selectedComplaint ? (
            <div className="flex items-center gap-2">
              <span>{language === 'ar' ? 'مراجعة وتحكيم الشكوى' : 'Grievance Review & Arbitration'}</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#F8ECEE] text-[#7A2E3A] border border-[#7A2E3A]/20">
                {selectedComplaint.complaintNumber}
              </span>
            </div>
          ) : 'Complaint Details'
        }
        maxWidth="lg"
      >
        {selectedComplaint && (
          <div className="space-y-4">
            {/* Meta Information Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-[#FFFCF8] border border-[#E8D9D2] text-xs">
              <div>
                <span className="text-[10px] text-[#806F6F] block">{language === 'ar' ? 'مقدم البلاغ' : 'Reported By'}</span>
                <span className="font-bold text-[#3F3030]">{selectedComplaint.reportedBy}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#806F6F] block">{language === 'ar' ? 'المركز' : 'Center'}</span>
                <span className="font-semibold text-[#3F3030]">
                  {centers.find(c => c.id === selectedComplaint.centerId)?.nameEn || 'Center'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#806F6F] block">{language === 'ar' ? 'التصنيف' : 'Category'}</span>
                <span className="font-semibold text-[#7A2E3A]">{getCategoryLabel(selectedComplaint.category)}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#806F6F] block">{language === 'ar' ? 'الأولوية' : 'Priority'}</span>
                <div>{getPriorityBadge(selectedComplaint.priority)}</div>
              </div>
            </div>

            {/* Grievance Description */}
            <div>
              <label className="block text-xs font-bold text-[#3F3030] mb-1">
                {language === 'ar' ? 'موضوع وتفاصيل الشكوى' : 'Grievance Statement & Subject'}
              </label>
              <div className="p-3 rounded-xl border border-[#E8D9D2] bg-white text-xs text-[#3F3030] space-y-1.5">
                <p className="font-bold text-sm text-[#7A2E3A]">{selectedComplaint.subject}</p>
                <p className="leading-relaxed text-[#3F3030]">{selectedComplaint.description}</p>
              </div>
            </div>

            {/* Complaint Transition History Timeline */}
            <div>
              <label className="block text-xs font-bold text-[#3F3030] mb-2 flex items-center justify-between">
                <span>{language === 'ar' ? 'المسار التاريخي للشكوى وسجل الإجراءات' : 'Grievance Audit Trail & Lifecycle History'}</span>
                <span className="text-[10px] text-[#806F6F] font-normal">
                  {selectedComplaint.history?.length || 1} {language === 'ar' ? 'مراحل مسجلة' : 'Recorded Stages'}
                </span>
              </label>
              <div className="p-3 rounded-xl border border-[#E8D9D2] bg-[#FFFCF8] max-h-44 overflow-y-auto space-y-2.5 text-xs">
                {(selectedComplaint.history && selectedComplaint.history.length > 0 ? selectedComplaint.history : [
                  {
                    id: 'init-1',
                    complaintId: selectedComplaint.id,
                    fromStatus: undefined,
                    toStatus: selectedComplaint.status,
                    changedBy: selectedComplaint.reportedBy,
                    changedAt: selectedComplaint.createdAt,
                    comment: 'Initial grievance registered into system'
                  }
                ]).map((entry, idx) => (
                  <div key={entry.id || idx} className="flex items-start gap-2.5 relative pb-2 last:pb-0 border-b border-[#E8D9D2]/60 last:border-0">
                    <div className="w-2 h-2 rounded-full bg-[#7A2E3A] mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-[#3F3030] text-[11px]">{entry.changedBy}</span>
                        <span className="font-mono text-[10px] text-[#806F6F]">
                          {new Date(entry.changedAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {entry.fromStatus && (
                          <>
                            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-stone-100 text-[#806F6F]">{entry.fromStatus}</span>
                            <span className="text-[10px] text-[#806F6F]">→</span>
                          </>
                        )}
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[#F8ECEE] text-[#7A2E3A] font-bold">{entry.toStatus}</span>
                        {entry.assignedTo && (
                          <span className="text-[10px] text-[#C9A24D] font-medium">
                            • Assigned: {entry.assignedTo}
                          </span>
                        )}
                      </div>
                      {entry.comment && (
                        <p className="text-[11px] text-[#3F3030] mt-1 bg-white p-1.5 rounded border border-[#E8D9D2]/70 leading-tight">
                          {entry.comment}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Supervisory Resolution Input & Assignment */}
            <div className="space-y-3 pt-2 border-t border-[#E8D9D2]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Assign Investigator / Admin */}
                <div>
                  <label className="block text-xs font-bold text-[#3F3030] mb-1">
                    {language === 'ar' ? 'إحالة وتكليف مسؤول التحكيم:' : 'Assign Investigator / Reviewer:'}
                  </label>
                  <select
                    value={assignedUser}
                    onChange={e => setAssignedUser(e.target.value)}
                    className="w-full px-2 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-xs font-medium text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
                  >
                    <option value="">{language === 'ar' ? '-- بدون تكليف محدد --' : '-- Unassigned --'}</option>
                    {allUsers.filter(u => ['SUPER_ADMIN', 'CENTER_ADMIN', 'ASSESSOR'].includes(u.role)).map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Status Progression */}
                <div>
                  <label className="block text-xs font-bold text-[#3F3030] mb-1">
                    {language === 'ar' ? 'تحديث مرحلة الشكوى:' : 'Target Complaint Status:'}
                  </label>
                  <select
                    value={resolutionStatus}
                    onChange={e => setResolutionStatus(e.target.value as any)}
                    className="w-full px-2 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-xs font-bold text-[#7A2E3A] focus:outline-none focus:border-[#7A2E3A]"
                  >
                    <option value="OPEN">OPEN (Intake)</option>
                    <option value="UNDER_REVIEW">UNDER REVIEW (Arbitration)</option>
                    <option value="ACTION_REQUIRED">ACTION REQUIRED (Remediation)</option>
                    <option value="RESOLVED">RESOLVED (Decision Ratified)</option>
                    <option value="CLOSED">CLOSED (Final Archive)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3F3030] mb-1">
                  {language === 'ar' ? 'قرار المشرف العام وملاحظات التحكيم (إلزامي عند الحل أو الإغلاق):' : 'Supervisory Adjudication & Remediation Notes (Mandatory for Resolve/Close):'}
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  placeholder={language === 'ar' ? 'اكتب ملاحظات التحكيم والقرار المتخذ (سيتم تدوينه في سجل التدقيق وإشعار المعنيين)...' : 'Document supervisory findings, assessor re-evaluations, or facility remediation steps (logged to immutable audit trail)...'}
                  className="w-full px-3 py-2 text-xs bg-[#FFFCF8] border border-[#E8D9D2] rounded-xl text-[#3F3030] placeholder-[#806F6F]/60 focus:outline-none focus:border-[#7A2E3A]"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8D9D2]">
              <Button variant="secondary" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveResolution}
                leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
              >
                {language === 'ar' ? 'حفظ وتثبيت القرار' : 'Save & Record Ruling'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* CREATE COMPLAINT MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={language === 'ar' ? 'تسجيل بلاغ أو اعتراض جديد' : 'Log New Grievance / Appeal Ticket'}
        maxWidth="md"
      >
        <form onSubmit={handleCreateComplaint} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[#3F3030] font-semibold mb-1">
              {language === 'ar' ? 'مقدم البلاغ (مرشح، مقيم، موظف مركز)' : 'Reporting Party (Candidate / Assessor / Staff)'}
            </label>
            <input
              type="text"
              required
              value={createForm.reportedBy}
              onChange={e => setCreateForm({ ...createForm, reportedBy: e.target.value })}
              placeholder="e.g. Candidate: Ahmad Khan (APRO-SA-92814)"
              className="w-full px-3 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#3F3030] font-semibold mb-1">
                {language === 'ar' ? 'المركز المعني' : 'Test Center'}
              </label>
              {isCenterAdmin ? (
                <div className="w-full px-3 py-1.5 bg-[#FAF8F5] border border-[#E8D9D2] rounded-lg text-[#5C554E] font-medium text-xs">
                  {centers.find(c => c.id === userCenterId)?.nameEn || 'Riyadh Central Technical Hub'}
                </div>
              ) : (
                <select
                  required
                  value={createForm.centerId}
                  onChange={e => setCreateForm({ ...createForm, centerId: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
                >
                  <option value="">{language === 'ar' ? '-- اختر المركز --' : '-- Select Center --'}</option>
                  {centers.map(c => (
                    <option key={c.id} value={c.id}>{language === 'ar' ? c.nameAr : c.nameEn}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-[#3F3030] font-semibold mb-1">
                {language === 'ar' ? 'التصنيف' : 'Category'}
              </label>
              <select
                value={createForm.category}
                onChange={e => setCreateForm({ ...createForm, category: e.target.value as any })}
                className="w-full px-3 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
              >
                <option value="RESULT_DISPUTE">{language === 'ar' ? 'اعتراض على النتائج' : 'Result Dispute'}</option>
                <option value="EXAMINATION_CONDUCT">{language === 'ar' ? 'سير الاختبار' : 'Exam Conduct'}</option>
                <option value="TECHNICAL_EQUIPMENT">{language === 'ar' ? 'الأجهزة والتقنية' : 'Technical / Equipment'}</option>
                <option value="FACILITY">{language === 'ar' ? 'مرافق الورشة' : 'Facility & Safety'}</option>
                <option value="OTHER">{language === 'ar' ? 'أخرى' : 'Other'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#3F3030] font-semibold mb-1">
              {language === 'ar' ? 'الأولوية' : 'Priority Level'}
            </label>
            <select
              value={createForm.priority}
              onChange={e => setCreateForm({ ...createForm, priority: e.target.value as any })}
              className="w-full px-3 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>

          <div>
            <label className="block text-[#3F3030] font-semibold mb-1">
              {language === 'ar' ? 'عنوان الموضوع' : 'Subject Summary'}
            </label>
            <input
              type="text"
              required
              value={createForm.subject}
              onChange={e => setCreateForm({ ...createForm, subject: e.target.value })}
              placeholder="e.g. Disputed rubric scoring for electrical motor wiring task"
              className="w-full px-3 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
            />
          </div>

          <div>
            <label className="block text-[#3F3030] font-semibold mb-1">
              {language === 'ar' ? 'التفاصيل والوقائع' : 'Detailed Narrative'}
            </label>
            <textarea
              rows={3}
              required
              value={createForm.description}
              onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder="Provide context, station number, timestamps, and justification..."
              className="w-full px-3 py-1.5 bg-[#FFFCF8] border border-[#E8D9D2] rounded-lg text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8D9D2]">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsCreateModalOpen(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              {language === 'ar' ? 'تسجيل الشكوى' : 'Submit Ticket'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
