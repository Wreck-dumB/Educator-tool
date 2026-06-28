import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/auth", "/parent/signup", "/parent/accept-invite"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    // Role-based routing is UX only -- the real security boundary is the
    // RLS policies and security-definer functions, not this redirect.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const isParent = profile?.role === "parent";
    const home = isParent ? "/parent" : "/generate";

    const isAuthPage = path === "/login" || path === "/signup" || path.startsWith("/parent/signup");
    const isParentInvitePage = path.startsWith("/parent/accept-invite");

    if (isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = home;
      return NextResponse.redirect(url);
    }

    if (!isParentInvitePage) {
      const isParentRoute = path.startsWith("/parent");
      if (isParentRoute && !isParent) {
        const url = request.nextUrl.clone();
        url.pathname = "/generate";
        return NextResponse.redirect(url);
      }
      if (!isParentRoute && isParent && !isPublic) {
        const url = request.nextUrl.clone();
        url.pathname = "/parent";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
