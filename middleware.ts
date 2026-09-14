import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isAuthPage = req.nextUrl.pathname.startsWith("/auth");

  if (!req.auth && !isAuthPage) {
    return NextResponse.redirect(new URL("/auth", req.nextUrl));
  }

  if (req.auth && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
