import type { MealCategory } from "@/lib/meal-categories";

export type MockReview = {
  id: string;
  rating: number;
  review_text: string | null;
  actual_cost: number | null;
  created_at: string;
};

export type MockMeal = {
  id: string;
  name: string;
  type: "cook" | "eat_out";
  category: MealCategory;
  estimated_cost: number;
  calories: number;
  protein: number;
  ingredients: string[];
  benefits: string[];
  health_warning: string | null;
  created_at: string;
  reviews: MockReview[];
};

export const MOCK_MEALS: MockMeal[] = [
  {
    id: "meal-01",
    name: "Pho bo",
    type: "eat_out",
    category: "Bún/Phở/Mì",
    estimated_cost: 55000,
    calories: 520,
    protein: 28,
    ingredients: ["Banh pho", "Thit bo", "Hanh la", "Nuoc dung"],
    benefits: ["Banh pho", "Thit bo", "Hanh la", "Nuoc dung"],
    health_warning: "Nhieu natri neu dung het nuoc",
    created_at: "2026-09-01T08:20:00.000Z",
    reviews: [
      {
        id: "rv-01",
        rating: 5,
        review_text: "Nuoc dung dam da, thit mem",
        actual_cost: 60000,
        created_at: "2026-09-01T09:00:00.000Z",
      },
    ],
  },
  {
    id: "meal-02",
    name: "Com ga nuong",
    type: "cook",
    category: "Nướng",
    estimated_cost: 48000,
    calories: 640,
    protein: 36,
    ingredients: ["Uc ga", "Com", "Dua leo", "Nuoc mam"],
    benefits: ["Uc ga", "Com", "Dua leo", "Nuoc mam"],
    health_warning: null,
    created_at: "2026-09-01T12:00:00.000Z",
    reviews: [
      {
        id: "rv-02",
        rating: 4,
        review_text: "De an, no lau",
        actual_cost: 50000,
        created_at: "2026-09-01T12:45:00.000Z",
      },
    ],
  },
  {
    id: "meal-03",
    name: "Bun cha",
    type: "eat_out",
    category: "Nướng",
    estimated_cost: 45000,
    calories: 580,
    protein: 24,
    ingredients: ["Bun", "Cha nuong", "Rau song"],
    benefits: ["Bun", "Cha nuong", "Rau song"],
    health_warning: "Nuoc cham co the kha man",
    created_at: "2026-09-01T18:10:00.000Z",
    reviews: [],
  },
  {
    id: "meal-04",
    name: "Ca hoi ap chao",
    type: "cook",
    category: "Chiên/Xào",
    estimated_cost: 120000,
    calories: 460,
    protein: 34,
    ingredients: ["Ca hoi", "Mang tay", "Khoai tay"],
    benefits: ["Ca hoi", "Mang tay", "Khoai tay"],
    health_warning: null,
    created_at: "2026-08-31T11:20:00.000Z",
    reviews: [
      {
        id: "rv-04",
        rating: 5,
        review_text: "Protein cao, an healthy",
        actual_cost: 115000,
        created_at: "2026-08-31T12:05:00.000Z",
      },
    ],
  },
  {
    id: "meal-05",
    name: "Mi xao bo",
    type: "cook",
    category: "Chiên/Xào",
    estimated_cost: 38000,
    calories: 620,
    protein: 22,
    ingredients: ["Mi", "Thit bo", "Rau cai"],
    benefits: ["Mi", "Thit bo", "Rau cai"],
    health_warning: "Nhieu dau mo neu xao ky",
    created_at: "2026-08-30T07:45:00.000Z",
    reviews: [],
  },
  {
    id: "meal-06",
    name: "Lau thai",
    type: "eat_out",
    category: "Lẩu",
    estimated_cost: 220000,
    calories: 740,
    protein: 40,
    ingredients: ["Tom", "Muc", "Nam", "Rau"],
    benefits: ["Tom", "Muc", "Nam", "Rau"],
    health_warning: "Co the cay va nhieu natri",
    created_at: "2026-08-29T19:20:00.000Z",
    reviews: [
      {
        id: "rv-06",
        rating: 4,
        review_text: "Nhom ban an rat vui",
        actual_cost: 250000,
        created_at: "2026-08-29T21:10:00.000Z",
      },
    ],
  },
  {
    id: "meal-07",
    name: "Salad ga",
    type: "cook",
    category: "Gỏi/Salad",
    estimated_cost: 42000,
    calories: 330,
    protein: 27,
    ingredients: ["Xa lach", "Uc ga", "Ca chua", "Sot me"],
    benefits: ["Xa lach", "Uc ga", "Ca chua", "Sot me"],
    health_warning: null,
    created_at: "2026-08-29T11:15:00.000Z",
    reviews: [],
  },
  {
    id: "meal-08",
    name: "Com tam suon",
    type: "eat_out",
    category: "Cơm",
    estimated_cost: 52000,
    calories: 700,
    protein: 30,
    ingredients: ["Com tam", "Suon", "Bi", "Cha"],
    benefits: ["Com tam", "Suon", "Bi", "Cha"],
    health_warning: "Nhieu calo va chat beo",
    created_at: "2026-08-28T12:00:00.000Z",
    reviews: [],
  },
  {
    id: "meal-09",
    name: "Chao yach",
    type: "cook",
    category: "Canh",
    estimated_cost: 32000,
    calories: 360,
    protein: 18,
    ingredients: ["Gao", "Thit bam", "Hanh"],
    benefits: ["Gao", "Thit bam", "Hanh"],
    health_warning: null,
    created_at: "2026-08-28T07:30:00.000Z",
    reviews: [],
  },
  {
    id: "meal-10",
    name: "Pizza hai san",
    type: "eat_out",
    category: "Khác",
    estimated_cost: 165000,
    calories: 860,
    protein: 35,
    ingredients: ["Bot mi", "Pho mai", "Hai san"],
    benefits: ["Bot mi", "Pho mai", "Hai san"],
    health_warning: "Nhieu natri va chat beo bao hoa",
    created_at: "2026-08-27T18:45:00.000Z",
    reviews: [],
  },
  {
    id: "meal-11",
    name: "Banh mi op la",
    type: "eat_out",
    category: "Ăn vặt",
    estimated_cost: 25000,
    calories: 420,
    protein: 16,
    ingredients: ["Banh mi", "Trung", "Dua chua"],
    benefits: ["Banh mi", "Trung", "Dua chua"],
    health_warning: null,
    created_at: "2026-08-27T06:50:00.000Z",
    reviews: [],
  },
  {
    id: "meal-12",
    name: "Bun bo hue",
    type: "eat_out",
    category: "Bún/Phở/Mì",
    estimated_cost: 60000,
    calories: 650,
    protein: 29,
    ingredients: ["Bun", "Gio heo", "Bo", "Sa"],
    benefits: ["Bun", "Gio heo", "Bo", "Sa"],
    health_warning: "Cay, nhieu natri",
    created_at: "2026-08-26T12:15:00.000Z",
    reviews: [],
  },
];
