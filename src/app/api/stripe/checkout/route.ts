import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side admin client initialization to safely override status updates
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://egbbychdyuxhaymhjcvo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key-for-build-validation";
const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();
    if (!projectId) {
      return NextResponse.json({ error: "Missing required parameter: projectId" }, { status: 400 });
    }

    const { origin } = new URL(request.url);
    
    // Simulate Stripe Checkout page URL redirecting to success callback
    const simulatedCheckoutUrl = `${origin}/api/stripe/checkout?success_id=${projectId}`;

    return NextResponse.json({ url: simulatedCheckoutUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Stripe checkout session initiation failed." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const successId = searchParams.get("success_id");

  if (successId) {
    try {
      // Simulate Stripe Webhook callback by updating database entry to 'paid' status directly
      const { error } = await supabaseAdmin
        .from("projects")
        .update({ status: "paid" })
        .eq("id", successId);

      if (error) {
        console.error("Failed to update project status in simulator", error);
      }
      
      // Redirect back to project workspace
      return NextResponse.redirect(`${origin}/dashboard/projects/${successId}`);
    } catch (e) {
      console.error(e);
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
