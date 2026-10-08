/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useId } from 'react';
import {
  CandidateStatusRule,
  Candidate,
  UserRole,
  ToastMessage,
  ConfirmationModalState,
} from './types';
import { INITIAL_STATUS_RULES, INITIAL_CANDIDATES } from './data/initialData';
import { calculateDeleteDate } from './utils/dateUtils';
import { StatusManagementTable } from './components/StatusManagementTable';
import { StatusFormModal } from './components/StatusFormModal';
import { ArchivedCandidatesView } from './components/ArchivedCandidatesView';
import { PendingApprovalsView } from './components/PendingApprovalsView';
import { ActiveCandidatesView } from './components/ActiveCandidatesView';
import { ToastContainer } from './components/ToastContainer';
import { ConfirmationModal } from './components/ConfirmationModal';
import { RecruiterPortalView } from './components/RecruiterPortalView';
import {
  Settings2,
  Archive,
  UserCheck,
  Users,
  Shield,
  RotateCcw,
  Building2,
  CheckCircle2,
} from 'lucide-react';

type NavigationTab =
  | 'cleanup_rules'
  | 'archived'
  | 'approvals'
  | 'active_candidates';

export default function App() {
  // Local storage keys
  const STATUSES_STORAGE_KEY = 'staffing_candidate_statuses_v1';
  const CANDIDATES_STORAGE_KEY = 'staffing_candidates_v1';

  // State: Status rules
  const [statuses, setStatuses] = useState<CandidateStatusRule[]>(() => {
    try {
      const saved = localStorage.getItem(STATUSES_STORAGE_KEY);
      if (saved) {
        let parsed: CandidateStatusRule[] = JSON.parse(saved);
        const hasNew = parsed.some((s) => s.name.toLowerCase() === 'new');
        if (!hasNew) {
          const newStatusRule: CandidateStatusRule = {
            id: 'status-new',
            name: 'New',
            archive: false,
            approvalRequired: null,
            deleteAfterDays: null,
            isActive: true,
            description: 'Fresh applicant profile. Stays active in recruiter panel without requiring admin approval or archival.',
            createdAt: '2026-09-01T08:00:00.000Z',
            updatedAt: '2026-09-01T08:00:00.000Z',
          };
          parsed = [newStatusRule, ...parsed];
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_STATUS_RULES;
  });

  // State: Candidates
  const [candidates, setCandidates] = useState<Candidate[]>(() => {
    try {
      const saved = localStorage.getItem(CANDIDATES_STORAGE_KEY);
      if (saved) {
        let parsed: Candidate[] = JSON.parse(saved);
        // Ensure new seed candidates are merged if user has older local storage
        const existingIds = new Set(parsed.map((c) => c.id));
        const missing = INITIAL_CANDIDATES.filter((c) => !existingIds.has(c.id));
        if (missing.length > 0) {
          parsed = [...parsed, ...missing];
        }
        // Ensure seed comments and status logs are merged if empty
        parsed = parsed.map((c) => {
          const initial = INITIAL_CANDIDATES.find((init) => init.id === c.id);
          let updated = { ...c };
          if (initial && initial.comments && initial.comments.length > 0 && (!c.comments || c.comments.length === 0)) {
            updated.comments = initial.comments;
          }
          if (initial && initial.statusLogs && initial.statusLogs.length > 0 && (!c.statusLogs || c.statusLogs.length === 0)) {
            updated.statusLogs = initial.statusLogs;
          }
          return updated;
        });
        return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_CANDIDATES;
  });

  // State: User Role (Admin vs Recruiter)
  const [userRole, setUserRole] = useState<UserRole>('admin');

  // State: Navigation
  const [activeTab, setActiveTab] = useState<NavigationTab>('cleanup_rules');

  // State: Modals & Toasts
  const [statusModalState, setStatusModalState] = useState<{
    isOpen: boolean;
    statusToEdit: CandidateStatusRule | null;
  }>({
    isOpen: false,
    statusToEdit: null,
  });

  const [confirmationModal, setConfirmationModal] = useState<ConfirmationModalState | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STATUSES_STORAGE_KEY, JSON.stringify(statuses));
    } catch {
      // ignore
    }
  }, [statuses]);

  useEffect(() => {
    try {
      localStorage.setItem(CANDIDATES_STORAGE_KEY, JSON.stringify(candidates));
    } catch {
      // ignore
    }
  }, [candidates]);

  // Toast Helper
  const addToast = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message?: string
  ) => {
    const newToast: ToastMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      title,
      message,
    };
    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 5000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Reset to demo defaults
  const handleResetData = () => {
    setConfirmationModal({
      isOpen: true,
      title: 'Reset Demo Data to Initial State?',
      message:
        'This will reset all candidate statuses and profiles to the default seed dataset. Custom modifications will be cleared.',
      confirmLabel: 'Yes, Reset Everything',
      confirmVariant: 'warning',
      onConfirm: () => {
        setStatuses(INITIAL_STATUS_RULES);
        setCandidates(INITIAL_CANDIDATES);
        localStorage.removeItem(STATUSES_STORAGE_KEY);
        localStorage.removeItem(CANDIDATES_STORAGE_KEY);
        addToast('info', 'Demo Data Reset', 'Initial statuses and candidate pool restored.');
      },
    });
  };

  // -------------------------------------------------------------
  // STATUS CRUD OPERATIONS
  // -------------------------------------------------------------

  const handleOpenCreateStatus = () => {
    if (userRole !== 'admin') {
      addToast('error', 'Access Denied', 'Only Admin can configure cleanup rules (Rule 10).');
      return;
    }
    setStatusModalState({ isOpen: true, statusToEdit: null });
  };

  const handleOpenEditStatus = (status: CandidateStatusRule) => {
    if (userRole !== 'admin') {
      addToast('error', 'Access Denied', 'Only Admin can configure cleanup rules.');
      return;
    }
    setStatusModalState({ isOpen: true, statusToEdit: status });
  };

  const handleSaveStatus = (
    statusData: Omit<CandidateStatusRule, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const now = new Date().toISOString();

    if (statusModalState.statusToEdit) {
      // Edit existing
      const updatedId = statusModalState.statusToEdit.id;
      setStatuses((prev) =>
        prev.map((s) => (s.id === updatedId ? { ...s, ...statusData, updatedAt: now } : s))
      );

      // Also update any candidates currently displaying the old status name
      setCandidates((prev) =>
        prev.map((c) =>
          c.statusId === updatedId ? { ...c, statusName: statusData.name } : c
        )
      );

      addToast(
        'success',
        'Status Rule Updated',
        `"${statusData.name}" configuration updated successfully.`
      );
    } else {
      // Create new
      const newStatus: CandidateStatusRule = {
        id: `status-${Date.now()}`,
        ...statusData,
        createdAt: now,
        updatedAt: now,
      };
      setStatuses((prev) => [...prev, newStatus]);
      addToast(
        'success',
        'Status Created',
        `"${statusData.name}" has been added to recruitment cleanup rules.`
      );
    }
  };

  const handleToggleStatusActive = (status: CandidateStatusRule) => {
    if (userRole !== 'admin') {
      addToast('error', 'Access Denied', 'Only Admin can modify status availability.');
      return;
    }

    const willBeDisabled = status.isActive;
    const candidatesWithStatus = candidates.filter(
      (c) => c.statusId === status.id && c.lifecycleState === 'active'
    ).length;

    if (willBeDisabled && candidatesWithStatus > 0) {
      setConfirmationModal({
        isOpen: true,
        title: `Disable Status "${status.name}"?`,
        message: `There are currently ${candidatesWithStatus} active candidate(s) assigned this status. Disabled statuses cannot be assigned to candidates in the future (Rule 10).`,
        confirmLabel: 'Disable Status',
        confirmVariant: 'warning',
        onConfirm: () => {
          setStatuses((prev) =>
            prev.map((s) => (s.id === status.id ? { ...s, isActive: false } : s))
          );
          addToast('warning', 'Status Disabled', `"${status.name}" is now disabled.`);
        },
      });
      return;
    }

    setStatuses((prev) =>
      prev.map((s) => (s.id === status.id ? { ...s, isActive: !s.isActive } : s))
    );
    addToast(
      'info',
      status.isActive ? 'Status Disabled' : 'Status Enabled',
      `"${status.name}" is now ${status.isActive ? 'disabled' : 'active'}.`
    );
  };

  const handleDeleteStatus = (status: CandidateStatusRule) => {
    if (userRole !== 'admin') {
      addToast('error', 'Access Denied', 'Only Admin can delete status rules.');
      return;
    }

    const assignedCount = candidates.filter((c) => c.statusId === status.id).length;

    setConfirmationModal({
      isOpen: true,
      title: `Delete Status Rule "${status.name}"?`,
      message:
        assignedCount > 0
          ? `Warning: ${assignedCount} candidate record(s) currently reference this status. Deleting it will keep candidates active under default follow-up.`
          : `Are you sure you want to permanently delete the "${status.name}" configuration rule?`,
      confirmLabel: 'Delete Rule',
      confirmVariant: 'danger',
      onConfirm: () => {
        setStatuses((prev) => prev.filter((s) => s.id !== status.id));
        if (assignedCount > 0) {
          const fallback = statuses.find((s) => s.id !== status.id && s.isActive) || statuses[0];
          setCandidates((prev) =>
            prev.map((c) =>
              c.statusId === status.id
                ? {
                    ...c,
                    statusId: fallback?.id || 'status-1',
                    statusName: fallback?.name || 'Follow-up Needed',
                  }
                : c
            )
          );
        }
        addToast('info', 'Status Rule Removed', `Rule "${status.name}" has been deleted.`);
      },
    });
  };

  // -------------------------------------------------------------
  // CANDIDATE LIFECYCLE & BUSINESS RULES ENGINE
  // -------------------------------------------------------------

  /**
   * Section 5: Important Business Rules
   *
   * Rule A: Archive = No
   * → Candidate remains Active
   * → No approval required
   * → No deletion timer
   *
   * Rule B: Archive = Yes + Approval = No
   * → Candidate moves directly to Archive
   * → Deletion timer starts
   *
   * Rule C: Archive = Yes + Approval = Yes
   * → Candidate goes for Admin approval
   * → After approval, candidate moves to Archive
   * → Deletion timer starts
   */
  const handleAssignStatus = (candidateId: string, newStatusId: string, comment?: string) => {
    const candidate = candidates.find((c) => c.id === candidateId);
    const rule = statuses.find((s) => s.id === newStatusId);

    if (!candidate || !rule) return;

    // Rule 10: Disabled statuses cannot be assigned to candidates
    if (!rule.isActive) {
      addToast(
        'error',
        'Assignment Blocked',
        `"${rule.name}" is disabled and cannot be assigned to candidates (Rule 10).`
      );
      return;
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const author = 'Innov Facilities';
    const commentText =
      comment?.trim() || `Status updated from "${candidate.statusName}" to "${rule.name}".`;

    const newComment = {
      id: `comm-${Date.now()}`,
      author,
      text: commentText,
      createdAt: nowIso,
      updatedAt: nowIso,
      isStatusChange: true,
      previousStatus: candidate.statusName,
      newStatus: rule.name,
    };

    const newLog = {
      id: `log-${Date.now()}`,
      previousStatusId: candidate.statusId,
      previousStatusName: candidate.statusName,
      newStatusId: rule.id,
      newStatusName: rule.name,
      comment: commentText,
      changedBy: author,
      timestamp: nowIso,
    };

    // RULE A: Archive = No
    if (!rule.archive) {
      const wasPendingApproval = candidate.lifecycleState === 'pending_approval';
      setCandidates((prev) =>
        prev.map((c) => {
          if (c.id !== candidateId) return c;
          const currentComments = c.comments || [];
          const currentLogs = c.statusLogs || [];
          return {
            ...c,
            statusId: rule.id,
            statusName: rule.name,
            lifecycleState: 'active',
            statusAssignedAt: nowIso,
            archivedAt: null,
            deleteAt: null,
            daysRemaining: null,
            approvalRequestedAt: null,
            approvedAt: null,
            approvedBy: null,
            comments: [newComment, ...currentComments],
            statusLogs: [newLog, ...currentLogs],
            notes: commentText,
          };
        })
      );
      if (wasPendingApproval) {
        addToast(
          'success',
          `Status: ${rule.name}`,
          `${candidate.name} updated to "${rule.name}". No approval or archival required; pending approval request removed.`
        );
      } else {
        addToast(
          'success',
          `Status: ${rule.name}`,
          `${candidate.name} updated. Candidate remains Active with no approval required.`
        );
      }
      return;
    }

    // RULE B: Archive = Yes + Approval = No
    if (rule.archive && !rule.approvalRequired) {
      const retentionDays = rule.deleteAfterDays || 30;
      const deleteAtIso = calculateDeleteDate(now, retentionDays);

      setCandidates((prev) =>
        prev.map((c) => {
          if (c.id !== candidateId) return c;
          const currentComments = c.comments || [];
          const currentLogs = c.statusLogs || [];
          return {
            ...c,
            statusId: rule.id,
            statusName: rule.name,
            lifecycleState: 'archived',
            statusAssignedAt: nowIso,
            archivedAt: nowIso,
            deleteAt: deleteAtIso,
            daysRemaining: retentionDays,
            approvalRequestedAt: null,
            approvedAt: null,
            approvedBy: null,
            comments: [newComment, ...currentComments],
            statusLogs: [newLog, ...currentLogs],
            notes: commentText,
          };
        })
      );

      addToast(
        'warning',
        'Candidate Moved to Archive',
        `${candidate.name} moved directly to Archive. ${retentionDays}-day retention timer started.`
      );
      return;
    }

    // RULE C: Archive = Yes + Approval = Yes
    if (rule.archive && rule.approvalRequired) {
      setCandidates((prev) =>
        prev.map((c) => {
          if (c.id !== candidateId) return c;
          const currentComments = c.comments || [];
          const currentLogs = c.statusLogs || [];
          return {
            ...c,
            statusId: rule.id,
            statusName: rule.name,
            lifecycleState: 'pending_approval',
            statusAssignedAt: nowIso,
            approvalRequestedAt: nowIso,
            archivedAt: null,
            deleteAt: null,
            daysRemaining: null,
            comments: [newComment, ...currentComments],
            statusLogs: [newLog, ...currentLogs],
            notes: commentText,
          };
        })
      );

      addToast(
        'info',
        'Submitted for Admin Approval',
        `${candidate.name} is queued for Admin approval. Profile remains in recruiter panel with a pending flag until approved.`
      );
    }
  };

  /**
   * Admin Approves Archive Request
   * Candidate moves to Archive, deletion timer starts
   */
  const handleApproveCandidate = (candidate: Candidate) => {
    if (userRole !== 'admin') {
      addToast('error', 'Access Denied', 'Only Admins can approve archive requests.');
      return;
    }

    const rule = statuses.find((s) => s.id === candidate.statusId);
    const retentionDays = rule?.deleteAfterDays || 30;
    const now = new Date();
    const nowIso = now.toISOString();
    const deleteAtIso = calculateDeleteDate(now, retentionDays);

    const newLog = {
      id: `log-${Date.now()}-${candidate.id}`,
      previousStatusId: candidate.statusId,
      previousStatusName: `${candidate.statusName} (Pending Approval)`,
      newStatusId: candidate.statusId,
      newStatusName: `${candidate.statusName} (Archived)`,
      comment: `Admin approved archival. Profile moved to Archive with ${retentionDays}-day retention countdown.`,
      changedBy: 'Admin',
      timestamp: nowIso,
    };

    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id !== candidate.id) return c;
        const currentLogs = c.statusLogs || [];
        return {
          ...c,
          lifecycleState: 'archived',
          approvedAt: nowIso,
          approvedBy: 'Admin',
          archivedAt: nowIso,
          deleteAt: deleteAtIso,
          daysRemaining: retentionDays,
          statusLogs: [newLog, ...currentLogs],
        };
      })
    );

    addToast(
      'success',
      'Archive Approved',
      `${candidate.name} moved to Archive. ${retentionDays}-day retention countdown active.`
    );
  };

  /**
   * Admin Rejects Archive Request
   * Candidate remains in Active Database
   */
  const handleRejectApproval = (candidate: Candidate) => {
    if (userRole !== 'admin') {
      addToast('error', 'Access Denied', 'Only Admins can reject archive requests.');
      return;
    }

    const fallbackRule = statuses.find((s) => !s.archive && s.isActive) || statuses[0];
    const nowIso = new Date().toISOString();

    const newLog = {
      id: `log-${Date.now()}-${candidate.id}`,
      previousStatusId: candidate.statusId,
      previousStatusName: `${candidate.statusName} (Pending Approval)`,
      newStatusId: fallbackRule.id,
      newStatusName: fallbackRule.name,
      comment: 'Archive approval was rejected by Admin. Candidate returned to Active Database.',
      changedBy: 'Admin',
      timestamp: nowIso,
    };

    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id !== candidate.id) return c;
        const currentLogs = c.statusLogs || [];
        return {
          ...c,
          lifecycleState: 'active',
          statusId: fallbackRule.id,
          statusName: fallbackRule.name,
          approvalRequestedAt: null,
          approvedAt: null,
          statusLogs: [newLog, ...currentLogs],
          notes: 'Archive approval was rejected by Admin. Candidate kept in Active Database.',
        };
      })
    );

    addToast(
      'info',
      'Archive Request Rejected',
      `${candidate.name} remains in the Active Candidate Database with status "${fallbackRule.name}".`
    );
  };

  /**
   * Admin Batch Approves Archive Requests
   */
  const handleBatchApproveCandidates = (selectedCandidates: Candidate[]) => {
    if (userRole !== 'admin') {
      addToast('error', 'Access Denied', 'Only Admins can approve archive requests.');
      return;
    }
    if (selectedCandidates.length === 0) return;

    setConfirmationModal({
      isOpen: true,
      title: `Approve ${selectedCandidates.length} Candidates for Archival?`,
      message: `Are you sure you want to approve archival for ${selectedCandidates.length} candidate(s)? They will be moved to the Archive Vault and their respective retention countdown timers will start immediately.`,
      confirmLabel: `Approve & Archive (${selectedCandidates.length})`,
      confirmVariant: 'primary',
      onConfirm: () => {
        const now = new Date();
        const nowIso = now.toISOString();
        const candidateIdSet = new Set(selectedCandidates.map((c) => c.id));

        setCandidates((prev) =>
          prev.map((c) => {
            if (!candidateIdSet.has(c.id)) return c;
            const rule = statuses.find((s) => s.id === c.statusId);
            const retentionDays = rule?.deleteAfterDays || 30;
            const deleteAtIso = calculateDeleteDate(now, retentionDays);
            const currentLogs = c.statusLogs || [];

            const newLog = {
              id: `log-${Date.now()}-${c.id}`,
              previousStatusId: c.statusId,
              previousStatusName: `${c.statusName} (Pending Approval)`,
              newStatusId: c.statusId,
              newStatusName: `${c.statusName} (Archived)`,
              comment: `Batch approved for archival by Admin. ${retentionDays}-day retention timer started.`,
              changedBy: 'Admin',
              timestamp: nowIso,
            };

            return {
              ...c,
              lifecycleState: 'archived',
              approvedAt: nowIso,
              approvedBy: 'Admin',
              archivedAt: nowIso,
              deleteAt: deleteAtIso,
              daysRemaining: retentionDays,
              statusLogs: [newLog, ...currentLogs],
            };
          })
        );

        addToast(
          'success',
          'Batch Archive Approved',
          `Successfully approved ${selectedCandidates.length} candidate(s). Profiles moved to Archive.`
        );
      },
    });
  };

  /**
   * Admin Batch Rejects Archive Requests
   */
  const handleBatchRejectApprovals = (selectedCandidates: Candidate[]) => {
    if (userRole !== 'admin') {
      addToast('error', 'Access Denied', 'Only Admins can reject archive requests.');
      return;
    }
    if (selectedCandidates.length === 0) return;

    setConfirmationModal({
      isOpen: true,
      title: `Reject Archival for ${selectedCandidates.length} Candidates?`,
      message: `Are you sure you want to reject archival for ${selectedCandidates.length} candidate(s)? Their profiles will remain in the Active Candidate Database.`,
      confirmLabel: `Reject & Keep Active (${selectedCandidates.length})`,
      confirmVariant: 'warning',
      onConfirm: () => {
        const fallbackRule = statuses.find((s) => !s.archive && s.isActive) || statuses[0];
        const candidateIdSet = new Set(selectedCandidates.map((c) => c.id));
        const nowIso = new Date().toISOString();

        setCandidates((prev) =>
          prev.map((c) => {
            if (!candidateIdSet.has(c.id)) return c;
            const currentLogs = c.statusLogs || [];

            const newLog = {
              id: `log-${Date.now()}-${c.id}`,
              previousStatusId: c.statusId,
              previousStatusName: `${c.statusName} (Pending Approval)`,
              newStatusId: fallbackRule.id,
              newStatusName: fallbackRule.name,
              comment: 'Batch archive approval rejected by Admin. Returned to Active Database.',
              changedBy: 'Admin',
              timestamp: nowIso,
            };

            return {
              ...c,
              lifecycleState: 'active',
              statusId: fallbackRule.id,
              statusName: fallbackRule.name,
              approvalRequestedAt: null,
              approvedAt: null,
              statusLogs: [newLog, ...currentLogs],
              notes: 'Archive approval was rejected by Admin in bulk. Candidate kept in Active Database.',
            };
          })
        );

        addToast(
          'info',
          'Batch Archive Rejected',
          `Rejected archival for ${selectedCandidates.length} candidate(s). Profiles returned to Active Database with status "${fallbackRule.name}".`
        );
      },
    });
  };

  /**
   * Section 7: Restore Candidate
   * Archived Candidate -> Restore -> Active Candidate Database -> Deletion timer cancelled
   */
  const handleRestoreCandidate = (candidate: Candidate) => {
    if (userRole !== 'admin') {
      addToast('error', 'Access Denied', 'Only Admin can restore archived candidates.');
      return;
    }

    setConfirmationModal({
      isOpen: true,
      title: `Restore Candidate "${candidate.name}"?`,
      message: `Restoring will cancel the scheduled deletion timer and return this profile to the Active Candidate Database. Assigned recruiters will regain full access according to standard permissions.`,
      confirmLabel: 'Restore to Active Database',
      confirmVariant: 'primary',
      onConfirm: () => {
        // Fallback status if current one is an archiving one
        const activeStatus =
          statuses.find((s) => !s.archive && s.isActive) || statuses[0];
        const nowIso = new Date().toISOString();

        const newLog = {
          id: `log-${Date.now()}-${candidate.id}`,
          previousStatusId: candidate.statusId,
          previousStatusName: `${candidate.statusName} (Archived)`,
          newStatusId: activeStatus.id,
          newStatusName: activeStatus.name,
          comment: `Restored from Archive by Admin. Deletion countdown cancelled.`,
          changedBy: 'Admin',
          timestamp: nowIso,
        };

        setCandidates((prev) =>
          prev.map((c) => {
            if (c.id !== candidate.id) return c;
            const currentLogs = c.statusLogs || [];
            return {
              ...c,
              lifecycleState: 'restored',
              previousStatusName: candidate.statusName,
              statusId: activeStatus.id,
              statusName: activeStatus.name,
              archivedAt: null,
              deleteAt: null,
              daysRemaining: null,
              approvalRequestedAt: null,
              approvedAt: null,
              statusLogs: [newLog, ...currentLogs],
              notes: `Restored from archive on ${new Date().toLocaleDateString()}. Deletion timer cancelled.`,
            };
          })
        );

        addToast(
          'success',
          'Candidate Restored',
          `${candidate.name} is now back in Active Candidate Database. Deletion timer cancelled.`
        );
      },
    });
  };

  /**
   * Admin Batch Restores Candidates from Archive
   */
  const handleBatchRestoreCandidates = (selectedCandidates: Candidate[]) => {
    if (userRole !== 'admin') {
      addToast('error', 'Access Denied', 'Only Admin can restore archived candidates.');
      return;
    }
    if (selectedCandidates.length === 0) return;

    setConfirmationModal({
      isOpen: true,
      title: `Restore ${selectedCandidates.length} Candidates?`,
      message: `Restoring will cancel the scheduled deletion timers for ${selectedCandidates.length} candidate(s) and return their profiles to the Active Candidate Database. Assigned recruiters will regain full access.`,
      confirmLabel: `Restore to Active (${selectedCandidates.length})`,
      confirmVariant: 'primary',
      onConfirm: () => {
        const activeStatus =
          statuses.find((s) => !s.archive && s.isActive) || statuses[0];
        const candidateIdSet = new Set(selectedCandidates.map((c) => c.id));
        const nowFormatted = new Date().toLocaleDateString();
        const nowIso = new Date().toISOString();

        setCandidates((prev) =>
          prev.map((c) => {
            if (!candidateIdSet.has(c.id)) return c;
            const currentLogs = c.statusLogs || [];

            const newLog = {
              id: `log-${Date.now()}-${c.id}`,
              previousStatusId: c.statusId,
              previousStatusName: `${c.statusName} (Archived)`,
              newStatusId: activeStatus.id,
              newStatusName: activeStatus.name,
              comment: `Batch restored from Archive by Admin. Deletion countdown cancelled.`,
              changedBy: 'Admin',
              timestamp: nowIso,
            };

            return {
              ...c,
              lifecycleState: 'restored',
              previousStatusName: c.statusName,
              statusId: activeStatus.id,
              statusName: activeStatus.name,
              archivedAt: null,
              deleteAt: null,
              daysRemaining: null,
              approvalRequestedAt: null,
              approvedAt: null,
              statusLogs: [newLog, ...currentLogs],
              notes: `Restored from archive on ${nowFormatted}. Deletion timer cancelled.`,
            };
          })
        );

        addToast(
          'success',
          'Candidates Restored',
          `Successfully restored ${selectedCandidates.length} candidate(s) to Active Database.`
        );
      },
    });
  };

  /**
   * Section 8: Permanent Deletion
   * Archived Candidate -> Retention Period Ends -> Permanent Deletion
   * Candidate no longer available in Active or Archived.
   * System verifies candidate has not been restored or otherwise excluded from cleanup.
   */
  const handlePermanentDeleteCandidate = (candidate: Candidate) => {
    if (userRole !== 'admin') {
      addToast('error', 'Access Denied', 'Only Admin can permanently delete candidate records.');
      return;
    }

    setConfirmationModal({
      isOpen: true,
      title: `Permanently Delete "${candidate.name}"?`,
      message: `Warning: This action cannot be undone. Per Rule 8, the candidate profile will be permanently deleted and will no longer be available in either the Active or Archived Candidate sections.`,
      confirmLabel: 'Permanently Delete Profile',
      confirmVariant: 'danger',
      onConfirm: () => {
        // Verification step: check candidate state
        setCandidates((prev) => {
          const current = prev.find((c) => c.id === candidate.id);
          if (current?.lifecycleState === 'restored') {
            addToast('error', 'Deletion Prevented', 'Candidate has been restored and is protected.');
            return prev;
          }
          return prev.filter((c) => c.id !== candidate.id);
        });

        addToast(
          'info',
          'Permanent Deletion Executed',
          `${candidate.name} was permanently purged from all database records.`
        );
      },
    });
  };

  /**
   * Retention Timer Simulation (+X Days)
   */
  const handleSimulateTimeAdvance = (days: number) => {
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.lifecycleState !== 'archived' || c.daysRemaining === null) return c;
        const newDays = Math.max(0, c.daysRemaining - days);
        return {
          ...c,
          daysRemaining: newDays,
        };
      })
    );

    addToast(
      'info',
      'Simulation Advanced',
      `Advanced time by ${days} days. Candidate retention countdowns updated.`
    );
  };

  /**
   * Trigger Cleanup on Expired Candidates (Rule 8)
   */
  const handleTriggerCleanupExpired = () => {
    const expired = candidates.filter(
      (c) => c.lifecycleState === 'archived' && c.daysRemaining !== null && c.daysRemaining <= 0
    );

    if (expired.length === 0) {
      addToast('info', 'No Expired Candidates', 'No candidates currently have 0 days remaining.');
      return;
    }

    setConfirmationModal({
      isOpen: true,
      title: `Purge ${expired.length} Expired Candidate(s)?`,
      message: `System will permanently delete ${expired.length} candidate(s) whose retention period has concluded: ${expired
        .map((e) => e.name)
        .join(', ')}. They will no longer be accessible in Active or Archived sections.`,
      confirmLabel: `Purge ${expired.length} Candidates`,
      confirmVariant: 'danger',
      onConfirm: () => {
        setCandidates((prev) =>
          prev.filter(
            (c) =>
              !(c.lifecycleState === 'archived' && c.daysRemaining !== null && c.daysRemaining <= 0)
          )
        );
        addToast(
          'success',
          'Automated Purge Completed',
          `Successfully permanently deleted ${expired.length} candidate record(s) per retention policy.`
        );
      },
    });
  };

  // Add a new active candidate
  const handleAddNewActiveCandidate = (
    name: string,
    role: string,
    email: string,
    phone: string
  ) => {
    const defaultStatus = statuses.find((s) => !s.archive && s.isActive) || statuses[0];
    const newCand: Candidate = {
      id: `cand-${Date.now()}`,
      name,
      role,
      email,
      phone,
      recruiterName: userRole === 'admin' ? 'Sarah Jenkins' : 'Current Recruiter',
      recruiterId: 'rec-current',
      statusId: defaultStatus.id,
      statusName: defaultStatus.name,
      lifecycleState: 'active',
      statusAssignedAt: new Date().toISOString(),
      archivedAt: null,
      deleteAt: null,
      daysRemaining: null,
      approvalRequestedAt: null,
      approvedAt: null,
      approvedBy: null,
    };

    setCandidates((prev) => [newCand, ...prev]);
    addToast('success', 'Candidate Added', `${name} added to the Active Candidate Database.`);
  };

  // Add a comment to candidate profile (Recruiter / Admin)
  const handleAddComment = (candidateId: string, text: string) => {
    const nowIso = new Date().toISOString();
    const newComment = {
      id: `comment-${Date.now()}`,
      author: 'Innov Facilities',
      text,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id !== candidateId) return c;
        const currentComments = c.comments || [];
        return {
          ...c,
          comments: [newComment, ...currentComments],
        };
      })
    );
    addToast('success', 'Comment Added', 'New note added to candidate history.');
  };

  // Edit a comment on candidate profile
  const handleEditComment = (candidateId: string, commentId: string, newText: string) => {
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id !== candidateId) return c;
        const updated = (c.comments || []).map((comm) => {
          if (comm.id !== commentId) return comm;
          return {
            ...comm,
            text: newText,
            updatedAt: new Date().toISOString(),
          };
        });
        return {
          ...c,
          comments: updated,
        };
      })
    );
    addToast('success', 'Comment Updated', 'Candidate note has been updated.');
  };

  // Delete a comment on candidate profile
  const handleDeleteComment = (candidateId: string, commentId: string) => {
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id !== candidateId) return c;
        return {
          ...c,
          comments: (c.comments || []).filter((comm) => comm.id !== commentId),
        };
      })
    );
    addToast('info', 'Comment Deleted', 'Candidate note has been removed.');
  };

  // Count calculations
  const archivedCount = candidates.filter((c) => c.lifecycleState === 'archived').length;
  const pendingApprovalsCount = candidates.filter(
    (c) => c.lifecycleState === 'pending_approval'
  ).length;
  const activeCount = candidates.filter(
    (c) => c.lifecycleState === 'active' || c.lifecycleState === 'restored'
  ).length;

  // When Recruiter mode is selected, open the Jobcheck Recruiter Portal page
  if (userRole === 'recruiter') {
    return (
      <div className="min-h-screen bg-[#f4f7f9]">
        <RecruiterPortalView
          candidates={candidates}
          statuses={statuses}
          onAssignStatus={handleAssignStatus}
          onSwitchToAdmin={() => {
            setUserRole('admin');
            addToast('info', 'Switched to Admin Role', 'Access restored to candidate status rules and archive vault.');
          }}
          onAddComment={handleAddComment}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased">
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Branding */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white flex items-center justify-center shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-base tracking-tight">StaffFlow ATS</span>
                  <span className="px-2 py-0.5 text-3xs font-bold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                    Staffing Engine
                  </span>
                </div>
                <p className="text-2xs text-slate-500 hidden sm:block">
                  Candidate Status, Archival &amp; Retention Configuration
                </p>
              </div>
            </div>

            {/* Right Header: Role Switcher & Utilities */}
            <div className="flex items-center gap-3">
              {/* Role Toggle for Testing Permissions (Admin vs Recruiter) */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  id="role-switch-admin"
                  onClick={() => {
                    setUserRole('admin');
                    addToast('info', 'Switched to Admin Role', 'Full access to rules, vault, and approvals.');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    userRole === 'admin'
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  Admin
                </button>

                <button
                  type="button"
                  id="role-switch-recruiter"
                  onClick={() => {
                    setUserRole('recruiter');
                    addToast(
                      'info',
                      'Switched to Recruiter Role',
                      'Opening Jobcheck Candidate Recommendation & Evaluation Panel.'
                    );
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 transition-all cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  Recruiter
                </button>
              </div>

              {/* Reset Data Button */}
              <button
                type="button"
                id="btn-reset-demo-data"
                onClick={handleResetData}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Reset to default seed data"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Primary Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 -mb-px border-t border-slate-100">
            {/* Tab 1: Candidate Status & Cleanup Rules */}
            <button
              type="button"
              id="tab-cleanup-rules"
              onClick={() => setActiveTab('cleanup_rules')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'cleanup_rules'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              Candidate Status &amp; Cleanup Rules
            </button>

            {/* Tab 2: Archived Candidates */}
            <button
              type="button"
              id="tab-archived"
              onClick={() => setActiveTab('archived')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'archived'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Archive className="w-4 h-4" />
              Archived Candidates
              {archivedCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-3xs font-bold ${
                    activeTab === 'archived'
                      ? 'bg-indigo-700 text-indigo-100'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {archivedCount}
                </span>
              )}
            </button>

            {/* Tab 3: Pending Approvals */}
            <button
              type="button"
              id="tab-approvals"
              onClick={() => setActiveTab('approvals')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'approvals'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Pending Approvals
              {pendingApprovalsCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-3xs font-bold ${
                    activeTab === 'approvals'
                      ? 'bg-amber-400 text-amber-950'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {pendingApprovalsCount}
                </span>
              )}
            </button>

            {/* Tab 4: Active Candidates Database */}
            <button
              type="button"
              id="tab-active-candidates"
              onClick={() => setActiveTab('active_candidates')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'active_candidates'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" />
              Active Candidates ({activeCount})
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'cleanup_rules' && (
          <StatusManagementTable
            statuses={statuses}
            userRole={userRole}
            onCreateStatus={handleOpenCreateStatus}
            onEditStatus={handleOpenEditStatus}
            onDeleteStatus={handleDeleteStatus}
          />
        )}

        {activeTab === 'archived' && (
          <ArchivedCandidatesView
            candidates={candidates}
            statuses={statuses}
            userRole={userRole}
            onRestoreCandidate={handleRestoreCandidate}
            onPermanentDeleteCandidate={handlePermanentDeleteCandidate}
            onSimulateTimeAdvance={handleSimulateTimeAdvance}
            onTriggerCleanupExpired={handleTriggerCleanupExpired}
            onBatchRestoreCandidates={handleBatchRestoreCandidates}
            onAddComment={handleAddComment}
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteComment}
          />
        )}

        {activeTab === 'approvals' && (
          <PendingApprovalsView
            candidates={candidates}
            statuses={statuses}
            userRole={userRole}
            onApproveCandidate={handleApproveCandidate}
            onRejectApproval={handleRejectApproval}
            onBatchApproveCandidates={handleBatchApproveCandidates}
            onBatchRejectApprovals={handleBatchRejectApprovals}
          />
        )}

        {activeTab === 'active_candidates' && (
          <ActiveCandidatesView
            candidates={candidates}
            statuses={statuses}
            userRole={userRole}
            onAssignStatus={handleAssignStatus}
            onAddNewActiveCandidate={handleAddNewActiveCandidate}
            onAddComment={handleAddComment}
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteComment}
          />
        )}
      </main>

      {/* Modals & Overlays */}
      <StatusFormModal
        isOpen={statusModalState.isOpen}
        onClose={() => setStatusModalState({ isOpen: false, statusToEdit: null })}
        statusToEdit={statusModalState.statusToEdit}
        existingStatuses={statuses}
        onSave={handleSaveStatus}
        onRequestConfirmation={(config) =>
          setConfirmationModal({
            isOpen: true,
            ...config,
          })
        }
      />

      <ConfirmationModal
        modal={confirmationModal}
        onClose={() => setConfirmationModal(null)}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
