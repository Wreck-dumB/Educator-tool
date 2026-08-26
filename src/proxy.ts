import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/auth", "/tour", "/faq", "/about", "/privacy", "/terms", "/demo", "/api/demo", "/parent/signup", "/parent/accept-invite", "/onboarding/accept-invite", "/accept-media-consent"];

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

      // Educator-side users with no active service membership at all (a
      // brand-new signup, before "start a new service" or redeeming a
      // staff invite) get routed to onboarding instead of the app -- UX
      // only, RLS is what actually blocks them from doing anything useful
      // in the meantime either way.
      const isOnboardingPath = path.startsWith("/onboarding");
      if (!isParentRoute && !isParent && !isOnboardingPath && !isPublic) {
        const { data: hasService } = await supabase.rpc("my_service_owner_id");
        if (!hasService) {
          const url = request.nextUrl.clone();
          url.pathname = "/onboarding";
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    // /monitoring is Sentry's tunnel route (withSentryConfig's tunnelRoute in
    // next.config.ts) - pure pass-through proxying error reports to Sentry's
    // ingest API, not a real app page. It must skip auth/redirect logic
    // entirely, or error reports sent before a user is authenticated (e.g.
    // a crash on the login page itself) would get redirected to /login
    // instead of actually reaching Sentry.
    //
    // /api/billing/webhook is Stripe's server-to-server callback -- it has
    // no Supabase session cookie by definition and authenticates purely via
    // its own signature check (lib/stripe.ts webhooks.constructEvent). Found
    // 2026-08-19 during first real end-to-end checkout test: every webhook
    // POST was silently 307-redirected to /login before reaching the route
    // handler at all, so no subscription ever actually granted credits.
    "/((?!_next/static|_next/image|favicon.ico|monitoring|api/billing/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
