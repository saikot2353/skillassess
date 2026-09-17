import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users2, UserCheck, CalendarDays, Shuffle, Plus, 
  Search, Filter, Eye, Shield, Lock, Unlock, CheckCircle2,
  Clock, Mail, Phone, ArrowRight, UserPlus, Save, AlertCircle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Modal, ModalSectionTitle } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { StatusBadge } from '../components/ui/StatusBadge';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { User, Schedule, Candidate, AssessorLottery } from '../types';

export interface AssessorsPageProps {
  onNavigate?: (path: string) => void;
}

export const AssessorsPage: React.FC<AssessorsPageProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  const userCenterId = user?.centerId || 'ctr-sa-1';

  const [activeTab, setActiveTab] = useState<string>('list');
  const [assessors, setAssessors] = useState<User[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [lotteries, setLotteries] = useState<AssessorLottery[]>([]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Create Assessor Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    username: '',
    occupation: 'Electrical Installation',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // View Assessor Modal
  const [viewingAssessor, setViewingAssessor] = useState<User | null>(null);

  const loadData = () => {
    const allUsers = StorageService.get<User[]>(STORAGE_KEYS.USERS, []);
    const centerAssessors = allUsers.filter(u => u.role === 'ASSESSOR' && u.centerId === userCenterId);
    setAssessors(centerAssessors);

    const allSchedules = StorageService.get<Schedule[]>(STORAGE_KEYS.SCHEDULES, []);
    setSchedules(allSchedules.filter(s => s.centerId === userCenterId));

    const allCandidates = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    setCandidates(allCandidates.filter(c => c.centerId === userCenterId));

    const allLotteries = StorageService.get<AssessorLottery[]>(STORAGE_KEYS.ASSESSOR_LOTTERY, []);
    setLotteries(allLotteries.filter(l => l.centerId === userCenterId));
  };

  useEffect(() => {
    loadData();

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['list', 'schedule', 'lottery'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  const handleOpenAdd = () => {
    const autoUsername = `assessor.${Math.floor(100 + Math.random() * 900)}`;
    setFormData({
      name: '',
      email: '',
      phone: '+966 5',
      username: autoUsername,
      occupation: 'Electrical Installation',
      status: 'ACTIVE',
    });
    setFormErrors({});
    setIsAddOpen(true);
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Full name is required';
    if (!formData.email.trim() || !formData.email.includes('@')) errs.email = 'Valid email is required';
    if (!formData.username.trim()) errs.username = 'Username is required';

    const allUsers = StorageService.get<User[]>(STORAGE_KEYS.USERS, []);
    if (allUsers.some(u => u.username?.toLowerCase() === formData.username.trim().toLowerCase())) {
      errs.username = 'This username is already registered in the system';
    }
    if (allUsers.some(u => u.email.toLowerCase() === formData.email.trim().toLowerCase())) {
      errs.email = 'This email is already in use by another account';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveAssessor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const newAssessor: User = {
      id: `usr-${Date.now()}`,
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      username: formData.username.trim().toLowerCase(),
      role: 'ASSESSOR',
      countryId: 'cnt-sa',
      centerId: userCenterId, // Bound strictly to current Center (BR-CA-004)
      status: formData.status,
      phone: formData.phone.trim(),
      assignedAssessmentsCount: 0,
      createdAt: new Date().toISOString(),
    };

    StorageService.updateItem(STORAGE_KEYS.USERS, newAssessor);
    AuditService.log(
      'CREATE_ASSESSOR',
      'USER',
      `Created Assessor ${newAssessor.name} (${newAssessor.username}) bound to Center ${userCenterId}.`,
      newAssessor.id,
      'SUCCESS'
    );

    showToast('Assessor account created successfully!', 'success');
    setIsAddOpen(false);
    loadData();
  };

  const handleToggleStatus = (assessor: User) => {
    const nextStatus = assessor.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated: User = { ...assessor, status: nextStatus };

    StorageService.updateItem(STORAGE_KEYS.USERS, updated);
    AuditService.log(
      'UPDATE_USER',
      'USER',
      `Toggled assessor status for ${assessor.name} to ${nextStatus}`,
      assessor.id,
      'SUCCESS'
    );

    showToast(`Assessor status updated to ${nextStatus}`, 'success');
    loadData();
  };

  // Release Assessor Lottery Simulation (BR-CA-010)
  const handleToggleLotteryRelease = (lotteryId: string) => {
    const lot = lotteries.find(l => l.id === lotteryId);
    if (!lot) return;

    const nextRelease: 'HIDDEN' | 'RELEASED' = lot.releaseStatus === 'HIDDEN' ? 'RELEASED' : 'HIDDEN';
    const updated: AssessorLottery = {
      ...lot,
      releaseStatus: nextRelease,
      releaseTime: nextRelease === 'RELEASED' ? new Date().toISOString() : undefined,
    };

    StorageService.updateItem(STORAGE_KEYS.ASSESSOR_LOTTERY, updated);
    AuditService.log(
      nextRelease === 'RELEASED' ? 'RELEASE_LOTTERY' : 'UPDATE',
      'ASSESSOR_LOTTERY',
      `Center Admin ${user?.name} updated Assessor Lottery allocation release status to ${nextRelease} for schedule ${lot.scheduleCode || lot.scheduleId}`,
      lot.id,
      'SUCCESS'
    );

    showToast(
      nextRelease === 'RELEASED' ? 'Candidate-Assessor lottery pairings released to floor!' : 'Lottery pairings concealed (HIDDEN).',
      'info'
    );
    loadData();
  };

  // Filtered Assessors
  const filteredAssessors = useMemo(() => {
    return assessors.filter(a => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = 
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.username && a.username.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [assessors, searchTerm, statusFilter]);

  const tabs = [
    { id: 'list', label: language === 'ar' ? `المقيمون المعتمدون (${assessors.length})` : `Assessor Roster (${assessors.length})` },
    { id: 'schedule', label: language === 'ar' ? 'جدول توزيع المقيمين' : 'Assessor Schedule' },
    { id: 'lottery', label: language === 'ar' ? 'قرعة المقيمين والمرشحين' : 'Candidate-Assessor Lottery' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title={language === 'ar' ? 'إدارة المقيمين والجداول' : 'Assessor Management & Rostering'}
        subtitle={language === 'ar' ? 'إدارة حسابات المقيمين، مواعيد التقييم، ومتابعة حالة تحرير قرعة التوزيع العشوائي' : 'Manage accredited assessors, inspect scheduling allocations, and monitor blind lottery pairing release.'}
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: language === 'ar' ? 'المقيمون' : 'Assessors' },
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAdd}
            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
          >
            {language === 'ar' ? 'إضافة مقيم جديد' : 'Create Assessor'}
          </Button>
        }
      />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Search & Filter */}
          <div className="p-3 bg-white border border-[#E8D9D2] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="relative w-full sm:w-80">
              <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-[#806F6F]">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search assessor name, email, username..."
                className="w-full text-xs bg-white border border-[#E8D9D2] rounded-lg py-1.5 ps-9 pe-3 focus:outline-none focus:border-[#7A2E3A]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Filter className="w-4 h-4 text-[#806F6F]" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs bg-white border border-[#E8D9D2] rounded-lg py-1.5 px-2.5 focus:outline-none focus:border-[#7A2E3A]"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="border border-[#E8D9D2] rounded-xl bg-white shadow-[0_1px_3px_rgba(63,48,48,0.03)] overflow-hidden">
            <table className="w-full text-xs text-start">
              <thead className="bg-[#FFFCF8] border-b border-[#E8D9D2] text-[#806F6F]">
                <tr>
                  <th className="py-2.5 px-3 text-start font-semibold">Assessor Name</th>
                  <th className="py-2.5 px-3 text-start font-semibold">Username</th>
                  <th className="py-2.5 px-3 text-start font-semibold">Contact</th>
                  <th className="py-2.5 px-3 text-start font-semibold">Center ID</th>
                  <th className="py-2.5 px-3 text-start font-semibold">Status</th>
                  <th className="py-2.5 px-3 text-end font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8D9D2]">
                {filteredAssessors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[#806F6F]">
                      No assessors registered for this center.
                    </td>
                  </tr>
                ) : (
                  filteredAssessors.map(ass => (
                    <tr key={ass.id} className="hover:bg-[#FFFCF8]/80 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-[#3F3030]">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#F8ECEE] text-[#7A2E3A] font-bold text-xs flex items-center justify-center shrink-0">
                            {ass.name.charAt(0)}
                          </div>
                          <div>
                            <span>{ass.name}</span>
                            <span className="text-[10px] text-[#806F6F] block">ISO 17024 Accredited</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#7A2E3A] font-semibold">{ass.username || '—'}</td>
                      <td className="py-2.5 px-3 text-[#806F6F]">
                        <div>{ass.email}</div>
                        <div className="text-[10px] font-mono">{ass.phone || 'N/A'}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#806F6F]">{ass.centerId}</td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={ass.status} />
                      </td>
                      <td className="py-2.5 px-3 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingAssessor(ass)}
                            className="p-1 px-2 rounded text-xs text-[#7A2E3A] hover:bg-[#F8ECEE] font-medium"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(ass)}
                            className={`p-1 px-2 rounded text-xs font-medium border ${
                              ass.status === 'ACTIVE' ? 'text-amber-700 hover:bg-amber-50 border-amber-200' : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                            }`}
                          >
                            {ass.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div className="border border-[#E8D9D2] rounded-xl bg-white shadow-[0_1px_3px_rgba(63,48,48,0.03)] overflow-hidden">
            <div className="p-3.5 border-b border-[#E8D9D2] bg-[#FFFCF8] flex items-center justify-between">
              <span className="text-xs font-bold text-[#3F3030] uppercase tracking-wider">
                Assessor Operational Rostering Schedule
              </span>
              <span className="text-[11px] text-[#806F6F]">Center: {userCenterId}</span>
            </div>

            <table className="w-full text-xs text-start">
              <thead className="bg-white border-b border-[#E8D9D2] text-[#806F6F]">
                <tr>
                  <th className="py-2.5 px-3 text-start font-semibold">Assessor</th>
                  <th className="py-2.5 px-3 text-start font-semibold">Date</th>
                  <th className="py-2.5 px-3 text-start font-semibold">Schedule Code</th>
                  <th className="py-2.5 px-3 text-start font-semibold">Occupation</th>
                  <th className="py-2.5 px-3 text-start font-semibold">Assigned Candidates</th>
                  <th className="py-2.5 px-3 text-start font-semibold">Schedule Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8D9D2]">
                {schedules.map(sch => {
                  const assignedAssessor = assessors.find(a => a.id === sch.assessorId) || assessors[0];
                  return (
                    <tr key={sch.id} className="hover:bg-[#FFFCF8]/80 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-[#3F3030]">
                        {assignedAssessor ? assignedAssessor.name : 'Rostered Assessor'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#806F6F]">
                        {sch.date} ({sch.timeSlot})
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#7A2E3A]">
                        {sch.code}
                      </td>
                      <td className="py-2.5 px-3 text-[#3F3030]">
                        {sch.occupation}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#3F3030]">
                        {sch.assignedCandidates} / {sch.totalSeats} candidates
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={sch.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'lottery' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-[#E8D9D2] bg-[#FBF6E8] text-xs text-[#3F3030] flex items-start gap-3">
            <Shield className="w-5 h-5 text-[#C9A24D] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Candidate-Assessor Blind Lottery Rule (BR-CA-009 & BR-CA-010):</strong>
              <p className="text-[11px] text-[#806F6F] mt-0.5">
                The Assessment Engine controls the automated random pairings. Before release point, assignments are strictly <strong>HIDDEN</strong> to prevent bias or premature exposure. Center Admins cannot manipulate allocations.
              </p>
            </div>
          </div>

          <div className="border border-[#E8D9D2] rounded-xl bg-white shadow-[0_1px_3px_rgba(63,48,48,0.03)] overflow-hidden">
            <table className="w-full text-xs text-start">
              <thead className="bg-[#FFFCF8] border-b border-[#E8D9D2] text-[#806F6F]">
                <tr>
                  <th className="py-2.5 px-3 text-start font-semibold">Schedule ID</th>
                  <th className="py-2.5 px-3 text-start font-semibold">Occupation</th>
                  <th className="py-2.5 px-3 text-start font-semibold">Candidates</th>
                  <th className="py-2.5 px-3 text-start font-semibold">Assessors</th>
                  <th className="py-2.5 px-3 text-start font-semibold">Release Status</th>
                  <th className="py-2.5 px-3 text-start font-semibold">Assignment Visibility</th>
                  <th className="py-2.5 px-3 text-end font-semibold">Governance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8D9D2]">
                {lotteries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-[#806F6F]">
                      No assessor lotteries generated for this center yet.
                    </td>
                  </tr>
                ) : (
                  lotteries.map(lot => {
                    const isHidden = lot.releaseStatus === 'HIDDEN';
                    return (
                      <tr key={lot.id} className="hover:bg-[#FFFCF8]/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#7A2E3A]">
                          {lot.scheduleCode || lot.scheduleId || 'SCH-2026'}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-[#3F3030]">
                          {lot.occupation || 'Electrical Installation'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold">
                          {lot.candidateCount || lot.totalCandidates || 25}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold">
                          {lot.eligibleAssessorCount || 2}
                        </td>
                        <td className="py-2.5 px-3">
                          {isHidden ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Lock className="w-3 h-3" /> HIDDEN
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <Unlock className="w-3 h-3" /> RELEASED
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {isHidden ? (
                            <span className="text-[#806F6F] font-mono text-[11px] italic">
                              [ CONCEALED BY ENGINE ]
                            </span>
                          ) : (
                            <div className="text-[11px] text-[#3F3030]">
                              <span className="font-semibold text-emerald-700">Pairings Operational:</span> {lot.pairings.length} stations assigned
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-end">
                          <button
                            type="button"
                            onClick={() => handleToggleLotteryRelease(lot.id)}
                            className="px-2.5 py-1 rounded text-xs font-semibold border border-[#E8D9D2] hover:bg-[#F8ECEE] text-[#7A2E3A] transition-colors"
                          >
                            {isHidden ? 'Simulate Release' : 'Conceal'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE ASSESSOR MODAL */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        maxWidth="md"
        title="Create Center Assessor Account"
        subtitle={`Accredited evaluator assigned exclusively to Center: ${userCenterId}`}
        infoNotice="User credentials and verification will be bound to current center governance."
        footer={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveAssessor} leftIcon={<Save className="w-3.5 h-3.5" />}>
              Save Assessor Account
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveAssessor} className="space-y-3.5 text-xs">
          <Input
            label="Assessor Full Name"
            required
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Eng. Yasir Mahmood"
            error={formErrors.name}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Official Email"
              required
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="yasir@assess.com"
              error={formErrors.email}
            />
            <Input
              label="System Username"
              required
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
              error={formErrors.username}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contact Phone"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+966 50 000 0000"
            />
            <Select
              label="Primary Specialization"
              value={formData.occupation}
              onChange={e => setFormData({ ...formData, occupation: e.target.value })}
              options={[
                { value: 'Electrical Installation', label: 'Electrical Installation' },
                { value: 'HVAC Maintenance', label: 'HVAC Maintenance' },
                { value: 'Welding & Fabrication', label: 'Welding & Fabrication' },
                { value: 'Plumbing', label: 'Plumbing' },
                { value: 'BMS Automation', label: 'BMS Automation' },
              ]}
            />
          </div>

          <div className="p-2.5 rounded-lg bg-[#FFFCF8] border border-[#E8D9D2] text-[11px] text-[#806F6F]">
            Automatic Assignment: Country: <strong className="text-[#3F3030]">SA</strong> | Center: <strong className="text-[#7A2E3A]">{userCenterId}</strong>
          </div>
        </form>
      </Modal>

      {/* VIEW ASSESSOR MODAL */}
      {viewingAssessor && (
        <Modal
          isOpen={!!viewingAssessor}
          onClose={() => setViewingAssessor(null)}
          maxWidth="md"
          title={viewingAssessor.name}
          subtitle={`Username: ${viewingAssessor.username || viewingAssessor.email}`}
          footer={
            <Button variant="secondary" size="sm" onClick={() => setViewingAssessor(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-[#FFFCF8] border border-[#E8D9D2]">
              <div>
                <span className="text-[#806F6F] block">Role:</span>
                <strong className="text-[#7A2E3A]">Assessor (ISO 17024)</strong>
              </div>
              <div>
                <span className="text-[#806F6F] block">Assigned Center:</span>
                <strong className="font-mono text-[#3F3030]">{viewingAssessor.centerId}</strong>
              </div>
              <div>
                <span className="text-[#806F6F] block">Email:</span>
                <span className="text-[#3F3030]">{viewingAssessor.email}</span>
              </div>
              <div>
                <span className="text-[#806F6F] block">Phone:</span>
                <span className="text-[#3F3030] font-mono">{viewingAssessor.phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[#806F6F] block">Status:</span>
                <StatusBadge status={viewingAssessor.status} />
              </div>
              <div>
                <span className="text-[#806F6F] block">Registered Date:</span>
                <span className="text-[#806F6F]">{new Date(viewingAssessor.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
