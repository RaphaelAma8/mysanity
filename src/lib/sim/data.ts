import type { NeedKey } from "./types";

export type Effects = Partial<Record<NeedKey, number>>;

export interface Item {
  id: string; name: string; price: number; icon: string;
  slot: "plant" | "wall" | "light" | "rug" | "shelf" | "couch" | "hobby" | "outfit";
  cozy: number; blurb: string; shirt?: number;
}

/** One-time purchases. No sales, no timers, no limited editions, no loot boxes: prices never change. */
export const ITEMS: Item[] = [
  { id: "plant_pothos", name: "Pothos plant", price: 12, icon: "🪴", slot: "plant", cozy: 1, blurb: "Forgiving. It keeps growing even if you forget it for a day." },
  { id: "plant_herbs", name: "Kitchen herbs", price: 10, icon: "🌿", slot: "plant", cozy: 1, blurb: "Makes home cooking a little nicer." },
  { id: "plant_monstera", name: "Monstera", price: 28, icon: "🌱", slot: "plant", cozy: 2, blurb: "Big, leafy and quietly cheerful." },
  { id: "lamp", name: "Warm floor lamp", price: 25, icon: "💡", slot: "light", cozy: 1, blurb: "Soft light for the evenings." },
  { id: "string_lights", name: "String lights", price: 22, icon: "✨", slot: "light", cozy: 2, blurb: "Tiny lights along the wall." },
  { id: "rug", name: "Soft rug", price: 40, icon: "🟫", slot: "rug", cozy: 2, blurb: "Warm under bare feet." },
  { id: "poster_forest", name: "Forest poster", price: 15, icon: "🌲", slot: "wall", cozy: 1, blurb: "A quiet place to look at." },
  { id: "poster_aurora", name: "Northern lights poster", price: 18, icon: "🌌", slot: "wall", cozy: 1, blurb: "Green sky, calm night." },
  { id: "bookshelf", name: "Bookshelf", price: 60, icon: "📚", slot: "shelf", cozy: 2, blurb: "Unlocks reading." },
  { id: "throw_blanket", name: "Knit throw blanket", price: 20, icon: "🧶", slot: "couch", cozy: 1, blurb: "For the couch." },
  { id: "cozy_couch", name: "Cozy couch", price: 120, icon: "🛋️", slot: "couch", cozy: 3, blurb: "Deep cushions, big enough to nap on." },
  { id: "guitar", name: "Acoustic guitar", price: 90, icon: "🎸", slot: "hobby", cozy: 1, blurb: "Unlocks playing music." },
  { id: "easel", name: "Painting easel", price: 70, icon: "🎨", slot: "hobby", cozy: 1, blurb: "Unlocks painting." },
  { id: "radio", name: "Little radio", price: 35, icon: "📻", slot: "hobby", cozy: 1, blurb: "Unlocks listening to music." },
  { id: "outfit_red", name: "Red toque and scarf", price: 30, icon: "🧣", slot: "outfit", cozy: 0, shirt: 0, blurb: "A new look." },
  { id: "outfit_blue", name: "Blue parka", price: 30, icon: "🧥", slot: "outfit", cozy: 0, shirt: 1, blurb: "A new look." },
  { id: "outfit_green", name: "Green flannel", price: 30, icon: "👕", slot: "outfit", cozy: 0, shirt: 2, blurb: "A new look." },
  { id: "outfit_yellow", name: "Yellow raincoat", price: 30, icon: "🧥", slot: "outfit", cozy: 0, shirt: 3, blurb: "A new look." },
];
export const itemById = (id: string) => ITEMS.find((i) => i.id === id);

export const GROCERY_PACK = { price: 25, units: 5 };
export const PET_FOOD_PACK = { price: 10, units: 5 };
export const TAKEOUT_PRICE = 15;
export const ADOPT_PRICE = 50;
export const TRAVEL_PRICE = 120;
export const WEEKLY_BILLS = 60;
export const START_MONEY = 200;

export interface Action {
  id: string; label: string; icon: string; blocks: number; cost?: number; effects: Effects;
  needs?: "groceries" | "petFood" | "pet" | "friend" | "plant" | "guitar" | "easel" | "radio" | "bookshelf";
  moment?: string; where: "home";
}

export const HOME_ACTIONS: Action[] = [
  { id: "nap", label: "Take a nap", icon: "😴", blocks: 1, effects: { energy: 25, calm: 4 }, where: "home" },
  { id: "shower", label: "Have a shower", icon: "🚿", blocks: 1, effects: { hygiene: 60, calm: 4 }, where: "home" },
  { id: "cook", label: "Cook a meal", icon: "🍳", blocks: 1, effects: { hunger: 45, fun: 3 }, needs: "groceries", where: "home" },
  { id: "takeout", label: "Order takeout", icon: "🥡", blocks: 1, cost: 15, effects: { hunger: 50, fun: 6 }, where: "home" },
  { id: "tv", label: "Watch something", icon: "📺", blocks: 1, effects: { fun: 20, energy: 2, calm: 3 }, where: "home" },
  { id: "tidy", label: "Tidy up a little", icon: "🧹", blocks: 1, effects: { calm: 8, fun: 2 }, moment: "Tidied up a little. The room felt lighter.", where: "home" },
  { id: "water_plants", label: "Look after your plants", icon: "💧", blocks: 1, effects: { calm: 10, fun: 3 }, needs: "plant", moment: "Looked after the plants.", where: "home" },
  { id: "call_friend", label: "Call a friend", icon: "📞", blocks: 1, effects: { social: 22, fun: 6 }, needs: "friend", where: "home" },
  { id: "pet_time", label: "Spend time with your pet", icon: "🐈", blocks: 1, effects: { social: 14, calm: 10, fun: 10 }, needs: "pet", moment: "Quiet time with the cat.", where: "home" },
  { id: "guitar", label: "Play guitar", icon: "🎸", blocks: 1, effects: { fun: 30, calm: 10 }, needs: "guitar", moment: "Played guitar.", where: "home" },
  { id: "paint", label: "Paint something", icon: "🎨", blocks: 1, effects: { fun: 28, calm: 12 }, needs: "easel", moment: "Painted something, just for fun.", where: "home" },
  { id: "radio", label: "Listen to music", icon: "📻", blocks: 1, effects: { fun: 16, calm: 8 }, needs: "radio", where: "home" },
  { id: "read", label: "Read a book", icon: "📖", blocks: 1, effects: { fun: 14, calm: 12 }, needs: "bookshelf", moment: "Read a good book.", where: "home" },
  // These three open the real coping exercises. The game effect is applied when the exercise is finished.
  { id: "breathe", label: "Breathe in the calm corner", icon: "🌬️", blocks: 1, effects: { calm: 22, energy: 2 }, where: "home" },
  { id: "ground", label: "Ground yourself", icon: "🌿", blocks: 1, effects: { calm: 18 }, where: "home" },
  { id: "journal", label: "Write in your notebook", icon: "📓", blocks: 1, effects: { calm: 12 }, where: "home" },
];
export const actionById = (id: string) => HOME_ACTIONS.find((a) => a.id === id);

export interface Job { id: string; name: string; place: string; icon: string; pay: number; blocks: number; effects: Effects; blurb: string }
export const JOBS: Job[] = [
  { id: "cafe", name: "Café shift", place: "The corner café", icon: "☕", pay: 50, blocks: 2, effects: { energy: -18, hunger: -6, social: 10, fun: 4 }, blurb: "Friendly, busy, and you get a free coffee." },
  { id: "library", name: "Library shift", place: "Public library", icon: "📚", pay: 46, blocks: 2, effects: { energy: -12, calm: 5, social: 6, fun: 4 }, blurb: "Quiet work, shelving books." },
  { id: "garden", name: "Community garden shift", place: "Community garden", icon: "🥕", pay: 44, blocks: 2, effects: { energy: -16, calm: 10, fun: 5, social: 5 }, blurb: "Outdoors and hands in the soil." },
];

export interface Place { id: string; name: string; icon: string; blurb: string; kind: "shop" | "job" | "free" | "special" }
export const PLACES: Place[] = [
  { id: "grocery", name: "Grocery store", icon: "🛒", blurb: "Groceries and pet food.", kind: "shop" },
  { id: "plants", name: "Plant shop", icon: "🪴", blurb: "Plants for your home.", kind: "shop" },
  { id: "homestore", name: "Home store", icon: "🏠", blurb: "Lamps, rugs, art and furniture.", kind: "shop" },
  { id: "hobby", name: "Hobby shop", icon: "🎸", blurb: "Instruments and art supplies.", kind: "shop" },
  { id: "clothes", name: "Clothing store", icon: "👕", blurb: "New outfits.", kind: "shop" },
  { id: "work", name: "Work", icon: "💼", blurb: "A few gentle part-time jobs.", kind: "job" },
  { id: "park", name: "The park", icon: "🌳", blurb: "A free walk, whatever the weather.", kind: "free" },
  { id: "centre", name: "Community centre", icon: "🤝", blurb: "Free meals, free company, and people who are glad you came.", kind: "free" },
  { id: "shelter", name: "Animal shelter", icon: "🐾", blurb: "Adopt a cat who needs a home.", kind: "special" },
  { id: "travel", name: "Airport", icon: "✈️", blurb: "Take a trip to another province.", kind: "special" },
];
export const SHOP_ITEMS: Record<string, string[]> = {
  plants: ["plant_pothos", "plant_herbs", "plant_monstera"],
  homestore: ["lamp", "string_lights", "rug", "poster_forest", "poster_aurora", "bookshelf", "throw_blanket", "cozy_couch"],
  hobby: ["guitar", "easel", "radio"],
  clothes: ["outfit_red", "outfit_blue", "outfit_green", "outfit_yellow"],
};

export interface Friend { id: string; name: string; where: string; stories: string[] }
/** Gentle, low-stakes stories. Friends are kind and never need rescuing. */
export const FRIENDS: Friend[] = [
  { id: "maya", name: "Maya", where: "the community garden crew", stories: [
    "Maya laughs about her first tomato plant, which grew sideways. \"It still tasted great,\" she says.",
    "Maya had a rough week and tells you a little about it. You listen, and you both feel lighter afterward.",
    "Maya invites you to help plant bulbs for spring. \"No pressure,\" she says. \"Just come if you feel like it.\"",
  ] },
  { id: "dev", name: "Dev", where: "the library regulars", stories: [
    "Dev recommends a book with a very dramatic cover. \"Trust me,\" he says, \"it's cozy.\"",
    "Dev tells you he gets nervous in crowds too, and shares a trick: find one calm spot and breathe out slowly.",
    "Dev invites you to a small board game night. There will be snacks and nobody keeps score.",
  ] },
];
export const friendById = (id: string) => FRIENDS.find((f) => f.id === id);
export const FRIEND_REPEAT = ["You catch up for a while. It's easy, and no one is in a hurry.", "A short, warm chat. You both say you should do this more often."];
