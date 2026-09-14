import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { normalizeMealCategory } from "@/lib/meal-categories";

type MealPayload = {
  name: string;
  type: "cook" | "eat_out";
  category: string;
  estimated_cost: number;
  calories: number;
  protein: number;
  benefits: string[];
  ingredients: string[];
  health_warning: string;
  image_url: string | null;
};

function normalizeStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function parseOptionalImageUrl(value: unknown) {
  if (value === null || value === undefined) return null;

  const imageUrl = String(value).trim();
  if (!imageUrl) return null;

  const isDataImage = imageUrl.startsWith("data:image/");
  const isHttpImage = /^https?:\/\//i.test(imageUrl);

  if (!isDataImage && !isHttpImage) {
    throw new Error("Ảnh món ăn không hợp lệ");
  }

  if (imageUrl.length > 3_000_000) {
    throw new Error("Dữ liệu ảnh quá lớn");
  }

  return imageUrl;
}

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const budget = url.searchParams.get("budget");
    const pageRaw = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
    const page = Number.isNaN(pageRaw) ? 1 : Math.max(1, pageRaw);
    const pageSizeRaw = Number.parseInt(url.searchParams.get("pageSize") ?? "8", 10);
    const pageSize = Number.isNaN(pageSizeRaw)
      ? 8
      : Math.min(20, Math.max(1, pageSizeRaw));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabaseAdmin = getSupabaseAdmin();

    let query = supabaseAdmin
      .from("meals")
      .select(
        "id, user_id, name, type, category, estimated_cost, calories, protein, benefits, ingredients, health_warning, image_url, created_at, reviews(id, rating, review_text, actual_cost, created_at)",
        { count: "exact" },
      )
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (type === "cook" || type === "eat_out") {
      query = query.eq("type", type);
    }

    if (budget === "cheap") {
      query = query.lt("estimated_cost", 50000);
    } else if (budget === "medium") {
      query = query.gte("estimated_cost", 50000).lte("estimated_cost", 120000);
    } else if (budget === "expensive") {
      query = query.gt("estimated_cost", 120000);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error("Get meals error:", error);
      return NextResponse.json(
        { error: "Không thể tải danh sách món ăn" },
        { status: 500 },
      );
    }

    const total = count ?? 0;
    const hasMore = to + 1 < total;

    const mappedMeals = (data ?? []).map((meal) => ({
      ...meal,
      category: normalizeMealCategory((meal as { category?: unknown }).category),
      benefits: normalizeStringList((meal as { benefits?: unknown }).benefits).length
        ? normalizeStringList((meal as { benefits?: unknown }).benefits)
        : normalizeStringList((meal as { ingredients?: unknown }).ingredients),
      ingredients: normalizeStringList((meal as { ingredients?: unknown }).ingredients).length
        ? normalizeStringList((meal as { ingredients?: unknown }).ingredients)
        : normalizeStringList((meal as { benefits?: unknown }).benefits),
    }));

    return NextResponse.json({
      meals: mappedMeals,
      page,
      page_size: pageSize,
      total,
      has_more: hasMore,
    });
  } catch (error) {
    console.error("Get meals exception:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = (await req.json()) as Partial<MealPayload>;

    if (!body.name || !body.type) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc" },
        { status: 400 },
      );
    }

    let imageUrl: string | null;
    try {
      imageUrl = parseOptionalImageUrl(body.image_url);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Ảnh món ăn không hợp lệ" },
        { status: 400 },
      );
    }

    const payload: MealPayload = {
      name: body.name.trim(),
      type: body.type,
      category: normalizeMealCategory((body as { category?: unknown }).category),
      estimated_cost: Number(body.estimated_cost ?? 0),
      calories: Number(body.calories ?? 0),
      protein: Number(body.protein ?? 0),
      benefits: normalizeStringList(body.benefits ?? (body as { ingredients?: unknown[] }).ingredients),
      ingredients: normalizeStringList((body as { ingredients?: unknown[] }).ingredients ?? body.benefits),
      health_warning: String(body.health_warning ?? "").trim(),
      image_url: imageUrl,
    };

    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("meals")
      .insert({
        user_id: session.user.id,
        benefits: payload.benefits,
        ingredients: payload.ingredients,
        category: payload.category,
        name: payload.name,
        type: payload.type,
        estimated_cost: payload.estimated_cost,
        calories: payload.calories,
        protein: payload.protein,
        health_warning: payload.health_warning,
        image_url: payload.image_url,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Create meal error:", error);
      return NextResponse.json(
        { error: "Không thể lưu món ăn" },
        { status: 500 },
      );
    }

    return NextResponse.json({ id: data.id, message: "Đã lưu món ăn" });
  } catch (error) {
    console.error("Create meal exception:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
