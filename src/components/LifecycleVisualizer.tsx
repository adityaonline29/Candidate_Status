import React, { useState } from 'react';
import { CandidateStatusRule } from '../types';
import {
  ArrowRight,
  Archive,
  UserCheck,
  Clock,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

interface LifecycleVisualizerProps {
  statuses: CandidateStatusRule[];
}

export const LifecycleVisualizer: React.FC<LifecycleVisualizerProps> = ({ statuses }) => {
  const [selectedStatusId, setSelectedStatusId] = useState<string>(
    statuses[0]?.id || 'status-1'
  );

  const selectedRule = statuses.find((s) => s.id === selectedStatusId) || statuses[0];

  return (
    <div id="lifecycle-visualizer-section" className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 id="page-title-visualizer" className="text-2xl font-bold text-slate-900 tracking-tight">
            Lifecycle &amp; Cleanup Flow Visualizer
          </h1>
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            Interactive Logic Architecture
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Visual representation of how candidate profiles transition through automated cleanup rules:
          <span className="font-semibold text-slate-800"> Status → Archive → Approval → Retention Period → Permanent Deletion</span>.
        </p>
      </div>

      {/* Status Picker for Testing the Flow */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            Select a Status to trace its exact execution path:
          </label>
          <span className="text-xs text-slate-400">
            {statuses.length} configured rules
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => {
            const isSelected = status.id === selectedStatusId;
            return (
              <button
                key={status.id}
                type="button"
                onClick={() => setSelectedStatusId(status.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span>{status.name}</span>
                {status.archive ? (
                  <span
                    className={`text-3xs px-1.5 py-0.5 rounded-md font-bold uppercase ${
                      isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    Archive ({status.deleteAfterDays}d)
                  </span>
                ) : (
                  <span
                    className={`text-3xs px-1.5 py-0.5 rounded-md font-bold uppercase ${
                      isSelected ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Path Step Cards */}
      <div className="p-6 bg-gradient-to-b from-slate-50/70 to-white rounded-2xl border border-slate-200 shadow-xs space-y-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Active Trace: <span className="text-indigo-600 text-sm font-bold ml-1">{selectedRule.name}</span>
          </div>
          <span className="text-xs text-slate-500">
            {selectedRule.archive
              ? selectedRule.approvalRequired
                ? 'Workflow: Requires Admin Approval → Archive → Deletion'
                : 'Workflow: Direct Archive → Deletion'
              : 'Workflow: Stays in Active Database'}
          </span>
        </div>

        {/* The 5-Step Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          {/* Step 1: Candidate Status Assigned */}
          <div className="p-4 rounded-xl border-2 border-indigo-500 bg-white shadow-xs relative">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3 font-bold text-sm">
              1
            </div>
            <h4 className="text-xs font-bold text-slate-500 uppercase">Status Assigned</h4>
            <div className="text-sm font-bold text-slate-900 mt-1">{selectedRule.name}</div>
            <p className="text-2xs text-slate-500 mt-1.5 leading-relaxed">
              Recruiter assigns status on candidate profile.
            </p>
          </div>

          {/* Step 2: Archive Decision */}
          <div
            className={`p-4 rounded-xl border-2 shadow-xs transition-all ${
              selectedRule.archive
                ? 'border-indigo-500 bg-indigo-50/40 text-indigo-950'
                : 'border-emerald-500 bg-emerald-50/40 text-emerald-950'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 font-bold text-sm ${
                selectedRule.archive
                  ? 'bg-indigo-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              2
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider opacity-70">Archive?</h4>
            <div className="text-sm font-bold mt-1">
              {selectedRule.archive ? 'Yes (Archive Enabled)' : 'No (Remain Active)'}
            </div>
            <p className="text-2xs mt-1.5 leading-relaxed opacity-80">
              {selectedRule.archive
                ? 'Candidate is slated for archiving & cleanup.'
                : 'Candidate remains in the Active Candidate Database indefinitely.'}
            </p>
          </div>

          {/* Step 3: Approval Check */}
          <div
            className={`p-4 rounded-xl border-2 shadow-xs transition-all ${
              !selectedRule.archive
                ? 'border-slate-200 bg-slate-50 text-slate-400 opacity-60'
                : selectedRule.approvalRequired
                ? 'border-amber-500 bg-amber-50/40 text-amber-950'
                : 'border-slate-300 bg-white text-slate-700'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 font-bold text-sm ${
                !selectedRule.archive
                  ? 'bg-slate-200 text-slate-500'
                  : selectedRule.approvalRequired
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              3
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider opacity-70">
              Approval Required?
            </h4>
            <div className="text-sm font-bold mt-1">
              {!selectedRule.archive
                ? '— (N/A)'
                : selectedRule.approvalRequired
                ? 'Yes (Admin Signoff)'
                : 'No (Direct Move)'}
            </div>
            <p className="text-2xs mt-1.5 leading-relaxed opacity-80">
              {!selectedRule.archive
                ? 'No approval needed for active candidates.'
                : selectedRule.approvalRequired
                ? 'Sent to Admin approval queue before moving to Archive.'
                : 'Moves directly to Archive vault without approval.'}
            </p>
          </div>

          {/* Step 4: Retention Period */}
          <div
            className={`p-4 rounded-xl border-2 shadow-xs transition-all ${
              !selectedRule.archive
                ? 'border-slate-200 bg-slate-50 text-slate-400 opacity-60'
                : 'border-cyan-500 bg-cyan-50/40 text-cyan-950'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 font-bold text-sm ${
                !selectedRule.archive ? 'bg-slate-200 text-slate-500' : 'bg-cyan-600 text-white'
              }`}
            >
              4
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider opacity-70">
              Retention Period
            </h4>
            <div className="text-sm font-bold mt-1">
              {!selectedRule.archive ? '— (No Timer)' : `${selectedRule.deleteAfterDays} Days`}
            </div>
            <p className="text-2xs mt-1.5 leading-relaxed opacity-80">
              {!selectedRule.archive
                ? 'No deletion countdown.'
                : `Countdown starts upon archiving. Admin can restore at any time.`}
            </p>
          </div>

          {/* Step 5: Permanent Deletion */}
          <div
            className={`p-4 rounded-xl border-2 shadow-xs transition-all ${
              !selectedRule.archive
                ? 'border-slate-200 bg-slate-50 text-slate-400 opacity-60'
                : 'border-rose-400 bg-rose-50/40 text-rose-950'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 font-bold text-sm ${
                !selectedRule.archive ? 'bg-slate-200 text-slate-500' : 'bg-rose-600 text-white'
              }`}
            >
              5
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider opacity-70">
              Permanent Deletion
            </h4>
            <div className="text-sm font-bold mt-1">
              {!selectedRule.archive ? 'Never' : 'Automatic Purge'}
            </div>
            <p className="text-2xs mt-1.5 leading-relaxed opacity-80">
              {!selectedRule.archive
                ? 'Retained safely in candidate database.'
                : 'System verifies candidate was not restored, then permanently purges.'}
            </p>
          </div>
        </div>

        {/* Business Rule Matrix Spec Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Rule A: Archive = No
            </span>
            <ul className="text-slate-600 space-y-0.5 text-2xs">
              <li>• Candidate remains Active</li>
              <li>• No approval required</li>
              <li>• No deletion timer</li>
            </ul>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Archive className="w-3.5 h-3.5 text-indigo-600" />
              Rule B: Archive = Yes + Approval = No
            </span>
            <ul className="text-slate-600 space-y-0.5 text-2xs">
              <li>• Candidate moves directly to Archive</li>
              <li>• Deletion timer starts</li>
              <li>• Recruiter access revoked</li>
            </ul>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-amber-600" />
              Rule C: Archive = Yes + Approval = Yes
            </span>
            <ul className="text-slate-600 space-y-0.5 text-2xs">
              <li>• Candidate goes for Admin approval</li>
              <li>• After approval, moves to Archive</li>
              <li>• Deletion timer starts</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
