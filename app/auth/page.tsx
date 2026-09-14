import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthScreen } from "@/components/auth-screen";

export default async function AuthPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/");
  }

  return <AuthScreen />;
}
