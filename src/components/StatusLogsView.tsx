/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Candidate, CandidateStatusRule, UserRole } from '../types';
import { formatCommentTimestamp, formatFullDateTime } from '../utils/dateUtils';
import {
  History,
  Search,
  Filter,
  ArrowRight,
  User,
  Shield,
  Clock,
  Calendar,
  FileText,
  RotateCcw,
  Download,
  UserCheck,
  CheckCircle2,
  Sparkles,
  ArrowUpDown,
  X,
  ExternalLink,
  ChevronDown,
  Layers,
  Archive,
  ArrowUp,
  ArrowDown,
  Info,
} from 'lucide-react';

export interface EnrichedStatusLog {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateRole: string;
  candidateEmail: string;
  candidateRecruiter: string;
  currentStatusName: string;
  currentLifecycle: string;
  previousStatusId: string;
  previousStatusName: string;
  newStatusId: string;
  newStatusName: string;
  comment: string;
  changedBy: string;
  timestamp: string;
}

interface StatusLogsViewProps {
  candidates: Candidate[];
  statuses: CandidateStatusRule[];
  userRole: UserRole;
  preselectedCandidateId?: string | null;
  onClearPreselection?: () => void;
  onSelectCandidateProfile?: (candidate: Candidate) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const StatusLogsView: React.FC<StatusLogsViewProps> = ({
  candidates,
  statuses,
  userRole,
  preselectedCandidateId,
  onClearPreselection,
  onSelectCandidateProfile,
  onNavigateToTab,
}) => {
  // State: filters & search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    preselectedCandidateId || 'all'
  );
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');

  // Sync if preselectedCandidateId changes from external click
  React.useEffect(() => {
    if (preselectedCandidateId) {
      setSelectedCandidateId(preselectedCandidateId);
    }
  }, [preselectedCandidateId]);

  // Aggregate all logs from all candidates
  const allLogs: EnrichedStatusLog[] = useMemo(() => {
    const list: EnrichedStatusLog[] = [];

    candidates.forEach((cand) => {
      if (cand.statusLogs && cand.statusLogs.length > 0) {
        cand.statusLogs.forEach((log) => {
          list.push({
            id: log.id || `${cand.id}-${log.timestamp}`,
            candidateId: cand.id,
            candidateName: cand.name,
            candidateRole: cand.role,
            candidateEmail: cand.email,
            candidateRecruiter: cand.recruiterName || 'Unassigned',
            currentStatusName: cand.statusName,
            currentLifecycle: cand.lifecycleState,
            previousStatusId: log.previousStatusId,
            previousStatusName: log.previousStatusName,
            newStatusId: log.newStatusId,
            newStatusName: log.newStatusName,
            comment: log.comment,
            changedBy: log.changedBy,
            timestamp: log.timestamp,
          });
        });
      } else {
        // Fallback initial log if no explicit statusLogs recorded
        list.push({
          id: `log-synth-${cand.id}`,
          candidateId: cand.id,
          candidateName: cand.name,
          candidateRole: cand.role,
          candidateEmail: cand.email,
          candidateRecruiter: cand.recruiterName || 'Unassigned',
          currentStatusName: cand.statusName,
          currentLifecycle: cand.lifecycleState,
          previousStatusId: 'initial',
          previousStatusName: 'Initial Profile Creation',
          newStatusId: cand.statusId,
          newStatusName: cand.statusName,
          comment: cand.notes || `Initial status "${cand.statusName}" assigned to candidate profile.`,
          changedBy: cand.recruiterName || 'System',
          timestamp: cand.statusAssignedAt || new Date().toISOString(),
        });
      }
    });

    return list;
  }, [candidates]);

  // Distinct list of actors (who changed status)
  const distinctActors = useMemo(() => {
    const set = new Set<string>();
    allLogs.forEach((l) => {
      if (l.changedBy) set.add(l.changedBy);
    });
    return Array.from(set).sort();
  }, [allLogs]);

  // Filtered and sorted logs
  const filteredLogs = useMemo(() => {
    return allLogs
      .filter((log) => {
        // Filter by Candidate
        if (selectedCandidateId !== 'all' && log.candidateId !== selectedCandidateId) {
          return false;
        }

        // Filter by Actor
        if (actorFilter !== 'all') {
          if (actorFilter === 'admin') {
            const isAdm =
              log.changedBy.toLowerCase().includes('admin') ||
              log.changedBy.toLowerCase().includes('system');
            if (!isAdm) return false;
          } else if (actorFilter === 'recruiter') {
            const isAdm =
              log.changedBy.toLowerCase().includes('admin') ||
              log.changedBy.toLowerCase().includes('system');
            if (isAdm) return false;
          } else {
            if (log.changedBy.toLowerCase() !== actorFilter.toLowerCase()) return false;
          }
        }

        // Filter by status transition
        if (statusFilter !== 'all') {
          const matchFrom = log.previousStatusName.toLowerCase() === statusFilter.toLowerCase();
          const matchTo = log.newStatusName.toLowerCase() === statusFilter.toLowerCase();
          if (!matchFrom && !matchTo) return false;
        }

        // Search Term
        if (searchTerm.trim() !== '') {
          const term = searchTerm.toLowerCase();
          const matches =
            log.candidateName.toLowerCase().includes(term) ||
            log.candidateEmail.toLowerCase().includes(term) ||
            log.candidateRole.toLowerCase().includes(term) ||
            log.candidateRecruiter.toLowerCase().includes(term) ||
            log.previousStatusName.toLowerCase().includes(term) ||
            log.newStatusName.toLowerCase().includes(term) ||
            log.changedBy.toLowerCase().includes(term) ||
            (log.comment && log.comment.toLowerCase().includes(term));
          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [allLogs, selectedCandidateId, actorFilter, statusFilter, searchTerm, sortOrder]);

  // Selected candidate object if any
  const preselectedCandidate = useMemo(() => {
    if (selectedCandidateId === 'all') return null;
    return candidates.find((c) => c.id === selectedCandidateId) || null;
  }, [candidates, selectedCandidateId]);

  // Handle export CSV
  const handleExportCSV = () => {
    const headers = [
      'Timestamp (ISO)',
      'Formatted Date & Time',
      'Candidate Name',
      'Role',
      'Email',
      'Assigned Recruiter',
      'Previous Status',
      'New Status',
      'Changed By (Actor)',
      'Action Notes & Reason',
    ];

    const rows = filteredLogs.map((l) => [
      `"${l.timestamp}"`,
      `"${formatCommentTimestamp(l.timestamp)}"`,
      `"${l.candidateName.replace(/"/g, '""')}"`,
      `"${l.candidateRole.replace(/"/g, '""')}"`,
      `"${l.candidateEmail}"`,
      `"${l.candidateRecruiter.replace(/"/g, '""')}"`,
      `"${l.previousStatusName.replace(/"/g, '""')}"`,
      `"${l.newStatusName.replace(/"/g, '""')}"`,
      `"${l.changedBy.replace(/"/g, '""')}"`,
      `"${(l.comment || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `candidate_status_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    selectedCandidateId !== 'all' ||
    actorFilter !== 'all' ||
    statusFilter !== 'all';

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCandidateId('all');
    setActorFilter('all');
    setStatusFilter('all');
    if (onClearPreselection) onClearPreselection();
  };

  // Helper for status badge style
  const getStatusBadgeStyle = (statusName: string) => {
    const s = statusName.toLowerCase();
    if (s.includes('wrong number') || s.includes('invalid')) {
      return 'bg-rose-50 text-rose-800 border-rose-200';
    }
    if (s.includes('not interested') || s.includes('declined')) {
      return 'bg-orange-50 text-orange-800 border-orange-200';
    }
    if (s.includes('call not') || s.includes('unanswered') || s.includes('busy')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    if (s.includes('already joined')) {
      return 'bg-purple-50 text-purple-800 border-purple-200';
    }
    if (s.includes('duplicate')) {
      return 'bg-slate-100 text-slate-800 border-slate-300';
    }
    if (s.includes('follow-up') || s.includes('active') || s.includes('new')) {
      return 'bg-blue-50 text-blue-800 border-blue-200';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  return (
    <div id="status-logs-section" className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
              <History className="w-5 h-5" />
            </div>
            <h1 id="page-title-status-logs" className="text-2xl font-bold text-slate-900 tracking-tight">
              Status Change Audit Logs
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {allLogs.length} Total Events
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">
            Detailed immutable log records tracking every candidate status transition: exact date &amp; time, previous status, updated status, who executed the change, and action notes.
          </p>
        </div>

        {/* Top Right Action: Export CSV & View Toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs text-xs">
            <button
              type="button"
              id="btn-view-mode-table"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Table View
            </button>
            <button
              type="button"
              id="btn-view-mode-timeline"
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Timeline View
            </button>
          </div>

          <button
            type="button"
            id="btn-export-status-logs-csv"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
            title="Export filtered status logs to CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Focus banner if a specific candidate profile was selected */}
      {preselectedCandidate && (
        <div
          id="banner-profile-log-focus"
          className="p-4 bg-gradient-to-r from-indigo-50 via-sky-50 to-indigo-50/50 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              {preselectedCandidate.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xs font-bold uppercase tracking-wider text-indigo-600">
                  Filtered to Profile:
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {preselectedCandidate.name}
                </span>
                <span className="text-2xs px-2 py-0.5 rounded-full font-semibold bg-white border border-indigo-200 text-indigo-800">
                  Current Status: {preselectedCandidate.statusName}
                </span>
              </div>
              <div className="text-xs text-slate-600 flex items-center gap-2 mt-0.5">
                <span>{preselectedCandidate.role}</span>
                <span>•</span>
                <span>{preselectedCandidate.email}</span>
                {preselectedCandidate.recruiterName && (
                  <>
                    <span>•</span>
                    <span>Recruiter: {preselectedCandidate.recruiterName}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-indigo-700 font-semibold bg-white/80 px-2.5 py-1 rounded-lg border border-indigo-200/60">
              Showing {filteredLogs.length} events for this profile
            </span>
            <button
              type="button"
              id="btn-show-all-candidate-logs"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-100 border border-indigo-300 rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Show All Profiles
            </button>
          </div>
        </div>
      )}

      {/* Metrics / KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Log Entries</span>
            <History className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{allLogs.length}</p>
          <p className="text-2xs text-slate-400 mt-0.5">Audited status updates</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Profiles Logged</span>
            <User className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{candidates.length}</p>
          <p className="text-2xs text-slate-400 mt-0.5">Candidates tracked in ATS</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Admin Actions</span>
            <Shield className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-indigo-700 mt-1">
            {allLogs.filter((l) => l.changedBy.toLowerCase().includes('admin') || l.changedBy.toLowerCase().includes('system')).length}
          </p>
          <p className="text-2xs text-slate-400 mt-0.5">Approvals, restores, rules</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Recruiter Actions</span>
            <UserCheck className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {allLogs.filter((l) => !l.changedBy.toLowerCase().includes('admin') && !l.changedBy.toLowerCase().includes('system')).length}
          </p>
          <p className="text-2xs text-slate-400 mt-0.5">Direct outreach status changes</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-2.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
          {/* Keyword search input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="input-search-status-logs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search candidate name, email, role, recruiter, actor, notes..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Candidate Filter Dropdown */}
            <div className="flex items-center gap-1.5 shrink-0">
              <label htmlFor="select-filter-candidate-profile" className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Profile:</span>
              </label>
              <select
                id="select-filter-candidate-profile"
                value={selectedCandidateId}
                onChange={(e) => setSelectedCandidateId(e.target.value)}
                className={`text-xs py-1.5 pl-2.5 pr-7 border rounded-lg font-medium transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-200 max-w-[200px] truncate ${
                  selectedCandidateId !== 'all'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <option value="all">All Candidate Profiles ({candidates.length})</option>
                {candidates.map((cand) => (
                  <option key={cand.id} value={cand.id}>
                    {cand.name} ({cand.statusName})
                  </option>
                ))}
              </select>
            </div>

            {/* Changed By (Actor) Filter */}
            <div className="flex items-center gap-1.5 shrink-0">
              <label htmlFor="select-filter-log-actor" className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-slate-500" />
                <span>Changed By:</span>
              </label>
              <select
                id="select-filter-log-actor"
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                className={`text-xs py-1.5 pl-2.5 pr-7 border rounded-lg font-medium transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-200 ${
                  actorFilter !== 'all'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <option value="all">All Actors</option>
                <option value="admin">Admin / System Only</option>
                <option value="recruiter">Recruiters Only</option>
                {distinctActors.map((actor) => (
                  <option key={actor} value={actor}>
                    {actor}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 shrink-0">
              <label htmlFor="select-filter-log-status" className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Status:</span>
              </label>
              <select
                id="select-filter-log-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`text-xs py-1.5 pl-2.5 pr-7 border rounded-lg font-medium transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-200 ${
                  statusFilter !== 'all'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <option value="all">All Statuses</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div className="flex items-center gap-1.5 shrink-0">
              <label htmlFor="select-sort-log-order" className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <span>Sort:</span>
              </label>
              <select
                id="select-sort-log-order"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                className="text-xs py-1.5 pl-2.5 pr-7 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-200"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 px-1">
            <span className="text-2xs uppercase tracking-wider font-semibold text-slate-400">
              Active Filters:
            </span>

            {selectedCandidateId !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-900 border border-indigo-200">
                <span>Profile: {preselectedCandidate?.name || selectedCandidateId}</span>
                <button
                  type="button"
                  onClick={() => setSelectedCandidateId('all')}
                  className="hover:text-indigo-950 p-0.5 rounded-full hover:bg-indigo-100 cursor-pointer"
                  title="Clear profile filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {actorFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-900 border border-indigo-200">
                <span>Actor: {actorFilter}</span>
                <button
                  type="button"
                  onClick={() => setActorFilter('all')}
                  className="hover:text-indigo-950 p-0.5 rounded-full hover:bg-indigo-100 cursor-pointer"
                  title="Clear actor filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-900 border border-indigo-200">
                <span>Status: {statusFilter}</span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className="hover:text-indigo-950 p-0.5 rounded-full hover:bg-indigo-100 cursor-pointer"
                  title="Clear status filter"
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
              id="btn-reset-status-log-filters"
              onClick={handleResetFilters}
              className="text-xs text-indigo-600 hover:text-indigo-800 underline font-medium cursor-pointer ml-1"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Main Content: Table or Timeline */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table id="status-logs-table" className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4 min-w-[170px]">Date &amp; Time</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Candidate Profile</th>
                  <th className="py-3.5 px-4 min-w-[260px]">Status Transition</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Changed By (Who Did This)</th>
                  <th className="py-3.5 px-4 min-w-[260px]">Action Notes &amp; Rationale</th>
                  <th className="py-3.5 px-4 text-right">Quick Filter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-slate-500">
                      <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="font-semibold text-slate-800 text-base">
                        No status log records match your filter criteria
                      </p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Try clearing or relaxing your search keyword, candidate profile, or actor filters.
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reset All Filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, index) => {
                    const isAdmin =
                      log.changedBy.toLowerCase().includes('admin') ||
                      log.changedBy.toLowerCase().includes('system');

                    return (
                      <tr
                        key={log.id || `log-row-${index}`}
                        id={`status-log-row-${log.id}`}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        {/* 1. Date & Time */}
                        <td className="py-4 px-4 text-xs">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>{formatCommentTimestamp(log.timestamp) || log.timestamp}</span>
                          </div>
                          <div className="text-3xs text-slate-400 pl-5 mt-0.5">
                            {formatFullDateTime(log.timestamp)}
                          </div>
                        </td>

                        {/* 2. Candidate Profile */}
                        <td className="py-4 px-4">
                          <div>
                            <button
                              type="button"
                              onClick={() => setSelectedCandidateId(log.candidateId)}
                              className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer text-left flex items-center gap-1.5 group"
                              title="Click to isolate status logs for this candidate profile"
                            >
                              <span>{log.candidateName}</span>
                              <Filter className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 shrink-0" />
                            </button>
                            <div className="text-xs text-slate-500 mt-0.5">
                              <span>{log.candidateRole}</span>
                              <span className="mx-1">•</span>
                              <span className="text-slate-400">{log.candidateEmail}</span>
                            </div>
                            <div className="text-2xs text-slate-400 mt-0.5">
                              Recruiter: {log.candidateRecruiter}
                            </div>
                          </div>
                        </td>

                        {/* 3. Status Transition: From What Status To What Status */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Previous Status */}
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${getStatusBadgeStyle(
                                log.previousStatusName
                              )}`}
                              title={`Previous Status: ${log.previousStatusName}`}
                            >
                              {log.previousStatusName || 'Initial Profile'}
                            </span>

                            <ArrowRight className="w-3.5 h-3.5 text-indigo-600 stroke-[2.5] shrink-0" />

                            {/* New Status */}
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border shadow-2xs ${getStatusBadgeStyle(
                                log.newStatusName
                              )}`}
                              title={`New Status: ${log.newStatusName}`}
                            >
                              {log.newStatusName}
                            </span>
                          </div>
                        </td>

                        {/* 4. Changed By (Who Did This) */}
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              isAdmin
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {isAdmin ? (
                              <Shield className="w-3.5 h-3.5 text-indigo-600" />
                            ) : (
                              <User className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                            <span>{log.changedBy}</span>
                          </span>
                        </td>

                        {/* 5. Action Notes & Reason */}
                        <td className="py-4 px-4 text-xs text-slate-700 max-w-md">
                          {log.comment ? (
                            <div className="bg-slate-50/90 border border-slate-200/80 rounded-lg p-2 leading-relaxed italic text-slate-800">
                              &ldquo;{log.comment}&rdquo;
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No notes provided.</span>
                          )}
                        </td>

                        {/* 6. Quick Filter Action */}
                        <td className="py-4 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedCandidateId(log.candidateId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                            title="Filter logs only to this profile"
                          >
                            <span>Filter Profile</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="p-4 bg-slate-50/70 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                Immutable audit trail is automatically captured on every status update, archive transition, and approval action.
              </span>
            </div>
            <span className="text-slate-400">
              Showing {filteredLogs.length} of {allLogs.length} logged events
            </span>
          </div>
        </div>
      ) : (
        /* Visual Timeline View */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-800">No events found matching your criteria</p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {filteredLogs.map((log, index) => {
                const isAdmin =
                  log.changedBy.toLowerCase().includes('admin') ||
                  log.changedBy.toLowerCase().includes('system');

                return (
                  <div
                    key={log.id || `timeline-${index}`}
                    id={`timeline-event-${log.id}`}
                    className="relative group animate-in fade-in duration-150"
                  >
                    {/* Timeline Node Bullet */}
                    <div className="absolute -left-6 top-3 w-6 h-6 rounded-full border-2 border-indigo-600 bg-white flex items-center justify-center shadow-xs">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    </div>

                    {/* Timeline Event Card */}
                    <div className="bg-slate-50/60 rounded-xl border border-slate-200 p-4.5 space-y-3 hover:border-indigo-300 hover:shadow-xs transition-all">
                      {/* Top Header: Candidate Name + Time + Actor */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setSelectedCandidateId(log.candidateId)}
                            className="font-bold text-slate-900 hover:text-indigo-600 text-sm text-left cursor-pointer"
                          >
                            {log.candidateName}
                          </button>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-500 font-medium">
                            {log.candidateRole}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-2xs font-bold ${
                              isAdmin
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isAdmin ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                            <span>Changed by: {log.changedBy}</span>
                          </span>

                          <span className="text-slate-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {formatCommentTimestamp(log.timestamp)}
                          </span>
                        </div>
                      </div>

                      {/* Transition display: From What Status to What Status */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="space-y-0.5">
                          <span className="text-3xs uppercase tracking-wider text-slate-400 font-bold block">
                            Previous Status
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${getStatusBadgeStyle(
                              log.previousStatusName
                            )}`}
                          >
                            {log.previousStatusName || 'Initial Profile'}
                          </span>
                        </div>

                        <div className="pt-3 px-1">
                          <ArrowRight className="w-4 h-4 text-indigo-600 stroke-[2.5]" />
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-3xs uppercase tracking-wider text-indigo-600 font-bold block">
                            Updated Status
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border shadow-2xs ${getStatusBadgeStyle(
                              log.newStatusName
                            )}`}
                          >
                            {log.newStatusName}
                          </span>
                        </div>
                      </div>

                      {/* Comment */}
                      {log.comment && (
                        <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                          <div className="flex items-center gap-1 text-3xs font-bold uppercase tracking-wider text-slate-400">
                            <FileText className="w-3 h-3 text-slate-400" />
                            <span>Action Notes:</span>
                          </div>
                          <p className="italic text-slate-800 leading-relaxed pl-3 border-l-2 border-indigo-400">
                            &ldquo;{log.comment}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
