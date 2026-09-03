const fs = require('fs');
const content = fs.readFileSync('src/components/EntryHistory.tsx', 'utf8');

const targetStr = `                    {isOwner && (
                      <button
                        id={\`btn-delete-entry-\${entry.id}\`}`;

const replacementStr = `                    {isOwner && onContinueEntry && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onContinueEntry(entry); }}
                        title="Continue this reflection"
                        aria-label={\`Continue reflection \${entry.title || 'Untitled'}\`}
                        className="p-2 rounded-xl text-slate-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/80 dark:hover:bg-indigo-900/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-edit-3"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                      </button>
                    )}
                    {isOwner && (
                      <button
                        id={\`btn-delete-entry-\${entry.id}\`}`;

const newContent = content.replace(targetStr, replacementStr);
fs.writeFileSync('src/components/EntryHistory.tsx', newContent);
