import { MilestoneKey } from '../types';

export interface MilestoneConfig {
  key: MilestoneKey;
  title: string;
  message: string;
}

export const MILESTONES: Record<MilestoneKey, MilestoneConfig> = {
  first_entry: {
    key: 'first_entry',
    title: 'First Reflection',
    message: 'Your first reflection is saved. This is where it begins.',
  },
  first_gratitude: {
    key: 'first_gratitude',
    title: 'First Gratitude',
    message: "Three small things, noticed. That's the practice.",
  },
  streak_3: {
    key: 'streak_3',
    title: '3-Day Streak',
    message: 'Three days in a row. A rhythm is forming.',
  },
  streak_7: {
    key: 'streak_7',
    title: '7-Day Streak',
    message: 'A full week of showing up for yourself.',
  },
  first_insights: {
    key: 'first_insights',
    title: 'First Insights',
    message: 'Your patterns are starting to take shape.',
  },
  first_weekly_recap: {
    key: 'first_weekly_recap',
    title: 'First Weekly Recap',
    message: 'Your first week, seen all at once.',
  },
  streak_14: {
    key: 'streak_14',
    title: '14-Day Streak',
    message: 'Two weeks. This has become part of your days.',
  },
};

/**
 * Calculates current consecutive active day streak based on user journal entries and gratitude logs.
 * Uses user local calendar dates (YYYY-MM-DD) to maintain accuracy across timezones.
 */
export function calculateActiveStreak(
  entries: Array<{ createdAt?: string }>,
  gratitudeEntries: Array<{ date?: string; createdAt?: string }> = []
): number {
  const dateSet = new Set<string>();

  const toLocalDateStr = (isoOrDateStr: string) => {
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDateStr)) return isoOrDateStr;
      const d = new Date(isoOrDateStr);
      if (isNaN(d.getTime())) return null;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return null;
    }
  };

  entries.forEach((e) => {
    if (e.createdAt) {
      const ds = toLocalDateStr(e.createdAt);
      if (ds) dateSet.add(ds);
    }
  });

  gratitudeEntries.forEach((g) => {
    const ds = toLocalDateStr(g.date || g.createdAt || '');
    if (ds) dateSet.add(ds);
  });

  if (dateSet.size === 0) return 0;

  const now = new Date();
  const todayStr = toLocalDateStr(now.toISOString())!;
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toLocalDateStr(yesterday.toISOString())!;

  // If user was active today, count backward from today.
  // If not active today, but active yesterday, count backward from yesterday (streak still active).
  let currentDate: Date;
  if (dateSet.has(todayStr)) {
    currentDate = new Date(now);
  } else if (dateSet.has(yesterdayStr)) {
    currentDate = yesterday;
  } else {
    // Current ongoing streak is 0, but check max consecutive run in historical archive
    return calculateMaxConsecutiveDays(Array.from(dateSet));
  }

  let streak = 0;
  while (true) {
    const checkStr = toLocalDateStr(currentDate.toISOString());
    if (checkStr && dateSet.has(checkStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  const maxStreak = calculateMaxConsecutiveDays(Array.from(dateSet));
  return Math.max(streak, maxStreak);
}

/**
 * Helper to calculate the longest consecutive sequence of active days in history
 */
function calculateMaxConsecutiveDays(dates: string[]): number {
  if (dates.length === 0) return 0;
  const uniqueSorted = Array.from(new Set(dates)).sort();
  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < uniqueSorted.length; i++) {
    const prev = new Date(uniqueSorted[i - 1] + 'T12:00:00');
    const curr = new Date(uniqueSorted[i] + 'T12:00:00');
    const diffTime = curr.getTime() - prev.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else if (diffDays > 1) {
      currentStreak = 1;
    }
  }
  return maxStreak;
}
