export interface QuoteItem {
  id: number;
  quote: string;
  author: string;
  theme: string;
}

export const MINDFUL_QUOTES: QuoteItem[] = [
  {
    id: 1,
    quote: "The present moment is filled with joy and happiness. If you are attentive, you will see it.",
    author: "Thich Nhat Hanh",
    theme: "Presence"
  },
  {
    id: 2,
    quote: "Journaling is like whispering to one's self and listening at the same time.",
    author: "mina Murray",
    theme: "Journaling"
  },
  {
    id: 3,
    quote: "What you seek is seeking you.",
    author: "Rumi",
    theme: "Growth"
  },
  {
    id: 4,
    quote: "Quiet the mind and the soul will speak.",
    author: "Ma Jaya Sati Bhagavati",
    theme: "Self-Reflection"
  },
  {
    id: 5,
    quote: "Owning our story and loving ourselves through that process is the bravest thing that we will ever do.",
    author: "Brené Brown",
    theme: "Self-Reflection"
  },
  {
    id: 6,
    quote: "In the depth of winter, I finally learned that within me there lay an invincible summer.",
    author: "Albert Camus",
    theme: "Resilience"
  },
  {
    id: 7,
    quote: "Your visions will become clear only when you can look into your own heart. Who looks outside, dreams; who looks inside, awakes.",
    author: "Carl Jung",
    theme: "Self-Reflection"
  },
  {
    id: 8,
    quote: "Smile, breathe, and go slowly.",
    author: "Thich Nhat Hanh",
    theme: "Presence"
  },
  {
    id: 9,
    quote: "To write is to write who you are, and to discover who you are not.",
    author: "Margaret Atwood",
    theme: "Journaling"
  },
  {
    id: 10,
    quote: "Almost everything will work again if you unplug it for a few minutes... including you.",
    author: "Anne Lamott",
    theme: "Rest"
  },
  {
    id: 11,
    quote: "As you start to walk on the way, the way appears.",
    author: "Rumi",
    theme: "Growth"
  },
  {
    id: 12,
    quote: "Breathe in deeply and let go of everything that no longer serves your peace.",
    author: "Eckhart Tolle",
    theme: "Presence"
  },
  {
    id: 13,
    quote: "Knowing yourself is the beginning of all wisdom.",
    author: "Aristotle",
    theme: "Self-Reflection"
  },
  {
    id: 14,
    quote: "The soul should always stand ajar, ready to welcome the ecstatic experience.",
    author: "Emily Dickinson",
    theme: "Wonder"
  },
  {
    id: 15,
    quote: "Talk to yourself like you would to someone you love.",
    author: "Brené Brown",
    theme: "Compassion"
  },
  {
    id: 16,
    quote: "Adopt the pace of nature: her secret is patience.",
    author: "Ralph Waldo Emerson",
    theme: "Patience"
  },
  {
    id: 17,
    quote: "We do not see things as they are, we see them as we are.",
    author: "Anaïs Nin",
    theme: "Perception"
  },
  {
    id: 18,
    quote: "Write what should not be forgotten.",
    author: "Isabel Allende",
    theme: "Journaling"
  },
  {
    id: 19,
    quote: "Peace comes from within. Do not seek it without.",
    author: "Buddha",
    theme: "Inner Peace"
  },
  {
    id: 20,
    quote: "Do not rush. Anything worth having takes time to grow.",
    author: "Zen Proverb",
    theme: "Growth"
  },
  {
    id: 21,
    quote: "Deep listening is miraculous for both listener and speaker.",
    author: "Carl Rogers",
    theme: "Connection"
  },
  {
    id: 22,
    quote: "The mind is like water. When it's turbulent, it's difficult to see. When it's calm, everything becomes clear.",
    author: "Prasad",
    theme: "Clarity"
  },
  {
    id: 23,
    quote: "Every experience in your life is being orchestrated to teach you what you need to know to move on.",
    author: "Mel Robbins",
    theme: "Growth"
  },
  {
    id: 24,
    quote: "Gratitude turns what we have into enough.",
    author: "Melody Beattie",
    theme: "Gratitude"
  },
  {
    id: 25,
    quote: "Within you, there is a stillness and a sanctuary to which you can retreat at any time and be yourself.",
    author: "Hermann Hesse",
    theme: "Sanctuary"
  }
];

/**
 * Returns a stable, deterministic mindful quote for a given date.
 * Ensures the daily quote does not flicker, glitch, or change across re-renders on the same day.
 */
export function getDailyQuoteForDate(dateStr: string = new Date().toISOString().split('T')[0]): QuoteItem {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % MINDFUL_QUOTES.length;
  return MINDFUL_QUOTES[index];
}
