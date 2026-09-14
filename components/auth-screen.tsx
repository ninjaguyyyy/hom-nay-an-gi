"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogIn, Smartphone, UserPlus, WandSparkles } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type AuthMode = "login" | "register";

const DEMO_ACCOUNT = {
  phone: "+84911111111",
  password: "demo123456",
  name: "Demo User",
};

export function AuthScreen() {
  const router = useRouter();
  const { toast } = useToast();

  const [mode, setMode] = useState<AuthMode>("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const quickLoginEnabled =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ENABLE_QUICK_LOGIN === "true";

  const title = useMemo(
    () => (mode === "login" ? "Đăng nhập" : "Tạo tài khoản mới"),
    [mode],
  );

  async function handleGoogleSignIn() {
    setLoading(true);
    await signIn("google", { callbackUrl: "/" });
    setLoading(false);
  }

  async function handlePhoneSignIn() {
    if (!phone.trim() || !password) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập số điện thoại và mật khẩu.",
        variant: "error",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        phone: phone.trim(),
        password,
        redirect: false,
      });

      if (!result || result.error) {
        throw new Error("Số điện thoại hoặc mật khẩu chưa đúng");
      }

      toast({
        title: "Đăng nhập thành công",
        description: "Chào mừng bạn quay lại.",
        variant: "success",
      });
      router.push("/");
      router.refresh();
    } catch (error) {
      toast({
        title: "Không thể đăng nhập",
        description: error instanceof Error ? error.message : "Lỗi hệ thống",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!phone.trim() || !password) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập số điện thoại và mật khẩu.",
        variant: "error",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/phone/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          password,
          name: name.trim(),
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Không thể tạo tài khoản");
      }

      const loginResult = await signIn("credentials", {
        phone: phone.trim(),
        password,
        redirect: false,
      });

      if (!loginResult || loginResult.error) {
        throw new Error("Đăng ký thành công nhưng không thể đăng nhập tự động");
      }

      toast({
        title: "Đăng ký thành công",
        description: "Tài khoản đã sẵn sàng để sử dụng.",
        variant: "success",
      });
      router.push("/");
      router.refresh();
    } catch (error) {
      toast({
        title: "Không thể đăng ký",
        description: error instanceof Error ? error.message : "Lỗi hệ thống",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickBypassLogin() {
    setLoading(true);
    try {
      let result = await signIn("credentials", {
        phone: DEMO_ACCOUNT.phone,
        password: DEMO_ACCOUNT.password,
        redirect: false,
      });

      if (!result || result.error) {
        const registerRes = await fetch("/api/auth/phone/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(DEMO_ACCOUNT),
        });

        const registerData = (await registerRes.json()) as { error?: string };
        if (!registerRes.ok && registerRes.status !== 409) {
          throw new Error(registerData.error ?? "Không thể tạo tài khoản demo");
        }

        result = await signIn("credentials", {
          phone: DEMO_ACCOUNT.phone,
          password: DEMO_ACCOUNT.password,
          redirect: false,
        });
      }

      if (!result || result.error) {
        throw new Error("Không thể đăng nhập tài khoản demo");
      }

      toast({
        title: "Đã vào nhanh tài khoản demo",
        description: `SĐT: ${DEMO_ACCOUNT.phone} | Mật khẩu: ${DEMO_ACCOUNT.password}`,
        variant: "success",
      });
      router.push("/");
      router.refresh();
    } catch (error) {
      toast({
        title: "Bypass thất bại",
        description: error instanceof Error ? error.message : "Lỗi hệ thống",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
      <Card className="w-full overflow-hidden border-0 shadow-xl shadow-lime-200/50">
        <CardHeader className="rounded-b-[1.75rem] bg-gradient-to-br from-lime-100 to-emerald-50 pb-7">
          <CardTitle className="text-3xl font-black text-slate-900">HomNayAnGi</CardTitle>
          <CardDescription className="text-sm text-slate-700">
            Đăng nhập bằng Google hoặc số điện thoại + mật khẩu.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={
                mode === "login"
                  ? "rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm"
                  : "rounded-xl px-3 py-2 text-sm font-semibold text-slate-600"
              }
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={
                mode === "register"
                  ? "rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm"
                  : "rounded-xl px-3 py-2 text-sm font-semibold text-slate-600"
              }
            >
              Đăng ký
            </button>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>

            {mode === "register" ? (
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Tên hiển thị"
                className="h-12"
              />
            ) : null}

            <Input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Số điện thoại"
              className="h-12"
            />
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mật khẩu (tối thiểu 6 ký tự)"
              className="h-12"
            />

            <Button
              type="button"
              onClick={mode === "login" ? handlePhoneSignIn : handleRegister}
              disabled={loading}
              size="lg"
              className="mt-1 w-full"
            >
              {loading ? (
                <>
                  <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                  Đang xử lý...
                </>
              ) : mode === "login" ? (
                <>
                  <Smartphone className="mr-2 h-5 w-5" />
                  Đăng nhập bằng số điện thoại
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-5 w-5" />
                  Tạo tài khoản bằng số điện thoại
                </>
              )}
            </Button>
          </div>

          <div className="relative py-1">
            <div className="absolute inset-0 top-1/2 h-px bg-slate-200" />
            <p className="relative mx-auto w-fit bg-white px-2 text-xs font-semibold text-slate-400">HOẶC</p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={loading}
            size="lg"
            className="w-full"
          >
            <LogIn className="mr-2 h-5 w-5" />
            Tiếp tục với Google
          </Button>

          {quickLoginEnabled ? (
            <Button
              type="button"
              variant="secondary"
              onClick={handleQuickBypassLogin}
              disabled={loading}
              size="lg"
              className="w-full bg-black text-white hover:bg-slate-900"
            >
              <WandSparkles className="mr-2 h-5 w-5" />
              Vào nhanh bằng tài khoản demo
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
