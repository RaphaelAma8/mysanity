/**
 * Canadian crisis and support services shown by the always-visible Help button.
 *
 * SAFETY: wrong numbers can hurt people. Every entry below was checked against independent listings on
 * RESOURCES_VERIFIED. Re-verify before each release and whenever a service announces a change.
 * See README "Keeping resources correct".
 */
export const RESOURCES_VERIFIED = "2026-10-09";

export interface Resource {
  id: string;
  name: string;
  who: string;
  hours: string;
  languages: string;
  call?: { label: string; tel: string };
  text?: { label: string; sms: string; body?: string };
  web?: { label: string; url: string };
  note?: string;
  /** false = not independently verified; shown with a "check" note in the UI */
  verified: boolean;
}

export const EMERGENCY: Resource = {
  id: "911",
  name: "Emergency: 911",
  who: "If you or someone else is in immediate danger.",
  hours: "24/7",
  languages: "Ask for the language you need",
  call: { label: "Call 911", tel: "911" },
  verified: true,
};

export const RESOURCES: Resource[] = [
  {
    id: "988",
    name: "9-8-8 Suicide Crisis Helpline",
    who: "Anyone thinking about suicide, or worried about someone else. You don't have to be sure you're in crisis.",
    hours: "24/7, free",
    languages: "English and French. Interpreters for other languages. TTY: dial 7-1-1.",
    call: { label: "Call 9-8-8", tel: "988" },
    text: { label: "Text 9-8-8", sms: "988" },
    web: { label: "988.ca", url: "https://988.ca" },
    note: "If you can't dial 9-8-8, call 1-833-456-4566.",
    verified: true,
  },
  {
    id: "khp",
    name: "Kids Help Phone",
    who: "Children and young adults. Anyone can reach it, any time, about anything.",
    hours: "24/7",
    languages: "English and French",
    call: { label: "Call 1-800-668-6868", tel: "18006686868" },
    text: { label: "Text CONNECT to 686868", sms: "686868", body: "CONNECT" },
    web: { label: "kidshelpphone.ca", url: "https://kidshelpphone.ca" },
    verified: true,
  },
  {
    id: "hope",
    name: "Hope for Wellness Helpline",
    who: "First Nations, Inuit and Métis people anywhere in Canada. Culturally competent counsellors.",
    hours: "24/7 by phone and online chat",
    languages: "English and French. Cree, Ojibway and Inuktitut by phone on request (not always 24/7, so you may need to call back).",
    call: { label: "Call 1-855-242-3310", tel: "18552423310" },
    web: { label: "Chat at hopeforwellness.ca", url: "https://www.hopeforwellness.ca" },
    verified: true,
  },
  {
    id: "211",
    name: "211: local community services",
    who: "Find food, housing, counselling and other local help in your area.",
    hours: "Varies by area",
    languages: "Varies by area",
    call: { label: "Dial 2-1-1", tel: "211" },
    web: { label: "211.ca", url: "https://211.ca" },
    note: "Availability and hours differ across Canada. Check 211.ca for your area.",
    verified: false,
  },
];

export const RESOURCE_SOURCES = [
  "https://www.cbc.ca/1.7043603",
  "https://www.cp24.com/news/2023/11/30/no-one-will-be-turned-away-988-suicide-crisis-helpline-launches-across-canada/",
  "https://pe.211.ca/result/988-suicide-crisis-helpline--87590905",
  "https://globalnews.ca/news/9852199/canada-988-mental-health-crisis-hotline/amp",
  "https://halton.cioc.ca/record/IMP0326",
  "https://www.atcfn.ca/addiction-resources/hope-for-wellness-helpline",
];
