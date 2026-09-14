export const MEAL_CATEGORIES = [
  "Cơm",
  "Bún/Phở/Mì",
  "Canh",
  "Chay",
  "Nướng",
  "Chiên/Xào",
  "Hấp/Luộc",
  "Lẩu",
  "Gỏi/Salad",
  "Ăn vặt",
  "Tráng miệng",
  "Món rau",
  "Khác",
] as const;

export type MealCategory = (typeof MEAL_CATEGORIES)[number];

export const DEFAULT_MEAL_CATEGORY: MealCategory = "Khác";

const CATEGORY_ALIASES: Record<string, MealCategory> = {
  com: "Cơm",
  "bun/pho/mi": "Bún/Phở/Mì",
  bun: "Bún/Phở/Mì",
  pho: "Bún/Phở/Mì",
  mi: "Bún/Phở/Mì",
  canh: "Canh",
  chay: "Chay",
  nuong: "Nướng",
  "chien/xao": "Chiên/Xào",
  chien: "Chiên/Xào",
  xao: "Chiên/Xào",
  "hap/luoc": "Hấp/Luộc",
  hap: "Hấp/Luộc",
  luoc: "Hấp/Luộc",
  lau: "Lẩu",
  "goi/salad": "Gỏi/Salad",
  goi: "Gỏi/Salad",
  salad: "Gỏi/Salad",
  "an vat": "Ăn vặt",
  trang: "Tráng miệng",
  "trang mieng": "Tráng miệng",
  "mon rau": "Món rau",
  rau: "Món rau",
  khac: "Khác",
};

export function normalizeMealCategory(input: unknown): MealCategory {
  const raw = String(input ?? "").trim();
  if (!raw) return DEFAULT_MEAL_CATEGORY;

  const exactMatch = MEAL_CATEGORIES.find((item) => item === raw);
  if (exactMatch) return exactMatch;

  const compact = raw.toLowerCase();
  const aliasMatch = CATEGORY_ALIASES[compact];
  if (aliasMatch) return aliasMatch;

  const byContains = MEAL_CATEGORIES.find((item) => compact.includes(item.toLowerCase()));
  if (byContains) return byContains;

  return DEFAULT_MEAL_CATEGORY;
}
