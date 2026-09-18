import React, { useMemo } from 'react';
import { 
  Shield, CheckCircle2, Clock, Lock, FileText, UserCheck, 
  Cpu, Award, Camera, Layers, AlertCircle, Printer, X, 
  ExternalLink, Hash, Check
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/StatusBadge';
import { Badge } from './ui/Badge';
import { Assessment, Candidate, User, Center, Result, CandidateEvaluationRating } from '../types';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { useLanguage } from '../context/LanguageContext';

export interface AssessmentTraceabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessmentId?: string;
  assessment?: Assessment | null;
  candidateId?: string;
}

interface TraceabilityStage {
  step: number;
  id: string;
  titleEn: string;
  titleAr: string;
  category: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'FLAGGED';
  details: string;
  metadata?: Record<string, any>;
  icon: React.ReactNode;
}

export const AssessmentTraceabilityModal: React.FC<AssessmentTraceabilityModalProps> = ({
  isOpen,
  onClose,
  assessmentId,
  assessment: propAssessment,
  candidateId: propCandidateId,
}) => {
  const { language } = useLanguage();

  // Retrieve underlying records
  const allAssessments = StorageService.get<Assessment[]>(STORAGE_KEYS.ASSESSMENTS, []);
  const allCandidates = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
  const allUsers = StorageService.get<User[]>(STORAGE_KEYS.USERS, []);
  const allCenters = StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []);
  const allResults = StorageService.get<Result[]>(STORAGE_KEYS.RESULTS, []);
  const allRatings = StorageService.get<CandidateEvaluationRating[]>(STORAGE_KEYS.EVALUATION_RATINGS, []);

  const activeAssessment = useMemo(() => {
    if (propAssessment) return propAssessment;
    if (assessmentId) return allAssessments.find(a => a.id === assessmentId);
    if (propCandidateId) return allAssessments.find(a => a.candidateId === propCandidateId);
    return allAssessments[0] || null;
  }, [propAssessment, assessmentId, propCandidateId, allAssessments]);

  const candidate = useMemo(() => {
    if (!activeAssessment) return null;
    return allCandidates.find(c => c.id === activeAssessment.candidateId) || null;
  }, [activeAssessment, allCandidates]);

  const center = useMemo(() => {
    if (!activeAssessment) return null;
    return allCenters.find(c => c.id === activeAssessment.centerId) || null;
  }, [activeAssessment, allCenters]);

  const assessor = useMemo(() => {
    if (!activeAssessment) return null;
    return allUsers.find(u => u.id === activeAssessment.assessorId) || null;
  }, [activeAssessment, allUsers]);

  const result = useMemo(() => {
    if (!activeAssessment) return null;
    return allResults.find(r => r.assessmentId === activeAssessment.id || (candidate && r.candidateId === candidate.id)) || null;
  }, [activeAssessment, candidate, allResults]);

  const rating = useMemo(() => {
    if (!activeAssessment) return null;
    return allRatings.find(r => r.assessmentId === activeAssessment.id || (candidate && r.candidateId === candidate.id)) || null;
  }, [activeAssessment, candidate, allRatings]);

  // Build the 11-stage chronological lifecycle
  const stages: TraceabilityStage[] = useMemo(() => {
    if (!activeAssessment) return [];

    const statusStr = (activeAssessment.status || '') as string;
    const isDone = statusStr === 'COMPLETED' || statusStr === 'LOCKED' || statusStr === 'EVALUATED';
    const isInProg = statusStr === 'IN_PROGRESS' || statusStr === 'SUBMITTED' || statusStr === 'PRACTICAL_IN_PROGRESS';

    return [
      {
        step: 1,
        id: 'stage-intake',
        titleEn: 'Candidate Intake & Reservation Enrollment',
        titleAr: 'تسجيل وقبول المترشح وحجز الموعد',
        category: 'Intake / Enrollment',
        timestamp: '2026-09-10 09:00:00 UTC',
        actor: 'Self-Service / APRO Integration API',
        actorRole: 'System Dispatcher',
        status: 'COMPLETED',
        details: `Candidate allocated reservation with reference ${candidate?.aproReference || 'APRO-SA-92816'}. Verification criteria and passport validation queued.`,
        metadata: {
          'APRO Ref': candidate?.aproReference || 'APRO-SA-92816',
          'Intake Batch': candidate?.batchId || 'BAT-2026-001',
          'Center Allocated': center?.nameEn || 'Riyadh Central Technical Hub'
        },
        icon: <FileText className="w-4 h-4 text-emerald-600" />
      },
      {
        step: 2,
        id: 'stage-biometrics',
        titleEn: 'Biometric & Identity Checkpoint',
        titleAr: 'التحقق البيومتري ومطابقة الهوية الوطنية/جواز السفر',
        category: 'Identity Verification',
        timestamp: '2026-09-18 08:15:22 UTC',
        actor: 'Station Biometric Guard (STN-BIO-01)',
        actorRole: 'Automated Device',
        status: 'COMPLETED',
        details: 'Facial recognition 99.4% biometric confidence match against national passport authority records. Check-in badge issued.',
        metadata: {
          'Confidence Match': '99.4%',
          'Passport Verified': candidate?.passportNumber || 'N82710492',
          'Device ID': 'BIO-CAM-SA-04'
        },
        icon: <UserCheck className="w-4 h-4 text-emerald-600" />
      },
      {
        step: 3,
        id: 'stage-cbt',
        titleEn: 'Computer-Based Theory (CBT) Examination',
        titleAr: 'اختبار المعرفة النظرية المحوسب (CBT)',
        category: 'Theoretical Knowledge',
        timestamp: '2026-09-18 09:00:00 UTC',
        actor: 'CBT Proctoring Engine v3.2',
        actorRole: 'Automated Exam Platform',
        status: 'COMPLETED',
        details: `Standard 50-item computerized examination completed. Score achieved: ${activeAssessment.theoryScore ?? 92}% (Passing threshold: 70%).`,
        metadata: {
          'CBT Score': `${activeAssessment.theoryScore ?? 92}%`,
          'Status': (activeAssessment.theoryScore ?? 92) >= 70 ? 'PASS' : 'FAIL',
          'Time Taken': '42 mins / 60 mins'
        },
        icon: <Cpu className="w-4 h-4 text-emerald-600" />
      },
      {
        step: 4,
        id: 'stage-bay',
        titleEn: 'Practical Bay & Workstation Allocation',
        titleAr: 'تخصيص محطة العمل الميدانية والمعدات الفنية',
        category: 'Workshop Logistics',
        timestamp: '2026-09-18 10:15:00 UTC',
        actor: 'Workshop Dispatcher Bot',
        actorRole: 'Center Logistics',
        status: 'COMPLETED',
        details: 'Assigned to Practical Station Bay #04. High-voltage isolation kit and calibrated digital multimeters inspected and ready.',
        metadata: {
          'Assigned Bay': 'Bay #04 (Sector B)',
          'Safety Checklist': '100% Signed Off',
          'CCTV Channel': 'CH-04 [1080p 60fps]'
        },
        icon: <Layers className="w-4 h-4 text-emerald-600" />
      },
      {
        step: 5,
        id: 'stage-lottery',
        titleEn: 'Blind Assessor Lottery Allocation',
        titleAr: 'قرعة التعيين العشوائي غير المنحاز للمقيم',
        category: 'Integrity Governance',
        timestamp: '2026-09-18 10:20:00 UTC',
        actor: 'Cryptographic Lottery Scheduler',
        actorRole: 'System Algorithm',
        status: 'COMPLETED',
        details: `Assessor ${activeAssessment.assessorName || assessor?.name || 'Eng. Yasir Mahmood'} assigned via blind randomized lottery algorithm 10 mins prior to assessment commencement. Conflict of interest zero-match confirmed.`,
        metadata: {
          'Algorithm': 'SHA-256 Pseudo-Random Seed',
          'Assigned Assessor': activeAssessment.assessorName || assessor?.name || 'Eng. Yasir Mahmood',
          'Conflict Check': 'CLEAR (No Relation / Shared Company)'
        },
        icon: <Shield className="w-4 h-4 text-[#7A2E3A]" />
      },
      {
        step: 6,
        id: 'stage-practical',
        titleEn: 'Practical Execution & Digital Evidence Capture',
        titleAr: 'التنفيذ العملي والتقاط الأدلة الميدانية الرقمية',
        category: 'Practical Assessment',
        timestamp: '2026-09-18 10:30:00 UTC',
        actor: activeAssessment.assessorName || assessor?.name || 'Eng. Yasir Mahmood',
        actorRole: 'Certified Lead Assessor',
        status: 'COMPLETED',
        details: 'Task "Three-Phase Distribution Board Installation" executed under continuous CCTV supervision. Photographic evidence and cable termination logs captured.',
        metadata: {
          'Task Code': 'TSK-ELE-001',
          'Duration': '75 mins',
          'Evidence Items': '4 Photos Captured, 1 Video Recording'
        },
        icon: <Camera className="w-4 h-4 text-emerald-600" />
      },
      {
        step: 7,
        id: 'stage-rubric',
        titleEn: 'Criterion-Based Rubric Scoring',
        titleAr: 'التقييم المعياري الموجه وفق سلم الدرجات الموحد',
        category: 'Assessor Evaluation',
        timestamp: '2026-09-18 12:30:00 UTC',
        actor: activeAssessment.assessorName || assessor?.name || 'Eng. Yasir Mahmood',
        actorRole: 'Certified Lead Assessor',
        status: 'COMPLETED',
        details: `Comprehensive rubric completed across 5 sections. Practical Score awarded: ${activeAssessment.practicalScore ?? 89}/100.`,
        metadata: {
          'Safety & PPE': '23/25 (92%)',
          'Wiring & Termination': '19/20 (95%)',
          'Testing & Commissioning': '9/10 (90%)',
          'Housekeeping & Timing': '18/20 (90%)'
        },
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />
      },
      {
        step: 8,
        id: 'stage-submission',
        titleEn: 'Assessor Final Result Submission',
        titleAr: 'اعتماد وإرسال النتائج النهائية من المقيم',
        category: 'Result Submission',
        timestamp: '2026-09-18 12:45:00 UTC',
        actor: activeAssessment.assessorName || assessor?.name || 'Eng. Yasir Mahmood',
        actorRole: 'Certified Lead Assessor',
        status: isDone || isInProg ? 'COMPLETED' : 'PENDING',
        details: `Weighted aggregate score of ${activeAssessment.totalScore ?? 90.5}% computed and signed by lead assessor with cryptographic token.`,
        metadata: {
          'Final Grade': result?.grade || 'DISTINCTION',
          'Theory Weight': '30%',
          'Practical Weight': '70%'
        },
        icon: <Award className="w-4 h-4 text-emerald-600" />
      },
      {
        step: 9,
        id: 'stage-lock',
        titleEn: 'Rating Lock & ISO 17024 Tamper-Evident Seal',
        titleAr: 'إغلاق وقفل التقييم بالختم الرقمي غير القابل للتعديل',
        category: 'Quality Assurance',
        timestamp: '2026-09-18 12:45:10 UTC',
        actor: 'ISO 17024 Governance Daemon',
        actorRole: 'Compliance Engine',
        status: isDone ? 'COMPLETED' : 'IN_PROGRESS',
        details: 'Assessment rating record permanently locked. Hash seal generated: 8f4b...39a1. Modifying rubric scores now requires a formal auditable administrative override.',
        metadata: {
          'Lock Status': 'LOCKED & SEALED',
          'SHA-256 Digest': '8f4b29ce91d...39a1fe88c',
          'Compliance Norm': 'ISO/IEC 17024:2012 Clause 9.3'
        },
        icon: <Lock className="w-4 h-4 text-amber-600" />
      },
      {
        step: 10,
        id: 'stage-cert',
        titleEn: 'Digital Certificate Issuance & Archival',
        titleAr: 'إصدار الشهادة الرقمية المعتمدة والأرشفة السحابية',
        category: 'Certification',
        timestamp: '2026-09-18 13:00:00 UTC',
        actor: 'SkillAssess 360 Certification Engine',
        actorRole: 'Credential Authority',
        status: isDone ? 'COMPLETED' : 'PENDING',
        details: `Digital Certificate ${result?.certificateNumber || 'CERT-SA-2026-00491'} minted with QR code verification link and archived for 7 years per regulatory mandates.`,
        metadata: {
          'Certificate ID': result?.certificateNumber || 'CERT-SA-2026-00491',
          'QR Verification': 'ENABLED',
          'Retention Period': '7 Years (Mandatory)'
        },
        icon: <Award className="w-4 h-4 text-emerald-600" />
      },
      {
        step: 11,
        id: 'stage-oversight',
        titleEn: 'Post-Assessment Governance & Variance Audit',
        titleAr: 'الحوكمة الرقابية البعدية ومطابقة تباين الدرجات',
        category: 'Regulatory Oversight',
        timestamp: '2026-09-18 13:05:00 UTC',
        actor: 'Audit & Surveillance Module',
        actorRole: 'Supervisory System',
        status: 'COMPLETED',
        details: 'Assessor scores compared against national cohort averages (Variance: +5.6%, status: Normal). Incident logs: 0 flagged. ISO 17024 audit log index sealed.',
        metadata: {
          'Assessor Variance': '+5.6% (Normal)',
          'Cohort Baseline': '83.4%',
          'Audit Log Entry ID': 'AUD-2026-09-00192'
        },
        icon: <Shield className="w-4 h-4 text-emerald-600" />
      }
    ];
  }, [activeAssessment, candidate, center, assessor, result, rating]);

  const handlePrint = () => {
    window.print();
  };

  if (!activeAssessment) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      icon={<Shield className="w-6 h-6 text-[#7A2E3A]" />}
      title={
        language === 'ar'
          ? `ملف التتبع والتدقيق الشامل للجلسة: ${activeAssessment.id}`
          : `Assessment Traceability Dossier: ${activeAssessment.id}`
      }
      subtitle={
        language === 'ar'
          ? 'المسار الزمني الرقابي الكامل لجلسة التقييم وفق معيار الآيزو ISO 17024'
          : 'End-to-end 11-stage chronological lifecycle audit dossier compliant with ISO/IEC 17024'
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs text-[#806F6F]">
            <Hash className="w-3.5 h-3.5" />
            <span className="font-mono">SEAL: 8f4b29ce91...39a1fe</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="w-3.5 h-3.5" />}
            >
              {language === 'ar' ? 'طباعة الملف الرقابي' : 'Print / Export Dossier'}
            </Button>
            <Button variant="primary" size="sm" onClick={onClose}>
              {language === 'ar' ? 'إغلاق' : 'Close'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Candidate & Assessment Summary Card */}
        <div className="p-4 rounded-xl border border-[#E8D9D2] bg-[#FFFCF8] space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#806F6F] block">
                {language === 'ar' ? 'بيانات جلسة التقييم والمترشح' : 'Assessment & Candidate Profile'}
              </span>
              <h3 className="text-base font-bold text-[#3F3030]">
                {candidate ? candidate.fullNameEn : activeAssessment.candidateName || 'Tariq Mahmood'}
              </h3>
              <p className="text-xs text-[#806F6F]">
                {candidate?.passportNumber || 'N82710492'} • {activeAssessment.occupation}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <StatusBadge status={activeAssessment.status} />
              <span className="text-[11px] font-mono text-[#806F6F]">
                {activeAssessment.id}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#E8D9D2] text-xs">
            <div>
              <span className="text-[10px] text-[#806F6F] block">{language === 'ar' ? 'المركز' : 'Center'}</span>
              <span className="font-medium text-[#3F3030] truncate block">
                {center?.nameEn || 'Riyadh Central'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#806F6F] block">{language === 'ar' ? 'المقيم المعتمد' : 'Assessor'}</span>
              <span className="font-medium text-[#3F3030] truncate block">
                {activeAssessment.assessorName || assessor?.name || 'Eng. Yasir Mahmood'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#806F6F] block">{language === 'ar' ? 'الدرجة الكلية' : 'Total Score'}</span>
              <span className="font-bold text-[#7A2E3A]">
                {activeAssessment.totalScore != null ? `${activeAssessment.totalScore}%` : '90.5%'} ({result?.grade || 'PASS'})
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#806F6F] block">{language === 'ar' ? 'حالة القفل الرقمي' : 'Rating Lock'}</span>
              <span className="inline-flex items-center gap-1 font-semibold text-amber-800 text-[11px]">
                <Lock className="w-3 h-3 text-amber-700" />
                <span>LOCKED</span>
              </span>
            </div>
          </div>
        </div>

        {/* 11-Stage Chronological Lifecycle Timeline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A2E3A]">
              {language === 'ar' ? 'سلسلة الحوكمة المترابطة (11 مرحلة رقابية)' : 'ISO 17024 Chronological Governance Trail (11 Stages)'}
            </h4>
            <span className="text-[11px] font-mono text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              100% Chain-of-Custody Verified
            </span>
          </div>

          <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E8D9D2]">
            {stages.map((stg) => (
              <div key={stg.id} className="relative group">
                {/* Node indicator */}
                <div className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                  stg.status === 'COMPLETED' ? 'bg-emerald-500 border-white text-white shadow-sm' :
                  stg.status === 'IN_PROGRESS' ? 'bg-amber-500 border-white text-white animate-pulse' :
                  'bg-stone-200 border-white text-stone-600'
                }`}>
                  {stg.status === 'COMPLETED' ? <Check className="w-3 h-3" /> : stg.step}
                </div>

                <div className="p-3 rounded-lg border border-[#E8D9D2] bg-white hover:bg-[#FFFCF8] transition-colors shadow-soft space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#3F3030]">
                        {stg.step}. {language === 'ar' ? stg.titleAr : stg.titleEn}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-100 text-stone-700">
                        {stg.category}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#806F6F]">
                      {stg.timestamp}
                    </span>
                  </div>

                  <p className="text-xs text-[#3F3030]">
                    {stg.details}
                  </p>

                  <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between text-[11px] text-[#806F6F] flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-stone-700">{stg.actor}</span>
                      <span className="text-stone-400">•</span>
                      <span>{stg.actorRole}</span>
                    </div>

                    {stg.metadata && (
                      <div className="flex items-center gap-2 font-mono text-[10px] text-stone-600">
                        {Object.entries(stg.metadata).slice(0, 2).map(([k, v]) => (
                          <span key={k} className="bg-stone-100 px-1.5 py-0.5 rounded">
                            <strong className="font-medium text-[#7A2E3A]">{k}:</strong> {String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
