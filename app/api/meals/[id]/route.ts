import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { deleteMealImageObject } from "@/lib/meal-image-storage";
import { normalizeMealCategory } from "@/lib/meal-categories";

type MealUpdatePayload = {
  name?: string;
  type?: "cook" | "eat_out";
  category?: string;
  estimated_cost?: number;
  calories?: number;
  protein?: number;
  benefits?: string[];
  ingredients?: string[];
  health_warning?: string;
  image_url?: string | null;
};

function normalizeStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function parseNonNegativeNumber(value: unknown, label: string) {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error(`${label} phải là số không âm`);
  }
  return parsed;
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

async function getOwnedMealId(userId: string, id: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("meals")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data.id as string;
}

async function getOwnedMealBasic(userId: string, id: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("meals")
    .select("id, image_url")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data as { id: string; image_url: string | null };
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("meals")
      .select(
        "id, user_id, name, type, category, estimated_cost, calories, protein, benefits, ingredients, health_warning, image_url, created_at, reviews(id, rating, review_text, actual_cost, created_at)",
      )
      .eq("id", params.id)
      .eq("user_id", session.user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Không tìm thấy món ăn" }, { status: 404 });
    }

    const normalizedMeal = {
      ...data,
      category: normalizeMealCategory((data as { category?: unknown }).category),
      benefits: normalizeStringList((data as { benefits?: unknown }).benefits).length
        ? normalizeStringList((data as { benefits?: unknown }).benefits)
        : normalizeStringList((data as { ingredients?: unknown }).ingredients),
      ingredients: normalizeStringList((data as { ingredients?: unknown }).ingredients).length
        ? normalizeStringList((data as { ingredients?: unknown }).ingredients)
        : normalizeStringList((data as { benefits?: unknown }).benefits),
    };

    return NextResponse.json({ meal: normalizedMeal });
  } catch (error) {
    console.error("Get meal detail exception:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const owned = await getOwnedMealBasic(session.user.id, params.id);
    if (!owned) {
      return NextResponse.json(
        { error: "Không tìm thấy món ăn" },
        { status: 404 },
      );
    }

    const body = (await req.json()) as MealUpdatePayload;
    const updates: MealUpdatePayload = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json(
          { error: "Tên món không được để trống" },
          { status: 400 },
        );
      }
      updates.name = name;
    }
    if (body.type === "cook" || body.type === "eat_out") updates.type = body.type;
    if (body.category !== undefined) {
      updates.category = normalizeMealCategory(body.category);
    }
    try {
      if (body.estimated_cost !== undefined) {
        updates.estimated_cost = parseNonNegativeNumber(body.estimated_cost, "Chi phí dự kiến");
      }
      if (body.calories !== undefined) {
        updates.calories = parseNonNegativeNumber(body.calories, "Calories");
      }
      if (body.protein !== undefined) {
        updates.protein = parseNonNegativeNumber(body.protein, "Protein");
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Dữ liệu không hợp lệ" },
        { status: 400 },
      );
    }
    const normalizedBenefits = normalizeStringList(body.benefits);
    const normalizedIngredients = normalizeStringList(body.ingredients);
    if (body.benefits !== undefined || body.ingredients !== undefined) {
      updates.benefits = normalizedBenefits.length > 0
        ? normalizedBenefits
        : body.benefits !== undefined
          ? []
          : normalizedIngredients;
      updates.ingredients = normalizedIngredients.length > 0
        ? normalizedIngredients
        : body.ingredients !== undefined
          ? []
          : normalizedBenefits;
    }
    if (body.health_warning !== undefined) {
      updates.health_warning = String(body.health_warning).trim();
    }
    if (body.image_url !== undefined) {
      try {
        updates.image_url = parseOptionalImageUrl(body.image_url);
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Ảnh món ăn không hợp lệ" },
          { status: 400 },
        );
      }
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from("meals")
      .update(updates)
      .eq("id", params.id)
      .eq("user_id", session.user.id);

    if (error) {
      return NextResponse.json({ error: "Không thể cập nhật món ăn" }, { status: 500 });
    }

    if (body.image_url !== undefined) {
      const nextImage = updates.image_url ?? null;
      const previousImage = owned.image_url ?? null;
      if (previousImage && previousImage !== nextImage) {
        await deleteMealImageObject(previousImage, session.user.id);
      }
    }

    return NextResponse.json({ message: "Đã cập nhật món ăn" });
  } catch (error) {
    console.error("Update meal exception:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const owned = await getOwnedMealBasic(session.user.id, params.id);
    if (!owned) {
      return NextResponse.json(
        { error: "Không tìm thấy món ăn" },
        { status: 404 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from("meals")
      .delete()
      .eq("id", params.id)
      .eq("user_id", session.user.id);

    if (error) {
      return NextResponse.json({ error: "Không thể xóa món ăn" }, { status: 500 });
    }

    if (owned.image_url) {
      await deleteMealImageObject(owned.image_url, session.user.id);
    }

    return NextResponse.json({ message: "Đã xóa món ăn" });
  } catch (error) {
    console.error("Delete meal exception:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
