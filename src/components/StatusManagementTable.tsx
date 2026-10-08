import React, { useState } from 'react';
import { CandidateStatusRule, UserRole } from '../types';
import {
  Plus,
  Edit3,
  Search,
  Archive,
  UserCheck,
  Clock,
  Trash2,
  Lock,
} from 'lucide-react';

interface StatusManagementTableProps {
  statuses: CandidateStatusRule[];
  userRole: UserRole;
  onCreateStatus: () => void;
  onEditStatus: (status: CandidateStatusRule) => void;
  onDeleteStatus: (status: CandidateStatusRule) => void;
}

export const StatusManagementTable: React.FC<StatusManagementTableProps> = ({
  statuses,
  userRole,
  onCreateStatus,
  onEditStatus,
  onDeleteStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'archiving' | 'non-archiving'>('all');

  const isAdmin = userRole === 'admin';

  const filteredStatuses = statuses.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (filterType === 'archiving') return item.archive;
    if (filterType === 'non-archiving') return !item.archive;
    return true;
  });

  const totalStatuses = statuses.length;
  const autoArchivingCount = statuses.filter((s) => s.archive).length;
  const approvalRequiredCount = statuses.filter((s) => s.archive && s.approvalRequired).length;

  return (
    <div id="status-management-section" className="space-y-6">
      {/* Header Info & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 id="page-title-cleanup-rules" className="text-2xl font-bold text-slate-900 tracking-tight">
              Candidate Status &amp; Archival Rules
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Admin Configuration
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Configure candidate status options and automatic archiving rules.
          </p>
        </div>

        {isAdmin ? (
          <button
            type="button"
            id="btn-create-status"
            onClick={onCreateStatus}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            + Create Status
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium border border-slate-200">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            Admin Only: Rules Configuration Locked
          </div>
        )}
      </div>

      {/* Role Permission Alert if Recruiter */}
      {!isAdmin && (
        <div
          id="recruiter-rules-notice"
          className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5"
        >
          <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">View-Only Access (Recruiter / Salesperson):</span>
            <p className="text-amber-800 mt-0.5">
              Only Admin can configure cleanup rules. You can view the currently configured pipeline rules below, but cannot modify or create statuses.
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="input-search-statuses"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search status name..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            id="filter-status-all"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              filterType === 'all'
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({totalStatuses})
          </button>
          <button
            type="button"
            id="filter-status-archiving"
            onClick={() => setFilterType('archiving')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              filterType === 'archiving'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Archiving ({autoArchivingCount})
          </button>
          <button
            type="button"
            id="filter-status-active"
            onClick={() => setFilterType('non-archiving')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              filterType === 'non-archiving'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Non-Archiving ({totalStatuses - autoArchivingCount})
          </button>
        </div>
      </div>

      {/* Status Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table id="status-rules-table" className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Status Name</th>
                <th className="py-3.5 px-4">Archive</th>
                <th className="py-3.5 px-4">Approval Required</th>
                <th className="py-3.5 px-4">Delete After</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredStatuses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No status rules found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Try adjusting your search filter or click &quot;+ Create Status&quot; to add a new rule.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStatuses.map((rule) => {
                  return (
                    <tr
                      key={rule.id}
                      id={`status-row-${rule.id}`}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Column 1: Status Name */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              rule.archive ? 'bg-indigo-500' : 'bg-emerald-500'
                            }`}
                          />
                          <span className="font-semibold text-slate-900">
                            {rule.name}
                          </span>
                        </div>
                      </td>

                      {/* Column 2: Archive */}
                      <td className="py-4 px-4">
                        {rule.archive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Archive className="w-3.5 h-3.5 text-indigo-600" />
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            No
                          </span>
                        )}
                      </td>

                      {/* Column 3: Approval Required */}
                      <td className="py-4 px-4">
                        {!rule.archive ? (
                          <span className="text-slate-400 font-mono text-base">—</span>
                        ) : rule.approvalRequired ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            No
                          </span>
                        )}
                      </td>

                      {/* Column 4: Delete After */}
                      <td className="py-4 px-4">
                        {!rule.archive ? (
                          <span className="text-slate-400 font-mono text-base">—</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200">
                            <Clock className="w-3.5 h-3.5 text-cyan-600" />
                            {rule.deleteAfterDays} Days
                          </span>
                        )}
                      </td>

                      {/* Column 5: Actions */}
                      <td className="py-4 px-4 text-right">
                        {isAdmin ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              id={`btn-edit-status-${rule.id}`}
                              onClick={() => onEditStatus(rule)}
                              className="px-2.5 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="Edit status rule"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Edit
                            </button>

                            <button
                              type="button"
                              id={`btn-delete-status-${rule.id}`}
                              onClick={() => onDeleteStatus(rule)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete status rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Locked</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3.5 bg-slate-50/70 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Active in candidate database
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              Triggers cleanup archiving
            </span>
          </div>
          <span className="text-slate-400">
            Showing {filteredStatuses.length} of {statuses.length} configured statuses
          </span>
        </div>
      </div>
    </div>
  );
};
