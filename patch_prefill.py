with open('src/components/JournalChat.tsx', 'r') as f:
    content = f.read()

target = """      setTitle(`Reflecting on ${prefillPrompt.tag}`);
      
      onClearPrefill?.();
    }
  }, [prefillPrompt]);"""
replacement = """      setTitle(`Reflecting on ${prefillPrompt.tag}`);
      
      onClearPrefill?.();
      onClearExistingEntry?.();
    }
  }, [prefillPrompt]);"""
content = content.replace(target, replacement)
with open('src/components/JournalChat.tsx', 'w') as f:
    f.write(content)
