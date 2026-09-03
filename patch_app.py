with open('src/App.tsx', 'r') as f:
    content = f.read()

target = """            onSelectEntryForReflection={(entry) => {
              setPrefillPrompt({
                prompt: `Continuing reflection on "${entry.title}": `,
                tag: entry.tags?.[0] || 'reflection',
              });
              setActiveTab('journal');
            }}"""

replacement = """            onSelectEntryForReflection={(entry) => {
              setPrefillPrompt({
                prompt: `Continuing reflection on "${entry.title}": `,
                tag: entry.tags?.[0] || 'reflection',
              });
              setActiveTab('journal');
            }}
            onContinueEntry={(entry) => {
              setExistingEntry(entry);
              setActiveTab('journal');
            }}"""

content = content.replace(target, replacement)

import_target = "const [prefillPrompt, setPrefillPrompt] = useState<{ prompt: string; tag: string } | null>(null);"
import_replacement = """const [prefillPrompt, setPrefillPrompt] = useState<{ prompt: string; tag: string } | null>(null);
  const [existingEntry, setExistingEntry] = useState<JournalEntry | null>(null);"""

content = content.replace(import_target, import_replacement)

journalchat_target = """          <JournalChat
            user={currentUser}
            userId={currentUser.uid}
            profileSummary={profileSummary}
            recentEntries={entries}
            onEntrySaved={(savedEntry) => {
              triggerMilestone('first_entry');
              const updatedEntries = [savedEntry, ...entries.filter(e => e.id !== savedEntry.id)];
              checkStreakMilestones(updatedEntries, gratitudeEntries);
            }}
            prefillPrompt={prefillPrompt}
            onClearPrefill={() => setPrefillPrompt(null)}
            activeNudge={activeNudge}
            isDeepFocus={isFocusActive}
            onToggleDeepFocus={() => setIsFocusActive(!isFocusActive)}
          />"""

journalchat_replacement = """          <JournalChat
            user={currentUser}
            userId={currentUser.uid}
            profileSummary={profileSummary}
            recentEntries={entries}
            onEntrySaved={(savedEntry) => {
              triggerMilestone('first_entry');
              const updatedEntries = [savedEntry, ...entries.filter(e => e.id !== savedEntry.id)];
              checkStreakMilestones(updatedEntries, gratitudeEntries);
            }}
            prefillPrompt={prefillPrompt}
            onClearPrefill={() => setPrefillPrompt(null)}
            existingEntry={existingEntry}
            onClearExistingEntry={() => setExistingEntry(null)}
            activeNudge={activeNudge}
            isDeepFocus={isFocusActive}
            onToggleDeepFocus={() => setIsFocusActive(!isFocusActive)}
          />"""
content = content.replace(journalchat_target, journalchat_replacement)

with open('src/App.tsx', 'w') as f:
    f.write(content)
