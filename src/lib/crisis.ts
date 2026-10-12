/**
 * Gentle, on-device detection of language that suggests someone may be thinking about suicide or self-harm.
 * It never blocks anything and never sends text anywhere. It only lets the app offer support, kindly.
 * False positives are acceptable (a soft offer of support). False negatives are the real risk, so patterns are broad.
 */
const PATTERNS: RegExp[] = [
  /\bsuicid(e|al)\b/,
  /\bkill(ing)?\s+(my\s*self|myself)\b/,
  /\b(end|ending|take|taking)\s+(my|my\s+own)\s+life\b/,
  /\bend\s+it\s+all\b/,
  /\bwant(ed|s)?\s+to\s+die\b/,
  /\bwish\s+i\s+(was|were)\s+dead\b/,
  /\b(don'?t|do\s+not|dont)\s+want\s+to\s+(be\s+alive|live|be\s+here|exist|wake\s+up)\b/,
  /\bbetter\s+off\s+(dead|without\s+me)\b/,
  /\bno\s+reason\s+to\s+(live|go\s+on|be\s+here)\b/,
  // "I can't go on" is concerning; "I can't go on that trip" is not
  /\bcan'?t\s+go\s+on\b(?!\s+(?:\w+\s+){0,2}(?:trip|vacation|holiday|date|walk|hike|run|cruise|flight|camping|retreat|outing|ride|adventure|call|stage|shift)\b)/,
  /\bself[-\s]?harm(ing)?\b/,
  /\b(hurt|hurting|cut|cutting|harm|harming)\s+my\s*self\b/,
  /\bnot\s+worth\s+living\b/,
];

export function detectCrisis(text: string): boolean {
  const t = text.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ");
  return PATTERNS.some((p) => p.test(t));
}
