import Image from "next/image";
import { Bell, CalendarDays, LogOut } from "lucide-react";
import { auth, signOut } from "@/auth";

export async function TopHeader() {
  const session = await auth();
  const avatarUrl = session?.user?.image;
  const name = session?.user?.name?.split(" ")[0] ?? "Bạn";

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/auth" });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/an-gi-logo.svg"
            alt="Logo An Gi"
            width={40}
            height={40}
            className="h-10 w-10 rounded-2xl"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-700">Hi, {name}</p>
            <h1 className="truncate text-base font-extrabold text-slate-900">Hôm nay ăn gì?</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
            aria-label="Lịch"
          >
            <CalendarDays className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
            aria-label="Thông báo"
          >
            <Bell className="h-5 w-5" />
          </button>
          <form action={handleSignOut}>
            <button
              type="submit"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
              aria-label="Đăng xuất"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </form>
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Avatar"
              width={40}
              height={40}
              className="h-10 w-10 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-bold text-slate-700">
              U
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
