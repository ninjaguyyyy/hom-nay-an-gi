import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";
import { TopHeader } from "@/components/top-header";
import { AppProviders } from "@/components/providers/app-providers";
import { auth } from "@/auth";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "HomNayAnGi",
  description: "Ứng dụng gợi ý món ăn hằng ngày",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="vi">
      <body className={beVietnam.className}>
        <AppProviders>
          {session?.user?.id ? (
            <div className="relative mx-auto min-h-screen max-w-md border-x border-slate-200 bg-gray-50 shadow-xl shadow-emerald-100/40">
              <TopHeader />
              <main className="px-4 pb-24 pt-4">{children}</main>
              <BottomNav />
            </div>
          ) : (
            <main className="min-h-screen bg-gradient-to-b from-[#fffde8] via-[#f8fff3] to-[#eefaf5]">
              {children}
            </main>
          )}
        </AppProviders>
      </body>
    </html>
  );
}
