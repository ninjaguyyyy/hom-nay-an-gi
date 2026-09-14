import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type ReviewUpdatePayload = {
  rating?: number;
  review_text?: string;
  actual_cost?: number | null;
};

async function getOwnedReview(userId: string, reviewId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("reviews")
    .select("id, meal_id, meals!inner(user_id)")
    .eq("id", reviewId)
    .eq("meals.user_id", userId)
    .single();

  if (error || !data) return null;
  return data;
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

    const owned = await getOwnedReview(session.user.id, params.id);
    if (!owned) {
      return NextResponse.json({ error: "Không tìm thấy review" }, { status: 404 });
    }

    const body = (await req.json()) as ReviewUpdatePayload;
    const updates: ReviewUpdatePayload = {};

    if (body.rating !== undefined) {
      const rating = Number(body.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return NextResponse.json({ error: "Rating phải từ 1 đến 5" }, { status: 400 });
      }
      updates.rating = rating;
    }

    if (body.review_text !== undefined) {
      updates.review_text = String(body.review_text).trim();
    }

    if (body.actual_cost !== undefined) {
      if (body.actual_cost === null) {
        updates.actual_cost = null;
      } else {
        const value = Number(body.actual_cost);
        if (Number.isNaN(value) || value < 0) {
          return NextResponse.json(
            { error: "Chi phí thực tế không hợp lệ" },
            { status: 400 },
          );
        }
        updates.actual_cost = value;
      }
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from("reviews")
      .update(updates)
      .eq("id", params.id);

    if (error) {
      return NextResponse.json({ error: "Không thể cập nhật review" }, { status: 500 });
    }

    return NextResponse.json({ message: "Đã cập nhật review" });
  } catch (error) {
    console.error("Update review exception:", error);
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

    const owned = await getOwnedReview(session.user.id, params.id);
    if (!owned) {
      return NextResponse.json({ error: "Không tìm thấy review" }, { status: 404 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from("reviews")
      .delete()
      .eq("id", params.id);

    if (error) {
      return NextResponse.json({ error: "Không thể xóa review" }, { status: 500 });
    }

    return NextResponse.json({ message: "Đã xóa review" });
  } catch (error) {
    console.error("Delete review exception:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
