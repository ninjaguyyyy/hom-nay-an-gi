"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  destructive,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 p-3">
      <Card className="w-full max-w-md rounded-3xl bg-white">
        <CardContent className="space-y-4 p-5">
          <div>
            <h4 className="text-lg font-extrabold text-slate-900">{title}</h4>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              {cancelText}
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={destructive ? "bg-rose-600 text-white hover:bg-rose-700" : ""}
            >
              {loading ? "Đang xử lý..." : confirmText}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
