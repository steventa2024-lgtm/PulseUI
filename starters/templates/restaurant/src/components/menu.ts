export type Dish = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "Starters" | "Mains" | "Pizza" | "Desserts" | "Drinks";
  tags: Array<"Vegetarian" | "Vegan" | "Spicy" | "Gluten-free">;
  emoji: string;
  tint: string;
};

export const CATEGORIES: Array<Dish["category"]> = ["Starters", "Mains", "Pizza", "Desserts", "Drinks"];
export const DIETS: Array<Dish["tags"][number]> = ["Vegetarian", "Vegan", "Spicy", "Gluten-free"];

export const MENU: Dish[] = [
  { id: "burrata", name: "Burrata & Heirloom Tomato", description: "Basil oil, aged balsamic, grilled sourdough.", price: 14, category: "Starters", tags: ["Vegetarian"], emoji: "🍅", tint: "from-rose-100 to-orange-100" },
  { id: "calamari", name: "Crispy Calamari", description: "Lemon aioli, chili flakes, parsley.", price: 13, category: "Starters", tags: ["Spicy"], emoji: "🦑", tint: "from-amber-100 to-yellow-100" },
  { id: "soup", name: "Roasted Squash Soup", description: "Coconut cream, toasted pepitas.", price: 9, category: "Starters", tags: ["Vegan", "Gluten-free"], emoji: "🥣", tint: "from-orange-100 to-amber-100" },
  { id: "steak", name: "Grilled Ribeye", description: "Chimichurri, crispy potatoes, charred greens.", price: 34, category: "Mains", tags: ["Gluten-free"], emoji: "🥩", tint: "from-red-100 to-rose-100" },
  { id: "salmon", name: "Miso Glazed Salmon", description: "Jasmine rice, bok choy, sesame.", price: 27, category: "Mains", tags: ["Gluten-free"], emoji: "🐟", tint: "from-sky-100 to-cyan-100" },
  { id: "risotto", name: "Wild Mushroom Risotto", description: "Parmesan, thyme, truffle oil.", price: 22, category: "Mains", tags: ["Vegetarian", "Gluten-free"], emoji: "🍄", tint: "from-stone-100 to-amber-50" },
  { id: "margherita", name: "Margherita", description: "San Marzano tomato, fior di latte, basil.", price: 16, category: "Pizza", tags: ["Vegetarian"], emoji: "🍕", tint: "from-red-100 to-orange-100" },
  { id: "diavola", name: "Diavola", description: "Spicy salami, chili honey, mozzarella.", price: 19, category: "Pizza", tags: ["Spicy"], emoji: "🌶️", tint: "from-orange-100 to-red-100" },
  { id: "tiramisu", name: "Tiramisu", description: "Espresso-soaked ladyfingers, mascarpone.", price: 10, category: "Desserts", tags: ["Vegetarian"], emoji: "🍰", tint: "from-amber-100 to-stone-100" },
  { id: "sorbet", name: "Mango Sorbet", description: "Fresh lime, mint.", price: 8, category: "Desserts", tags: ["Vegan", "Gluten-free"], emoji: "🥭", tint: "from-yellow-100 to-orange-100" },
  { id: "lemonade", name: "Basil Lemonade", description: "House-made, lightly sparkling.", price: 6, category: "Drinks", tags: ["Vegan"], emoji: "🍋", tint: "from-lime-100 to-yellow-100" },
  { id: "espresso", name: "Espresso Tonic", description: "Double shot over tonic and orange.", price: 7, category: "Drinks", tags: ["Vegan"], emoji: "☕", tint: "from-stone-200 to-amber-100" },
];
