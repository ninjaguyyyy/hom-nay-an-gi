"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpDown,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { MOCK_MEALS } from "@/lib/mock-data";
import {
  DEFAULT_MEAL_CATEGORY,
  MEAL_CATEGORIES,
  type MealCategory,
  normalizeMealCategory,
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
const PAGE_SIZE = 8;

function cloneMeals<T extends Meal>(input: T[]) {
  return input.map((meal) => ({
    ...meal,
    ingredients: [...(meal.ingredients?.length ? meal.ingredients : meal.benefits)],
    benefits: [...meal.benefits],
    reviews: meal.reviews.map((review) => ({ ...review })),
  }));
}

type ReviewForm = {
  rating: number;
  actual_cost: string;
  review_text: string;
};

type MealTypeFilter = "all" | "cook" | "eat_out";
type SortOption = "newest" | "price_asc" | "price_desc" | "rating_desc";

type MealEditForm = {
  name: string;
  type: "cook" | "eat_out";
  category: MealCategory;
  estimated_cost: string;
  ingredients: string;
  benefits: string;
  health_warning: string;
  image_url: string;
};

const defaultReviewForm: ReviewForm = {
  rating: 5,
  actual_cost: "",
  review_text: "",
};

const defaultMealEditForm: MealEditForm = {
  name: "",
  type: "cook",
  category: DEFAULT_MEAL_CATEGORY,
  estimated_cost: "",
  ingredients: "",
  benefits: "",
  health_warning: "",
  image_url: "",
};

const MAX_IMAGE_SIZE_MB = 2;
const MAX_IMAGE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("en-US").format(value)} VNĐ`;
}

function formatCurrencyInput(value: string | number) {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("en-US").format(Number(digits));
}

function parseListInput(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNonNegativeNumber(raw: string, fieldLabel: string) {
  if (raw.trim() === "") {
    throw new Error(`${fieldLabel} không được để trống`);
  }

  const normalized = raw.replace(/[^\d.-]/g, "");
  const value = Number(normalized);
  if (Number.isNaN(value) || value < 0) {
    throw new Error(`${fieldLabel} phải là số không âm`);
  }

  return value;
}

export function HomeScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mockMeals, setMockMeals] = useState<Meal[]>(() => cloneMeals(MOCK_MEALS));
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [mealTypeFilter, setMealTypeFilter] = useState<MealTypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<MealCategory | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showControlBar, setShowControlBar] = useState(true);

  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
  const [editingMeal, setEditingMeal] = useState(false);
  const [savingMeal, setSavingMeal] = useState(false);
  const [uploadingMealImage, setUploadingMealImage] = useState(false);
  const [pendingMealImageUrl, setPendingMealImageUrl] = useState<string | null>(null);
  const [mealForm, setMealForm] = useState<MealEditForm>(defaultMealEditForm);

  const [reviewForm, setReviewForm] = useState<ReviewForm>(defaultReviewForm);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewEditForm, setReviewEditForm] = useState<ReviewForm>(defaultReviewForm);
  const [savingReview, setSavingReview] = useState(false);

  const [confirmMealDeleteOpen, setConfirmMealDeleteOpen] = useState(false);
  const [confirmReviewDeleteId, setConfirmReviewDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const selectedMeal = useMemo(
    () => meals.find((meal) => meal.id === selectedMealId) ?? null,
    [meals, selectedMealId],
  );

  useEffect(() => {
    const typeParam = searchParams.get("type");
    const categoryParam = searchParams.get("category");
    const sortParam = searchParams.get("sort");
    const quickParam = searchParams.get("quick");
    const queryParam = searchParams.get("q") ?? "";

    setSearchValue(queryParam);

    let nextMealType: MealTypeFilter = "all";
    let nextCategory: MealCategory | "all" = "all";

    if (quickParam === "cook") {
      nextMealType = "cook";
    } else if (quickParam === "eat_out") {
      nextMealType = "eat_out";
    } else if (quickParam === "healthy") {
      nextCategory = "Gỏi/Salad";
    }

    if (typeParam === "cook" || typeParam === "eat_out") {
      nextMealType = typeParam;
    }

    if (categoryParam && categoryParam !== "all") {
      nextCategory = normalizeMealCategory(categoryParam);
    }

    setMealTypeFilter(nextMealType);
    setCategoryFilter(nextCategory);

    setSortBy(
      sortParam === "price_asc" ||
      sortParam === "price_desc" ||
      sortParam === "rating_desc" ||
      sortParam === "newest"
        ? sortParam
        : "newest",
    );

    if (typeParam || categoryParam || sortParam || queryParam || quickParam) {
      setShowControlBar(true);
    }
  }, [searchParams]);

  function toMealEditForm(meal: Meal): MealEditForm {
    return {
      name: meal.name,
      type: meal.type,
      category: normalizeMealCategory(meal.category),
      estimated_cost: formatCurrencyInput(meal.estimated_cost),
      ingredients: meal.ingredients.join("\n"),
      benefits: meal.benefits.join("\n"),
      health_warning:
        meal.health_warning
          ?.split(/\r?\n|,/)
          .map((item) => item.trim())
          .filter(Boolean)
          .join("\n") ?? "",
      image_url: meal.image_url?.trim() ?? "",
    };
  }

  useEffect(() => {
    if (!selectedMeal) return;
    setMealForm(toMealEditForm(selectedMeal));
    setPendingMealImageUrl(null);
  }, [selectedMeal]);

  async function cleanupUploadedMealImage(imageUrl?: string | null) {
    if (USE_MOCK_DATA || !imageUrl?.trim()) return;

    try {
      await fetch("/api/uploads/meal-image", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: imageUrl.trim() }),
      });
    } catch {
      // Best effort cleanup only.
    }
  }

  async function fileToDataUrl(file: File) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Không thể đọc file ảnh"));
      reader.readAsDataURL(file);
    });
  }

  async function handleMealImagePick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "File không hợp lệ",
        description: "Vui lòng chọn file ảnh.",
        variant: "error",
      });
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      toast({
        title: "Ảnh quá lớn",
        description: `Vui lòng chọn ảnh nhỏ hơn ${MAX_IMAGE_SIZE_MB}MB.`,
        variant: "error",
      });
      event.target.value = "";
      return;
    }

    setUploadingMealImage(true);
    try {
      let imageUrl = "";

      if (USE_MOCK_DATA) {
        imageUrl = await fileToDataUrl(file);
      } else {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/uploads/meal-image", {
          method: "POST",
          body: formData,
        });

        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          throw new Error(data.error ?? "Không thể upload ảnh");
        }
        imageUrl = data.url;

        if (pendingMealImageUrl && pendingMealImageUrl !== imageUrl) {
          await cleanupUploadedMealImage(pendingMealImageUrl);
        }
        setPendingMealImageUrl(imageUrl);
      }

      setMealForm((prev) => ({ ...prev, image_url: imageUrl }));
      toast({
        title: "Đã cập nhật ảnh",
        description: "Ảnh mới đã được chọn cho món ăn.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Không thể tải ảnh",
        description: err instanceof Error ? err.message : "Lỗi hệ thống",
        variant: "error",
      });
    } finally {
      setUploadingMealImage(false);
      event.target.value = "";
    }
  }

  async function handleClearMealImage() {
    if (pendingMealImageUrl && mealForm.image_url.trim() === pendingMealImageUrl) {
      await cleanupUploadedMealImage(pendingMealImageUrl);
      setPendingMealImageUrl(null);
    }
    setMealForm((prev) => ({ ...prev, image_url: "" }));
  }

  async function cancelMealEdit() {
    if (pendingMealImageUrl) {
      await cleanupUploadedMealImage(pendingMealImageUrl);
      setPendingMealImageUrl(null);
    }

    if (selectedMeal) {
      setMealForm(toMealEditForm(selectedMeal));
    }

    setEditingMeal(false);
  }

  function closeDetailModal() {
    if (pendingMealImageUrl) {
      void cleanupUploadedMealImage(pendingMealImageUrl);
      setPendingMealImageUrl(null);
    }

    setSelectedMealId(null);
    setEditingMeal(false);
    setEditingReviewId(null);
    setMealForm(defaultMealEditForm);
    setReviewEditForm(defaultReviewForm);
    setReviewForm(defaultReviewForm);
  }

  function applyMockPage(sourceMeals: Meal[], nextPage = 1, append = false) {
    const from = (nextPage - 1) * PAGE_SIZE;
    const nextSlice = sourceMeals.slice(from, from + PAGE_SIZE);

    let mergedMeals: Meal[] = [];
    setMeals((prev) => {
      mergedMeals = append ? [...prev, ...nextSlice] : nextSlice;
      return mergedMeals;
    });

    setHasMore(from + PAGE_SIZE < sourceMeals.length);
    setPage(nextPage);

    if (selectedMealId && !mergedMeals.some((meal) => meal.id === selectedMealId)) {
      closeDetailModal();
    }
  }

  async function loadMeals(nextPage = 1, append = false) {
    if (nextPage === 1 && !append) {
      setLoading(true);
    }
    if (append) {
      setLoadingMore(true);
    }
    setError(null);

    try {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 240));
        applyMockPage(mockMeals, nextPage, append);
        return true;
      }

      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: "8",
      });
      const res = await fetch(`/api/meals?${params.toString()}`, { cache: "no-store" });
      const data = (await res.json()) as {
        meals?: Meal[];
        has_more?: boolean;
        page?: number;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Không tải được danh sách món");
      }

      const nextMeals = data.meals ?? [];
      let mergedMeals: Meal[] = [];
      setMeals((prev) => {
        mergedMeals = append ? [...prev, ...nextMeals] : nextMeals;
        return mergedMeals;
      });
      setHasMore(Boolean(data.has_more));
      setPage(data.page ?? nextPage);

      if (selectedMealId && !mergedMeals.some((meal) => meal.id === selectedMealId)) {
        closeDetailModal();
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi tải dữ liệu";
      setError(message);
      toast({ title: "Lỗi tải dữ liệu", description: message, variant: "error" });
      return false;
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    void loadMeals(1, false);
  }, []);

  async function handleLoadMore() {
    if (!hasMore || loadingMore) return;
    await loadMeals(page + 1, true);
  }

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

    const averageRating = (meal: Meal) => {
      if (!meal.reviews.length) return 0;
      return meal.reviews.reduce((sum, review) => sum + review.rating, 0) / meal.reviews.length;
    };

    return filtered.sort((a, b) => {
      if (sortBy === "price_asc") return a.estimated_cost - b.estimated_cost;
      if (sortBy === "price_desc") return b.estimated_cost - a.estimated_cost;
      if (sortBy === "rating_desc") return averageRating(b) - averageRating(a);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [meals, searchValue, mealTypeFilter, categoryFilter, sortBy]);

  async function handleReviewSubmit() {
    if (!selectedMeal) return;

    setSavingReview(true);
    setError(null);

    try {
      let actualCost: number | undefined;
      if (reviewForm.actual_cost.trim() !== "") {
        actualCost = parseNonNegativeNumber(reviewForm.actual_cost, "Chi phí thực tế");
      }

      if (USE_MOCK_DATA) {
        const nextMockMeals = mockMeals.map((meal) => {
          if (meal.id !== selectedMeal.id) return meal;
          return {
            ...meal,
            reviews: [
              {
                id: crypto.randomUUID(),
                rating: reviewForm.rating,
                review_text: reviewForm.review_text.trim() || null,
                actual_cost: actualCost ?? null,
                created_at: new Date().toISOString(),
              },
              ...meal.reviews,
            ],
          };
        });
        setMockMeals(nextMockMeals);
        applyMockPage(nextMockMeals, 1, false);
        setReviewForm(defaultReviewForm);
        toast({
          title: "Đã thêm review",
          description: "Đánh giá của bạn đã được lưu (demo data).",
          variant: "success",
        });
        return;
      }

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal_id: selectedMeal.id,
          rating: reviewForm.rating,
          actual_cost: actualCost,
          review_text: reviewForm.review_text,
        }),
      });

      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Không thể lưu review");
      }

      await loadMeals(1, false);
      setReviewForm(defaultReviewForm);
      toast({
        title: "Đã thêm review",
        description: "Đánh giá của bạn đã được lưu.",
        variant: "success",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi khi lưu review";
      setError(message);
      toast({ title: "Không thể lưu review", description: message, variant: "error" });
    } finally {
      setSavingReview(false);
    }
  }

  async function handleMealUpdate() {
    if (!selectedMeal) return;

    try {
      if (!mealForm.name.trim()) {
        throw new Error("Tên món không được để trống");
      }

      const estimatedCost = parseNonNegativeNumber(mealForm.estimated_cost, "Chi phí");

      if (USE_MOCK_DATA) {
        const nextMockMeals = mockMeals.map((meal) => {
          if (meal.id !== selectedMeal.id) return meal;
          return {
            ...meal,
            name: mealForm.name.trim(),
            type: mealForm.type,
            category: normalizeMealCategory(mealForm.category),
            estimated_cost: estimatedCost,
            ingredients: parseListInput(mealForm.ingredients),
            benefits: parseListInput(mealForm.benefits),
            health_warning: parseListInput(mealForm.health_warning).join(", ") || null,
            image_url: mealForm.image_url.trim() || null,
          };
        });

        setMockMeals(nextMockMeals);
        applyMockPage(nextMockMeals, 1, false);
        setPendingMealImageUrl(null);
        setEditingMeal(false);
        toast({
          title: "Đã cập nhật món",
          description: "Thông tin món đã được cập nhật (demo data).",
          variant: "success",
        });
        return;
      }

      setSavingMeal(true);

      const res = await fetch(`/api/meals/${selectedMeal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: mealForm.name,
          type: mealForm.type,
          category: normalizeMealCategory(mealForm.category),
          estimated_cost: estimatedCost,
          ingredients: parseListInput(mealForm.ingredients),
          benefits: parseListInput(mealForm.benefits),
          health_warning: parseListInput(mealForm.health_warning).join(", "),
          image_url: mealForm.image_url.trim() || null,
        }),
      });

      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Không thể cập nhật món ăn");
      }

      await loadMeals(1, false);
      setPendingMealImageUrl(null);
      setEditingMeal(false);
      toast({
        title: "Đã cập nhật món",
        description: data.message ?? "Thông tin món đã được cập nhật.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Không thể cập nhật",
        description: err instanceof Error ? err.message : "Lỗi hệ thống",
        variant: "error",
      });
    } finally {
      setSavingMeal(false);
    }
  }

  function startEditReview(review: Review) {
    setEditingReviewId(review.id);
    setReviewEditForm({
      rating: review.rating,
      actual_cost: review.actual_cost !== null ? String(review.actual_cost) : "",
      review_text: review.review_text ?? "",
    });
  }

  async function handleReviewUpdate() {
    if (!editingReviewId) return;

    try {
      const actualCost =
        reviewEditForm.actual_cost.trim() === ""
          ? null
          : parseNonNegativeNumber(reviewEditForm.actual_cost, "Chi phí thực tế");

      if (USE_MOCK_DATA) {
        const nextMockMeals = mockMeals.map((meal) => ({
          ...meal,
          reviews: meal.reviews.map((review) =>
            review.id === editingReviewId
              ? {
                  ...review,
                  rating: reviewEditForm.rating,
                  review_text: reviewEditForm.review_text.trim() || null,
                  actual_cost: actualCost,
                }
              : review,
          ),
        }));

        setMockMeals(nextMockMeals);
        applyMockPage(nextMockMeals, 1, false);
        setEditingReviewId(null);
        setReviewEditForm(defaultReviewForm);
        toast({
          title: "Đã cập nhật review",
          description: "Review đã được cập nhật (demo data).",
          variant: "success",
        });
        return;
      }

      setSavingReview(true);

      const res = await fetch(`/api/reviews/${editingReviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: reviewEditForm.rating,
          review_text: reviewEditForm.review_text,
          actual_cost: actualCost,
        }),
      });

      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Không thể cập nhật review");
      }

      await loadMeals();
      setEditingReviewId(null);
      setReviewEditForm(defaultReviewForm);
      toast({
        title: "Đã cập nhật review",
        description: data.message ?? "Review đã được cập nhật.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Không thể cập nhật review",
        description: err instanceof Error ? err.message : "Lỗi hệ thống",
        variant: "error",
      });
    } finally {
      setSavingReview(false);
    }
  }

  async function confirmDeleteMeal() {
    if (!selectedMeal) return;

    setDeleting(true);
    try {
      if (USE_MOCK_DATA) {
        const nextMockMeals = mockMeals.filter((meal) => meal.id !== selectedMeal.id);
        setMockMeals(nextMockMeals);
        setConfirmMealDeleteOpen(false);
        closeDetailModal();
        applyMockPage(nextMockMeals, 1, false);
        toast({
          title: "Đã xóa món",
          description: "Món ăn đã được xóa (demo data).",
          variant: "success",
        });
        return;
      }

      const res = await fetch(`/api/meals/${selectedMeal.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Không thể xóa món ăn");
      }

      setConfirmMealDeleteOpen(false);
      closeDetailModal();
      await loadMeals(1, false);
      toast({
        title: "Đã xóa món",
        description: data.message ?? "Món ăn đã được xóa.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Không thể xóa món",
        description: err instanceof Error ? err.message : "Lỗi hệ thống",
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  }

  async function confirmDeleteReview() {
    if (!confirmReviewDeleteId) return;

    setDeleting(true);
    try {
      if (USE_MOCK_DATA) {
        const nextMockMeals = mockMeals.map((meal) => ({
          ...meal,
          reviews: meal.reviews.filter((review) => review.id !== confirmReviewDeleteId),
        }));

        setMockMeals(nextMockMeals);
        applyMockPage(nextMockMeals, 1, false);
        if (editingReviewId === confirmReviewDeleteId) {
          setEditingReviewId(null);
          setReviewEditForm(defaultReviewForm);
        }
        setConfirmReviewDeleteId(null);
        toast({
          title: "Đã xóa review",
          description: "Review đã được xóa (demo data).",
          variant: "success",
        });
        return;
      }

      const res = await fetch(`/api/reviews/${confirmReviewDeleteId}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Không thể xóa review");
      }

      await loadMeals(1, false);
      if (editingReviewId === confirmReviewDeleteId) {
        setEditingReviewId(null);
        setReviewEditForm(defaultReviewForm);
      }
      setConfirmReviewDeleteId(null);
      toast({
        title: "Đã xóa review",
        description: data.message ?? "Review đã được xóa.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Không thể xóa review",
        description: err instanceof Error ? err.message : "Lỗi hệ thống",
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <section className="space-y-3 pb-24">
        <div className="space-y-2.5 pt-1">
          <div className="space-y-1">
            <h2 className="text-[1.7rem] font-black leading-tight text-slate-900">Khám phá món ăn</h2>
            <p className="text-sm text-slate-500">Khám phá món ăn và chọn nhanh theo khẩu vị của bạn.</p>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search for meals..."
                className="h-12 rounded-2xl border-slate-200 bg-white pl-11"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowControlBar((prev) => !prev)}
              className={
                showControlBar
                  ? "grid h-12 w-12 place-items-center rounded-2xl bg-slate-900 text-white"
                  : "grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700"
              }
              aria-label="Hiện hoặc ẩn bộ lọc"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          {showControlBar ? (
            <>
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

              <div className="grid grid-cols-2 gap-1.5">
                <Select
                  value={sortBy}
                  onValueChange={(value) => setSortBy(value as SortOption)}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white px-3 text-xs font-semibold">
                    <span className="inline-flex items-center gap-1">
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      Sort By
                    </span>
                  </SelectTrigger>
                  <SelectContent>
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
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white px-3 text-xs font-semibold">
                    Category
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả category</SelectItem>
                    {MEAL_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : null}

          {USE_MOCK_DATA ? <Badge variant="neutral">Demo data mode</Badge> : null}
        </div>

        <div className="space-y-2.5">
          {loading ? (
            <div className="grid grid-cols-2 gap-2.5">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={`skeleton-${index}`} className="overflow-hidden rounded-3xl border-slate-100">
                  <Skeleton className="h-32 w-full" />
                  <CardContent className="space-y-2 p-3">
                    <Skeleton className="h-5 w-4/5" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-8 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          {!loading && meals.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-slate-500">
                <div className="mx-auto mb-3 w-fit rounded-3xl bg-lime-50 p-3">
                  <Image
                    src="/an-gi-logo.svg"
                    alt="An Gi logo"
                    width={80}
                    height={80}
                    className="h-20 w-20"
                  />
                </div>
                <p className="font-semibold text-slate-700">Danh sách món ăn đang trống</p>
                <p className="mt-1">Hãy thêm món đầu tiên để bắt đầu theo dõi dinh dưỡng.</p>
              </CardContent>
            </Card>
          ) : null}

          {!loading && meals.length > 0
            ? (
              <div className="grid grid-cols-2 gap-2.5">
                {visibleMeals.map((meal, index) => {
                return (
                  <MealListCard
                    key={meal.id}
                    meal={meal}
                    onClick={() => router.push(`/meals/${meal.id}`)}
                    animationDelayMs={Math.min(index * 60, 360)}
                    ariaLabel={`Mở chi tiết ${meal.name}`}
                  />
                );
              })}
              </div>
            )
            : null}

          {!loading && meals.length > 0 && visibleMeals.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-sm text-slate-500">
                Không tìm thấy món phù hợp với bộ lọc hiện tại.
              </CardContent>
            </Card>
          ) : null}

          {!loading && hasMore ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Đang tải thêm..." : "Xem thêm món"}
            </Button>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {selectedMeal ? (
          <div className="fixed inset-0 z-50 bg-black/40 p-3">
            <div className="mx-auto flex h-full w-full max-w-md items-end">
              <Card className="max-h-[92vh] w-full overflow-auto rounded-t-[2rem] rounded-b-3xl bg-white p-0">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900">{selectedMeal.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {normalizeMealCategory(selectedMeal.category)} • {selectedMeal.type === "cook" ? "Nấu ăn" : "Ăn ngoài"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeDetailModal}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"
                    >
                      <X className="h-5 w-5 text-slate-700" />
                    </button>
                  </div>

                  {editingMeal ? (
                    <div className="space-y-2">
                      <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-700">Ảnh món ăn</p>
                          {mealForm.image_url ? (
                            <button
                              type="button"
                              onClick={() => void handleClearMealImage()}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Xóa ảnh
                            </button>
                          ) : null}
                        </div>

                        {mealForm.image_url ? (
                          <div className="relative h-36 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <Image
                              src={mealForm.image_url}
                              alt="Meal preview"
                              fill
                              className="object-cover"
                              unoptimized={mealForm.image_url.startsWith("data:image/")}
                            />
                          </div>
                        ) : (
                          <label
                            htmlFor="meal-edit-image-upload"
                            className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-slate-600"
                          >
                            <ImagePlus className="mb-1 h-5 w-5" />
                            <p className="text-sm font-semibold">Chọn ảnh món ăn</p>
                            <p className="text-xs">PNG/JPG, tối đa 2MB</p>
                          </label>
                        )}

                        <input
                          id="meal-edit-image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleMealImagePick}
                          className="hidden"
                        />

                        {uploadingMealImage ? (
                          <p className="flex items-center text-xs font-medium text-slate-600">
                            <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            Đang tải ảnh...
                          </p>
                        ) : null}
                      </div>

                      <Input
                        value={mealForm.name}
                        onChange={(e) => setMealForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Tên món"
                      />
                      <Select
                        value={mealForm.type}
                        onValueChange={(value) =>
                          setMealForm((prev) => ({
                            ...prev,
                            type: value as "cook" | "eat_out",
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn loại món" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cook">Nấu ăn</SelectItem>
                          <SelectItem value="eat_out">Ăn ngoài</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={mealForm.category}
                        onValueChange={(value) =>
                          setMealForm((prev) => ({ ...prev, category: normalizeMealCategory(value) }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn category" />
                        </SelectTrigger>
                        <SelectContent>
                          {MEAL_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={mealForm.estimated_cost}
                          onChange={(e) =>
                            setMealForm((prev) => ({
                              ...prev,
                              estimated_cost: formatCurrencyInput(e.target.value),
                            }))
                          }
                          placeholder="Chi phí"
                        />
                      </div>
                      <Textarea
                        value={mealForm.ingredients}
                        onChange={(e) =>
                          setMealForm((prev) => ({ ...prev, ingredients: e.target.value }))
                        }
                        placeholder={"Nguyên liệu 1\nNguyên liệu 2\nNguyên liệu 3"}
                      />
                      <Textarea
                        value={mealForm.benefits}
                        onChange={(e) =>
                          setMealForm((prev) => ({ ...prev, benefits: e.target.value }))
                        }
                        placeholder={"Lợi ích 1\nLợi ích 2\nLợi ích 3"}
                      />
                      <Textarea
                        value={mealForm.health_warning}
                        onChange={(e) =>
                          setMealForm((prev) => ({ ...prev, health_warning: e.target.value }))
                        }
                        placeholder={"Cảnh báo 1\nCảnh báo 2"}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Button type="button" variant="outline" onClick={() => void cancelMealEdit()}>
                          Hủy sửa
                        </Button>
                        <Button
                          type="button"
                          onClick={handleMealUpdate}
                          disabled={savingMeal || uploadingMealImage}
                        >
                          {savingMeal ? "Đang lưu..." : "Lưu chỉnh sửa"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-lime-50 p-3 text-center">
                        <div>
                          <p className="text-xs text-slate-500">Calories</p>
                          <p className="text-sm font-bold text-slate-900">{selectedMeal.calories}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Protein</p>
                          <p className="text-sm font-bold text-slate-900">{selectedMeal.protein}g</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Chi phí</p>
                          <p className="text-sm font-bold text-slate-900">
                            {formatMoney(selectedMeal.estimated_cost)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-700">Nguyên liệu</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedMeal.ingredients.map((item) => (
                            <Badge key={item} variant="neutral">
                              {item}
                            </Badge>
                          ))}
                          {selectedMeal.ingredients.length === 0 ? (
                            <p className="text-sm text-slate-500">Chưa có dữ liệu.</p>
                          ) : null}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-700">Lợi ích khi ăn</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedMeal.benefits.map((item) => (
                            <Badge key={item} variant="neutral">
                              {item}
                            </Badge>
                          ))}
                          {selectedMeal.benefits.length === 0 ? (
                            <p className="text-sm text-slate-500">Chưa có dữ liệu.</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                        <p className="text-sm font-semibold text-amber-700">Health warning</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-700">
                          {(selectedMeal.health_warning?.trim()
                            ? selectedMeal.health_warning
                                .split(/\r?\n|,/)
                                .map((item) => item.trim())
                                .filter(Boolean)
                            : ["Không có cảnh báo nổi bật"]
                          ).map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button type="button" variant="outline" onClick={() => setEditingMeal(true)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Sửa món
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setConfirmMealDeleteOpen(true)}
                          className="bg-rose-600 text-white hover:bg-rose-700"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Xóa món
                        </Button>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-700">Thêm review</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setReviewForm((prev) => ({ ...prev, rating: value }))}
                          className="p-1"
                          aria-label={`Chọn ${value} sao`}
                        >
                          <Star
                            className={
                              value <= reviewForm.rating
                                ? "h-6 w-6 fill-yellow-400 text-yellow-400"
                                : "h-6 w-6 text-slate-300"
                            }
                          />
                        </button>
                      ))}
                    </div>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Chi phí thực tế (VND)"
                      value={reviewForm.actual_cost}
                      onChange={(e) =>
                        setReviewForm((prev) => ({ ...prev, actual_cost: e.target.value }))
                      }
                    />
                    <Textarea
                      placeholder="Món này ngon không? Ghi chú của bạn..."
                      value={reviewForm.review_text}
                      onChange={(e) =>
                        setReviewForm((prev) => ({ ...prev, review_text: e.target.value }))
                      }
                    />
                    <Button
                      type="button"
                      onClick={handleReviewSubmit}
                      disabled={savingReview}
                      className="w-full"
                      size="lg"
                    >
                      {savingReview ? "Đang lưu review..." : "Lưu đánh giá"}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-700">Review gần đây</p>
                    <div className="space-y-2">
                      {selectedMeal.reviews.length === 0 ? (
                        <p className="text-sm text-slate-500">Chưa có review nào.</p>
                      ) : (
                        selectedMeal.reviews.slice(0, 8).map((review) => (
                          <div key={review.id} className="rounded-2xl border border-slate-200 p-3">
                            {editingReviewId === review.id ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((value) => (
                                    <button
                                      key={value}
                                      type="button"
                                      onClick={() =>
                                        setReviewEditForm((prev) => ({
                                          ...prev,
                                          rating: value,
                                        }))
                                      }
                                      className="p-1"
                                    >
                                      <Star
                                        className={
                                          value <= reviewEditForm.rating
                                            ? "h-5 w-5 fill-yellow-400 text-yellow-400"
                                            : "h-5 w-5 text-slate-300"
                                        }
                                      />
                                    </button>
                                  ))}
                                </div>
                                <Input
                                  type="number"
                                  min={0}
                                  value={reviewEditForm.actual_cost}
                                  onChange={(e) =>
                                    setReviewEditForm((prev) => ({
                                      ...prev,
                                      actual_cost: e.target.value,
                                    }))
                                  }
                                  placeholder="Chi phí thực tế"
                                />
                                <Textarea
                                  value={reviewEditForm.review_text}
                                  onChange={(e) =>
                                    setReviewEditForm((prev) => ({
                                      ...prev,
                                      review_text: e.target.value,
                                    }))
                                  }
                                  placeholder="Cập nhật nhận xét"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingReviewId(null)}
                                  >
                                    Hủy
                                  </Button>
                                  <Button
                                    type="button"
                                    onClick={handleReviewUpdate}
                                    disabled={savingReview}
                                  >
                                    {savingReview ? "Đang lưu..." : "Lưu"}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm font-semibold text-slate-800">
                                  {"★".repeat(review.rating)}{" "}
                                  <span className="text-slate-400">({review.rating}/5)</span>
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  {review.review_text?.trim() || "Không có ghi chú"}
                                </p>
                                {review.actual_cost ? (
                                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                                    <Wallet className="h-3.5 w-3.5" />
                                    {formatMoney(review.actual_cost)}
                                  </p>
                                ) : null}
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => startEditReview(review)}
                                  >
                                    <Pencil className="mr-1 h-3.5 w-3.5" />
                                    Sửa
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setConfirmReviewDeleteId(review.id)}
                                    className="bg-rose-600 text-white hover:bg-rose-700"
                                  >
                                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                                    Xóa
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </section>

      <ConfirmDialog
        open={confirmMealDeleteOpen}
        title="Xóa món ăn"
        description="Bạn chắc chắn muốn xóa món này? Tất cả review liên quan cũng sẽ bị xóa."
        confirmText="Xóa"
        cancelText="Giữ lại"
        destructive
        loading={deleting}
        onConfirm={confirmDeleteMeal}
        onCancel={() => setConfirmMealDeleteOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(confirmReviewDeleteId)}
        title="Xóa review"
        description="Bạn chắc chắn muốn xóa review này?"
        confirmText="Xóa"
        cancelText="Giữ lại"
        destructive
        loading={deleting}
        onConfirm={confirmDeleteReview}
        onCancel={() => setConfirmReviewDeleteId(null)}
      />
    </>
  );
}
