import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, CalendarCheck, Award, ArrowLeft, 
  Edit2, Power, Globe, Mail, Phone, MapPin, CheckCircle2,
  Clock, ShieldAlert, FileText, Layers, CheckCircle, AlertTriangle,
  UserCheck, ShieldCheck, Activity
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { 
  Center, Country, User, Candidate, Assessment, Result, AuditLog, Schedule, Batch 
} from '../types';

export interface CenterDetailsProps {
  centerId: string;
  onBack: () => void;
  onNavigate: (path: string) => void;
  onEdit: (center: Center) => void;
}

export const CenterDetails: React.FC<CenterDetailsProps> = ({
  centerId,
  onBack,
  onNavigate,
  onEdit,
}) => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();

  const [center, setCenter] = useState<Center | null>(null);
  const [country, setCountry] = useState<Country | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  const loadData = () => {
    const allCenters = StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []);
    const found = allCenters.find(c => c.id === centerId) || allCenters[0] || null;
    setCenter(found);

    if (found) {
      const allCountries = StorageService.get<Country[]>(STORAGE_KEYS.COUNTRIES, []);
      const cnt = allCountries.find(c => c.id === found.countryId) || null;
      setCountry(cnt);

      const allUsers = StorageService.get<User[]>(STORAGE_KEYS.USERS, []);
      setUsers(allUsers.filter(u => u.centerId === found.id));

      const allCandidates = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
      setCandidates(allCandidates.filter(c => c.centerId === found.id));

      const allAssessments = StorageService.get<Assessment[]>(STORAGE_KEYS.ASSESSMENTS, []);
      setAssessments(allAssessments.filter(a => a.centerId === found.id));

      const allResults = StorageService.get<Result[]>(STORAGE_KEYS.RESULTS, []);
      setResults(allResults.filter(r => r.centerId === found.id));

      const allSchedules = StorageService.get<Schedule[]>(STORAGE_KEYS.SCHEDULES, []);
      setSchedules(allSchedules.filter(s => s.centerId === found.id));

      const allBatches = StorageService.get<Batch[]>(STORAGE_KEYS.BATCHES, []);
      setBatches(allBatches.filter(b => b.centerId === found.id));

      const allLogs = StorageService.get<AuditLog[]>(STORAGE_KEYS.AUDIT, []);
      setAuditLogs(allLogs.filter(l => 
        l.centerId === found.id || 
        l.details.toLowerCase().includes(found.nameEn.toLowerCase()) ||
        l.details.toLowerCase().includes(found.code.toLowerCase())
      ));
    }
  };

  useEffect(() => {
    loadData();
  }, [centerId]);

  if (!center) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-[#806F6F]">Center not found or collection is empty.</p>
        <Button variant="secondary" size="sm" onClick={onBack} className="mt-4">
          {t.common.back}
        </Button>
      </div>
    );
  }

  const centerAdmin = users.find(u => u.role === 'CENTER_ADMIN');
  const assessors = users.filter(u => u.role === 'ASSESSOR');
  const supportStaff = users.filter(u => u.role === 'SUPPORT_STAFF');

  const passedResults = results.filter(r => r.grade === 'PASS' || r.grade === 'DISTINCTION').length;
  const passRate = results.length > 0 ? Math.round((passedResults / results.length) * 100) : 0;

  const handleToggleStatus = () => {
    const nextStatus: 'ACTIVE' | 'INACTIVE' = center.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated: Center = { ...center, status: nextStatus };
    StorageService.updateItem(STORAGE_KEYS.CENTERS, updated);
    AuditService.log(
      'UPDATE', 
      'CENTER', 
      `Toggled center ${center.nameEn} status to ${nextStatus}`, 
      center.id,
      'SUCCESS'
    );
    setCenter(updated);
    showToast(
      nextStatus === 'ACTIVE' ? 'Assessment Center activated' : 'Assessment Center deactivated', 
      'success'
    );
  };

  const tabs = [
    { id: 'overview', label: language === 'ar' ? 'نظرة عامة' : 'Overview' },
    { id: 'users', label: language === 'ar' ? `المستخدمون (${users.length})` : `Users (${users.length})` },
    { id: 'schedules', label: language === 'ar' ? `الجداول (${schedules.length})` : `Schedules (${schedules.length})` },
    { id: 'batches', label: language === 'ar' ? `الدفعات (${batches.length})` : `Batches (${batches.length})` },
    { id: 'candidates', label: language === 'ar' ? `المترشحون (${candidates.length})` : `Candidates (${candidates.length})` },
    { id: 'assessments', label: language === 'ar' ? `التقييمات (${assessments.length})` : `Assessments (${assessments.length})` },
    { id: 'results', label: language === 'ar' ? `النتائج (${results.length})` : `Results (${results.length})` },
    { id: 'activity', label: language === 'ar' ? `النشاط (${auditLogs.length})` : `Activity (${auditLogs.length})` },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Bar with Back Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7A2E3A] hover:text-[#5A222B] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{t.common.back} {t.centersModule.title}</span>
        </button>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEdit(center)}
            leftIcon={<Edit2 className="w-3.5 h-3.5 text-[#7A2E3A]" />}
          >
            {t.common.edit}
          </Button>

          <Button
            variant={center.status === 'ACTIVE' ? 'secondary' : 'primary'}
            size="sm"
            onClick={handleToggleStatus}
            leftIcon={<Power className="w-3.5 h-3.5" />}
          >
            {center.status === 'ACTIVE' ? (language === 'ar' ? 'تعطيل المركز' : 'Deactivate') : (language === 'ar' ? 'تفعيل المركز' : 'Activate')}
          </Button>
        </div>
      </div>

      {/* Main Header Card */}
      <div className="p-5 bg-white border border-[#E8D9D2] rounded-xl shadow-soft">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#F8ECEE] border border-[#E8D9D2] flex items-center justify-center text-[#7A2E3A] shrink-0">
              <Building2 className="w-7 h-7" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1">
                <h1 className="text-xl font-bold text-[#3F3030]">
                  {language === 'ar' ? center.nameAr : center.nameEn}
                </h1>
                <StatusBadge status={center.status} />
                <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-[#FBF6E8] text-[#91702C] border border-[#C9A24D]/30 rounded">
                  {center.code}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-[#806F6F]">
                <span className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-[#7A2E3A]" />
                  <span>{country?.flagEmoji} {language === 'ar' ? country?.nameAr : country?.nameEn}</span>
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#806F6F]" />
                  <span>{center.city}, {center.address}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-[#806F6F]" />
                  <span>{center.contactEmail}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#806F6F]" />
                  <span>{center.contactPhone || '—'}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-[#FFFCF8] p-3 rounded-lg border border-[#E8D9D2]/70 self-start md:self-auto">
            <div className="text-end">
              <span className="block text-[11px] uppercase tracking-wider text-[#806F6F]">
                {language === 'ar' ? 'القدرة الاستيعابية اليومية' : 'Daily Capacity'}
              </span>
              <span className="text-lg font-bold text-[#3F3030]">
                {center.capacity} <span className="text-xs font-normal text-[#806F6F]">{language === 'ar' ? 'مترشح / يوم' : 'candidates/day'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* 6 Quick Metric Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-[#E8D9D2]/60">
          <div className="bg-[#FFFCF8] p-3 rounded-lg border border-[#E8D9D2]">
            <span className="text-[11px] text-[#806F6F] block">{language === 'ar' ? 'مدير المركز' : 'Center Admin'}</span>
            <span className="text-xs font-semibold text-[#3F3030] truncate block mt-0.5" title={centerAdmin?.name}>
              {centerAdmin ? centerAdmin.name : (language === 'ar' ? 'غير معين' : 'Not Assigned')}
            </span>
          </div>

          <div className="bg-[#FFFCF8] p-3 rounded-lg border border-[#E8D9D2]">
            <span className="text-[11px] text-[#806F6F] block">{language === 'ar' ? 'المقيمون المعتمدون' : 'Active Assessors'}</span>
            <span className="text-base font-bold text-[#7A2E3A] block mt-0.5">
              {assessors.length}
            </span>
          </div>

          <div className="bg-[#FFFCF8] p-3 rounded-lg border border-[#E8D9D2]">
            <span className="text-[11px] text-[#806F6F] block">{language === 'ar' ? 'المترشحون' : 'Candidates'}</span>
            <span className="text-base font-bold text-[#3F3030] block mt-0.5">
              {candidates.length}
            </span>
          </div>

          <div className="bg-[#FFFCF8] p-3 rounded-lg border border-[#E8D9D2]">
            <span className="text-[11px] text-[#806F6F] block">{language === 'ar' ? 'الدفعات النشطة' : 'Active Batches'}</span>
            <span className="text-base font-bold text-[#3F3030] block mt-0.5">
              {batches.filter(b => b.status === 'ACTIVE' || b.status === 'PENDING').length}
            </span>
          </div>

          <div className="bg-[#FFFCF8] p-3 rounded-lg border border-[#E8D9D2]">
            <span className="text-[11px] text-[#806F6F] block">{language === 'ar' ? 'التقييمات' : 'Assessments'}</span>
            <span className="text-base font-bold text-[#3F3030] block mt-0.5">
              {assessments.length}
            </span>
          </div>

          <div className="bg-[#FFFCF8] p-3 rounded-lg border border-[#E8D9D2]">
            <span className="text-[11px] text-[#806F6F] block">{language === 'ar' ? 'نسبة النجاح' : 'Pass Rate'}</span>
            <span className="text-base font-bold text-[#2E6F40] block mt-0.5">
              {passRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      <div className="bg-white border border-[#E8D9D2] rounded-xl p-5 shadow-soft min-h-[380px]">
        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Technical Specifications */}
              <div className="bg-[#FFFCF8] p-4 rounded-xl border border-[#E8D9D2] space-y-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A2E3A] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{language === 'ar' ? 'بيانات الاعتماد والمواصفات الفنية' : 'Facility Accreditation & Capacity'}</span>
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-[#E8D9D2]/60">
                    <span className="text-[#806F6F]">{language === 'ar' ? 'رمز المركز الدولي' : 'Center Code'}</span>
                    <span className="font-mono font-semibold text-[#3F3030]">{center.code}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#E8D9D2]/60">
                    <span className="text-[#806F6F]">{language === 'ar' ? 'الدولة التابعة' : 'Country'}</span>
                    <span className="font-medium text-[#3F3030]">{country?.flagEmoji} {country?.nameEn}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#E8D9D2]/60">
                    <span className="text-[#806F6F]">{language === 'ar' ? 'الطاقة الاستيعابية اليومية' : 'Daily Testing Capacity'}</span>
                    <span className="font-semibold text-[#3F3030]">{center.capacity} candidates</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#E8D9D2]/60">
                    <span className="text-[#806F6F]">{language === 'ar' ? 'حالة التفتيش والجاهزية' : 'Inspection Readiness'}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2E6F40]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'معتمد ومطابق للمعايير' : 'Accredited & Inspected'}</span>
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-[#806F6F]">{language === 'ar' ? 'تاريخ التسجيل بالمنصة' : 'Registration Date'}</span>
                    <span className="font-medium text-[#3F3030]">{center.createdAt || '2025-01-10'}</span>
                  </div>
                </div>
              </div>

              {/* Physical Location & Contact */}
              <div className="bg-[#FFFCF8] p-4 rounded-xl border border-[#E8D9D2] space-y-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A2E3A] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>{language === 'ar' ? 'الموقع الجغرافي ومعلومات الاتصال' : 'Location & Operational Contact'}</span>
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-[#E8D9D2]/60">
                    <span className="text-[#806F6F]">{language === 'ar' ? 'المدينة' : 'City'}</span>
                    <span className="font-medium text-[#3F3030]">{center.city}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#E8D9D2]/60">
                    <span className="text-[#806F6F]">{language === 'ar' ? 'العنوان الفعلي' : 'Address'}</span>
                    <span className="font-medium text-[#3F3030] text-end">{center.address}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#E8D9D2]/60">
                    <span className="text-[#806F6F]">{language === 'ar' ? 'البريد الإلكتروني المعتمد' : 'Official Email'}</span>
                    <a href={`mailto:${center.contactEmail}`} className="font-mono text-[#7A2E3A] hover:underline">
                      {center.contactEmail}
                    </a>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-[#806F6F]">{language === 'ar' ? 'هاتف المركز المباشر' : 'Direct Line'}</span>
                    <span className="font-mono text-[#3F3030]">{center.contactPhone || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Supported Technical Occupations */}
            <div className="bg-[#FFFCF8] p-4 rounded-xl border border-[#E8D9D2]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A2E3A] mb-3 flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                <span>{language === 'ar' ? 'المهن المعتمدة للتقييم في هذا المركز' : 'Accredited Assessment Occupations'}</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {center.occupationsSupported.map((occ, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-[#7A2E3A] border border-[#E8D9D2] shadow-xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-[#C9A24D] me-1.5" />
                    {occ}
                  </span>
                ))}
              </div>
            </div>

            {/* Operational Notice / Governance Banner */}
            <div className="p-3.5 rounded-lg bg-[#F8ECEE]/60 border border-[#E8D9D2] flex items-start gap-3">
              <ShieldAlert className="w-4 h-4 text-[#7A2E3A] shrink-0 mt-0.5" />
              <div className="text-xs text-[#3F3030] space-y-1">
                <span className="font-semibold block">
                  {language === 'ar' ? 'إشراف الحساب القطري وإدارة المركز' : 'Country Governance & Center Administration Rule'}
                </span>
                <p className="text-[#806F6F] leading-relaxed">
                  {language === 'ar'
                    ? 'يتم تعيين وإدارة هذا المركز من قِبل الحساب القطري المعتمد. ويتحمل مدير المركز مسؤولية تنظيم المقيمين، الدفعات، والتحقق من التجهيزات الفنية والمعايرة للأجهزة العملية.'
                    : 'This center operates under the jurisdiction of the Country Account. The Center Admin oversees active assessors, daily batches, and ensures all technical workshop apparatus and safety equipment meet accredited standards.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2. USERS TAB */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#3F3030]">
                  {language === 'ar' ? 'مستخدمو المركز والمعتمدون' : 'Center Users & Assessors'}
                </h3>
                <p className="text-xs text-[#806F6F]">
                  {language === 'ar' ? 'قائمة مدير المركز، المقيمين الفنيين، وطاقم الدعم' : 'Center Admin, Technical Assessors, and Support Staff allocated to this facility'}
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate(`/users?action=create&centerId=${center.id}&countryId=${center.countryId}`)}
                leftIcon={<Users className="w-3.5 h-3.5" />}
              >
                {language === 'ar' ? 'إضافة مستخدم للمركز' : 'Assign / Add User'}
              </Button>
            </div>

            {users.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#806F6F]">
                {language === 'ar' ? 'لا يوجد مستخدمون مسجلون لهذا المركز حالياً' : 'No users currently assigned to this center.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="border-b border-[#E8D9D2] bg-[#FFFCF8] text-[#806F6F]">
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'الاسم' : 'Name'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'الدور الوظيفي' : 'Role'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'الهاتف' : 'Phone'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                      <th className="py-2.5 px-3 font-semibold text-end">{language === 'ar' ? 'الإجراء' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8D9D2]">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-[#FFFCF8]/80 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-[#3F3030]">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#F8ECEE] text-[#7A2E3A] flex items-center justify-center font-bold text-xs">
                              {u.name.charAt(0)}
                            </div>
                            <span>{u.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            u.role === 'CENTER_ADMIN' ? 'bg-[#F8ECEE] text-[#7A2E3A] border border-[#7A2E3A]/20' :
                            u.role === 'ASSESSOR' ? 'bg-[#FBF6E8] text-[#91702C] border border-[#C9A24D]/30' :
                            'bg-stone-100 text-stone-700'
                          }`}>
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[#806F6F] font-mono">{u.email}</td>
                        <td className="py-2.5 px-3 text-[#806F6F]">{u.phone || '—'}</td>
                        <td className="py-2.5 px-3"><StatusBadge status={u.status} /></td>
                        <td className="py-2.5 px-3 text-end">
                          <button
                            onClick={() => onNavigate(`/users?view=details&id=${u.id}`)}
                            className="text-xs text-[#7A2E3A] hover:underline font-medium"
                          >
                            {language === 'ar' ? 'عرض' : 'View'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 3. SCHEDULES TAB */}
        {activeTab === 'schedules' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#3F3030]">
                  {language === 'ar' ? 'الجداول الزمنية للتقييم' : 'Center Assessment Schedules'}
                </h3>
                <p className="text-xs text-[#806F6F]">
                  {language === 'ar' ? 'جلسات التقييم المجدولة في هذا المركز' : 'Assessment calendar and scheduled testing sessions for this facility'}
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate(`/schedules?action=create&centerId=${center.id}`)}
                leftIcon={<CalendarCheck className="w-3.5 h-3.5" />}
              >
                {language === 'ar' ? 'إضافة جدول' : 'Create Schedule'}
              </Button>
            </div>

            {schedules.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#806F6F]">
                {language === 'ar' ? 'لا توجد جداول زمنية مسجلة لهذا المركز' : 'No schedules registered for this center.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="border-b border-[#E8D9D2] bg-[#FFFCF8] text-[#806F6F]">
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'الرمز' : 'Code'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المهنة' : 'Occupation'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'الفترة' : 'Time Slot'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المقاعد' : 'Seats'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                      <th className="py-2.5 px-3 font-semibold text-end">{language === 'ar' ? 'الإجراء' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8D9D2]">
                    {schedules.map(sch => (
                      <tr key={sch.id} className="hover:bg-[#FFFCF8]/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-semibold text-[#7A2E3A]">{sch.code}</td>
                        <td className="py-2.5 px-3 font-medium text-[#3F3030]">{sch.occupation}</td>
                        <td className="py-2.5 px-3 text-[#806F6F]">{sch.date}</td>
                        <td className="py-2.5 px-3 text-[#806F6F]">{sch.timeSlot}</td>
                        <td className="py-2.5 px-3 text-[#3F3030] font-semibold">{sch.assignedCandidates} / {sch.totalSeats}</td>
                        <td className="py-2.5 px-3"><StatusBadge status={sch.status} /></td>
                        <td className="py-2.5 px-3 text-end">
                          <button
                            onClick={() => onNavigate(`/schedules?id=${sch.id}`)}
                            className="text-xs text-[#7A2E3A] hover:underline font-medium"
                          >
                            {language === 'ar' ? 'التفاصيل' : 'Details'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 4. BATCHES TAB */}
        {activeTab === 'batches' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#3F3030]">
                  {language === 'ar' ? 'دفعات التقييم بالمركز' : 'Center Assessment Batches'}
                </h3>
                <p className="text-xs text-[#806F6F]">
                  {language === 'ar' ? 'مجموعات المترشحين حسب المهنة والتاريخ' : 'Candidate cohorts organized by occupation and assigned time slots'}
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate(`/batches?action=create&centerId=${center.id}`)}
                leftIcon={<Layers className="w-3.5 h-3.5" />}
              >
                {language === 'ar' ? 'إنشاء دفعة' : 'Create Batch'}
              </Button>
            </div>

            {batches.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#806F6F]">
                {language === 'ar' ? 'لا توجد دفعات مسجلة لهذا المركز' : 'No batches registered for this center.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="border-b border-[#E8D9D2] bg-[#FFFCF8] text-[#806F6F]">
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'رمز الدفعة' : 'Batch Code'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المهنة' : 'Occupation'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المترشحون' : 'Candidates'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                      <th className="py-2.5 px-3 font-semibold text-end">{language === 'ar' ? 'الإجراء' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8D9D2]">
                    {batches.map(b => (
                      <tr key={b.id} className="hover:bg-[#FFFCF8]/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-semibold text-[#7A2E3A]">{b.batchNumber}</td>
                        <td className="py-2.5 px-3 font-medium text-[#3F3030]">{b.occupation}</td>
                        <td className="py-2.5 px-3 text-[#3F3030] font-semibold">{b.candidateCount}</td>
                        <td className="py-2.5 px-3 text-[#806F6F]">{b.startDate} - {b.endDate}</td>
                        <td className="py-2.5 px-3"><StatusBadge status={b.status} /></td>
                        <td className="py-2.5 px-3 text-end">
                          <button
                            onClick={() => onNavigate(`/batches?id=${b.id}`)}
                            className="text-xs text-[#7A2E3A] hover:underline font-medium"
                          >
                            {language === 'ar' ? 'التفاصيل' : 'Details'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 5. CANDIDATES TAB */}
        {activeTab === 'candidates' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#3F3030]">
                  {language === 'ar' ? 'المترشحون المسجلون بالمركز' : 'Center Candidates'}
                </h3>
                <p className="text-xs text-[#806F6F]">
                  {language === 'ar' ? 'المترشحون المسجلون لجلسات التقييم في هذا المركز' : 'Candidates enrolled or assessed at this facility'}
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate(`/candidates?centerId=${center.id}`)}
                leftIcon={<Users className="w-3.5 h-3.5" />}
              >
                {language === 'ar' ? 'عرض في سجل المترشحين' : 'View Full Registry'}
              </Button>
            </div>

            {candidates.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#806F6F]">
                {language === 'ar' ? 'لا يوجد مترشحون مسجلون بهذا المركز' : 'No candidates registered at this center.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="border-b border-[#E8D9D2] bg-[#FFFCF8] text-[#806F6F]">
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'رقم APRO' : 'APRO ID'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'اسم المترشح' : 'Candidate Name'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المهنة' : 'Occupation'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'الجواز / الهوية' : 'Passport / ID'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                      <th className="py-2.5 px-3 font-semibold text-end">{language === 'ar' ? 'الإجراء' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8D9D2]">
                    {candidates.map(c => (
                      <tr key={c.id} className="hover:bg-[#FFFCF8]/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-semibold text-[#7A2E3A]">{c.aproReference}</td>
                        <td className="py-2.5 px-3 font-semibold text-[#3F3030]">{language === 'ar' ? c.fullNameAr : c.fullNameEn}</td>
                        <td className="py-2.5 px-3 text-[#806F6F]">{c.occupation}</td>
                        <td className="py-2.5 px-3 text-[#806F6F] font-mono">{c.passportNumber}</td>
                        <td className="py-2.5 px-3"><StatusBadge status={c.status} /></td>
                        <td className="py-2.5 px-3 text-end">
                          <button
                            onClick={() => onNavigate(`/candidates?id=${c.id}`)}
                            className="text-xs text-[#7A2E3A] hover:underline font-medium"
                          >
                            {language === 'ar' ? 'عرض' : 'View'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 6. ASSESSMENTS TAB */}
        {activeTab === 'assessments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#3F3030]">
                  {language === 'ar' ? 'جلسات وسجلات التقييم' : 'Center Assessments'}
                </h3>
                <p className="text-xs text-[#806F6F]">
                  {language === 'ar' ? 'سجل جلسات التقييم العملي والنظري' : 'Execution tracking for practical tasks and scoring progress'}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onNavigate(`/assessments?centerId=${center.id}`)}
              >
                {language === 'ar' ? 'عرض في شاشة التقييمات' : 'Go to Assessments'}
              </Button>
            </div>

            {assessments.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#806F6F]">
                {language === 'ar' ? 'لا توجد جلسات تقييم منشأة لهذا المركز' : 'No assessments found for this center.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="border-b border-[#E8D9D2] bg-[#FFFCF8] text-[#806F6F]">
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'الرمز' : 'Code'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المترشح' : 'Candidate'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المقيم' : 'Assessor'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'الدرجة' : 'Score'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                      <th className="py-2.5 px-3 font-semibold text-end">{language === 'ar' ? 'الإجراء' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8D9D2]">
                    {assessments.map(a => (
                      <tr key={a.id} className="hover:bg-[#FFFCF8]/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-semibold text-[#7A2E3A]">{a.id.slice(-6).toUpperCase()}</td>
                        <td className="py-2.5 px-3 font-medium text-[#3F3030]">{a.candidateName || a.candidateId}</td>
                        <td className="py-2.5 px-3 text-[#806F6F]">{a.assessorName || a.assessorId}</td>
                        <td className="py-2.5 px-3 text-[#806F6F]">{a.date}</td>
                        <td className="py-2.5 px-3 font-bold text-[#3F3030]">{a.totalScore !== undefined ? `${a.totalScore}%` : '—'}</td>
                        <td className="py-2.5 px-3"><StatusBadge status={a.status} /></td>
                        <td className="py-2.5 px-3 text-end">
                          <button
                            onClick={() => onNavigate(`/assessments?id=${a.id}`)}
                            className="text-xs text-[#7A2E3A] hover:underline font-medium"
                          >
                            {language === 'ar' ? 'عرض' : 'View'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 7. RESULTS TAB */}
        {activeTab === 'results' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#3F3030]">
                  {language === 'ar' ? 'نتائج التقييم والاعتماد' : 'Assessment Results & Certification'}
                </h3>
                <p className="text-xs text-[#806F6F]">
                  {language === 'ar' ? 'النتائج النهائية وحالة القفل الرقابي' : 'Final verified scores, pass/fail status, and locked records'}
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate(`/results?centerId=${center.id}`)}
                leftIcon={<Award className="w-3.5 h-3.5" />}
              >
                {language === 'ar' ? 'شاشة النتائج' : 'Open Results Module'}
              </Button>
            </div>

            {results.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#806F6F]">
                {language === 'ar' ? 'لا توجد نتائج مسجلة لهذا المركز حتى الآن' : 'No results recorded for this center yet.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="border-b border-[#E8D9D2] bg-[#FFFCF8] text-[#806F6F]">
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المترشح' : 'Candidate'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المهنة' : 'Occupation'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'العملي' : 'Practical'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'النظري' : 'Theory'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'النتيجة' : 'Result'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'حالة القفل' : 'Lock Status'}</th>
                      <th className="py-2.5 px-3 font-semibold text-end">{language === 'ar' ? 'الإجراء' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8D9D2]">
                    {results.map(r => (
                      <tr key={r.id} className="hover:bg-[#FFFCF8]/80 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-[#3F3030] block">{r.candidateName || r.candidateId}</span>
                          <span className="font-mono text-[10px] text-[#806F6F]">{r.aproReference || '—'}</span>
                        </td>
                        <td className="py-2.5 px-3 text-[#806F6F]">{r.occupation || '—'}</td>
                        <td className="py-2.5 px-3 font-mono font-medium">{r.practicalScore !== undefined ? `${r.practicalScore}%` : '—'}</td>
                        <td className="py-2.5 px-3 font-mono font-medium">{r.theoryScore !== undefined ? `${r.theoryScore}%` : '—'}</td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.grade === 'PASS' || r.grade === 'DISTINCTION'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {r.grade}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {r.status === 'LOCKED' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#91702C] bg-[#FBF6E8] border border-[#C9A24D]/30 px-2 py-0.5 rounded">
                              <ShieldCheck className="w-3 h-3" />
                              <span>{language === 'ar' ? 'مقفل رقابياً' : 'LOCKED'}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-stone-500 font-medium">{r.status}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-end">
                          <button
                            onClick={() => onNavigate(`/results?id=${r.id}`)}
                            className="text-xs text-[#7A2E3A] hover:underline font-medium"
                          >
                            {language === 'ar' ? 'فحص' : 'Inspect'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 8. ACTIVITY / AUDIT TAB */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[#3F3030]">
                {language === 'ar' ? 'سجل التدقيق والنشاط بالمركز' : 'Center Audit Trail & Activity Logs'}
              </h3>
              <p className="text-xs text-[#806F6F]">
                {language === 'ar' ? 'سجل العمليات الإدارية والتقييمية المسجلة لهذا المركز' : 'Immutable audit trail of administrative, scoring, and allocation activities'}
              </p>
            </div>

            {auditLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#806F6F]">
                {language === 'ar' ? 'لا توجد سجلات نشاط مرتبطة بهذا المركز' : 'No audit entries recorded for this center.'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {auditLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg border border-[#E8D9D2] bg-[#FFFCF8] hover:bg-white transition-colors flex items-start gap-3"
                  >
                    <div className="p-2 rounded bg-[#F8ECEE] text-[#7A2E3A] shrink-0 mt-0.5">
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#3F3030]">{log.userName}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                            {log.action}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#806F6F] font-mono">{log.timestamp}</span>
                      </div>
                      <p className="text-xs text-[#806F6F] mt-1">{log.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
