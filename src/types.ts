export type DeleteAfterDays = 7 | 15 | 30 | 60 | 90;

export interface CandidateStatusRule {
  id: string;
  name: string;
  archive: boolean; // false = No, true = Yes
  approvalRequired: boolean | null; // null if archive is false
  deleteAfterDays: DeleteAfterDays | null; // null if archive is false
  isActive: boolean; // true = Active, false = Disabled
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type CandidateLifecycleState =
  | 'active'
  | 'pending_approval'
  | 'archived'
  | 'restored'
  | 'permanently_deleted';

export interface CandidateComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  isStatusChange?: boolean;
  previousStatus?: string;
  newStatus?: string;
}

export interface StatusChangeLog {
  id: string;
  previousStatusId: string;
  previousStatusName: string;
  newStatusId: string;
  newStatusName: string;
  comment: string;
  changedBy: string;
  timestamp: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  recruiterName: string;
  recruiterId: string;
  statusId: string;
  statusName: string;
  lifecycleState: CandidateLifecycleState;
  statusAssignedAt: string;
  archivedAt: string | null;
  deleteAt: string | null;
  daysRemaining: number | null;
  approvalRequestedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  notes?: string;
  previousStatusName?: string;
  matchPercentage?: number;
  keySkills?: string[];
  designation?: string;
  preferredLocations?: string;
  source?: string;
  noticePeriod?: string;
  experienceYears?: number;
  annualCtc?: string;
  comments?: CandidateComment[];
  statusLogs?: StatusChangeLog[];
}

export type UserRole = 'admin' | 'recruiter';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

export interface ConfirmationModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: 'danger' | 'primary' | 'warning';
  onConfirm: () => void;
  onCancel?: () => void;
}
