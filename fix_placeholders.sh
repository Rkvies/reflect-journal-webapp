#!/bin/bash
find src/ -name "*.tsx" -exec sed -i 's/placeholder-slate-400/placeholder-slate-500/g' {} +
