import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { normalizePhone, validatePassword } from "@/lib/phone-auth";

type RegisterPayload = {
  phone?: string;
  password?: string;
  name?: string;
};

function isMissingTableError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const code = String(error.code ?? "");
  const message = String(error.message ?? "").toLowerCase();

  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("phone_credentials") ||
    message.includes("relation")
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RegisterPayload;

    const phone = normalizePhone(body.phone);
    if (!phone) {
      return NextResponse.json(
        { error: "Số điện thoại không hợp lệ" },
        { status: 400 },
      );
    }

    if (!validatePassword(body.password)) {
      return NextResponse.json(
        { error: "Mật khẩu tối thiểu 6 ký tự" },
        { status: 400 },
      );
    }

    const displayName = String(body.name ?? "").trim();
    const supabaseAdmin = getSupabaseAdmin();

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("phone_credentials")
      .select("user_id")
      .eq("phone", phone)
      .maybeSingle();

    if (existingError) {
      if (isMissingTableError(existingError)) {
        return NextResponse.json(
          { error: "Thiếu bảng phone_credentials. Hãy chạy lại supabase/schema.sql" },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { error: "Không thể kiểm tra tài khoản hiện có" },
        { status: 500 },
      );
    }

    if (existing?.user_id) {
      return NextResponse.json(
        { error: "Số điện thoại đã tồn tại" },
        { status: 409 },
      );
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .insert({
        name: displayName || `User ${phone.slice(-4)}`,
      })
      .select("id")
      .single();

    if (userError || !user?.id) {
      if (userError?.code === "42P01") {
        return NextResponse.json(
          { error: "Thiếu bảng users. Hãy chạy lại supabase/schema.sql" },
          { status: 500 },
        );
      }

      if (userError?.code === "42501") {
        return NextResponse.json(
          { error: "Thiếu quyền ghi users. Kiểm tra lại SUPABASE_SERVICE_ROLE_KEY" },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { error: "Không thể tạo tài khoản" },
        { status: 500 },
      );
    }

    const passwordHash = await hash(String(body.password), 12);

    const { error: credentialError } = await supabaseAdmin
      .from("phone_credentials")
      .insert({
        user_id: user.id,
        phone,
        password_hash: passwordHash,
      });

    if (credentialError) {
      await supabaseAdmin.from("users").delete().eq("id", user.id);

      if (isMissingTableError(credentialError)) {
        return NextResponse.json(
          { error: "Thiếu bảng phone_credentials. Hãy chạy lại supabase/schema.sql" },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { error: "Không thể tạo thông tin đăng nhập" },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "Đăng ký thành công" }, { status: 201 });
  } catch (error) {
    console.error("Phone register exception:", error);
    if (error instanceof Error) {
      if (error.message.includes("placeholder values")) {
        return NextResponse.json(
          {
            error:
              "Cấu hình server Supabase chưa đúng. Cập nhật SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trong .env.local",
          },
          { status: 500 },
        );
      }
    }
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
