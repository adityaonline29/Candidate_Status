import React, { useState, useEffect } from 'react';
import { CandidateStatusRule, DeleteAfterDays } from '../types';
import {
  X,
  Archive,
  UserCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface StatusFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusToEdit: CandidateStatusRule | null;
  existingStatuses: CandidateStatusRule[];
  onSave: (statusData: Omit<CandidateStatusRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onRequestConfirmation: (options: {
    title: string;
    message: string;
    confirmLabel: string;
    confirmVariant?: 'danger' | 'primary' | 'warning';
    onConfirm: () => void;
  }) => void;
}

const VALID_DELETE_PERIODS: DeleteAfterDays[] = [7, 15, 30, 60, 90];

export const StatusFormModal: React.FC<StatusFormModalProps> = ({
  isOpen,
  onClose,
  statusToEdit,
  existingStatuses,
  onSave,
  onRequestConfirmation,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [archive, setArchive] = useState<boolean>(false);
  const [approvalRequired, setApprovalRequired] = useState<boolean | null>(null);
  const [deleteAfterDays, setDeleteAfterDays] = useState<DeleteAfterDays | null>(7);
  const [isActive, setIsActive] = useState<boolean>(true);

  const [errors, setErrors] = useState<{
    name?: string;
    archive?: string;
    approvalRequired?: string;
    deleteAfterDays?: string;
  }>({});

  useEffect(() => {
    if (statusToEdit) {
      setName(statusToEdit.name);
      setDescription(statusToEdit.description || '');
      setArchive(statusToEdit.archive);
      setApprovalRequired(statusToEdit.approvalRequired);
      setDeleteAfterDays(statusToEdit.deleteAfterDays || 7);
      setIsActive(statusToEdit.isActive);
    } else {
      setName('');
      setDescription('');
      setArchive(false);
      setApprovalRequired(null);
      setDeleteAfterDays(7);
      setIsActive(true);
    }
    setErrors({});
  }, [statusToEdit, isOpen]);

  if (!isOpen) return null;

  const handleArchiveChange = (val: boolean) => {
    setArchive(val);
    if (!val) {
      setApprovalRequired(null);
      setDeleteAfterDays(null);
    } else {
      if (approvalRequired === null) {
        setApprovalRequired(false);
      }
      setDeleteAfterDays(7);
    }
    setErrors((prev) => ({ ...prev, archive: undefined }));
  };

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = 'Status name is mandatory.';
    } else {
      const isDuplicate = existingStatuses.some(
        (s) =>
          s.name.trim().toLowerCase() === name.trim().toLowerCase() &&
          s.id !== statusToEdit?.id
      );
      if (isDuplicate) {
        newErrors.name = `A status named "${name.trim()}" already exists. Name must be unique.`;
      }
    }

    if (archive === undefined || archive === null) {
      newErrors.archive = 'Archive selection is mandatory.';
    }

    if (archive && (approvalRequired === null || approvalRequired === undefined)) {
      newErrors.approvalRequired = 'Approval selection is mandatory when archiving is enabled.';
    }

    if (archive) {
      if (!deleteAfterDays) {
        newErrors.deleteAfterDays = 'Delete retention period is mandatory when archiving is enabled.';
      } else if (!VALID_DELETE_PERIODS.includes(deleteAfterDays)) {
        newErrors.deleteAfterDays = 'Delete period must be 7, 15, 30, 60, or 90 Days.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: name.trim(),
      description: (statusToEdit?.description || description || '').trim(),
      archive,
      approvalRequired: archive ? approvalRequired : null,
      deleteAfterDays: archive ? deleteAfterDays : null,
      isActive,
    };

    if (statusToEdit) {
      const willAutoArchive = archive && !statusToEdit.archive;
      const changedRetention = archive && statusToEdit.deleteAfterDays !== deleteAfterDays;

      if (willAutoArchive || changedRetention) {
        onRequestConfirmation({
          title: 'Confirm Cleanup Rule Update',
          message: `Updating "${name}" will apply these archiving and deletion policies to candidates assigned this status. Are you sure you want to save?`,
          confirmLabel: 'Yes, Save Changes',
          confirmVariant: 'primary',
          onConfirm: () => {
            onSave(payload);
            onClose();
          },
        });
        return;
      }
    }

    onSave(payload);
    onClose();
  };

  return (
    <div
      id="status-form-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="status-form-modal-container"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50/80 border-b border-slate-200">
          <div>
            <h2 id="status-modal-title" className="text-base font-bold text-slate-900">
              {statusToEdit ? 'Edit Candidate Status Rule' : 'Create Candidate Status'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure status name and automated archiving rules
            </p>
          </div>
          <button
            type="button"
            id="btn-close-status-modal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Status Name */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="input-status-name" className="text-xs font-semibold text-slate-800">
                Status Name <span className="text-rose-500">*</span>
              </label>
              <span className="text-3xs text-slate-400 uppercase tracking-wider font-medium">Unique</span>
            </div>
            <input
              type="text"
              id="input-status-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="e.g. Follow-up Needed, Call Back, Busy"
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                errors.name
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
              }`}
            />
            {errors.name && (
              <p id="error-status-name" className="text-xs text-rose-600 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Archive Candidate? */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <Archive className="w-4 h-4 text-indigo-600" />
                Archive Candidate? <span className="text-rose-500">*</span>
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Should candidates with this status be moved to the archive?
              </p>
            </div>

            <div className="flex items-center gap-4 pt-0.5">
              <label
                className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-medium transition-all ${
                  archive === false
                    ? 'bg-white border-indigo-500 text-indigo-700 shadow-2xs'
                    : 'bg-slate-100/70 border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="archive-toggle"
                  id="radio-archive-no"
                  checked={archive === false}
                  onChange={() => handleArchiveChange(false)}
                  className="sr-only"
                />
                <span className={`w-2 h-2 rounded-full ${archive === false ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                <span>No (Keep Active)</span>
              </label>

              <label
                className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-medium transition-all ${
                  archive === true
                    ? 'bg-white border-indigo-500 text-indigo-700 shadow-2xs'
                    : 'bg-slate-100/70 border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="archive-toggle"
                  id="radio-archive-yes"
                  checked={archive === true}
                  onChange={() => handleArchiveChange(true)}
                  className="sr-only"
                />
                <span className={`w-2 h-2 rounded-full ${archive === true ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                <span>Yes (Move to Archive)</span>
              </label>
            </div>
          </div>

          {/* Conditional Archive Configuration (Shown ONLY if Archive = Yes) */}
          {archive && (
            <div
              id="conditional-archive-settings"
              className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              {/* Approval Required? */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-700" />
                  Approval Required? <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-4">
                  <label
                    className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border cursor-pointer text-xs font-medium transition-all ${
                      approvalRequired === false
                        ? 'bg-white border-indigo-500 text-indigo-700 shadow-2xs'
                        : 'bg-slate-100/70 border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="approval-toggle"
                      id="radio-approval-no"
                      checked={approvalRequired === false}
                      onChange={() => {
                        setApprovalRequired(false);
                        setErrors((prev) => ({ ...prev, approvalRequired: undefined }));
                      }}
                      className="sr-only"
                    />
                    <span>No (Direct Archive)</span>
                  </label>

                  <label
                    className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border cursor-pointer text-xs font-medium transition-all ${
                      approvalRequired === true
                        ? 'bg-white border-indigo-500 text-indigo-700 shadow-2xs'
                        : 'bg-slate-100/70 border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="approval-toggle"
                      id="radio-approval-yes"
                      checked={approvalRequired === true}
                      onChange={() => {
                        setApprovalRequired(true);
                        setErrors((prev) => ({ ...prev, approvalRequired: undefined }));
                      }}
                      className="sr-only"
                    />
                    <span>Yes (Admin Review)</span>
                  </label>
                </div>
                {errors.approvalRequired && (
                  <p className="text-xs text-rose-600 font-medium">{errors.approvalRequired}</p>
                )}
              </div>

              {/* Delete Retention Period (Fixed Default 7 Days) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-700" />
                    Delete After <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-3xs text-slate-500">Retention Period</span>
                </div>

                <div
                  id="select-delete-after"
                  className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-100/70 text-slate-700 flex items-center justify-between"
                >
                  <span className="font-semibold text-slate-900">7 Days</span>
                  <span className="text-3xs text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-md font-medium">Default Retention</span>
                </div>
              </div>

              {/* Clean compact execution note */}
              <div
                id="rule-execution-preview"
                className="p-2.5 bg-white/90 border border-indigo-100 rounded-lg text-2xs text-slate-600 flex items-start gap-2"
              >
                <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <p className="leading-normal">
                  {approvalRequired
                    ? 'Requires Admin review before archiving. Once approved, candidates are held for 7 days before permanent deletion.'
                    : 'Moves candidates directly to Archive with a 7-day retention period before permanent deletion.'}
                </p>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
            <button
              type="button"
              id="btn-cancel-status-form"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-save-status"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Save Status
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
