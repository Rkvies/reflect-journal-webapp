#!/bin/bash
# First, protect dark: variants from being touched by the light mode pass
find src/ -name "*.tsx" -exec sed -i 's/dark:text-slate-400/DARK_TEXT_SLATE_400/g' {} +
find src/ -name "*.tsx" -exec sed -i 's/dark:text-slate-500/DARK_TEXT_SLATE_500/g' {} +
find src/ -name "*.tsx" -exec sed -i 's/dark:text-slate-600/DARK_TEXT_SLATE_600/g' {} +
find src/ -name "*.tsx" -exec sed -i 's/dark:text-slate-300/DARK_TEXT_SLATE_300/g' {} +
find src/ -name "*.tsx" -exec sed -i 's/dark:text-slate-200/DARK_TEXT_SLATE_200/g' {} +
find src/ -name "*.tsx" -exec sed -i 's/dark:text-slate-100/DARK_TEXT_SLATE_100/g' {} +

# Apply Light Mode contrast boosts (run highest to lowest to avoid double-bumping)
find src/ -name "*.tsx" -exec sed -i 's/text-slate-600/text-slate-700/g' {} +
find src/ -name "*.tsx" -exec sed -i 's/text-slate-500/text-slate-600/g' {} +
find src/ -name "*.tsx" -exec sed -i 's/text-slate-400/text-slate-500/g' {} +

# Restore and boost Dark Mode contrast (run lowest to highest to avoid double-bumping)
find src/ -name "*.tsx" -exec sed -i 's/DARK_TEXT_SLATE_200/dark:text-slate-200/g' {} +
find src/ -name "*.tsx" -exec sed -i 's/DARK_TEXT_SLATE_300/dark:text-slate-200/g' {} +
find src/ -name "*.tsx" -exec sed -i 's/DARK_TEXT_SLATE_400/dark:text-slate-300/g' {} +
find src/ -name "*.tsx" -exec sed -i 's/DARK_TEXT_SLATE_500/dark:text-slate-400/g' {} +
find src/ -name "*.tsx" -exec sed -i 's/DARK_TEXT_SLATE_600/dark:text-slate-400/g' {} +
find src/ -name "*.tsx" -exec sed -i 's/DARK_TEXT_SLATE_100/dark:text-slate-100/g' {} +

