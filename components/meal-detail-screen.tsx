"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Flame, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { MOCK_MEALS } from "@/lib/mock-data";

type Meal = {
  id: string;
  name: string;
  type: "cook" | "eat_out";
  estimated_cost: number;
  calories: number;
  protein: number;
  ingredients: string[];
  benefits: string[];
  health_warning: string | null;
  image_url?: string | null;
};

const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false";

function parseListText(value: string | null | undefined) {
  return String(value ?? "")
    .split(/\r?\n|,/) 
    .map((item) => item.trim())
    .filter(Boolean);
}

function estimateCarb(meal: Meal) {
  return Math.max(20, Math.round(meal.calories * 0.11));
}

function estimateFat(meal: Meal) {
  return Math.max(10, Math.round(meal.calories * 0.05));
}

function estimateGram(meal: Meal) {
  return Math.max(180, Math.round(meal.calories * 0.45));
}

const TEMPLATE_PRESET = {
  category: "FRUIT",
  grams: 260,
  name: "Mandarin Orange",
  calories: 260,
  macros: [
    { label: "Protein", value: "40g", color: "#88c844" },
    { label: "Fat", value: "35g", color: "#4ba7f2" },
    { label: "Carbs", value: "56g", color: "#de7a43" },
  ],
};

export function MealDetailScreen({ mealId }: { mealId: string }) {
  const router = useRouter();
  const { toast } = useToast();

  const [meal, setMeal] = useState<Meal | null>(null);
  const [loading, setLoading] = useState(true);

  const macros = useMemo(() => {
    if (!meal) return [];
    if (USE_MOCK_DATA) {
      return TEMPLATE_PRESET.macros;
    }
    return [
      { label: "Protein", value: `${meal.protein}g`, color: "#88c844" },
      { label: "Fat", value: `${estimateFat(meal)}g`, color: "#4ba7f2" },
      { label: "Carbs", value: `${estimateCarb(meal)}g`, color: "#de7a43" },
    ];
  }, [meal]);

  const displayName = USE_MOCK_DATA
    ? TEMPLATE_PRESET.name
    : meal?.name ?? "";
  const displayCalories = USE_MOCK_DATA
    ? TEMPLATE_PRESET.calories
    : meal?.calories ?? 0;
  const displayCategory = USE_MOCK_DATA
    ? TEMPLATE_PRESET.category
    : meal?.type === "cook"
      ? "COOK"
      : "EAT OUT";
  const displayGram = USE_MOCK_DATA
    ? TEMPLATE_PRESET.grams
    : meal
      ? estimateGram(meal)
      : 0;
  const heroImage = meal?.image_url?.trim()
    ? meal.image_url
    : "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=1200&q=80";

  useEffect(() => {
    async function loadDetail() {
      setLoading(true);
      try {
        if (USE_MOCK_DATA) {
          const found = MOCK_MEALS.find((item) => item.id === mealId) ?? MOCK_MEALS[0];
          setMeal(found);
          return;
        }

        const res = await fetch(`/api/meals/${mealId}`, { cache: "no-store" });
        const data = (await res.json()) as { meal?: Meal; error?: string };

        if (!res.ok || !data.meal) {
          throw new Error(data.error ?? "Không tìm thấy món ăn");
        }

        setMeal(data.meal);
      } catch (error) {
        toast({
          title: "Không tải được chi tiết",
          description: error instanceof Error ? error.message : "Đã có lỗi xảy ra",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    }

    void loadDetail();
  }, [mealId, toast]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[70] bg-gray-50">
        <div className="relative mx-auto h-full w-full max-w-md overflow-hidden border-x border-slate-200 bg-white p-3 shadow-xl shadow-emerald-100/30">
          <Skeleton className="h-72 w-full rounded-[2rem]" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-14 w-full" />
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!meal) {
    return (
      <section className="space-y-3 pb-24">
        <Card>
          <CardContent className="space-y-3 p-5 text-center">
            <p className="text-base font-semibold text-slate-800">Không có dữ liệu món ăn</p>
            <Button type="button" onClick={() => router.push("/")}>Quay về Home</Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] bg-gray-50">
      <section className="relative mx-auto h-full w-full max-w-md overflow-y-auto border-x border-slate-200 bg-gradient-to-b from-slate-50 via-white to-white pb-6 shadow-xl shadow-emerald-100/30">
        <div className="relative h-[18.5rem] w-full overflow-hidden sm:h-[21.5rem]">
          <Image
            src={heroImage}
            alt="Food hero"
            fill
            className="object-cover"
            style={{ objectPosition: "center 56%" }}
            priority
            unoptimized={heroImage.startsWith("data:image/")}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />

          <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-sm ring-1 ring-slate-200"
              aria-label="Quay lại"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-sm ring-1 ring-slate-200"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="relative z-10 -mt-10 rounded-t-[1.9rem] bg-white px-4 pb-5 pt-4 shadow-[0_-8px_20px_rgba(15,23,42,0.08)]">

          <div className="flex items-center gap-2">
            <Badge className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {displayCategory}
            </Badge>
            <Badge className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {displayGram} G
            </Badge>
          </div>

          <h2 className="mt-2.5 text-[2.15rem] font-extrabold leading-[1.04] tracking-tight text-slate-900 sm:text-[2.35rem]">
            {displayName}
          </h2>

          <div className="mt-3.5 flex items-center justify-between rounded-2xl bg-lime-50 px-4 py-3">
            <p className="whitespace-nowrap text-[1.9rem] font-extrabold leading-none tracking-tight text-slate-900">
              Total {displayCalories} kcal
            </p>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white">
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {macros.map((macro) => (
              <div key={macro.label} className="rounded-[1.35rem] bg-[#f7faee] p-2.5 text-center">
                <p className="text-base font-medium text-slate-600">{macro.label}</p>
                <div className="mx-auto mt-2 grid h-[4.2rem] w-[4.2rem] place-items-center rounded-full" style={{
                  background: `conic-gradient(${macro.color} 0deg 300deg, #e7ebf0 300deg 360deg)`,
                }}>
                  <div className="grid h-[3.35rem] w-[3.35rem] place-items-center rounded-full bg-white">
                    <p className="text-[1.2rem] font-bold leading-none text-slate-800">{macro.value}</p>
                  </div>
                </div>
                <p className="mt-1 text-[11px] font-semibold text-transparent">
                  .
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Button
              type="button"
              variant="outline"
              className="h-14 rounded-[1.2rem] border-slate-200 bg-slate-100 text-lg font-semibold text-slate-700"
            >
              Update Details
            </Button>
            <Link href="/add" className="block">
              <Button
                type="button"
                className="h-14 w-full rounded-[1.2rem] bg-black text-lg font-semibold text-white hover:bg-slate-900"
              >
                Add Meal
              </Button>
            </Link>
          </div>

          <div className="mt-3">
            <p className="text-sm font-semibold text-slate-700">Nguyên liệu</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(meal.ingredients.length > 0 ? meal.ingredients : meal.benefits).map((item) => (
                <Badge key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {item}
                </Badge>
              ))}
            </div>
          </div>

          {meal.health_warning ? (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <ul className="list-disc space-y-1 pl-5">
                {parseListText(meal.health_warning).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
