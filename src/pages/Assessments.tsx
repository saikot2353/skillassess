import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Search, Eye } from 'lucide-react';
import { Assessment, Candidate } from '../types';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { useLanguage } from '../context/LanguageContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Table, Column } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal, ModalSectionTitle } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Pagination } from '../components/ui/Pagination';

export const AssessmentsPage: React.FC = () => {
  const { t } = useLanguage();

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const pageSize = 5;

  useEffect(() => {
    setAssessments(StorageService.get<Assessment[]>(STORAGE_KEYS.ASSESSMENTS, []));
    setCandidates(StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []));
  }, []);

  const getCandidateName = (cid: string) => {
    const c = candidates.find(item => item.id === cid);
    return c ? `${c.fullNameEn} (${c.passportNumber})` : cid;
  };

  const filtered = assessments.filter(a =>
    a.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.occupation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCandidateName(a.candidateId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const columns: Column<Assessment>[] = [
    {
      key: 'id',
      header: 'Assessment ID',
      render: a => (
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-maroon-700" />
          <span className="font-mono font-semibold text-stone-900">{a.id}</span>
        </div>
      ),
    },
    {
      key: 'candidate',
      header: 'Assigned Candidate',
      render: a => <span className="font-medium text-stone-800">{getCandidateName(a.candidateId)}</span>,
    },
    {
      key: 'occupation',
      header: 'Occupation',
      render: a => <span className="text-xs text-stone-600">{a.occupation}</span>,
    },
    {
      key: 'scores',
      header: 'Evaluation Scores',
      render: a => (
        <div className="text-xs font-mono">
          <span className="text-stone-700">T: {a.theoryScore ?? '—'}</span> |{' '}
          <span className="text-stone-700">P: {a.practicalScore ?? '—'}</span> |{' '}
          <strong className="text-maroon-900">Total: {a.totalScore ?? '—'}</strong>
        </div>
      ),
    },
    {
      key: 'status',
      header: t.common.status,
      render: a => <StatusBadge status={a.status} />,
    },
    {
      key: 'actions',
      header: t.common.actions,
      className: 'text-end',
      headerClassName: 'text-end',
      render: a => (
        <button
          type="button"
          onClick={() => setSelectedAssessment(a)}
          className="p-1.5 rounded text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors inline-flex items-center gap-1 text-xs"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{t.common.view}</span>
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t.nav.assessments}
        subtitle="Manage live assessment sessions, theory and practical rubric scorings"
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: t.nav.assessments },
        ]}
      />

      <div className="mb-4 flex items-center justify-between gap-3 p-3 bg-white border border-borderlight rounded-lg shadow-soft">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-stone-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search candidate, assessment ID, occupation..."
            className="w-full text-xs sm:text-sm bg-white border border-borderlight rounded-md py-1.5 ps-9 pe-3 focus:outline-none focus:border-maroon-700 focus:ring-1 focus:ring-maroon-700"
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={paginated}
        keyExtractor={a => a.id}
      />

      <Pagination
        currentPage={currentPage}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />

      {/* Assessment Details Modal */}
      {selectedAssessment && (
        <Modal
          isOpen={!!selectedAssessment}
          onClose={() => setSelectedAssessment(null)}
          maxWidth="md"
          title={`Assessment Details • ${selectedAssessment.id}`}
          subtitle={`Candidate: ${getCandidateName(selectedAssessment.candidateId)}`}
          icon={<ClipboardCheck className="w-6 h-6" />}
          infoNotice="Evaluation scores are cryptographically stamped and cannot be modified once certified."
          footer={
            <Button variant="secondary" size="md" onClick={() => setSelectedAssessment(null)}>
              {t.common.close}
            </Button>
          }
        >
          <div className="space-y-5 text-xs">
            <ModalSectionTitle title="Session Overview" />
            <div className="grid grid-cols-2 gap-3.5 p-4 bg-[#FFFFFF] rounded-xl border border-[#E8D9D2]">
              <div>
                <span className="text-[#806F6F] block mb-0.5">Assessment Status</span>
                <StatusBadge status={selectedAssessment.status} className="mt-0.5" />
              </div>
              <div>
                <span className="text-[#806F6F] block mb-0.5">Session Date</span>
                <span className="font-semibold text-[#3F3030]">{selectedAssessment.date}</span>
              </div>
              <div>
                <span className="text-[#806F6F] block mb-0.5">Assigned Lead Assessor</span>
                <span className="font-mono text-[#3F3030]">{selectedAssessment.assessorId}</span>
              </div>
              <div>
                <span className="text-[#806F6F] block mb-0.5">Schedule Reference</span>
                <span className="font-mono text-[#3F3030]">{selectedAssessment.scheduleId}</span>
              </div>
            </div>

            <ModalSectionTitle title="Rubric Evaluation Breakdown" />
            <div className="p-4 border border-[#E8D9D2] rounded-xl bg-[#FFFFFF] space-y-2.5">
              <div className="flex justify-between py-1.5 border-b border-[#E8D9D2]">
                <span className="text-[#806F6F]">Theory Component (Weight 40%)</span>
                <span className="font-mono font-semibold text-[#3F3030]">{selectedAssessment.theoryScore ?? 'Pending'} / 100</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E8D9D2]">
                <span className="text-[#806F6F]">Practical Demonstration (Weight 60%)</span>
                <span className="font-mono font-semibold text-[#3F3030]">{selectedAssessment.practicalScore ?? 'Pending'} / 100</span>
              </div>
              <div className="flex justify-between pt-1.5 text-sm font-bold text-[#7A2E3A]">
                <span>Final Weighted Score</span>
                <span className="font-mono">{selectedAssessment.totalScore ?? 'Pending'}%</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
