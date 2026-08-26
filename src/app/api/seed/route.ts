import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const SEED_SECRET = process.env.SEED_SECRET || "dev-seed";

/**
 * POST /api/seed
 *
 * Seeds the database with demo data for testing/demoing.
 * Requires either:
 * - SEED_SECRET header
 * - secret query parameter
 *
 * Response: { success: boolean; demo_user: { email, password }; message: string }
 */
export async function POST(req: NextRequest) {
  const incoming = req.headers.get("x-seed-secret") || req.nextUrl.searchParams.get("secret");

  if (incoming !== SEED_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const admin = createAdminClient();

    // Create or get demo user
    const demoEmail = "demo@sparkplay.com.au";
    const demoPassword = "DemoSparkPlay123!";

    // Try to create the user (if it exists, auth.admin.createUser will throw)
    // We'll catch that and move on
    let userId: string;
    
    try {
      const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email: demoEmail,
        password: demoPassword,
        user_metadata: {
          first_name: "Demo",
          last_name: "Educator",
        },
      });

      if (authError) {
        // User likely already exists, get the existing user
        const { data: existingUsers } = await admin.auth.admin.listUsers();
        const existing = existingUsers?.users?.find(u => u.email === demoEmail);
        
        if (existing) {
          userId = existing.id;
        } else {
          throw new Error("Failed to create or find demo user");
        }
      } else {
        userId = authData.user.id;
      }
    } catch (err) {
      // User might already exist, try to find it
      const { data: existingUsers } = await admin.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u: any) => u.email === demoEmail);
      
      if (existing) {
        userId = existing.id;
      } else {
        throw new Error(`Failed to set up demo user: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Demo data endpoint is ready",
        demo_user: {
          email: demoEmail,
          password: demoPassword,
        },
        userId,
        instructions: "This endpoint is for demo account setup. Data seeding can be configured in the admin UI or via direct SQL.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      {
        error: "Failed to set up demo",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/seed
 * Returns status of demo endpoint
 */
export async function GET(req: NextRequest) {
  const incoming = req.headers.get("x-seed-secret") || req.nextUrl.searchParams.get("secret");

  if (incoming !== SEED_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return NextResponse.json(
    {
      status: "OK",
      endpoint: "POST /api/seed to initialize demo data",
      auth: "Requires x-seed-secret header or secret query param",
    },
    { status: 200 }
  );
}
