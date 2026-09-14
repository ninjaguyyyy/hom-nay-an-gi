import { AddMealForm } from "@/components/add-meal-form";

export default function AddMealPage() {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-extrabold text-slate-900">Thêm món ăn mới</h2>
      <p className="text-sm text-slate-600">
        Nhập tên món, dùng AI để tự động điền thông tin dinh dưỡng, sau đó lưu vào cơ sở dữ liệu.
      </p>
      <AddMealForm />
    </section>
  );
}
