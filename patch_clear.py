with open('src/components/JournalChat.tsx', 'r') as f:
    content = f.read()

target = """    setEntrySentiment(null);
  };

  return ("""
replacement = """    setEntrySentiment(null);
    if (onClearExistingEntry) {
      onClearExistingEntry();
    }
  };

  return ("""
content = content.replace(target, replacement)

with open('src/components/JournalChat.tsx', 'w') as f:
    f.write(content)
