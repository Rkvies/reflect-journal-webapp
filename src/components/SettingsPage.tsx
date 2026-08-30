import React, { useState, useEffect } from 'react';
import { 
  User, 
  Settings, 
  Sun, 
  Moon, 
  Download, 
  ShieldCheck, 
  Brain, 
  Bell, 
  Type, 
  Check, 
  Trash2, 
  UserX, 
  Copy, 
  FileSpreadsheet, 
  Sparkles,
  Lock,
  Save,
  AlertCircle,
  X,
  KeyRound,
  RefreshCw,
  AlertTriangle,
  Clock,
  History,
  CheckCircle2,
  Shield,
  Calendar,
  Key,
  ShieldAlert
} from 'lucide-react';
import { AppUser, JournalEntry, GratitudeEntry, ProfileSummary } from '../types';
import { updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { 
  calculateRotationStatus, 
  getLocalPinSettings, 
  savePinSettings, 
  simulatePinExpiry, 
  DEFAULT_ROTATION_POLICY_DAYS, 
  PinSettings,
  PinRotationRecord 
} from '../lib/pinSecurity';

interface SettingsPageProps {
  user: AppUser;
  entries: JournalEntry[];
  gratitudeEntries: GratitudeEntry[];
  profileSummary: ProfileSummary | null;
  theme: 'light' | 'dark';
  pinEnabled?: boolean;
  autoLockMinutes?: number;
  onOpenPinSetup?: () => void;
  onOpenPinChange?: () => void;
  onOpenPinRotate?: () => void;
  onOpenPinDisable?: () => void;
  onChangeAutoLock?: (minutes: number) => void;
  onToggleTheme: () => void;
  onOpenMemory: () => void;
  onOpenSecurity: () => void;
  onOpenDeactivateModal: () => void;
  onOpenDeleteModal: () => void;
  onUpdateDisplayName?: (newName: string) => void;
  onFontChange?: (font: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  user,
  entries,
  gratitudeEntries,
  profileSummary,
  theme,
  pinEnabled = false,
  autoLockMinutes = 0,
  onOpenPinSetup,
  onOpenPinChange,
  onOpenPinRotate,
  onOpenPinDisable,
  onChangeAutoLock,
  onToggleTheme,
  onOpenMemory,
  onOpenSecurity,
  onOpenDeactivateModal,
  onOpenDeleteModal,
  onUpdateDisplayName,
  onFontChange,
}) => {
  // Display Name state
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSavedSuccess, setNameSavedSuccess] = useState(false);
  const [nameSaveError, setNameSaveError] = useState<string | null>(null);

  // 90-Day Secret & Password Rotation state
  const [pinSettingsState, setPinSettingsState] = useState<PinSettings>(() => getLocalPinSettings(user.uid));
  const [showRotationHistory, setShowRotationHistory] = useState(false);
  const [simulateNotice, setSimulateNotice] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Sync PIN settings whenever component renders or pinEnabled changes
  useEffect(() => {
    setPinSettingsState(getLocalPinSettings(user.uid));
  }, [user.uid, pinEnabled]);

  const rotationStatus = calculateRotationStatus(pinSettingsState);

  // Toggle Mandatory 90-Day Rotation Enforcement
  const handleToggleEnforceRotation = async () => {
    const nextEnforce = !pinSettingsState.enforceRotation;
    const updated = await savePinSettings(user.uid, { enforceRotation: nextEnforce });
    setPinSettingsState(updated);
  };

  // Simulate 90-Day Expiry (for instant testing of expiration triggers & UI)
  const handleSimulateExpiryToggle = async (daysAgo: number) => {
    setIsSimulating(true);
    try {
      const updated = await simulatePinExpiry(user.uid, daysAgo);
      setPinSettingsState(updated);
      setSimulateNotice(daysAgo > 0 ? `Simulated PIN set to ${daysAgo} days ago (Status: Expired)` : `Simulated PIN reset to today (Status: Compliant)`);
      setTimeout(() => setSimulateNotice(null), 4000);
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Preference states stored in localStorage
  const [autoSentiment, setAutoSentiment] = useState<boolean>(() => {
    return localStorage.getItem('reflect_setting_auto_sentiment') !== 'false';
  });
  const [enableNudges, setEnableNudges] = useState<boolean>(() => {
    return localStorage.getItem('reflect_setting_enable_nudges') !== 'false';
  });
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(() => {
    return localStorage.getItem('reflect_setting_reminder_enabled') === 'true';
  });
  const [reminderTime, setReminderTime] = useState<string>(() => {
    return localStorage.getItem('reflect_setting_reminder_time') || '20:00';
  });
  const [gratitudeReminderEnabled, setGratitudeReminderEnabled] = useState<boolean>(() => {
    return localStorage.getItem('reflect_setting_gratitude_reminder_enabled') === 'true';
  });
  const [gratitudeReminderTime, setGratitudeReminderTime] = useState<string>(() => {
    return localStorage.getItem('reflect_setting_gratitude_reminder_time') || '09:00';
  });
  const [fontPreference, setFontPreference] = useState<string>(() => {
    return localStorage.getItem('reflect_setting_font') || 'sans';
  });

  // Save Name handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    try {
      setIsSavingName(true);
      setNameSaveError(null);
      setNameSavedSuccess(false);

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      }

      if (onUpdateDisplayName) {
        onUpdateDisplayName(displayName.trim());
      }

      setNameSavedSuccess(true);
      setTimeout(() => setNameSavedSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error updating name:', err);
      setNameSaveError(err.message || 'Failed to update profile name');
    } finally {
      setIsSavingName(false);
    }
  };

  // Preference Toggles
  const toggleAutoSentiment = () => {
    const next = !autoSentiment;
    setAutoSentiment(next);
    localStorage.setItem('reflect_setting_auto_sentiment', String(next));
  };

  const toggleEnableNudges = () => {
    const next = !enableNudges;
    setEnableNudges(next);
    localStorage.setItem('reflect_setting_enable_nudges', String(next));
  };

  const toggleReminder = () => {
    const next = !reminderEnabled;
    setReminderEnabled(next);
    localStorage.setItem('reflect_setting_reminder_enabled', String(next));
  };

  const handleReminderTimeChange = (time: string) => {
    setReminderTime(time);
    localStorage.setItem('reflect_setting_reminder_time', time);
  };

  const toggleGratitudeReminder = () => {
    const next = !gratitudeReminderEnabled;
    setGratitudeReminderEnabled(next);
    localStorage.setItem('reflect_setting_gratitude_reminder_enabled', String(next));
  };

  const handleGratitudeReminderTimeChange = (time: string) => {
    setGratitudeReminderTime(time);
    localStorage.setItem('reflect_setting_gratitude_reminder_time', time);
  };

  const handleFontChange = (font: string) => {
    setFontPreference(font);
    localStorage.setItem('reflect_setting_font', font);
    if (onFontChange) onFontChange(font);
  };

  // Export Data XLSX
  const handleExportXLSX = async () => {
    try {
      const XLSX = await import('xlsx');
      const data = entries.map(e => ({
        Date: new Date(e.createdAt).toLocaleString(),
        Title: e.title || 'Untitled',
        Mood: e.mood,
        Sentiment: e.sentiment?.label || '',
        'Sentiment Score': e.sentiment?.score || '',
        'Word Count': e.wordCount,
        Tags: e.tags?.join(', ') || '',
        Content: e.content
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Journal Entries");
      XLSX.writeFile(workbook, `reflect-journal-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      console.error("Failed to export XLSX", error);
    }
  };

  // Export Data Markdown
  const handleExportMarkdown = () => {
    let mdContent = `# Reflect Journal Archive Export\n`;
    mdContent += `**User:** ${user.displayName || 'Author'} (${user.email || user.uid})\n`;
    mdContent += `**Export Date:** ${new Date().toLocaleString()}\n`;
    mdContent += `**Total Reflections:** ${entries.length}\n\n`;

    mdContent += `---\n\n## Journal Entries\n\n`;
    entries.forEach((e, idx) => {
      mdContent += `### ${idx + 1}. ${e.title || 'Untitled Reflection'}\n`;
      mdContent += `**Date:** ${new Date(e.createdAt).toLocaleString()} | **Mood:** ${e.mood} | **Words:** ${e.wordCount}\n`;
      if (e.sentiment) {
        mdContent += `**Sentiment:** ${e.sentiment.emoji} ${e.sentiment.label} (Score: ${e.sentiment.score}/100)\n`;
      }
      if (e.tags && e.tags.length > 0) {
        mdContent += `**Tags:** ${e.tags.map(t => `#${t}`).join(' ')}\n`;
      }
      mdContent += `\n${e.content}\n\n`;

      if (e.conversation && e.conversation.length > 0) {
        mdContent += `#### AI Reflections Dialogue\n`;
        e.conversation.forEach((turn) => {
          mdContent += `**${turn.role === 'user' ? 'Author' : 'Reflect AI'}:** ${turn.text}\n\n`;
        });
      }
      mdContent += `---\n\n`;
    });

    if (gratitudeEntries.length > 0) {
      mdContent += `## Daily Gratitude Logs\n\n`;
      gratitudeEntries.forEach((g) => {
        mdContent += `### Date: ${g.date}\n`;
        mdContent += `1. ${g.item1}\n2. ${g.item2}\n3. ${g.item3}\n`;
        if (g.reflection) {
          mdContent += `*Reflection:* ${g.reflection}\n`;
        }
        mdContent += `\n`;
      });
    }

    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(mdContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `reflect-journal-${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      
      {/* Settings Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-300 dark:border-slate-700 rounded-3xl p-6 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-slate-900 dark:text-white">
              Application Settings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customize your profile, preferences, AI memory, and privacy configuration
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 1. Account Profile Card */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-300 dark:border-slate-700 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white">
              Profile & Credentials
            </h3>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Display Name
              </label>
              <div className="flex gap-2">
                <input
                  id="input-settings-display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-500 shadow-xs"
                />
                <button
                  id="btn-save-display-name"
                  type="submit"
                  disabled={isSavingName || !displayName.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingName ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
              {nameSavedSuccess && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Profile name updated successfully!
                </p>
              )}
              {nameSaveError && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">
                  {nameSaveError}
                </p>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Authenticated Email
                </span>
                <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-mono">
                  {user.email || 'Google Authentication Account'}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* 2. PIN Lock Security & 90-Day Secret Rotation Card */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-300 dark:border-slate-700 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white">
                App PIN Lock & Secret Rotation
              </h3>
            </div>
            {pinEnabled ? (
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Active Protection</span>
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                Disabled
              </span>
            )}
          </div>

          <div className="space-y-5 text-xs">
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Require a 6-digit cryptographic PIN code to unlock your journal. In compliance with security standards, secrets are governed by an automated 90-day lifecycle rotation policy.
            </p>

            {pinEnabled ? (
              <div className="space-y-4">
                {/* 90-Day Rotation Policy Status Card */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  rotationStatus.isExpired
                    ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                    : rotationStatus.isExpiringSoon
                    ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                    : 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200/80 dark:border-indigo-900/60 text-slate-900 dark:text-slate-100'
                }`}>
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2">
                      <RefreshCw className={`w-4 h-4 ${rotationStatus.isExpired ? 'text-rose-600 dark:text-rose-400 animate-spin' : 'text-indigo-600 dark:text-indigo-400'}`} />
                      <span className="font-bold text-xs">
                        90-Day Secret Rotation Policy
                      </span>
                    </div>

                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                      rotationStatus.isExpired
                        ? 'bg-rose-100 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                        : rotationStatus.isExpiringSoon
                        ? 'bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                        : 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                    }`}>
                      {rotationStatus.isExpired ? (
                        <>
                          <AlertTriangle className="w-3 h-3" />
                          <span>Expired (Rotation Required)</span>
                        </>
                      ) : rotationStatus.isExpiringSoon ? (
                        <>
                          <Clock className="w-3 h-3" />
                          <span>Expiring Soon ({rotationStatus.daysRemaining}d remaining)</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Compliant ({rotationStatus.daysRemaining}d remaining)</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Visual 90-Day Progress Bar */}
                  <div className="space-y-1.5 my-3">
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          rotationStatus.isExpired
                            ? 'bg-rose-500 w-full'
                            : rotationStatus.isExpiringSoon
                            ? 'bg-amber-500'
                            : 'bg-indigo-600'
                        }`}
                        style={{ width: `${Math.min(100, Math.round((rotationStatus.daysElapsed / (pinSettingsState.rotationPolicyDays || 90)) * 100))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                      <span>Rotated {rotationStatus.daysElapsed} days ago</span>
                      <span>Policy: {pinSettingsState.rotationPolicyDays || 90} Days Limit</span>
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80">
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Last Secret Rotation:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                        {pinSettingsState.lastRotatedAt ? new Date(pinSettingsState.lastRotatedAt).toLocaleDateString() : 'Initial Setup'}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80">
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Next Mandatory Rotation:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                        {new Date(rotationStatus.nextRotationDeadline).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Rotation Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-3">
                    <button
                      id="btn-rotate-pin-now"
                      type="button"
                      onClick={onOpenPinRotate || onOpenPinChange}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Rotate PIN / Secret Now</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setShowRotationHistory(!showRotationHistory)}
                      className="px-3 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>{showRotationHistory ? 'Hide Audit Log' : 'View Rotation Audit Log'}</span>
                    </button>
                  </div>
                </div>

                {/* Simulation & Testing Notice */}
                {simulateNotice && (
                  <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 text-[11px] flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                    <span>{simulateNotice}</span>
                  </div>
                )}

                {/* Rotation Audit History Log */}
                {showRotationHistory && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Secret Rotation Audit Trail</span>
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {pinSettingsState.rotationHistory?.length || 0} Recorded Rotations
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {pinSettingsState.rotationHistory && pinSettingsState.rotationHistory.length > 0 ? (
                        pinSettingsState.rotationHistory.slice().reverse().map((record, index) => (
                          <div 
                            key={record.id || index}
                            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[10px]"
                          >
                            <div className="space-y-0.5">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                                {record.reason === 'routine_90_day_rotation' 
                                  ? '90-Day Routine Policy Rotation' 
                                  : record.reason === 'initial_setup'
                                  ? 'Initial PIN Setup'
                                  : record.reason === 'reset_recovery'
                                  ? 'Google Auth Recovery Reset'
                                  : 'Manual User PIN Change'}
                              </span>
                              <span className="text-slate-500 dark:text-slate-400 font-mono">
                                {new Date(record.rotatedAt).toLocaleString()}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-md font-semibold text-[9px] ${
                              record.status === 'active' 
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}>
                              {record.status === 'active' ? 'Active' : 'Superseded'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-slate-500 italic py-1">
                          No prior rotation history records yet.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Policy Enforcement & Inactivity Controls */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        Enforce 90-Day Mandatory Rotation
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Require creating a new PIN when unlocked after 90 days
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleEnforceRotation}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                        pinSettingsState.enforceRotation ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                      aria-label="Toggle 90-day rotation enforcement"
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                          pinSettingsState.enforceRotation ? 'left-6' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  {onChangeAutoLock && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Auto-Lock App After Inactivity
                      </label>
                      <select
                        value={autoLockMinutes}
                        onChange={(e) => onChangeAutoLock(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value={0}>Never (Manual Lock Only)</option>
                        <option value={1}>1 Minute</option>
                        <option value={5}>5 Minutes</option>
                        <option value={10}>10 Minutes</option>
                        <option value={15}>15 Minutes</option>
                        <option value={30}>30 Minutes</option>
                      </select>
                    </div>
                  )}

                  {/* Simulation Controls for Testing */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      QA Test Rotation State:
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        disabled={isSimulating}
                        onClick={() => handleSimulateExpiryToggle(92)}
                        className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-[10px] font-semibold cursor-pointer"
                      >
                        Simulate Expired (92d)
                      </button>
                      <button
                        type="button"
                        disabled={isSimulating}
                        onClick={() => handleSimulateExpiryToggle(0)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 text-[10px] font-semibold cursor-pointer"
                      >
                        Reset to Compliant (0d)
                      </button>
                    </div>
                  </div>

                  {/* Standard Actions */}
                  <div className="flex gap-2.5 pt-2">
                    <button
                      id="btn-change-pin"
                      type="button"
                      onClick={onOpenPinChange}
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-300 dark:border-slate-700"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>Change PIN</span>
                    </button>
                    <button
                      id="btn-disable-pin"
                      type="button"
                      onClick={onOpenPinDisable}
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Remove PIN</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    No PIN Lock Configured
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Set up an optional 6-digit PIN lock with 90-day secret rotation policy for maximum privacy when accessing your journal.
                  </p>
                </div>

                <button
                  id="btn-setup-pin"
                  type="button"
                  onClick={onOpenPinSetup}
                  className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Set Up 6-Digit PIN Lock</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. Theme & Customization Card */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-300 dark:border-slate-700 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Sun className="w-4 h-4 text-amber-500" />
            <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white">
              Appearance & Font Styling
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Color Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  id="btn-settings-theme-light"
                  type="button"
                  onClick={() => theme !== 'light' && onToggleTheme()}
                  className={`p-3 rounded-2xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    theme === 'light'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-xs ring-2 ring-indigo-400/30'
                      : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Light Atmosphere</span>
                </button>
                <button
                  id="btn-settings-theme-dark"
                  type="button"
                  onClick={() => theme !== 'dark' && onToggleTheme()}
                  className={`p-3 rounded-2xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200 shadow-xs ring-2 ring-indigo-500/30'
                      : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                  }`}
                >
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span>Dark Twilight</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-indigo-500" />
                <span>Journal Typography Preference</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'sans', label: 'Sans (Modern)', class: 'font-sans' },
                  { id: 'serif', label: 'Serif (Classic)', class: 'font-serif' },
                  { id: 'mono', label: 'Mono (Technical)', class: 'font-mono' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleFontChange(f.id)}
                    className={`p-2.5 rounded-xl border text-xs text-center transition-all cursor-pointer ${f.class} ${
                      fontPreference === f.id
                        ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 3. AI Companion & Memory Settings */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-300 dark:border-slate-700 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Brain className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white">
                AI Intelligence & Memory
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Gemini 3.5
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Automated Sentiment Detection
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Derive visual sentiment indicators and scores automatically for new entries
                </span>
              </div>
              <button
                type="button"
                onClick={toggleAutoSentiment}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer flex-shrink-0 ${
                  autoSentiment ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    autoSentiment ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Proactive Reflection Nudges
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Receive personalized writing suggestions based on your memory themes
                </span>
              </div>
              <button
                type="button"
                onClick={toggleEnableNudges}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer flex-shrink-0 ${
                  enableNudges ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    enableNudges ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={onOpenMemory}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Inspect Memory Context</span>
              </button>
              <button
                type="button"
                onClick={onOpenSecurity}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Security Audit</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4. Daily Reminders & Notifications */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-300 dark:border-slate-700 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white">
              Mindful Reminders
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* Daily Reflection Alert */}
            <div className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Daily Reflection Alert
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Notify me to record my evening reflections
                </span>
              </div>
              <button
                type="button"
                onClick={toggleReminder}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer flex-shrink-0 ${
                  reminderEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    reminderEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {reminderEnabled && (
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
                <label className="block text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                  Preferred Reflection Reminder Time
                </label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => handleReminderTimeChange(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-slate-800 dark:text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500 shadow-xs"
                />
              </div>
            )}

            {/* Daily Gratitude Reminder */}
            <div className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Daily Gratitude Reminder
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Prompt me to list 3 things I'm grateful for every day
                </span>
              </div>
              <button
                id="toggle-gratitude-reminder"
                type="button"
                onClick={toggleGratitudeReminder}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer flex-shrink-0 ${
                  gratitudeReminderEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    gratitudeReminderEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {gratitudeReminderEnabled && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
                <label className="block text-xs font-semibold text-emerald-950 dark:text-emerald-200">
                  Preferred Gratitude Reminder Time
                </label>
                <input
                  id="input-gratitude-reminder-time"
                  type="time"
                  value={gratitudeReminderTime}
                  onChange={(e) => handleGratitudeReminderTimeChange(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 text-slate-800 dark:text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500 shadow-xs"
                />
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 5. Data Export & Danger Zone */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-300 dark:border-slate-700 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white">
              Data Backup & Account Management
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {entries.length} reflections • {gratitudeEntries.length} gratitude logs
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Export Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-indigo-500" />
              <span>Export Journal Records</span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Download your full private journal data for offline backup or migration anytime.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                id="btn-export-xlsx"
                type="button"
                onClick={handleExportXLSX}
                className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
                <span>Export XLSX</span>
              </button>
              <button
                id="btn-export-markdown"
                type="button"
                onClick={handleExportMarkdown}
                className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Export Markdown</span>
              </button>
            </div>
          </div>

          {/* Account Danger Actions */}
          <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 space-y-3">
            <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>Account Danger Zone</span>
            </h4>
            <p className="text-[11px] text-rose-900/70 dark:text-rose-300/70 leading-relaxed">
              Deactivate your account temporarily or purge all data permanently from Firestore.
            </p>
            <div className="flex gap-2">
              <button
                id="btn-settings-deactivate"
                type="button"
                onClick={onOpenDeactivateModal}
                className="flex-1 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Deactivate</span>
              </button>
              <button
                id="btn-settings-delete"
                type="button"
                onClick={onOpenDeleteModal}
                className="flex-1 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
