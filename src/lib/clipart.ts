export interface ClipArtItem {
  id: string;
  label: string;
  category: string;
  src: string;
  /** Synonyms/plain-language matches used to map an AI-picked subject to this icon. */
  keywords: string[];
}

export const CLIPART_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "celebrations", label: "🎉 Celebrations" },
  { id: "nature", label: "🌿 Nature" },
  { id: "animals", label: "🐾 Animals" },
  { id: "symbols", label: "💬 Symbols" },
  { id: "shapes", label: "🔷 Shapes" },
  { id: "fun", label: "🎨 Fun" },
] as const;

export const CLIPART_ITEMS: ClipArtItem[] = [
  // Celebrations
  { id: "balloon", label: "Balloon", category: "celebrations", src: "/clipart/celebrations/balloon.svg", keywords: ["balloon"] },
  { id: "balloons", label: "Balloons", category: "celebrations", src: "/clipart/celebrations/balloons.svg", keywords: ["balloons"] },
  { id: "star", label: "Star", category: "celebrations", src: "/clipart/celebrations/star.svg", keywords: ["star", "stars"] },
  { id: "gift", label: "Gift", category: "celebrations", src: "/clipart/celebrations/gift.svg", keywords: ["gift", "present"] },
  { id: "party-hat", label: "Party Hat", category: "celebrations", src: "/clipart/celebrations/party-hat.svg", keywords: ["party hat", "party"] },
  { id: "confetti", label: "Confetti", category: "celebrations", src: "/clipart/celebrations/confetti.svg", keywords: ["confetti"] },
  // Nature
  { id: "sun", label: "Sun", category: "nature", src: "/clipart/nature/sun.svg", keywords: ["sun", "sunshine", "sunny"] },
  { id: "rainbow", label: "Rainbow", category: "nature", src: "/clipart/nature/rainbow.svg", keywords: ["rainbow"] },
  { id: "cloud", label: "Cloud", category: "nature", src: "/clipart/nature/cloud.svg", keywords: ["cloud", "clouds"] },
  { id: "tree", label: "Tree", category: "nature", src: "/clipart/nature/tree.svg", keywords: ["tree", "trees"] },
  { id: "flower", label: "Flower", category: "nature", src: "/clipart/nature/flower.svg", keywords: ["flower", "flowers"] },
  { id: "butterfly", label: "Butterfly", category: "nature", src: "/clipart/nature/butterfly.svg", keywords: ["butterfly"] },
  { id: "bee", label: "Bee", category: "nature", src: "/clipart/nature/bee.svg", keywords: ["bee", "bumblebee"] },
  { id: "leaf", label: "Leaf", category: "nature", src: "/clipart/nature/leaf.svg", keywords: ["leaf", "leaves"] },
  // Animals
  { id: "cat", label: "Cat", category: "animals", src: "/clipart/animals/cat.svg", keywords: ["cat", "kitten", "kitty"] },
  { id: "dog", label: "Dog", category: "animals", src: "/clipart/animals/dog.svg", keywords: ["dog", "puppy"] },
  { id: "bird", label: "Bird", category: "animals", src: "/clipart/animals/bird.svg", keywords: ["bird"] },
  { id: "fish", label: "Fish", category: "animals", src: "/clipart/animals/fish.svg", keywords: ["fish"] },
  { id: "frog", label: "Frog", category: "animals", src: "/clipart/animals/frog.svg", keywords: ["frog"] },
  { id: "rabbit", label: "Rabbit", category: "animals", src: "/clipart/animals/rabbit.svg", keywords: ["rabbit", "bunny"] },
  { id: "dinosaur", label: "Dinosaur", category: "animals", src: "/clipart/animals/dinosaur.svg", keywords: ["dinosaur", "dino", "t-rex", "trex", "reptile"] },
  { id: "elephant", label: "Elephant", category: "animals", src: "/clipart/animals/elephant.svg", keywords: ["elephant"] },
  { id: "bear", label: "Bear", category: "animals", src: "/clipart/animals/bear.svg", keywords: ["bear", "teddy", "teddy bear"] },
  { id: "lion", label: "Lion", category: "animals", src: "/clipart/animals/lion.svg", keywords: ["lion"] },
  // Symbols
  { id: "heart", label: "Heart", category: "symbols", src: "/clipart/symbols/heart.svg", keywords: ["heart"] },
  { id: "checkmark", label: "Tick", category: "symbols", src: "/clipart/symbols/checkmark.svg", keywords: ["checkmark", "tick", "check"] },
  { id: "pencil", label: "Pencil", category: "symbols", src: "/clipart/symbols/pencil.svg", keywords: ["pencil"] },
  { id: "book", label: "Book", category: "symbols", src: "/clipart/symbols/book.svg", keywords: ["book", "books", "storybook"] },
  { id: "house", label: "House", category: "symbols", src: "/clipart/symbols/house.svg", keywords: ["house", "home"] },
  { id: "calendar", label: "Calendar", category: "symbols", src: "/clipart/symbols/calendar.svg", keywords: ["calendar"] },
  // Shapes
  { id: "circle", label: "Circle", category: "shapes", src: "/clipart/shapes/circle.svg", keywords: ["circle"] },
  { id: "square", label: "Square", category: "shapes", src: "/clipart/shapes/square.svg", keywords: ["square"] },
  { id: "triangle", label: "Triangle", category: "shapes", src: "/clipart/shapes/triangle.svg", keywords: ["triangle"] },
  // Fun
  { id: "ice-cream", label: "Ice Cream", category: "fun", src: "/clipart/fun/ice-cream.svg", keywords: ["ice cream", "icecream"] },
  { id: "music-note", label: "Music", category: "fun", src: "/clipart/fun/music-note.svg", keywords: ["music", "music note"] },
  { id: "crown", label: "Crown", category: "fun", src: "/clipart/fun/crown.svg", keywords: ["crown"] },
  { id: "rocket", label: "Rocket", category: "fun", src: "/clipart/fun/rocket.svg", keywords: ["rocket", "spaceship"] },
  { id: "magnifier", label: "Search", category: "fun", src: "/clipart/fun/magnifier.svg", keywords: ["magnifier", "magnifying glass", "search"] },
  { id: "ball", label: "Ball", category: "fun", src: "/clipart/fun/ball.svg", keywords: ["ball", "beach ball"] },
  { id: "car", label: "Car", category: "fun", src: "/clipart/fun/car.svg", keywords: ["car"] },
];
