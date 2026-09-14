import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type ReviewPayload = {
  meal_id: string;
  rating: number;
  review_text?: string;
  actual_cost?: number;
};

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = (await req.json()) as Partial<ReviewPayload>;

    if (!body.meal_id || !body.rating) {
      return NextResponse.json(
        { error: "Thiếu thông tin đánh giá" },
        { status: 400 },
      );
    }

    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating phải từ 1 đến 5" },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: ownedMeal, error: mealError } = await supabaseAdmin
      .from("meals")
      .select("id")
      .eq("id", body.meal_id)
      .eq("user_id", session.user.id)
      .single();

    if (mealError || !ownedMeal) {
      return NextResponse.json(
        { error: "Món ăn không tồn tại hoặc không thuộc tài khoản của bạn" },
        { status: 404 },
      );
    }

    const actualCost = body.actual_cost === undefined ? null : Number(body.actual_cost);
    if (actualCost !== null && (Number.isNaN(actualCost) || actualCost < 0)) {
      return NextResponse.json(
        { error: "Chi phí thực tế không hợp lệ" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("reviews")
      .insert({
        meal_id: body.meal_id,
        rating,
        review_text: String(body.review_text ?? "").trim() || null,
        actual_cost: actualCost,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Create review error:", error);
      return NextResponse.json(
        { error: "Không thể lưu review" },
        { status: 500 },
      );
    }

    return NextResponse.json({ id: data.id, message: "Đã lưu đánh giá" });
  } catch (error) {
    console.error("Create review exception:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
