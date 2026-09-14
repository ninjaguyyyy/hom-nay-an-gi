"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight, Heart, Plus, Search, SlidersHorizontal, Star, Trash2, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { MOCK_MEALS } from "@/lib/mock-data";
import {
  MEAL_CATEGORIES,
  normalizeMealCategory,
  type MealCategory,
} from "@/lib/meal-categories";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MealListCard } from "@/components/meal-list-card";

type Review = {
  id: string;
  rating: number;
  review_text: string | null;
  actual_cost: number | null;
  created_at: string;
};

type Meal = {
  id: string;
  name: string;
  type: "cook" | "eat_out";
  category?: MealCategory;
  estimated_cost: number;
  calories: number;
  protein: number;
  ingredients: string[];
  benefits: string[];
  health_warning: string | null;
  image_url?: string | null;
  created_at: string;
  reviews: Review[];
};

const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false";
const TRAY_STORAGE_KEY = "home_tray_meal_ids_v1";

type MealTypeFilter = "all" | "cook" | "eat_out";
type SortOption = "newest" | "price_asc" | "price_desc" | "rating_desc";

function cloneMeals(input: Meal[]) {
  return input.map((meal) => ({
    ...meal,
    ingredients: [...(meal.ingredients?.length ? meal.ingredients : meal.benefits)],
    benefits: [...meal.benefits],
    reviews: meal.reviews.map((review) => ({ ...review })),
  }));
}

function averageRating(meal: Meal) {
  if (!meal.reviews.length) return 0;
  return meal.reviews.reduce((sum, review) => sum + review.rating, 0) / meal.reviews.length;
}

function safeTime(value: string) {
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function sortByNewest(list: Meal[]) {
  return [...list].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

function pickUniqueMeals(source: Meal[], count: number, excludedIds: Set<string>) {
  const output: Meal[] = [];

  for (const meal of source) {
    if (excludedIds.has(meal.id)) continue;
    output.push(meal);
    excludedIds.add(meal.id);
    if (output.length >= count) break;
  }

  return output;
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("en-US").format(value)} VNĐ`;
}

const discoveryCategories: Array<{
  label: string;
  icon: string;
  category?: MealCategory;
  type?: "cook" | "eat_out";
  sort?: SortOption;
}> = [
  { label: "Khuyến nghị", icon: "🔥", sort: "rating_desc" },
  { label: "Top quán", icon: "🏆", type: "eat_out", sort: "rating_desc" },
  { label: "Cơm", icon: "🍚", category: "Cơm" },
  { label: "Bún/Phở", icon: "🍲", category: "Bún/Phở/Mì" },
  { label: "Lẩu", icon: "🍜", category: "Lẩu" },
  { label: "Đồ nướng", icon: "🍢", category: "Nướng" },
];

function getPersonalizedDailyCandidates(inputMeals: Meal[]) {
  const now = Date.now();

  const allReviewSignals = inputMeals.flatMap((meal) =>
    meal.reviews.map((review) => {
      const reviewedAt = safeTime(review.created_at);
      const ageDays = reviewedAt > 0 ? (now - reviewedAt) / (1000 * 60 * 60 * 24) : 999;
      const recencyWeight = Math.max(0.2, 1 - ageDays / 30);

      return {
        mealType: meal.type,
        mealCategory: normalizeMealCategory(meal.category),
        score: review.rating * recencyWeight,
      };
    }),
  );

  const topSignals = allReviewSignals
    .sort((a, b) => b.score - a.score)
    .slice(0, 14);

  const typeScores = topSignals.reduce<Record<"cook" | "eat_out", number>>(
    (acc, signal) => {
      acc[signal.mealType] += signal.score;
      return acc;
    },
    { cook: 0, eat_out: 0 },
  );

  const categoryScores = topSignals.reduce<Record<string, number>>((acc, signal) => {
    acc[signal.mealCategory] = (acc[signal.mealCategory] ?? 0) + signal.score;
    return acc;
  }, {});

  const preferredType = typeScores.cook >= typeScores.eat_out ? "cook" : "eat_out";
  const preferredCategory = Object.entries(categoryScores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return [...inputMeals].sort((a, b) => {
    const aCategory = normalizeMealCategory(a.category);
    const bCategory = normalizeMealCategory(b.category);

    const aRecent = safeTime(a.reviews[0]?.created_at ?? a.created_at);
    const bRecent = safeTime(b.reviews[0]?.created_at ?? b.created_at);

    const aScore =
      averageRating(a) * 1.8 +
      (a.type === preferredType ? 1.1 : 0) +
      (preferredCategory && aCategory === preferredCategory ? 1.1 : 0) +
      (a.reviews.length > 0 ? 0.35 : 0) +
      aRecent / 10_000_000_000;

    const bScore =
      averageRating(b) * 1.8 +
      (b.type === preferredType ? 1.1 : 0) +
      (preferredCategory && bCategory === preferredCategory ? 1.1 : 0) +
      (b.reviews.length > 0 ? 0.35 : 0) +
      bRecent / 10_000_000_000;

    return bScore - aScore;
  });
}

function MealRailSection({
  title,
  subtitle,
  meals,
  onOpenMeal,
  onSeeAll,
  animationDelay,
}: {
  title: string;
  subtitle: string;
  meals: Meal[];
  onOpenMeal: (mealId: string) => void;
  onSeeAll: () => void;
  animationDelay: number;
}) {
  return (
    <section
      className="animate-pop-in space-y-2.5"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-[1.9rem] font-black leading-none tracking-tight text-slate-900">{title}</h2>
          <p className="mt-1 text-xs font-medium text-slate-500">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onSeeAll}
          className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-700"
          aria-label={`Mở thêm ${title}`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {meals.length > 0 ? (
        <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
          {meals.map((meal) => {
            const imageSrc = meal.image_url?.trim()
              ? meal.image_url
              : "https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&q=80";
            const score = averageRating(meal);

            return (
              <button
                key={meal.id}
                type="button"
                onClick={() => onOpenMeal(meal.id)}
                className="group w-[78%] min-w-[78%] snap-start overflow-hidden rounded-[1.3rem] border border-slate-200 bg-white text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg active:scale-[0.98]"
              >
                <div className="relative h-28 w-full overflow-hidden bg-slate-50">
                  <Image
                    src={imageSrc}
                    alt={meal.name}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-105"
                    unoptimized={imageSrc.startsWith("data:image/")}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-black/5 to-transparent" />
                  <span className="absolute left-2 top-2 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-black text-slate-700">
                    {normalizeMealCategory(meal.category)}
                  </span>
                  <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white">
                    <Star className="h-3 w-3 fill-current" />
                    {score ? score.toFixed(1) : "Mới"}
                  </span>
                </div>

                <div className="space-y-1.5 p-3">
                  <p className="line-clamp-2 text-[1.06rem] font-black leading-tight tracking-[-0.02em] text-slate-900">
                    {meal.name}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-slate-500">
                      {meal.type === "cook" ? "Nấu ăn" : "Ăn ngoài"}
                    </p>
                    <p className="text-[11px] font-black text-slate-700">{formatMoney(meal.estimated_cost)}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <Card className="border-slate-200">
          <CardContent className="py-5 text-center text-sm text-slate-500">
            Chưa có dữ liệu món ăn cho mục này.
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function DailyTraySection({
  meals,
  onOpenMeal,
  onRemoveFromTray,
  onSeeAll,
  onOpenPicker,
  hasCustomTray,
  animationDelay,
}: {
  meals: Meal[];
  onOpenMeal: (mealId: string) => void;
  onRemoveFromTray: (mealId: string) => void;
  onSeeAll: () => void;
  onOpenPicker: () => void;
  hasCustomTray: boolean;
  animationDelay: number;
}) {
  const displayedMeals = meals.slice(0, 4);
  const traySlots = [
    "left-1/2 top-2 -translate-x-1/2",
    "right-1 top-1/2 -translate-y-1/2",
    "left-1/2 bottom-2 -translate-x-1/2",
    "left-1 top-1/2 -translate-y-1/2",
  ];

  return (
    <section
      className="animate-pop-in space-y-2.5"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-[1.9rem] font-black leading-none tracking-tight text-slate-900">Món ăn trong ngày</h2>
          <p className="mt-1 text-xs font-medium text-slate-500">Mâm cơm gợi ý theo khẩu vị gần đây</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSeeAll}
            className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-700"
            aria-label="Mở thêm món ăn trong ngày"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {displayedMeals.length > 0 ? (
        <div className="relative overflow-hidden rounded-[2rem] border border-[#eadfc7] bg-[radial-gradient(circle_at_30%_20%,#fff7df_0%,#f7ead2_45%,#efe0c4_100%)] p-3 shadow-[0_14px_26px_rgba(111,80,24,0.2)]">
          <button
            type="button"
            onClick={onOpenPicker}
            className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-slate-800 shadow ring-1 ring-slate-200"
            aria-label="Thêm món"
          >
            <Plus className="h-4 w-4" />
          </button>

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0)_55%)]" />
          <div className="pointer-events-none absolute -right-8 top-6 h-24 w-24 rounded-full bg-white/30 blur-2xl" />
          <div className="pointer-events-none absolute -left-10 bottom-2 h-24 w-24 rounded-full bg-amber-200/25 blur-2xl" />
          <div className="pointer-events-none absolute right-8 top-8 h-1 w-14 rotate-[24deg] rounded-full bg-[#c79e63]/35" />
          <div className="pointer-events-none absolute right-7 top-10 h-1 w-14 rotate-[24deg] rounded-full bg-[#c79e63]/25" />

          <div className="animate-tray-spin relative mx-auto aspect-square w-full max-w-[19rem] rounded-full border-[10px] border-[#dfc08b] bg-[radial-gradient(circle,#f7dcae_0%,#ebc98f_62%,#dcae6a_100%)] shadow-[inset_0_8px_18px_rgba(255,255,255,0.4),inset_0_-10px_18px_rgba(108,69,18,0.26)]">
            <div className="absolute inset-[16%] rounded-full border border-[#cf9f57] bg-[radial-gradient(circle,#f5ead3_0%,#f1e2c6_100%)] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.55)]" />
            <div className="absolute inset-[32%] grid place-items-center rounded-full border border-[#d7b079] bg-[radial-gradient(circle,#fff9eb_0%,#f8ecd3_100%)] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.45)]">
              <span className="text-[11px] font-black tracking-wide text-[#8a6328]">MAM COM</span>
            </div>

            {displayedMeals.map((meal, index) => {
              const imageSrc = meal.image_url?.trim()
                ? meal.image_url
                : "https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&q=80";

              return (
                <div
                  key={meal.id}
                  className={`animate-tray-float group absolute ${traySlots[index] ?? traySlots[0]} w-[5.35rem] text-center`}
                  style={{ animationDelay: `${index * 140}ms` }}
                >
                  <button
                    type="button"
                    onClick={() => onRemoveFromTray(meal.id)}
                    className="absolute right-[0.3rem] top-0 z-10 grid h-5 w-5 place-items-center rounded-full bg-rose-50 text-rose-700 shadow ring-1 ring-rose-100"
                    aria-label={`Xóa ${meal.name}`}
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenMeal(meal.id)}
                    className="block w-full"
                  >
                    <span className="mx-auto block h-[4.2rem] w-[4.2rem] overflow-hidden rounded-full border-[3px] border-white bg-slate-100 shadow-lg transition duration-200 group-hover:scale-105">
                      <Image
                        src={imageSrc}
                        alt={meal.name}
                        width={120}
                        height={120}
                        className="h-full w-full object-cover"
                        unoptimized={imageSrc.startsWith("data:image/")}
                      />
                    </span>
                    <span className="mt-1.5 block rounded-full bg-white/85 px-1.5 py-1 text-[10px] font-bold leading-tight text-slate-800 shadow-sm">
                      {meal.name}
                    </span>
                  </button>
                </div>
              );
            })}

            {displayedMeals.length < 4 ? (
              <div className="absolute inset-x-0 bottom-4 text-center text-[11px] font-semibold text-slate-700">
                {hasCustomTray ? "Thêm món để mâm cơm đầy đặn hơn" : "Nhấn + để tự chọn món cho mâm cơm"}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <Card className="border-slate-200">
          <CardContent className="py-5 text-center text-sm text-slate-500">
            Chưa có món cho mâm cơm hôm nay.
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function TrayMealPickerModal({
  open,
  meals,
  trayMealIds,
  onAddMeal,
  onClose,
}: {
  open: boolean;
  meals: Meal[];
  trayMealIds: string[];
  onAddMeal: (mealId: string) => void;
  onClose: () => void;
}) {
  const [searchValue, setSearchValue] = useState("");
  const [mealTypeFilter, setMealTypeFilter] = useState<MealTypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<MealCategory | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showControlBar, setShowControlBar] = useState(true);

  const visibleMeals = useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase();

    const filtered = meals.filter((meal) => {
      const normalizedMealCategory = normalizeMealCategory(meal.category);

      if (normalizedQuery) {
        const inName = meal.name.toLowerCase().includes(normalizedQuery);
        const inIngredients = meal.ingredients.some((item) =>
          item.toLowerCase().includes(normalizedQuery),
        );
        if (!inName && !inIngredients) return false;
      }

      if (mealTypeFilter !== "all" && meal.type !== mealTypeFilter) {
        return false;
      }

      if (categoryFilter !== "all" && normalizedMealCategory !== categoryFilter) {
        return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "price_asc") return a.estimated_cost - b.estimated_cost;
      if (sortBy === "price_desc") return b.estimated_cost - a.estimated_cost;
      if (sortBy === "rating_desc") return averageRating(b) - averageRating(a);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [categoryFilter, mealTypeFilter, meals, searchValue, sortBy]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] bg-black/45 p-3">
      <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-hidden rounded-[1.8rem] bg-[#f7f5ef] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div>
            <p className="text-base font-black text-slate-900">Chọn món cho mâm cơm</p>
            <p className="text-xs font-medium text-slate-500">Bấm + trên card để thêm vào mâm</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-700"
            aria-label="Đóng popup chọn món"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative px-4 pb-3 pt-3">
          <Search className="pointer-events-none absolute left-8 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search for meals..."
            className="h-11 rounded-2xl border-slate-200 bg-white pl-10"
          />
        </div>

        <div className="px-4 pb-2">
          <button
            type="button"
            onClick={() => setShowControlBar((prev) => !prev)}
            className={
              showControlBar
                ? "grid h-10 w-10 place-items-center rounded-2xl bg-slate-900 text-white"
                : "grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700"
            }
            aria-label="Hiện hoặc ẩn bộ lọc"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {showControlBar ? (
          <div className="space-y-2 px-4 pb-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { value: "all", label: "Tất cả" },
                { value: "cook", label: "Nấu ăn" },
                { value: "eat_out", label: "Ăn ngoài" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setMealTypeFilter(item.value as MealTypeFilter)}
                  className={
                    mealTypeFilter === item.value
                      ? "whitespace-nowrap rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                      : "whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600"
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white px-3 text-xs font-semibold">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="z-[160]">
                  <SelectItem value="newest">Mới nhất</SelectItem>
                  <SelectItem value="price_asc">Giá tăng dần</SelectItem>
                  <SelectItem value="price_desc">Giá giảm dần</SelectItem>
                  <SelectItem value="rating_desc">Đánh giá cao</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={categoryFilter}
                onValueChange={(value) => setCategoryFilter(value as MealCategory | "all")}
              >
                <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white px-3 text-xs font-semibold">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="z-[160]">
                  <SelectItem value="all">Tất cả category</SelectItem>
                  {MEAL_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}

        <div className="grid h-[27.8rem] grid-cols-2 auto-rows-[14rem] gap-2.5 overflow-y-auto px-4 pb-6">
          {visibleMeals.map((meal, index) => {
            const selected = trayMealIds.includes(meal.id);

            return (
              <MealListCard
                key={meal.id}
                meal={meal}
                onClick={() => {
                  if (!selected) onAddMeal(meal.id);
                }}
                animationDelayMs={Math.min(index * 60, 360)}
                aria-label={selected ? `${meal.name} đã có trong mâm` : `Thêm ${meal.name} vào mâm`}
              />
            );
          })}

          {visibleMeals.length === 0 ? (
            <div className="col-span-2 rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
              Không tìm thấy món ăn phù hợp.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function HomeDashboardScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDiscoveryLabel, setActiveDiscoveryLabel] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [trayMealIds, setTrayMealIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  function pushWithTransition(target: string) {
    setIsLeaving(true);
    window.setTimeout(() => {
      router.push(target);
      setIsLeaving(false);
    }, 140);
  }

  function openListWithFilters({
    type,
    category,
    sort,
  }: {
    type?: "cook" | "eat_out";
    category?: MealCategory;
    sort?: SortOption;
  } = {}) {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (category) params.set("category", category);
    if (sort) params.set("sort", sort);

    const query = params.toString();
    pushWithTransition(query ? `/randomizer?${query}` : "/randomizer");
  }

  function addToTray(mealId: string) {
    setTrayMealIds((prev) => {
      if (prev.includes(mealId)) return prev;
      return [...prev, mealId].slice(-12);
    });

    const meal = meals.find((item) => item.id === mealId);
    if (meal) {
      toast({
        title: "Đã thêm vào mâm cơm",
        description: `${meal.name} đã được thêm vào mâm cơm hôm nay.`,
        variant: "success",
      });
    }
  }

  function removeFromTray(mealId: string) {
    setTrayMealIds((prev) => prev.filter((id) => id !== mealId));
  }

  useEffect(() => {
    async function loadMeals() {
      setLoading(true);
      setError(null);

      try {
        if (USE_MOCK_DATA) {
          setMeals(sortByNewest(cloneMeals(MOCK_MEALS)));
          return;
        }

        const res = await fetch("/api/meals?page=1&pageSize=20", { cache: "no-store" });
        const data = (await res.json()) as { meals?: Meal[]; error?: string };

        if (!res.ok) {
          throw new Error(data.error ?? "Không tải được danh sách món ăn");
        }

        setMeals(sortByNewest(data.meals ?? []));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    }

    void loadMeals();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(TRAY_STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) {
        setTrayMealIds(parsed.filter((id) => typeof id === "string"));
      }
    } catch {
      // Ignore invalid local storage payload.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TRAY_STORAGE_KEY, JSON.stringify(trayMealIds));
  }, [trayMealIds]);

  const sections = useMemo(() => {
    const usedIds = new Set<string>();

    const daily = pickUniqueMeals(getPersonalizedDailyCandidates(meals), 4, usedIds);
    const favorites = pickUniqueMeals(
      [...meals].sort((a, b) => {
        if (averageRating(b) !== averageRating(a)) return averageRating(b) - averageRating(a);
        return b.reviews.length - a.reviews.length;
      }),
      4,
      usedIds,
    );

    return {
      daily,
      favorites,
    };
  }, [meals]);

  const trayMeals = useMemo(() => {
    const pickedMeals = trayMealIds
      .map((mealId) => meals.find((meal) => meal.id === mealId) ?? null)
      .filter((meal): meal is Meal => Boolean(meal));

    return pickedMeals.length > 0 ? pickedMeals.slice(0, 4) : sections.daily;
  }, [meals, sections.daily, trayMealIds]);

  const heroMeals = useMemo(() => {
    return meals.slice(0, 3);
  }, [meals]);

  if (loading) {
    return (
      <section className="space-y-5 pb-24">
        <Skeleton className="h-44 w-full rounded-[2rem]" />
        <div className="-mx-1 flex gap-4 overflow-hidden px-1 pb-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={`discovery-skeleton-${index}`} className="flex min-w-[4.2rem] flex-col items-center gap-2">
              <Skeleton className="h-14 w-14 rounded-2xl" />
              <Skeleton className="h-3 w-12 rounded-full" />
            </div>
          ))}
        </div>

        <div className="space-y-2.5">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-[21rem] w-full rounded-[2rem]" />
        </div>

        <div className="space-y-2.5">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-5 w-52" />
          <div className="flex gap-3 overflow-hidden pb-1">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton key={`favorites-skeleton-${index}`} className="h-48 w-[78%] min-w-[78%] rounded-[1.3rem]" />
            ))}
          </div>
        </div>

        {Array.from({ length: 1 }).map((_, index) => (
          <div key={`extra-rail-skeleton-${index}`} className="space-y-2">
            <Skeleton className="h-6 w-44" />
            <div className="flex gap-3 overflow-hidden pb-1">
              <Skeleton className="h-48 w-[78%] min-w-[78%] rounded-[1.3rem]" />
              <Skeleton className="h-48 w-[78%] min-w-[78%] rounded-[1.3rem]" />
            </div>
          </div>
        ))}
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-3 pb-24">
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="py-5 text-center text-sm text-rose-700">{error}</CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className={`space-y-5 pb-24 transition-all duration-200 ${isLeaving ? "translate-y-1 opacity-60" : "opacity-100"}`}>
      <div className="animate-pop-in flex items-center justify-between gap-3 pt-1">
        <div>
          <p className="text-sm font-semibold text-slate-500">Gợi ý hôm nay</p>
          <p className="text-xl font-black tracking-tight text-slate-900">Hi bạn, ăn gì ngon?</p>
        </div>
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700"
          aria-label="Thông báo"
        >
          <Bell className="h-5 w-5" />
        </button>
      </div>

      <div
        className="animate-pop-in relative overflow-hidden rounded-[2rem] border border-[#f0e6cf] bg-gradient-to-br from-[#fff8e7] via-[#fff4d8] to-[#f5f0df] p-4 shadow-[0_14px_30px_rgba(120,92,35,0.12)]"
        style={{ animationDelay: "40ms" }}
      >
        <div className="absolute inset-x-0 bottom-0 h-14 bg-[linear-gradient(to_top,rgba(188,170,130,0.18),transparent)]" />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="max-w-[48%] space-y-2">
            <p className="text-[1.85rem] font-black leading-[1.02] tracking-tight text-slate-900">Thực đơn cho hôm nay</p>
            <p className="text-sm leading-snug text-slate-700">Khám phá món phù hợp khẩu vị, chi phí và mục tiêu dinh dưỡng của bạn.</p>
            <button
              type="button"
              onClick={() => openListWithFilters({ sort: "newest" })}
              className="rounded-full bg-black px-4 py-2 text-sm font-bold text-white"
            >
              Xem danh sách
            </button>
          </div>

          <div className="relative h-28 w-[45%]">
            {heroMeals.map((meal, index) => {
              const imageSrc = meal.image_url?.trim()
                ? meal.image_url
                : "https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&q=80";
              const rotate = index === 0 ? "-rotate-6" : index === 2 ? "rotate-6" : "rotate-0";
              const z = index === 1 ? "z-20" : "z-10";
              const pos = index === 0 ? "left-0 top-6" : index === 1 ? "left-7 top-0" : "right-0 top-5";

              return (
                <div
                  key={meal.id}
                  className={`absolute ${pos} ${z} ${rotate} h-[5.8rem] w-[5.8rem] overflow-hidden rounded-2xl border-2 border-white shadow-lg`}
                >
                  <Image
                    src={imageSrc}
                    alt={meal.name}
                    fill
                    className="object-cover"
                    unoptimized={imageSrc.startsWith("data:image/")}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div
        className="animate-pop-in -mx-1 flex gap-4 overflow-x-auto px-1 pb-1"
        style={{ animationDelay: "90ms" }}
      >
        {discoveryCategories.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              setActiveDiscoveryLabel(item.label);
              openListWithFilters({
                type: item.type,
                category: item.category,
                sort: item.sort,
              });
            }}
            className="flex min-w-[4.2rem] flex-col items-center gap-2"
          >
            <span
              className={
                activeDiscoveryLabel === item.label
                  ? "grid h-14 w-14 place-items-center rounded-2xl bg-lime-100 text-3xl shadow-sm ring-1 ring-lime-300"
                  : "grid h-14 w-14 place-items-center rounded-2xl bg-white text-3xl shadow-sm ring-1 ring-slate-200"
              }
            >
              {item.icon}
            </span>
            <span
              className={
                activeDiscoveryLabel === item.label
                  ? "text-center text-xs font-bold leading-tight text-slate-900"
                  : "text-center text-xs font-semibold leading-tight text-slate-700"
              }
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>

      <DailyTraySection
        meals={trayMeals}
        onOpenMeal={(mealId) => router.push(`/meals/${mealId}`)}
        onRemoveFromTray={removeFromTray}
        onSeeAll={() => openListWithFilters({ sort: "newest" })}
        onOpenPicker={() => setPickerOpen(true)}
        hasCustomTray={trayMealIds.length > 0}
        animationDelay={170}
      />
      <MealRailSection
        title="Món ăn yêu thích"
        subtitle="Điểm rating cao và đáng thử"
        meals={sections.favorites}
        onOpenMeal={(mealId) => router.push(`/meals/${mealId}`)}
        onSeeAll={() => openListWithFilters({ sort: "rating_desc" })}
        animationDelay={220}
      />

      <TrayMealPickerModal
        open={pickerOpen}
        meals={meals}
        trayMealIds={trayMealIds}
        onAddMeal={addToTray}
        onClose={() => {
          setPickerOpen(false);
        }}
      />
    </section>
  );
}
