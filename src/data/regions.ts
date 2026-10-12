export interface Region {
  id: string;
  name: string;
  kind: "province" | "territory";
  /** Position on the airport map, in a 100 x 60 box. */
  at: [number, number];
  theme: { sky: [string, string]; ground: string; water: string; accent: string; aurora: boolean };
  blurb: string;
  postcards: string[];
  practice: string;
}

/** Postcards are written for this app. They are kind, place-based and non-clinical. Have them reviewed before launch. */
export const REGIONS: Region[] = [
  { id: "bc", name: "British Columbia", kind: "province", at: [13, 34], theme: { sky: ["#25405C", "#6E8FA8"], ground: "#2F5B4A", water: "#3C6E8F", accent: "#8ED1B2", aurora: false },
    blurb: "Cedar, rain, and mountains rising out of the sea.",
    postcards: ["Rain on cedar branches has its own slow rhythm. If today is grey, you're in good company here. The coast has plenty of grey days, and plenty of green.", "Nobody has to climb a mountain today. Looking at one through a window counts."],
    practice: "Listen to the quietest sound you can hear for one minute." },
  { id: "ab", name: "Alberta", kind: "province", at: [23, 33], theme: { sky: ["#2A4468", "#C9956A"], ground: "#8A7A4B", water: "#4F7FA3", accent: "#F2C879", aurora: false },
    blurb: "Big sky, foothills, and wind that changes the weather in an afternoon.",
    postcards: ["Warm Chinook winds can melt a cold snap in a single afternoon. Hard stretches sometimes change faster than they feel like they will.", "The sky is so big here that your worries look a little smaller underneath it."],
    practice: "Step outside or to a window and find the biggest piece of sky you can." },
  { id: "sk", name: "Saskatchewan", kind: "province", at: [32, 33], theme: { sky: ["#233B63", "#E0A86E"], ground: "#A58C4A", water: "#5A86A8", accent: "#F4D27E", aurora: false },
    blurb: "Open land and an even wider sky.",
    postcards: ["There is a lot of room out here. Room to take up space, and room to rest.", "Fields look empty in winter, and they are only resting. Rest is part of the cycle, not a failure of it."],
    practice: "Take three slow breaths and let your shoulders drop on each one." },
  { id: "mb", name: "Manitoba", kind: "province", at: [41, 33], theme: { sky: ["#1F3555", "#7A9CC0"], ground: "#4F7A57", water: "#4A7CA5", accent: "#9FD8C0", aurora: false },
    blurb: "Lakes, prairie and long winters that people get through together.",
    postcards: ["Manitoba winters are famously cold, and people get through them by bundling up and checking on each other. Warmth is a team sport.", "A hot drink held in both hands is a small, real comfort. You can have one today."],
    practice: "Hold something warm for a minute and notice how your hands feel." },
  { id: "on", name: "Ontario", kind: "province", at: [53, 38], theme: { sky: ["#22405F", "#8AA7C2"], ground: "#41704F", water: "#3F7BA6", accent: "#A5DDBA", aurora: false },
    blurb: "Lakes, forest and a lot of quiet corners close to the city.",
    postcards: ["Somewhere in Ontario a lake is perfectly still right now. You can borrow a little of that.", "Big cities have small quiet places: a bench, a stairwell, a spot by a window. Finding yours is a skill."],
    practice: "Find a quiet corner, even for two minutes, and just sit." },
  { id: "qc", name: "Quebec", kind: "province", at: [66, 33], theme: { sky: ["#243E6B", "#9BAAD0"], ground: "#4B6A63", water: "#4E78A6", accent: "#C7D4F5", aurora: false },
    blurb: "Old stone streets, deep snow and soft winter light.",
    postcards: ["Snow muffles the world. Winter here can be quiet and slow on purpose, and you are allowed to match that pace.", "Café au lait, a window seat, no plans. Slowing down is not the same as falling behind."],
    practice: "Do one thing slowly today, like drinking a cup of something warm." },
  { id: "nb", name: "New Brunswick", kind: "province", at: [75, 41], theme: { sky: ["#243F5E", "#86A9B8"], ground: "#3F6B58", water: "#3E7396", accent: "#9ADBD0", aurora: false },
    blurb: "River valleys, forest and the famous Bay of Fundy tides.",
    postcards: ["Twice a day the Bay of Fundy empties out and fills back up, with some of the highest tides in the world. Things that go out can come back.", "You don't have to push the water. The tide arrives on its own schedule."],
    practice: "Breathe out slowly for longer than you breathe in, three times." },
  { id: "ns", name: "Nova Scotia", kind: "province", at: [81, 43], theme: { sky: ["#213B5E", "#8BA3BD"], ground: "#4A6A5A", water: "#3F6F9A", accent: "#A8CFEA", aurora: false },
    blurb: "Lighthouses, fishing towns and the sound of the sea.",
    postcards: ["A lighthouse doesn't stop the storm. It just makes sure someone can find the way. Reaching out to one person can work like that.", "Fog rolls in and it rolls out again. Weather is not a verdict on you."],
    practice: "Name one person who would answer if you reached out." },
  { id: "pe", name: "Prince Edward Island", kind: "province", at: [80, 36], theme: { sky: ["#27425F", "#C48F80"], ground: "#A5654F", water: "#4B7EA0", accent: "#F2B9A0", aurora: false },
    blurb: "Red soil, quiet roads and nowhere you have to hurry.",
    postcards: ["The island's soil is red, and the roads are quiet. There's nowhere you have to rush to today.", "Small places teach you that small things matter: a walk to the end of the road, a kind word, a good meal."],
    practice: "Take a short walk, even just to the end of your street or hallway." },
  { id: "nl", name: "Newfoundland and Labrador", kind: "province", at: [90, 30], theme: { sky: ["#1F3856", "#7E9BB8"], ground: "#4D6258", water: "#3A6A92", accent: "#B5D8EC", aurora: false },
    blurb: "Rugged coast, colourful houses and icebergs in spring.",
    postcards: ["Icebergs drift past the coast in spring, huge and slow, and they still move. Slow progress is still progress.", "The houses are painted bright against grey weather. Adding one bright thing to a hard day is allowed."],
    practice: "Add one bright thing to your space: open a curtain, light a candle, put on a colour you like." },
  { id: "yt", name: "Yukon", kind: "territory", at: [12, 14], theme: { sky: ["#0F1F3F", "#2C5A7C"], ground: "#3C5668", water: "#2F5775", accent: "#7CF0C8", aurora: true },
    blurb: "Mountains, rivers and northern lights.",
    postcards: ["The northern lights sometimes show up without warning. Good things can arrive on days you didn't plan for.", "On the longest nights people gather around light and warmth. You can do the same, in your own way."],
    practice: "Turn on one warm light and sit with it for a minute." },
  { id: "nt", name: "Northwest Territories", kind: "territory", at: [26, 15], theme: { sky: ["#10213F", "#3A5E86"], ground: "#43606B", water: "#2F5A7A", accent: "#8DF0D2", aurora: true },
    blurb: "Huge lakes, long summer light and long winter nights.",
    postcards: ["Summer days here are very long and winter nights are very long. Both seasons pass.", "You don't have to feel the same way all year. Neither does the sky."],
    practice: "Notice what the light is doing outside or at your window right now." },
  { id: "nu", name: "Nunavut", kind: "territory", at: [46, 14], theme: { sky: ["#0E1D3A", "#3E6288"], ground: "#6B8190", water: "#2E5878", accent: "#9CF2E0", aurora: true },
    blurb: "Arctic land, sea ice and very long days and nights.",
    postcards: ["In the Arctic, the days and nights stretch far longer than they do farther south. Whatever season you are in right now, seasons change.", "Wide, open, quiet land. You can have a quiet moment too, even in a busy day."],
    practice: "Look at the farthest thing you can see, and let your eyes rest there." },
];

export const regionById = (id: string | null | undefined) => REGIONS.find((r) => r.id === id) ?? null;
