import React, { useState, useMemo } from 'react';
import { Candidate, CandidateStatusRule, UserRole } from '../types';
import { StatusChangeConfirmationModal } from './StatusChangeConfirmationModal';
import { ViewCommentsModal } from './ViewCommentsModal';
import { StatusAuditLogModal } from './StatusAuditLogModal';
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  Archive,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  Info,
  ChevronDown,
  MessageSquare,
  Flag,
  History,
} from 'lucide-react';

interface ActiveCandidatesViewProps {
  candidates: Candidate[];
  statuses: CandidateStatusRule[];
  userRole: UserRole;
  onAssignStatus: (candidateId: string, newStatusId: string, comment?: string) => void;
  onAddNewActiveCandidate: (name: string, role: string, email: string, phone: string) => void;
  onAddComment?: (candidateId: string, text: string) => void;
  onEditComment?: (candidateId: string, commentId: string, newText: string) => void;
  onDeleteComment?: (candidateId: string, commentId: string) => void;
  onOpenStatusLog?: (candidate: Candidate) => void;
}

export const ActiveCandidatesView: React.FC<ActiveCandidatesViewProps> = ({
  candidates,
  statuses,
  userRole,
  onAssignStatus,
  onAddNewActiveCandidate,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onOpenStatusLog,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Status Change Confirmation Modal state
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    candidate: Candidate;
    newStatusRule: CandidateStatusRule;
  } | null>(null);

  // View Comments Modal state
  const [activeCommentsCandidateId, setActiveCommentsCandidateId] = useState<string | null>(null);
  const [statusLogCandidate, setStatusLogCandidate] = useState<Candidate | null>(null);

  // Dynamic candidate lookup
  const currentCommentsCandidate = useMemo(() => {
    if (!activeCommentsCandidateId) return null;
    return candidates.find((c) => c.id === activeCommentsCandidateId) || null;
  }, [candidates, activeCommentsCandidateId]);

  // New Candidate form state
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Active, restored, and pending approval candidates
  const activeCandidates = candidates.filter(
    (c) =>
      c.lifecycleState === 'active' ||
      c.lifecycleState === 'restored' ||
      c.lifecycleState === 'pending_approval'
  );

  const filteredCandidates = activeCandidates.filter((cand) => {
    const matchesSearch =
      cand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cand.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cand.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cand.statusName.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter !== 'all' && cand.statusId !== statusFilter) return false;
    return true;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newRole.trim()) return;
    onAddNewActiveCandidate(
      newName.trim(),
      newRole.trim(),
      newEmail.trim() || `${newName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      newPhone.trim() || '+1 (555) 019-2834'
    );
    setNewName('');
    setNewRole('');
    setNewEmail('');
    setNewPhone('');
    setShowAddModal(false);
  };

  return (
    <div id="active-candidates-section" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 id="page-title-active-candidates" className="text-2xl font-bold text-slate-900 tracking-tight">
              Active Candidate Database
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {activeCandidates.length} Active Candidates
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Recruiters and Admins work with active candidates here. Assigning statuses will trigger configured archiving rules in real-time.
          </p>
        </div>

        <button
          type="button"
          id="btn-add-candidate"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Users className="w-4 h-4" />
          + Add Candidate
        </button>
      </div>

      {/* Interactive Workflow Guide */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-slate-800">Status Trigger Simulation:</span>
          <span className="ml-1">
            Change any candidate&apos;s status using the dropdown.
            Assigning a status configured with <strong className="text-indigo-600">Archive = Yes</strong> will immediately transfer them to the Archive or route them to Admin Approval.
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="input-search-active"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search candidate name, email, or role..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-medium">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-200"
          >
            <option value="all">All Statuses</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table id="active-candidates-table" className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Candidate</th>
                <th className="py-3.5 px-4">Recruiter</th>
                <th className="py-3.5 px-4">Current Status</th>
                <th className="py-3.5 px-4">Lifecycle State</th>
                <th className="py-3.5 px-4">Notes &amp; Logs</th>
                <th className="py-3.5 px-4">Assign New Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No active candidates match your filter</p>
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((cand) => {
                  const isRestored = cand.lifecycleState === 'restored';
                  const isPendingApproval = cand.lifecycleState === 'pending_approval';
                  const currentRule = statuses.find((s) => s.id === cand.statusId);
                  const candStatusComment =
                    cand.statusLogs && cand.statusLogs.length > 0
                      ? [...cand.statusLogs]
                          .reverse()
                          .find(
                            (l) =>
                              l.newStatusId === cand.statusId ||
                              l.newStatusName.toLowerCase() === cand.statusName.toLowerCase()
                          )?.comment || cand.statusLogs[cand.statusLogs.length - 1].comment
                      : cand.notes ||
                        cand.comments?.find((c) => c.isStatusChange)?.text ||
                        cand.comments?.[0]?.text;

                  return (
                    <tr
                      key={cand.id}
                      id={`candidate-row-${cand.id}`}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isPendingApproval ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Candidate Name & Details */}
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-2 flex-wrap">
                            {cand.name}
                            {isRestored && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <RotateCcw className="w-2.5 h-2.5" />
                                Restored to Active DB
                              </span>
                            )}
                            {isPendingApproval && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 text-3xs font-normal">
                                <Flag className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                                <span>pending admin approval for deletion</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{cand.role}</span>
                            <span>•</span>
                            <span>{cand.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Recruiter */}
                      <td className="py-4 px-4 text-xs text-slate-600">
                        {cand.recruiterName || 'Unassigned'}
                      </td>

                      {/* Current Status & Option to see comment */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <button
                            type="button"
                            id={`btn-active-status-log-${cand.id}`}
                            onClick={() => {
                              if (onOpenStatusLog) {
                                onOpenStatusLog(cand);
                              } else {
                                setStatusLogCandidate(cand);
                              }
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer group shadow-2xs ${
                              isPendingApproval
                                ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                                : 'bg-slate-100 text-slate-800 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-900 hover:border-indigo-300'
                            }`}
                            title="Click underlined status to open full status change audit logs for this profile"
                          >
                            <span className="underline underline-offset-4 decoration-indigo-500 hover:decoration-indigo-800 font-bold group-hover:text-indigo-900">
                              {cand.statusName}
                            </span>
                            <History className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                          </button>
                          {candStatusComment && (
                            <button
                              type="button"
                              onClick={() => setActiveCommentsCandidateId(cand.id)}
                              className="flex items-center gap-1 text-2xs text-slate-500 hover:text-indigo-600 italic truncate max-w-[200px] text-left transition-colors cursor-pointer group"
                              title={`Status Comment: "${candStatusComment}" — Click to view in Notes & Logs`}
                            >
                              <MessageSquare className="w-3 h-3 text-indigo-400 group-hover:text-indigo-600 shrink-0" />
                              <span className="truncate">&quot;{candStatusComment}&quot;</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Lifecycle State */}
                      <td className="py-4 px-4">
                        {isPendingApproval ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Pending Approval
                          </span>
                        ) : isRestored ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Restored (Active)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            Active
                          </span>
                        )}
                      </td>

                      {/* Notes & Logs button */}
                      <td className="py-4 px-4">
                        <button
                          type="button"
                          onClick={() => setActiveCommentsCandidateId(cand.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {cand.comments && cand.comments.length > 0
                              ? `${cand.comments.length} Note${cand.comments.length > 1 ? 's' : ''}`
                              : 'Add Note'}
                          </span>
                        </button>
                      </td>

                      {/* Assign Status Dropdown (Enforcing Rule 10: Disabled statuses cannot be assigned) */}
                      <td className="py-4 px-4">
                        <div className="relative inline-block w-64">
                          <select
                            id={`select-status-${cand.id}`}
                            value={cand.statusId}
                            onChange={(e) => {
                              const selectedRule = statuses.find((s) => s.id === e.target.value);
                              if (selectedRule && e.target.value !== cand.statusId) {
                                setPendingStatusChange({
                                  candidate: cand,
                                  newStatusRule: selectedRule,
                                });
                              }
                            }}
                            className="w-full appearance-none px-3 py-1.5 text-xs font-medium bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-slate-800 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer shadow-2xs"
                          >
                            {statuses.map((status) => {
                              return (
                                <option
                                  key={status.id}
                                  value={status.id}
                                >
                                  {status.name}{' '}
                                  {status.archive
                                    ? status.approvalRequired
                                      ? `→ Archive (Req. Approval, ${status.deleteAfterDays}d)`
                                      : `→ Direct Archive (${status.deleteAfterDays}d)`
                                    : '→ Remains Active'}
                                </option>
                              );
                            })}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for adding a new candidate */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-md w-full space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900">Add Candidate to Active Database</h3>
            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Candidate Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Jordan Hayes"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Job Role *</label>
                <input
                  type="text"
                  required
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="jordan.h@example.com"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Phone</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+1 (555) 304-9821"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  Save Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Comments Modal */}
      <ViewCommentsModal
        isOpen={!!currentCommentsCandidate}
        candidate={currentCommentsCandidate}
        onClose={() => setActiveCommentsCandidateId(null)}
        onAddComment={onAddComment || (() => {})}
        onEditComment={onEditComment}
        onDeleteComment={onDeleteComment}
      />

      {/* Status Change Confirmation Modal with mandatory comment & logs */}
      <StatusChangeConfirmationModal
        isOpen={!!pendingStatusChange}
        candidate={pendingStatusChange?.candidate || null}
        newStatusRule={pendingStatusChange?.newStatusRule || null}
        onClose={() => setPendingStatusChange(null)}
        onConfirm={(candidateId, newStatusId, comment) => {
          onAssignStatus(candidateId, newStatusId, comment);
          setPendingStatusChange(null);
        }}
      />

      {/* Status Audit Log Modal */}
      <StatusAuditLogModal
        isOpen={!!statusLogCandidate}
        candidate={statusLogCandidate}
        onClose={() => setStatusLogCandidate(null)}
        onOpenFullStatusLogsPage={onOpenStatusLog}
      />
    </div>
  );
};
