export interface ClipArtItem {
  id: string;
  label: string;
  category: string;
  src: string;
}

export const CLIPART_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "celebrations", label: "🎉 Celebrations" },
  { id: "nature", label: "🌿 Nature" },
  { id: "animals", label: "🐾 Animals" },
  { id: "symbols", label: "💬 Symbols" },
  { id: "fun", label: "🎨 Fun" },
] as const;

export const CLIPART_ITEMS: ClipArtItem[] = [
  // Celebrations
  { id: "balloon", label: "Balloon", category: "celebrations", src: "/clipart/celebrations/balloon.svg" },
  { id: "balloons", label: "Balloons", category: "celebrations", src: "/clipart/celebrations/balloons.svg" },
  { id: "star", label: "Star", category: "celebrations", src: "/clipart/celebrations/star.svg" },
  { id: "gift", label: "Gift", category: "celebrations", src: "/clipart/celebrations/gift.svg" },
  { id: "party-hat", label: "Party Hat", category: "celebrations", src: "/clipart/celebrations/party-hat.svg" },
  { id: "confetti", label: "Confetti", category: "celebrations", src: "/clipart/celebrations/confetti.svg" },
  // Nature
  { id: "sun", label: "Sun", category: "nature", src: "/clipart/nature/sun.svg" },
  { id: "rainbow", label: "Rainbow", category: "nature", src: "/clipart/nature/rainbow.svg" },
  { id: "cloud", label: "Cloud", category: "nature", src: "/clipart/nature/cloud.svg" },
  { id: "tree", label: "Tree", category: "nature", src: "/clipart/nature/tree.svg" },
  { id: "flower", label: "Flower", category: "nature", src: "/clipart/nature/flower.svg" },
  { id: "butterfly", label: "Butterfly", category: "nature", src: "/clipart/nature/butterfly.svg" },
  { id: "bee", label: "Bee", category: "nature", src: "/clipart/nature/bee.svg" },
  { id: "leaf", label: "Leaf", category: "nature", src: "/clipart/nature/leaf.svg" },
  // Animals
  { id: "cat", label: "Cat", category: "animals", src: "/clipart/animals/cat.svg" },
  { id: "dog", label: "Dog", category: "animals", src: "/clipart/animals/dog.svg" },
  { id: "bird", label: "Bird", category: "animals", src: "/clipart/animals/bird.svg" },
  { id: "fish", label: "Fish", category: "animals", src: "/clipart/animals/fish.svg" },
  { id: "frog", label: "Frog", category: "animals", src: "/clipart/animals/frog.svg" },
  { id: "rabbit", label: "Rabbit", category: "animals", src: "/clipart/animals/rabbit.svg" },
  // Symbols
  { id: "heart", label: "Heart", category: "symbols", src: "/clipart/symbols/heart.svg" },
  { id: "checkmark", label: "Tick", category: "symbols", src: "/clipart/symbols/checkmark.svg" },
  { id: "pencil", label: "Pencil", category: "symbols", src: "/clipart/symbols/pencil.svg" },
  { id: "book", label: "Book", category: "symbols", src: "/clipart/symbols/book.svg" },
  { id: "house", label: "House", category: "symbols", src: "/clipart/symbols/house.svg" },
  { id: "calendar", label: "Calendar", category: "symbols", src: "/clipart/symbols/calendar.svg" },
  // Fun
  { id: "ice-cream", label: "Ice Cream", category: "fun", src: "/clipart/fun/ice-cream.svg" },
  { id: "music-note", label: "Music", category: "fun", src: "/clipart/fun/music-note.svg" },
  { id: "crown", label: "Crown", category: "fun", src: "/clipart/fun/crown.svg" },
  { id: "rocket", label: "Rocket", category: "fun", src: "/clipart/fun/rocket.svg" },
  { id: "magnifier", label: "Search", category: "fun", src: "/clipart/fun/magnifier.svg" },
];
