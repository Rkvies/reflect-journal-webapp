import React from 'react';
import { ShieldCheck, Lock, Key, Server, Database, AlertTriangle, X, CheckCircle2 } from 'lucide-react';

interface SecurityReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityReviewModal: React.FC<SecurityReviewModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-3xl bg-white/85 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200/60 flex items-center justify-between bg-white/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-slate-900 flex items-center gap-2">
                <span>Security Architecture & Threat Model Review</span>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                  Status: Hardened
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Threat modeling & defense-in-depth guarantees for Reflect
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

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs sm:text-sm text-slate-700">
          
          {/* Threat Model Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-amber-700 font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Core Threat Vectors & Mitigations</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              
              <div className="p-5 rounded-2xl bg-white/70 border border-slate-200/80 space-y-2 shadow-xs">
                <div className="flex items-center gap-1.5 font-semibold text-rose-700 text-xs font-mono">
                  <span>1. Cross-Tenant Data Leakage</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong className="text-slate-800">Threat:</strong> Malicious user attempting to query or tamper with another user's journal entries or reflections.
                </p>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[11px] text-emerald-800 flex items-start gap-1.5 font-sans">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-600" />
                  <span>
                    <strong>Mitigation:</strong> Attribute-Based Access Control (ABAC) in <code>firestore.rules</code> enforcing strict <code>request.auth.uid == userId</code> match on <code>users/{'{userId}'}/**</code>. All global collection queries rejected.
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white/70 border border-slate-200/80 space-y-2 shadow-xs">
                <div className="flex items-center gap-1.5 font-semibold text-rose-700 text-xs font-mono">
                  <span>2. API Key Exposure</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong className="text-slate-800">Threat:</strong> <code>GEMINI_API_KEY</code> leaked in client JavaScript bundles or network DevTools.
                </p>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[11px] text-emerald-800 flex items-start gap-1.5 font-sans">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-600" />
                  <span>
                    <strong>Mitigation:</strong> 100% server-side Gemini invocation via Express endpoints. Zero <code>VITE_</code> prefixed secrets. Secret retrieved exclusively in backend runtime.
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white/70 border border-slate-200/80 space-y-2 shadow-xs">
                <div className="flex items-center gap-1.5 font-semibold text-rose-700 text-xs font-mono">
                  <span>3. Journal Prompt Injection</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong className="text-slate-800">Threat:</strong> User pasting adversarial payloads trying to hijack model instructions or exfiltrate system data.
                </p>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[11px] text-emerald-800 flex items-start gap-1.5 font-sans">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-600" />
                  <span>
                    <strong>Mitigation:</strong> Input length bounding, sanitization, strict markdown context delimiter blocks, and structured JSON output schemas.
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white/70 border border-slate-200/80 space-y-2 shadow-xs">
                <div className="flex items-center gap-1.5 font-semibold text-rose-700 text-xs font-mono">
                  <span>4. Unbounded Token Runaway</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong className="text-slate-800">Threat:</strong> Growing journal histories ballooning context token consumption and API costs.
                </p>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[11px] text-emerald-800 flex items-start gap-1.5 font-sans">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-600" />
                  <span>
                    <strong>Mitigation:</strong> Tiered RAG architecture: maintains a compressed ~1500-token running summary document + 3-5 recent entries. Never dumps raw transcripts.
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Firestore Security Rules Preview */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono uppercase tracking-wider text-emerald-700 font-semibold flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              <span>Deployed Firestore Security Rules</span>
            </h4>
            <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto shadow-inner">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`}
            </pre>
          </div>

          {/* Scheduled Job IAM Specs */}
          <div className="p-5 rounded-2xl bg-white/60 border border-slate-200/80 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-mono text-indigo-700 font-bold">
              <Server className="w-4 h-4" />
              <span>Agentic Nudge Cloud Scheduler Job (Least-Privilege IAM)</span>
            </div>
            <p className="text-slate-600 leading-relaxed font-sans">
              Designed as a separate Cloud Scheduler-triggered Cloud Run job. Service account permissions are restricted strictly to Firestore read on <code>users/*/entries</code> and write on <code>users/*/nudges</code>, plus Secret Manager access for <code>GEMINI_API_KEY</code>. No outbound external communication (no unsolicited email/SMS).
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200/60 bg-white/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
          >
            Dismiss Review
          </button>
        </div>

      </div>
    </div>
  );
};
