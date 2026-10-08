import React from 'react';
import { ConfirmationModalState } from '../types';
import { AlertTriangle, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface ConfirmationModalProps {
  modal: ConfirmationModalState | null;
  onClose: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ modal, onClose }) => {
  if (!modal || !modal.isOpen) return null;

  const isDanger = modal.confirmVariant === 'danger';
  const isWarning = modal.confirmVariant === 'warning';

  return (
    <div
      id="confirmation-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="confirmation-modal-container"
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          id="btn-close-modal"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-xl shrink-0 ${
              isDanger
                ? 'bg-rose-100 text-rose-600'
                : isWarning
                ? 'bg-amber-100 text-amber-600'
                : 'bg-indigo-100 text-indigo-600'
            }`}
          >
            {isDanger && <AlertCircle className="w-6 h-6" />}
            {isWarning && <AlertTriangle className="w-6 h-6" />}
            {!isDanger && !isWarning && <CheckCircle2 className="w-6 h-6" />}
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <h3 id="modal-title" className="text-lg font-semibold text-slate-900 tracking-tight">
              {modal.title}
            </h3>
            <p id="modal-message" className="mt-2 text-sm text-slate-600 leading-relaxed">
              {modal.message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            id="btn-cancel-modal"
            onClick={() => {
              if (modal.onCancel) modal.onCancel();
              onClose();
            }}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            id="btn-confirm-action"
            onClick={() => {
              modal.onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-sm font-semibold rounded-xl text-white shadow-xs transition-colors cursor-pointer ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700'
                : isWarning
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {modal.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
