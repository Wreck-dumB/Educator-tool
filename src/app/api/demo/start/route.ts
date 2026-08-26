import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rateLimit";
import { createDemoAccount } from "@/lib/demoSeed";

// Public endpoint (see PUBLIC_PATHS in proxy.ts) -- anyone can click "Try the
// demo" with no account. Each call provisions a brand-new, fully isolated
// demo centre (never shared between visitors) and signs the browser straight
// into it. Rate-limited by IP since it's unauthenticated and does real writes.
function errorRedirect(request: Request, message: string) {
  const url = new URL("/demo", request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (await isRateLimited(`demo-start:${ip}`, 5, 60 * 60 * 1000)) {
    return errorRedirect(request, "Too many demo requests from this network. Try again in an hour.");
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return errorRedirect(request, "Demo is temporarily unavailable.");
  }

  let account;
  try {
    account = await createDemoAccount(admin);
  } catch (err) {
    console.error("demo provisioning failed:", err);
    return errorRedirect(request, "Couldn't set up your demo centre. Please try again.");
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });
  if (signInError) {
    console.error("demo sign-in failed:", signInError);
    return errorRedirect(request, "Your demo centre was created but sign-in failed. Please try again.");
  }

  return NextResponse.redirect(new URL("/generate", request.url), { status: 303 });
}
