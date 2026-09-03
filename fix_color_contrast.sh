#!/bin/bash
colors=("emerald" "rose" "amber" "indigo")

for color in "${colors[@]}"; do
    # Protect dark variants
    find src/ -name "*.tsx" -exec sed -i "s/dark:text-${color}-300/DARK_TEXT_${color}_300/g" {} +
    find src/ -name "*.tsx" -exec sed -i "s/dark:text-${color}-400/DARK_TEXT_${color}_400/g" {} +
    find src/ -name "*.tsx" -exec sed -i "s/dark:text-${color}-500/DARK_TEXT_${color}_500/g" {} +
    find src/ -name "*.tsx" -exec sed -i "s/dark:text-${color}-600/DARK_TEXT_${color}_600/g" {} +
    find src/ -name "*.tsx" -exec sed -i "s/dark:text-${color}-700/DARK_TEXT_${color}_700/g" {} +

    # Light mode boosts (we want 600 or 700 for text)
    # If it was 500 -> 600
    find src/ -name "*.tsx" -exec sed -i "s/text-${color}-500/text-${color}-600/g" {} +
    # If it was 400 -> 600
    find src/ -name "*.tsx" -exec sed -i "s/text-${color}-400/text-${color}-600/g" {} +
    # If it was 300 -> 600
    find src/ -name "*.tsx" -exec sed -i "s/text-${color}-300/text-${color}-600/g" {} +

    # Restore and boost dark mode
    # For dark mode, 300 or 400 is best.
    find src/ -name "*.tsx" -exec sed -i "s/DARK_TEXT_${color}_300/dark:text-${color}-300/g" {} +
    find src/ -name "*.tsx" -exec sed -i "s/DARK_TEXT_${color}_400/dark:text-${color}-300/g" {} +
    find src/ -name "*.tsx" -exec sed -i "s/DARK_TEXT_${color}_500/dark:text-${color}-400/g" {} +
    find src/ -name "*.tsx" -exec sed -i "s/DARK_TEXT_${color}_600/dark:text-${color}-400/g" {} +
    find src/ -name "*.tsx" -exec sed -i "s/DARK_TEXT_${color}_700/dark:text-${color}-400/g" {} +
done
