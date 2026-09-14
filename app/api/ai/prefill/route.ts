import { NextResponse } from "next/server";
import { DEFAULT_MEAL_CATEGORY, MEAL_CATEGORIES, normalizeMealCategory } from "@/lib/meal-categories";

type PrefillResponse = {
  type: "cook" | "eat_out";
  category: string;
  estimated_cost: number;
  calories: number;
  protein: number;
  benefits: string[];
  ingredients: string[];
  health_warning: string[];
};

function normalizeListField(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim().replace(/^[-*\u2022]\s*/, ""))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|[;,]/)
      .map((item) => item.trim().replace(/^[-*\u2022]\s*/, ""))
      .filter(Boolean);
  }

  return [];
}

function parseAiJson(raw: string): PrefillResponse {
  const jsonText = raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}";
  const parsed = JSON.parse(jsonText) as Partial<PrefillResponse> & {
    ingredients?: string[];
  };

  if (parsed.type !== "cook" && parsed.type !== "eat_out") {
    throw new Error("Invalid type");
  }

  const estimatedCost = Number(parsed.estimated_cost);
  const calories = Number(parsed.calories);
  const protein = Number(parsed.protein);
  const category = normalizeMealCategory(parsed.category);
  const benefitsSource = Array.isArray(parsed.benefits)
    ? parsed.benefits
    : parsed.ingredients;
  const benefits = normalizeListField(benefitsSource);
  const ingredients = normalizeListField(parsed.ingredients ?? parsed.benefits);
  const healthWarnings = normalizeListField(parsed.health_warning);

  if (Number.isNaN(estimatedCost) || estimatedCost < 0) {
    throw new Error("Invalid estimated_cost");
  }
  if (Number.isNaN(calories) || calories < 0) {
    throw new Error("Invalid calories");
  }
  if (Number.isNaN(protein) || protein < 0) {
    throw new Error("Invalid protein");
  }

  return {
    type: parsed.type,
    category,
    estimated_cost: Math.round(estimatedCost),
    calories: Math.round(calories),
    protein: Math.round(protein),
    benefits,
    ingredients,
    health_warning:
      healthWarnings.length > 0
        ? healthWarnings
        : ["Không có cảnh báo nổi bật"],
  };
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    const missingOrPlaceholderKey =
      !apiKey ||
      apiKey === "your_gemini_api_key" ||
      apiKey.startsWith("your_");

    if (missingOrPlaceholderKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY chưa cấu hình hoặc đang dùng placeholder trong .env.local",
        },
        { status: 500 },
      );
    }
    const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
    const maxTokens = Number.parseInt(process.env.GEMINI_MAX_TOKENS ?? "2000", 10);
    const temperature = Number.parseFloat(process.env.GEMINI_TEMPERATURE ?? "0.2");

    const body = (await req.json()) as { name?: string };
    const mealName = body.name?.trim();

    if (!mealName) {
      return NextResponse.json(
        { error: "Thiếu tên món ăn" },
        { status: 400 },
      );
    }

    const prompt = [
      "Bạn là chuyên gia dinh dưỡng và ẩm thực Việt Nam.",
      "Trả về DUY NHẤT JSON hợp lệ, không markdown, không giải thích.",
      "Phân tích món ăn sau và ước lượng thông tin.",
      `Tên món: ${mealName}`,
      "BẮT BUỘC trả về đúng cấu trúc:",
      "{",
      '  "type": "cook" | "eat_out",',
      '  "category": string,',
      '  "estimated_cost": number,',
      '  "calories": number,',
      '  "protein": number,',
      '  "benefits": string[],',
      '  "ingredients": string[],',
      '  "health_warning": string[],',
      "}",
      "Quy tắc nghiêm ngặt:",
      "1) estimated_cost là VND (số nguyên).",
      "2) category phải là một trong các giá trị sau:",
      `   ${MEAL_CATEGORIES.join(", ")}`,
      `   Nếu không chắc chắn thì dùng \"${DEFAULT_MEAL_CATEGORY}\".`,
      "3) calories và protein là số nguyên.",
      "4) benefits là mảng lợi ích khi ăn ngắn gọn bằng tiếng Việt.",
      "5) ingredients là mảng nguyên liệu chính của món ăn.",
      "6) health_warning là mảng cảnh báo ngắn, thực tế (ví dụ: [\"Nhiều natri\", \"Nhiều chất béo bão hòa\"]).",
      "7) Không thêm key khác.",
    ].join("\n");

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: Number.isFinite(temperature) ? temperature : 0.2,
            maxOutputTokens: Number.isFinite(maxTokens) ? maxTokens : 2000,
          },
        }),
      },
    );

    const geminiData = (await geminiRes.json()) as {
      error?: { message?: string };
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    if (!geminiRes.ok) {
      throw new Error(geminiData.error?.message ?? "Gemini request failed");
    }

    const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const data = parseAiJson(raw);

    return NextResponse.json(data);
  } catch (error) {
    console.error("AI prefill error:", error);

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes("api key") || message.includes("permission_denied") || message.includes("unauthenticated")) {
        return NextResponse.json(
          { error: "GEMINI_API_KEY không hợp lệ" },
          { status: 401 },
        );
      }
    }

    return NextResponse.json(
      { error: "Không thể tự động điền bằng AI lúc này" },
      { status: 500 },
    );
  }
}
