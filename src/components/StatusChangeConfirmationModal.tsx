/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Candidate, CandidateStatusRule } from '../types';
import {
  AlertTriangle,
  ArrowRight,
  Archive,
  UserCheck,
  CheckCircle2,
  X,
  MessageSquare,
  Clock,
  Flag,
} from 'lucide-react';

interface StatusChangeConfirmationModalProps {
  isOpen: boolean;
  candidate: Candidate | null;
  newStatusRule: CandidateStatusRule | null;
  onClose: () => void;
  onConfirm: (candidateId: string, newStatusId: string, comment: string) => void;
}

export function StatusChangeConfirmationModal({
  isOpen,
  candidate,
  newStatusRule,
  onClose,
  onConfirm,
}: StatusChangeConfirmationModalProps) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setComment('');
      setError(null);
    }
  }, [isOpen, candidate, newStatusRule]);

  if (!isOpen || !candidate || !newStatusRule) return null;

  const handleConfirm = () => {
    onConfirm(candidate.id, newStatusRule.id, comment.trim());
    onClose();
  };

  // Rule effect determination
  const isArchive = newStatusRule.archive;
  const isApprovalReq = newStatusRule.approvalRequired;
  const retentionDays = newStatusRule.deleteAfterDays;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#006e88] flex items-center justify-center border border-sky-200">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Confirm Status Update
              </h3>
              <p className="text-2xs text-slate-500">
                You can add a comment with this status update (or update without a comment)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Candidate & Status Transition Banner */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Candidate:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">{candidate.name}</span>
                {candidate.lifecycleState === 'pending_approval' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-3xs font-normal bg-amber-50 text-amber-800 border border-amber-200">
                    <Flag className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                    pending admin approval for deletion
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-2xs font-semibold bg-slate-200 text-slate-700">
                  {candidate.statusName}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="px-2.5 py-0.5 rounded-md text-2xs font-bold bg-[#006e88] text-white shadow-2xs">
                  {newStatusRule.name}
                </span>
              </div>
            </div>
          </div>

          {/* Rule Outcome Notice */}
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              !isArchive
                ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                : isApprovalReq
                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                : 'bg-orange-50/70 border-orange-200 text-orange-900'
            }`}
          >
            {!isArchive ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold">
                    {candidate.lifecycleState === 'pending_approval'
                      ? 'Cancels Approval Request & Keeps Profile Active'
                      : 'Rule A: Direct Active Update (No Approval Required)'}
                  </span>
                  <p className="text-2xs text-blue-700 leading-relaxed">
                    This status does not contain approval or archival. The profile will update to &quot;{newStatusRule.name}&quot; and remain in your panel without going for Admin approval.
                  </p>
                </div>
              </>
            ) : isApprovalReq ? (
              <>
                <UserCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold">Rule C: Requires Admin Approval</span>
                  <p className="text-2xs text-amber-700 leading-relaxed">
                    This profile will be queued for Admin approval, but <strong>will remain in your recruiter panel</strong> with a &quot;Pending Admin Approval&quot; flag until approved. You can change their status again anytime while visible.
                  </p>
                </div>
              </>
            ) : (
              <>
                <Archive className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold">Rule B: Direct Archival</span>
                  <p className="text-2xs text-orange-700 leading-relaxed">
                    Candidate moves directly to the Archive Vault. {retentionDays}-day deletion timer starts immediately.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Optional Comment Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="status-comment-input"
                className="text-xs font-semibold text-slate-800 flex items-center gap-1"
              >
                <span>Comment with Status</span>
                <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <span className="text-3xs text-slate-400 font-medium">
                {comment.length > 0 ? `${comment.length} characters` : 'Optional comment'}
              </span>
            </div>

            <textarea
              id="status-comment-input"
              rows={3}
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Add an optional comment/note explaining this status update..."
              className="w-full p-3 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#006e88] focus:ring-1 focus:ring-[#006e88]/20 transition-colors placeholder:text-slate-400 leading-relaxed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            id="btn-confirm-status-change"
            onClick={handleConfirm}
            className="px-5 py-2 text-xs font-bold text-white bg-[#006e88] hover:bg-[#005a70] rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm &amp; Update Status</span>
          </button>
        </div>
      </div>
    </div>
  );
}
