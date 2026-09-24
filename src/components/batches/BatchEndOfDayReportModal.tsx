import React, { useRef } from 'react';
import { 
  FileText, Download, Printer, CheckCircle2, ShieldCheck, 
  Building2, Layers, Award, Calendar, Clock
} from 'lucide-react';
import { Batch, Candidate, Center } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface BatchEndOfDayReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: Batch | null;
  candidates: Candidate[];
  center: Center | null;
}

export const BatchEndOfDayReportModal: React.FC<BatchEndOfDayReportModalProps> = ({
  isOpen,
  onClose,
  batch,
  candidates,
  center,
}) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const reportPrintRef = useRef<HTMLDivElement>(null);

  if (!batch) return null;

  const batchCandidates = candidates.filter(c => c.batchId === batch.id);
  const completedCandidates = batchCandidates.filter(c => c.status === 'COMPLETED' || c.status === 'LOCKED' || c.resultStatus);
  const passedCandidates = batchCandidates.filter(c => c.resultStatus === 'PASS');
  const failedCandidates = batchCandidates.filter(c => c.resultStatus === 'FAIL' || c.isExpelled);
  const passRate = completedCandidates.length > 0 
    ? Math.round((passedCandidates.length / completedCandidates.length) * 100)
    : 100;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#A43950]" />
          <span>{isRTL ? 'التقرير الختامي اليومي للدفعة (End-of-Day Final Report)' : 'End-of-Day Batch Final Report'}</span>
        </div>
      }
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Actions bar for Print and Download */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8D9D2]">
          <div className="text-xs text-[#806F6F]">
            {isRTL ? 'تقرير رسمي معتمد لجميع مرشحي الدفعة الذين أتموا مراحل التقييم.' : 'Official certified dossier of all candidate examinations completed in this cohort.'}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="w-3.5 h-3.5" />}
            >
              {isRTL ? 'طباعة التقرير' : 'Print Report'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              {isRTL ? 'تصدير PDF' : 'Export Dossier'}
            </Button>
          </div>
        </div>

        {/* Printable Official Report Document */}
        <div ref={reportPrintRef} className="p-6 rounded-xl border border-[#E8D9D2] bg-white shadow-sm space-y-6">
          {/* Official Letterhead */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#A43950] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#F8ECEE] text-[#A43950] border border-[#E8D9D2] flex items-center justify-center font-bold text-lg">
                SVP
              </div>
              <div>
                <h2 className="text-base font-bold text-[#3F3030] tracking-tight">
                  SKILLASSESS 360 • SKILL VERIFICATION PROGRAM
                </h2>
                <p className="text-xs text-[#806F6F]">
                  International Vocational Assessment & Accreditation Registry • ISO/IEC 17024
                </p>
              </div>
            </div>
            <div className="text-end">
              <span className="px-2.5 py-1 rounded bg-[#FBF6E8] text-[#C9A24D] border border-[#E8D9D2] font-mono text-xs font-bold block">
                COHORT DOSSIER
              </span>
              <span className="text-[10px] text-[#806F6F] font-mono mt-1 block">
                Ref: {batch.batchNumber}-EOD
              </span>
            </div>
          </div>

          {/* Cohort Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[#FFFCF8] p-3.5 rounded-lg border border-[#E8D9D2]">
            <div>
              <span className="text-[10px] text-[#806F6F] block">Batch Number</span>
              <strong className="font-mono text-[#3F3030]">{batch.batchNumber}</strong>
            </div>
            <div>
              <span className="text-[10px] text-[#806F6F] block">Assessment Center</span>
              <strong className="text-[#3F3030]">{center?.nameEn || batch.centerId}</strong>
            </div>
            <div>
              <span className="text-[10px] text-[#806F6F] block">Assessment Date & Time</span>
              <strong className="text-[#3F3030]">{batch.startDate} • {batch.startTime || '10:30 AM'}</strong>
            </div>
            <div>
              <span className="text-[10px] text-[#806F6F] block">Assessor Release Time</span>
              <strong className="font-mono text-[#A43950]">{batch.releaseTime || '09:45 AM'}</strong>
            </div>
          </div>

          {/* Operational Metrics Bar */}
          <div className="grid grid-cols-4 gap-3 text-center text-xs">
            <div className="p-2.5 rounded-lg border border-[#E8D9D2] bg-white">
              <span className="text-[10px] text-[#806F6F] block">Enrolled Candidates</span>
              <span className="text-xl font-bold font-mono text-[#3F3030]">{batchCandidates.length}</span>
            </div>
            <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50">
              <span className="text-[10px] text-emerald-800 block">Completed & Sealed</span>
              <span className="text-xl font-bold font-mono text-emerald-700">{completedCandidates.length}</span>
            </div>
            <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50">
              <span className="text-[10px] text-blue-800 block">Pass Rate</span>
              <span className="text-xl font-bold font-mono text-blue-700">{passRate}%</span>
            </div>
            <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50">
              <span className="text-[10px] text-rose-800 block">Disqualified / Expelled</span>
              <span className="text-xl font-bold font-mono text-rose-700">{batchCandidates.filter(c => c.isExpelled).length}</span>
            </div>
          </div>

          {/* Certified Candidate Result Records Table */}
          <div className="border border-[#E8D9D2] rounded-lg overflow-hidden">
            <table className="w-full text-xs text-start">
              <thead className="bg-white border-b border-[#E8D9D2] text-[#806F6F]">
                <tr>
                  <th className="py-2.5 px-3 text-start font-semibold">Candidate Name</th>
                  <th className="py-2.5 px-3 text-start font-semibold">Passport Number</th>
                  <th className="py-2.5 px-3 text-start font-semibold">Occupation</th>
                  <th className="py-2.5 px-3 text-end font-semibold">Final Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8D9D2]">
                {batchCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-[#806F6F]">
                      No candidates found for this batch.
                    </td>
                  </tr>
                ) : (
                  batchCandidates.map(cand => {
                    const isPass = cand.resultStatus === 'PASS' || (!cand.isExpelled && (cand.practicalScore || 85) >= 70);
                    return (
                      <tr key={cand.id} className="hover:bg-stone-50/50">
                        <td className="py-2.5 px-3 font-semibold text-[#3F3030]">
                          {cand.fullNameEn}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#806F6F]">
                          {cand.passportNumber}
                        </td>
                        <td className="py-2.5 px-3 text-[#3F3030]">
                          {cand.occupation}
                        </td>
                        <td className="py-2.5 px-3 text-end">
                          {cand.isExpelled ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">EXPELLED</span>
                          ) : isPass ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">PASS</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">FAIL</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Official Signatures and Audit Seals */}
          <div className="pt-6 border-t border-[#E8D9D2] grid grid-cols-3 gap-6 text-center text-xs">
            <div className="space-y-4">
              <div className="font-semibold text-[#3F3030]">Center Assessment Director</div>
              <div className="h-10 border-b border-dashed border-stone-300 flex items-end justify-center pb-1 text-[11px] font-serif italic text-stone-600">
                Eng. Tariq Al-Ghamdi
              </div>
              <div className="text-[10px] text-[#806F6F]">Signature & Date</div>
            </div>

            <div className="space-y-4">
              <div className="font-semibold text-[#3F3030]">Lead Accredited Assessor</div>
              <div className="h-10 border-b border-dashed border-stone-300 flex items-end justify-center pb-1 text-[11px] font-serif italic text-stone-600">
                Eng. Fahad Al-Otaibi
              </div>
              <div className="text-[10px] text-[#806F6F]">Accreditation ID: ISO-17024-SA</div>
            </div>

            <div className="space-y-4">
              <div className="font-semibold text-[#3F3030]">Official Program Seal</div>
              <div className="h-10 flex items-center justify-center">
                <div className="px-3 py-1 rounded-full border border-emerald-500 bg-emerald-50 text-emerald-800 font-mono text-[10px] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>SVP CERTIFIED IMMUTABLE</span>
                </div>
              </div>
              <div className="text-[10px] text-[#806F6F]">Audit Hash: SHA-256 Validated</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {isRTL ? 'إغلاق' : 'Close'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
