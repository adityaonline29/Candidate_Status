/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Candidate,
  CandidateStatusRule,
  UserRole,
} from '../types';
import { formatCommentTimestamp } from '../utils/dateUtils';
import { StatusChangeConfirmationModal } from './StatusChangeConfirmationModal';
import { ViewCommentsModal } from './ViewCommentsModal';
import {
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  RotateCcw,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Building,
  Smartphone,
  ExternalLink,
  PlusSquare,
  MessageSquare,
  Plus,
  Home,
  ClipboardCheck,
  UserCheck,
  Database,
  BarChart2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Shield,
  X,
  Send,
  Flag,
  Clock,
} from 'lucide-react';

interface RecruiterPortalViewProps {
  candidates: Candidate[];
  statuses: CandidateStatusRule[];
  onAssignStatus: (candidateId: string, newStatusId: string, comment?: string) => void;
  onSwitchToAdmin: () => void;
  onAddComment: (candidateId: string, text: string) => void;
  onEditComment?: (candidateId: string, commentId: string, newText: string) => void;
  onDeleteComment?: (candidateId: string, commentId: string) => void;
}

export function RecruiterPortalView({
  candidates,
  statuses,
  onAssignStatus,
  onSwitchToAdmin,
  onAddComment,
  onEditComment,
  onDeleteComment,
}: RecruiterPortalViewProps) {
  // Navigation tabs in sub-header
  const [activeSubTab, setActiveSubTab] = useState<'recommended' | 'candidates' | 'job_details'>('recommended');

  // Filter State
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'pending' | 'active'>('all');
  const [expMin, setExpMin] = useState<string>('');
  const [expMax, setExpMax] = useState<string>('');
  const [ctcMin, setCtcMin] = useState<string>('');
  const [ctcMax, setCtcMax] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [searchName, setSearchName] = useState<string>('');
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);

  // Candidate selection for bulk actions
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());

  // Status Change Confirmation Modal state
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    candidate: Candidate;
    newStatusRule: CandidateStatusRule;
  } | null>(null);

  // View Comments Modal state
  const [activeCommentsCandidateId, setActiveCommentsCandidateId] = useState<string | null>(null);

  // Expanded status comment inline state (candidate ids)
  const [expandedStatusCommentCandidateIds, setExpandedStatusCommentCandidateIds] = useState<Set<string>>(new Set());

  const toggleStatusComment = (candidateId: string) => {
    setExpandedStatusCommentCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  };

  // Helper to retrieve the comment associated with candidate's current status
  const getStatusComment = (candidate: Candidate) => {
    // 1. Look for status transition logs matching current status
    if (candidate.statusLogs && candidate.statusLogs.length > 0) {
      const matchedLog = [...candidate.statusLogs]
        .reverse()
        .find(
          (l) =>
            (l.newStatusId && l.newStatusId === candidate.statusId) ||
            (l.newStatusName && l.newStatusName.toLowerCase() === candidate.statusName.toLowerCase())
        );
      if (matchedLog && matchedLog.comment) {
        return {
          comment: matchedLog.comment,
          author: matchedLog.changedBy,
          timeFormatted: formatCommentTimestamp(matchedLog.timestamp),
          statusName: matchedLog.newStatusName,
        };
      }
      const lastLog = candidate.statusLogs[candidate.statusLogs.length - 1];
      if (lastLog && lastLog.comment) {
        return {
          comment: lastLog.comment,
          author: lastLog.changedBy,
          timeFormatted: formatCommentTimestamp(lastLog.timestamp),
          statusName: lastLog.newStatusName,
        };
      }
    }

    // 2. Look for comments marked as status change
    if (candidate.comments && candidate.comments.length > 0) {
      const statusC = candidate.comments.find((c) => c.isStatusChange && c.text);
      if (statusC) {
        return {
          comment: statusC.text,
          author: statusC.author,
          timeFormatted: formatCommentTimestamp(statusC.createdAt),
          statusName: statusC.newStatus || candidate.statusName,
        };
      }
      const firstC = candidate.comments[0];
      if (firstC && firstC.text) {
        return {
          comment: firstC.text,
          author: firstC.author,
          timeFormatted: formatCommentTimestamp(firstC.createdAt),
          statusName: candidate.statusName,
        };
      }
    }

    // 3. Fallback to candidate notes
    if (candidate.notes) {
      return {
        comment: candidate.notes,
        author: 'Innov Facilities',
        timeFormatted: formatCommentTimestamp(candidate.statusAssignedAt),
        statusName: candidate.statusName,
      };
    }

    return null;
  };

  // Dynamic lookup for currently inspected candidate
  const currentCommentsCandidate = useMemo(() => {
    if (!activeCommentsCandidateId) return null;
    return candidates.find((c) => c.id === activeCommentsCandidateId) || null;
  }, [candidates, activeCommentsCandidateId]);

  // Skills "View More" modal or toggle state
  const [expandedSkillsId, setExpandedSkillsId] = useState<string | null>(null);

  // Pagination & items per page
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Available location options for filter
  const locationOptions = [
    'Karnataka, Narasapura',
    'Karnataka, Bengaluru',
    'Tamil Nadu, Chennai',
    'Maharashtra, Pune',
    'Telangana, Hyderabad',
  ];

  // Candidates visible in the recruiter panel:
  // Active, Restored, AND candidates pending Admin approval (kept in panel until Admin approves)
  const recruiterCandidates = useMemo(() => {
    return candidates.filter(
      (c) =>
        c.lifecycleState === 'active' ||
        c.lifecycleState === 'restored' ||
        c.lifecycleState === 'pending_approval'
    );
  }, [candidates]);

  // Count candidates currently pending approval
  const pendingApprovalCount = useMemo(() => {
    return candidates.filter((c) => c.lifecycleState === 'pending_approval').length;
  }, [candidates]);

  // Filtered candidates
  const filteredCandidates = useMemo(() => {
    return recruiterCandidates.filter((c) => {
      // Approval Status filter
      if (approvalFilter === 'pending' && c.lifecycleState !== 'pending_approval') {
        return false;
      }
      if (approvalFilter === 'active' && c.lifecycleState === 'pending_approval') {
        return false;
      }

      // Search by name, role, email
      if (searchName.trim()) {
        const query = searchName.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(query);
        const matchesRole = (c.designation || c.role).toLowerCase().includes(query);
        const matchesEmail = c.email.toLowerCase().includes(query);
        const matchesStatus = c.statusName.toLowerCase().includes(query);
        if (!matchesName && !matchesRole && !matchesEmail && !matchesStatus) return false;
      }

      // Location filter
      if (selectedLocation) {
        const candLoc = c.preferredLocations || '';
        if (!candLoc.toLowerCase().includes(selectedLocation.toLowerCase())) {
          return false;
        }
      }

      // Experience filter
      if (expMin && c.experienceYears !== undefined && c.experienceYears < Number(expMin)) {
        return false;
      }
      if (expMax && c.experienceYears !== undefined && c.experienceYears > Number(expMax)) {
        return false;
      }

      return true;
    });
  }, [recruiterCandidates, approvalFilter, searchName, selectedLocation, expMin, expMax]);

  // Count filters applied
  const filtersAppliedCount = useMemo(() => {
    let count = 0;
    if (approvalFilter !== 'all') count++;
    if (expMin || expMax) count++;
    if (ctcMin || ctcMax) count++;
    if (selectedLocation) count++;
    if (searchName) count++;
    return count;
  }, [approvalFilter, expMin, expMax, ctcMin, ctcMax, selectedLocation, searchName]);

  const handleResetFilters = () => {
    setApprovalFilter('all');
    setExpMin('');
    setExpMax('');
    setCtcMin('');
    setCtcMax('');
    setSelectedLocation('');
    setSearchName('');
  };

  const handleToggleSelectAll = () => {
    if (selectedCandidateIds.size === filteredCandidates.length && filteredCandidates.length > 0) {
      setSelectedCandidateIds(new Set());
    } else {
      setSelectedCandidateIds(new Set(filteredCandidates.map((c) => c.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleOpenCommentModal = (cand: Candidate) => {
    setActiveCommentsCandidateId(cand.id);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f4f7f9] text-slate-800 font-sans">
      {/* 1. TOP HEADER BAR (Jobcheck Branded) */}
      <header className="bg-[#006e88] text-white h-13 px-4 flex items-center justify-between shadow-xs z-30 select-none">
        {/* Left: Jobcheck Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center text-white">
              {/* Double Check Icon matching Jobcheck Logo */}
              <div className="relative flex items-center justify-center w-6 h-6">
                <CheckCheck className="w-6 h-6 text-white stroke-[2.8]" />
              </div>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Jobcheck</span>
          </div>
        </div>

        {/* Right: Company Dropdown & Profile */}
        <div className="flex items-center gap-3">
          {/* Quick toggle to return to Admin rules */}
          <button
            type="button"
            onClick={onSwitchToAdmin}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-white/15 hover:bg-white/25 text-white transition-colors border border-white/20 cursor-pointer"
            title="Switch back to Admin Cleanup Rules"
          >
            <Shield className="w-3.5 h-3.5" />
            Admin Config
          </button>

          {/* Innov Facilities Dropdown */}
          <div className="relative flex items-center gap-1.5 bg-[#64b5cd]/30 hover:bg-[#64b5cd]/40 text-white px-3 py-1 rounded-sm text-xs font-medium cursor-pointer transition-colors border border-white/20">
            <span>Innov Facilities</span>
            <ChevronDown className="w-3.5 h-3.5 text-white/80" />
          </div>

          {/* User Avatar Circle */}
          <div className="w-7 h-7 rounded-full bg-emerald-600 border border-white/40 flex items-center justify-center text-xs font-semibold text-white shadow-2xs">
            <span className="sr-only">Recruiter Avatar</span>
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-700 to-teal-400 flex items-center justify-center text-white text-3xs font-bold">
              IF
            </div>
          </div>
        </div>
      </header>

      {/* 2. SUB-HEADER / TAB & METRICS BAR */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between shadow-2xs gap-y-2">
        {/* Left Sub-Header Items */}
        <div className="flex flex-col gap-1">
          {/* Tabs: Recommended / Candidates / Job Details */}
          <div className="flex items-center gap-6 mt-0.5 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveSubTab('recommended')}
              className={`pb-1.5 transition-colors cursor-pointer relative ${
                activeSubTab === 'recommended'
                  ? 'text-[#006e88] font-bold border-b-2 border-[#006e88]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Recommended
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('candidates')}
              className={`pb-1.5 transition-colors cursor-pointer relative ${
                activeSubTab === 'candidates'
                  ? 'text-[#006e88] font-bold border-b-2 border-[#006e88]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Candidates
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('job_details')}
              className={`pb-1.5 transition-colors cursor-pointer relative ${
                activeSubTab === 'job_details'
                  ? 'text-[#006e88] font-bold border-b-2 border-[#006e88]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Job Details
            </button>
          </div>
        </div>

        {/* Right Sub-Header: Rejected Counter Metric */}
        <div className="flex flex-col items-center sm:items-end">
          <span className="text-xs text-slate-500 font-medium">Rejected</span>
          <div className="text-xl font-bold text-slate-800 border-b border-slate-400 w-12 text-center">
            0
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE WITH SLIM LEFT SIDEBAR + 2-COLUMN CONTENT */}
      <div className="flex flex-1 overflow-hidden">
        {/* Slim Left Navigation Bar */}
        <aside className="w-12 bg-white border-r border-slate-200 flex flex-col items-center py-4 justify-between shrink-0 select-none">
          <div className="flex flex-col items-center space-y-6 text-slate-500">
            <button
              type="button"
              className="p-1.5 rounded-md hover:bg-slate-100 hover:text-[#006e88] transition-colors cursor-pointer"
              title="Dashboard"
            >
              <Home className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-md hover:bg-slate-100 text-[#006e88] bg-sky-50 transition-colors cursor-pointer"
              title="Search Candidates"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-md hover:bg-slate-100 hover:text-[#006e88] transition-colors cursor-pointer"
              title="Evaluation Checklist"
            >
              <ClipboardCheck className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-md hover:bg-slate-100 hover:text-[#006e88] transition-colors cursor-pointer"
              title="Active Applications"
            >
              <UserCheck className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-md hover:bg-slate-100 hover:text-[#006e88] transition-colors cursor-pointer"
              title="Talent Pool Database"
            >
              <Database className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-md hover:bg-slate-100 hover:text-[#006e88] transition-colors cursor-pointer"
              title="Recruitment Analytics"
            >
              <BarChart2 className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom Logout / Return Icon */}
          <div className="pt-4">
            <button
              type="button"
              onClick={onSwitchToAdmin}
              className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
              title="Exit Recruiter View"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {/* Workspace Body: 2 Columns */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 flex flex-col lg:flex-row gap-5 items-start">
          {/* LEFT COLUMN: FILTER PANEL (Approx 310px width) */}
          <div className="w-full lg:w-76 shrink-0 bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
            {/* Filter Header */}
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-sm">
                <Filter className="w-3.5 h-3.5 text-slate-600 fill-slate-600" />
                <span>Filter</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {isFilterExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Filter Count & Reset */}
            <div className="px-3.5 py-2 flex items-center justify-between text-2xs text-slate-500 border-b border-slate-100">
              <span>{filtersAppliedCount} Filters Applied</span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-sky-700 hover:text-sky-900 font-medium cursor-pointer"
              >
                Reset
              </button>
            </div>

            {/* Filter Body */}
            {isFilterExpanded && (
              <div className="p-3.5 space-y-4 text-xs">
                {/* 1. Experience */}
                <div>
                  <label className="block text-slate-700 font-medium mb-1 text-2xs uppercase tracking-wider">
                    Experience
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Minimum"
                      value={expMin}
                      onChange={(e) => setExpMin(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#006e88]"
                    />
                    <span className="text-slate-400 text-2xs">to</span>
                    <input
                      type="number"
                      placeholder="Maximum"
                      value={expMax}
                      onChange={(e) => setExpMax(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#006e88]"
                    />
                  </div>
                </div>

                {/* 2. Annual CTC */}
                <div>
                  <label className="block text-slate-700 font-medium mb-1 text-2xs uppercase tracking-wider">
                    Annual CTC
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Minimum"
                      value={ctcMin}
                      onChange={(e) => setCtcMin(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#006e88]"
                    />
                    <span className="text-slate-400 text-2xs">to</span>
                    <input
                      type="number"
                      placeholder="Maximum"
                      value={ctcMax}
                      onChange={(e) => setCtcMax(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#006e88]"
                    />
                  </div>
                </div>

                {/* 3. Preferred Locations (Max 4) */}
                <div className="relative">
                  <label className="block text-slate-700 font-medium mb-1 text-2xs uppercase tracking-wider">
                    Preferred Locations (Max 4)
                  </label>
                  <div
                    onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
                    className="flex items-center justify-between w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs text-slate-700 cursor-pointer bg-white hover:border-slate-300"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Search className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className={selectedLocation ? 'text-slate-800' : 'text-slate-400'}>
                        {selectedLocation || 'Add Preferred Location'}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>

                  {locationDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-20 max-h-48 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLocation('');
                          setLocationDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 border-b border-slate-100"
                      >
                        All Locations
                      </button>
                      {locationOptions.map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => {
                            setSelectedLocation(loc);
                            setLocationDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-sky-50 flex items-center justify-between ${
                            selectedLocation === loc ? 'text-[#006e88] font-semibold bg-sky-50/50' : 'text-slate-700'
                          }`}
                        >
                          <span>{loc}</span>
                          {selectedLocation === loc && <Check className="w-3.5 h-3.5 text-[#006e88]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Search by Name */}
                <div>
                  <label className="block text-slate-700 font-medium mb-1 text-2xs uppercase tracking-wider">
                    Search by Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Enter name to search"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#006e88]"
                    />
                    {searchName && (
                      <button
                        type="button"
                        onClick={() => setSearchName('')}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Apply Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Filters already apply reactively
                    }}
                    className="w-full bg-[#006e88] hover:bg-[#005a70] text-white font-semibold py-2 rounded-md text-xs transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: CANDIDATE RESULTS LIST */}
          <div className="flex-1 w-full space-y-3">
            {/* Top Toolbar: Bulk Actions, Counter, Items per page, Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs text-xs">
              {/* Left: Bulk Actions & Selection count */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-md text-slate-700 font-medium hover:bg-slate-50 transition-colors cursor-pointer bg-white"
                >
                  <span>Bulk Actions</span>
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={
                      selectedCandidateIds.size > 0 &&
                      selectedCandidateIds.size === filteredCandidates.length
                    }
                    onChange={handleToggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-[#006e88] focus:ring-[#006e88] cursor-pointer"
                  />
                  <span className="font-semibold text-slate-800">
                    {selectedCandidateIds.size} Out of 55508 Candidates Selected
                  </span>
                </label>
              </div>

              {/* Right: Item per Page & Pagination */}
              <div className="flex items-center gap-3 text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="text-2xs text-slate-500">Item per Page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white focus:outline-none focus:border-[#006e88]"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-1 text-slate-500">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    className="p-1 hover:text-slate-900 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    className="p-1 hover:text-slate-900 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <span className="px-1 text-2xs font-medium text-slate-700">
                    1 - 2776 of 2776
                  </span>

                  <button
                    type="button"
                    className="p-1 hover:text-slate-900 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    className="p-1 hover:text-slate-900 cursor-pointer"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Candidate Cards Listing */}
            {filteredCandidates.length === 0 ? (
              <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500">
                <p className="text-sm font-medium">No candidates match the specified filter criteria.</p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-3 text-xs text-[#006e88] hover:underline font-semibold"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              filteredCandidates.map((candidate) => {
                const isSelected = selectedCandidateIds.has(candidate.id);
                const isPendingApproval = candidate.lifecycleState === 'pending_approval';
                const matchPct = candidate.matchPercentage || 82;
                const skillsList = candidate.keySkills || [
                  'Accuracy',
                  'Billing',
                  'Communication',
                  'Complaint Handling',
                ];
                const statusCommentInfo = getStatusComment(candidate);
                const isCommentExpanded = expandedStatusCommentCandidateIds.has(candidate.id);

                return (
                  <div
                    key={candidate.id}
                    id={`candidate-card-${candidate.id}`}
                    className={`bg-white rounded-lg border transition-all shadow-2xs overflow-hidden ${
                      isSelected ? 'border-[#006e88] ring-1 ring-[#006e88]/30' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="p-4 flex flex-col md:flex-row items-start gap-4">
                      {/* Left sub-col: Avatar & Match % */}
                      <div className="flex flex-col items-center shrink-0 w-20 pt-1">
                        {/* 3D Black / Charcoal Silhouette Avatar circle */}
                        <div className="w-14 h-14 rounded-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center shadow-inner overflow-hidden relative border border-slate-700">
                          {/* Silhouette head and shoulders shape */}
                          <div className="flex flex-col items-center">
                            <div className="w-5 h-5 rounded-full bg-slate-600/90 mb-0.5 shadow-sm" />
                            <div className="w-9 h-6 rounded-t-full bg-slate-600/90" />
                          </div>
                        </div>

                        {/* Match Indicator */}
                        <div className="mt-2 text-center">
                          <div className="text-xs font-bold text-[#006e88] leading-tight">
                            {matchPct}%
                          </div>
                          <div className="text-2xs text-slate-700 font-medium">Match</div>
                        </div>
                      </div>

                      {/* Middle sub-col: Name, Contact & Status Meta */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Name & Flag */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900 truncate">
                            {candidate.name}
                          </h3>
                          {isPendingApproval && (
                            <span
                              id={`flag-pending-approval-${candidate.id}`}
                              className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 text-3xs font-normal shrink-0"
                              title="pending admin approval for deletion"
                            >
                              <Flag className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                              <span>pending admin approval for deletion</span>
                            </span>
                          )}
                        </div>

                        {/* Email */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{candidate.email}</span>
                        </div>

                        {/* Actions row: + Add Comment & View Comments */}
                        <div className="flex items-center gap-4 text-xs font-medium pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleOpenCommentModal(candidate)}
                            className="text-slate-600 hover:text-[#006e88] flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3 text-slate-400" />
                            <span>Add Comment</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenCommentModal(candidate)}
                            className="text-slate-600 hover:text-[#006e88] flex items-center gap-1 cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3 text-slate-400" />
                            <span>
                              View Comments{' '}
                              {candidate.comments && candidate.comments.length > 0 && (
                                <span className="text-2xs px-1.5 py-0.2 rounded-full bg-slate-100 font-bold text-slate-700">
                                  {candidate.comments.length}
                                </span>
                              )}
                            </span>
                          </button>
                        </div>

                        {/* Phone */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium pt-1">
                          <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{candidate.phone}</span>
                        </div>

                        {/* Meta rows with 4 icons */}
                        <div className="space-y-1 pt-1 text-2xs text-slate-500">
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              {candidate.experienceYears
                                ? `${candidate.experienceYears} Years Exp`
                                : 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>N/A</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>N/A</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Not Available</span>
                          </div>
                        </div>

                        {/* Candidate Status Selector & Option to See Added Comment with Status */}
                        <div className="pt-2 space-y-1.5">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">
                              Status:
                            </span>
                            <select
                              id={`select-candidate-status-${candidate.id}`}
                              value={candidate.statusId}
                              onChange={(e) => {
                                const selectedRule = statuses.find((s) => s.id === e.target.value);
                                if (selectedRule && e.target.value !== candidate.statusId) {
                                  setPendingStatusChange({
                                    candidate,
                                    newStatusRule: selectedRule,
                                  });
                                }
                              }}
                              className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 font-medium text-slate-800 hover:border-slate-300 focus:outline-none focus:border-[#006e88] cursor-pointer"
                            >
                              {statuses.map((s) => (
                                <option
                                  key={s.id}
                                  value={s.id}
                                >
                                  {s.name}
                                </option>
                              ))}
                            </select>

                            {/* Option to see the added comment with the status */}
                            <button
                              type="button"
                              id={`btn-see-status-comment-${candidate.id}`}
                              onClick={() => toggleStatusComment(candidate.id)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-2xs font-semibold transition-all cursor-pointer border ${
                                isCommentExpanded
                                  ? 'bg-[#006e88] text-white border-[#006e88] shadow-2xs'
                                  : statusCommentInfo
                                  ? 'bg-sky-50 text-[#006e88] border-sky-200 hover:bg-sky-100 hover:border-sky-300'
                                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700'
                              }`}
                              title={statusCommentInfo ? 'See comment added with this status' : 'No comment added for this status yet'}
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>{isCommentExpanded ? 'Hide Comment' : 'See Comment'}</span>
                              {statusCommentInfo && !isCommentExpanded && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Comment available" />
                              )}
                            </button>

                            {/* Option to add only comments without changing status */}
                            <button
                              type="button"
                              id={`btn-add-only-comment-${candidate.id}`}
                              onClick={() => handleOpenCommentModal(candidate)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-2xs font-semibold bg-white text-[#006e88] border border-[#006e88]/30 hover:bg-sky-50 transition-all cursor-pointer shadow-2xs"
                              title="Add a comment or note directly to this candidate"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Comment</span>
                            </button>
                          </div>

                          {/* Inline Display of the added comment with the status */}
                          {isCommentExpanded ? (
                            <div className="mt-2 p-2.5 rounded-lg bg-sky-50/70 border border-sky-200 text-xs space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                              <div className="flex items-center justify-between">
                                <span className="text-3xs font-bold uppercase tracking-wider text-[#006e88] flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3 text-[#006e88]" />
                                  Comment with Status: &quot;{candidate.statusName}&quot;
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenCommentModal(candidate)}
                                  className="text-3xs text-[#006e88] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  <span>View History / Log</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              </div>

                              {statusCommentInfo ? (
                                <div className="bg-white p-2.5 rounded border border-sky-100 shadow-2xs space-y-1">
                                  <p className="text-xs text-slate-800 italic leading-relaxed">
                                    &quot;{statusCommentInfo.comment}&quot;
                                  </p>
                                  <div className="flex items-center justify-between pt-1 border-t border-slate-50 text-3xs text-slate-400">
                                    <span className="font-medium text-slate-600">
                                      By: {statusCommentInfo.author || 'Innov Facilities'}
                                    </span>
                                    <span>{statusCommentInfo.timeFormatted}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-white/80 p-2.5 rounded border border-dashed border-slate-200 text-2xs text-slate-500 flex items-center justify-between">
                                  <span>No comment added with status &quot;{candidate.statusName}&quot; yet.</span>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenCommentModal(candidate)}
                                    className="text-3xs font-bold text-[#006e88] hover:underline cursor-pointer"
                                  >
                                    + Add Comment
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* When collapsed, if a comment exists, show an inline snippet with the status */
                            statusCommentInfo && (
                              <div
                                onClick={() => toggleStatusComment(candidate.id)}
                                className="mt-1 flex items-center gap-1.5 text-2xs text-slate-600 bg-slate-50/90 hover:bg-sky-50 px-2 py-1 rounded border border-slate-200/90 hover:border-sky-200 cursor-pointer transition-colors group"
                                title="Click to see full comment with this status"
                              >
                                <span className="font-semibold text-slate-700 text-3xs shrink-0 flex items-center gap-1">
                                  <MessageSquare className="w-2.5 h-2.5 text-[#006e88]" />
                                  Note:
                                </span>
                                <span className="italic truncate text-slate-600 max-w-[220px]">
                                  &quot;{statusCommentInfo.comment}&quot;
                                </span>
                                <span className="text-3xs text-[#006e88] font-semibold ml-auto group-hover:underline">
                                  See Comment
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {/* Right sub-col: Key Skills, Designation, Location, Source & Action icons */}
                      <div className="flex-1 min-w-0 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4 space-y-2.5 relative">
                        {/* Top right: Checkbox + Link icons */}
                        <div className="flex items-center justify-end gap-2.5 pb-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(candidate.id)}
                            className="w-4 h-4 rounded border-slate-300 text-[#006e88] focus:ring-[#006e88] cursor-pointer"
                          />
                          <button
                            type="button"
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
                            title="Open candidate profile in new tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenCommentModal(candidate)}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
                            title="Quick action"
                          >
                            <PlusSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Key Skills */}
                        <div>
                          <span className="text-2xs font-medium text-slate-400 block mb-0.5">
                            Key Skills
                          </span>
                          <p className="text-xs text-slate-700 font-normal leading-relaxed">
                            {expandedSkillsId === candidate.id
                              ? skillsList.join(', ')
                              : `${skillsList.slice(0, 4).join(', ')} ... `}
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedSkillsId(
                                  expandedSkillsId === candidate.id ? null : candidate.id
                                )
                              }
                              className="text-[#006e88] font-medium hover:underline ml-1 cursor-pointer"
                            >
                              {expandedSkillsId === candidate.id ? 'View Less' : 'View More'}
                            </button>
                          </p>
                        </div>

                        {/* Designation */}
                        <div>
                          <span className="text-2xs font-medium text-slate-400 block mb-0.5">
                            Designation
                          </span>
                          <span className="text-xs font-semibold text-slate-800">
                            {candidate.designation || candidate.role}
                          </span>
                        </div>

                        {/* Preferred Locations */}
                        <div>
                          <span className="text-2xs font-medium text-slate-400 block mb-0.5">
                            Preferred Locations
                          </span>
                          <span className="text-xs text-slate-700">
                            {candidate.preferredLocations || 'Karnataka, Narasapura'}
                          </span>
                        </div>

                        {/* Source */}
                        <div>
                          <span className="text-2xs font-medium text-slate-400 block mb-0.5">
                            Source
                          </span>
                          <span className="text-xs text-slate-700">
                            {candidate.source || 'DIGIONE CANDIDATE'}
                          </span>
                        </div>

                        {/* Notice Period */}
                        <div>
                          <span className="text-2xs font-medium text-slate-400 block mb-0.5">
                            Notice Period
                          </span>
                          <span className="text-xs text-slate-700">
                            {candidate.noticePeriod || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* View Comments Modal (matching reference image) */}
      <ViewCommentsModal
        isOpen={!!currentCommentsCandidate}
        candidate={currentCommentsCandidate}
        onClose={() => setActiveCommentsCandidateId(null)}
        onAddComment={onAddComment}
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
    </div>
  );
}
