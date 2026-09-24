import React, { useState } from 'react';
import { 
  Layers, Users, CheckCircle2, AlertTriangle, Clock, 
  Camera, Eye, FileText, CheckSquare, Award, ArrowRight, ShieldCheck, X
} from 'lucide-react';
import { Batch, Candidate } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { Modal } from '../ui/Modal';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';

interface BatchLiveProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: Batch | null;
  candidates: Candidate[];
}

export const BatchLiveProgressModal: React.FC<BatchLiveProgressModalProps> = ({
  isOpen,
  onClose,
  batch,
  candidates,
}) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [selectedPhotoStage, setSelectedPhotoStage] = useState<{
    candidate: Candidate;
    stageName: string;
    photoUrl: string;
  } | null>(null);

  if (!batch) return null;

  const batchCandidates = candidates.filter(c => c.batchId === batch.id);
  const totalCount = batchCandidates.length;

  const checkinCount = batchCandidates.filter(c => c.status === 'CHECKED_IN' || c.status === 'SCHEDULED' || c.status === 'ASSIGNED').length;
  const enrolledCount = batchCandidates.filter(c => c.status === 'ENROLLED' || c.enrollmentStatus === 'ENROLLED').length;
  const cbtCount = batchCandidates.filter(c => c.cbtStatus === 'COMPLETED' || c.cbtScore !== undefined).length;
  const practicalCount = batchCandidates.filter(c => c.practicalStatus === 'COMPLETED').length;
  const completedCount = batchCandidates.filter(c => c.status === 'COMPLETED' || c.status === 'LOCKED').length;
  const pausedCount = batchCandidates.filter(c => c.isPaused || c.status === 'PAUSED' || c.status === 'PAUSED_PENDING_VERIFICATION').length;
  const expelledCount = batchCandidates.filter(c => c.isExpelled || c.status === 'EXPELLED').length;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-[#A43950]" />
            <span>{isRTL ? `المراقبة الميدانية المباشرة للدفعة: ${batch.batchNumber}` : `Live Progression Monitor: ${batch.batchNumber}`}</span>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#FBF6E8] text-[#C9A24D] border border-[#E8D9D2]">
              Release: {batch.releaseTime || '09:45 AM'}
            </span>
          </div>
        }
        maxWidth="2xl"
      >
        <div className="space-y-5">
          {/* Header Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            <div className="p-2.5 rounded-lg border border-[#E8D9D2] bg-white text-center">
              <span className="text-[10px] text-[#806F6F] block font-semibold">{isRTL ? 'إجمالي' : 'Total'}</span>
              <span className="text-lg font-bold font-mono text-[#3F3030]">{totalCount}</span>
            </div>
            <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/60 text-center">
              <span className="text-[10px] text-blue-800 block font-semibold">{isRTL ? 'وصول' : 'Check-In'}</span>
              <span className="text-lg font-bold font-mono text-blue-700">{checkinCount}</span>
            </div>
            <div className="p-2.5 rounded-lg border border-stone-200 bg-stone-50 text-center">
              <span className="text-[10px] text-stone-700 block font-semibold">{isRTL ? 'تسجيل' : 'Enrollment'}</span>
              <span className="text-lg font-bold font-mono text-stone-800">{enrolledCount}</span>
            </div>
            <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-center">
              <span className="text-[10px] text-amber-800 block font-semibold">CBT</span>
              <span className="text-lg font-bold font-mono text-amber-700">{cbtCount}</span>
            </div>
            <div className="p-2.5 rounded-lg border border-indigo-200 bg-indigo-50 text-center">
              <span className="text-[10px] text-indigo-800 block font-semibold">{isRTL ? 'عملي' : 'Practical'}</span>
              <span className="text-lg font-bold font-mono text-indigo-700">{practicalCount}</span>
            </div>
            <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-center">
              <span className="text-[10px] text-emerald-800 block font-semibold">{isRTL ? 'منجز' : 'Done'}</span>
              <span className="text-lg font-bold font-mono text-emerald-700">{completedCount}</span>
            </div>
            <div className="p-2.5 rounded-lg border border-amber-300 bg-amber-50/80 text-center">
              <span className="text-[10px] text-amber-900 block font-semibold">{isRTL ? 'متوقف' : 'Paused'}</span>
              <span className="text-lg font-bold font-mono text-amber-800">{pausedCount}</span>
            </div>
            <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50 text-center">
              <span className="text-[10px] text-rose-800 block font-semibold">{isRTL ? 'مستبعد' : 'Expelled'}</span>
              <span className="text-lg font-bold font-mono text-rose-700">{expelledCount}</span>
            </div>
          </div>

          {/* 6-Stage Progress Flow Visual */}
          <div className="p-3.5 rounded-xl border border-[#E8D9D2] bg-[#FFFCF8]">
            <div className="text-[11px] font-bold text-[#806F6F] uppercase tracking-wider mb-2">
              {isRTL ? 'مراحل المسار الستة للتقييم المعتمد' : 'Standard 6-Stage Candidate Assessment Lifecycle'}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center text-xs">
              <div className="p-2 rounded bg-white border border-[#E8D9D2]">
                <div className="font-bold text-[#A43950]">1. Check-In</div>
                <div className="text-[10px] text-[#806F6F] mt-0.5">Biometric Gate</div>
              </div>
              <div className="p-2 rounded bg-white border border-[#E8D9D2]">
                <div className="font-bold text-[#A43950]">2. Enrollment</div>
                <div className="text-[10px] text-[#806F6F] mt-0.5">Photo & Badge</div>
              </div>
              <div className="p-2 rounded bg-white border border-[#E8D9D2]">
                <div className="font-bold text-[#A43950]">3. CBT Exam</div>
                <div className="text-[10px] text-[#806F6F] mt-0.5">Theory Terminal</div>
              </div>
              <div className="p-2 rounded bg-white border border-[#E8D9D2]">
                <div className="font-bold text-[#A43950]">4. Practical</div>
                <div className="text-[10px] text-[#806F6F] mt-0.5">Workshop Station</div>
              </div>
              <div className="p-2 rounded bg-white border border-[#E8D9D2]">
                <div className="font-bold text-[#A43950]">5. Evaluation</div>
                <div className="text-[10px] text-[#806F6F] mt-0.5">Assessor Rubric</div>
              </div>
              <div className="p-2 rounded bg-white border border-[#E8D9D2]">
                <div className="font-bold text-[#A43950]">6. Exit & Result</div>
                <div className="text-[10px] text-[#806F6F] mt-0.5">Locked & Sealed</div>
              </div>
            </div>
          </div>

          {/* Candidate Table with Live Photo Inspection Buttons */}
          <div className="border border-[#E8D9D2] rounded-xl bg-white overflow-hidden">
            <div className="p-3 border-b border-[#E8D9D2] bg-[#FFFCF8] flex items-center justify-between">
              <span className="text-xs font-bold text-[#3F3030] uppercase tracking-wider">
                {isRTL ? `مرشحو الدفعة (${batchCandidates.length})` : `Batch Candidate Roster (${batchCandidates.length})`}
              </span>
              <span className="text-[11px] text-[#806F6F] font-mono">
                {batch.occupation}
              </span>
            </div>

            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-white border-b border-[#E8D9D2] text-[#806F6F] sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 text-start font-semibold">Candidate</th>
                    <th className="py-2.5 px-3 text-start font-semibold">Passport Number</th>
                    <th className="py-2.5 px-3 text-start font-semibold">Status</th>
                    <th className="py-2.5 px-3 text-center font-semibold">Stage Photos & Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8D9D2]">
                  {batchCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-[#806F6F]">
                        No candidates enrolled in this batch yet.
                      </td>
                    </tr>
                  ) : (
                    batchCandidates.map(c => {
                      const entryPhoto = c.passportVerificationPhoto || c.photoUrl;
                      const enrollPhoto = c.enrollmentPhoto || c.photoUrl;
                      const cbtPhoto = c.cbtPhoto || c.photoUrl;
                      const practPhoto1 = c.practicalPhoto1;
                      const practPhoto2 = c.practicalPhoto2;

                      return (
                        <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-[#3F3030]">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-stone-100 border border-[#E8D9D2] overflow-hidden shrink-0">
                                <img src={entryPhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80'} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <span>{isRTL ? c.fullNameAr : c.fullNameEn}</span>
                                {c.isExpelled && (
                                  <span className="block text-[10px] font-bold text-rose-600">Disqualified: {c.expelledReason || 'Expelled'}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-gray-900 font-medium">
                            {c.passportNumber}
                          </td>
                          <td className="py-2.5 px-3">
                            <StatusBadge status={c.status} />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {entryPhoto && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedPhotoStage({ candidate: c, stageName: 'Entry Verification Photo', photoUrl: entryPhoto })}
                                  className="px-2 py-0.5 rounded text-[10px] font-medium border border-[#E8D9D2] hover:bg-[#F8ECEE] text-[#A43950] flex items-center gap-1"
                                  title="Inspect Entry Verification Photo"
                                >
                                  <Camera className="w-2.5 h-2.5" />
                                  <span>Entry</span>
                                </button>
                              )}
                              {enrollPhoto && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedPhotoStage({ candidate: c, stageName: 'Enrollment Photo', photoUrl: enrollPhoto })}
                                  className="px-2 py-0.5 rounded text-[10px] font-medium border border-[#E8D9D2] hover:bg-[#FBF6E8] text-[#C9A24D] flex items-center gap-1"
                                  title="Inspect Enrollment Photo"
                                >
                                  <Camera className="w-2.5 h-2.5" />
                                  <span>Enroll</span>
                                </button>
                              )}
                              {cbtPhoto && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedPhotoStage({ candidate: c, stageName: 'CBT Exam Photo', photoUrl: cbtPhoto })}
                                  className="px-2 py-0.5 rounded text-[10px] font-medium border border-[#E8D9D2] hover:bg-amber-50 text-amber-800 flex items-center gap-1"
                                  title="Inspect CBT Exam Terminal Photo"
                                >
                                  <Camera className="w-2.5 h-2.5" />
                                  <span>CBT</span>
                                </button>
                              )}
                              {practPhoto1 && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedPhotoStage({ candidate: c, stageName: 'Practical Assessment Photo 1', photoUrl: practPhoto1 })}
                                  className="px-2 py-0.5 rounded text-[10px] font-medium border border-[#E8D9D2] hover:bg-purple-50 text-purple-800 flex items-center gap-1"
                                  title="Inspect Practical Photo 1"
                                >
                                  <Camera className="w-2.5 h-2.5" />
                                  <span>Pract 1</span>
                                </button>
                              )}
                              {practPhoto2 && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedPhotoStage({ candidate: c, stageName: 'Practical Assessment Photo 2', photoUrl: practPhoto2 })}
                                  className="px-2 py-0.5 rounded text-[10px] font-medium border border-[#E8D9D2] hover:bg-purple-50 text-purple-800 flex items-center gap-1"
                                  title="Inspect Practical Photo 2"
                                >
                                  <Camera className="w-2.5 h-2.5" />
                                  <span>Pract 2</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>

      {/* Stage Photo Inspection Overlay */}
      {selectedPhotoStage && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedPhotoStage(null)}
          title={`${selectedPhotoStage.stageName}: ${selectedPhotoStage.candidate.fullNameEn}`}
          maxWidth="md"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#806F6F]">
              <span>Passport: <strong className="font-mono text-[#3F3030]">{selectedPhotoStage.candidate.passportNumber}</strong></span>
              <span>Candidate ID: <strong className="font-mono text-[#3F3030]">{selectedPhotoStage.candidate.id}</strong></span>
            </div>
            <div className="w-full h-80 rounded-xl overflow-hidden border border-[#E8D9D2] bg-stone-100 flex items-center justify-center">
              <img 
                src={selectedPhotoStage.photoUrl} 
                alt="Stage Evidence" 
                className="w-full h-full object-contain" 
              />
            </div>
            <div className="text-center">
              <Button variant="secondary" size="sm" onClick={() => setSelectedPhotoStage(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
