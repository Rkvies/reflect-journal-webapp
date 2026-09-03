import os

with open('src/components/JournalChat.tsx', 'r') as f:
    content = f.read()

effectBlock = """
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
      if (existingEntry.sentiment) {
        setEntrySentiment(existingEntry.sentiment);
      } else {
        setEntrySentiment(null);
      }
      setStreamingReply(null);
      setEditingTurnId(null);
      setEditingTurnText('');
      setSaveStatus(null);
    }
  }, [existingEntry]);
"""

targetAnchor = "  // Auto-scroll when chat updates or tokens stream in"
newContent = content.replace(targetAnchor, effectBlock + "\n" + targetAnchor)

with open('src/components/JournalChat.tsx', 'w') as f:
    f.write(newContent)
