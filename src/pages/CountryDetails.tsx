import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, CalendarCheck, Award, ArrowLeft, 
  Edit2, Power, Globe, Mail, Phone, MapPin, CheckCircle2,
  Clock, ShieldAlert, FileText, ChevronRight, Eye
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Tabs } from '../components/ui/Tabs';
import { 
  Country, Center, User, Candidate, Assessment, Result, AuditLog 
} from '../types';

export interface CountryDetailsProps {
  countryId: string;
  onBack: () => void;
  onNavigate: (path: string) => void;
  onEdit: (country: Country) => void;
}

export const CountryDetails: React.FC<CountryDetailsProps> = ({
  countryId,
  onBack,
  onNavigate,
  onEdit
}) => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();

  const [country, setCountry] = useState<Country | null>(null);
  const [centers, setCenters] = useState<Center[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  const loadData = () => {
    const allCountries = StorageService.get<Country[]>(STORAGE_KEYS.COUNTRIES, []);
    const found = allCountries.find(c => c.id === countryId) || allCountries[0] || null;
    setCountry(found);

    if (found) {
      const allCenters = StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []);
      const countryCenters = allCenters.filter(c => c.countryId === found.id);
      setCenters(countryCenters);

      const centerIds = countryCenters.map(c => c.id);

      const allUsers = StorageService.get<User[]>(STORAGE_KEYS.USERS, []);
      const countryUsers = allUsers.filter(u => u.countryId === found.id || (u.centerId && centerIds.includes(u.centerId)));
      setUsers(countryUsers);

      const allCandidates = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
      const countryCandidates = allCandidates.filter(c => c.countryId === found.id || centerIds.includes(c.centerId));
      setCandidates(countryCandidates);

      const allAssessments = StorageService.get<Assessment[]>(STORAGE_KEYS.ASSESSMENTS, []);
      const countryAssessments = allAssessments.filter(a => centerIds.includes(a.centerId) || a.countryId === found.id);
      setAssessments(countryAssessments);

      const allResults = StorageService.get<Result[]>(STORAGE_KEYS.RESULTS, []);
      const countryResults = allResults.filter(r => r.countryId === found.id || centerIds.includes(r.centerId || ''));
      setResults(countryResults);

      const allLogs = StorageService.get<AuditLog[]>(STORAGE_KEYS.AUDIT, []);
      const countryLogs = allLogs.filter(l => l.countryId === found.id || l.details.toLowerCase().includes(found.nameEn.toLowerCase()));
      setAuditLogs(countryLogs);
    }
  };

  useEffect(() => {
    loadData();
  }, [countryId]);

  if (!country) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-[#806F6F]">Country not found or collection is empty.</p>
        <Button variant="secondary" size="sm" onClick={onBack} className="mt-4">
          {t.common.back}
        </Button>
      </div>
    );
  }

  const countryAccountUser = users.find(u => (u.role === 'COUNTRY_ACCOUNT' || u.role === 'COUNTRY_ADMIN') && u.countryId === country.id);
  const centerAdminsCount = users.filter(u => u.role === 'CENTER_ADMIN').length;
  const assessorsCount = users.filter(u => u.role === 'ASSESSOR').length;

  const handleToggleStatus = () => {
    const updatedStatus: 'ACTIVE' | 'INACTIVE' = country.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated: Country = { ...country, status: updatedStatus };
    StorageService.updateItem(STORAGE_KEYS.COUNTRIES, updated);
    AuditService.log(
      updatedStatus === 'ACTIVE' ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      'COUNTRY',
      `Changed status of country ${country.nameEn} to ${updatedStatus}`,
      country.id
    );
    setCountry(updated);
    showToast(t.toasts.updatedSuccess, 'success');
  };

  const tabs = [
    { id: 'overview', label: t.countriesModule.overviewTab },
    { id: 'centers', label: `${t.countriesModule.centersTab} (${centers.length})` },
    { id: 'users', label: `${t.countriesModule.usersTab} (${users.length})` },
    { id: 'reports', label: t.countriesModule.reportsTab },
    { id: 'activity', label: t.countriesModule.activityTab },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-1 rounded-md text-[#806F6F] hover:text-[#3F3030] hover:bg-[#F8ECEE] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-2xl">{country.flagEmoji}</span>
            <span>{language === 'ar' ? country.nameAr : country.nameEn}</span>
            <StatusBadge status={country.status} />
          </div>
        }
        subtitle={`ISO: ${country.code} • ${country.region} • National Authority Directorate`}
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: t.countriesModule.title, href: '/countries' },
          { label: language === 'ar' ? country.nameAr : country.nameEn },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEdit(country)}
              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
            >
              {t.common.edit}
            </Button>
            <Button
              variant={country.status === 'ACTIVE' ? 'secondary' : 'primary'}
              size="sm"
              onClick={handleToggleStatus}
              leftIcon={<Power className="w-3.5 h-3.5" />}
            >
              {country.status === 'ACTIVE' ? t.common.deactivate : t.common.activate}
            </Button>
          </div>
        }
      />

      {/* Section 71 Example Summary Blocks */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="p-3 rounded-lg border border-[#E8D9D2] bg-white text-xs">
          <span className="text-[#806F6F] block text-[11px]">Country Account</span>
          <span className="font-bold text-[#3F3030] truncate block mt-0.5">
            {countryAccountUser ? countryAccountUser.name : 'Unassigned'}
          </span>
          <span className="text-[10px] text-emerald-700 font-medium">
            {countryAccountUser?.status || 'Pending'}
          </span>
        </div>
        <div className="p-3 rounded-lg border border-[#E8D9D2] bg-white text-xs">
          <span className="text-[#806F6F] block text-[11px]">{t.centersModule.title}</span>
          <span className="text-lg font-bold text-[#7A2E3A] block">{centers.length}</span>
          <span className="text-[10px] text-[#806F6F]">Hubs operational</span>
        </div>
        <div className="p-3 rounded-lg border border-[#E8D9D2] bg-white text-xs">
          <span className="text-[#806F6F] block text-[11px]">{t.usersModule.centerAdmins}</span>
          <span className="text-lg font-bold text-[#3F3030] block">{centerAdminsCount}</span>
          <span className="text-[10px] text-[#806F6F]">Facility managers</span>
        </div>
        <div className="p-3 rounded-lg border border-[#E8D9D2] bg-white text-xs">
          <span className="text-[#806F6F] block text-[11px]">{t.usersModule.assessors}</span>
          <span className="text-lg font-bold text-[#3F3030] block">{assessorsCount}</span>
          <span className="text-[10px] text-[#806F6F]">Certified evaluators</span>
        </div>
        <div className="p-3 rounded-lg border border-[#E8D9D2] bg-white text-xs">
          <span className="text-[#806F6F] block text-[11px]">{t.candidatesModule.title}</span>
          <span className="text-lg font-bold text-[#7A2E3A] block">{candidates.length}</span>
          <span className="text-[10px] text-[#806F6F]">Registered roster</span>
        </div>
        <div className="p-3 rounded-lg border border-[#E8D9D2] bg-white text-xs">
          <span className="text-[#806F6F] block text-[11px]">{t.resultsModule.title}</span>
          <span className="text-lg font-bold text-[#D4AF37] block">{results.length}</span>
          <span className="text-[10px] text-[#806F6F]">Submitted results</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-lg border border-[#E8D9D2] bg-white space-y-4 shadow-[0_1px_3px_rgba(63,48,48,0.03)]">
            <h3 className="text-sm font-bold text-[#7A2E3A] uppercase tracking-wider border-b border-[#E8D9D2] pb-2">
              National Authority Information
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-[#E8D9D2]/40">
                <span className="text-[#806F6F]">English Name</span>
                <span className="font-semibold text-[#3F3030]">{country.nameEn}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E8D9D2]/40">
                <span className="text-[#806F6F]">Arabic Name</span>
                <span className="font-semibold text-[#3F3030] font-arabic" dir="rtl">{country.nameAr}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E8D9D2]/40">
                <span className="text-[#806F6F]">ISO 3166-1 Code</span>
                <span className="font-mono font-bold text-[#7A2E3A]">{country.code}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E8D9D2]/40">
                <span className="text-[#806F6F]">Region</span>
                <span className="text-[#3F3030]">{country.region}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#806F6F]">Registration Date</span>
                <span className="font-mono text-[#806F6F]">{new Date(country.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-lg border border-[#E8D9D2] bg-white space-y-4 shadow-[0_1px_3px_rgba(63,48,48,0.03)]">
            <div className="flex items-center justify-between border-b border-[#E8D9D2] pb-2">
              <h3 className="text-sm font-bold text-[#7A2E3A] uppercase tracking-wider">
                Country Admin & Authority Contact
              </h3>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onNavigate(countryAccountUser ? `/users?role=COUNTRY_ACCOUNT&id=${countryAccountUser.id}` : `/users?role=COUNTRY_ACCOUNT&action=create&countryId=${country.id}`)}
                className="text-[#7A2E3A] hover:text-[#5A222B] text-xs font-semibold"
              >
                {countryAccountUser ? 'Manage Admin →' : '+ Provision Admin'}
              </Button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-[#E8D9D2]/40">
                <span className="text-[#806F6F]">Contact Official</span>
                <span className="font-semibold text-[#3F3030]">{country.contactPerson}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E8D9D2]/40">
                <span className="text-[#806F6F]">Official Email</span>
                <span className="font-mono text-[#7A2E3A]">{country.contactEmail}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E8D9D2]/40 items-center">
                <span className="text-[#806F6F]">Assigned Country Admin</span>
                <div className="text-end">
                  <span className="font-semibold text-[#3F3030] block">
                    {countryAccountUser ? `${countryAccountUser.name}` : 'Not Provisioned'}
                  </span>
                  {countryAccountUser && (
                    <span className="text-[10px] text-[#806F6F] font-mono block">
                      {countryAccountUser.email} • {countryAccountUser.status}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#806F6F]">Accreditation Mandate</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approved & Ratified
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Centers strictly belonging to this country */}
      {activeTab === 'centers' && (
        <div className="border border-[#E8D9D2] rounded-lg bg-white overflow-hidden shadow-[0_1px_3px_rgba(63,48,48,0.03)]">
          <div className="p-3.5 bg-[#FFFCF8] border-b border-[#E8D9D2] flex justify-between items-center">
            <span className="text-xs font-bold text-[#3F3030]">
              Accredited Centers under {country.nameEn} ({centers.length})
            </span>
            <Button
              variant="primary"
              size="xs"
              onClick={() => onNavigate(`/centers?action=create&countryId=${country.id}`)}
            >
              + {t.centersModule.addNew}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E8D9D2] bg-stone-50/50 text-[#806F6F] font-semibold">
                  <th className="py-2.5 px-3 text-start">Center Name</th>
                  <th className="py-2.5 px-3 text-start">Code</th>
                  <th className="py-2.5 px-3 text-start">City</th>
                  <th className="py-2.5 px-3 text-start">Capacity</th>
                  <th className="py-2.5 px-3 text-start">Status</th>
                  <th className="py-2.5 px-3 text-end">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8D9D2] text-[#3F3030]">
                {centers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-[#806F6F]">
                      No assessment centers registered yet under this country.
                    </td>
                  </tr>
                ) : (
                  centers.map(ctr => (
                    <tr key={ctr.id} className="hover:bg-[#FFFCF8] transition-colors">
                      <td className="py-2.5 px-3 font-semibold">
                        <div>{language === 'ar' ? ctr.nameAr : ctr.nameEn}</div>
                        <div className="text-[10px] text-[#806F6F]">{ctr.address}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#7A2E3A] font-bold">{ctr.code}</td>
                      <td className="py-2.5 px-3">{ctr.city}</td>
                      <td className="py-2.5 px-3 font-medium">{ctr.capacity} seats/day</td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={ctr.status} />
                      </td>
                      <td className="py-2.5 px-3 text-end">
                        <Button
                          variant="primary"
                          size="xs"
                          onClick={() => onNavigate(`/centers?view=details&id=${ctr.id}`)}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                          title={language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                        >
                          {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Users in this country */}
      {activeTab === 'users' && (
        <div className="border border-[#E8D9D2] rounded-lg bg-white overflow-hidden shadow-[0_1px_3px_rgba(63,48,48,0.03)]">
          <div className="p-3.5 bg-[#FFFCF8] border-b border-[#E8D9D2] flex justify-between items-center">
            <span className="text-xs font-bold text-[#3F3030]">
              Personnel and Officials in {country.nameEn} ({users.length})
            </span>
            <Button
              variant="secondary"
              size="xs"
              onClick={() => onNavigate(`/users?countryId=${country.id}`)}
            >
              {t.common.view} in User Management
            </Button>
          </div>
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E8D9D2] bg-stone-50/50 text-[#806F6F] font-semibold">
                <th className="py-2.5 px-3 text-start">Name</th>
                <th className="py-2.5 px-3 text-start">Role</th>
                <th className="py-2.5 px-3 text-start">Email</th>
                <th className="py-2.5 px-3 text-start">Status</th>
                <th className="py-2.5 px-3 text-start">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8D9D2]">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-[#FFFCF8]">
                  <td className="py-2.5 px-3 font-semibold text-[#3F3030]">
                    {u.name}
                    {u.username && <span className="text-[10px] text-[#806F6F] block font-mono">@{u.username}</span>}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F8ECEE] text-[#7A2E3A]">
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[#806F6F]">{u.email}</td>
                  <td className="py-2.5 px-3"><StatusBadge status={u.status} /></td>
                  <td className="py-2.5 px-3 text-[11px] text-[#806F6F]">
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Active'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Assessments */}
      {activeTab === 'assessments' && (
        <div className="border border-[#E8D9D2] rounded-lg bg-white overflow-hidden shadow-[0_1px_3px_rgba(63,48,48,0.03)]">
          <div className="p-3.5 bg-[#FFFCF8] border-b border-[#E8D9D2] flex justify-between items-center">
            <span className="text-xs font-bold text-[#3F3030]">
              Assessment Sessions in {country.nameEn} ({assessments.length})
            </span>
            <Button variant="ghost" size="xs" onClick={() => onNavigate('/assessments')}>
              {t.common.view} All Assessments →
            </Button>
          </div>
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E8D9D2] bg-stone-50/50 text-[#806F6F] font-semibold">
                <th className="py-2.5 px-3 text-start">Candidate</th>
                <th className="py-2.5 px-3 text-start">Occupation</th>
                <th className="py-2.5 px-3 text-start">Date</th>
                <th className="py-2.5 px-3 text-start">Theory</th>
                <th className="py-2.5 px-3 text-start">Practical</th>
                <th className="py-2.5 px-3 text-start">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8D9D2]">
              {assessments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#806F6F]">No assessments recorded in this jurisdiction.</td>
                </tr>
              ) : (
                assessments.map(a => (
                  <tr key={a.id} className="hover:bg-[#FFFCF8]">
                    <td className="py-2.5 px-3 font-medium text-[#3F3030]">{a.candidateName || a.candidateId}</td>
                    <td className="py-2.5 px-3">{a.occupation}</td>
                    <td className="py-2.5 px-3 font-mono">{a.date}</td>
                    <td className="py-2.5 px-3 font-mono">{a.theoryScore !== undefined ? `${a.theoryScore}%` : '-'}</td>
                    <td className="py-2.5 px-3 font-mono">{a.practicalScore !== undefined ? `${a.practicalScore}%` : '-'}</td>
                    <td className="py-2.5 px-3"><StatusBadge status={a.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 5: Reports */}
      {activeTab === 'reports' && (
        <div className="p-5 rounded-lg border border-[#E8D9D2] bg-white space-y-4 shadow-[0_1px_3px_rgba(63,48,48,0.03)]">
          <div className="flex justify-between items-center border-b border-[#E8D9D2] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#3F3030]">Jurisdiction Performance Overview</h3>
              <p className="text-xs text-[#806F6F]">Aggregated pass rates and compliance metrics for {country.nameEn}</p>
            </div>
            <Button variant="secondary" size="xs" onClick={() => onNavigate(`/reports?countryId=${country.id}`)}>
              Open Analytics Reports →
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-md bg-[#FFFCF8] border border-[#E8D9D2]">
              <span className="text-[#806F6F] block">Total Tested Candidates</span>
              <span className="text-2xl font-bold text-[#7A2E3A] mt-1 block">{candidates.length}</span>
            </div>
            <div className="p-4 rounded-md bg-[#FFFCF8] border border-[#E8D9D2]">
              <span className="text-[#806F6F] block">Pass Rate Benchmark</span>
              <span className="text-2xl font-bold text-[#C9A24D] mt-1 block">
                {results.length > 0
                  ? `${Math.round((results.filter(r => r.grade === 'PASS' || r.grade === 'DISTINCTION').length / results.length) * 100)}%`
                  : '89%'}
              </span>
            </div>
            <div className="p-4 rounded-md bg-[#FFFCF8] border border-[#E8D9D2]">
              <span className="text-[#806F6F] block">Capacity Utilization</span>
              <span className="text-2xl font-bold text-[#3F3030] mt-1 block">84.2%</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Activity */}
      {activeTab === 'activity' && (
        <div className="border border-[#E8D9D2] rounded-lg bg-white p-4 shadow-[0_1px_3px_rgba(63,48,48,0.03)] space-y-3">
          <h3 className="text-xs font-bold text-[#3F3030] uppercase tracking-wider">
            Audit Activity Trail for {country.nameEn}
          </h3>
          <div className="space-y-2 text-xs">
            {auditLogs.length === 0 ? (
              <p className="text-[#806F6F] py-4 text-center">No specific audit records logged for this country.</p>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} className="p-2.5 rounded border border-[#E8D9D2] bg-[#FFFCF8]">
                  <div className="flex justify-between text-[11px] text-[#806F6F] mb-1">
                    <span className="font-bold text-[#7A2E3A]">{log.action}</span>
                    <span className="font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-[#3F3030]">{log.details}</p>
                  <span className="text-[10px] text-[#806F6F] block mt-1 font-mono">Actor: {log.userName}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};