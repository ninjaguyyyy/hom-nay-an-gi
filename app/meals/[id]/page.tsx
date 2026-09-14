import { MealDetailScreen } from "@/components/meal-detail-screen";

export default function MealDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <MealDetailScreen mealId={params.id} />;
}
