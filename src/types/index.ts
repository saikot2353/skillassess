export type Role = 
  | 'SUPER_ADMIN' 
  | 'COUNTRY_ACCOUNT' 
  | 'CENTER_ADMIN' 
  | 'ASSESSOR' 
  | 'SUPPORT_STAFF';

export type Language = 'en' | 'ar';

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  role: Role;
  countryId?: string; // For Country Account or lower
  centerId?: string;  // For Center Admin, Assessor, Support Staff
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
  lastLogin?: string;
  assignedAssessmentsCount?: number;
  assignedFunction?: string;
  occupation?: string;
}

export interface Country {
  id: string;
  nameEn: string;
  nameAr: string;
  code: string; // e.g. "SA", "AE", "BD"
  flagEmoji: string;
  region: string;
  status: 'ACTIVE' | 'INACTIVE';
  totalCenters: number;
  contactPerson: string;
  contactEmail: string;
  createdAt: string;
}

export interface Center {
  id: string;
  code: string; // e.g. "CTR-SA-001"
  nameEn: string;
  nameAr: string;
  countryId: string;
  city: string;
  address: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING_AUDIT';
  capacity: number;
  occupationsSupported: string[];
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
}

export interface Schedule {
  id: string;
  code: string;
  centerId: string;
  countryId: string;
  occupation: string;
  date: string;
  timeSlot: string;
  startTime?: string;
  endTime?: string;
  totalSeats: number;
  assignedCandidates: number;
  assessorCount?: number;
  assessorId?: string;
  status: 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  createdAt: string;
}

export interface Batch {
  id: string;
  batchNumber: string; // e.g. "BATCH-2026-081"
  batchName?: string;
  code?: string;
  name?: string;
  sessionId?: string;
  centerId: string;
  occupation: string;
  candidateCapacity?: number;
  candidateCount: number;
  startDate: string;
  endDate?: string;
  startTime?: string;
  startDateTime?: string;
  assessmentDate?: string;
  assessmentTime?: string;
  status: 'DRAFT' | 'READY' | 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'PENDING';
  assessorIds?: string[];
}

export type CandidateAssessmentStatus = 
  | 'REGISTERED' 
  | 'SCHEDULED' 
  | 'ASSIGNED'
  | 'ENROLLED'
  | 'BIOMETRICS_VERIFIED'
  | 'VERIFIED'
  | 'IN_ASSESSMENT'
  | 'IN_PROGRESS'
  | 'PRACTICAL_COMPLETED'
  | 'EVALUATION_PENDING'
  | 'EVALUATED' 
  | 'ASSESSMENT_COMPLETED'
  | 'RESULT_PENDING'
  | 'SUBMITTED'
  | 'LOCKED'
  | 'COMPLETED' 
  | 'ABSENT';

export interface EvidenceItem {
  id: string;
  type: 'WORKPIECE_PHOTO' | 'SAFETY_CHECK' | 'TOOL_SETUP' | 'VIDEO_CLIP' | 'DOCUMENT';
  title: string;
  uploadedAt: string;
  uploadedBy: string;
  status: 'NOT_UPLOADED' | 'UPLOADED' | 'VERIFIED' | 'APPROVED' | 'REJECTED';
  fileUrl?: string;
  url?: string;
  notes?: string;
}

export interface CandidatePhoto {
  candidateId: string;
  candidateName: string;
  passportNumber: string;
  photoUrl: string;
  capturedAt: string;
  capturedBy: string;
  verified: boolean;
}

export interface PassportVerificationRecord {
  id?: string;
  passportNumber: string;
  candidateId: string;
  candidateName: string;
  verificationPhoto: string;
  status: 'CONFIRMED' | 'PENDING';
  confirmedDate: string;
  confirmedTime: string;
  confirmedAt: string;
  confirmedBy: string;
  passportMatchConfirmed: boolean;
}

export interface CandidateExitRecord {
  id?: string;
  candidateId: string;
  candidateName: string;
  passportNumber: string;
  status: 'CONFIRMED' | 'PENDING';
  exitDate: string;
  exitTime: string;
  exitAt: string;
  exitBy: string;
  notes?: string;
}

export interface Reservation {
  id: string;
  reservationId: string;
  testTakerName?: string;
  candidateName: string;
  project?: string;
  idNo?: string;
  passportNumber: string;
  cprNumber?: string;
  bookingNo?: string;
  occupation: string;
  status: 'VALID' | 'CANCELLED' | 'PRELOADED' | 'ENROLLED' | 'INVALID' | 'Reserved' | 'CONFIRMED' | string;
  attachment?: string;
  centerId: string;
  batchId?: string;
  countryId: string;
  notes?: string;
  importedAt: string;
  assessorId?: string;
  assessorName?: string;
}

export type IDCardStatus = 'NOT_REQUESTED' | 'REQUESTED' | 'APPROVED' | 'GENERATED';

export interface Candidate {
  id: string;
  fullNameEn: string;
  fullNameAr: string;
  testTakerName?: string;
  project?: string;
  idNo?: string;
  bookingNo?: string;
  cprNumber?: string;
  attachment?: string;
  passportNumber: string;
  aproReference: string; // e.g. "APRO-SA-92812"
  nationalId?: string;
  occupation: string;
  countryId: string;
  centerId: string;
  batchId: string;
  scheduleId?: string;
  reservationId?: string;
  enrollmentStatus?: 'NOT_ENROLLED' | 'ENROLLED' | 'REJECTED';
  photoUrl?: string;
  cbtStatus?: 'NOT_STARTED' | 'VERIFIED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  cbtStartTime?: string;
  cbtEndTime?: string;
  cbtScore?: number;
  practicalStatus?: 'NOT_STARTED' | 'TASK_ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
  assignedTaskId?: string;
  assignedTaskCode?: string;
  assignedTaskTitle?: string;
  taskDifficulty?: TaskDifficulty;
  taskAssignedAt?: string;
  assessorId?: string;
  assessorName?: string;
  assessorLotteryStatus?: 'HIDDEN' | 'RELEASED';
  evidenceStatus?: 'NOT_UPLOADED' | 'UPLOADED' | 'VERIFIED';
  evidenceItems?: EvidenceItem[];
  evaluationStatus?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  status: CandidateAssessmentStatus;
  resultStatus?: 'PASS' | 'FAIL' | 'PENDING';
  resultLocked?: boolean;
  assignedBay?: string;
  applicationNumber?: string;
  registeredAt: string;
  enrolledAt?: string;
  preloadStatus?: 'PRELOADED' | 'NOT_PRELOADED';
  idCardStatus?: IDCardStatus;
  idCardNumber?: string;
  idCardGeneratedAt?: string;
  supportStaffVerificationStatus?: 'PENDING' | 'CONFIRMED';
  supportStaffVerifiedAt?: string;
  supportStaffConfirmationDate?: string;
  supportStaffConfirmationTime?: string;
  supportStaffVerifiedBy?: string;
  passportMatchConfirmed?: boolean;
  passportVerificationPhoto?: string;
  passportVerificationRecord?: PassportVerificationRecord;
  exitStatus?: 'PENDING' | 'CONFIRMED';
  exitVerifiedAt?: string;
  exitConfirmationDate?: string;
  exitConfirmationTime?: string;
  exitVerifiedBy?: string;
  exitNotes?: string;
  exitRecord?: CandidateExitRecord;
}

export type TaskDifficulty = 'FOUNDATIONAL' | 'INTERMEDIATE' | 'ADVANCED';

export interface PracticalTask {
  id: string;
  code: string;
  titleEn: string;
  titleAr: string;
  occupation: string;
  difficulty: TaskDifficulty;
  practicalWork: string;
  toolsAndEquipment: string[];
  situation: string;
  steps: string[];
  maxScore: number;
  passingScore: number;
  durationMinutes: number;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface Worksheet {
  id: string;
  code: string;
  title: string;
  occupation: string;
  taskId: string;
  fileName: string;
  fileSize: string;
  uploadedBy: string;
  uploadedAt: string;
  version: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface TaskAllocation {
  id: string;
  candidateId: string;
  candidateName: string;
  aproReference: string;
  occupation: string;
  taskId: string;
  taskCode: string;
  taskTitle: string;
  difficulty: TaskDifficulty;
  assignedDate: string;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface AssessorLotteryPairing {
  candidateId: string;
  candidateName: string;
  aproReference: string;
  assessorId: string;
  assessorName: string;
  stationNumber?: number | string;
}

export interface AssessorLottery {
  id: string;
  batchId?: string;
  scheduleId?: string;
  scheduleCode?: string;
  scheduledDate?: string;
  countryId?: string;
  centerId: string;
  centerName?: string;
  occupation?: string;
  candidateCount?: number;
  totalCandidates?: number;
  eligibleAssessorCount?: number;
  allocationStatus?: 'PENDING' | 'GENERATED';
  releaseStatus: 'HIDDEN' | 'RELEASED';
  status?: 'GENERATED' | 'RELEASED' | 'PENDING' | 'CONFIRMED' | 'DRAFT';
  releaseTime?: string;
  releaseScheduledTime?: string;
  generatedAt?: string;
  createdAt?: string;
  algorithmVersion?: string;
  pairings: AssessorLotteryPairing[];
}

export interface TaskLotteryBay {
  bayNumber: number;
  candidateName?: string;
  workstation?: string;
  taskId?: string;
  taskCode?: string;
  taskTitle: string;
}

export interface TaskLottery {
  id: string;
  candidateId?: string;
  candidateName?: string;
  aproReference?: string;
  occupation?: string;
  taskPoolId?: string;
  assignedTaskId?: string;
  taskTitle?: string;
  difficulty?: TaskDifficulty;
  allocationTime?: string;
  status: 'GENERATED' | 'CONFIRMED';
  centerId?: string;
  centerName?: string;
  scheduledDate?: string;
  algorithmVersion?: string;
  bayAllocations?: TaskLotteryBay[];
  createdAt?: string;
}

export type AssessmentPipelineStatus = 
  | 'SCHEDULED' 
  | 'ENROLLED' 
  | 'CBT_COMPLETED' 
  | 'PRACTICAL_IN_PROGRESS' 
  | 'EVALUATION_PENDING' 
  | 'RESULT_SUBMITTED' 
  | 'LOCKED';

export interface Assessment {
  id: string;
  candidateId: string;
  candidateName?: string;
  centerId: string;
  countryId?: string;
  assessorId: string;
  assessorName?: string;
  scheduleId: string;
  occupation: string;
  date: string;
  theoryScore?: number;
  practicalScore?: number;
  totalScore?: number;
  status: AssessmentPipelineStatus | 'SUBMITTED' | 'VERIFIED' | 'IN_PROGRESS';
  evaluatedAt?: string;
}

export interface ResultCorrection {
  originalScore: number;
  updatedScore: number;
  originalGrade: string;
  updatedGrade: string;
  reason: string;
  changedBy: string;
  changedAt: string;
}

export interface Result {
  id: string;
  assessmentId: string;
  candidateId: string;
  candidateName?: string;
  aproReference?: string;
  countryId?: string;
  centerId?: string;
  occupation?: string;
  assessorName?: string;
  assessorId?: string;
  theoryScore?: number;
  practicalScore?: number;
  score: number;
  grade: 'DISTINCTION' | 'PASS' | 'FAIL';
  status: 'PENDING' | 'SUBMITTED' | 'LOCKED' | 'CORRECTED';
  submissionDate?: string;
  certificateNumber?: string;
  issuedAt?: string;
  correctionHistory?: ResultCorrection[];
}

export interface EvaluationQuestion {
  id: string;
  code: string;
  textEn: string;
  textAr: string;
  maxScore: number;
  descriptionEn?: string;
  descriptionAr?: string;
}

export interface EvaluationRubricSection {
  id: string;
  code: string;
  titleEn: string;
  titleAr: string;
  weightPercentage?: number;
  questions: EvaluationQuestion[];
}

export interface EvaluationSheet {
  id: string;
  candidateId: string;
  assessmentId?: string;
  assessorId: string;
  batchId?: string;
  fileName: string;
  fileSize?: string;
  fileUrl: string;
  fileType: 'IMAGE' | 'PDF';
  uploadedAt: string;
}

export interface CandidateEvaluationRating {
  id: string;
  candidateId: string;
  assessorId: string;
  assessmentId?: string;
  batchId?: string;
  taskId?: string;
  taskTitle?: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard' | string;
  ratings: Record<string, number>; // questionId -> score
  sectionScores: Record<string, { score: number; maxScore: number; percentage: number }>;
  totalScore: number;
  totalMaxScore: number;
  totalPercentage: number;
  evaluationSheetUrl?: string;
  evaluationSheetName?: string;
  evaluationSheetUploadedAt?: string;
  assessorRemarks?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'LOCKED';
  submittedAt?: string;
  lockedAt?: string;
}

export interface Notification {
  id: string;
  titleEn: string;
  titleAr: string;
  messageEn: string;
  messageAr: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  targetRole?: Role | 'ALL';
  read: boolean;
  createdAt: string;
  link?: string;
}

export type AuditAction = 
  | 'LOGIN' 
  | 'LOGOUT'
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'VIEW' 
  | 'SUBMIT' 
  | 'ASSIGN' 
  | 'APPROVE'
  | 'LOCK'
  | 'CREATE_COUNTRY'
  | 'UPDATE_COUNTRY'
  | 'CREATE_CENTER'
  | 'UPDATE_CENTER'
  | 'CREATE_USER'
  | 'UPDATE_USER'
  | 'ACTIVATE_USER'
  | 'DEACTIVATE_USER'
  | 'CREATE_TASK'
  | 'UPDATE_TASK'
  | 'ALLOCATE_TASK'
  | 'GENERATE_LOTTERY'
  | 'RELEASE_LOTTERY'
  | 'SUBMIT_RESULT'
  | 'CORRECT_RESULT'
  | 'CREATE_SCHEDULE'
  | 'UPDATE_SCHEDULE'
  | 'CREATE_BATCH'
  | 'UPDATE_BATCH'
  | 'CREATE_CANDIDATE'
  | 'IMPORT_RESERVATION'
  | 'PRELOAD_CANDIDATE'
  | 'ENROLL_CANDIDATE'
  | 'CREATE_ASSESSOR'
  | 'CREATE_SUPPORT_STAFF'
  | 'UPDATE_CANDIDATE'
  | 'UPDATE_COMPLAINT'
  | 'CANDIDATE_VERIFICATION'
  | 'CANDIDATE_EXIT'
  | 'START_PRACTICAL'
  | 'COMPLETE_PRACTICAL'
  | 'UPLOAD_EVIDENCE'
  | 'UPLOAD_EVALUATION_SHEET'
  | 'SUBMIT_EVALUATION'
  | 'VIEW_TASK'
  | 'AI_HELP_QUERY'
  | 'EXPORT'
  | 'PRINT';

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  role: Role;
  countryId?: string;
  centerId?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  details: string;
  ipAddress: string;
  deviceInfo?: string;
  browserInfo?: string;
  osInfo?: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILURE';
}

export interface ComplaintHistoryEntry {
  id: string;
  complaintId: string;
  fromStatus?: string;
  toStatus: string;
  changedBy: string;
  changedAt: string;
  comment?: string;
  assignedTo?: string;
}

export interface Complaint {
  id: string;
  complaintNumber: string;
  countryId: string;
  centerId: string;
  reportedBy: string;
  category: 'EXAMINATION_CONDUCT' | 'TECHNICAL_EQUIPMENT' | 'FACILITY' | 'RESULT_DISPUTE' | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'UNDER_REVIEW' | 'ACTION_REQUIRED' | 'RESOLVED' | 'CLOSED' | 'IN_PROGRESS';
  subject: string;
  description: string;
  assignedTo?: string;
  assignedToName?: string;
  createdAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  history?: ComplaintHistoryEntry[];
}

export interface AssessmentVarianceRecord {
  id: string;
  candidateId: string;
  candidateName: string;
  aproReference: string;
  assessorId: string;
  assessorName: string;
  centerId: string;
  centerName: string;
  occupation: string;
  taskCode: string;
  taskTitle: string;
  candidateScore: number;
  cohortAverage: number;
  variance: number;
  riskStatus: 'NORMAL' | 'ATTENTION' | 'REVIEW_REQUIRED';
  sectionScores?: Record<string, { score: number; maxScore: number; percentage: number }>;
  evaluatedAt: string;
}

export interface LiveActivityEvent {
  id: string;
  timestamp: string;
  countryId?: string;
  countryName?: string;
  countryCode?: string;
  centerId: string;
  centerName: string;
  user?: string;
  actorName?: string;
  role?: Role;
  action?: string;
  entity?: string;
  description?: string;
  type?: string;
  status?: 'SUCCESS' | 'WARNING' | 'ALERT' | 'INFO';
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
  category?: string;
  event?: string;
}

export interface APROConfig {
  format: string;
  prefix: string;
  sequence: number;
  sampleGenerated: string;
  status: 'ACTIVE' | 'DRAFT';
  isConfigurable: boolean;
  note: string;
}

export interface SerialConfig {
  prefix: string;
  startingNumber: number;
  currentNumber: number;
  format: string;
  status: 'ACTIVE' | 'DRAFT';
  note: string;
}

export interface AssessmentSettingsConfig {
  cbtDurationMinutes: number;
  practicalDurationMinutes: number;
  assignmentReleaseHoursBefore: number;
  passingScorePercentage: number;
  practicalWeightPercentage: number;
  allowResultCorrection: boolean;
  lockTimeoutMinutes: number;
  blindLotteryEnforced: boolean;
}

export interface IDCardConfig {
  templateName: string;
  showQrCode: boolean;
  showPassport: boolean;
  showApro: boolean;
  primaryColor: string;
  issueAuthority: string;
  status: 'ACTIVE' | 'DRAFT';
}

export interface SystemSettings {
  language: Language;
  notificationsEnabled: boolean;
  autoRefreshInterval: number;
  compactSidebar: boolean;
}

export interface PracticalTaskConfig {
  defaultDurationMinutes: number;
  defaultPassingScore: number;
  defaultMaxScore: number;
  allowAssessorOverride: boolean;
  requireToolsChecklist: boolean;
  status: 'ACTIVE' | 'DRAFT';
}

export interface NotificationConfig {
  channels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
  };
  notifyOnComplaintSubmitted: boolean;
  notifyOnResultLocked: boolean;
  notifyOnIdCardApproved: boolean;
  notifyOnLotteryExecution: boolean;
  adminAlertEmail: string;
}
