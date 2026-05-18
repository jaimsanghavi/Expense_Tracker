"use client";

import { useState } from "react";
import {
  Utensils, ShoppingCart, Car, Fuel, Zap, Home, ShoppingBag, Film,
  HeartPulse, GraduationCap, Plane, Sparkles, Gift, TrendingUp, Box,
  CreditCard, Banknote, Smartphone, Wallet,
  // Additional icons for richer selection
  Coffee, Beer, Pizza, Salad, Cake, IceCream,
  Bus, Train, Bike, ParkingCircle,
  Shirt, Watch, Gem, Scissors,
  Gamepad2, Music, Tv, Camera, Book, Headphones,
  Pill, Stethoscope, Dumbbell, Baby,
  Wifi, Phone, Globe, Cloud, Laptop,
  Dog, Cat, TreePine, Flower2, Mountain,
  Building2, Hammer, Wrench, PaintBucket,
  Briefcase, GraduationCap as Edu, Receipt, PiggyBank, Landmark,
  PartyPopper, Heart, Star, Trophy, Umbrella,
  type LucideIcon,
} from "lucide-react";

export const ICON_CATEGORIES = {
  "Food & Drink": {
    utensils: Utensils,
    coffee: Coffee,
    beer: Beer,
    pizza: Pizza,
    salad: Salad,
    cake: Cake,
    "ice-cream": IceCream,
  },
  "Transport": {
    car: Car,
    fuel: Fuel,
    bus: Bus,
    train: Train,
    bike: Bike,
    plane: Plane,
    "parking-circle": ParkingCircle,
  },
  "Shopping": {
    "shopping-cart": ShoppingCart,
    "shopping-bag": ShoppingBag,
    shirt: Shirt,
    watch: Watch,
    gem: Gem,
    scissors: Scissors,
    gift: Gift,
  },
  "Entertainment": {
    film: Film,
    "gamepad-2": Gamepad2,
    music: Music,
    tv: Tv,
    camera: Camera,
    book: Book,
    headphones: Headphones,
  },
  "Health & Fitness": {
    "heart-pulse": HeartPulse,
    pill: Pill,
    stethoscope: Stethoscope,
    dumbbell: Dumbbell,
    baby: Baby,
  },
  "Bills & Utilities": {
    zap: Zap,
    home: Home,
    wifi: Wifi,
    phone: Phone,
    globe: Globe,
    cloud: Cloud,
    laptop: Laptop,
  },
  "Nature & Pets": {
    dog: Dog,
    cat: Cat,
    "tree-pine": TreePine,
    "flower-2": Flower2,
    mountain: Mountain,
  },
  "Home & Tools": {
    "building-2": Building2,
    hammer: Hammer,
    wrench: Wrench,
    "paint-bucket": PaintBucket,
  },
  "Finance": {
    "credit-card": CreditCard,
    banknote: Banknote,
    smartphone: Smartphone,
    wallet: Wallet,
    receipt: Receipt,
    "piggy-bank": PiggyBank,
    landmark: Landmark,
    "trending-up": TrendingUp,
  },
  "Education & Work": {
    "graduation-cap": GraduationCap,
    briefcase: Briefcase,
    box: Box,
  },
  "Lifestyle": {
    sparkles: Sparkles,
    "party-popper": PartyPopper,
    heart: Heart,
    star: Star,
    trophy: Trophy,
    umbrella: Umbrella,
  },
} as const satisfies Record<string, Record<string, LucideIcon>>;

// Flat map of all icons
export const ALL_ICONS: Record<string, LucideIcon> = Object.values(ICON_CATEGORIES).reduce(
  (acc, group) => ({ ...acc, ...group }),
  {} as Record<string, LucideIcon>
);

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [search, setSearch] = useState("");

  const filteredCategories = Object.entries(ICON_CATEGORIES)
    .map(([category, icons]) => {
      const filtered = Object.entries(icons).filter(([name]) =>
        name.toLowerCase().includes(search.toLowerCase()) ||
        category.toLowerCase().includes(search.toLowerCase())
      );
      return [category, filtered] as const;
    })
    .filter(([, icons]) => icons.length > 0);

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search icons..."
        className="w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      <div className="max-h-[240px] overflow-y-auto space-y-3 rounded-md border p-2">
        {filteredCategories.map(([category, icons]) => (
          <div key={category}>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
              {category}
            </p>
            <div className="grid grid-cols-7 gap-1">
              {icons.map(([name, Icon]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onChange(name)}
                  title={name}
                  className={`
                    flex h-8 w-8 items-center justify-center rounded-md transition-all
                    ${value === name
                      ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/50"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        ))}
        {filteredCategories.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No icons found</p>
        )}
      </div>
      {/* Hidden input for form submission */}
      <input type="hidden" name="icon" value={value} />
    </div>
  );
}
