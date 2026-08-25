import React, { useState } from 'react';
import { Brain, X, Shield, RefreshCw, Check, Sparkles, FileText } from 'lucide-react';
import Markdown from 'react-markdown';
import { ProfileSummary } from '../types';
import { saveProfileSummary } from '../lib/firebase';

interface ProfileSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  profileSummary: ProfileSummary | null;
}

export const ProfileSummaryModal: React.FC<ProfileSummaryModalProps> = ({
  isOpen,
  onClose,
  userId,
  profileSummary,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(profileSummary?.summary || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const estimatedTokens = Math.round((profileSummary?.summary?.length || 0) / 4);

  const handleSaveEdit = async () => {
    try {
      setIsSaving(true);
      const updated: ProfileSummary = {
        userId,
        summary: editedText,
        lastUpdated: new Date().toISOString(),
        keyThemes: profileSummary?.keyThemes || ['personal-growth'],
        totalEntriesAnalyzed: profileSummary?.totalEntriesAnalyzed || 1,
      };
      await saveProfileSummary(userId, updated);
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving summary:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-white/80 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200/60 flex items-center justify-between bg-white/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-xs">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-slate-900 flex items-center gap-2">
                <span>Agentic Memory Layer</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                  users/{'{uid}'}/profile/summary
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Living contextual summary maintained asynchronously by Gemini
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status bar */}
        <div className="px-6 py-2.5 bg-slate-50/80 border-b border-slate-200/60 flex items-center justify-between text-xs text-slate-500 font-mono">
          <div className="flex items-center gap-3">
            <span>Memory footprint: ~{estimatedTokens} / 2,000 max tokens</span>
            <span>•</span>
            <span>
              Last updated: {profileSummary?.lastUpdated ? new Date(profileSummary.lastUpdated).toLocaleDateString() : 'New'}
            </span>
          </div>
          <button
            onClick={() => {
              setEditedText(profileSummary?.summary || '');
              setIsEditing(!isEditing);
            }}
            className="text-indigo-700 hover:text-indigo-900 font-sans text-xs font-semibold underline cursor-pointer"
          >
            {isEditing ? 'Cancel Edit' : 'Edit Memory Sovereignty'}
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700">
          {isEditing ? (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-600">
                Direct Memory Summary Editor (User Data Sovereignty)
              </label>
              <textarea
                rows={12}
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full p-4 rounded-2xl bg-white border border-slate-200 text-slate-800 text-xs font-mono focus:outline-none focus:border-indigo-400 resize-none leading-relaxed shadow-inner"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          ) : profileSummary?.summary ? (
            <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed bg-white/70 p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <Markdown>{profileSummary.summary}</Markdown>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 space-y-2">
              <Sparkles className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="font-serif font-bold text-slate-800">Memory Layer Initializing</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                As you write journal entries and reflect with Gemini, the backend synthesizes recurring themes, personal values, and growth patterns into this memory profile.
              </p>
            </div>
          )}

          {/* Architectural Notes */}
          <div className="p-4 rounded-2xl bg-white/50 border border-slate-200/70 space-y-1.5 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5 text-emerald-700 font-mono font-semibold">
              <Shield className="w-3.5 h-3.5" />
              <span>Architectural Privacy & Token Optimization</span>
            </div>
            <p>
              This memory document prevents token runaway by distilling months of journaling into structured psychological pillars rather than dumping raw transcripts into context windows.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200/60 bg-white/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
