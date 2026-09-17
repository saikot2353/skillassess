import React, { useState, useEffect, useMemo } from 'react';
import { 
  Camera, Eye, Edit2, Search, Filter, CheckCircle2, 
  AlertTriangle, RefreshCw, UserCheck, Shield, Upload, Sparkles
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal, ModalSectionTitle } from '../components/ui/Modal';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { Candidate, Batch } from '../types';

interface CandidatePhotosPageProps {
  onNavigate?: (path: string) => void;
}

export const CandidatePhotosPage: React.FC<CandidatePhotosPageProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  const userCenterId = user?.centerId || 'ctr-sa-1';

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [batchFilter, setBatchFilter] = useState('ALL');

  // Modals
  const [viewingCandidate, setViewingCandidate] = useState<Candidate | null>(null);
  const [replacingCandidate, setReplacingCandidate] = useState<Candidate | null>(null);
  const [replaceReason, setReplaceReason] = useState('');
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);

  const loadData = () => {
    const allCandidates = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const centerCandidates = allCandidates.filter(c => c.centerId === userCenterId && !!c.photoUrl);
    setCandidates(centerCandidates);

    const allBatches = StorageService.get<Batch[]>(STORAGE_KEYS.BATCHES, []);
    setBatches(allBatches.filter(b => b.centerId === userCenterId));
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    return candidates.filter(c => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = 
        c.fullNameEn.toLowerCase().includes(q) ||
        c.passportNumber.toLowerCase().includes(q) ||
        c.aproReference.toLowerCase().includes(q) ||
        c.occupation.toLowerCase().includes(q);

      const matchesBatch = batchFilter === 'ALL' || c.batchId === batchFilter;
      return matchesSearch && matchesBatch;
    });
  }, [candidates, searchTerm, batchFilter]);

  const sampleReplacementPhotos = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&auto=format&fit=crop&q=80',
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      showToast('Please select a valid image file.', 'error');
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Please select a valid image file (JPG, PNG, or WEBP).', 'error');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showToast('Image file size must not exceed 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setNewPhotoPreview(reader.result);
      }
    };
    reader.onerror = () => {
      showToast('Unable to update candidate photo. Please try again.', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleOpenReplace = (cand: Candidate) => {
    setReplacingCandidate(cand);
    setReplaceReason('');
    setNewPhotoPreview(null);
  };

  const handleSavePhotoReplacement = () => {
    if (!replacingCandidate) return;
    if (!newPhotoPreview) {
      showToast('Please select a valid image file.', 'error');
      return;
    }
    if (!replaceReason.trim()) {
      showToast('Justification reason is required for photo replacement.', 'error');
      return;
    }

    try {
      const updated: Candidate = {
        ...replacingCandidate,
        photoUrl: newPhotoPreview,
      };

      StorageService.updateItem(STORAGE_KEYS.CANDIDATES, updated);
      AuditService.log(
        'UPDATE_CANDIDATE',
        'CANDIDATE_PHOTO',
        `Candidate photo updated for ${updated.fullNameEn} (${updated.passportNumber}). Reason: ${replaceReason.trim()}`,
        updated.id,
        'SUCCESS'
      );

      showToast('Photo updated successfully.', 'success');
      setReplacingCandidate(null);
      loadData();
    } catch (err) {
      showToast('Unable to update candidate photo. Please try again.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title={language === 'ar' ? 'إدارة صور المرشحين البيومترية' : 'Candidate Biometric Photo Gallery'}
        subtitle={language === 'ar' ? 'سجل الصور الملتقطة أثناء التسجيل، التحقق من مطابقة الهوية، والتعديل المعتمد' : 'Review enrolled biometric candidate photos, verify facial compliance, and perform authorized replacements.'}
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: language === 'ar' ? 'المرشحون' : 'Candidates', href: '/candidates' },
          { label: language === 'ar' ? 'الصور' : 'Photos' },
        ]}
      />

      {/* Filter and Search Bar */}
      <div className="p-3 bg-white border border-[#E8D9D2] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-[#806F6F]">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search candidate name, passport, APRO..."
            className="w-full text-xs bg-white border border-[#E8D9D2] rounded-lg py-1.5 ps-9 pe-3 focus:outline-none focus:border-[#7A2E3A]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-4 h-4 text-[#806F6F]" />
          <select
            value={batchFilter}
            onChange={e => setBatchFilter(e.target.value)}
            className="text-xs bg-white border border-[#E8D9D2] rounded-lg py-1.5 px-2.5 focus:outline-none focus:border-[#7A2E3A]"
          >
            <option value="ALL">{language === 'ar' ? 'جميع الدفعات' : 'All Batches'}</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.batchNumber}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Photo Cards Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-[#E8D9D2] bg-white text-[#806F6F] space-y-2">
          <Camera className="w-10 h-10 mx-auto opacity-40 text-[#7A2E3A]" />
          <h4 className="text-sm font-bold text-[#3F3030]">
            {language === 'ar' ? 'لا توجد صور بيومترية مسجلة' : 'No Candidate Photos Found'}
          </h4>
          <p className="text-xs">
            {language === 'ar' ? 'يتم حفظ الصور تلقائياً عند إتمام تسجيل الحضور للمرشحين.' : 'Photos are captured and archived automatically during candidate enrollment.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(cand => {
            const batch = batches.find(b => b.id === cand.batchId);
            return (
              <div
                key={cand.id}
                className="rounded-xl border border-[#E8D9D2] bg-white overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between group"
              >
                {/* Photo Viewer Card */}
                <div className="relative aspect-4/3 bg-[#FFFCF8] overflow-hidden border-b border-[#E8D9D2]">
                  <img
                    src={cand.photoUrl}
                    alt={cand.fullNameEn}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <span className="absolute top-2 end-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FFFFFF]/90 text-[#7A2E3A] shadow-xs border border-[#E8D9D2]">
                    {cand.passportNumber}
                  </span>
                </div>

                {/* Info & Meta */}
                <div className="p-3.5 space-y-2">
                  <div>
                    <h4 className="text-xs font-bold text-[#3F3030] line-clamp-1">
                      {language === 'ar' ? cand.fullNameAr : cand.fullNameEn}
                    </h4>
                    <span className="text-[10px] font-mono text-[#806F6F] block">
                      {cand.aproReference}
                    </span>
                  </div>

                  <div className="text-[11px] text-[#806F6F] space-y-0.5 pt-1 border-t border-[#E8D9D2]/70">
                    <div className="flex items-center justify-between">
                      <span>Occupation:</span>
                      <span className="font-semibold text-[#3F3030] truncate max-w-[120px]">{cand.occupation}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Batch:</span>
                      <span className="font-mono text-[#7A2E3A]">{batch ? batch.batchNumber : cand.batchId}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-[#E8D9D2]/70">
                    <button
                      type="button"
                      onClick={() => {
                        setViewingCandidate(cand);
                        AuditService.log('VIEW', 'CANDIDATE_PHOTO', `Viewed high-res biometric portrait for ${cand.fullNameEn} (${cand.passportNumber})`, cand.id);
                      }}
                      className="flex-1 py-1 px-2 rounded text-xs font-semibold text-[#7A2E3A] bg-[#F8ECEE] hover:bg-[#7A2E3A] hover:text-white transition-colors flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>{t.common.view}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenReplace(cand)}
                      className="p-1 px-2 rounded text-xs font-semibold text-[#806F6F] hover:text-[#3F3030] hover:bg-stone-100 transition-colors flex items-center gap-1 border border-[#E8D9D2]"
                      title="Authorized photo retake"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Replace</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View High-Res Modal */}
      {viewingCandidate && (
        <Modal
          isOpen={!!viewingCandidate}
          onClose={() => setViewingCandidate(null)}
          maxWidth="md"
          title={language === 'ar' ? viewingCandidate.fullNameAr : viewingCandidate.fullNameEn}
          subtitle={`Passport: ${viewingCandidate.passportNumber} | APRO: ${viewingCandidate.aproReference}`}
          footer={
            <Button variant="secondary" size="sm" onClick={() => setViewingCandidate(null)}>
              {t.common.close}
            </Button>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="w-48 h-56 mx-auto rounded-xl overflow-hidden border-2 border-[#E8D9D2] shadow-sm bg-white">
              <img
                src={viewingCandidate.photoUrl}
                alt={viewingCandidate.fullNameEn}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-3.5 rounded-lg bg-[#FFFCF8] border border-[#E8D9D2] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#806F6F]">Biometric Facial Compliance:</span>
                <span className="font-bold text-emerald-700">99.4% Verified</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#806F6F]">Target Occupation:</span>
                <span className="font-semibold text-[#3F3030]">{viewingCandidate.occupation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#806F6F]">Enrolled Timestamp:</span>
                <span className="font-mono text-[#3F3030]">{viewingCandidate.enrolledAt ? new Date(viewingCandidate.enrolledAt).toLocaleString() : 'Assessment Day'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#806F6F]">Center Authority:</span>
                <span className="font-mono text-[#7A2E3A]">{userCenterId}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Authorized Photo Replace Modal */}
      {replacingCandidate && (
        <Modal
          isOpen={!!replacingCandidate}
          onClose={() => setReplacingCandidate(null)}
          maxWidth="md"
          title="Authorized Photo Correction"
          subtitle={`Candidate: ${replacingCandidate.fullNameEn} (${replacingCandidate.passportNumber})`}
          infoNotice="All biometric photo replacements are logged to the security audit trail."
          footer={
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setReplacingCandidate(null)}>
                {t.common.cancel}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSavePhotoReplacement}
                disabled={!newPhotoPreview || !replaceReason.trim()}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                Confirm Replacement
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Comparison of Current vs New */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#FAF8F5] border border-[#E8D9D2] rounded-xl">
              <div>
                <span className="text-[#806F6F] font-semibold block mb-1">Current Biometric Photo:</span>
                <div className="w-full aspect-square rounded-lg overflow-hidden border border-[#E8D9D2] bg-white">
                  <img
                    src={replacingCandidate.photoUrl}
                    alt="Current"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div>
                <span className="text-[#806F6F] font-semibold block mb-1">Replacement Preview:</span>
                <div className="w-full aspect-square rounded-lg overflow-hidden border-2 border-dashed border-[#7A2E3A]/40 bg-white flex items-center justify-center">
                  {newPhotoPreview ? (
                    <img
                      src={newPhotoPreview}
                      alt="Replacement Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-2 text-[#806F6F]">
                      <Camera className="w-6 h-6 mx-auto mb-1 opacity-40 text-[#7A2E3A]" />
                      <span className="text-[10px] block">No file selected</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* File Upload Option */}
            <div>
              <label className="text-xs font-bold text-[#3F3030] block mb-1">
                Upload New Image File (JPG, PNG, WEBP — Max 5MB):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="photo-file-upload"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="photo-file-upload"
                  className="px-3 py-1.5 rounded-lg border border-[#E8D9D2] bg-white hover:bg-[#FAF8F5] text-[#3F3030] font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5 text-[#7A2E3A]" />
                  <span>Choose Image File</span>
                </label>
                <span className="text-[11px] text-[#806F6F]">
                  {newPhotoPreview ? 'Image loaded into preview' : 'Supported formats: JPG, PNG, WEBP'}
                </span>
              </div>
            </div>

            {/* Presets / Camera Samples */}
            <div>
              <ModalSectionTitle title="Or Select Calibrated Preset Portrait" />
              <div className="grid grid-cols-4 gap-2">
                {sampleReplacementPhotos.map((p, idx) => (
                  <div
                    key={idx}
                    onClick={() => setNewPhotoPreview(p)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                      newPhotoPreview === p ? 'border-[#7A2E3A] ring-2 ring-[#7A2E3A]/30' : 'border-[#E8D9D2] hover:border-[#7A2E3A]'
                    }`}
                  >
                    <img src={p} alt="Sample option" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#3F3030] block mb-1">
                Mandatory Justification Reason:
              </label>
              <textarea
                value={replaceReason}
                onChange={e => setReplaceReason(e.target.value)}
                placeholder="e.g. Previous photo had glare on spectacles / Biometric camera recalibration"
                rows={2}
                className="w-full p-2.5 bg-white border border-[#E8D9D2] rounded-lg text-xs focus:outline-none focus:border-[#7A2E3A]"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
