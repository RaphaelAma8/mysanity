/**
 * Activity content. These are everyday coping and relaxation skills many people find helpful.
 * They are NOT treatment. Have clinicians review this file before launch.
 */
export const BREATHING = {
  pattern: { in: 4, hold: 1, out: 6 },
  durations: [1, 2, 3, 5] as const, // minutes
};

export const GROUNDING = [
  { n: 5, sense: "see", prompt: "Look around. Name 5 things you can see." },
  { n: 4, sense: "feel", prompt: "Notice 4 things you can feel, like your feet on the floor or the chair holding you." },
  { n: 3, sense: "hear", prompt: "Listen. Name 3 things you can hear." },
  { n: 2, sense: "smell", prompt: "Notice 2 things you can smell, or 2 smells you like." },
  { n: 1, sense: "taste", prompt: "Notice 1 thing you can taste, or take a slow sip of water." },
];

export const TINY_STEPS: { id: string; text: string; area: string }[] = [
  { id: "water", text: "Drink a glass of water.", area: "body" },
  { id: "stretch", text: "Stand up and stretch for one minute.", area: "body" },
  { id: "shower", text: "Wash your face or have a shower.", area: "body" },
  { id: "snack", text: "Eat something small, even a few bites.", area: "body" },
  { id: "window", text: "Open a window or step outside for two minutes.", area: "outside" },
  { id: "walk", text: "Walk to the end of the block, or down the hall and back.", area: "outside" },
  { id: "sky", text: "Look at the sky for one minute.", area: "outside" },
  { id: "surface", text: "Tidy just one surface.", area: "space" },
  { id: "bed", text: "Make your bed, or straighten one corner of it.", area: "space" },
  { id: "light", text: "Open the curtains or turn on a lamp.", area: "space" },
  { id: "song", text: "Play one song you like all the way through.", area: "mind" },
  { id: "three", text: "Write down three small things that are okay right now.", area: "mind" },
  { id: "text", text: "Send a one-line message to someone you trust, like 'thinking of you'.", area: "people" },
  { id: "pet", text: "Spend a minute with a pet, a plant, or something soft.", area: "people" },
  { id: "kind", text: "Say one kind thing to yourself, the way you would to a friend.", area: "mind" },
  { id: "pause", text: "Pause what you are doing and take three slow breaths.", area: "mind" },
];

export const WIND_DOWN = [
  "Dim the lights or switch to a lamp.",
  "Put your phone down, or on a charger across the room, for the next little while.",
  "Stretch your neck and shoulders slowly.",
  "Write down one thing for tomorrow, so your mind can put it down for tonight.",
  "Take three slow breaths, longer out than in.",
];

export const JOURNAL_PROMPTS = [
  "What is one thing that was hard today, and one thing that helped, even a little?",
  "What would I say to a friend who felt the way I do right now?",
  "What is one small thing I am grateful for today?",
  "What is taking up the most room in my head, and what do I need right now?",
  "What is one thing I did today that I'm a little proud of?",
];

export const MOODS: { value: 1 | 2 | 3 | 4 | 5; label: string; emoji: string }[] = [
  { value: 1, label: "Really rough", emoji: "😞" },
  { value: 2, label: "Low", emoji: "😕" },
  { value: 3, label: "Okay", emoji: "😐" },
  { value: 4, label: "Good", emoji: "🙂" },
  { value: 5, label: "Great", emoji: "😊" },
];

export const MOOD_TAGS = ["Sleep", "Work or school", "Money", "People", "Health", "Weather", "Not sure"];
