import React, { useState, useId, useRef, useEffect, useMemo } from 'react';
import { Candidate, CandidateStatusRule, UserRole } from '../types';
import { formatFullDateTime } from '../utils/dateUtils';
import { StatusAuditLogModal } from './StatusAuditLogModal';
import {
  UserCheck,
  Check,
  X,
  Clock,
  Archive,
  Lock,
  CheckSquare,
  Square,
  MinusSquare,
  Search,
  CheckCheck,
  ShieldAlert,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCw,
  History,
} from 'lucide-react';

interface PendingApprovalsViewProps {
  candidates: Candidate[];
  statuses: CandidateStatusRule[];
  userRole: UserRole;
  onApproveCandidate: (candidate: Candidate) => void;
  onRejectApproval: (candidate: Candidate) => void;
  onBatchApproveCandidates?: (candidates: Candidate[]) => void;
  onBatchRejectApprovals?: (candidates: Candidate[]) => void;
  onOpenStatusLog?: (candidate: Candidate) => void;
}

type SortColumn = 'status' | 'name' | 'date' | 'recruiter';

export const PendingApprovalsView: React.FC<PendingApprovalsViewProps> = ({
  candidates,
  statuses,
  userRole,
  onApproveCandidate,
  onRejectApproval,
  onBatchApproveCandidates,
  onBatchRejectApprovals,
  onOpenStatusLog,
}) => {
  const isAdmin = userRole === 'admin';
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortColumn>('status');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [statusLogCandidate, setStatusLogCandidate] = useState<Candidate | null>(null);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  const pendingList = candidates.filter((c) => c.lifecycleState === 'pending_approval');

  // Status options calculation with counts
  const statusOptions = useMemo(() => {
    const map: Record<string, { id: string; name: string; count: number }> = {};

    pendingList.forEach((cand) => {
      const key = cand.statusId || cand.statusName;
      if (!map[key]) {
        map[key] = {
          id: cand.statusId,
          name: cand.statusName,
          count: 0,
        };
      }
      map[key].count += 1;
    });

    if (statuses) {
      statuses
        .filter((s) => s.archive && s.approvalRequired)
        .forEach((s) => {
          if (!map[s.id]) {
            map[s.id] = {
              id: s.id,
              name: s.name,
              count: 0,
            };
          }
        });
    }

    return Object.values(map).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [pendingList, statuses]);

  const selectedStatusRule = statusOptions.find(
    (s) => s.id === statusFilter || s.name === statusFilter
  );

  // Filtered and sorted list
  const filteredAndSortedPending = useMemo(() => {
    const filtered = pendingList.filter((cand) => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches =
          cand.name.toLowerCase().includes(term) ||
          cand.role.toLowerCase().includes(term) ||
          cand.recruiterName.toLowerCase().includes(term) ||
          cand.statusName.toLowerCase().includes(term) ||
          (cand.notes && cand.notes.toLowerCase().includes(term));
        if (!matches) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (cand.statusId !== statusFilter && cand.statusName !== statusFilter) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'status') {
        cmp = a.statusName.localeCompare(b.statusName);
      } else if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortBy === 'date') {
        const da = new Date(a.approvalRequestedAt || a.statusAssignedAt).getTime();
        const db = new Date(b.approvalRequestedAt || b.statusAssignedAt).getTime();
        cmp = da - db;
      } else if (sortBy === 'recruiter') {
        cmp = (a.recruiterName || '').localeCompare(b.recruiterName || '');
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [pendingList, searchTerm, statusFilter, sortBy, sortDirection]);

  // Clean up selectedIds if any were approved/removed
  useEffect(() => {
    const validPendingIds = new Set(pendingList.map((c) => c.id));
    setSelectedIds((prev) => prev.filter((id) => validPendingIds.has(id)));
  }, [candidates]);

  // Manage indeterminate state on Select All checkbox
  const visibleIds = filteredAndSortedPending.map((c) => c.id);
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.includes(id)).length;
  const isAllVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const isPartiallySelected = selectedVisibleCount > 0 && selectedVisibleCount < visibleIds.length;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isPartiallySelected;
    }
  }, [isPartiallySelected]);

  if (!isAdmin) {
    return (
      <div id="approvals-access-denied" className="py-12 max-w-lg mx-auto text-center space-y-4">
        <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Admin Approval Authority Required</h3>
          <p className="text-sm text-slate-500 mt-1">
            Recruiters cannot approve archiving requests. Only Admins can review candidates submitted for archive approval.
          </p>
        </div>
      </div>
    );
  }

  // Selection handlers
  const handleToggleSelectCandidate = (candidateId: string) => {
    setSelectedIds((prev) =>
      prev.includes(candidateId) ? prev.filter((id) => id !== candidateId) : [...prev, candidateId]
    );
  };

  const handleToggleSelectAll = () => {
    if (isAllVisibleSelected) {
      // Deselect all visible
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      // Select all visible
      const merged = new Set([...selectedIds, ...visibleIds]);
      setSelectedIds(Array.from(merged));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleSelectAllPending = () => {
    setSelectedIds(pendingList.map((c) => c.id));
  };

  const handleSortToggle = (col: SortColumn) => {
    if (sortBy === col) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDirection('asc');
    }
  };

  const hasActiveFilters = searchTerm.trim() !== '' || statusFilter !== 'all';

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  // Batch actions
  const selectedCandidates = pendingList.filter((c) => selectedIds.includes(c.id));

  const handleBatchApprove = () => {
    if (selectedCandidates.length === 0) return;
    if (onBatchApproveCandidates) {
      onBatchApproveCandidates(selectedCandidates);
    } else {
      selectedCandidates.forEach((c) => onApproveCandidate(c));
    }
    handleClearSelection();
  };

  const handleBatchReject = () => {
    if (selectedCandidates.length === 0) return;
    if (onBatchRejectApprovals) {
      onBatchRejectApprovals(selectedCandidates);
    } else {
      selectedCandidates.forEach((c) => onRejectApproval(c));
    }
    handleClearSelection();
  };

  return (
    <div id="pending-approvals-section" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 id="page-title-approvals" className="text-2xl font-bold text-slate-900 tracking-tight">
              Pending Archive Approvals
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              {pendingList.length} Awaiting Signoff
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Status rules configured with <span className="font-medium text-slate-800">Archive = Yes &amp; Approval = Yes</span> require Admin signoff before candidates move to the Archive and their retention timer begins.
          </p>
        </div>

        {/* Quick select all button if multiple pending items exist */}
        {pendingList.length > 1 && (
          <div className="flex items-center gap-2 shrink-0">
            {selectedIds.length === pendingList.length ? (
              <button
                type="button"
                id="btn-clear-all-selection"
                onClick={handleClearSelection}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Clear Selection
              </button>
            ) : (
              <button
                type="button"
                id="btn-select-all-pending"
                onClick={handleSelectAllPending}
                className="text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Select All ({pendingList.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Floating or Top Bulk Actions Toolbar when candidates are selected */}
      {selectedIds.length > 0 && (
        <div
          id="approvals-bulk-actions-toolbar"
          className="sticky top-20 z-30 bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{selectedIds.length} Selected</span>
            </div>
            <span className="text-xs text-slate-300 hidden sm:inline">
              of {pendingList.length} total pending approvals
            </span>
            <button
              type="button"
              id="btn-bulk-clear-selection"
              onClick={handleClearSelection}
              className="text-2xs text-slate-400 hover:text-white underline cursor-pointer"
            >
              Deselect All
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Bulk Reject */}
            <button
              type="button"
              id="btn-bulk-reject-approvals"
              onClick={handleBatchReject}
              className="px-3.5 py-2 text-xs font-semibold text-rose-200 hover:text-white bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
            >
              <X className="w-3.5 h-3.5 text-rose-400" />
              Reject Selected ({selectedIds.length})
            </button>

            {/* Bulk Approve */}
            <button
              type="button"
              id="btn-bulk-approve-archivals"
              onClick={handleBatchApprove}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-indigo-950/50 hover:shadow-indigo-500/20"
            >
              <Check className="w-4 h-4" />
              Approve Selected &amp; Archive ({selectedIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Controls: Filter & Sort Bar (Similar to Archived Candidates) */}
      <div className="space-y-2.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="input-search-pending-approvals"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search candidate, status, role, recruiter..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter Dropdown */}
            <div className="flex items-center gap-1.5 shrink-0">
              <label htmlFor="filter-pending-status" className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Status:</span>
              </label>
              <select
                id="filter-pending-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`text-xs py-1.5 pl-2.5 pr-7 border rounded-lg font-medium transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-200 ${
                  statusFilter !== 'all'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <option value="all">All Statuses ({pendingList.length})</option>
                {statusOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name} ({opt.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Sort by Dropdown */}
            <div className="flex items-center gap-1.5 shrink-0">
              <label htmlFor="select-pending-sort" className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <span>Sort by:</span>
              </label>
              <select
                id="select-pending-sort"
                value={`${sortBy}-${sortDirection}`}
                onChange={(e) => {
                  const [col, dir] = e.target.value.split('-') as [SortColumn, 'asc' | 'desc'];
                  setSortBy(col);
                  setSortDirection(dir);
                }}
                className="text-xs py-1.5 pl-2.5 pr-7 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-200"
              >
                <option value="status-asc">Status (A-Z)</option>
                <option value="status-desc">Status (Z-A)</option>
                <option value="name-asc">Candidate Name (A-Z)</option>
                <option value="name-desc">Candidate Name (Z-A)</option>
                <option value="date-desc">Requested Date (Newest)</option>
                <option value="date-asc">Requested Date (Oldest)</option>
                <option value="recruiter-asc">Recruiter (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filters Badges Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 px-1 text-xs">
            <span className="text-slate-400 font-medium">Active Filters:</span>

            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-800 border border-indigo-200">
                <span>Status: <strong>{selectedStatusRule?.name || statusFilter}</strong></span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className="hover:text-indigo-950 p-0.5 rounded-full hover:bg-indigo-100 cursor-pointer"
                  title="Remove status filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {searchTerm.trim() !== '' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                <span>Keyword: &quot;{searchTerm}&quot;</span>
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="hover:text-slate-950 p-0.5 rounded-full hover:bg-slate-200 cursor-pointer"
                  title="Clear search keyword"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              id="btn-reset-pending-filters"
              onClick={handleResetFilters}
              className="text-xs text-indigo-600 hover:text-indigo-800 underline font-medium cursor-pointer ml-1"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Approvals Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table List Header / Master Select All Bar */}
        {pendingList.length > 0 && (
          <div className="p-3.5 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Multi-selection Checkbox Header */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  ref={selectAllCheckboxRef}
                  type="checkbox"
                  id="checkbox-select-all-approvals"
                  checked={isAllVisibleSelected}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="font-semibold text-slate-700">
                  {isAllVisibleSelected
                    ? `All ${visibleIds.length} Selected`
                    : selectedVisibleCount > 0
                    ? `${selectedVisibleCount} of ${visibleIds.length} Selected`
                    : 'Select All Visible'}
                </span>
              </label>

              {selectedIds.length > 0 && (
                <span className="text-2xs text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  {selectedIds.length} total selected
                </span>
              )}
            </div>

            {/* Column Quick Sort Indicators */}
            <div className="flex items-center gap-2 text-slate-500">
              <span className="text-2xs uppercase tracking-wider font-semibold text-slate-400">Quick Sort:</span>
              <button
                type="button"
                onClick={() => handleSortToggle('status')}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-2xs font-semibold cursor-pointer transition-colors ${
                  sortBy === 'status'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'hover:bg-slate-200 text-slate-600'
                }`}
              >
                <span>Status</span>
                {sortBy === 'status' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
              </button>
              <button
                type="button"
                onClick={() => handleSortToggle('name')}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-2xs font-semibold cursor-pointer transition-colors ${
                  sortBy === 'name'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'hover:bg-slate-200 text-slate-600'
                }`}
              >
                <span>Candidate</span>
                {sortBy === 'name' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
              </button>
              <button
                type="button"
                onClick={() => handleSortToggle('date')}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-2xs font-semibold cursor-pointer transition-colors ${
                  sortBy === 'date'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'hover:bg-slate-200 text-slate-600'
                }`}
              >
                <span>Date</span>
                {sortBy === 'date' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
              </button>
            </div>
          </div>
        )}

        {pendingList.length === 0 ? (
          <div className="py-14 text-center text-slate-500">
            <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-800 text-base">No pending approvals</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              When a recruiter assigns a status like &quot;Not Interested&quot;, &quot;Already Joined Another Company&quot;, or &quot;Duplicate Profile&quot;, the approval request will appear here for Admin review.
            </p>
          </div>
        ) : filteredAndSortedPending.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <p className="font-semibold text-slate-800">No matching pending approvals</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your status filter or clearing your search term.</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredAndSortedPending.map((cand) => {
              const rule = statuses.find((s) => s.id === cand.statusId);
              const retentionDays = rule?.deleteAfterDays ?? 30;
              const isSelected = selectedIds.includes(cand.id);

              return (
                <div
                  key={cand.id}
                  id={`approval-row-${cand.id}`}
                  className={`p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-indigo-50/50 border-l-4 border-l-indigo-600 pl-4'
                      : 'hover:bg-slate-50/70 border-l-4 border-l-transparent pl-4'
                  }`}
                >
                  {/* Left: Checkbox + Candidate info */}
                  <div className="flex items-start gap-3.5 flex-1">
                    {/* Multi-selection Checkbox */}
                    <div className="pt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        id={`checkbox-select-${cand.id}`}
                        aria-label={`Select ${cand.name} for approval or rejection`}
                        checked={isSelected}
                        onChange={() => handleToggleSelectCandidate(cand.id)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-semibold text-slate-900 text-base">{cand.name}</span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          pending admin approval for deletion
                        </span>
                        {isSelected && (
                          <span className="text-3xs font-bold uppercase tracking-wider bg-indigo-600 text-white px-1.5 py-0.5 rounded">
                            Selected
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                        <span><strong>Role:</strong> {cand.role}</span>
                        <span>•</span>
                        <span><strong>Recruiter:</strong> {cand.recruiterName}</span>
                        <span>•</span>
                        <span><strong>Requested:</strong> {formatFullDateTime(cand.approvalRequestedAt)}</span>
                      </div>

                      {cand.notes && (
                        <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-2 max-w-2xl mt-1">
                          &quot;{cand.notes}&quot;
                        </p>
                      )}

                      {/* Rule to be applied after approval */}
                      <div className="flex flex-wrap items-center gap-2 text-xs pt-1 text-indigo-900">
                        <span className="font-semibold">Target Status:</span>
                        <button
                          type="button"
                          id={`btn-pending-status-log-${cand.id}`}
                          onClick={() => {
                            if (onOpenStatusLog) {
                              onOpenStatusLog(cand);
                            } else {
                              setStatusLogCandidate(cand);
                            }
                          }}
                          className="px-2.5 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 font-semibold text-indigo-800 hover:text-indigo-950 transition-all cursor-pointer inline-flex items-center gap-1.5 group shadow-2xs"
                          title="Click underlined status to open full status change audit logs for this profile"
                        >
                          <span className="underline underline-offset-4 decoration-indigo-500 hover:decoration-indigo-800 font-bold group-hover:text-indigo-950">
                            {cand.statusName}
                          </span>
                          <History className="w-3 h-3 text-indigo-500 group-hover:text-indigo-700 shrink-0" />
                        </button>
                        <span className="text-slate-400">→</span>
                        <span className="text-slate-600">
                          Upon approval: Moves to Archive with{' '}
                          <strong className="text-indigo-700">{retentionDays}-Day</strong> retention timer.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Individual reject & approve */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      id={`btn-reject-approval-${cand.id}`}
                      onClick={() => onRejectApproval(cand)}
                      className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <X className="w-4 h-4 text-slate-500" />
                      Reject &amp; Keep Active
                    </button>

                    <button
                      type="button"
                      id={`btn-approve-archive-${cand.id}`}
                      onClick={() => onApproveCandidate(cand)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Approve &amp; Archive
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer info */}
        {pendingList.length > 0 && (
          <div className="p-4 bg-slate-50/70 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              Tip: Sort by status or filter by a specific status above, then select candidates to approve or reject in bulk.
            </span>
            <span className="text-slate-400">
              Showing {filteredAndSortedPending.length} of {pendingList.length} pending
            </span>
          </div>
        )}
      </div>

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


