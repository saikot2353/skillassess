import React, { useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Download, 
  FileArchive, 
  Layers, 
  AlertCircle, 
  Loader2, 
  Calendar, 
  Building2, 
  Briefcase 
} from 'lucide-react';
import { Batch, Candidate, Center } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Modal, ModalSectionTitle } from '../ui/Modal';
import { Button } from '../ui/Button';
import { 
  getCandidateFinalEvaluationSheet, 
  hasUploadedEvaluationSheet, 
  downloadSingleCandidateEvidencePdf, 
  generateBatchEvidenceZip 
} from '../../services/candidateEvidenceService';

interface BatchEvaluationSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: Batch | null;
  candidates: Candidate[];
  centers: Center[];
}

export const BatchEvaluationSummaryModal: React.FC<BatchEvaluationSummaryModalProps> = ({
  isOpen,
  onClose,
  batch,
  candidates,
  centers,
}) => {
  const { language } = useLanguage();
  const { showToast } = useToast();
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string | null>(null);
  const [downloadingCandidateId, setDownloadingCandidateId] = useState<string | null>(null);

  if (!isOpen || !batch) return null;

  const center = centers.find(c => c.id === batch.centerId);
  const batchCandidates = candidates.filter(c => c.batchId === batch.id);
  const totalCandidates = batchCandidates.length;

  const uploadedCandidates = batchCandidates.filter(c => hasUploadedEvaluationSheet(c));
  const pendingCandidates = batchCandidates.filter(c => !hasUploadedEvaluationSheet(c));
  const totalUploadedSheets = uploadedCandidates.length;
  const totalPendingSheets = pendingCandidates.length;

  const handleDownloadSinglePdf = async (candidate: Candidate) => {
    try {
      setDownloadingCandidateId(candidate.id);
      showToast(
        language === 'ar'
          ? `جارٍ إنشاء ملف الأدلة للمرشح ${candidate.fullNameEn}...`
          : `Compiling assessment evidence PDF for ${candidate.fullNameEn}...`,
        'info'
      );
      await downloadSingleCandidateEvidencePdf(candidate, batch, center);
      showToast(
        language === 'ar'
          ? `تم تنزيل ملف الأدلة للمرشح ${candidate.fullNameEn} بنجاح`
          : `Evidence PDF for ${candidate.fullNameEn} downloaded successfully!`,
        'success'
      );
    } catch (err: any) {
      console.error('Failed to generate candidate evidence PDF:', err);
      showToast(err.message || 'Failed to generate candidate evidence PDF', 'error');
    } finally {
      setDownloadingCandidateId(null);
    }
  };

  const handleGenerateBatchZip = async () => {
    if (totalUploadedSheets === 0) {
      showToast(
        language === 'ar'
          ? 'لا يمكن إنشاء حزمة الأدلة: لا توجد نماذج تقييم مرفوعة في هذه الدفعة.'
          : 'Cannot generate evidence package: No final evaluation sheets have been uploaded for this batch.',
        'error'
      );
      return;
    }

    try {
      setIsGeneratingZip(true);
      setGenerationProgress(
        language === 'ar'
          ? `جارٍ معالجة ${totalUploadedSheets} مرشح مؤهل...`
          : `Processing ${totalUploadedSheets} eligible candidates...`
      );

      const result = await generateBatchEvidenceZip(
        batch,
        batchCandidates,
        center,
        (current, total, candName) => {
          setGenerationProgress(
            language === 'ar'
              ? `إنشاء ملف (${current}/${total}): ${candName}...`
              : `Compiling candidate (${current}/${total}): ${candName}...`
          );
        }
      );

      showToast(
        language === 'ar'
          ? `تم إنشاء وتنزيل حزمة الأدلة (${result.zipFilename}) لـ ${result.eligibleCandidates} مرشح بنجاح!`
          : `Assessment evidence package (${result.zipFilename}) downloaded for ${result.eligibleCandidates} candidates!`,
        'success'
      );
    } catch (err: any) {
      console.error('Failed to generate batch evidence zip:', err);
      showToast(err.message || 'Failed to generate assessment evidence ZIP package', 'error');
    } finally {
      setIsGeneratingZip(false);
      setGenerationProgress(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title={
        <div className="flex items-center gap-2">
          <FileArchive className="w-5 h-5 text-[#7A2E3A]" />
          <span>
            {language === 'ar'
              ? 'ملخص تقييم الدفعة وحزمة أدلة المرشحين'
              : 'Batch Evaluation Summary & Evidence Package'}
          </span>
        </div>
      }
      subtitle={
        <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600 mt-1">
          <span className="inline-flex items-center gap-1 font-mono font-bold text-[#7A2E3A]">
            <Layers className="w-3.5 h-3.5" />
            {batch.batchNumber}
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5 text-stone-500" />
            {batch.occupation}
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-stone-500" />
            {center ? (language === 'ar' ? center.nameAr : center.nameEn) : 'Center'}
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-stone-500" />
            {batch.startDate}
          </span>
        </div>
      }
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          <div className="text-xs text-stone-600">
            {totalUploadedSheets > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-800 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                {language === 'ar'
                  ? `جاهز لإنشاء ملفات الأدلة لـ ${totalUploadedSheets} مرشح. يتم استبعاد المرشحين بانتظار الرفع تلقائياً.`
                  : `Ready to compile evidence packages for ${totalUploadedSheets} candidate(s). Pending candidates are excluded.`}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-amber-800 font-medium">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                {language === 'ar'
                  ? 'لا توجد نماذج تقييم مرفوعة لهذه الدفعة حتى الآن.'
                  : 'No final evaluation sheets uploaded for this batch yet.'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={isGeneratingZip}>
              {language === 'ar' ? 'إغلاق' : 'Close'}
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleGenerateBatchZip}
              disabled={isGeneratingZip || totalUploadedSheets === 0}
              leftIcon={
                isGeneratingZip ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Download className="w-4 h-4" />
                )
              }
            >
              {isGeneratingZip
                ? (generationProgress || (language === 'ar' ? 'جارٍ الإنشاء...' : 'Generating Package...'))
                : language === 'ar'
                ? `إنشاء حزمة الأدلة (ZIP) [${totalUploadedSheets}]`
                : `Generate Assessment Evidence (ZIP) [${totalUploadedSheets}]`}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 1. Summary Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-[10px] uppercase font-bold text-stone-500 block">
              {language === 'ar' ? 'رقم الدفعة / المعرف' : 'Batch Name / Batch ID'}
            </span>
            <span className="text-sm font-bold font-mono text-[#7A2E3A] block mt-0.5 truncate" title={batch.batchNumber}>
              {batch.batchNumber}
            </span>
            <span className="text-[10px] text-stone-500 block font-mono mt-0.5">
              ID: {batch.id}
            </span>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-[10px] uppercase font-bold text-stone-500 block">
              {language === 'ar' ? 'إجمالي المرشحين' : 'Total Candidates in Batch'}
            </span>
            <span className="text-lg font-black text-stone-800 block mt-0.5">
              {totalCandidates}
            </span>
            <span className="text-[10px] text-stone-500 block mt-0.5">
              {language === 'ar' ? 'مرشح مسجل في الدفعة' : 'Registered candidates'}
            </span>
          </div>

          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">
              {language === 'ar' ? 'النماذج المرفوعة' : 'Final Sheets Uploaded'}
            </span>
            <span className="text-lg font-black text-emerald-800 block mt-0.5">
              {totalUploadedSheets}
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
              {totalCandidates > 0 ? Math.round((totalUploadedSheets / totalCandidates) * 100) : 0}% {language === 'ar' ? 'مكتمل' : 'Completed'}
            </span>
          </div>

          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200">
            <span className="text-[10px] uppercase font-bold text-amber-700 block">
              {language === 'ar' ? 'بانتظار الرفع' : 'Pending Upload'}
            </span>
            <span className="text-lg font-black text-amber-800 block mt-0.5">
              {totalPendingSheets}
            </span>
            <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
              {language === 'ar' ? 'مستبعد من الحزمة' : 'Excluded from package'}
            </span>
          </div>
        </div>

        {/* 2. Candidate-wise Evaluation Sheet Status List */}
        <div>
          <ModalSectionTitle
            title={
              language === 'ar'
                ? 'حالة نماذج التقييم النهائي للمرشحين (Candidate Final Evaluation Sheet Status)'
                : 'Candidate Final Evaluation Sheet Status'
            }
          />

          <div className="border border-[#E8D9D2] rounded-xl overflow-hidden shadow-2xs">
            <div className="max-h-[340px] overflow-y-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-[#FAF8F5] border-b border-[#E8D9D2] text-[#7C756D] font-semibold sticky top-0 z-10">
                  <tr>
                    <th className="p-2.5 text-start w-10">#</th>
                    <th className="p-2.5 text-start">
                      {language === 'ar' ? 'المرشح' : 'Candidate'}
                    </th>
                    <th className="p-2.5 text-start">
                      {language === 'ar' ? 'رقم الجواز' : 'Passport No.'}
                    </th>
                    <th className="p-2.5 text-start">
                      {language === 'ar' ? 'نموذج التقييم النهائي' : 'Final Evaluation Sheet'}
                    </th>
                    <th className="p-2.5 text-end">
                      {language === 'ar' ? 'الإجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E6E1]">
                  {batchCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-stone-500">
                        {language === 'ar'
                          ? 'لا يوجد مرشحون مسجلون في هذه الدفعة.'
                          : 'No candidates registered in this batch.'}
                      </td>
                    </tr>
                  ) : (
                    batchCandidates.map((cand, idx) => {
                      const sheetInfo = getCandidateFinalEvaluationSheet(cand);
                      const isUploaded = sheetInfo.hasSheet;
                      const isDownloading = downloadingCandidateId === cand.id;

                      return (
                        <tr
                          key={cand.id}
                          className={`hover:bg-[#FFFCF8] transition-colors ${
                            isUploaded ? 'bg-white' : 'bg-stone-50/40'
                          }`}
                        >
                          <td className="p-2.5 font-mono text-stone-500">{idx + 1}</td>

                          <td className="p-2.5">
                            <div className="font-semibold text-[#2C2623]">
                              {language === 'ar' ? cand.fullNameAr || cand.fullNameEn : cand.fullNameEn}
                            </div>
                            <div className="text-[10px] text-stone-500 font-mono">
                              ID: {cand.nationalId || cand.aproReference || cand.id}
                            </div>
                          </td>

                          <td className="p-2.5 font-mono font-bold text-[#7A2E3A]">
                            {cand.passportNumber}
                          </td>

                          <td className="p-2.5">
                            {isUploaded ? (
                              <div className="flex flex-col">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 w-fit">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{language === 'ar' ? '✓ تم الرفع' : '✓ Uploaded'}</span>
                                </span>
                                <span className="text-[10px] font-mono text-stone-600 mt-0.5 truncate max-w-[220px]" title={sheetInfo.fileName}>
                                  {sheetInfo.fileName} {sheetInfo.uploadDate ? `• ${sheetInfo.uploadDate}` : ''}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 w-fit">
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>{language === 'ar' ? '✕ معلق' : '✕ Pending'}</span>
                                </span>
                                <span className="text-[10px] text-stone-500 mt-0.5">
                                  {language === 'ar' ? 'بانتظار رفع المقيم للنموذج' : 'Awaiting Assessor upload'}
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="p-2.5 text-end">
                            {isUploaded ? (
                              <button
                                type="button"
                                onClick={() => handleDownloadSinglePdf(cand)}
                                disabled={isDownloading || isGeneratingZip}
                                className="p-1 px-2.5 rounded text-xs font-semibold text-[#7A2E3A] hover:bg-[#F8ECEE] border border-[#E8D9D2] transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                                title={language === 'ar' ? 'تحميل ملف الأدلة الفردي' : 'Download Individual Evidence PDF'}
                              >
                                {isDownloading ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-[#7A2E3A]" />
                                ) : (
                                  <Download className="w-3 h-3 text-[#7A2E3A]" />
                                )}
                                <span>{language === 'ar' ? 'تحميل PDF' : 'Download PDF'}</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-stone-400 italic">
                                {language === 'ar' ? 'غير مؤهل' : 'Ineligible'}
                              </span>
                            )}
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

        {/* 3. Workflow & Evidence Information Notice */}
        <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8D9D2] text-[11px] text-stone-600 space-y-1">
          <div className="font-bold text-[#2C2623] flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-[#7A2E3A]" />
            <span>{language === 'ar' ? 'محتوى ملف الأدلة المعتمد للمرشح:' : 'Candidate Evidence PDF Structure & Verification Workflow:'}</span>
          </div>
          <p className="text-[10.5px]">
            {language === 'ar'
              ? 'يحتوي ملف كل مرشح على بيانات المرشح وصور التقييم بترتيبها الزمني (التسجيل Enroll → اختبار CBT → الاختبار العملي Practical)، تليها ورقة التقييم النهائي الأصلية المرفوعة من المقيم كما هي تماماً في الصفحة التالية دون أي إعادة تصميم.'
              : 'Each candidate PDF contains Candidate Information and Assessment Photos in chronological order (Enroll → CBT → Practical), followed by the original Assessor-uploaded Final Evaluation Sheet preserved verbatim on the next page.'}
          </p>
        </div>
      </div>
    </Modal>
  );
};
