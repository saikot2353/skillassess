import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { 
  SVP_L1_EVALUATION_RUBRIC, 
  SVP_L1_OVERALL_QUESTIONS 
} from '../services/demoData';
import { OcrService } from '../services/ocrService';
import {
  Candidate,
  EvaluationSheet,
  CandidateEvaluationRating,
  Center,
  Batch,
  EvaluationWorkflowStatus,
  OcrExtractedData,
  OcrConfidenceSummary,
  OcrValidationResult
} from '../types';
import {
  FileText,
  Search,
  ScanBarcode,
  Eye,
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Award,
  Save,
  Lock,
  Download,
  CheckSquare,
  X,
  Printer,
  Sparkles,
  Cpu,
  RotateCcw,
  ExternalLink,
  Check,
  Copy,
  FileCheck
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';

interface EvaluationSheetRegisterProps {
  onNavigate?: (path: string) => void;
}

export const EvaluationSheetRegister: React.FC<EvaluationSheetRegisterProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isRTL = language === 'ar';

  const isAssessor = user?.role === 'ASSESSOR';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'COUNTRY_ACCOUNT';
  const isCenterAdmin = user?.role === 'CENTER_ADMIN';
  const userCenterId = user?.centerId;

  // Data State
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [allCenters, setAllCenters] = useState<Center[]>([]);
  const [allBatches, setAllBatches] = useState<Batch[]>([]);
  const [evaluationSheets, setEvaluationSheets] = useState<EvaluationSheet[]>([]);
  const [evaluationRatings, setEvaluationRatings] = useState<CandidateEvaluationRating[]>([]);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Barcode Scanner State
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [simulatedBarcodeInput, setSimulatedBarcodeInput] = useState('');
  const scannerVideoRef = useRef<HTMLVideoElement>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);

  // View / Evaluation Form Modal State
  const [viewCandidate, setViewCandidate] = useState<Candidate | null>(null);
  const [difficulty, setDifficulty] = useState<'Hard' | 'Moderate' | 'Easy'>('Moderate');
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
  const [overallScores, setOverallScores] = useState<Record<string, number>>({});
  const [assessorRemarks, setAssessorRemarks] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [isEvaluationLocked, setIsEvaluationLocked] = useState(false);

  // Evaluation Number & OCR Workflow State
  const [currentEvaluationNumber, setCurrentEvaluationNumber] = useState<string>('');
  const [ocrWorkflowStatus, setOcrWorkflowStatus] = useState<EvaluationWorkflowStatus>('MANUAL_ENTRY');
  const [ocrExtractedData, setOcrExtractedData] = useState<OcrExtractedData | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<OcrConfidenceSummary | null>(null);
  const [ocrValidation, setOcrValidation] = useState<OcrValidationResult | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrProcessingStep, setOcrProcessingStep] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'MANUAL_ENTRY' | 'OCR_REVIEW'>('MANUAL_ENTRY');
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);

  // Evaluation Sheet Upload & Camera Capture State
  const [attachedSheetUrl, setAttachedSheetUrl] = useState<string | null>(null);
  const [attachedSheetName, setAttachedSheetName] = useState<string | null>(null);
  const [attachedSheetType, setAttachedSheetType] = useState<'UPLOAD' | 'CAMERA_PHOTO'>('UPLOAD');
  const [candidateSheets, setCandidateSheets] = useState<EvaluationSheet[]>([]);

  // Camera Viewfinder State for Evaluation Sheet
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const photoVideoRef = useRef<HTMLVideoElement>(null);
  const photoStreamRef = useRef<MediaStream | null>(null);
  const photoCanvasRef = useRef<HTMLCanvasElement>(null);

  // --------------------------------------------------------------------------
  // Data Loading & Candidate Eligibility
  // Practical Status = Confirmed / Verify AND Assigned to Logged-in Assessor
  // --------------------------------------------------------------------------
  const loadData = () => {
    const loadedCandidates = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const loadedCenters = StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []);
    const loadedBatches = StorageService.get<Batch[]>(STORAGE_KEYS.BATCHES, []);
    const loadedSheets = StorageService.get<EvaluationSheet[]>(STORAGE_KEYS.EVALUATION_SHEETS, []);
    const loadedRatings = StorageService.get<CandidateEvaluationRating[]>(STORAGE_KEYS.EVALUATION_RATINGS, []);

    setAllCenters(loadedCenters);
    setAllBatches(loadedBatches);
    setEvaluationSheets(loadedSheets);
    setEvaluationRatings(loadedRatings);

    // CRITICAL: Only Practical Assessment Confirmed candidates appear
    let eligible = loadedCandidates.filter(c => {
      const isPracticalDone = c.practicalStatus === 'COMPLETED' || c.status === 'PRACTICAL_COMPLETED';
      return isPracticalDone;
    });

    // ASSESSOR-WISE CANDIDATE VISIBILITY:
    // When an Assessor logs in, they see ONLY candidates assigned to their Assessor ID / name
    if (isAssessor) {
      eligible = eligible.filter(c => c.assessorId === user?.id || c.assessorName === user?.name);
    } else if (isCenterAdmin && userCenterId) {
      eligible = eligible.filter(c => c.centerId === userCenterId);
    }

    setCandidates(eligible);
  };

  useEffect(() => {
    loadData();
  }, [user?.id, user?.role, userCenterId]);

  // Clean up streams on unmount
  useEffect(() => {
    return () => {
      stopPhotoCamera();
      stopBarcodeCamera();
    };
  }, []);

  // Synchronize photo camera video stream whenever camera is activated
  useEffect(() => {
    if (isCameraActive && photoStreamRef.current && photoVideoRef.current) {
      photoVideoRef.current.srcObject = photoStreamRef.current;
      photoVideoRef.current.play().catch(e => console.warn('Camera play warning:', e));
    }
  }, [isCameraActive]);

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
      console.warn('Scanner camera could not be started:', err.message);
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
    // Barcode search must never bypass the Assessor-specific data restriction
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
      showToast(`Scanned: ${cleanPassport}. Candidate is not eligible or in practical completed roster.`, 'info');
    }
  };

  // --------------------------------------------------------------------------
  // Camera Handlers for Evaluation Sheet Photo Capture
  // --------------------------------------------------------------------------
  const startPhotoCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera device API not supported in this browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
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

  const captureEvaluationSheetPhoto = () => {
    const video = photoVideoRef.current;
    const canvas = photoCanvasRef.current || document.createElement('canvas');
    canvas.width = (video && video.videoWidth > 0) ? video.videoWidth : 800;
    canvas.height = (video && video.videoHeight > 0) ? video.videoHeight : 600;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      if (video && video.videoWidth > 0) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } else {
        // Fallback / simulated camera snapshot
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#7A2E3A';
        ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SVP PRACTICAL EVALUATION SHEET (L1)', canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '16px monospace';
        ctx.fillText(`CANDIDATE: ${viewCandidate?.fullNameEn} (${viewCandidate?.passportNumber})`, canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText(`CAPTURE: ${new Date().toISOString()}`, canvas.width / 2, canvas.height / 2 + 55);
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setAttachedSheetUrl(dataUrl);
      setAttachedSheetName(`SVP_L1_CAMERA_${viewCandidate?.passportNumber}_${Date.now()}.jpg`);
      setAttachedSheetType('CAMERA_PHOTO');
      stopPhotoCamera();
      showToast('Evaluation sheet photo captured via camera!', 'success');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && viewCandidate && user) {
      if (isAssessor && viewCandidate.assessorId !== user.id && viewCandidate.assessorName !== user.name) {
        showToast('Access denied: Candidate is not allocated to your examination roster.', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const fileUrl = reader.result as string;
        setAttachedSheetUrl(fileUrl);
        setAttachedSheetName(file.name);
        setAttachedSheetType('UPLOAD');
        stopPhotoCamera();

        const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type.includes('pdf');
        const evalNum = currentEvaluationNumber || OcrService.getOrGenerateEvaluationNumber(viewCandidate.id, viewCandidate);
        setCurrentEvaluationNumber(evalNum);

        // Store as dedicated EvaluationSheet record immediately so original document is preserved
        const nowIso = new Date().toISOString();
        const todayFormatted = new Date().toLocaleDateString();
        const timeFormatted = new Date().toLocaleTimeString();
        const assessorDisplayName = viewCandidate.assessorName || user.name || user.username || 'Assessor';

        const newSheet: EvaluationSheet = {
          id: `eval-sheet-${viewCandidate.id}-${Date.now()}`,
          candidateId: viewCandidate.id,
          evaluationNumber: evalNum,
          passportNumber: viewCandidate.passportNumber,
          candidateName: viewCandidate.fullNameEn,
          centerId: viewCandidate.centerId,
          assessorId: viewCandidate.assessorId || user.id,
          assessorName: assessorDisplayName,
          batchId: viewCandidate.batchId,
          taskNumber: viewCandidate.taskNumber,
          assignedTaskId: viewCandidate.assignedTaskId,
          evaluationSheetType: 'UPLOAD',
          fileName: file.name,
          fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          fileUrl: fileUrl,
          fileType: isPdf ? 'PDF' : 'IMAGE',
          uploadedAt: nowIso,
          uploadDate: todayFormatted,
          uploadTime: timeFormatted,
          createdBy: assessorDisplayName,
          ocrStatus: isPdf ? 'PDF_UPLOADED' : 'MANUAL_ENTRY'
        };

        const existingSheets = StorageService.get<EvaluationSheet[]>(STORAGE_KEYS.EVALUATION_SHEETS, []);
        const withoutThis = existingSheets.filter(s => s.fileUrl !== fileUrl && s.id !== newSheet.id);
        StorageService.set(STORAGE_KEYS.EVALUATION_SHEETS, [newSheet, ...withoutThis]);
        setCandidateSheets([newSheet, ...withoutThis.filter(s => s.candidateId === viewCandidate.id)]);

        if (isPdf) {
          setOcrWorkflowStatus('PDF_UPLOADED');
          showToast(`Evaluation Sheet PDF uploaded (#${evalNum})! Click "Process with OCR" to extract ratings.`, 'success');
        } else {
          showToast('Evaluation sheet attached successfully!', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // --------------------------------------------------------------------------
  // Process with OCR (Structured Table Recognition & Question Mapping)
  // --------------------------------------------------------------------------
  const handleProcessOcr = async () => {
    if (!viewCandidate || !user || !attachedSheetUrl) return;

    if (isAssessor && viewCandidate.assessorId !== user.id && viewCandidate.assessorName !== user.name) {
      showToast('Access denied: Candidate is not allocated to your examination roster.', 'error');
      return;
    }

    setIsOcrProcessing(true);
    setOcrWorkflowStatus('OCR_PROCESSING');

    // Multi-stage visual processing indicator
    setOcrProcessingStep('1/4: Decompressing PDF streams & analyzing coordinates...');
    await new Promise(r => setTimeout(r, 450));
    setOcrProcessingStep('2/4: Identifying table layout (0-5 Rubric & 0-10 Overall Performance)...');
    await new Promise(r => setTimeout(r, 450));
    setOcrProcessingStep('3/4: Extracting Question Numbers, Statements & Ratings...');
    await new Promise(r => setTimeout(r, 450));
    setOcrProcessingStep('4/4: Cross-validating Candidate Name, Passport # & Assessor...');
    await new Promise(r => setTimeout(r, 350));

    const result = await OcrService.processEvaluationSheetOcr(
      attachedSheetUrl,
      attachedSheetName || 'Evaluation_Sheet.pdf',
      viewCandidate,
      user
    );

    setIsOcrProcessing(false);

    if (result.success) {
      // Update form ratings with extracted values
      setRubricScores(prev => ({ ...prev, ...result.extractedData.rubricRatings }));
      setOverallScores(prev => ({ ...prev, ...result.extractedData.overallRatings }));
      if (result.extractedData.difficulty) {
        setDifficulty(result.extractedData.difficulty);
      }
      setOcrExtractedData(result.extractedData);
      setOcrConfidence(result.confidence);
      setOcrValidation(result.validation);
      setOcrWorkflowStatus('REVIEW_REQUIRED');
      setActiveTab('OCR_REVIEW');

      // Update evaluation sheet record with OCR data
      const existingSheets = StorageService.get<EvaluationSheet[]>(STORAGE_KEYS.EVALUATION_SHEETS, []);
      const updatedSheets = existingSheets.map(s => {
        if (s.candidateId === viewCandidate.id && s.fileUrl === attachedSheetUrl) {
          return {
            ...s,
            ocrStatus: 'REVIEW_REQUIRED' as const,
            ocrRawData: result.rawData,
            ocrExtractedData: result.extractedData,
            ocrConfidence: result.confidence,
            validationResults: result.validation,
            ocrProcessedAt: new Date().toISOString()
          };
        }
        return s;
      });
      StorageService.set(STORAGE_KEYS.EVALUATION_SHEETS, updatedSheets);

      AuditService.log(
        'OCR_PROCESS',
        'CANDIDATE',
        `Structured OCR processed for ${viewCandidate.fullNameEn} (${viewCandidate.passportNumber}) - Evaluation #${result.extractedData.evaluationNumber}. Confidence: ${result.confidence.overallScore}%`,
        viewCandidate.id,
        'SUCCESS'
      );

      showToast('OCR extraction complete! Please review and verify the question-wise ratings below.', 'success');
    } else {
      setOcrWorkflowStatus('OCR_FAILED');
      showToast(result.errorMessage || 'OCR processing failed. You may continue with manual evaluation entry.', 'error');
    }
  };

  // --------------------------------------------------------------------------
  // Open Candidate Evaluation Modal & Load SVP Form L1 Data
  // --------------------------------------------------------------------------
  const handleOpenEvaluationModal = (cand: Candidate) => {
    // Security check: Assessor restriction
    if (isAssessor && cand.assessorId !== user?.id && cand.assessorName !== user?.name) {
      showToast('Access denied: Candidate is not allocated to your examination roster.', 'error');
      return;
    }

    setViewCandidate(cand);
    setDifficulty((cand.taskDifficulty as any) || 'Moderate');

    // Deterministic Evaluation Number
    const evalNum = OcrService.getOrGenerateEvaluationNumber(cand.id, cand);
    setCurrentEvaluationNumber(evalNum);

    // Filter separate evaluation sheets for this candidate
    const existingSheets = StorageService.get<EvaluationSheet[]>(STORAGE_KEYS.EVALUATION_SHEETS, []);
    const candidateExistingSheets = existingSheets.filter(s => s.candidateId === cand.id);
    setCandidateSheets(candidateExistingSheets);

    // Load existing rating if present
    const existingRatings = StorageService.get<CandidateEvaluationRating[]>(STORAGE_KEYS.EVALUATION_RATINGS, []);
    const foundRating = existingRatings.find(r => r.candidateId === cand.id);

    if (foundRating) {
      setRubricScores(foundRating.ratings || {});
      setOverallScores(foundRating.overallRatings || {});
      setAssessorRemarks(foundRating.assessorRemarks || '');
      setAcknowledged(!!foundRating.acknowledged);
      setIsEvaluationLocked(foundRating.status === 'LOCKED');
      if (foundRating.evaluationNumber) {
        setCurrentEvaluationNumber(foundRating.evaluationNumber);
      }
      if (foundRating.ocrExtractedData) {
        setOcrExtractedData(foundRating.ocrExtractedData);
        setOcrWorkflowStatus(foundRating.status === 'LOCKED' ? 'EVALUATION_CONFIRMED' : 'REVIEWED');
        setActiveTab('OCR_REVIEW');
      }

      if (foundRating.evaluationSheetUrl) {
        setAttachedSheetUrl(foundRating.evaluationSheetUrl);
        setAttachedSheetName(foundRating.evaluationSheetName || 'Attached_Evaluation_Sheet');
        setAttachedSheetType(foundRating.evaluationSheetType || 'UPLOAD');
      } else if (candidateExistingSheets.length > 0) {
        setAttachedSheetUrl(candidateExistingSheets[0].fileUrl);
        setAttachedSheetName(candidateExistingSheets[0].fileName);
        setAttachedSheetType(candidateExistingSheets[0].evaluationSheetType || 'UPLOAD');
        if (candidateExistingSheets[0].evaluationNumber) {
          setCurrentEvaluationNumber(candidateExistingSheets[0].evaluationNumber);
        }
        if (candidateExistingSheets[0].ocrExtractedData) {
          setOcrExtractedData(candidateExistingSheets[0].ocrExtractedData);
          setOcrConfidence(candidateExistingSheets[0].ocrConfidence || null);
          setOcrValidation(candidateExistingSheets[0].validationResults || null);
          setOcrWorkflowStatus(candidateExistingSheets[0].ocrStatus || 'REVIEW_REQUIRED');
          setActiveTab('OCR_REVIEW');
        }
      } else {
        setAttachedSheetUrl(null);
        setAttachedSheetName(null);
        setOcrWorkflowStatus('MANUAL_ENTRY');
        setActiveTab('MANUAL_ENTRY');
      }
    } else {
      // Default scores (0-5 rubric: all default to 3 - Satisfactory; overall: all default to 7)
      const defaultRubric: Record<string, number> = {};
      SVP_L1_EVALUATION_RUBRIC.forEach(sec => {
        sec.questions.forEach(q => {
          defaultRubric[q.id] = 3;
        });
      });
      const defaultOverall: Record<string, number> = {};
      SVP_L1_OVERALL_QUESTIONS.forEach(q => {
        defaultOverall[q.id] = 7;
      });

      setRubricScores(defaultRubric);
      setOverallScores(defaultOverall);
      setAssessorRemarks('');
      setAcknowledged(false);
      setIsEvaluationLocked(cand.evaluationStatus === 'COMPLETED');
      setOcrExtractedData(null);
      setOcrConfidence(null);
      setOcrValidation(null);

      if (candidateExistingSheets.length > 0) {
        const topSheet = candidateExistingSheets[0];
        setAttachedSheetUrl(topSheet.fileUrl);
        setAttachedSheetName(topSheet.fileName);
        setAttachedSheetType(topSheet.evaluationSheetType || 'UPLOAD');
        if (topSheet.evaluationNumber) {
          setCurrentEvaluationNumber(topSheet.evaluationNumber);
        }
        if (topSheet.ocrExtractedData) {
          setOcrExtractedData(topSheet.ocrExtractedData);
          setOcrConfidence(topSheet.ocrConfidence || null);
          setOcrValidation(topSheet.validationResults || null);
          setOcrWorkflowStatus(topSheet.ocrStatus || 'REVIEW_REQUIRED');
          setActiveTab('OCR_REVIEW');
          // Apply ratings from sheet
          setRubricScores(prev => ({ ...prev, ...topSheet.ocrExtractedData?.rubricRatings }));
          setOverallScores(prev => ({ ...prev, ...topSheet.ocrExtractedData?.overallRatings }));
          if (topSheet.ocrExtractedData?.difficulty) {
            setDifficulty(topSheet.ocrExtractedData.difficulty);
          }
        } else {
          setOcrWorkflowStatus(topSheet.fileType === 'PDF' ? 'PDF_UPLOADED' : 'MANUAL_ENTRY');
          setActiveTab('MANUAL_ENTRY');
        }
      } else {
        setAttachedSheetUrl(null);
        setAttachedSheetName(null);
        setOcrWorkflowStatus('MANUAL_ENTRY');
        setActiveTab('MANUAL_ENTRY');
      }
    }

    AuditService.log('VIEW', 'CANDIDATE', `Assessor viewed evaluation register dossier for ${cand.fullNameEn} (${cand.passportNumber})`, cand.id);
  };

  // --------------------------------------------------------------------------
  // Save Evaluation & Confirm Evaluation Sheet
  // --------------------------------------------------------------------------
  const handleSaveEvaluation = (shouldLock: boolean = false) => {
    if (!viewCandidate || !user) return;

    if (shouldLock && isEvaluationLocked) {
      showToast('This evaluation has already been certified and locked.', 'info');
      return;
    }

    if (shouldLock && !attachedSheetUrl) {
      showToast('Evaluation sheet (uploaded or camera photo) is mandatory before final confirmation.', 'error');
      return;
    }

    if (shouldLock && !acknowledged) {
      showToast('Please check the Acknowledgment & Commitment checkbox before certifying.', 'error');
      return;
    }

    const nowIso = new Date().toISOString();
    const todayFormatted = new Date().toLocaleDateString();
    const timeFormatted = new Date().toLocaleTimeString();
    const assessorDisplayName = viewCandidate.assessorName || user.name || user.username || 'Assessor';
    const evalNum = currentEvaluationNumber || OcrService.getOrGenerateEvaluationNumber(viewCandidate.id, viewCandidate);

    // 1. Calculate rubric section scores and totals
    let rubricTotalScore = 0;
    let rubricMaxScore = 0;
    const sectionScores: Record<string, { score: number; maxScore: number; percentage: number }> = {};

    SVP_L1_EVALUATION_RUBRIC.forEach((sec, sIdx) => {
      let secScore = 0;
      let secMax = 0;
      sec.questions.forEach((q, qIdx) => {
        const score = rubricScores[q.id] !== undefined 
          ? rubricScores[q.id] 
          : (rubricScores[`sec${sIdx + 1}-q${qIdx + 1}`] !== undefined 
              ? rubricScores[`sec${sIdx + 1}-q${qIdx + 1}`] 
              : 0);
        secScore += score;
        secMax += q.maxScore;
      });
      rubricTotalScore += secScore;
      rubricMaxScore += secMax;
      sectionScores[sec.id] = {
        score: secScore,
        maxScore: secMax,
        percentage: secMax > 0 ? Math.round((secScore / secMax) * 100) : 0
      };
    });

    let overallTotal = 0;
    let overallMax = 0;
    SVP_L1_OVERALL_QUESTIONS.forEach((q, qIdx) => {
      const score = overallScores[q.id] !== undefined 
        ? overallScores[q.id] 
        : (overallScores[`overall-q${qIdx + 1}`] !== undefined 
            ? overallScores[`overall-q${qIdx + 1}`] 
            : 0);
      overallTotal += score;
      overallMax += q.maxScore;
    });

    const combinedScore = rubricTotalScore + overallTotal;
    const combinedMax = rubricMaxScore + overallMax;
    const totalPercentage = combinedMax > 0 ? Math.round((combinedScore / combinedMax) * 100) : 0;

    // 2. Separate Evaluation Sheet Storage
    // Never overwrites profile photo, CBT photo, or practical photos
    let updatedSheetRecord: EvaluationSheet | null = null;
    if (attachedSheetUrl) {
      updatedSheetRecord = {
        id: `eval-sheet-${viewCandidate.id}-${Date.now()}`,
        candidateId: viewCandidate.id,
        evaluationNumber: evalNum,
        passportNumber: viewCandidate.passportNumber,
        candidateName: viewCandidate.fullNameEn,
        centerId: viewCandidate.centerId,
        assessorId: viewCandidate.assessorId || user.id,
        assessorName: assessorDisplayName,
        batchId: viewCandidate.batchId,
        taskNumber: viewCandidate.taskNumber,
        assignedTaskId: viewCandidate.assignedTaskId,
        evaluationSheetType: attachedSheetType,
        fileName: attachedSheetName || (attachedSheetType === 'CAMERA_PHOTO' ? 'Camera_Evaluation_Sheet.jpg' : 'Uploaded_Evaluation_Sheet.pdf'),
        fileSize: attachedSheetType === 'CAMERA_PHOTO' ? '1.2 MB' : '850 KB',
        fileUrl: attachedSheetUrl,
        fileType: attachedSheetName?.toLowerCase().endsWith('.pdf') ? 'PDF' : 'IMAGE',
        uploadedAt: nowIso,
        uploadDate: todayFormatted,
        uploadTime: timeFormatted,
        createdBy: assessorDisplayName,
        ocrStatus: shouldLock ? 'EVALUATION_CONFIRMED' : (ocrWorkflowStatus === 'MANUAL_ENTRY' ? 'MANUAL_ENTRY' : 'REVIEWED'),
        ocrRawData: ocrExtractedData ? JSON.stringify(ocrExtractedData) : undefined,
        ocrExtractedData: ocrExtractedData || undefined,
        ocrConfidence: ocrConfidence || undefined,
        validationResults: ocrValidation || undefined,
        finalReviewedData: {
          rubricScores,
          overallScores,
          difficulty,
          assessorRemarks,
          combinedScore,
          combinedMax,
          totalPercentage
        },
        confirmedAt: shouldLock ? nowIso : undefined,
        lastUpdatedBy: assessorDisplayName
      };

      const existingSheets = StorageService.get<EvaluationSheet[]>(STORAGE_KEYS.EVALUATION_SHEETS, []);
      const withoutThis = existingSheets.filter(s => s.fileUrl !== attachedSheetUrl);
      StorageService.set(STORAGE_KEYS.EVALUATION_SHEETS, [updatedSheetRecord, ...withoutThis]);
    }

    // 3. Save CandidateEvaluationRating record
    const existingRatings = StorageService.get<CandidateEvaluationRating[]>(STORAGE_KEYS.EVALUATION_RATINGS, []);
    const newRating: CandidateEvaluationRating = {
      id: `rating-${viewCandidate.id}-${Date.now()}`,
      candidateId: viewCandidate.id,
      evaluationNumber: evalNum,
      candidateName: viewCandidate.fullNameEn,
      passportNumber: viewCandidate.passportNumber,
      assessorId: viewCandidate.assessorId || user.id,
      assessorName: assessorDisplayName,
      assessorIdNumber: user.id,
      centerId: viewCandidate.centerId,
      batchId: viewCandidate.batchId,
      taskId: viewCandidate.assignedTaskId,
      taskNumber: viewCandidate.taskNumber,
      taskTitle: viewCandidate.assignedTaskTitle || 'Practical Task Assessment',
      difficulty: difficulty,
      ratings: rubricScores,
      overallRatings: overallScores,
      sectionScores: sectionScores,
      totalScore: combinedScore,
      totalMaxScore: combinedMax,
      totalPercentage: totalPercentage,
      evaluationSheetUrl: attachedSheetUrl || undefined,
      evaluationSheetName: attachedSheetName || undefined,
      evaluationSheetType: attachedSheetType,
      evaluationSheetUploadedAt: nowIso,
      assessorRemarks: assessorRemarks.trim() || undefined,
      acknowledged: acknowledged,
      signatureDate: todayFormatted,
      status: shouldLock ? 'LOCKED' : 'DRAFT',
      ocrStatus: shouldLock ? 'EVALUATION_CONFIRMED' : ocrWorkflowStatus,
      ocrConfidence: ocrConfidence?.overallScore,
      ocrExtractedData: ocrExtractedData || undefined,
      finalReviewedData: {
        rubricScores,
        overallScores,
        difficulty,
        totalScore: combinedScore,
        totalPercentage
      },
      submittedAt: shouldLock ? nowIso : undefined,
      lockedAt: shouldLock ? nowIso : undefined
    };

    const filteredRatings = existingRatings.filter(r => r.candidateId !== viewCandidate.id);
    StorageService.set(STORAGE_KEYS.EVALUATION_RATINGS, [newRating, ...filteredRatings]);

    // 4. Update Candidate in-place
    const updatedCandidate: Candidate = {
      ...viewCandidate,
      evaluationStatus: shouldLock ? 'COMPLETED' : 'IN_PROGRESS',
      taskDifficulty: difficulty as any,
    };
    StorageService.updateItem(STORAGE_KEYS.CANDIDATES, updatedCandidate);

    if (shouldLock) {
      setIsEvaluationLocked(true);
      setOcrWorkflowStatus('EVALUATION_CONFIRMED');
    }

    // 5. Audit Logging
    AuditService.log(
      shouldLock ? 'SUBMIT_EVALUATION' : 'UPDATE',
      'CANDIDATE',
      `${shouldLock ? 'Evaluation Sheet & SVP L1 Rubric certified and locked' : 'Evaluation draft saved'} for ${viewCandidate.fullNameEn} (${viewCandidate.passportNumber}) - Evaluation #${evalNum} by Assessor ${assessorDisplayName}. Score: ${combinedScore}/${combinedMax} (${totalPercentage}%).`,
      viewCandidate.id,
      'SUCCESS'
    );

    showToast(
      shouldLock 
        ? `Evaluation certified & permanently locked (#${evalNum})! Status: Evaluation Confirmed.` 
        : `Evaluation draft saved successfully (#${evalNum}).`,
      'success'
    );

    if (shouldLock) {
      setIsEvaluationLocked(true);
      setViewCandidate(null);
    }

    loadData();
  };

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  const getCenterName = (candidate: Candidate) => {
    const batch = allBatches.find(b => b.id === candidate.batchId);
    const centerId = batch?.centerId || candidate.centerId;
    const center = allCenters.find(c => c.id === centerId);
    if (!center) return centerId || 'Assessment Center';
    return isRTL ? center.nameAr : center.nameEn;
  };

  // Filtered & Paginated Candidates
  const filteredCandidates = candidates.filter(c => {
    const cleanSearch = searchTerm.trim().toUpperCase();
    const matchesSearch = cleanSearch === '' ||
      c.passportNumber.toUpperCase().includes(cleanSearch) ||
      c.fullNameEn.toUpperCase().includes(cleanSearch) ||
      c.fullNameAr.includes(cleanSearch) ||
      c.aproReference.toUpperCase().includes(cleanSearch);

    const matchesStatus = 
      statusFilter === 'ALL' ? true :
      statusFilter === 'COMPLETED' ? c.evaluationStatus === 'COMPLETED' :
      c.evaluationStatus !== 'COMPLETED';

    return matchesSearch && matchesStatus;
  });

  const paginatedCandidates = filteredCandidates.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredCandidates.length / pageSize) || 1;

  // Counts
  const totalConfirmed = candidates.length;
  const totalEvaluationCompleted = candidates.filter(c => c.evaluationStatus === 'COMPLETED').length;
  const totalEvaluationPending = totalConfirmed - totalEvaluationCompleted;
  const totalUploadedSheets = evaluationSheets.filter(s => candidates.some(c => c.id === s.candidateId)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={isRTL ? 'سجل نماذج التقييم' : 'Evaluation Sheet Register'}
        subtitle={
          isRTL
            ? 'إدارة نماذج التقييم العملي المعتمدة للمرشحين وإدخال الدرجات وفق نموذج التحقق المهني (SVP L1) للمقيم المعتمد حصراً'
            : 'Manage practical assessment evaluation sheets, file attachments, live camera captures, and SVP L1 manual rubric evaluations for assigned candidates.'
        }
        breadcrumbs={[
          { label: isRTL ? 'الرئيسية' : 'Home', href: '/dashboard' },
          { label: isRTL ? 'التقييم العملي' : 'Practical Assessment', href: '/assessor/practical-confirmed' },
          { label: isRTL ? 'سجل نماذج التقييم' : 'Evaluation Sheet Register' }
        ]}
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-[#E8D9D2] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#806F6F]">
              {isRTL ? 'المرشحون المكتمل تقييمهم العملي' : 'Practical Confirmed Candidates'}
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#2C2623]">{totalConfirmed}</div>
          <span className="text-[11px] text-emerald-700 font-medium">Eligible for evaluation</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-[#E8D9D2] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#806F6F]">
              {isRTL ? 'بانتظار إدخال التقييم' : 'Evaluation Pending'}
            </span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900">{totalEvaluationPending}</div>
          <span className="text-[11px] text-amber-700 font-medium">Sheets or ratings required</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-[#E8D9D2] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#806F6F]">
              {isRTL ? 'التقييمات المعتمدة والمقفلة' : 'Evaluations Certified'}
            </span>
            <ShieldCheck className="w-5 h-5 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-900">{totalEvaluationCompleted}</div>
          <span className="text-[11px] text-purple-700 font-medium">SVP L1 forms certified</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-[#E8D9D2] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#806F6F]">
              {isRTL ? 'النماذج الورقية المؤرشفة' : 'Archived Evaluation Sheets'}
            </span>
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-900">{totalUploadedSheets}</div>
          <span className="text-[11px] text-blue-700 font-medium">Attached files & camera photos</span>
        </div>
      </div>

      {/* Roster & Search Controls */}
      <div className="p-4 bg-white rounded-xl border border-[#E8D9D2] shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Inputs */}
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={isRTL ? 'البحث برقم الجواز أو الاسم...' : 'Search by Passport Number or Name...'}
                className="w-full ps-9 pe-3 py-2 text-xs bg-[#FAF8F5] border border-[#E8E4DC] rounded-lg focus:outline-none focus:border-[#7A2E3A]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Passport Barcode Scanner Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenBarcodeScanner}
              leftIcon={<ScanBarcode className="w-4 h-4 text-[#7A2E3A]" />}
              className="shrink-0"
            >
              {isRTL ? 'مسح الباركود' : 'Barcode Scan'}
            </Button>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-lg border border-[#E8E4DC] text-xs self-stretch sm:self-auto justify-center">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded font-semibold transition-colors ${
                statusFilter === 'ALL' ? 'bg-[#7A2E3A] text-white shadow-2xs' : 'text-stone-600 hover:bg-white'
              }`}
            >
              {isRTL ? 'الكل' : 'All'} ({candidates.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1 rounded font-semibold transition-colors ${
                statusFilter === 'PENDING' ? 'bg-[#7A2E3A] text-white shadow-2xs' : 'text-stone-600 hover:bg-white'
              }`}
            >
              {isRTL ? 'بانتظار التقييم' : 'Pending'} ({totalEvaluationPending})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3 py-1 rounded font-semibold transition-colors ${
                statusFilter === 'COMPLETED' ? 'bg-[#7A2E3A] text-white shadow-2xs' : 'text-stone-600 hover:bg-white'
              }`}
            >
              {isRTL ? 'المعتمد' : 'Certified'} ({totalEvaluationCompleted})
            </button>
          </div>
        </div>

        {/* Candidate Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-[#FAF8F5] text-stone-600">
                <th className="p-3 text-start font-semibold">{isRTL ? 'المرشح' : 'Candidate'}</th>
                <th className="p-3 text-start font-semibold">{isRTL ? 'رقم التقييم' : 'Evaluation #'}</th>
                <th className="p-3 text-start font-semibold">{isRTL ? 'رقم الجواز والبطاقة' : 'Passport & Ticket'}</th>
                <th className="p-3 text-start font-semibold">{isRTL ? 'المهمة والصعوبة' : 'Task & Difficulty'}</th>
                <th className="p-3 text-start font-semibold">{isRTL ? 'التقييم العملي' : 'Practical Confirmed'}</th>
                <th className="p-3 text-start font-semibold">{isRTL ? 'حالة التقييم' : 'Evaluation Status'}</th>
                <th className="p-3 text-start font-semibold">{isRTL ? 'النموذج ومسار OCR' : 'Evaluation Sheet & OCR'}</th>
                <th className="p-3 text-end font-semibold">{isRTL ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {paginatedCandidates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-stone-500">
                    <AlertTriangle className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                    <p className="font-semibold text-sm">
                      {isRTL ? 'لا يوجد مرشحون مؤهلون في سجل التقييم' : 'No eligible candidates found in Evaluation Sheet Register'}
                    </p>
                    <p className="text-xs text-stone-400 mt-1">
                      {isRTL 
                        ? 'يظهر هنا فقط المرشحون الذين تم تأكيد تقييمهم العملي والمسندون للمقيم الحالي.'
                        : 'Only candidates with completed practical assessment assigned to your examination roster appear here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedCandidates.map(c => {
                  const hasSheet = evaluationSheets.some(s => s.candidateId === c.id);
                  const sheetRecord = evaluationSheets.find(s => s.candidateId === c.id);
                  const isEvaluated = c.evaluationStatus === 'COMPLETED';
                  const evalNumber = sheetRecord?.evaluationNumber || OcrService.getOrGenerateEvaluationNumber(c.id, c);

                  return (
                    <tr key={c.id} className="hover:bg-[#FAF8F5] transition-colors">
                      {/* Candidate Name & Avatar */}
                      <td className="p-3">
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
                              {isRTL ? c.fullNameAr : c.fullNameEn}
                            </span>
                            <span className="text-[11px] text-stone-500 font-mono">
                              {c.occupation}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Evaluation Number */}
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-[#7A2E3A] bg-[#7A2E3A]/5 px-2 py-0.5 rounded border border-[#7A2E3A]/20">
                            <FileCheck className="w-3 h-3 text-[#7A2E3A]" />
                            {evalNumber}
                          </span>
                        </div>
                      </td>

                      {/* Passport & Ticket # */}
                      <td className="p-3">
                        <span className="font-mono font-bold text-[#7A2E3A] block">
                          {c.passportNumber}
                        </span>
                        <span className="text-[11px] text-stone-500 font-mono">
                          Ticket: {c.applicationNumber || c.aproReference || c.id}
                        </span>
                      </td>

                      {/* Task # & Difficulty */}
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 text-xs font-bold font-mono text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          Task #{c.taskNumber || (c.assignedTaskId ? c.assignedTaskId.replace(/\D/g, '') : '—')}
                        </span>
                        {c.taskDifficulty && (
                          <span className="text-[10px] text-stone-600 block mt-0.5 font-medium">
                            {c.taskDifficulty}
                          </span>
                        )}
                      </td>

                      {/* Practical Confirmation */}
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Practical Confirmed
                        </span>
                        <span className="text-[10px] text-stone-500 block mt-0.5 font-mono">
                          {c.practicalConfirmationDate ? `${c.practicalConfirmationDate} • ` : ''}{c.practicalConfirmationTime || ''}
                        </span>
                      </td>

                      {/* Evaluation Status */}
                      <td className="p-3">
                        {isEvaluated ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                            <ShieldCheck className="w-3 h-3 text-purple-600" />
                            Evaluation Certified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pending Evaluation
                          </span>
                        )}
                      </td>

                      {/* Evaluation Sheet & OCR Presence */}
                      <td className="p-3">
                        {hasSheet ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {sheetRecord?.fileType === 'PDF' ? (
                                <>
                                  <FileText className="w-3 h-3 text-rose-600" />
                                  PDF Document
                                </>
                              ) : sheetRecord?.evaluationSheetType === 'CAMERA_PHOTO' ? (
                                <>
                                  <Camera className="w-3 h-3 text-blue-600" />
                                  Camera Photo
                                </>
                              ) : (
                                <>
                                  <FileText className="w-3 h-3 text-blue-600" />
                                  Attached Sheet
                                </>
                              )}
                            </span>
                            {sheetRecord?.ocrStatus === 'REVIEW_REQUIRED' && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 block w-fit">
                                <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                                OCR Extracted
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-stone-400 font-medium">
                            {isRTL ? 'لم يتم الرفع' : 'No Sheet'}
                          </span>
                        )}
                      </td>

                      {/* View Action */}
                      <td className="p-3 text-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEvaluationModal(c)}
                          leftIcon={<Eye className="w-3.5 h-3.5 text-[#7A2E3A]" />}
                        >
                          {isRTL ? 'عرض وتوثيق' : 'View'}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-stone-100 text-xs text-stone-500">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredCandidates.length)} of {filteredCandidates.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="px-2 font-mono">{currentPage} / {totalPages}</span>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* View Modal — SVP Practical Assessment Form (L1)                         */}
      {/* ---------------------------------------------------------------------- */}
      {viewCandidate && (
        <Modal
          isOpen={!!viewCandidate}
          onClose={() => {
            stopPhotoCamera();
            setViewCandidate(null);
          }}
          maxWidth="2xl"
          icon={<FileText className="w-6 h-6 text-[#7A2E3A]" />}
          title={
            <div className="flex items-center justify-between gap-3 w-full">
              <span>
                {isRTL 
                  ? 'برنامج التحقق المهني (SVP) - نموذج التقييم العملي (L1)'
                  : 'Skills Verification Program (SVP) - Practical Assessment Form (L1)'}
              </span>
              {isEvaluationLocked ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  Certified & Locked
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  <Award className="w-3.5 h-3.5 text-blue-600" />
                  Evaluation In Progress
                </span>
              )}
            </div>
          }
          subtitle={`Passport: ${viewCandidate.passportNumber} • Practical Task #${viewCandidate.taskNumber || viewCandidate.assignedTaskId} • Assessor: ${viewCandidate.assessorName || user?.name}`}
          footer={
            <div className="flex items-center justify-between w-full">
              {isEvaluationLocked ? (
                <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    Certified and permanently locked under ISO 17024 regulations (Read Only).
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSaveEvaluation(true)}
                    disabled={!attachedSheetUrl || !acknowledged}
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  >
                    {isRTL ? 'اعتماد وقفل التقييم' : 'Confirm Evaluation & Lock'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSaveEvaluation(false)}
                    leftIcon={<Save className="w-3.5 h-3.5" />}
                  >
                    {isRTL ? 'حفظ كمسودة' : 'Save Draft'}
                  </Button>
                </div>
              )}

              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  stopPhotoCamera();
                  setViewCandidate(null);
                }}
                className="ms-auto"
              >
                {t.common.close}
              </Button>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Hidden canvas for camera snapshot capture */}
            <canvas ref={photoCanvasRef} className="hidden" />

            {/* ------------------------------------------------------------------ */}
            {/* Evaluation Number Badge & Workflow Telemetry                        */}
            {/* ------------------------------------------------------------------ */}
            <div className="p-3.5 bg-gradient-to-r from-[#7A2E3A]/10 via-[#7A2E3A]/5 to-transparent rounded-xl border border-[#7A2E3A]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#7A2E3A] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold block">Official Evaluation Number</span>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-mono font-bold text-[#7A2E3A]">{currentEvaluationNumber}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(currentEvaluationNumber);
                        showToast(`Copied ${currentEvaluationNumber} to clipboard`, 'info');
                      }}
                      className="text-stone-400 hover:text-[#7A2E3A] p-0.5"
                      title="Copy Evaluation Number"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {ocrWorkflowStatus === 'EVALUATION_CONFIRMED' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Evaluation Confirmed & Locked
                  </span>
                )}
                {ocrWorkflowStatus === 'REVIEW_REQUIRED' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    OCR Completed — Review Required
                  </span>
                )}
                {ocrWorkflowStatus === 'PDF_UPLOADED' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-100 px-3 py-1 rounded-full border border-blue-300 shadow-2xs">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    PDF Uploaded — Ready for OCR
                  </span>
                )}
                {ocrWorkflowStatus === 'MANUAL_ENTRY' && !isEvaluationLocked && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-700 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
                    Manual Evaluation Entry
                  </span>
                )}
              </div>
            </div>

            {/* ------------------------------------------------------------------ */}
            {/* 1. Header Information (SVP Form L1 Layout)                         */}
            {/* ------------------------------------------------------------------ */}
            <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#E8E4DC] space-y-3">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <span className="font-bold text-xs text-[#7A2E3A] uppercase tracking-wider">
                  {isRTL ? 'بيانات التقييم ورأس النموذج' : 'Assessment Form Header Information'}
                </span>
                <span className="text-[10px] font-mono text-stone-500">Official SVP L1 Template</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[#7C756D] block text-[11px] mb-0.5">Test Center Name:</span>
                  <span className="font-semibold text-[#2C2623] block">{getCenterName(viewCandidate)}</span>
                </div>
                <div>
                  <span className="text-[#7C756D] block text-[11px] mb-0.5">Date:</span>
                  <span className="font-semibold text-[#2C2623] block">{new Date().toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-[#7C756D] block text-[11px] mb-0.5">Occupation Name:</span>
                  <span className="font-semibold text-[#2C2623] block">{viewCandidate.occupation}</span>
                </div>
                <div>
                  <span className="text-[#7C756D] block text-[11px] mb-0.5">Candidate Name:</span>
                  <span className="font-semibold text-[#2C2623] block">{isRTL ? viewCandidate.fullNameAr : viewCandidate.fullNameEn}</span>
                </div>

                <div>
                  <span className="text-[#7C756D] block text-[11px] mb-0.5">Ticket #:</span>
                  <span className="font-mono font-semibold text-[#2C2623] block">{viewCandidate.applicationNumber || viewCandidate.aproReference || viewCandidate.id}</span>
                </div>
                <div>
                  <span className="text-[#7C756D] block text-[11px] mb-0.5">Passport #:</span>
                  <span className="font-mono font-bold text-[#7A2E3A] block">{viewCandidate.passportNumber}</span>
                </div>
                <div>
                  <span className="text-[#7C756D] block text-[11px] mb-0.5">Practical Task #:</span>
                  <span className="font-mono font-bold text-purple-900 block">#{viewCandidate.taskNumber || (viewCandidate.assignedTaskId ? viewCandidate.assignedTaskId.replace(/\D/g, '') : '—')}</span>
                </div>
                <div>
                  <span className="text-[#7C756D] block text-[11px] mb-0.5">Candidate Signature:</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Verified & Confirmed
                  </span>
                </div>
              </div>

              {/* Difficulty Rate/Level Selector */}
              <div className="pt-2 border-t border-stone-200 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-4">
                  <span className="font-bold text-[#3F3030]">Difficulty Rate/Level:</span>
                  <div className="flex items-center gap-3">
                    {(['Hard', 'Moderate', 'Easy'] as const).map(d => (
                      <label key={d} className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold">
                        <input
                          type="radio"
                          name="difficulty"
                          value={d}
                          disabled={isEvaluationLocked}
                          checked={difficulty === d}
                          onChange={() => setDifficulty(d)}
                          className="text-[#7A2E3A] focus:ring-[#7A2E3A]"
                        />
                        <span>{d}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {ocrExtractedData?.difficulty && (
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    OCR Detected: {ocrExtractedData.difficulty}
                  </span>
                )}
              </div>
            </div>

            {/* ------------------------------------------------------------------ */}
            {/* 2. Evaluation Sheet — Upload PDF & Process with OCR / Camera        */}
            {/* ------------------------------------------------------------------ */}
            <div className="p-4 bg-white rounded-xl border border-[#E8D9D2] space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <div>
                  <h4 className="font-bold text-xs text-[#2C2623] flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#7A2E3A]" />
                    <span>{isRTL ? 'إرفاق نموذج التقييم ومعالجة OCR التلقائية' : 'Evaluation Sheet PDF Upload & OCR Processing'}</span>
                  </h4>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    {isRTL 
                      ? 'قم برفع ملف PDF المكتمل ليقوم النظام باستخراج الدرجات تلقائياً وفق نموذج SVP L1 ومطابقتها مع بيانات المرشح.'
                      : 'Upload completed Practical Assessment PDF to trigger structured table OCR extraction and automatic evaluation mapping.'}
                  </p>
                </div>
                {attachedSheetUrl ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Sheet Stored (# {currentEvaluationNumber})
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    Mandatory
                  </span>
                )}
              </div>

              {/* Action Buttons Toolbar */}
              {!isEvaluationLocked && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: PDF Document Upload */}
                  <label className="p-3.5 rounded-lg border-2 border-dashed border-[#E8D9D2] hover:border-[#7A2E3A] bg-[#FAF8F5] flex items-center gap-3 cursor-pointer transition-colors group">
                    <div className="w-10 h-10 rounded-lg bg-white border border-[#E8D9D2] flex items-center justify-center text-stone-600 group-hover:text-[#7A2E3A] shrink-0 shadow-2xs">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-xs min-w-0">
                      <span className="font-bold text-[#2C2623] block">Option 1 — Upload Evaluation Sheet PDF</span>
                      <span className="text-[10px] text-stone-500 block truncate">Upload completed Practical Assessment PDF for OCR processing</span>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,application/pdf,image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Option 2: Live Camera Capture */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isCameraActive) {
                        stopPhotoCamera();
                      } else {
                        startPhotoCamera();
                      }
                    }}
                    className="p-3.5 rounded-lg border-2 border-dashed border-[#E8D9D2] hover:border-[#7A2E3A] bg-[#FAF8F5] flex items-center gap-3 cursor-pointer transition-colors text-start group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white border border-[#E8D9D2] flex items-center justify-center text-stone-600 group-hover:text-[#7A2E3A] shrink-0 shadow-2xs">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div className="text-xs min-w-0">
                      <span className="font-bold text-[#2C2623] block">Option 2 — Take Photo with Camera</span>
                      <span className="text-[10px] text-stone-500 block truncate">Capture physical evaluation sheet photo via live camera</span>
                    </div>
                  </button>
                </div>
              )}

              {/* Camera Viewfinder (when active) */}
              {isCameraActive && (
                <div className="p-3.5 bg-stone-900 rounded-xl space-y-2.5 text-center text-white border-2 border-[#7A2E3A]">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-300 px-1">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Live Camera Viewfinder: Evaluation Sheet
                    </span>
                    <span className="text-[11px] font-mono text-stone-400">Document Mode</span>
                  </div>

                  {cameraError ? (
                    <div className="p-3 rounded-lg bg-amber-900/60 border border-amber-500/50 text-amber-200 text-xs text-start space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Camera notice: {cameraError}</span>
                      </div>
                      <p className="text-[11px] text-amber-300/90">
                        Camera simulation active. Click "Capture Photo" below to generate the evaluation sheet image.
                      </p>
                    </div>
                  ) : (
                    <div className="relative aspect-4/3 max-w-sm mx-auto bg-black rounded-lg overflow-hidden border border-stone-700">
                      <video
                        ref={photoVideoRef}
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-4 pointer-events-none border-2 border-dashed border-white/60 rounded-lg flex items-center justify-center">
                        <span className="text-[11px] font-mono text-white/70 bg-black/40 px-2 py-0.5 rounded">Align sheet within frame</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center gap-2 pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={captureEvaluationSheetPhoto}
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

              {/* Active Evaluation Sheet Card & OCR Action Bar */}
              {attachedSheetUrl && !isCameraActive && (
                <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#E8E4DC] space-y-3 shadow-2xs">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-stone-300 bg-white shrink-0 flex items-center justify-center shadow-2xs">
                        {attachedSheetName?.toLowerCase().endsWith('.pdf') ? (
                          <FileText className="w-7 h-7 text-rose-600" />
                        ) : (
                          <img src={attachedSheetUrl} alt="Evaluation Sheet" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="text-xs min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#2C2623] truncate max-w-xs sm:max-w-sm">{attachedSheetName}</span>
                          <span className="text-[10px] font-mono bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded font-bold">
                            {attachedSheetName?.toLowerCase().endsWith('.pdf') ? 'PDF' : 'IMAGE'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-500 font-mono">
                          <span>Evaluation #{currentEvaluationNumber}</span>
                          <span>•</span>
                          <span>Archived in dedicated storage</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Process with OCR + View/Download */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* PROCESS WITH OCR BUTTON */}
                      {!isEvaluationLocked && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleProcessOcr}
                          disabled={isOcrProcessing}
                          leftIcon={<Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                          className="bg-gradient-to-r from-[#7A2E3A] to-[#993A49] text-white hover:opacity-95 shadow-xs"
                        >
                          {isOcrProcessing ? 'Processing OCR...' : 'Process with OCR'}
                        </Button>
                      )}

                      {/* Download / View Button */}
                      <a
                        href={attachedSheetUrl}
                        download={attachedSheetName || 'Evaluation_Sheet'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 transition-colors inline-flex items-center gap-1.5 text-xs font-semibold shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </a>

                      {!isEvaluationLocked && (
                        <button
                          type="button"
                          onClick={() => {
                            setAttachedSheetUrl(null);
                            setAttachedSheetName(null);
                            setOcrExtractedData(null);
                            setOcrValidation(null);
                            setOcrWorkflowStatus('MANUAL_ENTRY');
                            setActiveTab('MANUAL_ENTRY');
                          }}
                          className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 rounded hover:bg-rose-50"
                        >
                          Replace
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Animated OCR Processing State */}
                  {isOcrProcessing && (
                    <div className="p-3.5 bg-stone-900 rounded-lg text-white space-y-2 border border-stone-700">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-amber-400 animate-spin" />
                          <span className="font-bold text-amber-300">Processing Evaluation Sheet with Structured OCR</span>
                        </div>
                        <span className="text-[10px] font-mono text-stone-400">Layout Table Analysis</span>
                      </div>
                      <div className="w-full bg-stone-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-400 h-full animate-pulse w-3/4 rounded-full" />
                      </div>
                      <p className="text-[11px] font-mono text-stone-300">{ocrProcessingStep}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ------------------------------------------------------------------ */}
            {/* OCR Data Validation Banner (When OCR is completed / reviewed)      */}
            {/* ------------------------------------------------------------------ */}
            {ocrValidation && (
              <div className="p-4 bg-white rounded-xl border border-[#E8D9D2] space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-stone-100 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-xs text-[#2C2623]">
                        {isRTL ? 'مطابقة بيانات المستند مع سجلات النظام (OCR Validation)' : 'Candidate & Assessor Data Validation'}
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        Comparing extracted PDF values against existing roster assignment
                      </p>
                    </div>
                  </div>
                  {ocrConfidence && (
                    <div className="text-end">
                      <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        OCR Confidence: {ocrConfidence.overallScore}% ({ocrConfidence.overallRating})
                      </span>
                    </div>
                  )}
                </div>

                {/* Validation Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {ocrValidation.badges.map((badge, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        badge.status === 'SUCCESS'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : badge.status === 'WARNING'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      {badge.status === 'SUCCESS' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      {badge.status === 'WARNING' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                      <span>{badge.label}</span>
                      {badge.detail && <span className="opacity-75 font-normal">({badge.detail})</span>}
                    </span>
                  ))}
                </div>

                {/* Mismatch Warnings if any */}
                {ocrValidation.warnings.length > 0 && (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-1">
                    <span className="font-bold block">Validation Notice:</span>
                    <ul className="list-disc ps-5 space-y-0.5 text-[11px]">
                      {ocrValidation.warnings.map((w, wIdx) => (
                        <li key={wIdx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------------ */}
            {/* 3. Manual Evaluation Sheet Entry — SVP Practical Form (L1)         */}
            {/* ------------------------------------------------------------------ */}
            <div className="space-y-4">
              {/* Calculate live combined total marks */}
              {(() => {
                let liveRubric = 0;
                let liveRubricMax = 0;
                SVP_L1_EVALUATION_RUBRIC.forEach((sec, sIdx) => {
                  sec.questions.forEach((q, qIdx) => {
                    const score = rubricScores[q.id] !== undefined 
                      ? rubricScores[q.id] 
                      : (rubricScores[`sec${sIdx + 1}-q${qIdx + 1}`] !== undefined 
                          ? rubricScores[`sec${sIdx + 1}-q${qIdx + 1}`] 
                          : 3);
                    liveRubric += score;
                    liveRubricMax += q.maxScore;
                  });
                });
                let liveOverall = 0;
                let liveOverallMax = 0;
                SVP_L1_OVERALL_QUESTIONS.forEach((q, qIdx) => {
                  const score = overallScores[q.id] !== undefined 
                    ? overallScores[q.id] 
                    : (overallScores[`overall-q${qIdx + 1}`] !== undefined 
                        ? overallScores[`overall-q${qIdx + 1}`] 
                        : 7);
                  liveOverall += score;
                  liveOverallMax += q.maxScore;
                });
                const liveTotal = liveRubric + liveOverall;
                const liveMax = liveRubricMax + liveOverallMax;
                const livePct = liveMax > 0 ? Math.round((liveTotal / liveMax) * 100) : 0;

                return (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-[#7A2E3A] uppercase tracking-wider">
                          {isRTL ? 'التقييم العملي اليدوي (معايير نموذج التحقق L1)' : 'Manual Evaluation Sheet Entry (SVP Form L1)'}
                        </h4>
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                          Total Score: {liveTotal} / {liveMax} ({livePct}%)
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {isRTL ? 'حدد أو عدّل درجات التقييم لكل معيار بناءً على درجات OCR المستخرجة أو التقييم الفعلي.' : 'Review and adjust ratings populated automatically from OCR or manual evaluation.'}
                      </p>
                    </div>
                    <div className="text-[11px] font-mono font-semibold text-[#7A2E3A] bg-[#F8ECEE] px-2.5 py-1 rounded border border-[#7A2E3A]/20">
                      0 = Not Performed • 1 = Poor • 2 = Below Avg • 3 = Satisfactory • 4 = Good • 5 = Excellent
                    </div>
                  </div>
                );
              })()}

              {/* Rubric Sections (0-5 Scale) */}
              {SVP_L1_EVALUATION_RUBRIC.map((section, sIndex) => (
                <div key={section.id} className="border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
                  {/* Section Title Header */}
                  <div className="bg-[#FAF8F5] px-3.5 py-2 border-b border-stone-200 flex items-center justify-between">
                    <span className="font-bold text-xs text-[#2C2623]">
                      {sIndex + 1}. {isRTL ? section.titleAr : section.titleEn}
                    </span>
                    <span className="text-[10px] font-mono text-stone-500">Scale: 0–5</span>
                  </div>

                  {/* Statement Table */}
                  <table className="w-full text-xs text-start">
                    <thead>
                      <tr className="bg-stone-50/70 border-b border-stone-200 text-stone-500 text-[11px]">
                        <th className="p-2.5 text-center w-12 font-mono">#</th>
                        <th className="p-2.5 text-start font-semibold">Statement</th>
                        <th className="p-2.5 text-center w-48 font-semibold">Rating (0–5)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {section.questions.map((q, qIndex) => {
                        const currentScore = rubricScores[q.id] !== undefined 
                          ? rubricScores[q.id] 
                          : (rubricScores[`sec${sIndex + 1}-q${qIndex + 1}`] !== undefined 
                              ? rubricScores[`sec${sIndex + 1}-q${qIndex + 1}`] 
                              : 3);
                        const ocrScore = ocrExtractedData?.rubricRatings 
                          ? (ocrExtractedData.rubricRatings[q.id] ?? ocrExtractedData.rubricRatings[`sec${sIndex + 1}-q${qIndex + 1}`] ?? ocrExtractedData.rubricRatings[q.code]) 
                          : undefined;

                        return (
                          <tr key={q.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                            <td className="p-2.5 text-center font-bold font-mono text-[#7A2E3A]">
                              {q.code || `Q${qIndex + 1}`}
                            </td>
                            <td className="p-2.5 text-[#3F3030] leading-relaxed">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <span>{isRTL ? q.textAr : q.textEn}</span>
                                {ocrScore !== undefined && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0 self-start sm:self-center">
                                    <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                    OCR Extracted: {ocrScore}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2.5 text-center">
                              <div className="inline-flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-lg border border-stone-200">
                                {[0, 1, 2, 3, 4, 5].map(val => (
                                  <button
                                    key={val}
                                    type="button"
                                    disabled={isEvaluationLocked}
                                    onClick={() => setRubricScores(prev => ({ 
                                      ...prev, 
                                      [q.id]: val,
                                      [`sec${sIndex + 1}-q${qIndex + 1}`]: val 
                                    }))}
                                    className={`w-6 h-6 rounded text-xs font-bold font-mono transition-colors ${
                                      currentScore === val
                                        ? 'bg-[#7A2E3A] text-white shadow-xs'
                                        : 'text-stone-600 hover:bg-stone-200'
                                    }`}
                                    title={`${val} points`}
                                  >
                                    {val}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}

              {/* ------------------------------------------------------------------ */}
              {/* 4. Overall Performance Evaluation (0–10 Scale)                     */}
              {/* ------------------------------------------------------------------ */}
              <div className="border border-purple-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-purple-50/80 px-3.5 py-2 border-b border-purple-200 flex items-center justify-between">
                  <span className="font-bold text-xs text-purple-900">
                    5. Overall Performance Evaluation
                  </span>
                  <span className="text-[10px] font-mono text-purple-700 font-semibold">Scale: 0 (Lowest) to 10 (Highest)</span>
                </div>

                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 text-[11px]">
                      <th className="p-2.5 text-center w-12 font-mono">#</th>
                      <th className="p-2.5 text-start font-semibold">Statement</th>
                      <th className="p-2.5 text-center w-72 font-semibold">Rating (0–10: Lowest → Highest)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {SVP_L1_OVERALL_QUESTIONS.map((q, qIndex) => {
                      const currentVal = overallScores[q.id] !== undefined 
                        ? overallScores[q.id] 
                        : (overallScores[`overall-q${qIndex + 1}`] !== undefined 
                            ? overallScores[`overall-q${qIndex + 1}`] 
                            : 7);
                      const ocrOverallVal = ocrExtractedData?.overallRatings 
                        ? (ocrExtractedData.overallRatings[q.id] ?? ocrExtractedData.overallRatings[`overall-q${qIndex + 1}`] ?? ocrExtractedData.overallRatings[q.code]) 
                        : undefined;

                      return (
                        <tr key={q.id} className="hover:bg-purple-50/30 transition-colors">
                          <td className="p-2.5 text-center font-bold font-mono text-purple-900">
                            {q.code || `Q${qIndex + 1}`}
                          </td>
                          <td className="p-2.5 text-[#3F3030] leading-relaxed">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <span>{isRTL ? q.textAr : q.textEn}</span>
                              {ocrOverallVal !== undefined && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 shrink-0 self-start sm:self-center">
                                  <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                                  OCR Extracted: {ocrOverallVal}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 text-center">
                            <div className="inline-flex items-center gap-0.5 bg-stone-100 p-1 rounded-lg border border-stone-200">
                              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                                <button
                                  key={val}
                                  type="button"
                                  disabled={isEvaluationLocked}
                                  onClick={() => setOverallScores(prev => ({ 
                                    ...prev, 
                                    [q.id]: val,
                                    [`overall-q${qIndex + 1}`]: val 
                                  }))}
                                  className={`w-5 h-6 rounded text-[11px] font-bold font-mono transition-colors ${
                                    currentVal === val
                                      ? 'bg-purple-800 text-white shadow-xs'
                                      : 'text-stone-600 hover:bg-stone-200'
                                  }`}
                                  title={`${val} / 10`}
                                >
                                  {val}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Remarks textarea */}
              <div>
                <label className="block text-xs font-bold text-[#3F3030] mb-1">
                  Assessor Evaluation Remarks & Observations:
                </label>
                <textarea
                  rows={2}
                  disabled={isEvaluationLocked}
                  value={assessorRemarks}
                  onChange={e => setAssessorRemarks(e.target.value)}
                  placeholder="Record notable candidate competencies, safety adherence, or technical remarks..."
                  className="w-full text-xs p-2.5 bg-white border border-[#E8D9D2] rounded-lg focus:outline-none focus:border-[#7A2E3A]"
                />
              </div>

              {/* ------------------------------------------------------------------ */}
              {/* 5. Acknowledgment & Commitment Declaration                         */}
              {/* ------------------------------------------------------------------ */}
              <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-2.5">
                <h5 className="font-bold text-xs text-amber-900">
                  Acknowledgment and Commitment
                </h5>
                <p className="text-xs text-amber-900/90 leading-relaxed italic">
                  "I'm the undersigned, hereby affirm that I undertake full responsibility for the accuracy of the information provided on this Practical Assessment form. I acknowledge that I shall be held legally responsible if any of the aforementioned information is found to be incorrect or misleading."
                </p>
                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={isEvaluationLocked}
                    checked={acknowledged}
                    onChange={e => setAcknowledged(e.target.checked)}
                    className="w-4 h-4 text-[#7A2E3A] rounded border-amber-300 focus:ring-[#7A2E3A]"
                  />
                  <span className="text-xs font-bold text-amber-950">
                    I confirm and legally affirm the accuracy of this practical assessment evaluation.
                  </span>
                </label>
              </div>

              {/* ------------------------------------------------------------------ */}
              {/* 6. Assessor Information (Locked to assigned/logged-in assessor)    */}
              {/* ------------------------------------------------------------------ */}
              <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E8E4DC]">
                <span className="font-bold text-xs text-[#2C2623] block mb-2">Assessor Information</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[#7C756D] block text-[11px]">Name:</span>
                    <span className="font-bold text-[#7A2E3A]">{viewCandidate.assessorName || user?.name}</span>
                  </div>
                  <div>
                    <span className="text-[#7C756D] block text-[11px]">ID Number:</span>
                    <span className="font-mono font-semibold text-[#2C2623]">{viewCandidate.assessorId || user?.id}</span>
                  </div>
                  <div>
                    <span className="text-[#7C756D] block text-[11px]">Signature:</span>
                    <span className="font-mono text-emerald-700 font-bold">
                      {isEvaluationLocked ? '✓ Digitally Signed & Certified' : 'Pending Certification'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* Barcode Scanner Modal                                                  */}
      {/* ---------------------------------------------------------------------- */}
      {isBarcodeScannerOpen && (
        <Modal
          isOpen={isBarcodeScannerOpen}
          onClose={handleCloseBarcodeScanner}
          maxWidth="md"
          icon={<ScanBarcode className="w-6 h-6 text-[#7A2E3A]" />}
          title={isRTL ? 'مسح باركود جواز السفر' : 'Scan Passport Barcode'}
          subtitle="Scan physical barcode or simulate passport scan to search roster"
        >
          <div className="space-y-4">
            <div className="relative aspect-4/3 max-w-sm mx-auto bg-black rounded-xl overflow-hidden border-2 border-[#7A2E3A]">
              <video
                ref={scannerVideoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-20 border-2 border-red-500/80 bg-red-500/10 rounded-lg flex items-center justify-center">
                <div className="w-full h-0.5 bg-red-500 animate-pulse" />
              </div>
            </div>

            {/* Quick Passport Search Simulation */}
            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E4DC] space-y-2">
              <label className="block text-xs font-bold text-[#3F3030]">
                Quick Barcode / Passport Simulator:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={simulatedBarcodeInput}
                  onChange={e => setSimulatedBarcodeInput(e.target.value)}
                  placeholder="e.g. SA4490182 or SA3389104"
                  className="flex-1 text-xs p-2 bg-white border border-[#E8D9D2] rounded-lg focus:outline-none focus:border-[#7A2E3A] font-mono uppercase"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleApplyBarcodeScan(simulatedBarcodeInput)}
                  disabled={!simulatedBarcodeInput.trim()}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
