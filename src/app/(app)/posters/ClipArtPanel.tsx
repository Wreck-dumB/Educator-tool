"use client";

import { useState } from "react";
import Image from "next/image";
import { CLIPART_CATEGORIES, CLIPART_ITEMS } from "./clipart-registry";

interface Props {
  onSelect: (src: string) => void;
}

export default function ClipArtPanel({ onSelect }: Props) {
  const [activeCategory, setActiveCategory] = useState("all");

  const visible =
    activeCategory === "all"
      ? CLIPART_ITEMS
      : CLIPART_ITEMS.filter((i) => i.category === activeCategory);

  return (
    <div className="flex flex-col gap-2">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1">
        {CLIPART_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              activeCategory === cat.id
                ? "bg-coral text-white"
                : "border border-coral-light text-ink/60 hover:bg-coral-light/60"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">
        {visible.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.label}
            onClick={() => onSelect(item.src)}
            className="flex flex-col items-center gap-0.5 rounded-xl border border-transparent p-1.5 hover:border-coral hover:bg-coral-light/40 transition-colors"
          >
            <Image
              src={item.src}
              alt={item.label}
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
              unoptimized
            />
            <span className="text-[9px] text-ink/50 leading-tight text-center">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
