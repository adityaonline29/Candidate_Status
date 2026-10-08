/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Candidate, StatusChangeLog } from '../types';
import { formatCommentTimestamp } from '../utils/dateUtils';
import {
  History,
  ArrowRight,
  User,
  Shield,
  Calendar,
  Clock,
  X,
  CheckCircle2,
  AlertCircle,
  Archive,
  RotateCcw,
  FileText,
} from 'lucide-react';

interface StatusAuditLogModalProps {
  isOpen: boolean;
  candidate: Candidate | null;
  onClose: () => void;
  onOpenFullStatusLogsPage?: (candidate: Candidate) => void;
}

export const StatusAuditLogModal: React.FC<StatusAuditLogModalProps> = ({
  isOpen,
  candidate,
  onClose,
  onOpenFullStatusLogsPage,
}) => {
  if (!isOpen || !candidate) return null;

  // Compile logs or synthesize initial record if list is empty
  const rawLogs: StatusChangeLog[] = candidate.statusLogs && candidate.statusLogs.length > 0
    ? candidate.statusLogs
    : [
        {
          id: `log-initial-${candidate.id}`,
          previousStatusId: 'initial',
          previousStatusName: 'New Application',
          newStatusId: candidate.statusId,
          newStatusName: candidate.statusName,
          comment: candidate.notes || `Initial status "${candidate.statusName}" assigned to profile.`,
          changedBy: candidate.recruiterName || 'System',
          timestamp: candidate.statusAssignedAt || new Date().toISOString(),
        },
      ];

  // Sort logs in reverse chronological order (newest first)
  const sortedLogs = [...rawLogs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div
      id="status-audit-log-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        id="status-audit-log-modal-container"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <History className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Status Change Audit Log
              </h2>
              <span className="px-2 py-0.5 text-2xs font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {sortedLogs.length} {sortedLogs.length === 1 ? 'Event' : 'Events'}
              </span>
            </div>
            <p className="text-xs text-slate-500 pl-10.5">
              Detailed history showing timestamps, status transitions, and who executed each change for{' '}
              <strong className="text-slate-800">{candidate.name}</strong>.
            </p>
          </div>

          <button
            type="button"
            id="btn-close-status-log-modal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Candidate Profile Summary Bar */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <span className="text-slate-400">Candidate:</span>{' '}
              <span className="font-semibold text-slate-900">{candidate.name}</span>
            </div>
            <span className="text-slate-300">•</span>
            <div>
              <span className="text-slate-400">Role:</span>{' '}
              <span className="text-slate-700 font-medium">{candidate.role}</span>
            </div>
            {candidate.recruiterName && (
              <>
                <span className="text-slate-300">•</span>
                <div>
                  <span className="text-slate-400">Recruiter:</span>{' '}
                  <span className="text-slate-700 font-medium">{candidate.recruiterName}</span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Current Status:</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white shadow-2xs">
              {candidate.statusName}
            </span>
          </div>
        </div>

        {/* Modal Body: Scrollable Log Timeline */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-slate-50/40">
          <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {sortedLogs.map((log, index) => {
              const isAdminActor =
                log.changedBy.toLowerCase().includes('admin') ||
                log.changedBy.toLowerCase().includes('system');
              const isFirst = index === 0;

              return (
                <div
                  key={log.id || `log-item-${index}`}
                  className="relative group animate-in fade-in slide-in-from-left-2 duration-150"
                >
                  {/* Timeline Bullet */}
                  <div
                    className={`absolute -left-6 top-3.5 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white shadow-2xs transition-colors ${
                      isFirst
                        ? 'border-indigo-600 text-indigo-600 ring-4 ring-indigo-50'
                        : 'border-slate-300 text-slate-400'
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isFirst ? 'bg-indigo-600' : 'bg-slate-400'
                      }`}
                    />
                  </div>

                  {/* Log Card */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-indigo-200 hover:shadow-sm transition-all space-y-3">
                    {/* Top Row: Date/Time + Actor */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                      {/* Who changed it */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            isAdminActor
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isAdminActor ? (
                            <Shield className="w-3.5 h-3.5 text-indigo-600" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          <span>Changed by: <strong>{log.changedBy}</strong></span>
                        </span>

                        {isFirst && (
                          <span className="px-1.5 py-0.5 text-3xs font-bold uppercase tracking-wider rounded bg-indigo-600 text-white">
                            Current
                          </span>
                        )}
                      </div>

                      {/* Date and Time */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatCommentTimestamp(log.timestamp) || log.timestamp}</span>
                      </div>
                    </div>

                    {/* Middle Row: From What Status To What Status */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {/* From Status */}
                        <div className="space-y-0.5">
                          <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 block">
                            Previous Status
                          </span>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 shadow-2xs">
                            {log.previousStatusName || 'Initial Profile'}
                          </span>
                        </div>

                        {/* Transition Arrow */}
                        <div className="pt-3 sm:pt-4 px-1 text-slate-400">
                          <ArrowRight className="w-4 h-4 text-indigo-600 stroke-[2.5]" />
                        </div>

                        {/* To Status */}
                        <div className="space-y-0.5">
                          <span className="text-3xs font-bold uppercase tracking-wider text-indigo-600 block">
                            Updated Status
                          </span>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-900 border border-indigo-300 shadow-2xs">
                            {log.newStatusName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Note / Reason */}
                    {log.comment && (
                      <div className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-100 space-y-1">
                        <div className="flex items-center gap-1 text-2xs font-semibold text-slate-500">
                          <FileText className="w-3 h-3 text-slate-400" />
                          <span>Action Note &amp; Reason:</span>
                        </div>
                        <p className="italic text-slate-800 leading-relaxed pl-4 border-l-2 border-indigo-300">
                          &ldquo;{log.comment}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Immutable audit trail maintained for staffing lifecycle compliance.</span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenFullStatusLogsPage && (
              <button
                type="button"
                id="btn-open-full-logs-page"
                onClick={() => {
                  onClose();
                  onOpenFullStatusLogsPage(candidate);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                <History className="w-3.5 h-3.5" />
                <span>Open in Full Status Logs Page</span>
              </button>
            )}

            <button
              type="button"
              id="btn-close-status-log-footer"
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
