import React, { useState, useEffect, useRef } from 'react';
import { 
  Eye, Plus, Search, Filter, UserCheck, UserPlus, Save, User, Camera, 
  Lock, CheckCircle2, AlertTriangle, ScanBarcode, Clock, X, RefreshCw,
  Upload, ShieldCheck, CheckSquare, Square, LogOut, ArrowRightLeft
} from 'lucide-react';
import { Candidate, Center, Batch, PassportVerificationRecord, CandidateExitRecord } from '../types';
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
  mode?: 'entry' | 'exit';
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
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  const userCenterId = user?.centerId || 'ctr-sa-1';
  const userCountryId = user?.countryId || 'cnt-sa';
  const isCountryAccount = user?.role === 'COUNTRY_ACCOUNT';
  const isCenterAdmin = user?.role === 'CENTER_ADMIN';
  const isSupportStaff = user?.role === 'SUPPORT_STAFF';
  const isCenterScoped = isCenterAdmin || isSupportStaff;

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

    // Dynamic Candidate Eligibility for Exit List:
    // Only candidates whose entry has already been verified & confirmed appear in Exit List!
    if (isExitMode) {
      filtered = filtered.filter(c => c.supportStaffVerificationStatus === 'CONFIRMED' || c.passportMatchConfirmed === true);
    }

    setCandidates(filtered);
    setCenters(filteredCenters);
    setBatches(filteredBatches);
  };

  useEffect(() => {
    loadData();
  }, [userCenterId, userCountryId, isCenterScoped, isCountryAccount, isExitMode]);

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
      setVerificationPhoto(viewCandidate.passportVerificationPhoto || null);
      setPassportMatchConfirmed(!!viewCandidate.passportMatchConfirmed);
      setExitMatchConfirmed(viewCandidate.exitStatus === 'CONFIRMED');
      setExitNotes(viewCandidate.exitNotes || '');
      setIsCameraActive(false);
      setCameraError(null);
    } else {
      stopPhotoCamera();
      setVerificationPhoto(null);
      setPassportMatchConfirmed(false);
      setExitMatchConfirmed(false);
      setExitNotes('');
    }
  }, [viewCandidate]);

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
    if (!photoVideoRef.current || !photoCanvasRef.current) return;
    const video = photoVideoRef.current;
    const canvas = photoCanvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setVerificationPhoto(dataUrl);
      stopPhotoCamera();
      showToast('Candidate photo captured successfully!', 'success');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setVerificationPhoto(reader.result as string);
        stopPhotoCamera();
        showToast('Photo uploaded successfully!', 'info');
      };
      reader.readAsDataURL(file);
    }
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
  // Dynamic Columns: Exit Mode vs Entry Verification Mode
  // --------------------------------------------------------------------------
  const columns: Column<Candidate>[] = isExitMode ? [
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
          <span className="text-[11px] text-[#7C756D] font-mono">
            {c.aproReference}
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
              {c.supportStaffConfirmationTime}
            </span>
          )}
        </div>
      ),
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
          <span className="text-[11px] text-[#7C756D] font-mono">
            {c.aproReference}
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
          isExitMode
            ? (language === 'ar' ? 'قائمة خروج المرشحين والتحقق' : 'Support Staff — Candidate Exit List & Verification')
            : (language === 'ar' ? 'قائمة المرشحين والتحقق من الجواز' : 'Support Staff — Candidate List & Verification')
        }
        subtitle={
          isExitMode
            ? (language === 'ar' ? 'مراجعة المرشحين المؤكدين عند الدخول، التحقق من الجواز، وتأكيد مغادرة المركز' : 'Review entry-confirmed candidates, verify physical passport, and confirm candidate exit from the assessment center.')
            : (language === 'ar' ? 'البحث بالباركود، التحقق من مطابقة الجواز، التقاط الصور الإلزامية، وتأكيد الحضور' : 'Scan passport barcodes, verify physical identity match, capture candidate photos, and confirm verification.')
        }
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { 
            label: isExitMode 
              ? (language === 'ar' ? 'قائمة خروج المرشحين' : 'Candidate Exit List') 
              : (language === 'ar' ? 'المرشحون' : 'Candidates') 
          },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {isExitMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate?.('/candidates')}
                leftIcon={<UserCheck className="w-4 h-4" />}
              >
                {language === 'ar' ? 'قائمة التحقق عند الدخول' : 'Entry Candidate List'}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate?.('/candidate-exit-list')}
                leftIcon={<LogOut className="w-4 h-4" />}
              >
                {language === 'ar' ? 'قائمة خروج المرشحين' : 'Candidate Exit List'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate?.('/candidate-photos')}
              leftIcon={<Camera className="w-4 h-4" />}
            >
              {language === 'ar' ? 'معرض الصور' : 'Photo Gallery'}
            </Button>
            {!isExitMode && isCenterAdmin && (
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
              isExitMode
                ? (language === 'ar' ? 'بحث برقم الجواز أو الباركود لخروج المرشح...' : 'Search passport barcode or manual number for exit...')
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
            {isExitMode ? (
              <>
                <option value="ALL">{language === 'ar' ? 'جميع المرشحين المؤهلين للخروج' : 'All Eligible Candidates'}</option>
                <option value="PENDING">{language === 'ar' ? 'بانتظار تأكيد الخروج' : 'Awaiting Exit'}</option>
                <option value="CONFIRMED">{language === 'ar' ? 'تم تأكيد الخروج ومغلق' : 'Exit Confirmed'}</option>
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
          icon={isExitMode ? <LogOut className="w-6 h-6 text-[#7A2E3A]" /> : <User className="w-6 h-6 text-[#7A2E3A]" />}
          title={
            <div className="flex items-center justify-between gap-3 w-full">
              <span>{language === 'ar' ? viewCandidate.fullNameAr : viewCandidate.fullNameEn}</span>
              {isExitMode ? (
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
          subtitle={`Passport: ${viewCandidate.passportNumber} • APRO Reference: ${viewCandidate.aproReference}`}
          footer={
            <div className="flex items-center justify-between w-full">
              {isExitMode ? (
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

            {/* Entry Confirmation Banner for Entry Mode */}
            {!isExitMode && viewCandidate.supportStaffVerificationStatus === 'CONFIRMED' ? (
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

            {/* EXIT MODE: Entry Verification Record Audit Summary */}
            {isExitMode && (
              <div>
                <ModalSectionTitle title={language === 'ar' ? 'سجل التحقق عند الدخول' : 'Official Entry Verification Record'} />
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
                      <div>Staff: <strong>{viewCandidate.supportStaffVerifiedBy || 'Support Staff'}</strong></div>
                    </div>
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

            {/* ENTRY MODE ONLY: Candidate Photo Verification & Verify Passport Match */}
            {!isExitMode && (
              <div>
                <div className="flex items-center justify-between pb-1.5">
                  <ModalSectionTitle title="Candidate Photo Verification (Mandatory)" />
                  {verificationPhoto ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Photo Attached
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      Photo Required
                    </span>
                  )}
                </div>

                {viewCandidate.supportStaffVerificationStatus !== 'CONFIRMED' ? (
                  <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E8E4DC] space-y-3">
                    {/* Camera Video Stream Preview */}
                    {isCameraActive && (
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
                            Capture Photo
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={stopPhotoCamera}
                          >
                            Cancel Camera
                          </Button>
                        </div>
                      </div>
                    )}

                    {cameraError && (
                      <div className="p-2 rounded-lg bg-amber-50 text-amber-800 text-[11px] border border-amber-200">
                        Notice: {cameraError} (You can use existing photo or upload photo below)
                      </div>
                    )}

                    {/* Active Verification Photo Preview */}
                    {verificationPhoto && !isCameraActive && (
                      <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#E8D9D2] shadow-xs">
                        <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-[#7A2E3A]/40 bg-[#FAF8F5] shrink-0">
                          <img src={verificationPhoto} alt="Verification Photo" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-[#2C2623]">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Passport Verification Photo Attached</span>
                          </div>
                          <p className="text-[11px] text-[#7C756D] mt-0.5 leading-relaxed">
                            Will be archived under candidate's <strong>Passport Verification record</strong>. Candidate's Profile Picture remains untouched.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setVerificationPhoto(null)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 rounded hover:bg-rose-50 transition-colors shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    {/* Photo Options Toolbar */}
                    {!isCameraActive && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {/* Existing Photo Option */}
                        {viewCandidate.photoUrl && (
                          <button
                            type="button"
                            onClick={() => setVerificationPhoto(viewCandidate.photoUrl || null)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                              verificationPhoto === viewCandidate.photoUrl
                                ? 'bg-[#7A2E3A] text-white border-[#7A2E3A]'
                                : 'bg-white text-[#3F3030] border-[#E8D9D2] hover:bg-[#F8ECEE]'
                            }`}
                          >
                            Use Existing Profile Photo
                          </button>
                        )}

                        {/* Camera Capture Option */}
                        <button
                          type="button"
                          onClick={startPhotoCamera}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E8D9D2] bg-white text-[#7A2E3A] hover:bg-[#7A2E3A] hover:text-white transition-colors inline-flex items-center gap-1.5"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Take Photo with Camera</span>
                        </button>

                        {/* File Upload Fallback */}
                        <label className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E8D9D2] bg-white text-[#806F6F] hover:bg-[#FAF8F5] cursor-pointer inline-flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Verification Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}

                    <canvas ref={photoCanvasRef} className="hidden" />

                    {/* Validation Error Warning if photo is missing */}
                    {!verificationPhoto && (
                      <div className="p-2 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Candidate verification photo is required before confirmation.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Read-Only Photo Display for Confirmed Records */
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

            {/* ENTRY MODE ONLY: Verify Passport Match Checkbox */}
            {!isExitMode && viewCandidate.supportStaffVerificationStatus !== 'CONFIRMED' ? (
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
            {/* Requirement 3: Completely Removed for Support Staff                */}
            {/* 'Practical Task Lottery & CBT Telemetry' is hidden for SUPPORT_STAFF */}
            {/* ------------------------------------------------------------------ */}
            {!isSupportStaff && (
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
                  label="APRO Reference"
                  required
                  value={formData.aproReference}
                  onChange={e => setFormData({ ...formData, aproReference: e.target.value })}
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
