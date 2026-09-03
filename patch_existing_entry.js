const fs = require('fs');
const content = fs.readFileSync('src/components/JournalChat.tsx', 'utf8');

const effectBlock = `
  useEffect(() => {
    if (existingEntry) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setTitle(existingEntry.title);
      setSelectedMood(existingEntry.mood);
      setTags(existingEntry.tags);
      setConversation(existingEntry.conversation);
      setCurrentEntryId(existingEntry.id);
      setEntryCreatedAt(existingEntry.createdAt);
      setEntrySentiment(existingEntry.sentiment || null);
      setStreamingReply(null);
      setEditingTurnId(null);
      setEditingTurnText('');
      setSaveStatus(null);
    }
  }, [existingEntry]);
`;

const targetAnchor = "  // Auto-scroll when chat updates or tokens stream in";
const newContent = content.replace(targetAnchor, effectBlock + "\n" + targetAnchor);

fs.writeFileSync('src/components/JournalChat.tsx', newContent);
