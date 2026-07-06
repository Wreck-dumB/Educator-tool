// Curated early-childhood Auslan vocabulary for the dictionary tool.
//
// Deliberate design constraint: we do NOT store or invent written
// "how to make this sign" instructions or sign illustrations. Auslan
// Signbank (auslan.org.au) is the authoritative dictionary and its
// videos/images are CC BY-NC-ND licensed — we can't copy them, and
// text descriptions of handshapes written by anyone but a fluent
// signer risk teaching a wrong sign, which is worse than none. Every
// entry instead deep-links to the sign's video demonstration on
// Signbank; what we own outright is the word list, the concept
// emoji used on printable visual-aid cards, and classroom usage tips.
//
// Auslan also has Northern and Southern dialects — Signbank's videos
// flag regional variants, which is another reason the video is the
// source of truth rather than a single stored picture.

export interface AuslanSign {
  /** English gloss the educator searches for. */
  word: string;
  /** Large printable concept picture for visual-aid cards. */
  emoji: string;
  category: AuslanCategory;
  /** Optional classroom usage tip (when/how to use the word — never how to form the sign). */
  tip?: string;
  /** Extra search terms, e.g. "toilet" also matching "bathroom". */
  aliases?: string[];
}

export const AUSLAN_CATEGORIES = [
  "Greetings & Social",
  "Feelings",
  "Family & People",
  "Food & Drink",
  "Animals",
  "Colours",
  "Daily Routines",
  "Play & Objects",
  "Actions",
  "Nature & Weather",
  "Numbers",
  "Questions & Helpers",
] as const;

export type AuslanCategory = (typeof AUSLAN_CATEGORIES)[number];

/** Deep link to the sign's video demonstration on Auslan Signbank. */
export function signbankSearchUrl(word: string): string {
  return `https://auslan.org.au/dictionary/search/?query=${encodeURIComponent(word)}`;
}

export const AUSLAN_SIGNS: AuslanSign[] = [
  // Greetings & Social
  { word: "Hello", emoji: "👋", category: "Greetings & Social", tip: "Great first sign for morning circle — greet each child by signing hello with their name." },
  { word: "Goodbye", emoji: "🙋", category: "Greetings & Social", aliases: ["bye"] },
  { word: "Please", emoji: "🙏", category: "Greetings & Social" },
  { word: "Thank you", emoji: "💕", category: "Greetings & Social", aliases: ["thanks"], tip: "Pairs naturally with meal times — children pick it up fast when it earns the snack." },
  { word: "Sorry", emoji: "😔", category: "Greetings & Social" },
  { word: "Yes", emoji: "✅", category: "Greetings & Social" },
  { word: "No", emoji: "❌", category: "Greetings & Social" },
  { word: "Good morning", emoji: "🌅", category: "Greetings & Social" },
  { word: "Good night", emoji: "🌙", category: "Greetings & Social" },
  { word: "Friend", emoji: "🤝", category: "Greetings & Social" },
  { word: "Share", emoji: "🤲", category: "Greetings & Social", tip: "Sign it during play disputes as a calm visual prompt instead of raising your voice." },
  { word: "Help", emoji: "🆘", category: "Greetings & Social", tip: "One of the most empowering early signs — a child who can ask for help before they can say it melts down less." },
  { word: "Stop", emoji: "✋", category: "Greetings & Social", tip: "Useful as a whole-group visual cue in noisy rooms." },
  { word: "Wait", emoji: "⏳", category: "Greetings & Social" },
  { word: "My turn", emoji: "🙇", category: "Greetings & Social", aliases: ["turn"] },
  { word: "Well done", emoji: "🌟", category: "Greetings & Social", aliases: ["good job"] },
  { word: "Love", emoji: "❤️", category: "Greetings & Social" },
  { word: "Same", emoji: "🟰", category: "Greetings & Social" },
  { word: "Different", emoji: "🔀", category: "Greetings & Social" },

  // Feelings
  { word: "Happy", emoji: "😊", category: "Feelings", tip: "Anchor of a feelings check-in board — children point or sign how they feel at arrival." },
  { word: "Sad", emoji: "😢", category: "Feelings" },
  { word: "Angry", emoji: "😠", category: "Feelings" },
  { word: "Scared", emoji: "😨", category: "Feelings", aliases: ["afraid"] },
  { word: "Tired", emoji: "🥱", category: "Feelings" },
  { word: "Sick", emoji: "🤒", category: "Feelings", tip: "A child signing 'sick' before they can explain symptoms is genuinely useful for duty-of-care." },
  { word: "Hurt", emoji: "🤕", category: "Feelings", aliases: ["pain", "sore"] },
  { word: "Excited", emoji: "🤩", category: "Feelings" },
  { word: "Calm", emoji: "😌", category: "Feelings" },
  { word: "Hungry", emoji: "😋", category: "Feelings" },
  { word: "Thirsty", emoji: "🥤", category: "Feelings" },
  { word: "Hot", emoji: "🥵", category: "Feelings" },
  { word: "Cold", emoji: "🥶", category: "Feelings" },
  { word: "Funny", emoji: "😂", category: "Feelings" },
  { word: "Proud", emoji: "😤", category: "Feelings" },
  { word: "Shy", emoji: "😳", category: "Feelings" },

  // Family & People
  { word: "Mum", emoji: "👩", category: "Family & People", aliases: ["mother", "mummy"] },
  { word: "Dad", emoji: "👨", category: "Family & People", aliases: ["father", "daddy"] },
  { word: "Baby", emoji: "👶", category: "Family & People" },
  { word: "Brother", emoji: "👦", category: "Family & People" },
  { word: "Sister", emoji: "👧", category: "Family & People" },
  { word: "Grandma", emoji: "👵", category: "Family & People", aliases: ["nanna", "grandmother"] },
  { word: "Grandpa", emoji: "👴", category: "Family & People", aliases: ["pop", "grandfather"] },
  { word: "Family", emoji: "👪", category: "Family & People" },
  { word: "Teacher", emoji: "🧑‍🏫", category: "Family & People", aliases: ["educator"] },
  { word: "Doctor", emoji: "🧑‍⚕️", category: "Family & People" },
  { word: "Boy", emoji: "🧒", category: "Family & People" },
  { word: "Girl", emoji: "👧", category: "Family & People" },
  { word: "Me", emoji: "🫵", category: "Family & People", aliases: ["I"] },
  { word: "You", emoji: "👉", category: "Family & People" },

  // Food & Drink
  { word: "Eat", emoji: "🍽️", category: "Food & Drink", aliases: ["food"], tip: "Sign it every time you announce meals and it becomes the room's transition cue." },
  { word: "Drink", emoji: "🥛", category: "Food & Drink" },
  { word: "Water", emoji: "💧", category: "Food & Drink" },
  { word: "Milk", emoji: "🍼", category: "Food & Drink", tip: "Often the very first sign babies produce back — a classic Key Word Sign starter." },
  { word: "More", emoji: "➕", category: "Food & Drink", tip: "Hugely motivating at meal times; many toddlers learn 'more' before any spoken request." },
  { word: "Finished", emoji: "🏁", category: "Food & Drink", aliases: ["all done", "done"], tip: "'More' and 'finished' together give pre-verbal children real control over meals." },
  { word: "Apple", emoji: "🍎", category: "Food & Drink" },
  { word: "Banana", emoji: "🍌", category: "Food & Drink" },
  { word: "Orange (fruit)", emoji: "🍊", category: "Food & Drink", aliases: ["orange"] },
  { word: "Bread", emoji: "🍞", category: "Food & Drink" },
  { word: "Cheese", emoji: "🧀", category: "Food & Drink" },
  { word: "Egg", emoji: "🥚", category: "Food & Drink" },
  { word: "Fruit", emoji: "🍇", category: "Food & Drink" },
  { word: "Vegetables", emoji: "🥕", category: "Food & Drink", aliases: ["veggies"] },
  { word: "Biscuit", emoji: "🍪", category: "Food & Drink", aliases: ["cookie"] },
  { word: "Cake", emoji: "🎂", category: "Food & Drink" },
  { word: "Ice cream", emoji: "🍦", category: "Food & Drink" },
  { word: "Hungry (food time)", emoji: "🍴", category: "Food & Drink", aliases: ["lunch", "morning tea"] },

  // Animals
  { word: "Dog", emoji: "🐶", category: "Animals" },
  { word: "Cat", emoji: "🐱", category: "Animals" },
  { word: "Bird", emoji: "🐦", category: "Animals" },
  { word: "Fish", emoji: "🐟", category: "Animals" },
  { word: "Horse", emoji: "🐴", category: "Animals" },
  { word: "Cow", emoji: "🐮", category: "Animals" },
  { word: "Sheep", emoji: "🐑", category: "Animals" },
  { word: "Pig", emoji: "🐷", category: "Animals" },
  { word: "Chicken", emoji: "🐔", category: "Animals" },
  { word: "Duck", emoji: "🦆", category: "Animals" },
  { word: "Rabbit", emoji: "🐰", category: "Animals" },
  { word: "Mouse", emoji: "🐭", category: "Animals" },
  { word: "Elephant", emoji: "🐘", category: "Animals" },
  { word: "Lion", emoji: "🦁", category: "Animals" },
  { word: "Monkey", emoji: "🐵", category: "Animals" },
  { word: "Snake", emoji: "🐍", category: "Animals" },
  { word: "Frog", emoji: "🐸", category: "Animals" },
  { word: "Spider", emoji: "🕷️", category: "Animals" },
  { word: "Butterfly", emoji: "🦋", category: "Animals" },
  { word: "Kangaroo", emoji: "🦘", category: "Animals", tip: "Australian animals are a lovely bridge into Auslan as a uniquely Australian language." },
  { word: "Koala", emoji: "🐨", category: "Animals" },
  { word: "Wombat", emoji: "🦡", category: "Animals" },
  { word: "Emu", emoji: "🪶", category: "Animals" },
  { word: "Crocodile", emoji: "🐊", category: "Animals" },

  // Colours
  { word: "Red", emoji: "🔴", category: "Colours" },
  { word: "Blue", emoji: "🔵", category: "Colours" },
  { word: "Yellow", emoji: "🟡", category: "Colours" },
  { word: "Green", emoji: "🟢", category: "Colours" },
  { word: "Orange (colour)", emoji: "🟠", category: "Colours" },
  { word: "Purple", emoji: "🟣", category: "Colours" },
  { word: "Pink", emoji: "🩷", category: "Colours" },
  { word: "Black", emoji: "⚫", category: "Colours" },
  { word: "White", emoji: "⚪", category: "Colours" },
  { word: "Brown", emoji: "🟤", category: "Colours" },
  { word: "Colour", emoji: "🎨", category: "Colours" },

  // Daily Routines
  { word: "Toilet", emoji: "🚽", category: "Daily Routines", aliases: ["bathroom", "wee"], tip: "High-value routine sign — reduces accidents for children who can't yet ask aloud." },
  { word: "Wash hands", emoji: "🧼", category: "Daily Routines", aliases: ["wash"] },
  { word: "Sleep", emoji: "😴", category: "Daily Routines", aliases: ["rest", "nap"] },
  { word: "Wake up", emoji: "⏰", category: "Daily Routines" },
  { word: "Brush teeth", emoji: "🪥", category: "Daily Routines", aliases: ["teeth"] },
  { word: "Bath", emoji: "🛁", category: "Daily Routines" },
  { word: "Get dressed", emoji: "👕", category: "Daily Routines", aliases: ["clothes", "dressed"] },
  { word: "Shoes", emoji: "👟", category: "Daily Routines" },
  { word: "Hat", emoji: "👒", category: "Daily Routines", tip: "'No hat, no play' — a sign every Australian service uses daily outdoors." },
  { word: "Pack away", emoji: "🧺", category: "Daily Routines", aliases: ["tidy up", "clean up"], tip: "Sign it while singing your pack-away song for a consistent multi-modal cue." },
  { word: "Sit down", emoji: "🪑", category: "Daily Routines", aliases: ["sit"] },
  { word: "Stand up", emoji: "🧍", category: "Daily Routines", aliases: ["stand"] },
  { word: "Line up", emoji: "🚶", category: "Daily Routines" },
  { word: "Inside", emoji: "🏠", category: "Daily Routines" },
  { word: "Outside", emoji: "🌳", category: "Daily Routines" },
  { word: "Home", emoji: "🏡", category: "Daily Routines" },
  { word: "School", emoji: "🏫", category: "Daily Routines", aliases: ["kinder", "childcare"] },

  // Play & Objects
  { word: "Play", emoji: "🧩", category: "Play & Objects", tip: "Sign it before free play each day — repetition in real moments beats flash-card drills." },
  { word: "Ball", emoji: "⚽", category: "Play & Objects" },
  { word: "Book", emoji: "📖", category: "Play & Objects", tip: "Sign key words while reading aloud — story time is the easiest place to model Auslan." },
  { word: "Toy", emoji: "🧸", category: "Play & Objects" },
  { word: "Doll", emoji: "🪆", category: "Play & Objects" },
  { word: "Blocks", emoji: "🧱", category: "Play & Objects" },
  { word: "Car", emoji: "🚗", category: "Play & Objects" },
  { word: "Train", emoji: "🚂", category: "Play & Objects" },
  { word: "Aeroplane", emoji: "✈️", category: "Play & Objects", aliases: ["plane"] },
  { word: "Boat", emoji: "⛵", category: "Play & Objects" },
  { word: "Bike", emoji: "🚲", category: "Play & Objects", aliases: ["bicycle"] },
  { word: "Swing", emoji: "🛝", category: "Play & Objects", aliases: ["slide", "playground"] },
  { word: "Music", emoji: "🎵", category: "Play & Objects", aliases: ["song"] },
  { word: "Dance", emoji: "💃", category: "Play & Objects" },
  { word: "Sing", emoji: "🎤", category: "Play & Objects" },
  { word: "Paint", emoji: "🖌️", category: "Play & Objects", aliases: ["painting"] },
  { word: "Draw", emoji: "✏️", category: "Play & Objects", aliases: ["drawing"] },
  { word: "Bubbles", emoji: "🫧", category: "Play & Objects" },
  { word: "Sand", emoji: "🏖️", category: "Play & Objects", aliases: ["sandpit"] },

  // Actions
  { word: "Look", emoji: "👀", category: "Actions", aliases: ["watch"] },
  { word: "Listen", emoji: "👂", category: "Actions", aliases: ["hear"] },
  { word: "Come here", emoji: "🫴", category: "Actions", aliases: ["come"] },
  { word: "Go", emoji: "🏃", category: "Actions" },
  { word: "Walk", emoji: "🚶", category: "Actions" },
  { word: "Run", emoji: "🏃‍♀️", category: "Actions" },
  { word: "Jump", emoji: "🦘", category: "Actions" },
  { word: "Climb", emoji: "🧗", category: "Actions" },
  { word: "Open", emoji: "📂", category: "Actions" },
  { word: "Close", emoji: "📕", category: "Actions", aliases: ["shut"] },
  { word: "Give", emoji: "🎁", category: "Actions" },
  { word: "Take", emoji: "🫳", category: "Actions" },
  { word: "Push", emoji: "👐", category: "Actions" },
  { word: "Pull", emoji: "🪢", category: "Actions" },
  { word: "Throw", emoji: "🤾", category: "Actions" },
  { word: "Catch", emoji: "🧤", category: "Actions" },
  { word: "Cuddle", emoji: "🤗", category: "Actions", aliases: ["hug"] },
  { word: "Kiss", emoji: "😘", category: "Actions" },
  { word: "Cry", emoji: "😭", category: "Actions" },
  { word: "Laugh", emoji: "🤭", category: "Actions" },

  // Nature & Weather
  { word: "Sun", emoji: "☀️", category: "Nature & Weather", aliases: ["sunny"] },
  { word: "Rain", emoji: "🌧️", category: "Nature & Weather", aliases: ["rainy"] },
  { word: "Wind", emoji: "💨", category: "Nature & Weather", aliases: ["windy"] },
  { word: "Cloud", emoji: "☁️", category: "Nature & Weather", aliases: ["cloudy"] },
  { word: "Rainbow", emoji: "🌈", category: "Nature & Weather" },
  { word: "Storm", emoji: "⛈️", category: "Nature & Weather", aliases: ["thunder"] },
  { word: "Tree", emoji: "🌲", category: "Nature & Weather" },
  { word: "Flower", emoji: "🌸", category: "Nature & Weather" },
  { word: "Grass", emoji: "🌿", category: "Nature & Weather" },
  { word: "Beach", emoji: "🏝️", category: "Nature & Weather" },
  { word: "Moon", emoji: "🌛", category: "Nature & Weather" },
  { word: "Star", emoji: "⭐", category: "Nature & Weather" },
  { word: "Hot (weather)", emoji: "🌡️", category: "Nature & Weather" },
  { word: "Cold (weather)", emoji: "❄️", category: "Nature & Weather" },

  // Numbers
  { word: "One", emoji: "1️⃣", category: "Numbers", aliases: ["1"] },
  { word: "Two", emoji: "2️⃣", category: "Numbers", aliases: ["2"] },
  { word: "Three", emoji: "3️⃣", category: "Numbers", aliases: ["3"] },
  { word: "Four", emoji: "4️⃣", category: "Numbers", aliases: ["4"] },
  { word: "Five", emoji: "5️⃣", category: "Numbers", aliases: ["5"] },
  { word: "Six", emoji: "6️⃣", category: "Numbers", aliases: ["6"] },
  { word: "Seven", emoji: "7️⃣", category: "Numbers", aliases: ["7"] },
  { word: "Eight", emoji: "8️⃣", category: "Numbers", aliases: ["8"] },
  { word: "Nine", emoji: "9️⃣", category: "Numbers", aliases: ["9"] },
  { word: "Ten", emoji: "🔟", category: "Numbers", aliases: ["10"] },
  { word: "How many", emoji: "🔢", category: "Numbers", aliases: ["count", "counting"] },

  // Questions & Helpers
  { word: "What", emoji: "❓", category: "Questions & Helpers" },
  { word: "Where", emoji: "🗺️", category: "Questions & Helpers" },
  { word: "Who", emoji: "🕵️", category: "Questions & Helpers" },
  { word: "Why", emoji: "🤔", category: "Questions & Helpers" },
  { word: "When", emoji: "📅", category: "Questions & Helpers" },
  { word: "Now", emoji: "⏱️", category: "Questions & Helpers" },
  { word: "Later", emoji: "🕐", category: "Questions & Helpers", aliases: ["soon"] },
  { word: "Today", emoji: "📆", category: "Questions & Helpers" },
  { word: "Tomorrow", emoji: "🌄", category: "Questions & Helpers" },
  { word: "Big", emoji: "🐋", category: "Questions & Helpers" },
  { word: "Little", emoji: "🐜", category: "Questions & Helpers", aliases: ["small"] },
  { word: "Fast", emoji: "⚡", category: "Questions & Helpers", aliases: ["quick"] },
  { word: "Slow", emoji: "🐢", category: "Questions & Helpers" },
  { word: "Again", emoji: "🔁", category: "Questions & Helpers", aliases: ["repeat"], tip: "Toddlers love 'again' — it drives every repeated game and song request." },
];

/** Case-insensitive search over words and aliases. */
export function searchSigns(query: string, category?: AuslanCategory | null): AuslanSign[] {
  const q = query.trim().toLowerCase();
  return AUSLAN_SIGNS.filter((s) => {
    if (category && s.category !== category) return false;
    if (!q) return true;
    if (s.word.toLowerCase().includes(q)) return true;
    return (s.aliases ?? []).some((a) => a.toLowerCase().includes(q));
  });
}
