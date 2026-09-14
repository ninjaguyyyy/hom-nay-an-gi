import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { deleteMealImageObject } from "@/lib/meal-image-storage";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const DEFAULT_BUCKET = "meal-images";

function extensionFromMime(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "bin";
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Thiếu file ảnh" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File không phải ảnh" }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Ảnh vượt quá 2MB" }, { status: 400 });
    }

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;
    const supabaseAdmin = getSupabaseAdmin();

    const ext = extensionFromMime(file.type);
    const filePath = `${session.user.id}/${Date.now()}-${randomUUID()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
        cacheControl: "3600",
      });

    if (uploadError) {
      const isBucketMissing = uploadError.message.toLowerCase().includes("bucket");
      return NextResponse.json(
        {
          error: isBucketMissing
            ? "Bucket ảnh chưa được tạo. Tạo bucket 'meal-images' trước khi upload."
            : "Không thể upload ảnh",
        },
        { status: 500 },
      );
    }

    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);
    return NextResponse.json({ url: data.publicUrl, path: filePath });
  } catch (error) {
    console.error("Upload meal image exception:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = (await req.json()) as { url?: string };
    if (!body.url || !String(body.url).trim()) {
      return NextResponse.json({ error: "Thiếu URL ảnh" }, { status: 400 });
    }

    await deleteMealImageObject(String(body.url), session.user.id);
    return NextResponse.json({ message: "Đã dọn ảnh tạm" });
  } catch (error) {
    console.error("Delete meal image exception:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
