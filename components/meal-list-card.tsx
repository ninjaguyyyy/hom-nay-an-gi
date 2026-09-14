"use client";

import Image from "next/image";
import { Heart, Plus } from "lucide-react";
import { normalizeMealCategory, type MealCategory } from "@/lib/meal-categories";

type MealCardMeal = {
  id: string;
  name: string;
  type: "cook" | "eat_out";
  category?: MealCategory;
  estimated_cost: number;
  image_url?: string | null;
};

function getPriceTier(meal: MealCardMeal): "cheap" | "medium" | "expensive" {
  if (meal.estimated_cost < 50000) return "cheap";
  if (meal.estimated_cost <= 120000) return "medium";
  return "expensive";
}

export function MealListCard({
  meal,
  onClick,
  animationDelayMs = 0,
  ariaLabel,
}: {
  meal: MealCardMeal;
  onClick: () => void;
  animationDelayMs?: number;
  ariaLabel?: string;
}) {
  const normalizedCategory = normalizeMealCategory(meal.category);
  const priceTier = getPriceTier(meal);
  const tierClass =
    priceTier === "cheap"
      ? "border-emerald-100 bg-gradient-to-b from-emerald-50/70 to-white"
      : priceTier === "medium"
        ? "border-sky-100 bg-gradient-to-b from-sky-50/70 to-white"
        : "border-amber-100 bg-gradient-to-b from-amber-50/70 to-white";
  const tierBadgeClass =
    priceTier === "cheap"
      ? "bg-emerald-100 text-emerald-700"
      : priceTier === "medium"
        ? "bg-sky-100 text-sky-700"
        : "bg-amber-100 text-amber-700";
  const imageSrc = meal.image_url?.trim()
    ? meal.image_url
    : "https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&q=80";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group animate-pop-in h-full w-full overflow-hidden rounded-[1.25rem] border text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] ${tierClass}`}
      style={{ animationDelay: `${animationDelayMs}ms` }}
      aria-label={ariaLabel}
    >
      <div className="relative h-[7.75rem] w-full overflow-hidden bg-slate-50 sm:h-[8.5rem]">
        <Image
          src={imageSrc}
          alt={meal.name}
          fill
          className="object-cover transition duration-300 group-hover:scale-105"
          unoptimized={imageSrc.startsWith("data:image/")}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-black/5 to-transparent" />
        <span className={`absolute left-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-black ${tierBadgeClass}`}>
          {normalizedCategory}
        </span>
        <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-rose-400">
          <Heart className="h-4 w-4" />
        </span>
      </div>

      <div className="flex min-h-[5.6rem] flex-col gap-1.5 p-3 sm:min-h-[6rem]">
        <p className="line-clamp-2 text-[1.02rem] font-black leading-tight tracking-[-0.02em] text-slate-900 sm:text-[1.16rem]">
          {meal.name}
        </p>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold leading-tight text-slate-500">
            {meal.type === "cook" ? "Nấu ăn" : "Ăn ngoài"}
          </p>
          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-emerald-700 px-2 text-white">
            <Plus className="h-4 w-4" />
          </span>
        </div>
      </div>
    </button>
  );
}