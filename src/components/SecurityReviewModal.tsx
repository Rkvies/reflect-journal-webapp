import React, { useEffect } from 'react';
import { ShieldCheck, Server, Database, AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SecurityReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityReviewModal: React.FC<SecurityReviewModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="security-review-title"
          aria-describedby="security-review-desc"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/80 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors"
          >
            
            {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/60 dark:border-white/10 flex items-center justify-between bg-white/30 dark:bg-slate-950/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/70 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shadow-2xs" aria-hidden="true">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 id="security-review-title" className="text-base font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Security Architecture & Threat Model Review</span>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-50/80 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 font-medium">
                  Status: Hardened
                </span>
              </h3>
              <p id="security-review-desc" className="text-xs text-slate-600 dark:text-slate-300">
                Threat modeling & defense-in-depth guarantees for Reflect
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close security review dialog"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
          
          {/* Threat Model Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Core Threat Vectors & Mitigations</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              
              <div className="p-5 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/80 dark:border-white/10 space-y-2 shadow-2xs">
                <div className="flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-300 text-xs font-mono">
                  <span>1. Cross-Tenant Data Leakage</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                  <strong className="text-slate-800 dark:text-slate-100">Threat:</strong> Malicious user attempting to query or tamper with another user's journal entries or reflections.
                </p>
                <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-1.5 font-sans">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-300" />
                  <span>
                    <strong>Mitigation:</strong> Attribute-Based Access Control (ABAC) in <code>firestore.rules</code> enforcing strict <code>request.auth.uid == userId</code> match on <code>users/{'{userId}'}/**</code>. All global collection queries rejected.
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/80 dark:border-white/10 space-y-2 shadow-2xs">
                <div className="flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-300 text-xs font-mono">
                  <span>2. API Key Exposure</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                  <strong className="text-slate-800 dark:text-slate-100">Threat:</strong> <code>GEMINI_API_KEY</code> leaked in client JavaScript bundles or network DevTools.
                </p>
                <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-1.5 font-sans">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-300" />
                  <span>
                    <strong>Mitigation:</strong> 100% server-side Gemini invocation via Express endpoints. Zero <code>VITE_</code> prefixed secrets. Secret retrieved exclusively in backend runtime.
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/80 dark:border-white/10 space-y-2 shadow-2xs">
                <div className="flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-300 text-xs font-mono">
                  <span>3. Journal Prompt Injection</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                  <strong className="text-slate-800 dark:text-slate-100">Threat:</strong> User pasting adversarial payloads trying to hijack model instructions or exfiltrate system data.
                </p>
                <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-1.5 font-sans">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-300" />
                  <span>
                    <strong>Mitigation:</strong> Input length bounding, sanitization, strict markdown context delimiter blocks, and structured JSON output schemas.
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/80 dark:border-white/10 space-y-2 shadow-2xs">
                <div className="flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-300 text-xs font-mono">
                  <span>4. Unbounded Token Runaway</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                  <strong className="text-slate-800 dark:text-slate-100">Threat:</strong> Growing journal histories ballooning context token consumption and API costs.
                </p>
                <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-1.5 font-sans">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-300" />
                  <span>
                    <strong>Mitigation:</strong> Tiered RAG architecture: maintains a compressed ~1500-token running summary document + 3-5 recent entries. Never dumps raw transcripts.
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/80 dark:border-white/10 space-y-2 shadow-2xs md:col-span-2">
                <div className="flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-300 text-xs font-mono">
                  <span>5. Excessive Insight & Weekly Recap Invocation</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                  <strong className="text-slate-800 dark:text-slate-100">Threat:</strong> Triggering heavyweight AI summarization on every single page load or dashboard refresh.
                </p>
                <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-1.5 font-sans">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-300" />
                  <span>
                    <strong>Mitigation:</strong> "Your Week in Reflection" is strictly on-demand or cached at <code>users/{'{uid}'}/insights/weeklySummary</code>. Zero automatic Gemini calls on routine dashboard navigations.
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/80 dark:border-white/10 space-y-2 shadow-2xs md:col-span-2">
                <div className="flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-300 text-xs font-mono">
                  <span>6. Long-Lived Secrets & Stale Credentials</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                  <strong className="text-slate-800 dark:text-slate-100">Threat:</strong> Compromised static secrets (application access PINs, cron ingress keys, API keys) remaining valid indefinitely.
                </p>
                <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-1.5 font-sans">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-300" />
                  <span>
                    <strong>Mitigation:</strong> 90-Day Secret Rotation Lifecycle Policy: Client PINs enforce mandatory 90-day rotation with cryptographic SHA-256 user-salt hashing; cron endpoints support zero-downtime dual-secret grace windows; API keys rotated via Google Secret Manager.
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Collapsible Technical Implementation & Rules Audit for Technical Reviewers */}
          <details className="group p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/80 dark:border-white/10 text-xs transition-all">
            <summary className="font-semibold text-slate-800 dark:text-slate-200 cursor-pointer flex items-center justify-between select-none">
              <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                <Database className="w-4 h-4" />
                <span>Technical Implementation & Rules Audit (Expand to Inspect)</span>
              </span>
              <span className="text-xs font-mono text-slate-500 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            
            <div className="mt-4 space-y-4 pt-3 border-t border-white/60 dark:border-white/10">
              {/* Firestore Security Rules Preview */}
              <div className="space-y-2">
                <h5 className="text-[11px] font-mono uppercase tracking-wider text-slate-700 dark:text-slate-200 font-semibold">
                  Deployed Firestore Security Rules
                </h5>
                <pre className="p-4 rounded-2xl bg-slate-900/90 dark:bg-slate-950/90 text-slate-100 text-[11px] font-mono overflow-x-auto shadow-inner border border-white/10">
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
              <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-900/60 backdrop-blur-md border border-white/80 dark:border-white/10 space-y-1.5 text-xs">
                <div className="flex items-center gap-2 font-mono text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                  <Server className="w-3.5 h-3.5" />
                  <span>Agentic Nudge Scheduler IAM Specs</span>
                </div>
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed font-sans text-[11px]">
                  Configured as a dedicated Cloud Run background job. Service account permissions are restricted strictly to Firestore document reading and nudge document creation within the user partition, authenticated via Google Secret Manager.
                </p>
              </div>
            </div>
          </details>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-white/60 dark:border-white/10 bg-white/30 dark:bg-slate-950/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-700 border border-white/80 dark:border-white/10 text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs"
          >
            Dismiss Review
          </button>
        </div>

      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
};
