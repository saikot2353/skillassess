import React, { useState, useEffect, useRef } from 'react';
import { 
  Eye, Plus, Search, Filter, UserCheck, UserPlus, Save, User, Camera, 
  CheckCircle2, AlertTriangle, ScanBarcode, Clock,
  ShieldCheck, CheckSquare, LogOut, Wrench
} from 'lucide-react';
import { 
  Candidate, 
  CandidatePhoto, 
  Center, 
  Batch, 
  PassportVerificationRecord, 
  CandidateExitRecord,
  CandidateAssessmentStatus 
} from '../types';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { SerialService } from '../services/serialService';
import { SecurityService } from '../services/securityService';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Table, Column } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Modal, ModalSectionTitle } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Pagination } from '../components/ui/Pagination';

export interface CandidatesPageProps {
  onNavigate?: (path: string) => void;
  mode?: 'entry' | 'exit' | 'enrollment-pending' | 'enroll-verify' | 'cbt-pending' | 'cbt-confirmed' | 'practical-pending' | 'practical-confirmed';
}

// Format confirmation date & time: DD/MM/YYYY and HH:MM AM/PM
const formatConfirmationDateTime = (date: Date = new Date()) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const confirmationDate = `${day}/${month}/${year}`;

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const confirmationTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;

  return { confirmationDate, confirmationTime };
};

export const CandidatesPage: React.FC<CandidatesPageProps> = ({ onNavigate, mode = 'entry' }) => {
  const isExitMode = mode === 'exit';
  const isEnrollmentPendingMode = mode === 'enrollment-pending';
  const isEnrollVerifyMode = mode === 'enroll-verify';
  const isCbtPendingMode = mode === 'cbt-pending';
  const isCbtConfirmedMode = mode === 'cbt-confirmed';
  const isPracticalPendingMode = mode === 'practical-pending';
  const isPracticalConfirmedMode = mode === 'practical-confirmed';
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  const userCenterId = user?.centerId || 'ctr-sa-1';
  const userCountryId = user?.countryId || 'cnt-sa';
  const isCountryAccount = user?.role === 'COUNTRY_ACCOUNT' || user?.role === 'COUNTRY_ADMIN';
  const isCenterAdmin = user?.role === 'CENTER_ADMIN';
  const isAssessor = user?.role === 'ASSESSOR';
  const isCbtTestSupport = user?.role === 'CBT_TEST_SUPPORT';
  const isSupportStaff = user?.role === 'SUPPORT_STAFF';
  const isOrganizer = user?.role === 'ORGANIZER';
  const isCenterScoped = isCenterAdmin || isSupportStaff || isOrganizer || isCbtTestSupport || isAssessor;

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [allCenters, setAllCenters] = useState<Center[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [allBatches, setAllBatches] = useState<Batch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Barcode Scanner Modal State
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [simulatedBarcodeInput, setSimulatedBarcodeInput] = useState('');
  const scannerVideoRef = useRef<HTMLVideoElement>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);

  // Candidate Details / Verification Modal State
  const [viewCandidate, setViewCandidate] = useState<Candidate | null>(null);
  const [verificationPhoto, setVerificationPhoto] = useState<string | null>(null);
  const [passportMatchConfirmed, setPassportMatchConfirmed] = useState(false);
  const [exitMatchConfirmed, setExitMatchConfirmed] = useState(false);
  const [exitNotes, setExitNotes] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const photoVideoRef = useRef<HTMLVideoElement>(null);
  const photoStreamRef = useRef<MediaStream | null>(null);
  const photoCanvasRef = useRef<HTMLCanvasElement>(null);

  // Practical Assessment Modal State (Two Camera-Only Photos, Task Number 1-100, Difficulty Level)
  const [practicalPhoto1, setPracticalPhoto1] = useState<string | null>(null);
  const [practicalPhoto2, setPracticalPhoto2] = useState<string | null>(null);
  const [taskNumber, setTaskNumber] = useState<string>('');
  const [taskNumberError, setTaskNumberError] = useState<string | null>(null);
  const [practicalDifficulty, setPracticalDifficulty] = useState<string>('');
  const [activeCameraTarget, setActiveCameraTarget] = useState<'verification' | 'practical1' | 'practical2'>('verification');

  // Register Candidate Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullNameEn: '',
    fullNameAr: '',
    passportNumber: '',
    aproReference: '',
    nationalId: '',
    occupation: 'Electrical Installation',
    centerId: '',
    batchId: '',
    status: 'REGISTERED' as const,
  });

  const loadData = () => {
    const loadedCandidates = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const loadedCenters = StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []);
    const loadedBatches = StorageService.get<Batch[]>(STORAGE_KEYS.BATCHES, []);

    setAllCenters(loadedCenters);
    setAllBatches(loadedBatches);

    let filtered = loadedCandidates;
    let filteredCenters = loadedCenters;
    let filteredBatches = loadedBatches;

    if (isCenterScoped) {
      filtered = loadedCandidates.filter(c => c.centerId === userCenterId);
      filteredCenters = loadedCenters.filter(c => c.id === userCenterId);
      filteredBatches = loadedBatches.filter(b => b.centerId === userCenterId);
    } else if (isCountryAccount) {
      const countryCenterIds = new Set(loadedCenters.filter(c => c.countryId === userCountryId).map(c => c.id));
      filtered = loadedCandidates.filter(c => c.countryId === userCountryId || (c.centerId && countryCenterIds.has(c.centerId)));
      filteredCenters = loadedCenters.filter(c => c.countryId === userCountryId);
      filteredBatches = loadedBatches.filter(b => countryCenterIds.has(b.centerId));
    }

    // Dynamic Candidate Eligibility based on Page Mode:
    if (isExitMode) {
      // Only candidates whose 1st entry verification was confirmed appear in Exit List
      filtered = filtered.filter(c => c.supportStaffVerificationStatus === 'CONFIRMED' || c.passportMatchConfirmed === true);
    } else if (isEnrollmentPendingMode) {
      // The Enrollment Pending list must show ONLY those candidates whose 1st Entry Verification
      // has already been completed and confirmed by Support Staff, and who are not yet enrolled!
      filtered = filtered.filter(c => {
        const isEntryConfirmed = c.supportStaffVerificationStatus === 'CONFIRMED' || c.passportMatchConfirmed === true;
        if (!isEntryConfirmed) {
          return false;
        }
        const alreadyEnrolled = 
          c.enrollmentStatus === 'ENROLLMENT_VERIFY' ||
          c.status === 'ENROLLMENT_VERIFY' ||
          c.enrollmentStatus === 'ENROLLED' || 
          c.status === 'ENROLLED' || 
          c.status === 'IN_ASSESSMENT' || 
          c.status === 'IN_PROGRESS' || 
          c.status === 'PRACTICAL_COMPLETED' || 
          c.status === 'EVALUATION_PENDING' || 
          c.status === 'EVALUATED' || 
          c.status === 'ASSESSMENT_COMPLETED' || 
          c.status === 'RESULT_PENDING' || 
          c.status === 'SUBMITTED' || 
          c.status === 'LOCKED' || 
          c.status === 'COMPLETED';
        return !alreadyEnrolled;
      });
    } else if (isEnrollVerifyMode) {
      // The Enroll Verify list shows candidates who have completed enrollment verification
      filtered = filtered.filter(c => {
        return (
          c.enrollmentStatus === 'ENROLLMENT_VERIFY' ||
          c.status === 'ENROLLMENT_VERIFY' ||
          c.enrollmentStatus === 'ENROLLED' ||
          c.status === 'ENROLLED'
        );
      });
    } else if (isCbtPendingMode) {
      // CBT Exam Pending list:
      // Only candidates who have successfully completed enrollment, belonging to this center,
      // and whose CBT exam is pending (not confirmed or completed yet).
      filtered = filtered.filter(c => {
        const isEnrolled = 
          c.enrollmentStatus === 'ENROLLED' || 
          c.enrollmentStatus === 'ENROLLMENT_VERIFY' || 
          c.status === 'ENROLLED' || 
          c.status === 'ENROLLMENT_VERIFY' || 
          !!c.enrolledAt;
        if (!isEnrolled) return false;
        const isCbtPending = (!c.cbtStatus || c.cbtStatus === 'NOT_STARTED' || c.cbtStatus === 'PENDING') && c.cbtStatus !== 'CONFIRMED' && c.status !== 'CBT_EXAM_CONFIRMED' && c.cbtStatus !== 'COMPLETED' && c.status !== 'COMPLETED' && c.status !== 'IN_PROGRESS';
        return isCbtPending;
      });
    } else if (isCbtConfirmedMode) {
      // CBT Confirmed list:
      // Candidates whose CBT exam has been confirmed
      filtered = filtered.filter(c => {
        return c.cbtStatus === 'CONFIRMED' || c.status === 'CBT_EXAM_CONFIRMED';
      });
    } else if (isPracticalPendingMode) {
      // Practical Pending list:
      // Candidates who have completed enrollment and are awaiting practical assessment.
      // ASSESSOR DATA ISOLATION:
      // When an Assessor logs in, they see ONLY candidates assigned to their Assessor ID.
      filtered = filtered.filter(c => {
        const isEnrolled = 
          c.enrollmentStatus === 'ENROLLED' || 
          c.enrollmentStatus === 'ENROLLMENT_VERIFY' || 
          c.status === 'ENROLLED' || 
          c.status === 'ENROLLMENT_VERIFY' || 
          c.cbtStatus === 'CONFIRMED' || 
          c.status === 'CBT_EXAM_CONFIRMED' ||
          c.cbtStatus === 'COMPLETED' ||
          !!c.enrolledAt;
        if (!isEnrolled) return false;

        const isPracticalDone = c.practicalStatus === 'COMPLETED' || c.status === 'PRACTICAL_COMPLETED';
        if (isPracticalDone) return false;

        if (isAssessor) {
          return c.assessorId === user?.id || c.assessorName === user?.name;
        }
        return true;
      });
    } else if (isPracticalConfirmedMode) {
      // Practical Confirmed list:
      // Candidates whose practical assessment has been confirmed.
      // ASSESSOR DATA ISOLATION:
      // When an Assessor logs in, they see ONLY candidates assigned to their Assessor ID.
      filtered = filtered.filter(c => {
        const isPracticalDone = c.practicalStatus === 'COMPLETED' || c.status === 'PRACTICAL_COMPLETED';
        if (!isPracticalDone) return false;

        if (isAssessor) {
          return c.assessorId === user?.id || c.assessorName === user?.name;
        }
        return true;
      });
    }

    setCandidates(filtered);
    setCenters(filteredCenters);
    setBatches(filteredBatches);
  };

  // Reset table filters, search, and modals when navigating between modes
  useEffect(() => {
    setStatusFilter('ALL');
    setSearchTerm('');
    setCurrentPage(1);
    setViewCandidate(null);
    setVerificationPhoto(null);
    loadData();
  }, [mode]);

  useEffect(() => {
    loadData();
  }, [userCenterId, userCountryId, isCenterScoped, isCountryAccount, isExitMode, isEnrollmentPendingMode, isEnrollVerifyMode, isCbtPendingMode, isCbtConfirmedMode, isPracticalPendingMode, isPracticalConfirmedMode, user?.id, isAssessor]);

  // Clean up any active camera streams on unmount
  useEffect(() => {
    return () => {
      stopPhotoCamera();
      stopBarcodeCamera();
    };
  }, []);

  // Sync photo and verification state when opening candidate details modal
  useEffect(() => {
    if (viewCandidate) {
      // In CBT Pending mode, the CBT Test Support captures a NEW photo using the live camera.
      if (isCbtPendingMode) {
        setVerificationPhoto(null);
      } else if (isCbtConfirmedMode) {
        setVerificationPhoto(viewCandidate.cbtPhoto || null);
      } else if (isEnrollmentPendingMode) {
        // Enrollment Photo must be blank by default in Enrollment Pending mode.
        // It must NOT be pre-populated from the Support Staff Entry Verification Photo.
        setVerificationPhoto(null);
      } else if (isEnrollVerifyMode) {
        setVerificationPhoto(viewCandidate.enrollmentPhoto || null);
      } else {
        setVerificationPhoto(viewCandidate.passportVerificationPhoto || null);
      }
      setPassportMatchConfirmed(!!viewCandidate.passportMatchConfirmed);
      setExitMatchConfirmed(viewCandidate.exitStatus === 'CONFIRMED');
      setExitNotes(viewCandidate.exitNotes || '');
      setIsCameraActive(false);
      setCameraError(null);

      // Practical assessment states
      setPracticalPhoto1(viewCandidate.practicalPhoto1 || null);
      setPracticalPhoto2(viewCandidate.practicalPhoto2 || null);
      setTaskNumber(viewCandidate.taskNumber ? String(viewCandidate.taskNumber) : '');
      setTaskNumberError(null);
      setPracticalDifficulty(viewCandidate.taskDifficulty || '');
      setActiveCameraTarget('verification');
    } else {
      stopPhotoCamera();
      setVerificationPhoto(null);
      setPassportMatchConfirmed(false);
      setExitMatchConfirmed(false);
      setExitNotes('');
      setPracticalPhoto1(null);
      setPracticalPhoto2(null);
      setTaskNumber('');
      setTaskNumberError(null);
      setPracticalDifficulty('');
      setActiveCameraTarget('verification');
    }
  }, [viewCandidate, isEnrollmentPendingMode, isEnrollVerifyMode, isCbtPendingMode, isCbtConfirmedMode, isPracticalPendingMode, isPracticalConfirmedMode]);

  // Synchronize photo camera video stream whenever camera is activated
  useEffect(() => {
    if (isCameraActive && photoStreamRef.current && photoVideoRef.current) {
      photoVideoRef.current.srcObject = photoStreamRef.current;
      photoVideoRef.current.play().catch(e => console.warn('Camera play warning:', e));
    }
  }, [isCameraActive, activeCameraTarget]);

  // --------------------------------------------------------------------------
  // Camera Handlers for Photo Capture
  // --------------------------------------------------------------------------
  const startPhotoCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera device API not supported in this browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      photoStreamRef.current = stream;
      if (photoVideoRef.current) {
        photoVideoRef.current.srcObject = stream;
        photoVideoRef.current.play().catch(e => console.warn('Camera play warning:', e));
      }
    } catch (err: any) {
      console.warn('Could not start photo camera stream:', err.message);
      setCameraError(err.message || 'Camera access not permitted or unavailable.');
    }
  };

  const startPhotoCameraFor = async (target: 'verification' | 'practical1' | 'practical2') => {
    setActiveCameraTarget(target);
    await startPhotoCamera();
  };

  const stopPhotoCamera = () => {
    if (photoStreamRef.current) {
      photoStreamRef.current.getTracks().forEach(t => t.stop());
      photoStreamRef.current = null;
    }
    if (photoVideoRef.current) {
      photoVideoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhotoFromCamera = () => {
    const video = photoVideoRef.current;
    const canvas = photoCanvasRef.current || document.createElement('canvas');
    // Constrain resolution to max 480x360 for storage safety while retaining crisp display
    const maxWidth = 480;
    const maxHeight = 360;
    let width = (video && video.videoWidth > 0) ? video.videoWidth : 480;
    let height = (video && video.videoHeight > 0) ? video.videoHeight : 360;
    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }
    if (height > maxHeight) {
      width = Math.round((width * maxHeight) / height);
      height = maxHeight;
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (video && video.videoWidth > 0) {
        ctx.drawImage(video, 0, 0, width, height);
      } else {
        // Fallback / simulated snapshot when hardware camera stream is unavailable or blocked
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#7A2E3A';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2 - 30, 80, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          activeCameraTarget === 'practical1'
            ? 'PRACTICAL PHOTO 1 (LIVE CAMERA)'
            : activeCameraTarget === 'practical2'
            ? 'PRACTICAL PHOTO 2 (LIVE CAMERA)'
            : 'CANDIDATE VERIFICATION PHOTO',
          canvas.width / 2,
          canvas.height / 2 + 80
        );
        ctx.font = '14px monospace';
        ctx.fillText(new Date().toLocaleTimeString(), canvas.width / 2, canvas.height / 2 + 110);
      }
      const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
      if (activeCameraTarget === 'practical1') {
        setPracticalPhoto1(dataUrl);
        showToast('Practical Photo 1 captured successfully via camera!', 'success');
      } else if (activeCameraTarget === 'practical2') {
        setPracticalPhoto2(dataUrl);
        showToast('Practical Photo 2 captured successfully via camera!', 'success');
      } else {
        setVerificationPhoto(dataUrl);
        showToast('Candidate photo captured successfully!', 'success');
      }
      stopPhotoCamera();
    }
  };

  // Task Number Validation (1–100 integer)
  const validateTaskNumber = (val: string): { valid: boolean; error?: string; num?: number } => {
    const trimmed = val.trim();
    if (!trimmed) {
      return { valid: false, error: 'Task Number is required before confirmation.' };
    }
    if (!/^\d+$/.test(trimmed)) {
      return { valid: false, error: 'Task Number must be a numeric integer value (1–100).' };
    }
    const num = parseInt(trimmed, 10);
    if (num < 1 || num > 100) {
      return { valid: false, error: 'Task Number must be between 1 and 100.' };
    }
    return { valid: true, num };
  };

  // --------------------------------------------------------------------------
  // Barcode Scanner Handlers (Camera & Quick Scan Simulation)
  // --------------------------------------------------------------------------
  const startBarcodeCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        scannerStreamRef.current = stream;
        if (scannerVideoRef.current) {
          scannerVideoRef.current.srcObject = stream;
          scannerVideoRef.current.play().catch(e => console.warn('Scanner play warning:', e));
        }

        // Native BarcodeDetector if available in Chromium/modern browsers
        if ('BarcodeDetector' in window) {
          const detector = new (window as any).BarcodeDetector({
            formats: ['code_128', 'code_39', 'ean_13', 'qr_code', 'pdf417']
          });
          const interval = setInterval(async () => {
            if (!scannerVideoRef.current || !scannerStreamRef.current) {
              clearInterval(interval);
              return;
            }
            try {
              const barcodes = await detector.detect(scannerVideoRef.current);
              if (barcodes.length > 0 && barcodes[0].rawValue) {
                clearInterval(interval);
                handleApplyBarcodeScan(barcodes[0].rawValue);
              }
            } catch {
              // Frame detection tick
            }
          }, 400);
        }
      }
    } catch (err: any) {
      console.warn('Barcode camera access unavailable:', err.message);
    }
  };

  const stopBarcodeCamera = () => {
    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach(t => t.stop());
      scannerStreamRef.current = null;
    }
    if (scannerVideoRef.current) {
      scannerVideoRef.current.srcObject = null;
    }
  };

  const handleOpenBarcodeScanner = () => {
    setIsBarcodeScannerOpen(true);
    setSimulatedBarcodeInput('');
    setTimeout(() => {
      startBarcodeCamera();
    }, 150);
  };

  const handleCloseBarcodeScanner = () => {
    stopBarcodeCamera();
    setIsBarcodeScannerOpen(false);
  };

  const handleApplyBarcodeScan = (scannedPassport: string) => {
    const cleanPassport = scannedPassport.trim().toUpperCase();
    if (!cleanPassport) return;

    handleCloseBarcodeScanner();

    // Critical Requirement: Assessor Data Isolation
    // A Passport Barcode Scan must never bypass the Assessor-specific restriction
    if (isAssessor) {
      const allLoadedCandidates = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
      const globalMatch = allLoadedCandidates.find(c => c.passportNumber.toUpperCase() === cleanPassport);
      const isAssignedToThisAssessor = candidates.some(c => c.passportNumber.toUpperCase() === cleanPassport);

      if (globalMatch && !isAssignedToThisAssessor) {
        showToast('Access denied: Candidate is not allocated to your examination roster.', 'error');
        setSearchTerm('');
        return;
      }
    }

    setSearchTerm(cleanPassport);
    setCurrentPage(1);

    const match = candidates.find(c => c.passportNumber.toUpperCase() === cleanPassport);
    if (match) {
      showToast(`Passport barcode scanned: ${cleanPassport} (Candidate Found)`, 'success');
    } else {
      showToast(`Scanned: ${cleanPassport}. No matching candidate in this roster.`, 'info');
    }
  };

  // --------------------------------------------------------------------------
  // Verification Confirmation Logic (Support Staff)
  // --------------------------------------------------------------------------
  const handleConfirmVerification = () => {
    if (!viewCandidate) return;

    // 1. Check if already confirmed (Prevent duplicate confirmation)
    if (viewCandidate.supportStaffVerificationStatus === 'CONFIRMED') {
      showToast('Candidate verification has already been confirmed and locked.', 'info');
      return;
    }

    // 2. Validate Passport Match
    if (!passportMatchConfirmed) {
      showToast('Please confirm physical passport match before proceeding.', 'error');
      return;
    }

    // 3. Validate Photo is Mandatory
    if (!verificationPhoto) {
      showToast('Candidate photo is required before confirmation.', 'error');
      return;
    }

    // Format Confirmation Date & Time
    const { confirmationDate, confirmationTime } = formatConfirmationDateTime();
    const confirmedBy = user?.name || user?.username || 'Support Staff';

    const verificationRecord: PassportVerificationRecord = {
      id: `ver-${viewCandidate.id}-${Date.now()}`,
      passportNumber: viewCandidate.passportNumber,
      candidateId: viewCandidate.id,
      candidateName: viewCandidate.fullNameEn,
      verificationPhoto: verificationPhoto,
      status: 'CONFIRMED',
      confirmedDate: confirmationDate,
      confirmedTime: confirmationTime,
      confirmedAt: new Date().toISOString(),
      confirmedBy: confirmedBy,
      passportMatchConfirmed: true,
    };

    const updatedCandidate: Candidate = {
      ...viewCandidate,
      // Candidate profile picture remains strictly untouched & unchanged
      photoUrl: viewCandidate.photoUrl,
      // Verification photo stored specifically under passport verification record
      passportVerificationPhoto: verificationPhoto,
      passportVerificationRecord: verificationRecord,
      supportStaffVerificationStatus: 'CONFIRMED',
      supportStaffVerifiedAt: new Date().toISOString(),
      supportStaffConfirmationDate: confirmationDate,
      supportStaffConfirmationTime: confirmationTime,
      supportStaffVerifiedBy: confirmedBy,
      passportMatchConfirmed: true,
      status: viewCandidate.status === 'REGISTERED' ? 'VERIFIED' : viewCandidate.status,
    };

    // 1. Update Candidate in Storage
    StorageService.updateItem(STORAGE_KEYS.CANDIDATES, updatedCandidate);

    // 2. Archive to dedicated Passport Verifications collection for separate report generation
    const existingVerifications = StorageService.get<PassportVerificationRecord[]>(STORAGE_KEYS.PASSPORT_VERIFICATIONS, []);
    const updatedVerifications = [
      ...existingVerifications.filter(v => v.candidateId !== viewCandidate.id && v.passportNumber !== viewCandidate.passportNumber),
      verificationRecord,
    ];
    StorageService.set(STORAGE_KEYS.PASSPORT_VERIFICATIONS, updatedVerifications);

    // 3. Persist separate Entry Verification photo record in candidate photos ledger
    const entryPhotoRecord: CandidatePhoto = {
      id: `photo-entry-${viewCandidate.id}-${Date.now()}`,
      candidateId: viewCandidate.id,
      candidateName: viewCandidate.fullNameEn,
      passportNumber: viewCandidate.passportNumber,
      photoUrl: verificationPhoto,
      photoType: 'ENTRY_VERIFICATION_PHOTO',
      purpose: '1st Entry Verification Photo',
      captureDate: confirmationDate,
      captureTime: confirmationTime,
      capturedAt: new Date().toISOString(),
      capturedBy: confirmedBy,
      verified: true,
      stage: '1ST_ENTRY_VERIFICATION',
    };
    const existingCandidatePhotos = StorageService.get<CandidatePhoto[]>(STORAGE_KEYS.CANDIDATE_PHOTOS, []);
    StorageService.set(STORAGE_KEYS.CANDIDATE_PHOTOS, [entryPhotoRecord, ...existingCandidatePhotos]);

    // 3. Log Audit
    AuditService.log(
      'CANDIDATE_VERIFICATION',
      'CANDIDATE',
      `Support Staff confirmed passport match for ${viewCandidate.fullNameEn} (Passport: ${viewCandidate.passportNumber}) on ${confirmationDate} at ${confirmationTime}. Passport verification photo archived separately.`,
      viewCandidate.id
    );

    showToast(`Verification confirmed! Recorded on ${confirmationDate} at ${confirmationTime}.`, 'success');
    setViewCandidate(updatedCandidate);
    loadData();
  };

  // --------------------------------------------------------------------------
  // Exit Confirmation Logic (Support Staff - Candidate Exit List)
  // --------------------------------------------------------------------------
  const handleConfirmExit = () => {
    if (!viewCandidate) return;

    // 1. Check if already confirmed (Prevent duplicate confirmation)
    if (viewCandidate.exitStatus === 'CONFIRMED') {
      showToast('Candidate exit has already been confirmed and permanently locked.', 'info');
      return;
    }

    // 2. Validate Entry Confirmation Eligibility
    const isEntryConfirmed = viewCandidate.supportStaffVerificationStatus === 'CONFIRMED' || viewCandidate.passportMatchConfirmed === true;
    if (!isEntryConfirmed) {
      showToast('Candidate must have entry verification confirmed before exit.', 'error');
      return;
    }

    // 3. Validate Exit Checkbox
    if (!exitMatchConfirmed) {
      showToast('Please confirm candidate exit authorization before proceeding.', 'error');
      return;
    }

    // Format Exit Date & Time
    const { confirmationDate, confirmationTime } = formatConfirmationDateTime();
    const confirmedBy = user?.name || user?.username || 'Support Staff';

    const exitRecord: CandidateExitRecord = {
      id: `exit-${viewCandidate.id}-${Date.now()}`,
      passportNumber: viewCandidate.passportNumber,
      candidateId: viewCandidate.id,
      candidateName: viewCandidate.fullNameEn,
      status: 'CONFIRMED',
      exitDate: confirmationDate,
      exitTime: confirmationTime,
      exitAt: new Date().toISOString(),
      exitBy: confirmedBy,
      notes: exitNotes.trim() || undefined,
    };

    const updatedCandidate: Candidate = {
      ...viewCandidate,
      exitStatus: 'CONFIRMED',
      exitVerifiedAt: new Date().toISOString(),
      exitConfirmationDate: confirmationDate,
      exitConfirmationTime: confirmationTime,
      exitVerifiedBy: confirmedBy,
      exitNotes: exitNotes.trim() || undefined,
      exitRecord: exitRecord,
    };

    // 1. Update Candidate in Storage
    StorageService.updateItem(STORAGE_KEYS.CANDIDATES, updatedCandidate);

    // 2. Archive to dedicated Candidate Exits collection
    const existingExits = StorageService.get<CandidateExitRecord[]>(STORAGE_KEYS.CANDIDATE_EXITS, []);
    const updatedExits = [
      ...existingExits.filter(e => e.candidateId !== viewCandidate.id && e.passportNumber !== viewCandidate.passportNumber),
      exitRecord,
    ];
    StorageService.set(STORAGE_KEYS.CANDIDATE_EXITS, updatedExits);

    // 3. Log Audit
    AuditService.log(
      'CANDIDATE_EXIT',
      'CANDIDATE',
      `Support Staff confirmed exit authorization for ${viewCandidate.fullNameEn} (Passport: ${viewCandidate.passportNumber}) on ${confirmationDate} at ${confirmationTime}`,
      viewCandidate.id
    );

    showToast(`Exit confirmed! Candidate departure recorded on ${confirmationDate} at ${confirmationTime}.`, 'success');
    setViewCandidate(updatedCandidate);
    loadData();
  };

  // --------------------------------------------------------------------------
  // Enrollment Confirmation Logic (Organizer / Support Staff - Enrollment Pending)
  // --------------------------------------------------------------------------
  const handleConfirmEnrollment = () => {
    if (!viewCandidate) return;

    // 1. Check if already enrolled (Prevent duplicate enrollment)
    if (
      viewCandidate.enrollmentStatus === 'ENROLLMENT_VERIFY' ||
      viewCandidate.status === 'ENROLLMENT_VERIFY' ||
      viewCandidate.enrollmentStatus === 'ENROLLED' ||
      viewCandidate.status === 'ENROLLED'
    ) {
      showToast('Candidate has already been enrolled and verified.', 'info');
      return;
    }

    // 2. Validate eligibility: Entry verification must be confirmed
    const isEntryConfirmed = viewCandidate.supportStaffVerificationStatus === 'CONFIRMED' || viewCandidate.passportMatchConfirmed === true;
    if (!isEntryConfirmed) {
      showToast('Candidate entry verification must be confirmed before enrollment.', 'error');
      return;
    }

    // 3. Mandatory Candidate Photo Validation
    // The Enrollment Photo must be captured specifically by the Organizer.
    // It must NOT be pre-populated or fall back to the Entry Verification Photo or Profile Photo.
    const finalPhoto = verificationPhoto;
    if (!finalPhoto) {
      showToast('Candidate enrollment photo is mandatory before confirming enrollment.', 'error');
      return;
    }

    // Format Confirmation Date & Time
    const { confirmationDate, confirmationTime } = formatConfirmationDateTime();
    const enrolledBy = user?.name || user?.username || 'Organizer Name';
    const nowIso = new Date().toISOString();

    // 4. Create a separate, permanent photo record (Preserving previous verification photo & profile picture)
    const newPhotoRecord: CandidatePhoto = {
      id: `photo-enroll-${viewCandidate.id}-${Date.now()}`,
      candidateId: viewCandidate.id,
      candidateName: viewCandidate.fullNameEn,
      passportNumber: viewCandidate.passportNumber,
      photoUrl: finalPhoto,
      photoType: 'ENROLLMENT_PHOTO',
      purpose: 'Enrollment Verification Photo',
      captureDate: confirmationDate,
      captureTime: confirmationTime,
      capturedAt: nowIso,
      capturedBy: enrolledBy,
      verified: true,
      stage: 'ENROLLMENT_VERIFICATION',
    };

    // 5. Persist photo in dedicated candidate photos ledger collection
    const existingAllPhotos = StorageService.get<CandidatePhoto[]>(STORAGE_KEYS.CANDIDATE_PHOTOS, []);
    StorageService.set(STORAGE_KEYS.CANDIDATE_PHOTOS, [newPhotoRecord, ...existingAllPhotos.slice(0, 30)]);

    // 6. Update Candidate in-place (Zero duplicate candidate rows created)
    const existingEnrollmentPhotos = viewCandidate.enrollmentPhotos || [];
    const updatedCandidate: Candidate = {
      ...viewCandidate,
      enrollmentStatus: 'ENROLLMENT_VERIFY',
      status: 'ENROLLMENT_VERIFY',
      // Profile picture remains strictly untouched
      photoUrl: viewCandidate.photoUrl,
      // Previous 1st entry verification photo remains strictly untouched
      passportVerificationPhoto: viewCandidate.passportVerificationPhoto,
      passportVerificationRecord: viewCandidate.passportVerificationRecord,
      // Separate enrollment photo and history attached
      enrollmentPhoto: finalPhoto,
      enrollmentPhotos: [...existingEnrollmentPhotos, newPhotoRecord],
      enrolledAt: nowIso,
      enrolledBy: enrolledBy,
    };

    const saveSuccess = StorageService.updateItem(STORAGE_KEYS.CANDIDATES, updatedCandidate);

    if (!saveSuccess) {
      showToast('Failed to persist candidate enrollment in storage. Please try again.', 'error');
      return;
    }

    // Immediately update candidate state
    setCandidates(prev => prev.map(c => c.id === updatedCandidate.id ? updatedCandidate : c));

    // 7. Log Audit Trail
    AuditService.log(
      'ENROLL_CANDIDATE',
      'CANDIDATE',
      `Candidate enrollment confirmed for ${viewCandidate.fullNameEn} (Passport: ${viewCandidate.passportNumber}) by ${enrolledBy} on ${confirmationDate} at ${confirmationTime}. Status updated to Enrollment Verify. New photo record archived (ID: ${newPhotoRecord.id}).`,
      viewCandidate.id,
      'SUCCESS'
    );

    // 8. Show success message ONLY after successful save
    showToast(`Candidate ${viewCandidate.fullNameEn} successfully enrolled! Status: Enrollment Verify.`, 'success');
    setViewCandidate(null);
    setVerificationPhoto(null);
    loadData();

    // 9. Automatically navigate to Enroll Verify
    if (onNavigate) {
      onNavigate('/enroll-verify');
    }
  };

  // --------------------------------------------------------------------------
  // CBT Exam Confirmation Logic (CBT Test Support - CBT Exam Pending)
  // --------------------------------------------------------------------------
  const handleConfirmCbtExam = () => {
    if (!viewCandidate) return;

    // 1. Check if already confirmed (Prevent duplicate confirmation)
    if (viewCandidate.cbtStatus === 'CONFIRMED' || viewCandidate.status === 'CBT_EXAM_CONFIRMED') {
      showToast('CBT examination has already been confirmed and authorized.', 'info');
      return;
    }

    // 2. Validate Enrolled eligibility
    const isEnrolled = 
      viewCandidate.enrollmentStatus === 'ENROLLED' || 
      viewCandidate.enrollmentStatus === 'ENROLLMENT_VERIFY' || 
      viewCandidate.status === 'ENROLLED' || 
      viewCandidate.status === 'ENROLLMENT_VERIFY' || 
      !!viewCandidate.enrolledAt;
    if (!isEnrolled) {
      showToast('Candidate must have completed enrollment before starting CBT exam.', 'error');
      return;
    }

    // 3. Center validation
    if (isCenterScoped && viewCandidate.centerId !== userCenterId) {
      showToast('Access denied: Candidate belongs to another examination center.', 'error');
      return;
    }

    // 4. Mandatory Live Camera Candidate Photo Validation
    if (!verificationPhoto) {
      showToast('CBT examination photo captured via live camera is mandatory.', 'error');
      return;
    }

    // Format Confirmation Date & Time
    const { confirmationDate, confirmationTime } = formatConfirmationDateTime();
    const confirmedBy = user?.name || user?.username || 'CBT Test Support';
    const nowIso = new Date().toISOString();

    // 5. Create a separate, permanent CBT photo record (Preserving profile photo, entry verification photo, & enrollment photo)
    const newPhotoRecord: CandidatePhoto = {
      id: `photo-cbt-${viewCandidate.id}-${Date.now()}`,
      candidateId: viewCandidate.id,
      candidateName: viewCandidate.fullNameEn,
      passportNumber: viewCandidate.passportNumber,
      photoUrl: verificationPhoto,
      photoType: 'CBT_EXAMINATION_PHOTO',
      purpose: 'CBT Examination Pre-Test Photo',
      captureDate: confirmationDate,
      captureTime: confirmationTime,
      capturedAt: nowIso,
      capturedBy: confirmedBy,
      verified: true,
      stage: 'CBT_EXAMINATION',
    };

    // 6. Persist photo in dedicated candidate photos ledger collection
    const existingAllPhotos = StorageService.get<CandidatePhoto[]>(STORAGE_KEYS.CANDIDATE_PHOTOS, []);
    StorageService.set(STORAGE_KEYS.CANDIDATE_PHOTOS, [newPhotoRecord, ...existingAllPhotos]);

    // 7. Update Candidate in-place (Zero duplicate candidate rows created)
    const updatedCandidate: Candidate = {
      ...viewCandidate,
      cbtStatus: 'CONFIRMED',
      status: 'CBT_EXAM_CONFIRMED',
      // Profile picture remains strictly untouched
      photoUrl: viewCandidate.photoUrl,
      // Previous photos remain strictly untouched
      passportVerificationPhoto: viewCandidate.passportVerificationPhoto,
      passportVerificationRecord: viewCandidate.passportVerificationRecord,
      enrollmentPhoto: viewCandidate.enrollmentPhoto,
      enrollmentPhotos: viewCandidate.enrollmentPhotos,
      // CBT specific photo & verification fields
      cbtPhoto: verificationPhoto,
      cbtPhotoRecord: newPhotoRecord,
      cbtConfirmationDate: confirmationDate,
      cbtConfirmationTime: confirmationTime,
      cbtConfirmedAt: nowIso,
      cbtConfirmedBy: confirmedBy,
    };

    StorageService.updateItem(STORAGE_KEYS.CANDIDATES, updatedCandidate);

    // 8. Log Audit Trail
    AuditService.log(
      'CBT_EXAM_CONFIRMATION',
      'CANDIDATE',
      `CBT Exam authorization confirmed for ${viewCandidate.fullNameEn} (Passport: ${viewCandidate.passportNumber}) by ${confirmedBy} on ${confirmationDate} at ${confirmationTime}. Status updated to CBT Exam Confirmed. CBT photo archived (ID: ${newPhotoRecord.id}).`,
      viewCandidate.id,
      'SUCCESS'
    );

    showToast(`CBT exam confirmed for ${viewCandidate.fullNameEn}! Status: CBT Exam Confirmed.`, 'success');
    setViewCandidate(null);
    setVerificationPhoto(null);
    loadData();
  };

  // --------------------------------------------------------------------------
  // Practical Assessment Confirmation Handler (Two Photos, Task Number 1-100, Difficulty)
  // --------------------------------------------------------------------------
  const handleConfirmPractical = () => {
    if (!viewCandidate || !user) return;

    // 1. Mandatory Practical Photo 1 Validation
    if (!practicalPhoto1) {
      showToast('Practical Photo 1 (Camera capture) is mandatory before confirmation.', 'error');
      return;
    }

    // 2. Mandatory Task Number Validation (1–100 integer)
    const taskValidation = validateTaskNumber(taskNumber);
    if (!taskValidation.valid || taskValidation.num === undefined) {
      setTaskNumberError(taskValidation.error || 'Task Number must be between 1 and 100.');
      showToast(taskValidation.error || 'Task Number must be a valid integer between 1 and 100.', 'error');
      return;
    }

    // 3. Assessor & Center Validation
    if (isAssessor && viewCandidate.assessorId !== user?.id && viewCandidate.assessorName !== user?.name) {
      showToast('Access denied: Candidate is not allocated to your examination roster.', 'error');
      return;
    }
    if (isCenterScoped && viewCandidate.centerId !== userCenterId) {
      showToast('Access denied: Candidate belongs to another examination center.', 'error');
      return;
    }

    const { confirmationDate, confirmationTime } = formatConfirmationDateTime();
    const confirmedBy = user?.name || user?.username || 'Assessor';
    const nowIso = new Date().toISOString();

    // 4. Save Photo 1 into Candidate Photos Ledger
    const photoRecord1: CandidatePhoto = {
      id: `photo-prac1-${viewCandidate.id}-${Date.now()}`,
      candidateId: viewCandidate.id,
      candidateName: viewCandidate.fullNameEn,
      passportNumber: viewCandidate.passportNumber,
      photoUrl: practicalPhoto1,
      photoType: 'PRACTICAL_PHOTO_1',
      purpose: 'Practical Assessment Photo 1 (Mandatory Camera)',
      captureDate: confirmationDate,
      captureTime: confirmationTime,
      capturedAt: nowIso,
      capturedBy: confirmedBy,
      verified: true,
      stage: 'PRACTICAL_ASSESSMENT',
    };

    const newPhotosToSave = [photoRecord1];

    // 5. Save Photo 2 if captured (Optional)
    if (practicalPhoto2) {
      const photoRecord2: CandidatePhoto = {
        id: `photo-prac2-${viewCandidate.id}-${Date.now()}`,
        candidateId: viewCandidate.id,
        candidateName: viewCandidate.fullNameEn,
        passportNumber: viewCandidate.passportNumber,
        photoUrl: practicalPhoto2,
        photoType: 'PRACTICAL_PHOTO_2',
        purpose: 'Practical Assessment Photo 2 (Optional Camera)',
        captureDate: confirmationDate,
        captureTime: confirmationTime,
        capturedAt: nowIso,
        capturedBy: confirmedBy,
        verified: true,
        stage: 'PRACTICAL_ASSESSMENT',
      };
      newPhotosToSave.push(photoRecord2);
    }

    const existingAllPhotos = StorageService.get<CandidatePhoto[]>(STORAGE_KEYS.CANDIDATE_PHOTOS, []);
    StorageService.set(STORAGE_KEYS.CANDIDATE_PHOTOS, [...newPhotosToSave, ...existingAllPhotos]);

    // 6. Update Candidate
    const updatedCandidate: Candidate = {
      ...viewCandidate,
      practicalStatus: 'COMPLETED',
      status: 'PRACTICAL_COMPLETED',
      taskNumber: taskValidation.num,
      assignedTaskId: `TSK-${taskValidation.num}`,
      assignedTaskCode: `TSK-${String(taskValidation.num).padStart(3, '0')}`,
      taskDifficulty: (practicalDifficulty || viewCandidate.taskDifficulty) as any,
      practicalPhoto1: practicalPhoto1,
      practicalPhoto2: practicalPhoto2 || undefined,
      practicalConfirmationDate: confirmationDate,
      practicalConfirmationTime: confirmationTime,
      practicalConfirmedAt: nowIso,
      practicalConfirmedBy: confirmedBy,
    };

    StorageService.updateItem(STORAGE_KEYS.CANDIDATES, updatedCandidate);

    // 7. Audit Log
    AuditService.log(
      'COMPLETE_PRACTICAL',
      'CANDIDATE',
      `Practical Assessment confirmed for ${viewCandidate.fullNameEn} (Passport: ${viewCandidate.passportNumber}) by ${confirmedBy} on ${confirmationDate} at ${confirmationTime}. Task Number: ${taskValidation.num}, Difficulty: ${practicalDifficulty || 'Not specified'}.`,
      viewCandidate.id,
      'SUCCESS'
    );

    showToast(`Practical assessment confirmed for ${viewCandidate.fullNameEn}! Task #${taskValidation.num} recorded.`, 'success');
    setViewCandidate(null);
    setPracticalPhoto1(null);
    setPracticalPhoto2(null);
    setTaskNumber('');
    setTaskNumberError(null);
    setPracticalDifficulty('');
    loadData();
    onNavigate?.(isAssessor ? '/assessor/practical-confirmed' : '/practical-confirmed');
  };

  // --------------------------------------------------------------------------
  // Registration Handlers (Existing Admin feature)
  // --------------------------------------------------------------------------
  const handleOpenAdd = () => {
    setFormData({
      fullNameEn: '',
      fullNameAr: '',
      passportNumber: `P${Math.floor(1000000 + Math.random() * 9000000)}`,
      aproReference: SerialService.generateNextApro('SA'),
      nationalId: `199${Math.floor(1000000 + Math.random() * 9000000)}`,
      occupation: 'Electrical Installation',
      centerId: centers[0]?.id || '',
      batchId: batches[0]?.id || '',
      status: 'REGISTERED',
    });
    setIsAddOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullNameEn.trim() || !formData.passportNumber.trim()) {
      showToast('Please fill required candidate information', 'error');
      return;
    }

    const assignedCenterId = isCenterAdmin ? userCenterId : (formData.centerId || centers[0]?.id || 'ctr-sa-1');
    const assignedCenter = allCenters.find(c => c.id === assignedCenterId);

    const newCandidate: Candidate = {
      id: `can-${Date.now()}`,
      fullNameEn: formData.fullNameEn.trim(),
      fullNameAr: formData.fullNameAr.trim() || formData.fullNameEn.trim(),
      passportNumber: formData.passportNumber.trim().toUpperCase(),
      aproReference: formData.aproReference.trim().toUpperCase(),
      nationalId: formData.nationalId.trim(),
      occupation: formData.occupation,
      countryId: assignedCenter?.countryId || userCountryId || 'cnt-sa',
      centerId: assignedCenterId,
      batchId: formData.batchId,
      enrollmentStatus: 'NOT_ENROLLED',
      cbtStatus: 'NOT_STARTED',
      practicalStatus: 'NOT_STARTED',
      evidenceStatus: 'NOT_UPLOADED',
      status: formData.status as any,
      registeredAt: new Date().toISOString(),
      idCardStatus: 'NOT_REQUESTED',
    };

    const integrityCheck = SecurityService.validateCandidateIntegrity(newCandidate);
    if (!integrityCheck.valid) {
      showToast(integrityCheck.error || 'Candidate integrity validation error', 'error');
      return;
    }

    StorageService.updateItem(STORAGE_KEYS.CANDIDATES, newCandidate);
    AuditService.log('CREATE_CANDIDATE', 'CANDIDATE', `Enrolled candidate ${newCandidate.fullNameEn} (${newCandidate.aproReference}) with integrity verification`, newCandidate.id);
    showToast(t.toasts.createdSuccess, 'success');
    setIsAddOpen(false);
    loadData();
  };

  // Search and Filter logic
  const filtered = candidates.filter(c => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      c.fullNameEn.toLowerCase().includes(query) ||
      c.fullNameAr.includes(query) ||
      c.passportNumber.toLowerCase().includes(query) ||
      c.aproReference.toLowerCase().includes(query) ||
      c.occupation.toLowerCase().includes(query) ||
      (c.nationalId && c.nationalId.toLowerCase().includes(query));

    const matchesStatus = statusFilter === 'ALL'
      ? true
      : isExitMode
        ? (statusFilter === 'CONFIRMED' ? c.exitStatus === 'CONFIRMED' : c.exitStatus !== 'CONFIRMED')
        : isCbtPendingMode
          ? (statusFilter === 'CONFIRMED' ? (c.cbtStatus === 'CONFIRMED' || c.status === 'CBT_EXAM_CONFIRMED') : statusFilter === 'PENDING' ? (c.cbtStatus !== 'CONFIRMED' && c.status !== 'CBT_EXAM_CONFIRMED') : true)
          : isEnrollmentPendingMode
            ? (statusFilter === 'CONFIRMED' ? (c.supportStaffVerificationStatus === 'CONFIRMED' || c.passportMatchConfirmed === true) : statusFilter === 'PENDING' ? c.supportStaffVerificationStatus !== 'CONFIRMED' : true)
            : isEnrollVerifyMode
              ? (statusFilter === 'ENROLLMENT_VERIFY' ? (c.enrollmentStatus === 'ENROLLMENT_VERIFY' || c.status === 'ENROLLMENT_VERIFY' || c.enrollmentStatus === 'ENROLLED' || c.status === 'ENROLLED') : true)
              : (c.status === statusFilter || c.supportStaffVerificationStatus === statusFilter);

    return matchesSearch && matchesStatus;
  });

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Relational Lookup Helpers for Real Assigned Data
  const getAssignedBatchDisplay = (candidate: Candidate) => {
    const batch = allBatches.find(b => b.id === candidate.batchId);
    if (!batch) return candidate.batchId || '—';
    return batch.batchNumber;
  };

  const getAssignedCenterDisplay = (candidate: Candidate) => {
    // Look up real center from batch relationship, or directly candidate.centerId
    const batch = allBatches.find(b => b.id === candidate.batchId);
    const centerIdToFind = batch?.centerId || candidate.centerId;
    const center = allCenters.find(c => c.id === centerIdToFind);
    if (!center) return candidate.centerId || '—';
    return language === 'ar' ? center.nameAr : center.nameEn;
  };

  // --------------------------------------------------------------------------
  // Process Status Indicators (1st Check-In, Enrollment, Practical Assessment)
  // --------------------------------------------------------------------------
  const isCandidateCheckInCompleted = (c: Candidate): boolean => {
    return (
      c.supportStaffVerificationStatus === 'CONFIRMED' ||
      c.passportMatchConfirmed === true ||
      Boolean(c.supportStaffConfirmationDate) ||
      Boolean(c.supportStaffVerifiedAt)
    );
  };

  const isCandidateEnrollmentCompleted = (c: Candidate): boolean => {
    if (c.enrollmentStatus === 'ENROLLED' || c.enrollmentStatus === 'ENROLLMENT_VERIFY') return true;
    if (c.status === 'ENROLLED' || c.status === 'ENROLLMENT_VERIFY') return true;
    if (c.enrolledAt) return true;

    // Downstream lifecycle stages indicate enrollment was completed
    const downstreamStatuses: CandidateAssessmentStatus[] = [
      'CBT_EXAM_CONFIRMED',
      'IN_ASSESSMENT',
      'IN_PROGRESS',
      'PRACTICAL_COMPLETED',
      'EVALUATION_PENDING',
      'EVALUATED',
      'ASSESSMENT_COMPLETED',
      'RESULT_PENDING',
      'SUBMITTED',
      'LOCKED',
      'COMPLETED',
    ];
    if (downstreamStatuses.includes(c.status)) return true;
    if (c.cbtStatus === 'CONFIRMED' || c.cbtStatus === 'COMPLETED') return true;
    if (c.practicalStatus === 'COMPLETED' || c.practicalStatus === 'IN_PROGRESS') return true;

    return false;
  };

  const isCandidateCbtCompleted = (c: Candidate): boolean => {
    return (
      c.cbtStatus === 'CONFIRMED' ||
      c.cbtStatus === 'COMPLETED' ||
      c.status === 'CBT_EXAM_CONFIRMED' ||
      Boolean(c.cbtConfirmationDate) ||
      Boolean(c.cbtConfirmedAt)
    );
  };

  const isCandidatePracticalCompleted = (c: Candidate): boolean => {
    return (
      c.practicalStatus === 'COMPLETED' ||
      c.status === 'PRACTICAL_COMPLETED' ||
      Boolean(c.practicalConfirmationDate) ||
      Boolean(c.practicalConfirmedAt) ||
      c.evaluationStatus === 'COMPLETED' ||
      c.status === 'EVALUATED' ||
      c.status === 'ASSESSMENT_COMPLETED' ||
      c.status === 'COMPLETED'
    );
  };

  // --------------------------------------------------------------------------
  // Dynamic Columns: CBT Confirmed vs Practical Pending vs CBT Pending vs Exit vs Enroll Verify vs Enrollment Pending vs Entry
  // --------------------------------------------------------------------------
  const columns: Column<Candidate>[] = isCbtConfirmedMode ? [
    {
      key: 'name',
      header: language === 'ar' ? 'المرشح' : 'Candidate',
      render: c => (
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#7A2E3A]/10 text-[#7A2E3A] border border-[#7A2E3A]/20 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
            {c.cbtPhoto || c.photoUrl ? (
              <img src={c.cbtPhoto || c.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              c.fullNameEn.charAt(0)
            )}
          </div>
          <div>
            <span className="font-semibold text-[#2C2623] block">
              {language === 'ar' ? c.fullNameAr : c.fullNameEn}
            </span>
            <span className="text-[11px] text-[#7C756D] font-mono">
              ID: {c.nationalId || c.passportNumber} • {c.occupation}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'passport',
      header: language === 'ar' ? 'رقم الجواز' : 'Passport Number',
      render: c => (
        <div>
          <span className="font-mono text-xs font-bold text-[#7A2E3A] block">
            {c.passportNumber}
          </span>
        </div>
      ),
    },
    {
      key: 'batch',
      header: language === 'ar' ? 'الدفعة والمركز' : 'Batch & Center',
      render: c => (
        <div>
          <span className="font-mono text-xs text-[#2C2623] font-semibold block">
            {getAssignedBatchDisplay(c)}
          </span>
          <span className="text-[10px] text-emerald-800 font-medium">
            {getAssignedCenterDisplay(c)}
          </span>
        </div>
      ),
    },
    {
      key: 'cbtStatus',
      header: language === 'ar' ? 'حالة الاعتماد' : 'CBT Confirmation',
      render: c => (
        <div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            CBT Exam Confirmed
          </span>
          <span className="text-[10px] text-[#7C756D] block mt-0.5 font-mono">
            {c.cbtConfirmationDate ? `${c.cbtConfirmationDate} • ` : ''}{c.cbtConfirmationTime || 'Confirmed'}
          </span>
        </div>
      ),
    },
    {
      key: 'confirmedBy',
      header: language === 'ar' ? 'المعتمد' : 'Authorized By',
      render: c => (
        <span className="text-xs font-semibold text-stone-700">
          {c.cbtConfirmedBy || 'CBT Test Support'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t.common.actions,
      className: 'text-end',
      headerClassName: 'text-end',
      render: c => (
        <button
          type="button"
          onClick={() => {
            setViewCandidate(c);
            setVerificationPhoto(c.cbtPhoto || null);
            AuditService.log('VIEW', 'CANDIDATE', `Candidate CBT exam confirmed dossier viewed: ${c.fullNameEn} (${c.passportNumber})`, c.id);
          }}
          className="p-1.5 rounded text-[#7A2E3A] hover:bg-[#F8ECEE] font-semibold transition-colors inline-flex items-center gap-1 text-xs"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'عرض السجل (للقراءة فقط)' : 'View Record (Read Only)'}</span>
        </button>
      ),
    },
  ] : isPracticalConfirmedMode ? [
    {
      key: 'name',
      header: language === 'ar' ? 'المرشح' : 'Candidate',
      render: c => (
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#7A2E3A]/10 text-[#7A2E3A] border border-[#7A2E3A]/20 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
            {c.practicalPhoto1 || c.cbtPhoto || c.photoUrl ? (
              <img src={c.practicalPhoto1 || c.cbtPhoto || c.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              c.fullNameEn.charAt(0)
            )}
          </div>
          <div>
            <span className="font-semibold text-[#2C2623] block">
              {language === 'ar' ? c.fullNameAr : c.fullNameEn}
            </span>
            <span className="text-[11px] text-[#7C756D] font-mono">
              ID: {c.nationalId || c.passportNumber} • {c.occupation}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'passport',
      header: language === 'ar' ? 'رقم الجواز' : 'Passport Number',
      render: c => (
        <div>
          <span className="font-mono text-xs font-bold text-[#7A2E3A] block">
            {c.passportNumber}
          </span>
        </div>
      ),
    },
    {
      key: 'batch',
      header: language === 'ar' ? 'الدفعة والمركز' : 'Batch & Center',
      render: c => (
        <div>
          <span className="font-mono text-xs text-[#2C2623] font-semibold block">
            {getAssignedBatchDisplay(c)}
          </span>
          <span className="text-[10px] text-emerald-800 font-medium">
            {getAssignedCenterDisplay(c)}
          </span>
        </div>
      ),
    },
    {
      key: 'task',
      header: language === 'ar' ? 'المهمة والصعوبة' : 'Task & Difficulty',
      render: c => (
        <div>
          <span className="inline-flex items-center gap-1 text-xs font-bold font-mono text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
            Task #{c.taskNumber || (c.assignedTaskId ? c.assignedTaskId.replace(/\D/g, '') : '—')}
          </span>
          {c.taskDifficulty && (
            <span className="text-[10px] text-stone-600 block mt-0.5 font-medium">
              {c.taskDifficulty}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'photos',
      header: language === 'ar' ? 'صور الكاميرا' : 'Practical Photos',
      render: c => (
        <div className="flex items-center gap-1.5">
          {c.practicalPhoto1 ? (
            <div className="relative group">
              <img 
                src={c.practicalPhoto1} 
                alt="Photo 1" 
                className="w-8 h-8 rounded border border-purple-200 object-cover shadow-2xs" 
              />
              <span className="absolute -bottom-1 -right-1 text-[8px] font-bold bg-purple-700 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">1</span>
            </div>
          ) : (
            <span className="text-[10px] text-stone-400">—</span>
          )}
          {c.practicalPhoto2 && (
            <div className="relative group">
              <img 
                src={c.practicalPhoto2} 
                alt="Photo 2" 
                className="w-8 h-8 rounded border border-purple-200 object-cover shadow-2xs" 
              />
              <span className="absolute -bottom-1 -right-1 text-[8px] font-bold bg-indigo-700 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">2</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'confirmed',
      header: language === 'ar' ? 'التأكيد والمقيم' : 'Confirmed & Assessor',
      render: c => (
        <div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
            <CheckCircle2 className="w-3 h-3 text-purple-600" />
            Practical Confirmed
          </span>
          <span className="text-[10px] text-[#7C756D] block mt-0.5 font-mono">
            {c.practicalConfirmationDate ? `${c.practicalConfirmationDate} • ` : ''}{c.practicalConfirmationTime || ''}
          </span>
          <span className="text-[10px] text-stone-500 block truncate max-w-[140px]" title={c.practicalConfirmedBy || c.assessorName}>
            Assessor: {c.practicalConfirmedBy || c.assessorName || 'Assessor'}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: t.common.actions,
      className: 'text-end',
      headerClassName: 'text-end',
      render: c => (
        <button
          type="button"
          onClick={() => {
            if (isAssessor && c.assessorId !== user?.id && c.assessorName !== user?.name) {
              showToast('Access denied: Candidate is not allocated to your examination roster.', 'error');
              return;
            }
            setViewCandidate(c);
            setPracticalPhoto1(c.practicalPhoto1 || null);
            setPracticalPhoto2(c.practicalPhoto2 || null);
            setTaskNumber(c.taskNumber ? String(c.taskNumber) : '');
            setPracticalDifficulty(c.taskDifficulty || '');
            AuditService.log('VIEW', 'CANDIDATE', `Candidate practical confirmed dossier viewed: ${c.fullNameEn} (${c.passportNumber})`, c.id);
          }}
          className="p-1.5 rounded text-[#7A2E3A] hover:bg-[#F8ECEE] font-semibold transition-colors inline-flex items-center gap-1 text-xs"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'عرض التفاصيل (مقفول)' : 'View Details (Locked)'}</span>
        </button>
      ),
    },
  ] : isPracticalPendingMode ? [
    {
      key: 'name',
      header: language === 'ar' ? 'المرشح' : 'Candidate',
      render: c => (
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#7A2E3A]/10 text-[#7A2E3A] border border-[#7A2E3A]/20 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
            {c.cbtPhoto || c.photoUrl ? (
              <img src={c.cbtPhoto || c.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              c.fullNameEn.charAt(0)
            )}
          </div>
          <div>
            <span className="font-semibold text-[#2C2623] block">
              {language === 'ar' ? c.fullNameAr : c.fullNameEn}
            </span>
            <span className="text-[11px] text-[#7C756D] font-mono">
              ID: {c.nationalId || c.passportNumber} • {c.occupation}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'passport',
      header: language === 'ar' ? 'رقم الجواز' : 'Passport Number',
      render: c => (
        <div>
          <span className="font-mono text-xs font-bold text-[#7A2E3A] block">
            {c.passportNumber}
          </span>
        </div>
      ),
    },
    {
      key: 'batch',
      header: language === 'ar' ? 'الدفعة' : 'Batch',
      render: c => (
        <span className="font-mono text-xs text-[#2C2623] font-semibold">
          {getAssignedBatchDisplay(c)}
        </span>
      ),
    },
    {
      key: 'cbtStatus',
      header: language === 'ar' ? 'اختبار CBT' : 'CBT Status',
      render: () => (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          CBT Confirmed
        </span>
      ),
    },
    {
      key: 'practicalStatus',
      header: language === 'ar' ? 'حالة التقييم العملي' : 'Practical Assessment',
      render: c => {
        const isDone = c.practicalStatus === 'COMPLETED' || c.status === 'PRACTICAL_COMPLETED';
        return isDone ? (
          <div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              <CheckCircle2 className="w-3 h-3 text-purple-600" />
              Practical Completed
            </span>
            {c.taskNumber && (
              <span className="text-[10px] text-[#7C756D] block font-mono">
                Task #{c.taskNumber} {c.taskDifficulty ? `(${c.taskDifficulty})` : ''}
              </span>
            )}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Practical Pending
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: t.common.actions,
      className: 'text-end',
      headerClassName: 'text-end',
      render: c => (
        <button
          type="button"
          onClick={() => {
            if (isAssessor && c.assessorId !== user?.id && c.assessorName !== user?.name) {
              showToast('Access denied: Candidate is not allocated to your examination roster.', 'error');
              return;
            }
            setViewCandidate(c);
            AuditService.log('VIEW', 'CANDIDATE', `Candidate practical pending dossier viewed: ${c.fullNameEn} (${c.passportNumber})`, c.id);
          }}
          className="p-1.5 rounded text-[#7A2E3A] hover:bg-[#F8ECEE] font-semibold transition-colors inline-flex items-center gap-1 text-xs"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'عرض التفاصيل والتقييم' : 'View Details'}</span>
        </button>
      ),
    },
  ] : isCbtPendingMode ? [
    {
      key: 'name',
      header: language === 'ar' ? 'المرشح' : 'Candidate',
      render: c => (
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#7A2E3A]/10 text-[#7A2E3A] border border-[#7A2E3A]/20 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
            {c.photoUrl ? (
              <img src={c.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              c.fullNameEn.charAt(0)
            )}
          </div>
          <div>
            <span className="font-semibold text-[#2C2623] block">
              {language === 'ar' ? c.fullNameAr : c.fullNameEn}
            </span>
            <span className="text-[11px] text-[#7C756D] font-mono">
              ID: {c.nationalId || c.passportNumber}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'passport',
      header: language === 'ar' ? 'رقم الجواز' : 'Passport Number',
      render: c => (
        <div>
          <span className="font-mono text-xs font-bold text-[#7A2E3A] block">
            {c.passportNumber}
          </span>
        </div>
      ),
    },
    {
      key: 'batch',
      header: language === 'ar' ? 'الدفعة' : 'Batch',
      render: c => (
        <span className="font-mono text-xs text-[#2C2623] font-semibold">
          {getAssignedBatchDisplay(c)}
        </span>
      ),
    },
    {
      key: 'enrollmentStatus',
      header: language === 'ar' ? 'حالة التسجيل' : 'Enrollment Status',
      render: c => (
        <div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Enrollment Confirmed
          </span>
          {c.enrolledAt && (
            <span className="text-[10px] text-[#7C756D] block mt-0.5 font-mono">
              {new Date(c.enrolledAt).toLocaleDateString()}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'cbtStatus',
      header: language === 'ar' ? 'حالة اختبار CBT' : 'CBT Status',
      render: c => {
        const isCbtConfirmed = c.cbtStatus === 'CONFIRMED' || c.status === 'CBT_EXAM_CONFIRMED';
        return isCbtConfirmed ? (
          <div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              CBT Exam Confirmed
            </span>
            {c.cbtConfirmationTime && (
              <span className="text-[10px] text-[#7C756D] block mt-0.5 font-mono">
                {c.cbtConfirmationDate ? `${c.cbtConfirmationDate} • ` : ''}{c.cbtConfirmationTime}
              </span>
            )}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            CBT Exam Pending
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: t.common.actions,
      className: 'text-end',
      headerClassName: 'text-end',
      render: c => (
        <button
          type="button"
          onClick={() => {
            setViewCandidate(c);
            setVerificationPhoto(null);
            AuditService.log('VIEW', 'CANDIDATE', `Candidate CBT exam pending dossier viewed: ${c.fullNameEn} (${c.passportNumber})`, c.id);
          }}
          className="p-1.5 rounded text-[#7A2E3A] hover:bg-[#F8ECEE] font-semibold transition-colors inline-flex items-center gap-1 text-xs"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'عرض ومراجعة' : 'View Details'}</span>
        </button>
      ),
    },
  ] : isExitMode ? [
    {
      key: 'name',
      header: language === 'ar' ? 'المرشح' : 'Candidate',
      render: c => (
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#7A2E3A]/10 text-[#7A2E3A] border border-[#7A2E3A]/20 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
            {c.photoUrl ? (
              <img src={c.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              c.fullNameEn.charAt(0)
            )}
          </div>
          <div>
            <span className="font-semibold text-[#2C2623] block">
              {language === 'ar' ? c.fullNameAr : c.fullNameEn}
            </span>
            <span className="text-[11px] text-[#7C756D] font-mono">
              ID: {c.nationalId || c.passportNumber}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'passport',
      header: language === 'ar' ? 'رقم الجواز' : 'Passport',
      render: c => (
        <div>
          <span className="font-mono text-xs font-bold text-[#7A2E3A] block">
            {c.passportNumber}
          </span>
        </div>
      ),
    },
    {
      key: 'batch',
      header: language === 'ar' ? 'الدفعة' : 'Batch',
      render: c => (
        <span className="font-mono text-xs text-[#2C2623] font-semibold">
          {getAssignedBatchDisplay(c)}
        </span>
      ),
    },
    {
      key: 'checkInStatus',
      header: language === 'ar' ? 'تسجيل الدخول الأول' : '1st Check-In',
      className: 'text-center',
      headerClassName: 'text-center',
      render: c => {
        const isDone = isCandidateCheckInCompleted(c);
        return (
          <div className="flex flex-col items-center justify-center">
            {isDone ? (
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold text-sm shadow-2xs"
                title={language === 'ar' ? 'تم تأكيد تسجيل الدخول الأول' : '1st Check-In Confirmed'}
              >
                <span className="font-sans text-sm leading-none select-none font-black text-emerald-700">✓</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-50 text-rose-600 border border-rose-300 font-bold text-sm shadow-2xs"
                title={language === 'ar' ? 'تسجيل الدخول غير مكتمل' : '1st Check-In Pending'}
              >
                <span className="font-sans text-sm leading-none select-none font-black text-rose-600">✕</span>
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'enrollmentProcessStatus',
      header: language === 'ar' ? 'التسجيل' : 'Enrollment',
      className: 'text-center',
      headerClassName: 'text-center',
      render: c => {
        const isDone = isCandidateEnrollmentCompleted(c);
        return (
          <div className="flex flex-col items-center justify-center">
            {isDone ? (
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold text-sm shadow-2xs"
                title={language === 'ar' ? 'تم تأكيد التسجيل' : 'Enrollment Confirmed'}
              >
                <span className="font-sans text-sm leading-none select-none font-black text-emerald-700">✓</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-50 text-rose-600 border border-rose-300 font-bold text-sm shadow-2xs"
                title={language === 'ar' ? 'التسجيل غير مكتمل' : 'Enrollment Pending'}
              >
                <span className="font-sans text-sm leading-none select-none font-black text-rose-600">✕</span>
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'cbtProcessStatus',
      header: language === 'ar' ? 'اختبار CBT' : 'CBT',
      className: 'text-center',
      headerClassName: 'text-center',
      render: c => {
        const isDone = isCandidateCbtCompleted(c);
        return (
          <div className="flex flex-col items-center justify-center">
            {isDone ? (
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold text-sm shadow-2xs"
                title={language === 'ar' ? 'تم تأكيد اختبار CBT' : 'CBT Confirmed'}
              >
                <span className="font-sans text-sm leading-none select-none font-black text-emerald-700">✓</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-50 text-rose-600 border border-rose-300 font-bold text-sm shadow-2xs"
                title={language === 'ar' ? 'اختبار CBT غير مكتمل' : 'CBT Pending'}
              >
                <span className="font-sans text-sm leading-none select-none font-black text-rose-600">✕</span>
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'practicalProcessStatus',
      header: language === 'ar' ? 'التقييم العملي' : 'Practical Assessment',
      className: 'text-center',
      headerClassName: 'text-center',
      render: c => {
        const isDone = isCandidatePracticalCompleted(c);
        return (
          <div className="flex flex-col items-center justify-center">
            {isDone ? (
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold text-sm shadow-2xs"
                title={language === 'ar' ? 'تم تأكيد التقييم العملي' : 'Practical Assessment Confirmed'}
              >
                <span className="font-sans text-sm leading-none select-none font-black text-emerald-700">✓</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-50 text-rose-600 border border-rose-300 font-bold text-sm shadow-2xs"
                title={language === 'ar' ? 'التقييم العملي غير مكتمل' : 'Practical Assessment Pending'}
              >
                <span className="font-sans text-sm leading-none select-none font-black text-rose-600">✕</span>
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'exitStatus',
      header: language === 'ar' ? 'حالة الخروج' : 'Exit Status',
      render: c => {
        const isExitConfirmed = c.exitStatus === 'CONFIRMED';
        return isExitConfirmed ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Exit Confirmed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Awaiting Exit
          </span>
        );
      },
    },
    {
      key: 'exitDate',
      header: language === 'ar' ? 'تاريخ الخروج' : 'Exit Date',
      render: c => (
        <span className="font-mono text-xs text-[#2C2623]">
          {c.exitConfirmationDate || '—'}
        </span>
      ),
    },
    {
      key: 'exitTime',
      header: language === 'ar' ? 'وقت الخروج' : 'Exit Time',
      render: c => (
        <span className="font-mono text-xs text-[#7C756D]">
          {c.exitConfirmationTime || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t.common.actions,
      className: 'text-end',
      headerClassName: 'text-end',
      render: c => (
        <button
          type="button"
          onClick={() => {
            setViewCandidate(c);
            AuditService.log('VIEW', 'CANDIDATE', `Candidate exit dossier viewed: ${c.fullNameEn} (${c.passportNumber})`, c.id);
          }}
          className="p-1.5 rounded text-[#7A2E3A] hover:bg-[#F8ECEE] font-semibold transition-colors inline-flex items-center gap-1 text-xs"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'عرض ومراجعة' : 'View Details'}</span>
        </button>
      ),
    },
  ] : isEnrollVerifyMode ? [
    {
      key: 'name',
      header: language === 'ar' ? 'المرشح' : 'Candidate',
      render: c => (
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#7A2E3A]/10 text-[#7A2E3A] border border-[#7A2E3A]/20 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
            {c.photoUrl ? (
              <img src={c.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              c.fullNameEn.charAt(0)
            )}
          </div>
          <div>
            <span className="font-semibold text-[#2C2623] block">
              {language === 'ar' ? c.fullNameAr : c.fullNameEn}
            </span>
            <span className="text-[11px] text-[#7C756D] font-mono">
              ID: {c.nationalId || c.passportNumber}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'passport',
      header: language === 'ar' ? 'رقم الجواز' : 'Passport',
      render: c => (
        <div>
          <span className="font-mono text-xs font-bold text-[#7A2E3A] block">
            {c.passportNumber}
          </span>
        </div>
      ),
    },
    {
      key: 'batch',
      header: language === 'ar' ? 'الدفعة' : 'Batch',
      render: c => (
        <span className="font-mono text-xs text-[#2C2623] font-semibold">
          {getAssignedBatchDisplay(c)}
        </span>
      ),
    },
    {
      key: 'entryVerification',
      header: language === 'ar' ? 'التحقق عند الدخول' : 'Entry Verification',
      render: c => (
        <div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Entry Confirmed
          </span>
          {c.supportStaffConfirmationTime && (
            <span className="text-[10px] text-[#7C756D] block mt-0.5 font-mono">
              {c.supportStaffConfirmationDate ? `${c.supportStaffConfirmationDate} • ` : ''}{c.supportStaffConfirmationTime}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'enrollmentStatus',
      header: language === 'ar' ? 'حالة التسجيل' : 'Enrollment Status',
      render: c => (
        <StatusBadge status={(c.enrollmentStatus || c.status) as CandidateAssessmentStatus} />
      ),
    },
    {
      key: 'enrollmentPhoto',
      header: language === 'ar' ? 'صورة التسجيل' : 'Enrollment Photo',
      render: c => {
        const photo = c.enrollmentPhoto;
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md overflow-hidden border border-[#D5D0C7] bg-[#FAF8F5] shrink-0 shadow-2xs">
              {photo ? (
                <img src={photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-[#7C756D]">No img</div>
              )}
            </div>
            <span className="text-[10px] font-mono font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              Camera
            </span>
          </div>
        );
      },
    },
    {
      key: 'enrolledBy',
      header: language === 'ar' ? 'تم التسجيل بواسطة' : 'Enrolled By',
      render: c => (
        <div>
          <span className="text-xs font-semibold text-[#2C2623] block">
            {c.enrolledBy || 'Organizer Name'}
          </span>
          {c.enrolledAt && (
            <span className="text-[10px] text-[#7C756D] font-mono block">
              {new Date(c.enrolledAt).toLocaleDateString()} {new Date(c.enrolledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: t.common.actions,
      className: 'text-end',
      headerClassName: 'text-end',
      render: c => (
        <button
          type="button"
          onClick={() => {
            setViewCandidate(c);
            AuditService.log('VIEW', 'CANDIDATE', `Candidate enroll-verified dossier viewed: ${c.fullNameEn} (${c.passportNumber})`, c.id);
          }}
          className="p-1.5 rounded text-[#7A2E3A] hover:bg-[#F8ECEE] font-semibold transition-colors inline-flex items-center gap-1 text-xs"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'عرض التفاصيل' : 'View Details'}</span>
        </button>
      ),
    },
  ] : isEnrollmentPendingMode ? [
    {
      key: 'name',
      header: language === 'ar' ? 'المرشح' : 'Candidate',
      render: c => (
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#7A2E3A]/10 text-[#7A2E3A] border border-[#7A2E3A]/20 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
            {c.photoUrl ? (
              <img src={c.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              c.fullNameEn.charAt(0)
            )}
          </div>
          <div>
            <span className="font-semibold text-[#2C2623] block">
              {language === 'ar' ? c.fullNameAr : c.fullNameEn}
            </span>
            <span className="text-[11px] text-[#7C756D] font-mono">
              ID: {c.nationalId || c.passportNumber}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'passport',
      header: language === 'ar' ? 'رقم الجواز' : 'Passport',
      render: c => (
        <div>
          <span className="font-mono text-xs font-bold text-[#7A2E3A] block">
            {c.passportNumber}
          </span>
        </div>
      ),
    },
    {
      key: 'batch',
      header: language === 'ar' ? 'الدفعة' : 'Batch',
      render: c => (
        <span className="font-mono text-xs text-[#2C2623] font-semibold">
          {getAssignedBatchDisplay(c)}
        </span>
      ),
    },
    {
      key: 'verificationData',
      header: language === 'ar' ? 'بيانات التحقق' : 'Verification Data',
      render: c => {
        const isVerified = c.supportStaffVerificationStatus === 'CONFIRMED' || c.passportMatchConfirmed === true;
        return isVerified ? (
          <div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Verified at Entry
            </span>
            {c.supportStaffConfirmationTime && (
              <span className="text-[10px] text-[#7C756D] block mt-0.5 font-mono">
                {c.supportStaffConfirmationDate ? `${c.supportStaffConfirmationDate} • ` : ''}{c.supportStaffConfirmationTime}
              </span>
            )}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Verification Pending
          </span>
        );
      },
    },
    {
      key: 'enrollmentStatus',
      header: language === 'ar' ? 'حالة التسجيل' : 'Enrollment Status',
      render: () => (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          Pending Enrollment
        </span>
      ),
    },
    {
      key: 'actions',
      header: t.common.actions,
      className: 'text-end',
      headerClassName: 'text-end',
      render: c => (
        <button
          type="button"
          onClick={() => {
            setViewCandidate(c);
            AuditService.log('VIEW', 'CANDIDATE', `Candidate enrollment dossier viewed: ${c.fullNameEn} (${c.passportNumber})`, c.id);
          }}
          className="p-1.5 rounded text-[#7A2E3A] hover:bg-[#F8ECEE] font-semibold transition-colors inline-flex items-center gap-1 text-xs"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'عرض ومراجعة' : 'View Details'}</span>
        </button>
      ),
    },
  ] : [
    {
      key: 'name',
      header: language === 'ar' ? 'المرشح' : 'Candidate',
      render: c => (
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#7A2E3A]/10 text-[#7A2E3A] border border-[#7A2E3A]/20 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
            {c.photoUrl ? (
              <img src={c.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              c.fullNameEn.charAt(0)
            )}
          </div>
          <div>
            <span className="font-semibold text-[#2C2623] block">
              {language === 'ar' ? c.fullNameAr : c.fullNameEn}
            </span>
            <span className="text-[11px] text-[#7C756D] font-mono">
              ID: {c.nationalId || c.passportNumber}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'passport',
      header: language === 'ar' ? 'رقم الجواز' : 'Passport',
      render: c => (
        <div>
          <span className="font-mono text-xs font-bold text-[#7A2E3A] block">
            {c.passportNumber}
          </span>
        </div>
      ),
    },
    {
      key: 'batch',
      header: language === 'ar' ? 'الدفعة' : 'Batch',
      render: c => (
        <span className="font-mono text-xs text-[#2C2623] font-semibold">
          {getAssignedBatchDisplay(c)}
        </span>
      ),
    },
    {
      key: 'verificationStatus',
      header: language === 'ar' ? 'حالة التحقق' : 'Status',
      render: c => {
        const isConfirmed = c.supportStaffVerificationStatus === 'CONFIRMED';
        return isConfirmed ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Confirmed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Pending
          </span>
        );
      },
    },
    {
      key: 'confirmationDate',
      header: language === 'ar' ? 'تاريخ التأكيد' : 'Confirmation Date',
      render: c => (
        <span className="font-mono text-xs text-[#2C2623]">
          {c.supportStaffConfirmationDate || '—'}
        </span>
      ),
    },
    {
      key: 'confirmationTime',
      header: language === 'ar' ? 'وقت التأكيد' : 'Confirmation Time',
      render: c => (
        <span className="font-mono text-xs text-[#7C756D]">
          {c.supportStaffConfirmationTime || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t.common.actions,
      className: 'text-end',
      headerClassName: 'text-end',
      render: c => (
        <button
          type="button"
          onClick={() => {
            setViewCandidate(c);
            AuditService.log('VIEW', 'CANDIDATE', `Candidate dossier viewed: ${c.fullNameEn} (${c.passportNumber})`, c.id);
          }}
          className="p-1.5 rounded text-[#7A2E3A] hover:bg-[#F8ECEE] font-semibold transition-colors inline-flex items-center gap-1 text-xs"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'عرض التفاصيل' : 'View Details'}</span>
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={
          isPracticalConfirmedMode
            ? (language === 'ar' ? 'المؤكدون للتقييم العملي (Practical Confirmed)' : 'Practical Confirmed Candidates')
            : isCbtConfirmedMode
              ? (language === 'ar' ? 'دعم اختبار CBT — قائمة المؤكدين لاختبار CBT' : 'CBT Confirmed Candidates')
              : isPracticalPendingMode
                ? (language === 'ar' ? 'المقيّم — قائمة بانتظار التقييم العملي' : 'Assessor — Practical Assessment Pending')
                : isCbtPendingMode
                  ? (language === 'ar' ? 'دعم اختبار CBT — قائمة بانتظار اختبار CBT' : 'CBT Test Support — CBT Exam Pending')
                  : isExitMode
                    ? (language === 'ar' ? 'قائمة خروج المرشحين والتحقق' : 'Support Staff — Candidate Exit List & Verification')
                    : isEnrollVerifyMode
                      ? (language === 'ar' ? 'التحقق من التسجيل (Enroll Verify)' : 'Enroll Verify')
                      : isEnrollmentPendingMode
                        ? (language === 'ar' ? 'المنسق — قائمة بانتظار التسجيل' : 'Enrollment Pending')
                        : (language === 'ar' ? 'قائمة المرشحين والتحقق من الجواز' : 'Support Staff — Candidate List & Verification')
        }
        subtitle={
          isPracticalConfirmedMode
            ? (language === 'ar' ? 'مراجعة المرشحين المؤكد تقييمهم العملي، مع تفاصيل أرقام المهام وصور الكاميرا وتاريخ التأكيد والمقيم المسؤول.' : 'Review candidates who have completed practical assessment confirmation with archived live camera photos, task numbers, and assessor credentials. Records are permanently locked.')
            : isCbtConfirmedMode
              ? (language === 'ar' ? 'مراجعة المرشحين المؤكدين لاختبار CBT والمعتمدين للتقييم العملي، مع حفظ سجلات الدخول والتسجيل وصور الكاميرا دون إمكانية التكرار.' : 'Review candidates confirmed and authorized for CBT examination, ready to proceed to Practical Assessment. CBT records are permanently locked against duplicate confirmation.')
              : isPracticalPendingMode
                ? (language === 'ar' ? 'متابعة تقييم المرشحين المؤهلين للاختبار العملي، إدخال رقم المهمة (1-100)، مستوى الصعوبة، والتقاط صورتين مباشرتين بالكاميرا.' : 'Manage practical assessment candidates, assign task number (1-100), optional difficulty rate, and capture live camera practical photos.')
                : isCbtPendingMode
                  ? (language === 'ar' ? 'مراجعة المرشحين المؤكد تسجيلهم، التقاط صورة اختبار CBT الإلزامية بالكاميرا المباشرة، وتأكيد الإذن ببدء اختبار الحاسب الآلي للمركز' : 'Review candidates who have completed enrollment, capture mandatory live camera CBT photo, and confirm authorization to start the CBT computer examination.')
                  : isExitMode
                    ? (language === 'ar' ? 'مراجعة المرشحين المؤكدين عند الدخول، التحقق من الجواز، وتأكيد مغادرة المركز' : 'Review entry-confirmed candidates, verify physical passport, and confirm candidate exit from the assessment center.')
                    : isEnrollVerifyMode
                      ? (language === 'ar' ? 'قائمة المرشحين المسجلين والمعتمدين للتقييم، مع مراجعة صور التحقق وسجل التسجيل' : 'Review candidates enrolled and verified for assessment, with access to their captured enrollment photos and audit trail.')
                      : isEnrollmentPendingMode
                        ? (language === 'ar' ? 'مراجعة المرشحين المؤهلين للتسجيل، التحقق من بيانات الجواز، التقاط الصورة الإلزامية واعتماد التسجيل' : 'Review candidates pending enrollment, verify passport identity data, capture mandatory candidate photo, and confirm enrollment.')
                        : (language === 'ar' ? 'البحث بالباركود، التحقق من مطابقة الجواز، التقاط الصور الإلزامية، وتأكيد الحضور' : 'Scan passport barcodes, verify physical identity match, capture candidate photos, and confirm verification.')
        }
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { 
            label: isPracticalConfirmedMode
              ? (language === 'ar' ? 'المؤكدون للعملي' : 'Practical Confirmed')
              : isCbtConfirmedMode
                ? (language === 'ar' ? 'المؤكدون لاختبار CBT' : 'CBT Confirmed')
                : isPracticalPendingMode
                  ? (language === 'ar' ? 'بانتظار العملي' : 'Practical Pending')
                  : isCbtPendingMode
                    ? (language === 'ar' ? 'بانتظار اختبار CBT' : 'CBT Exam Pending')
                    : isExitMode 
                      ? (language === 'ar' ? 'قائمة خروج المرشحين' : 'Candidate Exit List') 
                      : isEnrollVerifyMode
                        ? (language === 'ar' ? 'التحقق من التسجيل' : 'Enroll Verify')
                        : isEnrollmentPendingMode
                          ? (language === 'ar' ? 'بانتظار التسجيل' : 'Enrollment Pending')
                          : (language === 'ar' ? 'المرشحون' : 'Candidates') 
          },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {(isCbtPendingMode || isCbtConfirmedMode || isPracticalPendingMode || isPracticalConfirmedMode) ? (
              !isCbtTestSupport && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate?.(isAssessor ? '/assessor/assessments/assigned' : '/candidates')}
                    leftIcon={<UserCheck className="w-4 h-4" />}
                  >
                    {language === 'ar' ? 'قائمة المرشحين' : 'Candidate List'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate?.('/batches')}
                    leftIcon={<Search className="w-4 h-4" />}
                  >
                    {language === 'ar' ? 'الدفعات' : 'Batches'}
                  </Button>
                </>
              )
            ) : isExitMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate?.('/candidates')}
                leftIcon={<UserCheck className="w-4 h-4" />}
              >
                {language === 'ar' ? 'قائمة التحقق عند الدخول' : 'Entry Candidate List'}
              </Button>
            ) : isEnrollVerifyMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate?.('/enrollment-pending')}
                  leftIcon={<Clock className="w-4 h-4" />}
                >
                  {language === 'ar' ? 'بانتظار التسجيل' : 'Enrollment Pending'}
                </Button>
                {!isOrganizer && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate?.('/candidates')}
                    leftIcon={<UserCheck className="w-4 h-4" />}
                  >
                    {language === 'ar' ? 'قائمة المرشحين' : 'Candidate List'}
                  </Button>
                )}
              </>
            ) : isEnrollmentPendingMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate?.('/enroll-verify')}
                  leftIcon={<ShieldCheck className="w-4 h-4" />}
                >
                  {language === 'ar' ? 'التحقق من التسجيل' : 'Enroll Verify'}
                </Button>
                {!isOrganizer && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigate?.('/candidates')}
                      leftIcon={<UserCheck className="w-4 h-4" />}
                    >
                      {language === 'ar' ? 'قائمة المرشحين' : 'Candidate List'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigate?.('/candidate-exit-list')}
                      leftIcon={<LogOut className="w-4 h-4" />}
                    >
                      {language === 'ar' ? 'قائمة خروج المرشحين' : 'Candidate Exit List'}
                    </Button>
                  </>
                )}
              </>
            ) : (
              <>
                {!isSupportStaff && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigate?.('/enrollment-pending')}
                      leftIcon={<UserCheck className="w-4 h-4" />}
                    >
                      {language === 'ar' ? 'بانتظار التسجيل' : 'Enrollment Pending'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigate?.('/enroll-verify')}
                      leftIcon={<ShieldCheck className="w-4 h-4" />}
                    >
                      {language === 'ar' ? 'التحقق من التسجيل' : 'Enroll Verify'}
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate?.('/candidate-exit-list')}
                  leftIcon={<LogOut className="w-4 h-4" />}
                >
                  {language === 'ar' ? 'قائمة خروج المرشحين' : 'Candidate Exit List'}
                </Button>
              </>
            )}
            {!isSupportStaff && !isOrganizer && !isCbtTestSupport && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate?.('/candidate-photos')}
                leftIcon={<Camera className="w-4 h-4" />}
              >
                {language === 'ar' ? 'معرض الصور' : 'Photo Gallery'}
              </Button>
            )}
            {!isExitMode && !isEnrollmentPendingMode && !isCbtPendingMode && !isCbtConfirmedMode && !isPracticalPendingMode && !isPracticalConfirmedMode && isCenterAdmin && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onNavigate?.('/enrollment')}
                  leftIcon={<UserCheck className="w-4 h-4" />}
                >
                  {language === 'ar' ? 'التسجيل والبصمة' : 'Enrollment Desk'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenAdd}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  {language === 'ar' ? 'إضافة مرشح' : 'Register Candidate'}
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Center-Scoped Access Banner for CBT Support / Organizer / Support Staff / Center Admin / Assessor */}
      {isCenterScoped && (
        <div className="mb-3 px-3.5 py-2 bg-gradient-to-r from-[#FAF8F5] via-[#FFF8F0] to-[#F8ECEE] border border-[#C9A24D]/40 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-semibold text-stone-700">
              {user?.role === 'ASSESSOR'
                ? (language === 'ar' ? 'نطاق المقيّم المعتمد (المرشحون المخصصون لك):' : 'Assessor Certified Roster (Your Assigned Candidates):')
                : (user?.role === 'CBT_TEST_SUPPORT'
                    ? (language === 'ar' ? 'نطاق مركز دعم اختبار CBT المخصص:' : 'Assigned CBT Center:')
                    : (user?.role === 'ORGANIZER' 
                        ? (language === 'ar' ? 'نطاق مركز المنسق المخصص:' : 'Assigned Organizer Center:') 
                        : (language === 'ar' ? 'نطاق المركز المخصص:' : 'Assigned Center Scope:')))}
            </span>
            <span className="text-[#7A2E3A] font-bold">
              {allCenters.find(c => c.id === userCenterId)?.nameEn || userCenterId}
            </span>
            <span className="text-stone-400 font-mono text-[11px]">
              ({allCenters.find(c => c.id === userCenterId)?.code || userCenterId})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100/80 text-emerald-800 border border-emerald-300/60">
              {isAssessor ? (language === 'ar' ? 'عزل خاص بالمقيّم' : 'Assessor-Wise Data Isolation') : (language === 'ar' ? 'عزل تام للمراكز والدول' : 'Strict Center-Wise Scope')}
            </span>
            <span className="text-[10px] text-stone-500 hidden md:inline">
              {isAssessor
                ? (language === 'ar' ? '• عرض وإدارة مرشحي هذا المقيّم حصراً' : '• Viewing and operating only on candidates assigned to you')
                : (language === 'ar' ? '• عرض وإدارة مرشحي هذا المركز حصراً' : '• Viewing and operating only on this center\'s candidates')}
            </span>
          </div>
        </div>
      )}

      {/* Tab Fast Navigation Bar for CBT & Practical Stages */}
      {(isCbtPendingMode || isCbtConfirmedMode || isPracticalPendingMode || isPracticalConfirmedMode) && (
        <div className="mb-4 flex flex-wrap items-center gap-2 p-1.5 bg-[#FAF8F5] border border-[#E8D9D2] rounded-xl shadow-xs">
          {/* CBT tabs: visible only to non-assessors (CBT Test Support and Admins) */}
          {!isAssessor && (
            <>
              <button
                type="button"
                onClick={() => onNavigate?.('/cbt-exam-pending')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  isCbtPendingMode
                    ? 'bg-[#7A2E3A] text-white shadow-xs'
                    : 'bg-white text-stone-700 hover:bg-[#F8ECEE] hover:text-[#7A2E3A] border border-[#E8D9D2]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? '1. بانتظار اختبار CBT' : '1. CBT Exam Pending'}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${isCbtPendingMode ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                  {candidates.filter(c => (!c.cbtStatus || c.cbtStatus === 'NOT_STARTED' || c.cbtStatus === 'PENDING') && c.cbtStatus !== 'CONFIRMED' && c.status !== 'CBT_EXAM_CONFIRMED' && c.cbtStatus !== 'COMPLETED' && c.status !== 'COMPLETED').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate?.('/cbt-confirmed')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  isCbtConfirmedMode
                    ? 'bg-[#7A2E3A] text-white shadow-xs'
                    : 'bg-white text-stone-700 hover:bg-[#F8ECEE] hover:text-[#7A2E3A] border border-[#E8D9D2]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? '2. المؤكدون لاختبار CBT' : '2. CBT Confirmed'}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${isCbtConfirmedMode ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                  {candidates.filter(c => c.cbtStatus === 'CONFIRMED' || c.status === 'CBT_EXAM_CONFIRMED').length}
                </span>
              </button>
            </>
          )}

          {/* Practical tabs: visible to Assessors and Admins (NOT CBT Test Support) */}
          {!isCbtTestSupport && (
            <>
              <button
                type="button"
                onClick={() => onNavigate?.(isAssessor ? '/assessor/practical-pending' : '/practical-pending')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  isPracticalPendingMode
                    ? 'bg-[#7A2E3A] text-white shadow-xs'
                    : 'bg-white text-stone-700 hover:bg-[#F8ECEE] hover:text-[#7A2E3A] border border-[#E8D9D2]'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? (isAssessor ? 'بانتظار التقييم العملي' : '3. بانتظار التقييم العملي') : (isAssessor ? 'Practical Pending' : '3. Practical Pending')}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${isPracticalPendingMode ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'}`}>
                  {isPracticalPendingMode ? candidates.length : '—'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate?.(isAssessor ? '/assessor/practical-confirmed' : '/practical-confirmed')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  isPracticalConfirmedMode
                    ? 'bg-[#7A2E3A] text-white shadow-xs'
                    : 'bg-white text-stone-700 hover:bg-[#F8ECEE] hover:text-[#7A2E3A] border border-[#E8D9D2]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? (isAssessor ? 'المؤكدون للتقييم العملي' : '4. المؤكدون للتقييم العملي') : (isAssessor ? 'Practical Confirmed' : '4. Practical Confirmed')}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${isPracticalConfirmedMode ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-800'}`}>
                  {isPracticalConfirmedMode ? candidates.length : '—'}
                </span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Filter and Search Bar with Integrated Barcode Scan Button */}
      <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white border border-[#E8D9D2] rounded-xl shadow-soft">
        <div className="relative w-full sm:w-96 flex items-center">
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
            placeholder={
              isPracticalConfirmedMode
                ? (language === 'ar' ? 'بحث برقم الجواز أو الباركود لقائمة المؤكدين للعملي...' : 'Search passport, barcode, candidate name for confirmed practical candidates...')
                : isCbtConfirmedMode
                  ? (language === 'ar' ? 'بحث برقم الجواز أو الباركود لقائمة المؤكدين لـ CBT...' : 'Search passport, barcode, candidate name for CBT confirmed candidates...')
                  : isPracticalPendingMode
                    ? (language === 'ar' ? 'بحث برقم الجواز أو الباركود لمرشحي العملي...' : 'Search passport, barcode, candidate name for practical assessment...')
                    : isCbtPendingMode
                      ? (language === 'ar' ? 'بحث برقم الجواز أو الباركود لاختبار CBT المعلق...' : 'Search passport, barcode, candidate name for pending CBT exam...')
                      : isExitMode
                        ? (language === 'ar' ? 'بحث برقم الجواز أو الباركود لخروج المرشح...' : 'Search passport barcode or manual number for exit...')
                        : isEnrollVerifyMode
                          ? (language === 'ar' ? 'بحث في المرشحين المسجلين والمعتمدين...' : 'Search enrolled candidates by name, passport, barcode...')
                          : isEnrollmentPendingMode
                            ? (language === 'ar' ? 'بحث برقم الجواز أو الباركود للتسجيل المعلق...' : 'Search passport, barcode, candidate name for pending enrollment...')
                            : (language === 'ar' ? 'بحث برقم الجواز أو الباركود أو الاسم...' : 'Search passport, barcode, candidate name...')
            }
            className="w-full text-xs sm:text-sm bg-white border border-[#E8D9D2] rounded-lg py-2 ps-9 pe-28 focus:outline-none focus:border-[#7A2E3A] focus:ring-1 focus:ring-[#7A2E3A]"
          />
          {/* Barcode Scanner Action Button */}
          <button
            type="button"
            onClick={handleOpenBarcodeScanner}
            title="Scan Passport Barcode"
            className="absolute inset-y-1.5 end-1.5 px-2.5 flex items-center gap-1.5 text-xs font-semibold text-[#7A2E3A] bg-[#F8ECEE] hover:bg-[#7A2E3A] hover:text-white rounded-md transition-colors"
          >
            <ScanBarcode className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold">Scan Barcode</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-4 h-4 text-stone-400" />
          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-white border border-[#E8D9D2] rounded-lg py-2 px-2.5 focus:outline-none focus:border-[#7A2E3A] text-stone-700"
          >
            {isCbtConfirmedMode ? (
              <>
                <option value="ALL">{language === 'ar' ? 'جميع المرشحين المؤكدين لـ CBT' : 'All CBT Confirmed Candidates'}</option>
                <option value="PRACTICAL_PENDING">{language === 'ar' ? 'بانتظار التقييم العملي' : 'Practical Assessment Pending'}</option>
                <option value="PRACTICAL_COMPLETED">{language === 'ar' ? 'مكتمل التقييم العملي' : 'Practical Completed'}</option>
              </>
            ) : isPracticalPendingMode ? (
              <>
                <option value="ALL">{language === 'ar' ? 'جميع المرشحين بانتظار التقييم العملي' : 'All Practical Pending Candidates'}</option>
                <option value="NOT_STARTED">{language === 'ar' ? 'لم يبدأ العملي بعد' : 'Practical Pending'}</option>
                <option value="COMPLETED">{language === 'ar' ? 'مكتمل العملي ومغلق' : 'Practical Completed'}</option>
              </>
            ) : isExitMode ? (
              <>
                <option value="ALL">{language === 'ar' ? 'جميع المرشحين المؤهلين للخروج' : 'All Eligible Candidates'}</option>
                <option value="PENDING">{language === 'ar' ? 'بانتظار تأكيد الخروج' : 'Awaiting Exit'}</option>
                <option value="CONFIRMED">{language === 'ar' ? 'تم تأكيد الخروج ومغلق' : 'Exit Confirmed'}</option>
              </>
            ) : isEnrollVerifyMode ? (
              <>
                <option value="ALL">{language === 'ar' ? 'جميع المرشحين المسجلين' : 'All Enrolled & Verified'}</option>
                <option value="ENROLLMENT_VERIFY">{language === 'ar' ? 'التحقق من التسجيل (Enrollment Verify)' : 'Enrollment Verify'}</option>
              </>
            ) : isEnrollmentPendingMode ? (
              <>
                <option value="ALL">{language === 'ar' ? 'جميع المرشحين بانتظار التسجيل' : 'All Pending Enrollment'}</option>
                <option value="CONFIRMED">{language === 'ar' ? 'تم التحقق من الجواز عند الدخول' : 'Entry Verified'}</option>
                <option value="PENDING">{language === 'ar' ? 'بانتظار التحقق من الجواز' : 'Verification Pending'}</option>
              </>
            ) : (
              <>
                <option value="ALL">{t.common.all} {t.common.status}</option>
                <option value="CONFIRMED">Confirmed Verification</option>
                <option value="PENDING">Pending Verification</option>
                <option value="REGISTERED">REGISTERED</option>
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="IN_ASSESSMENT">IN ASSESSMENT</option>
                <option value="COMPLETED">COMPLETED</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Candidate Table */}
      <Table
        columns={columns}
        data={paginated}
        keyExtractor={c => c.id}
      />

      <Pagination
        currentPage={currentPage}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />

      {/* ---------------------------------------------------------------------- */}
      {/* 1. Barcode Scanner Modal                                               */}
      {/* ---------------------------------------------------------------------- */}
      {isBarcodeScannerOpen && (
        <Modal
          isOpen={isBarcodeScannerOpen}
          onClose={handleCloseBarcodeScanner}
          maxWidth="md"
          icon={<ScanBarcode className="w-6 h-6 text-[#7A2E3A]" />}
          title="Passport Barcode Scanner"
          subtitle="Point camera at candidate's passport barcode or select candidate below"
        >
          <div className="space-y-4 text-xs">
            {/* Live Camera Viewfinder */}
            <div className="relative aspect-4/3 bg-black rounded-xl overflow-hidden flex items-center justify-center border-2 border-dashed border-[#7A2E3A]">
              <video
                ref={scannerVideoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Overlay Reticle */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                <div className="w-5/6 h-28 border-2 border-emerald-400 rounded-lg bg-emerald-400/10 shadow-[0_0_15px_rgba(52,211,153,0.5)] flex items-center justify-center">
                  <span className="text-[11px] font-mono text-emerald-200 bg-black/60 px-2 py-1 rounded">
                    Align Passport Barcode Here
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Test Barcode Simulator */}
            <div className="p-3 bg-[#FFFCF8] rounded-xl border border-[#E8D9D2] space-y-2">
              <span className="text-[11px] font-bold text-[#3F3030] block uppercase tracking-wider">
                Quick Scan Simulation (Tap Passport to Scan):
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {candidates.slice(0, 10).map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleApplyBarcodeScan(c.passportNumber)}
                    className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-[#E8D9D2] bg-white text-[#7A2E3A] hover:bg-[#7A2E3A] hover:text-white transition-colors"
                  >
                    {c.passportNumber}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#E8D9D2]">
                <input
                  type="text"
                  value={simulatedBarcodeInput}
                  onChange={e => setSimulatedBarcodeInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleApplyBarcodeScan(simulatedBarcodeInput);
                    }
                  }}
                  placeholder="Or enter barcode string manually..."
                  className="flex-1 text-xs p-1.5 bg-white border border-[#E8D9D2] rounded-md focus:outline-none focus:border-[#7A2E3A]"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleApplyBarcodeScan(simulatedBarcodeInput)}
                  disabled={!simulatedBarcodeInput.trim()}
                >
                  Scan
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button variant="secondary" size="sm" onClick={handleCloseBarcodeScanner}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 2. Candidate View Details / Passport Verification / Exit Modal         */}
      {/* ---------------------------------------------------------------------- */}
      {viewCandidate && (
        <Modal
          isOpen={!!viewCandidate}
          onClose={() => setViewCandidate(null)}
          maxWidth="lg"
          icon={
            isCbtConfirmedMode ? <CheckSquare className="w-6 h-6 text-emerald-600" /> :
            isPracticalPendingMode || isPracticalConfirmedMode ? <Wrench className="w-6 h-6 text-[#7A2E3A]" /> : 
            isCbtPendingMode || isCbtConfirmedMode ? <CheckSquare className="w-6 h-6 text-[#7A2E3A]" /> : 
            isExitMode ? <LogOut className="w-6 h-6 text-[#7A2E3A]" /> : 
            isEnrollVerifyMode ? <ShieldCheck className="w-6 h-6 text-emerald-600" /> : 
            <User className="w-6 h-6 text-[#7A2E3A]" />
          }
          title={
            <div className="flex items-center justify-between gap-3 w-full">
              <span>{language === 'ar' ? viewCandidate.fullNameAr : viewCandidate.fullNameEn}</span>
              {isPracticalConfirmedMode ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Practical Confirmed
                </span>
              ) : isCbtConfirmedMode ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  CBT Exam Confirmed
                </span>
              ) : isPracticalPendingMode ? (
                viewCandidate.practicalStatus === 'COMPLETED' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Practical Confirmed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    Practical Pending
                  </span>
                )
              ) : isCbtPendingMode ? (
                viewCandidate.cbtStatus === 'CONFIRMED' || viewCandidate.status === 'CBT_EXAM_CONFIRMED' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    CBT Exam Confirmed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    CBT Exam Pending
                  </span>
                )
              ) : isExitMode ? (
                viewCandidate.exitStatus === 'CONFIRMED' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Exit Confirmed & Locked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Awaiting Exit Confirmation
                  </span>
                )
              ) : isEnrollVerifyMode ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Enrollment Verify
                </span>
              ) : isEnrollmentPendingMode ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Pending Enrollment
                </span>
              ) : (
                viewCandidate.supportStaffVerificationStatus === 'CONFIRMED' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Confirmed & Locked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Verification Pending
                  </span>
                )
              )}
            </div>
          }
          subtitle={`Passport: ${viewCandidate.passportNumber}`}
          footer={
            <div className="flex items-center justify-between w-full">
              {isPracticalConfirmedMode ? (
                <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    {language === 'ar'
                      ? `تم تأكيد التقييم العملي في ${viewCandidate.practicalConfirmationDate || '—'} ${viewCandidate.practicalConfirmationTime || ''} بواسطة ${viewCandidate.practicalConfirmedBy || 'المقيّم'} (للقراءة فقط)`
                      : `Practical Confirmed on ${viewCandidate.practicalConfirmationDate || 'Recorded'} at ${viewCandidate.practicalConfirmationTime || '—'} by ${viewCandidate.practicalConfirmedBy || 'Assessor'} (Read Only)`}
                  </span>
                </div>
              ) : isCbtConfirmedMode ? (
                <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    CBT Exam Confirmed on {viewCandidate.cbtConfirmationDate || 'Recorded'} at {viewCandidate.cbtConfirmationTime || '—'} by {viewCandidate.cbtConfirmedBy || 'CBT Test Support'} (Read Only)
                  </span>
                </div>
              ) : isPracticalPendingMode ? (
                viewCandidate.practicalStatus === 'COMPLETED' ? (
                  <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      Practical Confirmed on {viewCandidate.practicalConfirmationDate} at {viewCandidate.practicalConfirmationTime} by {viewCandidate.practicalConfirmedBy || 'Assessor'} (Read Only)
                    </span>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!practicalPhoto1 || !taskNumber || !!taskNumberError}
                    onClick={handleConfirmPractical}
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  >
                    {language === 'ar' ? 'تأكيد التقييم العملي' : 'Confirm Practical Assessment'}
                  </Button>
                )
              ) : isCbtPendingMode ? (
                viewCandidate.cbtStatus === 'CONFIRMED' || viewCandidate.status === 'CBT_EXAM_CONFIRMED' ? (
                  <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      CBT Exam Confirmed on {viewCandidate.cbtConfirmationDate} at {viewCandidate.cbtConfirmationTime} by {viewCandidate.cbtConfirmedBy || 'CBT Test Support'} (Read Only)
                    </span>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!verificationPhoto}
                    onClick={handleConfirmCbtExam}
                    leftIcon={<CheckSquare className="w-3.5 h-3.5" />}
                  >
                    {language === 'ar' ? 'بدء اختبار CBT وتأكيده' : 'Start CBT Exam & Confirm'}
                  </Button>
                )
              ) : isExitMode ? (
                viewCandidate.exitStatus === 'CONFIRMED' ? (
                  <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      Exit confirmed on {viewCandidate.exitConfirmationDate} at {viewCandidate.exitConfirmationTime} by {viewCandidate.exitVerifiedBy || 'Support Staff'} (Read Only)
                    </span>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!exitMatchConfirmed}
                    onClick={handleConfirmExit}
                    leftIcon={<LogOut className="w-3.5 h-3.5" />}
                  >
                    {language === 'ar' ? 'تأكيد الخروج والاعتماد' : 'Exit & Confirm'}
                  </Button>
                )
              ) : isEnrollVerifyMode ? (
                <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    Enrolled & Verified (Status: Enrollment Verify)
                  </span>
                </div>
              ) : isEnrollmentPendingMode ? (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!verificationPhoto}
                  onClick={handleConfirmEnrollment}
                  leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                >
                  {language === 'ar' ? 'تأكيد التسجيل (Enroll)' : 'Enroll'}
                </Button>
              ) : (
                viewCandidate.supportStaffVerificationStatus === 'CONFIRMED' ? (
                  <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      Verified on {viewCandidate.supportStaffConfirmationDate} at {viewCandidate.supportStaffConfirmationTime} (Read Only)
                    </span>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!passportMatchConfirmed || !verificationPhoto}
                    onClick={handleConfirmVerification}
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  >
                    {language === 'ar' ? 'تأكيد التحقق والاعتماد' : 'Confirm'}
                  </Button>
                )
              )}
              <Button variant="secondary" size="sm" onClick={() => setViewCandidate(null)} className="ms-auto">
                {t.common.close}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Global hidden canvas for candidate photo frame capture across all modes */}
            <canvas ref={photoCanvasRef} className="hidden" />

            {/* Practical Pending / Confirmed Banner */}
            {(isPracticalPendingMode || isPracticalConfirmedMode) && (
              viewCandidate.practicalStatus === 'COMPLETED' ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <h4 className="font-bold text-emerald-900">
                      {language === 'ar' ? 'تم تأكيد واعتماد التقييم العملي بنجاح' : 'Practical Assessment Confirmed & Locked'}
                    </h4>
                    <p className="text-emerald-700 mt-0.5">
                      {language === 'ar'
                        ? 'تم توثيق المهمة العملية وصور الكاميرا المباشرة، وحفظ السجلات بشكل نهائي ودائم.'
                        : 'Candidate practical assessment has been conducted, Task Number and live camera photos archived. Record is permanently locked against changes.'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-4 text-[11px] font-mono text-emerald-800">
                      <span><strong>Task Number:</strong> #{viewCandidate.taskNumber || viewCandidate.assignedTaskId}</span>
                      <span><strong>Difficulty:</strong> {viewCandidate.taskDifficulty || 'Not Specified'}</span>
                      <span><strong>Confirmed Date:</strong> {viewCandidate.practicalConfirmationDate}</span>
                      <span><strong>Confirmed Time:</strong> {viewCandidate.practicalConfirmationTime}</span>
                      <span><strong>Assessor:</strong> {viewCandidate.practicalConfirmedBy || 'Assessor'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
                  <Wrench className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <h4 className="font-bold text-blue-900">
                      {language === 'ar' ? 'التقييم العملي — إدخال البيانات والتقاط الصور بالكاميرا المباشرة' : 'Practical Assessment Required'}
                    </h4>
                    <p className="text-blue-700 mt-0.5">
                      {language === 'ar'
                        ? 'يرجى إدخال رقم المهمة العملية (1–100)، تحديد مستوى الصعوبة (اختياري)، والتقاط صورتين مباشرتين بالكاميرا (الصورة الأولى إلزامية، الثانية اختيارية). رفع الملفات غير مسموح.'
                        : 'Enter Task Number (1–100 mandatory), select difficulty level (optional), and capture two live camera photos (Photo 1 Mandatory, Photo 2 Optional). File uploads are strictly disabled.'}
                    </p>
                  </div>
                </div>
              )
            )}

            {/* CBT Exam Pending / Confirmed Banner for CBT Mode & Confirmed Mode */}
            {(isCbtPendingMode || isCbtConfirmedMode) && (
              viewCandidate.cbtStatus === 'CONFIRMED' || viewCandidate.status === 'CBT_EXAM_CONFIRMED' ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <h4 className="font-bold text-emerald-900">
                      {language === 'ar' ? 'تم تأكيد اختبار CBT رسمياً والاعتماد' : 'CBT Examination Confirmed & Authorized'}
                    </h4>
                    <p className="text-emerald-700 mt-0.5">
                      {language === 'ar'
                        ? 'تم التحقق من المرشح، التقاط صورة اختبار CBT الإلزامية بالكاميرا المباشرة، وتأكيد الإذن ببدء اختبار الحاسب الآلي. البيانات مقفلة لمنع التكرار.'
                        : 'Candidate identity verified, mandatory live camera CBT photo captured, and authorized to start CBT exam. Record is permanently locked.'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-4 text-[11px] font-mono text-emerald-800">
                      <span><strong>Confirmed Date:</strong> {viewCandidate.cbtConfirmationDate}</span>
                      <span><strong>Confirmed Time:</strong> {viewCandidate.cbtConfirmationTime}</span>
                      <span><strong>Authorized By:</strong> {viewCandidate.cbtConfirmedBy || 'CBT Test Support'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <h4 className="font-bold text-amber-900">
                      {language === 'ar' ? 'المرشح بانتظار بدء اختبار CBT والتقاط الصورة الإلزامية' : 'Candidate Pending CBT Examination'}
                    </h4>
                    <p className="text-amber-700 mt-0.5">
                      {language === 'ar'
                        ? 'التقاط صورة المرشح عبر الكاميرا المباشرة إلزامي قبل تأكيد وبدء اختبار الحاسب الآلي CBT. لا يُسمح برفع ملفات أو إعادة استخدام الصور السابقة.'
                        : 'Taking a new candidate photo with the live camera is mandatory before starting the CBT examination. File uploads and profile photo reuse are disallowed.'}
                    </p>
                  </div>
                </div>
              )
            )}
            {/* Exit Confirmed Banner for Exit Mode */}
            {isExitMode && viewCandidate.exitStatus === 'CONFIRMED' ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-bold text-emerald-900">
                    Candidate Exit Confirmed & Permanently Locked
                  </h4>
                  <p className="text-emerald-700 mt-0.5">
                    This candidate's exit from the assessment center has been verified, authorized, and officially recorded. Data-entry is locked to prevent duplicate exit submissions.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-4 text-[11px] font-mono text-emerald-800">
                    <span><strong>Exit Date:</strong> {viewCandidate.exitConfirmationDate}</span>
                    <span><strong>Exit Time:</strong> {viewCandidate.exitConfirmationTime}</span>
                    <span><strong>Authorized By:</strong> {viewCandidate.exitVerifiedBy || 'Support Staff'}</span>
                  </div>
                  {viewCandidate.exitNotes && (
                    <div className="mt-1.5 text-[11px] text-emerald-900 bg-emerald-100/60 p-2 rounded border border-emerald-200">
                      <strong>Remarks:</strong> {viewCandidate.exitNotes}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Enrollment Pending Banner */}
            {isEnrollmentPendingMode && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-bold text-amber-900">
                    {language === 'ar' ? 'المرشح بانتظار استكمال التسجيل' : 'Candidate Pending Enrollment'}
                  </h4>
                  <p className="text-amber-700 mt-0.5">
                    {language === 'ar'
                      ? 'يرجى مراجعة بيانات المرشح والتحقق، التقاط الصورة الإلزامية، ثم الضغط على "تأكيد التسجيل" لاعتماد التسجيل.'
                      : 'Review candidate verification data, capture the mandatory candidate photo, and click "Enroll" to finalize enrollment.'}
                  </p>
                </div>
              </div>
            )}

            {/* Enroll Verify Banner */}
            {isEnrollVerifyMode && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-bold text-emerald-900">
                    {language === 'ar' ? 'تم تأكيد تسجيل المرشح واعتماده (Enrollment Verify)' : 'Candidate Enrollment Verified'}
                  </h4>
                  <p className="text-emerald-700 mt-0.5">
                    {language === 'ar'
                      ? 'تم اعتماد تسجيل هذا المرشح بنجاح، وحفظ صورة التسجيل الملتقطة بالكاميرا وسجل التحقق.'
                      : 'Candidate has been officially enrolled and verified for assessment. Camera enrollment photo and audit log are archived.'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-4 text-[11px] font-mono text-emerald-800">
                    <span><strong>Enrolled By:</strong> {viewCandidate.enrolledBy || 'Organizer Name'}</span>
                    {viewCandidate.enrolledAt && (
                      <span><strong>Enrolled At:</strong> {new Date(viewCandidate.enrolledAt).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Entry Confirmation Banner for Entry Mode */}
            {!isExitMode && !isEnrollmentPendingMode && viewCandidate.supportStaffVerificationStatus === 'CONFIRMED' ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-bold text-emerald-900">
                    Passport Verification Confirmed & Locked
                  </h4>
                  <p className="text-emerald-700 mt-0.5">
                    This candidate's physical passport match and verification photo were verified and permanently confirmed. Data-entry is locked to prevent duplicate confirmation.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-4 text-[11px] font-mono text-emerald-800">
                    <span><strong>Confirmed Date:</strong> {viewCandidate.supportStaffConfirmationDate}</span>
                    <span><strong>Confirmed Time:</strong> {viewCandidate.supportStaffConfirmationTime}</span>
                    <span><strong>Verified By:</strong> {viewCandidate.supportStaffVerifiedBy || 'Support Staff'}</span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Candidate Identity Overview Card (Profile Picture - Remains Unchanged) */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC]">
              <div className="w-20 h-20 rounded-xl border-2 border-[#D5D0C7] overflow-hidden bg-white shrink-0 shadow-xs relative">
                {viewCandidate.photoUrl ? (
                  <img src={viewCandidate.photoUrl} alt="Candidate Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#7A2E3A]/10 text-[#7A2E3A] flex items-center justify-center font-bold text-2xl">
                    {viewCandidate.fullNameEn.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base text-[#2C2623]">
                    {language === 'ar' ? viewCandidate.fullNameAr : viewCandidate.fullNameEn}
                  </span>
                  <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded bg-[#E8E4DC] text-[#4A423A]">
                    Profile Picture (Unchanged)
                  </span>
                </div>
                <div className="text-xs text-[#7C756D] mt-0.5">
                  Occupation: <strong className="text-[#3F3030]">{viewCandidate.occupation}</strong>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#7A2E3A] px-2 py-0.5 rounded bg-[#F8ECEE] border border-[#E8D9D2]">
                    Passport: {viewCandidate.passportNumber}
                  </span>
                  <StatusBadge status={viewCandidate.status} />
                </div>
              </div>
            </div>

            {/* Official Candidate & Center Assignment */}
            <div>
              <ModalSectionTitle title={language === 'ar' ? 'بيانات التعيين والمركز الفعلي' : 'Official Candidate & Center Assignment'} />
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#FFFCF8] rounded-xl border border-[#E8E4DC] text-xs">
                <div>
                  <span className="text-[#7C756D] block mb-0.5">{language === 'ar' ? 'رقم الجواز' : 'Passport Number'}</span>
                  <span className="font-mono font-bold text-[#7A2E3A] text-sm">{viewCandidate.passportNumber}</span>
                </div>
                <div>
                  <span className="text-[#7C756D] block mb-0.5">{language === 'ar' ? 'الهوية الوطنية / الإقامة' : 'National ID / CPR'}</span>
                  <span className="font-mono font-semibold text-[#2C2623]">{viewCandidate.nationalId || viewCandidate.idNo || 'N/A'}</span>
                </div>
                {/* Real Assigned Center */}
                <div>
                  <span className="text-[#7C756D] block mb-0.5 font-semibold text-[#3F3030]">
                    {language === 'ar' ? 'المركز المعين' : 'Assigned Center'}
                  </span>
                  <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                    {getAssignedCenterDisplay(viewCandidate)}
                  </span>
                </div>
                {/* Real Assigned Batch */}
                <div>
                  <span className="text-[#7C756D] block mb-0.5 font-semibold text-[#3F3030]">
                    {language === 'ar' ? 'الدفعة المعينة' : 'Assigned Batch'}
                  </span>
                  <span className="font-mono font-bold text-[#7A2E3A] bg-[#F8ECEE] px-2 py-0.5 rounded border border-[#E8D9D2] inline-block">
                    {getAssignedBatchDisplay(viewCandidate)}
                  </span>
                </div>
              </div>
            </div>

            {/* EXIT MODE, ENROLL VERIFY, ENROLLMENT PENDING & CBT MODE: Entry Verification Record Audit Summary */}
            {(isExitMode || isEnrollmentPendingMode || isEnrollVerifyMode || isCbtPendingMode) && (
              <div>
                <ModalSectionTitle title={language === 'ar' ? 'بيانات التحقق وسجل الدخول' : 'Official Entry Verification Record'} />
                {viewCandidate.supportStaffVerificationStatus === 'CONFIRMED' || viewCandidate.passportMatchConfirmed ? (
                  <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-emerald-300 bg-white shrink-0 shadow-2xs">
                      {viewCandidate.passportVerificationPhoto || viewCandidate.passportVerificationRecord?.verificationPhoto ? (
                        <img
                          src={viewCandidate.passportVerificationPhoto || viewCandidate.passportVerificationRecord?.verificationPhoto || ''}
                          alt="Entry Verification Photo"
                          className="w-full h-full object-cover"
                        />
                      ) : viewCandidate.photoUrl ? (
                        <img src={viewCandidate.photoUrl} alt="Candidate Photo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-emerald-700 text-xs">No Photo</div>
                      )}
                    </div>
                    <div className="flex-1 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Entry Verification Confirmed</span>
                      </div>
                      <div className="text-[11px] text-emerald-800 mt-1 space-y-0.5 font-mono">
                        <div>Confirmed Date: <strong>{viewCandidate.supportStaffConfirmationDate || 'Verified'}</strong></div>
                        <div>Confirmed Time: <strong>{viewCandidate.supportStaffConfirmationTime || '—'}</strong></div>
                        <div>Staff: <strong>{viewCandidate.supportStaffVerifiedBy || 'Support Staff / Organizer'}</strong></div>
                        <div>Passport Match: <strong>{viewCandidate.passportMatchConfirmed ? 'Confirmed' : 'Pending'}</strong></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 flex items-center gap-3 text-xs text-amber-800">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-semibold block">Entry Verification Record: Pending</span>
                      <span className="text-[11px] text-amber-700">Physical passport verification is pending at reception. Photo capture and enrollment may proceed.</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stored Candidate Photos Ledger (Preserves All Historical Photos & Master Profile Picture - Up to 6 Columns) */}
            <div>
              <ModalSectionTitle title={language === 'ar' ? 'سجل صور المرشح المحفوظة (سجلات منفصلة)' : 'Stored Candidate Photos Ledger (Separate Records Preserved)'} />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* 1. Master Profile Photo (Untouched) */}
                <div className="p-3 bg-white rounded-xl border border-[#E8D9D2] flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-[#D5D0C7] bg-[#FAF8F5] mb-2 shadow-2xs">
                    {viewCandidate.photoUrl ? (
                      <img src={viewCandidate.photoUrl} alt="Master Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-[#7C756D]">No Photo</div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-[#4A423A] bg-[#E8E4DC] px-2 py-0.5 rounded-full mb-1">
                    Master Profile Photo
                  </span>
                  <span className="text-[10px] text-[#7C756D] leading-tight">
                    Permanent Profile Avatar • Untouched
                  </span>
                </div>

                {/* 2. 1st Entry Verification Photo */}
                <div className="p-3 bg-white rounded-xl border border-[#E8D9D2] flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-emerald-300 bg-emerald-50/40 mb-2 shadow-2xs">
                    {viewCandidate.passportVerificationPhoto || viewCandidate.passportVerificationRecord?.verificationPhoto ? (
                      <img
                        src={viewCandidate.passportVerificationPhoto || viewCandidate.passportVerificationRecord?.verificationPhoto || ''}
                        alt="Entry Verification"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-amber-700">Not recorded</div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mb-1">
                    1st Entry Photo
                  </span>
                  <span className="text-[10px] text-[#7C756D] font-mono leading-tight">
                    {viewCandidate.supportStaffConfirmationTime || 'Entry Stage'}
                  </span>
                </div>

                {/* 3. Enrollment Verification Photo */}
                <div className="p-3 bg-white rounded-xl border border-[#E8D9D2] flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-[#7A2E3A]/40 bg-[#F8ECEE]/30 mb-2 shadow-2xs">
                    {viewCandidate.enrollmentPhoto ? (
                      <img src={viewCandidate.enrollmentPhoto} alt="Enrollment Photo" className="w-full h-full object-cover" />
                    ) : verificationPhoto && isEnrollmentPendingMode ? (
                      <img src={verificationPhoto} alt="New Camera Capture" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-stone-400 p-1 text-center">
                        <Camera className="w-4 h-4 mb-1 text-stone-400" />
                        <span>Pending Camera</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-[#7A2E3A] bg-[#F8ECEE] px-2 py-0.5 rounded-full border border-[#E8D9D2] mb-1">
                    Enrollment Photo
                  </span>
                  <span className="text-[10px] text-[#7C756D] font-mono leading-tight">
                    {viewCandidate.enrolledBy ? `By: ${viewCandidate.enrolledBy}` : verificationPhoto && isEnrollmentPendingMode ? 'Camera Captured' : 'Camera Required'}
                  </span>
                </div>

                {/* 4. CBT Examination Photo */}
                <div className="p-3 bg-white rounded-xl border border-[#E8D9D2] flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-blue-400 bg-blue-50/30 mb-2 shadow-2xs">
                    {viewCandidate.cbtPhoto ? (
                      <img src={viewCandidate.cbtPhoto} alt="CBT Examination Photo" className="w-full h-full object-cover" />
                    ) : verificationPhoto && isCbtPendingMode ? (
                      <img src={verificationPhoto} alt="CBT Camera Capture" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-stone-400 p-1 text-center">
                        <Camera className="w-4 h-4 mb-1 text-stone-400" />
                        <span>Pending Camera</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 mb-1">
                    CBT Photo
                  </span>
                  <span className="text-[10px] text-[#7C756D] font-mono leading-tight">
                    {viewCandidate.cbtConfirmedBy ? `By: ${viewCandidate.cbtConfirmedBy}` : verificationPhoto && isCbtPendingMode ? 'Camera Captured' : 'Camera Required'}
                  </span>
                </div>

                {/* 5. Practical Photo 1 (Mandatory) */}
                <div className="p-3 bg-white rounded-xl border border-[#E8D9D2] flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-purple-400 bg-purple-50/30 mb-2 shadow-2xs">
                    {viewCandidate.practicalPhoto1 ? (
                      <img src={viewCandidate.practicalPhoto1} alt="Practical Photo 1" className="w-full h-full object-cover" />
                    ) : practicalPhoto1 ? (
                      <img src={practicalPhoto1} alt="Practical Photo 1 Captured" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-stone-400 p-1 text-center">
                        <Camera className="w-4 h-4 mb-1 text-stone-400" />
                        <span>Camera Required</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 mb-1">
                    Practical Photo 1 *
                  </span>
                  <span className="text-[10px] text-[#7C756D] font-mono leading-tight">
                    {viewCandidate.practicalPhoto1 ? 'Saved Record' : practicalPhoto1 ? 'Captured (Camera)' : 'Mandatory Camera'}
                  </span>
                </div>

                {/* 6. Practical Photo 2 (Optional) */}
                <div className="p-3 bg-white rounded-xl border border-[#E8D9D2] flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-stone-300 bg-stone-50 mb-2 shadow-2xs">
                    {viewCandidate.practicalPhoto2 ? (
                      <img src={viewCandidate.practicalPhoto2} alt="Practical Photo 2" className="w-full h-full object-cover" />
                    ) : practicalPhoto2 ? (
                      <img src={practicalPhoto2} alt="Practical Photo 2 Captured" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-stone-400 p-1 text-center">
                        <Camera className="w-4 h-4 mb-1 text-stone-400" />
                        <span>Optional</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-300 mb-1">
                    Practical Photo 2
                  </span>
                  <span className="text-[10px] text-[#7C756D] font-mono leading-tight">
                    {viewCandidate.practicalPhoto2 ? 'Saved Record' : practicalPhoto2 ? 'Captured (Camera)' : 'Optional Camera'}
                  </span>
                </div>
              </div>
            </div>

            {/* EXIT MODE: Process Status Indicators Overview Card */}
            {isExitMode && (
              <div>
                <ModalSectionTitle title={language === 'ar' ? 'مراحل التقييم والعمليات المنجزة' : 'Assessment Workflow Process Status'} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* 1st Check-In */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    isCandidateCheckInCompleted(viewCandidate) 
                      ? 'bg-emerald-50/70 border-emerald-200' 
                      : 'bg-rose-50/70 border-rose-200'
                  }`}>
                    <div className="text-xs">
                      <span className="text-[10px] text-stone-500 block uppercase font-semibold">Stage 1</span>
                      <span className="font-bold text-[#2C2623] block">1st Check-In / Entry</span>
                      <span className="text-[10px] font-mono text-stone-600 block mt-0.5">
                        {isCandidateCheckInCompleted(viewCandidate)
                          ? (viewCandidate.supportStaffConfirmationTime ? `Confirmed • ${viewCandidate.supportStaffConfirmationTime}` : 'Confirmed')
                          : 'Not Completed'}
                      </span>
                    </div>
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-sm shadow-2xs ${
                      isCandidateCheckInCompleted(viewCandidate) ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {isCandidateCheckInCompleted(viewCandidate) ? '✓' : '✕'}
                    </span>
                  </div>

                  {/* Enrollment */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    isCandidateEnrollmentCompleted(viewCandidate) 
                      ? 'bg-emerald-50/70 border-emerald-200' 
                      : 'bg-rose-50/70 border-rose-200'
                  }`}>
                    <div className="text-xs">
                      <span className="text-[10px] text-stone-500 block uppercase font-semibold">Stage 2</span>
                      <span className="font-bold text-[#2C2623] block">Enrollment</span>
                      <span className="text-[10px] font-mono text-stone-600 block mt-0.5">
                        {isCandidateEnrollmentCompleted(viewCandidate)
                          ? (viewCandidate.enrolledAt ? `Enrolled • ${new Date(viewCandidate.enrolledAt).toLocaleDateString()}` : 'Enrolled & Verified')
                          : 'Not Completed'}
                      </span>
                    </div>
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-sm shadow-2xs ${
                      isCandidateEnrollmentCompleted(viewCandidate) ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {isCandidateEnrollmentCompleted(viewCandidate) ? '✓' : '✕'}
                    </span>
                  </div>

                  {/* CBT */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    isCandidateCbtCompleted(viewCandidate) 
                      ? 'bg-emerald-50/70 border-emerald-200' 
                      : 'bg-rose-50/70 border-rose-200'
                  }`}>
                    <div className="text-xs">
                      <span className="text-[10px] text-stone-500 block uppercase font-semibold">Stage 3</span>
                      <span className="font-bold text-[#2C2623] block">{language === 'ar' ? 'اختبار CBT' : 'CBT Examination'}</span>
                      <span className="text-[10px] font-mono text-stone-600 block mt-0.5">
                        {isCandidateCbtCompleted(viewCandidate)
                          ? (viewCandidate.cbtConfirmationTime ? `Confirmed • ${viewCandidate.cbtConfirmationTime}` : viewCandidate.cbtStatus === 'COMPLETED' ? 'Completed' : 'Confirmed')
                          : 'Not Completed'}
                      </span>
                    </div>
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-sm shadow-2xs ${
                      isCandidateCbtCompleted(viewCandidate) ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {isCandidateCbtCompleted(viewCandidate) ? '✓' : '✕'}
                    </span>
                  </div>

                  {/* Practical Assessment */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    isCandidatePracticalCompleted(viewCandidate) 
                      ? 'bg-emerald-50/70 border-emerald-200' 
                      : 'bg-rose-50/70 border-rose-200'
                  }`}>
                    <div className="text-xs">
                      <span className="text-[10px] text-stone-500 block uppercase font-semibold">Stage 4</span>
                      <span className="font-bold text-[#2C2623] block">Practical Assessment</span>
                      <span className="text-[10px] font-mono text-stone-600 block mt-0.5">
                        {isCandidatePracticalCompleted(viewCandidate)
                          ? (viewCandidate.practicalConfirmedBy ? `Confirmed • ${viewCandidate.practicalConfirmedBy}` : 'Confirmed')
                          : 'Not Completed'}
                      </span>
                    </div>
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-sm shadow-2xs ${
                      isCandidatePracticalCompleted(viewCandidate) ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {isCandidatePracticalCompleted(viewCandidate) ? '✓' : '✕'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* EXIT MODE: Exit Verification & Authorization Section */}
            {isExitMode && (
              <div>
                <ModalSectionTitle title={language === 'ar' ? 'إجراءات تأكيد المغادرة والخروج' : 'Candidate Exit Verification & Authorization'} />
                {viewCandidate.exitStatus === 'CONFIRMED' ? (
                  <div className="p-3.5 bg-[#FFFCF8] rounded-xl border border-[#E8D9D2] flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="text-xs">
                      <span className="font-bold text-[#3F3030] block">Exit Process Completed</span>
                      <span className="text-[11px] text-emerald-700 font-medium block">
                        Candidate departure officially confirmed on {viewCandidate.exitConfirmationDate} at {viewCandidate.exitConfirmationTime}.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-[#FFFCF8] rounded-xl border border-[#E8D9D2] space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exitMatchConfirmed}
                        onChange={e => setExitMatchConfirmed(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-[#7A2E3A] border-[#E8D9D2] focus:ring-[#7A2E3A]"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-[#3F3030] block">
                          Confirm Candidate Exit Authorization <span className="text-rose-600">*</span>
                        </span>
                        <span className="text-[11px] text-[#806F6F] mt-0.5 block leading-relaxed">
                          I confirm that candidate physical passport ({viewCandidate.passportNumber}) has been verified, all practical tasks & materials are accounted for, and the candidate is authorized to depart from the center.
                        </span>
                      </div>
                    </label>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#7C756D] mb-1">
                        Exit Remarks / Notes (Optional)
                      </label>
                      <input
                        type="text"
                        value={exitNotes}
                        onChange={e => setExitNotes(e.target.value)}
                        placeholder="e.g. Assessment finished, tools returned, personal belongings collected"
                        className="w-full text-xs p-2 bg-white border border-[#E8D9D2] rounded-lg focus:outline-none focus:border-[#7A2E3A]"
                      />
                    </div>

                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Exit confirmation is a <strong>one-time action</strong>. Once confirmed, it will be permanently locked and cannot be resubmitted.</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ENTRY, ENROLLMENT PENDING & CBT PENDING MODE: Candidate Photo Verification / Capture */}
            {!isExitMode && !isEnrollVerifyMode && !isPracticalPendingMode && !isCbtConfirmedMode && (
              <div>
                <div className="flex items-center justify-between pb-1.5">
                  <ModalSectionTitle
                    title={
                      isCbtPendingMode
                        ? (language === 'ar' ? 'التقاط صورة اختبار CBT (إلزامي عبر الكاميرا)' : 'CBT Candidate Photo Capture (Mandatory Camera)')
                        : isEnrollmentPendingMode
                        ? (language === 'ar' ? 'التقاط صورة المرشح (إلزامي)' : 'Candidate Photo Capture (Mandatory)')
                        : (language === 'ar' ? 'التحقق من صورة المرشح (إلزامي)' : 'Candidate Photo Verification (Mandatory)')
                    }
                  />
                  {verificationPhoto ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {language === 'ar' ? 'تم إرفاق الصورة' : 'Photo Attached'}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      {language === 'ar' ? 'الصورة مطلوبة' : 'Photo Required'}
                    </span>
                  )}
                </div>

                {(isCbtPendingMode ? (viewCandidate.cbtStatus !== 'CONFIRMED' && viewCandidate.status !== 'CBT_EXAM_CONFIRMED') : (isEnrollmentPendingMode || viewCandidate.supportStaffVerificationStatus !== 'CONFIRMED')) ? (
                  <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E8E4DC] space-y-3">
                    {/* Camera Video Stream Preview */}
                    {isCameraActive && activeCameraTarget === 'verification' && (
                      <div className="space-y-2">
                        <div className="relative aspect-4/3 max-w-sm mx-auto bg-black rounded-xl overflow-hidden border-2 border-[#7A2E3A]">
                          <video
                            ref={photoVideoRef}
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-48 h-60 border-2 border-white/60 rounded-full" />
                          </div>
                        </div>

                        <div className="flex justify-center gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={capturePhotoFromCamera}
                            leftIcon={<Camera className="w-3.5 h-3.5" />}
                          >
                            {language === 'ar' ? 'التقاط الصورة' : 'Capture Photo'}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={stopPhotoCamera}
                          >
                            {language === 'ar' ? 'إلغاء الكاميرا' : 'Cancel Camera'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {cameraError && (
                      <div className="p-2 rounded-lg bg-amber-50 text-amber-800 text-[11px] border border-amber-200">
                        Notice: {cameraError}
                      </div>
                    )}

                    {/* Active Photo Preview */}
                    {verificationPhoto && !isCameraActive && (
                      <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#E8D9D2] shadow-xs">
                        <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-[#7A2E3A]/40 bg-[#FAF8F5] shrink-0">
                          <img src={verificationPhoto} alt="Candidate Photo" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-[#2C2623]">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              {isCbtPendingMode
                                ? (language === 'ar' ? 'تم التقاط صورة اختبار CBT بالكاميرا' : 'CBT Examination Photo Captured via Camera')
                                : isEnrollmentPendingMode
                                ? (language === 'ar' ? 'تم التقاط صورة المرشح بالكاميرا' : 'Candidate Photo Captured via Camera')
                                : (language === 'ar' ? 'تم إرفاق صورة التحقق' : 'Passport Verification Photo Attached')}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#7C756D] mt-0.5 leading-relaxed">
                            {isCbtPendingMode ? (
                              language === 'ar'
                                ? 'سيتم حفظ هذه الصورة رسمياً كصورة خاصة باختبار CBT دون تعديل صورة الملف الشخصي أو صورة الدخول أو صورة التسجيل.'
                                : 'Will be saved as official CBT Examination photo record. Master profile, entry verification, and enrollment photos remain strictly untouched.'
                            ) : isEnrollmentPendingMode ? (
                              language === 'ar' ? 'سيتم حفظ هذه الصورة رسمياً كسجل منفصل للتسجيل دون استبدال صورة الملف الشخصي.' : 'Will be saved as an official, separate enrollment photo record. Master profile picture remains strictly untouched.'
                            ) : (
                              <>Will be archived under candidate's <strong>Passport Verification record</strong>. Candidate's Profile Picture remains untouched.</>
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setVerificationPhoto(null)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 rounded hover:bg-rose-50 transition-colors shrink-0"
                        >
                          {language === 'ar' ? 'إزالة' : 'Remove'}
                        </button>
                      </div>
                    )}

                    {/* Photo Options Toolbar */}
                    {!isCameraActive && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {/* Existing Photo Option - STRICTLY HIDDEN in Enrollment Pending Mode & CBT Pending Mode */}
                        {!isEnrollmentPendingMode && !isCbtPendingMode && viewCandidate.photoUrl && (
                          <button
                            type="button"
                            onClick={() => setVerificationPhoto(viewCandidate.photoUrl || null)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                              verificationPhoto === viewCandidate.photoUrl
                                ? 'bg-[#7A2E3A] text-white border-[#7A2E3A]'
                                : 'bg-white text-[#3F3030] border-[#E8D9D2] hover:bg-[#F8ECEE]'
                            }`}
                          >
                            {language === 'ar' ? 'استخدام صورة الملف الشخصي' : 'Use Existing Profile Photo'}
                          </button>
                        )}

                        {/* Camera Capture Option - Highlighted primary action */}
                        <button
                          type="button"
                          onClick={startPhotoCamera}
                          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-[#7A2E3A] bg-[#7A2E3A] text-white hover:bg-[#62232E] transition-colors inline-flex items-center gap-1.5 shadow-xs"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>{language === 'ar' ? 'التقاط بكاميرا الويب' : 'Take Photo with Camera'}</span>
                        </button>
                      </div>
                    )}

                    <canvas ref={photoCanvasRef} className="hidden" />

                    {/* Validation Error Warning if photo is missing */}
                    {!verificationPhoto && (
                      <div className="p-2 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>
                          {isCbtPendingMode
                            ? (language === 'ar' ? 'صورة اختبار CBT المباشرة عبر الكاميرا إلزامية قبل بدء وتأكيد الاختبار.' : 'Live camera CBT candidate photo is mandatory before starting and confirming CBT exam.')
                            : isEnrollmentPendingMode
                            ? (language === 'ar' ? 'صورة المرشح إلزامية قبل تأكيد التسجيل.' : 'Candidate photo is mandatory before confirming enrollment.')
                            : (language === 'ar' ? 'صورة التحقق إلزامية قبل التأكيد.' : 'Candidate verification photo is required before confirmation.')}
                        </span>
                      </div>
                    )}
                  </div>
                ) : isCbtPendingMode ? (
                  /* Read-Only Photo Display for Confirmed CBT Records */
                  <div className="p-3 bg-[#FFFCF8] rounded-xl border border-blue-200 flex items-center gap-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-blue-300 bg-white shrink-0">
                      {viewCandidate.cbtPhoto || verificationPhoto ? (
                        <img
                          src={viewCandidate.cbtPhoto || verificationPhoto || ''}
                          alt="Official CBT Examination Photo"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#806F6F] text-xs">No Photo</div>
                      )}
                    </div>
                    <div className="text-xs">
                      <span className="font-bold text-[#3F3030] block">Official CBT Examination Photo</span>
                      <span className="text-[11px] text-blue-700 font-semibold block">
                        Archived under CBT Examination Record on {viewCandidate.cbtConfirmationDate || '—'} {viewCandidate.cbtConfirmationTime || ''} (Master profile photo untouched)
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Read-Only Photo Display for Confirmed Records in Entry Mode */
                  <div className="p-3 bg-[#FFFCF8] rounded-xl border border-[#E8D9D2] flex items-center gap-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-[#E8D9D2] bg-white shrink-0">
                      {viewCandidate.passportVerificationPhoto || verificationPhoto ? (
                        <img
                          src={viewCandidate.passportVerificationPhoto || verificationPhoto || ''}
                          alt="Official Passport Verification Photo"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#806F6F] text-xs">No Photo</div>
                      )}
                    </div>
                    <div className="text-xs">
                      <span className="font-bold text-[#3F3030] block">Official Passport Verification Photo</span>
                      <span className="text-[11px] text-emerald-700 font-semibold block">
                        Archived under Passport Verification record (Candidate Profile Picture remains untouched)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PRACTICAL ASSESSMENT SECTION: Task Number (1-100), Difficulty, Two Camera Photos (Camera Only, No Upload) */}
            {(isPracticalPendingMode || isPracticalConfirmedMode || isCbtConfirmedMode || viewCandidate.practicalStatus === 'COMPLETED' || viewCandidate.cbtStatus === 'CONFIRMED' || viewCandidate.status === 'CBT_EXAM_CONFIRMED') && (
              <div>
                <ModalSectionTitle title={language === 'ar' ? 'بيانات التقييم العملي والمهام' : 'Practical Assessment & Task Allocation'} />

                {viewCandidate.practicalStatus === 'COMPLETED' ? (
                  /* Confirmed Practical Assessment Record (Read-Only) */
                  <div className="p-4 bg-white rounded-xl border border-emerald-200 shadow-xs space-y-3.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 pb-2 border-b border-emerald-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{language === 'ar' ? 'سجل التقييم العملي المعتمد والمقفل (للقراءة فقط)' : 'Confirmed Practical Assessment Record (Read Only)'}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-2.5 bg-[#FAF8F5] rounded-lg border border-[#E8E4DC]">
                        <span className="text-[#7C756D] block text-[11px] mb-0.5">{language === 'ar' ? 'رقم المهمة' : 'Task Number'}</span>
                        <span className="font-mono font-bold text-[#7A2E3A] text-base">
                          #{viewCandidate.taskNumber || (viewCandidate.assignedTaskId ? viewCandidate.assignedTaskId.replace(/\D/g, '') : '—')}
                        </span>
                      </div>
                      <div className="p-2.5 bg-[#FAF8F5] rounded-lg border border-[#E8E4DC]">
                        <span className="text-[#7C756D] block text-[11px] mb-0.5">{language === 'ar' ? 'مستوى الصعوبة' : 'Difficulty Rate'}</span>
                        {viewCandidate.taskDifficulty ? (
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            viewCandidate.taskDifficulty === 'Hard'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : viewCandidate.taskDifficulty === 'Moderate'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}>
                            {viewCandidate.taskDifficulty}
                          </span>
                        ) : (
                          <span className="text-stone-400 font-medium">{language === 'ar' ? 'غير محدد' : 'Not Specified'}</span>
                        )}
                      </div>
                      <div className="p-2.5 bg-[#FAF8F5] rounded-lg border border-[#E8E4DC]">
                        <span className="text-[#7C756D] block text-[11px] mb-0.5">{language === 'ar' ? 'تاريخ الاعتماد' : 'Confirmation Date'}</span>
                        <span className="font-mono font-semibold text-[#2C2623]">
                          {viewCandidate.practicalConfirmationDate || '—'} {viewCandidate.practicalConfirmationTime || ''}
                        </span>
                      </div>
                      <div className="p-2.5 bg-[#FAF8F5] rounded-lg border border-[#E8E4DC]">
                        <span className="text-[#7C756D] block text-[11px] mb-0.5">{language === 'ar' ? 'المقيّم المعتمد' : 'Assessor'}</span>
                        <span className="font-semibold text-[#2C2623]">
                          {viewCandidate.practicalConfirmedBy || 'Assessor'}
                        </span>
                      </div>
                    </div>

                    {/* Confirmed Photos Preview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Practical Photo 1 */}
                      <div className="p-3 bg-[#FAF8F5] rounded-xl border border-emerald-200 flex items-center gap-3">
                        <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-emerald-400 bg-white shrink-0 shadow-2xs">
                          {viewCandidate.practicalPhoto1 ? (
                            <img src={viewCandidate.practicalPhoto1} alt="Practical Photo 1" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400">No Photo</div>
                          )}
                        </div>
                        <div className="text-xs">
                          <span className="font-bold text-emerald-900 block">{language === 'ar' ? 'الصورة العملية 1 (إلزامية)' : 'Practical Photo 1 (Mandatory)'}</span>
                          <span className="text-[11px] text-emerald-700 font-medium block mt-0.5">
                            {language === 'ar' ? 'ملتقطة بكاميرا المقيّم المباشرة ومحفوظة رسمياً' : 'Captured via live camera • Permanently archived'}
                          </span>
                        </div>
                      </div>

                      {/* Practical Photo 2 */}
                      <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E4DC] flex items-center gap-3">
                        <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-stone-300 bg-white shrink-0 shadow-2xs">
                          {viewCandidate.practicalPhoto2 ? (
                            <img src={viewCandidate.practicalPhoto2} alt="Practical Photo 2" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400 text-center p-1">
                              {language === 'ar' ? 'لم يتم التقاطها (اختيارية)' : 'Not captured (Optional)'}
                            </div>
                          )}
                        </div>
                        <div className="text-xs">
                          <span className="font-bold text-[#3F3030] block">{language === 'ar' ? 'الصورة العملية 2 (اختيارية)' : 'Practical Photo 2 (Optional)'}</span>
                          <span className="text-[11px] text-[#7C756D] font-medium block mt-0.5">
                            {viewCandidate.practicalPhoto2
                              ? (language === 'ar' ? 'ملتقطة بكاميرا المقيّم المباشرة ومحفوظة' : 'Captured via live camera • Archived')
                              : (language === 'ar' ? 'اختيارية — تم إتمام التقييم بدونها' : 'Optional field — not provided')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Active Practical Assessment Data Entry Form */
                  <div className="p-4 bg-[#FFFCF8] rounded-xl border border-[#E8D9D2] space-y-4 shadow-xs">
                    {/* Active Camera Viewfinder for Practical Photo Capture */}
                    {isCameraActive && (activeCameraTarget === 'practical1' || activeCameraTarget === 'practical2') && (
                      <div className="p-3.5 bg-stone-900 rounded-xl space-y-2.5 text-center text-white border-2 border-[#7A2E3A]">
                        <div className="flex items-center justify-between text-xs font-bold text-stone-300 px-1">
                          <span className="flex items-center gap-1.5 text-emerald-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            {activeCameraTarget === 'practical1'
                              ? (language === 'ar' ? 'بث الكاميرا المباشر: الصورة العملية 1 (إلزامية)' : 'Live Camera: Practical Photo 1 (Mandatory)')
                              : (language === 'ar' ? 'بث الكاميرا المباشر: الصورة العملية 2 (اختيارية)' : 'Live Camera: Practical Photo 2 (Optional)')}
                          </span>
                          <span className="text-[11px] font-mono text-stone-400">Camera Only</span>
                        </div>

                        <div className="relative aspect-4/3 max-w-sm mx-auto bg-black rounded-lg overflow-hidden border border-stone-700">
                          <video
                            ref={photoVideoRef}
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-44 h-56 border-2 border-dashed border-white/50 rounded-lg" />
                          </div>
                        </div>

                        <div className="flex justify-center gap-2 pt-1">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={capturePhotoFromCamera}
                            leftIcon={<Camera className="w-3.5 h-3.5" />}
                          >
                            {language === 'ar' ? 'التقاط وحفظ الصورة' : 'Capture Photo'}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={stopPhotoCamera}
                          >
                            {language === 'ar' ? 'إلغاء الكاميرا' : 'Cancel'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {cameraError && (activeCameraTarget === 'practical1' || activeCameraTarget === 'practical2') && (
                      <div className="p-2 rounded-lg bg-amber-50 text-amber-800 text-xs border border-amber-200">
                        {cameraError}
                      </div>
                    )}

                    {/* Task Number (1-100) & Difficulty Level Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Task Number Input (1–100 integer) */}
                      <div>
                        <label className="block text-xs font-bold text-[#3F3030] mb-1">
                          {language === 'ar' ? 'رقم المهمة (Task Number)' : 'Task Number (1–100)'} <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          step={1}
                          value={taskNumber}
                          onChange={e => {
                            const val = e.target.value;
                            setTaskNumber(val);
                            const v = validateTaskNumber(val);
                            setTaskNumberError(v.valid ? null : (v.error || 'Invalid Task Number'));
                          }}
                          placeholder={language === 'ar' ? 'أدخل رقم المهمة بين 1 و 100...' : 'Enter task number (1–100)...'}
                          className={`w-full text-xs sm:text-sm p-2 bg-white border rounded-lg focus:outline-none transition-colors ${
                            taskNumberError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-[#E8D9D2] focus:border-[#7A2E3A]'
                          }`}
                        />
                        {taskNumberError ? (
                          <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>{taskNumberError}</span>
                          </p>
                        ) : (
                          <p className="text-[10px] text-[#7C756D] mt-1">
                            {language === 'ar'
                              ? 'رقم المهمة إلزامي ويجب أن يكون رقماً صحيحاً بين 1 و 100.'
                              : 'Mandatory numeric integer between 1 and 100 before confirmation.'}
                          </p>
                        )}
                      </div>

                      {/* Difficulty Rate / Level Selection (Optional) */}
                      <div>
                        <label className="block text-xs font-bold text-[#3F3030] mb-1">
                          {language === 'ar' ? 'مستوى الصعوبة (Difficulty Rate)' : 'Difficulty Rate / Level'}
                          <span className="text-[11px] font-normal text-stone-500 ms-1">
                            ({language === 'ar' ? 'اختياري' : 'Optional'})
                          </span>
                        </label>
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {(['Hard', 'Moderate', 'Easy'] as const).map(lvl => {
                            const isSelected = practicalDifficulty === lvl;
                            return (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => setPracticalDifficulty(isSelected ? '' : lvl)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                  isSelected
                                    ? lvl === 'Hard'
                                      ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                                      : lvl === 'Moderate'
                                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                      : 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : 'bg-white text-stone-700 border-[#E8D9D2] hover:bg-[#FAF8F5]'
                                }`}
                              >
                                {lvl}
                              </button>
                            );
                          })}
                          {practicalDifficulty && (
                            <button
                              type="button"
                              onClick={() => setPracticalDifficulty('')}
                              className="text-[11px] text-stone-500 hover:text-stone-700 underline ms-1"
                            >
                              {language === 'ar' ? 'إلغاء التحديد' : 'Clear'}
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-[#7C756D] mt-1">
                          {language === 'ar'
                            ? 'يمكن اختيار مستوى الصعوبة أو تركه فارغاً دون منع الاعتماد.'
                            : 'Optional: Select Hard, Moderate, or Easy. Confirmation proceeds either way.'}
                        </p>
                      </div>
                    </div>

                    {/* Two Camera Photo Fields: Photo 1 Mandatory, Photo 2 Optional (Camera Only, NO File Upload) */}
                    <div className="pt-2 border-t border-[#E8D9D2]">
                      <div className="flex items-center justify-between pb-2">
                        <span className="text-xs font-bold text-[#3F3030]">
                          {language === 'ar' ? 'التقاط الصور بالكاميرا المباشرة (الكاميرا فقط — لا يُسمح برفع ملفات)' : 'Practical Photos Capture (Camera Only — No File Uploads)'}
                        </span>
                        <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                          Photo 1: Mandatory • Photo 2: Optional
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* 1. Practical Photo 1 — Mandatory */}
                        <div className="p-3 bg-white rounded-xl border border-[#E8D9D2] flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-[#2C2623] flex items-center gap-1">
                                <span>{language === 'ar' ? 'الصورة العملية 1' : 'Practical Photo 1'}</span>
                                <span className="text-rose-600 font-bold">*</span>
                              </span>
                              {practicalPhoto1 ? (
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  {language === 'ar' ? 'تم الالتقاط' : 'Captured'}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  {language === 'ar' ? 'إلزامية' : 'Mandatory'}
                                </span>
                              )}
                            </div>

                            <div className="w-full aspect-4/3 rounded-lg overflow-hidden border-2 border-dashed border-[#E8D9D2] bg-[#FAF8F5] flex items-center justify-center relative mb-2.5">
                              {practicalPhoto1 ? (
                                <img src={practicalPhoto1} alt="Practical Photo 1" className="w-full h-full object-cover" />
                              ) : (
                                <div className="text-center p-3 text-stone-400">
                                  <Camera className="w-8 h-8 mx-auto mb-1 text-stone-300" />
                                  <span className="text-xs font-semibold block text-stone-600">
                                    {language === 'ar' ? 'الصورة العملية 1 مطلوبة' : 'Practical Photo 1 Required'}
                                  </span>
                                  <span className="text-[10px] text-stone-400 block mt-0.5">
                                    {language === 'ar' ? 'عبر الكاميرا المباشرة حصراً' : 'Live Camera Only'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => startPhotoCameraFor('practical1')}
                              className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#7A2E3A] bg-[#7A2E3A] text-white hover:bg-[#62232E] transition-colors inline-flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>
                                {practicalPhoto1
                                  ? (language === 'ar' ? 'إعادة التقاط بالكاميرا' : 'Retake with Camera')
                                  : (language === 'ar' ? 'التقاط بالكاميرا' : 'Take Photo with Camera')}
                              </span>
                            </button>
                            {practicalPhoto1 && (
                              <button
                                type="button"
                                onClick={() => setPracticalPhoto1(null)}
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors"
                              >
                                {language === 'ar' ? 'إزالة' : 'Remove'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 2. Practical Photo 2 — Optional */}
                        <div className="p-3 bg-white rounded-xl border border-[#E8D9D2] flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-[#2C2623] flex items-center gap-1">
                                <span>{language === 'ar' ? 'الصورة العملية 2' : 'Practical Photo 2'}</span>
                                <span className="text-stone-400 text-[10px] font-normal">({language === 'ar' ? 'اختياري' : 'Optional'})</span>
                              </span>
                              {practicalPhoto2 ? (
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                                  {language === 'ar' ? 'تم الالتقاط' : 'Captured'}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                                  {language === 'ar' ? 'اختيارية' : 'Optional'}
                                </span>
                              )}
                            </div>

                            <div className="w-full aspect-4/3 rounded-lg overflow-hidden border-2 border-dashed border-[#E8D9D2] bg-[#FAF8F5] flex items-center justify-center relative mb-2.5">
                              {practicalPhoto2 ? (
                                <img src={practicalPhoto2} alt="Practical Photo 2" className="w-full h-full object-cover" />
                              ) : (
                                <div className="text-center p-3 text-stone-400">
                                  <Camera className="w-8 h-8 mx-auto mb-1 text-stone-300" />
                                  <span className="text-xs font-semibold block text-stone-600">
                                    {language === 'ar' ? 'الصورة العملية 2 (اختيارية)' : 'Practical Photo 2 (Optional)'}
                                  </span>
                                  <span className="text-[10px] text-stone-400 block mt-0.5">
                                    {language === 'ar' ? 'عبر الكاميرا المباشرة فقط' : 'Live Camera Only'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => startPhotoCameraFor('practical2')}
                              className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 transition-colors inline-flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>
                                {practicalPhoto2
                                  ? (language === 'ar' ? 'إعادة التقاط بالكاميرا' : 'Retake with Camera')
                                  : (language === 'ar' ? 'التقاط بالكاميرا' : 'Take Photo with Camera')}
                              </span>
                            </button>
                            {practicalPhoto2 && (
                              <button
                                type="button"
                                onClick={() => setPracticalPhoto2(null)}
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors"
                              >
                                {language === 'ar' ? 'إزالة' : 'Remove'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ENTRY MODE ONLY: Verify Passport Match Checkbox */}
            {!isExitMode && !isEnrollmentPendingMode && !isEnrollVerifyMode && !isCbtPendingMode && !isCbtConfirmedMode && !isPracticalPendingMode && viewCandidate.supportStaffVerificationStatus !== 'CONFIRMED' ? (
              <div className="p-3.5 bg-[#FFFCF8] rounded-xl border border-[#E8D9D2]">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={passportMatchConfirmed}
                    onChange={e => setPassportMatchConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-[#7A2E3A] border-[#E8D9D2] focus:ring-[#7A2E3A]"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-[#3F3030] block">
                      Verify Passport Match <span className="text-rose-600">*</span>
                    </span>
                    <span className="text-[11px] text-[#806F6F] mt-0.5 block">
                      I confirm that candidate physical passport ({viewCandidate.passportNumber}) matches candidate full name "{viewCandidate.fullNameEn}" and the photograph attached.
                    </span>
                  </div>
                </label>
              </div>
            ) : null}

            {/* ------------------------------------------------------------------ */}
            {/* Completely Removed for Support Staff & Practical Pending          */}
            {/* 'Practical Task Lottery & CBT Telemetry' hidden for Practical Pending */}
            {/* ------------------------------------------------------------------ */}
            {!isSupportStaff && !isCbtPendingMode && !isPracticalPendingMode && !isPracticalConfirmedMode && (
              <div>
                <ModalSectionTitle title={language === 'ar' ? 'القرعة العملية واختبار CBT' : 'Practical Task Lottery & CBT Telemetry'} />
                <div className="grid grid-cols-2 gap-3 p-3 bg-[#FAF8F5] rounded-lg border border-[#E8E4DC] text-xs">
                  <div>
                    <span className="text-[#7C756D] block mb-0.5">{language === 'ar' ? 'المهمة العملية المقترعة' : 'Lottery Practical Task'}</span>
                    <div className="font-semibold text-[#2C2623]">
                      {viewCandidate.assignedTaskId || (language === 'ar' ? 'بانتظار السحب' : 'Pending Allocation')}
                    </div>
                    {viewCandidate.taskDifficulty && (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                        {viewCandidate.taskDifficulty}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[#7C756D] block mb-0.5">{language === 'ar' ? 'المنصة / الورشة' : 'Workstation Bay'}</span>
                    <div className="font-mono font-bold text-[#2C2623]">
                      {viewCandidate.assignedBay || (language === 'ar' ? 'غير معين' : 'Unassigned')}
                    </div>
                    <span className="text-[10px] text-[#7C756D]">
                      {viewCandidate.practicalStatus || 'PENDING'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#7C756D] block mb-0.5">{language === 'ar' ? 'حالة اختبار CBT' : 'CBT Examination'}</span>
                    <div className="font-semibold text-[#2C2623]">
                      {viewCandidate.cbtScore ? `${viewCandidate.cbtScore}% (${viewCandidate.cbtStatus})` : (viewCandidate.cbtStatus || 'PENDING')}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#7C756D] block mb-0.5">{language === 'ar' ? 'النتيجة النهائية' : 'Final Competency Result'}</span>
                    <span className="font-semibold text-[#7A2E3A]">
                      {viewCandidate.resultStatus || 'IN_PROGRESS'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="text-[11px] text-[#7C756D] px-1 font-mono">
              {language === 'ar' ? 'تاريخ التسجيل بالمنظومة:' : 'System Registration:'} {new Date(viewCandidate.registeredAt).toLocaleString()}
            </div>
          </div>
        </Modal>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* Register Candidate Modal (Center Admin)                                */}
      {/* ---------------------------------------------------------------------- */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        maxWidth="lg"
        icon={<UserPlus className="w-6 h-6" />}
        title="Register New Candidate"
        subtitle="Enroll a candidate into the digital assessment registry"
        infoNotice="Candidate data will be synchronized with biometric examination registry."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsAddOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} leftIcon={<Save className="w-4 h-4" />}>
              Enroll Candidate
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <ModalSectionTitle title="Candidate Identification" />
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label="Full Name (English)"
                  required
                  value={formData.fullNameEn}
                  onChange={e => setFormData({ ...formData, fullNameEn: e.target.value })}
                  placeholder="e.g. Tariq Mahmood"
                />
                <Input
                  label="Full Name (Arabic)"
                  dir="rtl"
                  value={formData.fullNameAr}
                  onChange={e => setFormData({ ...formData, fullNameAr: e.target.value })}
                  placeholder="مثال: طارق محمود"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <Input
                  label="Passport Number"
                  required
                  value={formData.passportNumber}
                  onChange={e => setFormData({ ...formData, passportNumber: e.target.value })}
                />
                <Input
                  label="National ID"
                  value={formData.nationalId}
                  onChange={e => setFormData({ ...formData, nationalId: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="pt-1">
            <ModalSectionTitle title="Assessment Scope & Assignment" />
            <div className="space-y-3.5">
              <Select
                label="Target Occupation"
                required
                value={formData.occupation}
                onChange={e => setFormData({ ...formData, occupation: e.target.value })}
                options={[
                  { value: 'Electrical Installation', label: 'Electrical Installation' },
                  { value: 'HVAC Maintenance', label: 'HVAC Maintenance' },
                  { value: 'Welding & Fabrication', label: 'Welding & Fabrication' },
                  { value: 'BMS Automation', label: 'BMS Automation' },
                  { value: 'Plumbing', label: 'Plumbing' },
                  { value: 'Warehouse Worker', label: 'Warehouse Worker' },
                ]}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {isCenterAdmin ? (
                  <div>
                    <label className="block text-xs font-semibold text-[#2C2623] mb-1">
                      {language === 'ar' ? 'المركز المخصص' : 'Assessment Center'}
                    </label>
                    <div className="px-3 py-2 text-sm bg-[#FAF8F5] border border-[#D5D0C7] rounded-lg text-[#5C554E] font-medium">
                      {centers.find(c => c.id === userCenterId)?.nameEn || 'Riyadh Central Technical Hub'}
                    </div>
                  </div>
                ) : (
                  <Select
                    label="Assessment Center"
                    required
                    value={formData.centerId}
                    onChange={e => setFormData({ ...formData, centerId: e.target.value })}
                    options={centers.map(c => ({
                      value: c.id,
                      label: `${c.code} - ${language === 'ar' ? c.nameAr : c.nameEn}`,
                    }))}
                  />
                )}
                <Select
                  label="Candidate Batch"
                  required
                  value={formData.batchId}
                  onChange={e => setFormData({ ...formData, batchId: e.target.value })}
                  options={batches.map(b => ({
                    value: b.id,
                    label: `${b.batchNumber} (${b.occupation})`,
                  }))}
                />
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
