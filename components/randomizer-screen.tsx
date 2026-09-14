"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Dices, Flame, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
};

type FilterType = "any" | "cook" | "eat_out";
type BudgetType = "any" | "cheap" | "medium" | "expensive";
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false";

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("en-US").format(value)} VNĐ`;
}

export function RandomizerScreen() {
  const [typeFilter, setTypeFilter] = useState<FilterType>("any");
  const [budgetFilter, setBudgetFilter] = useState<BudgetType>("any");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickedMeal, setPickedMeal] = useState<Meal | null>(null);
  const [spinning, setSpinning] = useState(false);

  const confettiDots = useMemo(() => Array.from({ length: 14 }, (_, i) => i), []);

  async function handleSpin() {
    setLoading(true);
    setError(null);
    setSpinning(true);

    try {
      let meals: Meal[] = [];

      if (USE_MOCK_DATA) {
        meals = MOCK_MEALS.filter((meal) => {
          const typeOk = typeFilter === "any" ? true : meal.type === typeFilter;
          const budgetOk =
            budgetFilter === "any"
              ? true
              : budgetFilter === "cheap"
                ? meal.estimated_cost < 50000
                : budgetFilter === "medium"
                  ? meal.estimated_cost >= 50000 && meal.estimated_cost <= 120000
                  : meal.estimated_cost > 120000;

          return typeOk && budgetOk;
        });
      } else {
        const qs = new URLSearchParams();
        if (typeFilter !== "any") qs.set("type", typeFilter);
        if (budgetFilter !== "any") qs.set("budget", budgetFilter);

        const res = await fetch(`/api/meals?${qs.toString()}`, { cache: "no-store" });
        const data = (await res.json()) as { meals?: Meal[]; error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? "Không thể tải dữ liệu random");
        }

        meals = data.meals ?? [];
      }

      if (meals.length === 0) {
        setPickedMeal(null);
        throw new Error("Không có món phù hợp với bộ lọc hiện tại.");
      }

      const randomIndex = Math.floor(Math.random() * meals.length);
      setTimeout(() => {
        setPickedMeal(meals[randomIndex]);
        setSpinning(false);
      }, 650);
    } catch (err) {
      setSpinning(false);
      setError(err instanceof Error ? err.message : "Không thể chọn món");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4 pb-24">
      <div>
        <h2 className="text-3xl font-black text-slate-900">Hôm nay ăn gì?</h2>
        <p className="text-sm text-slate-500">Lọc nhanh rồi bấm QUAY để app chọn giúp bạn.</p>
        {USE_MOCK_DATA ? <Badge variant="neutral">Demo data mode</Badge> : null}
      </div>

      <Card className="border-slate-100">
        <CardHeader>
          <CardTitle className="text-lg">Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">Loại món</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "any", label: "Bất kỳ" },
                { value: "cook", label: "Nấu" },
                { value: "eat_out", label: "Ăn ngoài" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setTypeFilter(item.value as FilterType)}
                  className={
                    typeFilter === item.value
                      ? "rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                      : "rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600"
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">Ngân sách</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "any", label: "Bất kỳ" },
                { value: "cheap", label: "Rẻ" },
                { value: "medium", label: "Vừa" },
                { value: "expensive", label: "Cao" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setBudgetFilter(item.value as BudgetType)}
                  className={
                    budgetFilter === item.value
                      ? "rounded-2xl bg-lime-300 px-3 py-2 text-sm font-bold text-slate-900"
                      : "rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600"
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            size="lg"
            className="w-full rounded-2xl bg-lime-300 text-lg font-black text-slate-900 hover:bg-lime-400"
            onClick={handleSpin}
            disabled={loading}
          >
            <Dices className={spinning ? "mr-2 h-5 w-5 animate-spin" : "mr-2 h-5 w-5"} />
            QUAY / CHỌN MÓN
          </Button>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {pickedMeal ? (
        <Card className={spinning ? "scale-95" : "animate-pop-in"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant={pickedMeal.type === "cook" ? "default" : "warning"}>
                {pickedMeal.type === "cook" ? "Cook" : "Eat out"}
              </Badge>
              <div className="flex items-center gap-1 text-amber-500">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold">Bạn vừa quay trúng</span>
              </div>
            </div>
            <CardTitle className="text-3xl font-black">{pickedMeal.name}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-lime-50 px-4 py-3">
              <p className="text-sm text-slate-500">Tổng năng lượng</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-900">
                <Flame className="h-6 w-6 text-orange-500" />
                {pickedMeal.calories} kcal
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-slate-100 p-3">
                <p className="text-xs text-slate-500">Protein</p>
                <p className="text-lg font-bold text-slate-900">{pickedMeal.protein}g</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3">
                <p className="text-xs text-slate-500">Chi phí dự kiến</p>
                <p className="text-lg font-bold text-slate-900">{formatMoney(pickedMeal.estimated_cost)}</p>
              </div>
            </div>

            <Link href={`/meals/${pickedMeal.id}`} className="block">
              <Button variant="outline" className="w-full rounded-2xl border-slate-300">
                Xem trang chi tiết
              </Button>
            </Link>

            <div>
              <p className="text-sm font-semibold text-slate-700">Lợi ích khi ăn</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {pickedMeal.benefits.map((item) => (
                  <Badge key={item} variant="neutral">
                    {item}
                  </Badge>
                ))}
                {pickedMeal.benefits.length === 0 ? (
                  <p className="text-sm text-slate-500">Chưa có dữ liệu.</p>
                ) : null}
              </div>
            </div>

            {pickedMeal.health_warning?.trim() ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <ul className="list-disc space-y-1 pl-5">
                  {pickedMeal.health_warning
                    .split(/\r?\n|,/)
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                </ul>
              </div>
            ) : null}

            <div className="relative mt-2 h-10 overflow-hidden">
              {confettiDots.map((dot) => (
                <span
                  key={dot}
                  className={spinning ? "absolute h-2.5 w-2.5 animate-bounce rounded-full bg-lime-400" : "hidden"}
                  style={{
                    left: `${(dot * 7) % 95}%`,
                    animationDelay: `${dot * 50}ms`,
                  }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
