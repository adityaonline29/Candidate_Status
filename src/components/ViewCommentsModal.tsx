/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Candidate, CandidateComment } from '../types';
import { formatCommentTimestamp } from '../utils/dateUtils';
import {
  SquarePen,
  Trash2,
  Plus,
  Send,
  Check,
  X,
  History,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';

interface ViewCommentsModalProps {
  isOpen: boolean;
  candidate: Candidate | null;
  onClose: () => void;
  onAddComment: (candidateId: string, text: string) => void;
  onEditComment?: (candidateId: string, commentId: string, newText: string) => void;
  onDeleteComment?: (candidateId: string, commentId: string) => void;
}

export function ViewCommentsModal({
  isOpen,
  candidate,
  onClose,
  onAddComment,
  onEditComment,
  onDeleteComment,
}: ViewCommentsModalProps) {
  const [newCommentText, setNewCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'logs'>('comments');

  if (!isOpen || !candidate) return null;

  const comments = candidate.comments || [];
  const statusLogs = candidate.statusLogs || [];

  const handleCreateComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    onAddComment(candidate.id, newCommentText.trim());
    setNewCommentText('');
    setShowAddForm(false);
  };

  const startEdit = (c: CandidateComment) => {
    setEditingCommentId(c.id);
    setEditText(c.text);
  };

  const saveEdit = (commentId: string) => {
    if (!editText.trim()) return;
    if (onEditComment) {
      onEditComment(candidate.id, commentId, editText.trim());
    }
    setEditingCommentId(null);
    setEditText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Modal Header */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              View Comments
            </h3>
            <p className="text-2xs text-slate-500 mt-0.5">
              Candidate: <span className="font-semibold text-slate-800">{candidate.name}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#006e88] hover:bg-sky-50 rounded-lg transition-colors cursor-pointer border border-[#006e88]/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Comment</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Optional Add Comment Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreateComment}
            className="p-4 bg-slate-50 border-b border-slate-200 space-y-2 animate-in slide-in-from-top duration-150"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xs font-semibold text-slate-700">
                New Comment / Note
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                Cancel
              </button>
            </div>
            <textarea
              rows={2}
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Write a note about this candidate..."
              className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#006e88] focus:ring-1 focus:ring-[#006e88]/20"
              autoFocus
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#006e88] hover:bg-[#005a70] text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Post Note
              </button>
            </div>
          </form>
        )}

        {/* Tab Toggle for Comments vs Status History Logs */}
        <div className="px-6 pt-3 flex items-center gap-3 border-b border-slate-100 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('comments')}
            className={`pb-2 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'comments'
                ? 'border-[#006e88] text-[#006e88]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Comments &amp; Updates ({comments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`pb-2 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'logs'
                ? 'border-[#006e88] text-[#006e88]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Status Change Logs ({statusLogs.length})
          </button>
        </div>

        {/* Modal Body: Scrollable Comments List */}
        <div className="p-6 space-y-3.5 overflow-y-auto flex-1 bg-slate-50/50">
          {activeTab === 'comments' && (
            <>
              {comments.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">No comments recorded yet</p>
                  <p className="text-2xs text-slate-400 mt-1">
                    Click &apos;+ Add Comment&apos; or change candidate status to record a note.
                  </p>
                </div>
              ) : (
                comments.map((item) => {
                  const isEditing = editingCommentId === item.id;
                  const createdStr = formatCommentTimestamp(item.createdAt);
                  const updatedStr = formatCommentTimestamp(item.updatedAt || item.createdAt);

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs transition-all hover:border-slate-300"
                    >
                      {/* Top row: Author & Action buttons */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#006e88] tracking-tight">
                            {item.author || 'Innov Facilities'}
                          </h4>
                          {item.isStatusChange && (
                            <span className="px-2 py-0.5 rounded text-3xs font-semibold bg-sky-50 text-[#006e88] border border-sky-200">
                              Status Update
                            </span>
                          )}
                        </div>

                        {/* Top-Right Action Icons (Styled like reference image) */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className="p-1 text-[#006e88] hover:bg-sky-50 rounded-md transition-colors cursor-pointer"
                            title="Edit Comment"
                          >
                            <SquarePen className="w-4 h-4" />
                          </button>
                          {onDeleteComment && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Delete this comment?')) {
                                  onDeleteComment(candidate.id, item.id);
                                }
                              }}
                              className="p-1 text-[#006e88] hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Delete Comment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Status Transition Sub-header if available */}
                      {item.previousStatus && item.newStatus && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-2xs text-slate-500 font-medium">
                          <span>Status changed:</span>
                          <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.previousStatus}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="font-semibold text-[#006e88] bg-sky-50 px-1.5 py-0.5 rounded">
                            {item.newStatus}
                          </span>
                        </div>
                      )}

                      {/* Comment Body / Edit View */}
                      <div className="mt-2 text-xs text-slate-800 leading-relaxed font-normal">
                        {isEditing ? (
                          <div className="space-y-2 mt-1">
                            <textarea
                              rows={2}
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:border-[#006e88]"
                            />
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => setEditingCommentId(null)}
                                className="px-2.5 py-1 text-2xs font-medium text-slate-600 hover:bg-slate-100 rounded-md"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => saveEdit(item.id)}
                                className="px-3 py-1 text-2xs font-semibold bg-[#006e88] text-white rounded-md hover:bg-[#005a70]"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{item.text}</p>
                        )}
                      </div>

                      {/* Bottom row: Created and Updated pills matching reference image */}
                      <div className="mt-3.5 flex flex-wrap items-center gap-2">
                        <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-2xs font-medium">
                          Created: {createdStr || '18 Sept 2026, 11:50:50 am'}
                        </div>
                        <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-2xs font-medium">
                          Updated: {updatedStr || '18 Sept 2026, 11:50:50 am'}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-2.5">
              {statusLogs.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
                  <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">No status change logs recorded yet</p>
                  <p className="text-2xs text-slate-400 mt-1">
                    Every time you update a candidate&apos;s status, a logged audit entry will appear here.
                  </p>
                </div>
              ) : (
                statusLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between text-2xs">
                      <span className="font-bold text-[#006e88]">{log.changedBy || 'Innov Facilities'}</span>
                      <span className="text-slate-400 font-medium">
                        {formatCommentTimestamp(log.timestamp)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                        {log.previousStatusName}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="px-2 py-0.5 rounded bg-sky-50 font-bold text-[#006e88] border border-sky-200">
                        {log.newStatusName}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-800 leading-relaxed border border-slate-200/60">
                      <span className="font-semibold text-2xs text-slate-500 block mb-0.5">Note:</span>
                      &ldquo;{log.comment}&rdquo;
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal Footer: Matching exact image close button */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end">
          <button
            type="button"
            id="btn-close-comments-modal"
            onClick={onClose}
            className="px-6 py-1.5 text-sm font-semibold text-slate-900 bg-white hover:bg-slate-50 border-2 border-slate-900 rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
