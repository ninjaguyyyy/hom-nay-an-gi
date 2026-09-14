"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Sparkles, CheckCircle2, ImagePlus, Trash2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
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

type MealType = "cook" | "eat_out";

type MealFormData = {
  name: string;
  type: MealType;
  category: MealCategory;
  estimated_cost: string;
  ingredients: string;
  benefits: string;
  health_warning: string;
  image_url: string;
};

const defaultForm: MealFormData = {
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
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false";

function parseListInput(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatCurrencyInput(value: string | number) {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("en-US").format(Number(digits));
}

function parseCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    throw new Error("Chi phí dự kiến không được để trống");
  }

  const parsed = Number(digits);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error("Chi phí dự kiến phải là số không âm");
  }

  return parsed;
}

export function AddMealForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [mealName, setMealName] = useState("");
  const [form, setForm] = useState<MealFormData>(defaultForm);
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [status, setStatus] = useState<{ type: "ok" | "error"; message: string } | null>(
    null,
  );

  const benefitList = useMemo(
    () => parseListInput(form.benefits),
    [form.benefits],
  );

  const ingredientList = useMemo(
    () => parseListInput(form.ingredients),
    [form.ingredients],
  );

  async function fileToDataUrl(file: File) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Không thể đọc file ảnh"));
      reader.readAsDataURL(file);
    });
  }

  async function handleImagePick(event: ChangeEvent<HTMLInputElement>) {
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

    setIsUploadingImage(true);

    try {
      let imageUrl = "";

      if (USE_MOCK_DATA) {
        imageUrl = await fileToDataUrl(file);
      } else {
        const uploadForm = new FormData();
        uploadForm.append("file", file);

        const uploadRes = await fetch("/api/uploads/meal-image", {
          method: "POST",
          body: uploadForm,
        });

        const uploadData = (await uploadRes.json()) as { url?: string; error?: string };
        if (!uploadRes.ok || !uploadData.url) {
          throw new Error(uploadData.error ?? "Không thể upload ảnh");
        }

        imageUrl = uploadData.url;
      }

      setForm((prev) => ({ ...prev, image_url: imageUrl }));
      toast({
        title: "Tải ảnh thành công",
        description: "Ảnh đã được thêm vào món ăn.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Không thể tải ảnh",
        description: error instanceof Error ? error.message : "Đã có lỗi xảy ra",
        variant: "error",
      });
    } finally {
      setIsUploadingImage(false);
      event.target.value = "";
    }
  }

  function handleClearImage() {
    setForm((prev) => ({ ...prev, image_url: "" }));
  }

  async function handlePrefill() {
    if (!mealName.trim()) {
      setStatus({ type: "error", message: "Vui lòng nhập tên món ăn trước." });
      toast({
        title: "Thiếu dữ liệu",
        description: "Vui lòng nhập tên món ăn trước khi dùng AI.",
        variant: "error",
      });
      return;
    }

    setStatus(null);
    setIsPrefilling(true);

    try {
      const res = await fetch("/api/ai/prefill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: mealName.trim() }),
      });

      const contentType = res.headers.get("content-type") ?? "";
      const data = (contentType.includes("application/json")
        ? await res.json()
        : { error: await res.text() }) as {
        error?: string;
        type: MealType;
        category?: string;
        estimated_cost: number;
        calories: number;
        protein: number;
        benefits: string[];
        ingredients: string[];
        health_warning: string[];
      };

      if (!res.ok) {
        throw new Error(
          contentType.includes("application/json")
            ? data.error ?? "Không thể lấy dữ liệu AI"
            : "Máy chủ đang lỗi tạm thời, vui lòng thử lại sau vài giây.",
        );
      }

      setForm((prev) => ({
        ...prev,
        name: mealName.trim(),
        type: data.type,
        category: normalizeMealCategory(data.category),
        estimated_cost: formatCurrencyInput(data.estimated_cost),
        ingredients: data.ingredients.join("\n"),
        benefits: data.benefits.join("\n"),
        health_warning: data.health_warning.join("\n"),
      }));

      setStatus({
        type: "ok",
        message: "AI đã tự động điền. Bạn có thể chỉnh sửa trước khi lưu.",
      });
      toast({
        title: "AI điền thành công",
        description: "Hãy kiểm tra lại thông tin trước khi lưu.",
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể tự động điền bằng AI lúc này.";
      setStatus({
        type: "error",
        message,
      });
      toast({ title: "Lỗi AI", description: message, variant: "error" });
    } finally {
      setIsPrefilling(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setStatus({ type: "error", message: "Tên món ăn không được để trống." });
      toast({
        title: "Thiếu dữ liệu",
        description: "Tên món ăn không được để trống.",
        variant: "error",
      });
      return;
    }

    setStatus(null);
    setIsSaving(true);

    try {
      const estimatedCost = parseCurrencyInput(form.estimated_cost);

      const res = await fetch("/api/meals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          estimated_cost: estimatedCost,
          calories: 0,
          protein: 0,
          ingredients: ingredientList,
          benefits: benefitList,
          health_warning: parseListInput(form.health_warning).join(", "),
          image_url: form.image_url || null,
        }),
      });

      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Không thể lưu món ăn");
      }

      setStatus({ type: "ok", message: data.message ?? "Đã lưu thành công" });
      toast({
        title: "Lưu thành công",
        description: "Món ăn đã được thêm vào danh sách của bạn.",
        variant: "success",
      });
      setMealName("");
      setForm(defaultForm);
      router.push("/");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lỗi khi lưu món ăn";
      setStatus({
        type: "error",
        message,
      });
      toast({ title: "Không thể lưu món", description: message, variant: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="animate-pop-in">
      <CardHeader>
        <CardTitle>Tên món ăn bạn muốn thêm là gì?</CardTitle>
        <CardDescription>
          Ví dụ: Phở bò, bún chả, cơm tấm sườn trứng.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Tên món ăn</label>
          <Input
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
            placeholder="Nhập tên món ăn..."
            className="h-14"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700">Ảnh món ăn</label>
            {form.image_url ? (
              <button
                type="button"
                onClick={handleClearImage}
                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Xóa ảnh
              </button>
            ) : null}
          </div>

          {form.image_url ? (
            <div className="relative h-44 overflow-hidden rounded-2xl border border-slate-200">
              <Image
                src={form.image_url}
                alt="Meal preview"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <label
              htmlFor="meal-image-upload"
              className="flex h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-600"
            >
              <ImagePlus className="mb-2 h-6 w-6" />
              <p className="text-sm font-semibold">Chọn ảnh món ăn</p>
              <p className="text-xs">PNG/JPG, tối đa 2MB</p>
            </label>
          )}

          <input
            id="meal-image-upload"
            type="file"
            accept="image/*"
            onChange={handleImagePick}
            className="hidden"
          />
        </div>

        <Button
          type="button"
          onClick={handlePrefill}
          disabled={isPrefilling}
          size="lg"
          className="w-full"
        >
          {isPrefilling ? (
            <>
              <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
              Đang phân tích bằng AI...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Tự động điền bằng AI
            </>
          )}
        </Button>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Loại món</label>
            <Select
              value={form.type}
              onValueChange={(value) => setForm((prev) => ({ ...prev, type: value as MealType }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn loại món" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cook">Nấu ăn</SelectItem>
                <SelectItem value="eat_out">Ăn ngoài</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Category món</label>
            <Select
              value={form.category}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, category: normalizeMealCategory(value) }))
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
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Chi phí dự kiến (VND)</label>
            <Input
              type="text"
              inputMode="numeric"
              value={form.estimated_cost}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  estimated_cost: formatCurrencyInput(e.target.value),
                }))
              }
              placeholder="100,000"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Nguyên liệu (mỗi ý 1 dòng)</label>
          <Textarea
            value={form.ingredients}
            onChange={(e) => setForm((prev) => ({ ...prev, ingredients: e.target.value }))}
            placeholder={"Bánh phở\nThịt bò\nHành lá\nNước dùng"}
          />
          {ingredientList.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {ingredientList.map((item) => (
                <Badge key={item} variant="neutral">
                  {item}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Lợi ích khi ăn (mỗi ý 1 dòng)</label>
          <Textarea
            value={form.benefits}
            onChange={(e) => setForm((prev) => ({ ...prev, benefits: e.target.value }))}
            placeholder={"No lâu\nGiàu chất xơ\nHỗ trợ tiêu hóa"}
          />
          {benefitList.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {benefitList.map((item) => (
                <Badge key={item} variant="neutral">
                  {item}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Cảnh báo sức khỏe</label>
          <Textarea
            value={form.health_warning}
            onChange={(e) => setForm((prev) => ({ ...prev, health_warning: e.target.value }))}
            placeholder={"Nhiều natri\nNên ăn vừa phải nếu huyết áp cao"}
          />
        </div>

        {status ? (
          <div
            className={
              status.type === "ok"
                ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                : "rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            }
          >
            <div className="flex items-start gap-2">
              {status.type === "ok" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4" />
              ) : (
                <span className="mt-0.5 h-2 w-2 rounded-full bg-rose-500" />
              )}
              <p>{status.message}</p>
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isUploadingImage}
          size="lg"
          variant="secondary"
          className="w-full"
        >
          {isUploadingImage ? (
            <>
              <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
              Đang tải ảnh...
            </>
          ) : isSaving ? (
            <>
              <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
              Đang lưu vào database...
            </>
          ) : (
            "Save to Database"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
