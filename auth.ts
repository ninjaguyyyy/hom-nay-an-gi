import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import { compare } from "bcryptjs";
import authConfig from "@/auth.config";
import { normalizePhone } from "@/lib/phone-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const hasSupabaseAdapter =
  Boolean(process.env.SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Phone Password",
      credentials: {
        phone: { label: "Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!hasSupabaseAdapter) return null;

        const phone = normalizePhone(credentials?.phone);
        const password = String(credentials?.password ?? "");

        if (!phone || password.length < 6) {
          return null;
        }

        try {
          const supabaseAdmin = getSupabaseAdmin();
          const { data: authRow, error: authError } = await supabaseAdmin
            .from("phone_credentials")
            .select("user_id, password_hash")
            .eq("phone", phone)
            .single();

          if (authError || !authRow?.password_hash || !authRow.user_id) {
            return null;
          }

          const passwordMatched = await compare(password, authRow.password_hash);
          if (!passwordMatched) {
            return null;
          }

          const { data: user, error: userError } = await supabaseAdmin
            .from("users")
            .select("id, name, email, image")
            .eq("id", authRow.user_id)
            .single();

          if (userError || !user) {
            return null;
          }

          return {
            id: user.id,
            name: user.name ?? `User ${phone.slice(-4)}`,
            email: user.email,
            image: user.image,
          };
        } catch {
          return null;
        }
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? "placeholder",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "placeholder",
    }),
  ],
  adapter: hasSupabaseAdapter
    ? SupabaseAdapter({
        url: process.env.SUPABASE_URL!,
        secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      })
    : undefined,
});
