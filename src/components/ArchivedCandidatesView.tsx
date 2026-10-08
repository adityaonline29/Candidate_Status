import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Candidate, CandidateStatusRule, UserRole } from '../types';
import { formatShortDate } from '../utils/dateUtils';
import { ViewCommentsModal } from './ViewCommentsModal';
import { StatusAuditLogModal } from './StatusAuditLogModal';
import {
  Archive,
  RotateCcw,
  Trash2,
  Search,
  Lock,
  Clock,
  CheckCircle2,
  Calendar,
  FastForward,
  Info,
  MessageSquare,
  Filter,
  X,
  RotateCw,
  CheckSquare,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCheck,
  History,
} from 'lucide-react';

interface ArchivedCandidatesViewProps {
  candidates: Candidate[];
  statuses?: CandidateStatusRule[];
  userRole: UserRole;
  onRestoreCandidate: (candidate: Candidate) => void;
  onPermanentDeleteCandidate: (candidate: Candidate) => void;
  onSimulateTimeAdvance: (days: number) => void;
  onTriggerCleanupExpired: () => void;
  onBatchRestoreCandidates?: (candidates: Candidate[]) => void;
  onBatchPermanentDeleteCandidates?: (candidates: Candidate[]) => void;
  onAddComment?: (candidateId: string, text: string) => void;
  onEditComment?: (candidateId: string, commentId: string, newText: string) => void;
  onDeleteComment?: (candidateId: string, commentId: string) => void;
  onOpenStatusLog?: (candidate: Candidate) => void;
}

type SortColumn = 'name' | 'status' | 'date' | 'days';

export const ArchivedCandidatesView: React.FC<ArchivedCandidatesViewProps> = ({
  candidates,
  statuses,
  userRole,
  onRestoreCandidate,
  onPermanentDeleteCandidate,
  onSimulateTimeAdvance,
  onTriggerCleanupExpired,
  onBatchRestoreCandidates,
  onBatchPermanentDeleteCandidates,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onOpenStatusLog,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'urgent' | 'regular'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [activeCommentsCandidateId, setActiveCommentsCandidateId] = useState<string | null>(null);
  const [statusLogCandidate, setStatusLogCandidate] = useState<Candidate | null>(null);

  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  const currentCommentsCandidate = useMemo(() => {
    if (!activeCommentsCandidateId) return null;
    return candidates.find((c) => c.id === activeCommentsCandidateId) || null;
  }, [candidates, activeCommentsCandidateId]);

  const isAdmin = userRole === 'admin';

  // Section 6: Recruiters/Salespersons must NOT be able to view, search, open, or edit archived candidates
  if (!isAdmin) {
    return (
      <div id="archived-access-denied-view" className="py-12 max-w-2xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900">Restricted Access — Admin Only</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Recruiters and salespersons are strictly restricted from viewing, searching, opening, or editing archived candidate profiles (Rule 6).
          </p>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 text-left space-y-2">
          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-indigo-600" />
            Compliance &amp; Data Retention Policy:
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-500">
            <li>Candidates moved to Archive are queued for scheduled deletion.</li>
            <li>Archived profiles are isolated to maintain recruiter pipeline focus and compliance.</li>
            <li>To view or restore candidates from this queue, switch to the Admin role using the role selector in the top bar.</li>
          </ul>
        </div>
      </div>
    );
  }

  // Filter archived candidates
  const archivedCandidates = candidates.filter(
    (c) => c.lifecycleState === 'archived'
  );

  // Status options calculation with counts
  const statusOptions = useMemo(() => {
    const map: Record<string, { id: string; name: string; count: number }> = {};

    archivedCandidates.forEach((cand) => {
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
        .filter((s) => s.archive)
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
  }, [archivedCandidates, statuses]);

  const selectedStatusRule = statusOptions.find(
    (s) => s.id === statusFilter || s.name === statusFilter
  );

  // Clean up selectedIds if candidates are removed/restored
  useEffect(() => {
    const validArchivedIds = new Set(archivedCandidates.map((c) => c.id));
    setSelectedIds((prev) => prev.filter((id) => validArchivedIds.has(id)));
  }, [candidates]);

  // Filter candidates
  const filteredCandidates = useMemo(() => {
    const filtered = archivedCandidates.filter((cand) => {
      const matchesSearch =
        cand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cand.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cand.statusName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cand.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cand.recruiterName && cand.recruiterName.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter !== 'all') {
        if (cand.statusId !== statusFilter && cand.statusName !== statusFilter) {
          return false;
        }
      }

      if (urgencyFilter === 'urgent') {
        return cand.daysRemaining !== null && cand.daysRemaining <= 7;
      }
      if (urgencyFilter === 'regular') {
        return cand.daysRemaining !== null && cand.daysRemaining > 7;
      }
      return true;
    });

    // Sort candidates
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'status') {
        cmp = a.statusName.localeCompare(b.statusName);
      } else if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortBy === 'days') {
        const da = a.daysRemaining ?? -999;
        const db = b.daysRemaining ?? -999;
        cmp = da - db;
      } else if (sortBy === 'date') {
        const da = new Date(a.archivedAt || a.statusAssignedAt).getTime();
        const db = new Date(b.archivedAt || b.statusAssignedAt).getTime();
        cmp = da - db;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [archivedCandidates, searchTerm, statusFilter, urgencyFilter, sortBy, sortDirection]);

  // Indeterminate checkbox state
  const visibleIds = filteredCandidates.map((c) => c.id);
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.includes(id)).length;
  const isAllVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const isPartiallySelected = selectedVisibleCount > 0 && selectedVisibleCount < visibleIds.length;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isPartiallySelected;
    }
  }, [isPartiallySelected]);

  // Selection handlers
  const handleToggleSelectCandidate = (candidateId: string) => {
    setSelectedIds((prev) =>
      prev.includes(candidateId) ? prev.filter((id) => id !== candidateId) : [...prev, candidateId]
    );
  };

  const handleToggleSelectAll = () => {
    if (isAllVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      const merged = new Set([...selectedIds, ...visibleIds]);
      setSelectedIds(Array.from(merged));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleSelectAllArchived = () => {
    setSelectedIds(archivedCandidates.map((c) => c.id));
  };

  // Batch actions
  const selectedCandidates = archivedCandidates.filter((c) => selectedIds.includes(c.id));

  const handleBatchRestore = () => {
    if (selectedCandidates.length === 0) return;
    if (onBatchRestoreCandidates) {
      onBatchRestoreCandidates(selectedCandidates);
    } else {
      selectedCandidates.forEach((c) => onRestoreCandidate(c));
    }
    handleClearSelection();
  };

  const handleBatchPermanentDelete = () => {
    if (selectedCandidates.length === 0) return;
    if (onBatchPermanentDeleteCandidates) {
      onBatchPermanentDeleteCandidates(selectedCandidates);
    } else {
      selectedCandidates.forEach((c) => onPermanentDeleteCandidate(c));
    }
    handleClearSelection();
  };

  const handleSortToggle = (column: SortColumn) => {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const dueForPermanentDeletionCount = archivedCandidates.filter(
    (c) => c.daysRemaining !== null && c.daysRemaining <= 0
  ).length;

  const hasActiveFilters =
    searchTerm.trim() !== '' || urgencyFilter !== 'all' || statusFilter !== 'all';

  const handleResetFilters = () => {
    setSearchTerm('');
    setUrgencyFilter('all');
    setStatusFilter('all');
  };

  return (
    <div id="archived-candidates-section" className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 id="page-title-archived" className="text-2xl font-bold text-slate-900 tracking-tight">
              Archived Candidates
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-900 text-white">
              Admin Vault
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Candidates moved to Archive under cleanup rules. Restoring a candidate cancels the deletion timer and returns them to the Active Database.
          </p>
        </div>

        {/* Simulation & Retention Controls */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <button
            type="button"
            id="btn-simulate-advance-7"
            onClick={() => onSimulateTimeAdvance(7)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
            title="Fast forward simulation by 7 days"
          >
            <FastForward className="w-3.5 h-3.5 text-indigo-600" />
            Simulate +7 Days
          </button>

          {dueForPermanentDeletionCount > 0 && (
            <button
              type="button"
              id="btn-trigger-cleanup-expired"
              onClick={onTriggerCleanupExpired}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer animate-pulse"
              title="Purge expired candidates per Rule 8"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Purge Expired ({dueForPermanentDeletionCount})
            </button>
          )}

          {archivedCandidates.length > 1 && (
            <button
              type="button"
              id="btn-select-all-archived"
              onClick={selectedIds.length === archivedCandidates.length ? handleClearSelection : handleSelectAllArchived}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {selectedIds.length === archivedCandidates.length ? 'Clear Selection' : `Select All (${archivedCandidates.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Floating or Top Bulk Actions Toolbar when archived candidates are selected */}
      {selectedIds.length > 0 && (
        <div
          id="archived-bulk-actions-toolbar"
          className="sticky top-20 z-30 bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{selectedIds.length} Selected</span>
            </div>
            <span className="text-xs text-slate-300 hidden sm:inline">
              of {archivedCandidates.length} total archived candidates
            </span>
            <button
              type="button"
              id="btn-bulk-clear-archived-selection"
              onClick={handleClearSelection}
              className="text-2xs text-slate-400 hover:text-white underline cursor-pointer"
            >
              Deselect All
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Bulk Restore Action */}
            <button
              type="button"
              id="btn-bulk-restore-candidates"
              onClick={handleBatchRestore}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-emerald-950/50 hover:shadow-emerald-500/20"
            >
              <RotateCcw className="w-4 h-4" />
              Restore Selected ({selectedIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Info notice about Rule 7 & Rule 8 */}
      <div className="p-3.5 bg-indigo-50/60 border border-indigo-200/80 rounded-xl text-xs text-indigo-900 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold">Candidate Lifecycle Governance:</span>
          <span className="text-indigo-800 ml-1">
            Archived candidates remain in this vault until their retention period expires, at which point permanent deletion executes automatically. Admin can restore candidates individually or in bulk at any time prior to deletion.
          </span>
        </div>
      </div>

      {/* Search & Filters Controls */}
      <div className="space-y-2.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="input-search-archived"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search candidate, status, role, recruiter..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter Dropdown */}
            <div className="flex items-center gap-1.5 shrink-0">
              <label htmlFor="filter-archived-status" className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Status:</span>
              </label>
              <select
                id="filter-archived-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`text-xs py-1.5 pl-2.5 pr-7 border rounded-lg font-medium transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-200 ${
                  statusFilter !== 'all'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <option value="all">All Statuses ({archivedCandidates.length})</option>
                {statusOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name} ({opt.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Sort by Dropdown */}
            <div className="flex items-center gap-1.5 shrink-0">
              <label htmlFor="select-archived-sort" className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <span>Sort:</span>
              </label>
              <select
                id="select-archived-sort"
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
                <option value="date-desc">Archived Date (Newest)</option>
                <option value="date-asc">Archived Date (Oldest)</option>
                <option value="days-asc">Days Remaining (Least first)</option>
                <option value="days-desc">Days Remaining (Most first)</option>
              </select>
            </div>

            {/* Urgency Filter Tabs */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                id="filter-urgency-all"
                onClick={() => setUrgencyFilter('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                  urgencyFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({archivedCandidates.length})
              </button>
              <button
                type="button"
                id="filter-urgency-urgent"
                onClick={() => setUrgencyFilter('urgent')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                  urgencyFilter === 'urgent'
                    ? 'bg-amber-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Expires ≤ 7d
              </button>
              <button
                type="button"
                id="filter-urgency-regular"
                onClick={() => setUrgencyFilter('regular')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                  urgencyFilter === 'regular'
                    ? 'bg-slate-800 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                &gt; 7d
              </button>
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

            {urgencyFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                <span>Expiry: <strong>{urgencyFilter === 'urgent' ? '≤ 7 Days' : '> 7 Days'}</strong></span>
                <button
                  type="button"
                  onClick={() => setUrgencyFilter('all')}
                  className="hover:text-amber-950 p-0.5 rounded-full hover:bg-amber-100 cursor-pointer"
                  title="Remove urgency filter"
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
                  title="Clear search term"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              id="btn-reset-archived-filters"
              onClick={handleResetFilters}
              className="text-xs text-indigo-600 hover:text-indigo-800 underline font-medium cursor-pointer ml-1"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Archive List Table (Matching Section 9 Specification) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table id="archived-candidates-table" className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                {/* Multi-selection Checkbox Header */}
                <th className="py-3.5 pl-4 pr-1 w-10">
                  <input
                    ref={selectAllCheckboxRef}
                    type="checkbox"
                    id="checkbox-select-all-archived"
                    aria-label="Select all archived candidates"
                    checked={isAllVisibleSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th
                  onClick={() => handleSortToggle('name')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Candidate</span>
                    {sortBy === 'name' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle('status')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    {sortBy === 'status' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle('date')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Archived On</span>
                    {sortBy === 'date' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSortToggle('days')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Days Remaining</span>
                    {sortBy === 'days' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-500">
                    <Archive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="font-semibold text-slate-800 text-base">
                      {archivedCandidates.length === 0
                        ? 'No archived candidates found'
                        : 'No candidates match your filter criteria'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {archivedCandidates.length === 0
                        ? 'Candidates will appear here when assigned an auto-archiving status (like Busy or Wrong Number) or once approved by Admin.'
                        : 'Try adjusting or resetting your status, urgency, or keyword filters to display archived profiles.'}
                    </p>
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
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((cand) => {
                  const days = cand.daysRemaining ?? 0;
                  const isExpiringSoon = days <= 7 && days > 0;
                  const isExpired = days <= 0;
                  const isSelected = selectedIds.includes(cand.id);

                  return (
                    <tr
                      key={cand.id}
                      id={`archived-row-${cand.id}`}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-indigo-50/50'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 pl-4 pr-1">
                        <input
                          type="checkbox"
                          id={`checkbox-select-archived-${cand.id}`}
                          aria-label={`Select ${cand.name} to restore`}
                          checked={isSelected}
                          onChange={() => handleToggleSelectCandidate(cand.id)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* Candidate Name & Info */}
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            <span>{cand.name}</span>
                            {isSelected && (
                              <span className="text-3xs font-bold uppercase tracking-wider bg-emerald-600 text-white px-1.5 py-0.5 rounded">
                                Selected
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{cand.role}</span>
                            <span>•</span>
                            <span>{cand.email}</span>
                          </div>
                          {cand.recruiterName && (
                            <div className="text-xs text-slate-400 mt-0.5">
                              Assigned Recruiter: {cand.recruiterName}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <button
                            type="button"
                            id={`btn-archived-status-log-${cand.id}`}
                            onClick={() => {
                              if (onOpenStatusLog) {
                                onOpenStatusLog(cand);
                              } else {
                                setStatusLogCandidate(cand);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-indigo-50 text-slate-800 hover:text-indigo-950 border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer group text-left shadow-2xs"
                            title="Click underlined status to open full status change audit logs for this profile"
                          >
                            <span className="underline underline-offset-4 decoration-indigo-500 hover:decoration-indigo-800 font-bold group-hover:text-indigo-700">
                              {cand.statusName}
                            </span>
                            <History className="w-3 h-3 text-indigo-500 group-hover:text-indigo-700 shrink-0" />
                          </button>
                          <button
                            type="button"
                            id={`btn-view-archived-comments-${cand.id}`}
                            onClick={() => setActiveCommentsCandidateId(cand.id)}
                            className="flex items-center gap-1 text-2xs text-[#006e88] hover:text-[#005a70] hover:underline font-semibold cursor-pointer transition-colors"
                            title="View comments and notes"
                          >
                            <MessageSquare className="w-3 h-3 text-[#006e88] shrink-0" />
                            <span>
                              {cand.comments && cand.comments.length > 0
                                ? `View Comments (${cand.comments.length})`
                                : cand.notes
                                ? 'View Comments'
                                : 'Comments'}
                            </span>
                          </button>
                        </div>
                      </td>

                      {/* Archived On */}
                      <td className="py-4 px-4 text-slate-700 whitespace-nowrap font-medium text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatShortDate(cand.archivedAt)}
                        </div>
                      </td>

                      {/* Days Remaining */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center justify-center min-w-[32px] px-2.5 py-1 rounded-lg text-xs font-bold ${
                            isExpired
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : isExpiringSoon
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {isExpired ? '0 (Expired)' : days}
                        </span>
                      </td>

                      {/* Actions: Restore & Permanent Delete */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            id={`btn-restore-${cand.id}`}
                            onClick={() => onRestoreCandidate(cand)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
                            title="Restore candidate to active database"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Restore
                          </button>

                          <button
                            type="button"
                            id={`btn-delete-permanently-${cand.id}`}
                            onClick={() => onPermanentDeleteCandidate(cand)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Permanently delete now"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Restoring cancels the deletion timer and reactivates recruiter access.
            </span>
          </div>
          <span className="text-slate-400">
            Total in Archive: {archivedCandidates.length}
          </span>
        </div>
      </div>

      {/* View Comments Modal */}
      <ViewCommentsModal
        isOpen={!!currentCommentsCandidate}
        candidate={currentCommentsCandidate}
        onClose={() => setActiveCommentsCandidateId(null)}
        onAddComment={(candidateId, text) => {
          if (onAddComment) onAddComment(candidateId, text);
        }}
        onEditComment={onEditComment}
        onDeleteComment={onDeleteComment}
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
