import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { storageService, STORAGE_KEYS } from '../../services/storageService';
import { Candidate, EvidenceItem, AuditLog } from '../../types';
import {
  Camera,
  UploadCloud,
  CheckCircle2,
  Trash2,
  Eye,
  FileText,
  ShieldCheck,
  Wrench,
  Video,
  Plus,
  ArrowRight,
  ArrowLeft,
  X
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';

interface AssessorEvidencePageProps {
  onNavigate?: (path: string) => void;
}

export const AssessorEvidencePage: React.FC<AssessorEvidencePageProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isRTL = language === 'ar';

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [candidate, setCandidate] = useState<Candidate | null>(null);

  // Upload Form State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [evidenceType, setEvidenceType] = useState<EvidenceItem['type']>('WORKPIECE_PHOTO');
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  // Lightbox Preview Modal
  const [lightboxItem, setLightboxItem] = useState<EvidenceItem | null>(null);

  useEffect(() => {
    const allCandidates = storageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const myCandidates = allCandidates.filter((c: Candidate) => 
      user?.role === 'SUPER_ADMIN' || c.assessorId === user?.id || (user?.role === 'ASSESSOR' && !c.assessorId && c.centerId === user?.centerId)
    );
    setCandidates(myCandidates);

    const urlParams = new URLSearchParams(window.location.search);
    const candidateIdParam = urlParams.get('candidateId');

    const active = (candidateIdParam && myCandidates.find((c: Candidate) => c.id === candidateIdParam)) || myCandidates[0];
    if (active) {
      setSelectedCandidateId(active.id);
      setCandidate(active);
    }
  }, [user]);

  const handleCandidateChange = (candId: string) => {
    setSelectedCandidateId(candId);
    const found = candidates.find(c => c.id === candId);
    if (found) setCandidate(found);
  };

  const handleSimulatedFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create local object URL for preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      if (!evidenceTitle) {
        setEvidenceTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSaveEvidence = () => {
    if (!candidate || !evidenceTitle.trim() || !user) {
      showToast(isRTL ? 'يرجى إدخال عنوان الدليل واختيار ملف' : 'Please provide a title and select a file', 'error');
      return;
    }

    setIsUploading(true);
    setTimeout(() => {
      const fallbackImages = [
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80',
      ];
      const selectedImg = previewUrl || fallbackImages[Math.floor(Math.random() * fallbackImages.length)];

      const newItem: EvidenceItem = {
        id: `ev-${Date.now()}`,
        type: evidenceType,
        title: evidenceTitle.trim(),
        uploadedAt: new Date().toISOString(),
        uploadedBy: user.name,
        status: 'VERIFIED',
        fileUrl: selectedImg,
        url: selectedImg,
        notes: evidenceNotes.trim()
      };

      const updatedEvidence = [...(candidate.evidenceItems || []), newItem];

      // Update in storage
      const allCandidates = storageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
      const updatedCandidates = allCandidates.map((c: Candidate) => {
        if (c.id === candidate.id) {
          return {
            ...c,
            evidenceStatus: 'UPLOADED' as const,
            evidenceItems: updatedEvidence
          };
        }
        return c;
      });

      storageService.set(STORAGE_KEYS.CANDIDATES, updatedCandidates);
      setCandidate({ ...candidate, evidenceStatus: 'UPLOADED', evidenceItems: updatedEvidence });

      // Audit log
      const auditLogs = storageService.get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
      const newAudit: AuditLog = {
        id: `aud-${Date.now()}`,
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: 'UPLOAD_EVIDENCE' as any,
        entity: 'Practical Evidence Desk',
        details: `Assessor uploaded ${evidenceType} evidence for candidate ${candidate.fullNameEn} (${candidate.aproReference}).`,
        timestamp: new Date().toISOString(),
        ipAddress: '192.168.1.14',
        status: 'SUCCESS'
      };
      storageService.set(STORAGE_KEYS.AUDIT_LOGS, [newAudit, ...auditLogs]);

      setIsUploading(false);
      setShowUploadModal(false);
      setEvidenceTitle('');
      setEvidenceNotes('');
      setPreviewUrl('');
      showToast(isRTL ? 'تم رفع وتوثيق الدليل بنجاح' : 'Evidence item saved successfully', 'success');
    }, 600);
  };

  const handleDeleteEvidence = (itemId: string) => {
    if (!candidate) return;
    const filtered = (candidate.evidenceItems || []).filter(item => item.id !== itemId);

    const allCandidates = storageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const updatedCandidates = allCandidates.map((c: Candidate) => {
      if (c.id === candidate.id) {
        return {
          ...c,
          evidenceItems: filtered,
          evidenceStatus: filtered.length === 0 ? ('NOT_UPLOADED' as const) : c.evidenceStatus
        };
      }
      return c;
    });

    storageService.set(STORAGE_KEYS.CANDIDATES, updatedCandidates);
    setCandidate({ ...candidate, evidenceItems: filtered });
    showToast(isRTL ? 'تم حذف عنصر الدليل' : 'Evidence item removed', 'info');
  };

  const getTypeIcon = (type: EvidenceItem['type']) => {
    switch (type) {
      case 'WORKPIECE_PHOTO':
        return <Camera className="w-4 h-4 text-blue-600" />;
      case 'SAFETY_CHECK':
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case 'TOOL_SETUP':
        return <Wrench className="w-4 h-4 text-amber-600" />;
      case 'VIDEO_CLIP':
        return <Video className="w-4 h-4 text-purple-600" />;
      case 'DOCUMENT':
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeLabel = (type: EvidenceItem['type']) => {
    switch (type) {
      case 'WORKPIECE_PHOTO':
        return isRTL ? 'صورة المنتج النهائي' : 'Workpiece Photo';
      case 'SAFETY_CHECK':
        return isRTL ? 'فحص السلامة و LOTO' : 'Safety Check';
      case 'TOOL_SETUP':
        return isRTL ? 'تجهيز وضبط الأدوات' : 'Tool Setup';
      case 'VIDEO_CLIP':
        return isRTL ? 'مقطع فيديو عملي' : 'Video Clip';
      case 'DOCUMENT':
      default:
        return isRTL ? 'وثيقة قياس وفحص' : 'Measurement Doc';
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Camera className="w-4 h-4 text-[#7A2E3A]" />
            <span>{isRTL ? 'توثيق الأدلة الميدانية' : 'Practical Evidence Management'}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#3F3030]">
            {isRTL ? 'سجل الأدلة المصورة وشهادات السلامة' : 'Practical Evidence & Workpiece Audit Capture'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {isRTL
              ? 'التقاط ورفع صور القطعة المنفذة، فحص معدات الوقاية، وتسجيل الأدلة المرئية المؤيدة لدرجات التقييم.'
              : 'Upload and organize workpiece inspection photos, safety verifications, and calibration logs.'}
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="px-5 py-2.5 rounded-xl bg-[#7A2E3A] hover:bg-[#5C1D24] text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-md"
        >
          <Plus className="w-4 h-4 text-[#C9A24D]" />
          <span>{isRTL ? 'إضافة دليل جديد' : 'Upload Evidence Item'}</span>
        </button>
      </div>

      {/* Candidate Selector Bar */}
      <div className="bg-white rounded-xl p-4 border border-[#E8D9D2] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-bold text-gray-700 whitespace-nowrap">
            {isRTL ? 'المرشح:' : 'Select Candidate:'}
          </label>
          <select
            value={selectedCandidateId}
            onChange={e => handleCandidateChange(e.target.value)}
            className="text-xs font-medium border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#7A2E3A] text-gray-900"
          >
            {candidates.map(cand => (
              <option key={cand.id} value={cand.id}>
                {isRTL ? cand.fullNameAr : cand.fullNameEn} ({cand.aproReference} - {cand.occupation})
              </option>
            ))}
          </select>
        </div>

        {candidate && (
          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-500">
              {isRTL ? 'إجمالي الأدلة المرفوعة:' : 'Evidence Items:'}{' '}
              <b className="text-purple-700">{candidate.evidenceItems?.length || 0}</b>
            </span>
            <button
              onClick={() => onNavigate?.(`/assessor/evaluation?candidateId=${candidate.id}`)}
              className="text-xs font-bold text-[#7A2E3A] hover:underline flex items-center gap-1"
            >
              <span>{isRTL ? 'الانتقال للرصد' : 'Go to Rubric'}</span>
              {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Evidence Gallery Grid */}
      {candidate && (
        <div>
          {(!candidate.evidenceItems || candidate.evidenceItems.length === 0) ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-[#E8D9D2] shadow-sm">
              <Camera className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gray-800">
                {isRTL ? 'لا توجد أدلة مرفوعة لهذا المرشح حتى الآن' : 'No Evidence Captured for Candidate Yet'}
              </h3>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                {isRTL
                  ? 'قم بالتقاط ورفع صور القطعة المنفذة أثناء أو بعد انتهاء الاختبار العملي لدعم صحة التقييم.'
                  : 'Capture and upload workpiece finish photos, tool setups, or safety check evidence before final rating.'}
              </p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-[#7A2E3A] text-white text-xs font-bold hover:bg-[#5C1D24] transition-colors inline-flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 text-[#C9A24D]" />
                <span>{isRTL ? 'رفع الدليل الأول' : 'Upload First Item'}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {candidate.evidenceItems.map(item => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-[#E8D9D2] shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
                >
                  {/* Image preview */}
                  <div
                    onClick={() => setLightboxItem(item)}
                    className="h-48 bg-gray-100 relative cursor-pointer group overflow-hidden"
                  >
                    <img
                      src={item.fileUrl || item.url || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80'}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2">
                      <Eye className="w-6 h-6" />
                      <span className="text-xs font-bold">{isRTL ? 'تكبير الصورة' : 'Inspect'}</span>
                    </div>
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow-sm text-gray-800">
                      {getTypeIcon(item.type)}
                      <span>{getTypeLabel(item.type)}</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900 leading-snug">
                        {item.title}
                      </h4>
                      {item.notes && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                          {item.notes}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                      <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isRTL ? 'معتمد' : 'Verified'}</span>
                      </div>
                      <span>{new Date(item.uploadedAt).toLocaleDateString()}</span>
                      <button
                        onClick={() => handleDeleteEvidence(item.id)}
                        className="text-gray-400 hover:text-rose-600 p-1 transition-colors"
                        title={isRTL ? 'حذف الدليل' : 'Remove evidence'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Evidence Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title={isRTL ? 'رفع وتوثيق دليل عملي جديد' : 'Upload Practical Evidence Item'}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {isRTL ? 'تصنيف الدليل الميداني:' : 'Evidence Category:'}
            </label>
            <select
              value={evidenceType}
              onChange={e => setEvidenceType(e.target.value as any)}
              className="w-full text-xs p-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#7A2E3A]/20 focus:border-[#7A2E3A]"
            >
              <option value="WORKPIECE_PHOTO">{isRTL ? 'صورة المنتج النهائي / قطعة الاختبار' : 'Workpiece Inspection Photo'}</option>
              <option value="SAFETY_CHECK">{isRTL ? 'فحص الالتزام بالسلامة و LOTO' : 'Safety Compliance & LOTO Check'}</option>
              <option value="TOOL_SETUP">{isRTL ? 'معايرة وضبط الأدوات والمعدات' : 'Tool Calibration & Setup'}</option>
              <option value="VIDEO_CLIP">{isRTL ? 'مقطع فيديو توثيقي للتشغيل' : 'Operational Video Clip'}</option>
              <option value="DOCUMENT">{isRTL ? 'تقرير القياس والأبعاد الفنية' : 'Measurement & Tolerance Sheet'}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {isRTL ? 'عنوان أو وصف الدليل:' : 'Evidence Title / Label:'}
            </label>
            <input
              type="text"
              value={evidenceTitle}
              onChange={e => setEvidenceTitle(e.target.value)}
              placeholder={isRTL ? 'مثال: محاذاة الكابلات وقواطع لوحة التوزيع' : 'e.g. Busbar termination and trunking finish'}
              className="w-full text-xs p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7A2E3A]/20 focus:border-[#7A2E3A]"
            />
          </div>

          {/* File Picker */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {isRTL ? 'اختيار الصورة أو الملف:' : 'Attach File (Image / Document):'}
            </label>
            <div className="border-2 border-dashed border-gray-300 hover:border-[#7A2E3A] rounded-xl p-4 text-center cursor-pointer relative bg-gray-50/50">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleSimulatedFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              {previewUrl ? (
                <div className="flex items-center justify-center gap-3">
                  <img src={previewUrl} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                  <span className="text-xs text-emerald-700 font-bold">{isRTL ? 'تم اختيار الصورة' : 'File Selected'}</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <UploadCloud className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-xs font-semibold text-gray-700">
                    {isRTL ? 'انقر لتصفح الملفات أو اسحب وأفلت هنا' : 'Click to browse or drag & drop'}
                  </p>
                  <p className="text-[10px] text-gray-400">JPG, PNG, PDF up to 10MB</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {isRTL ? 'ملاحظات تدقيق إضافية (اختياري):' : 'Auditor Notes (Optional):'}
            </label>
            <textarea
              rows={2}
              value={evidenceNotes}
              onChange={e => setEvidenceNotes(e.target.value)}
              placeholder={isRTL ? 'سجل ملاحظات القياس أو حالة العزل...' : 'Notes regarding tolerance, finish quality, or safety compliance...'}
              className="w-full text-xs p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7A2E3A]/20 focus:border-[#7A2E3A]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowUploadModal(false)}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold"
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="button"
              disabled={isUploading}
              onClick={handleSaveEvidence}
              className="px-5 py-2 rounded-xl bg-[#7A2E3A] hover:bg-[#5C1D24] text-white text-xs font-bold shadow-sm"
            >
              {isUploading ? (isRTL ? 'جارٍ الحفظ...' : 'Uploading...') : (isRTL ? 'حفظ وتأكيد الدليل' : 'Save & Attach')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Lightbox Modal */}
      {lightboxItem && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getTypeIcon(lightboxItem.type)}
                <span className="font-bold text-sm text-gray-900">{lightboxItem.title}</span>
              </div>
              <button
                onClick={() => setLightboxItem(null)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto bg-gray-950 flex items-center justify-center">
              <img
                src={lightboxItem.fileUrl || lightboxItem.url}
                alt={lightboxItem.title}
                className="max-h-[65vh] w-auto object-contain"
              />
            </div>
            <div className="p-4 bg-gray-50 flex items-center justify-between text-xs text-gray-600">
              <span>{isRTL ? `المقيم: ${lightboxItem.uploadedBy}` : `Assessor: ${lightboxItem.uploadedBy}`}</span>
              <span>{new Date(lightboxItem.uploadedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
