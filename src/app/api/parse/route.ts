import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export async function OPTIONS() {
  return new Response("ok", { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://egbbychdyuxhaymhjcvo.supabase.co";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const functionEndpoint = `${supabaseUrl}/functions/v1/parse-flyer`;

    const contentType = request.headers.get("content-type") || "";
    let upstreamResponse: Response;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      upstreamResponse = await fetch(functionEndpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseAnonKey}`,
        },
        body: formData,
      });
    } else {
      const body = await request.json();
      upstreamResponse = await fetch(functionEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          imageUrl: body.base64Image || body.imageUrl,
          timezone: body.timezone || "Europe/Berlin",
        }),
      });
    }

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      return NextResponse.json(
        { error: `Edge Function responded with status ${upstreamResponse.status}`, details: errorText },
        { status: upstreamResponse.status, headers: corsHeaders }
      );
    }

    const data = await upstreamResponse.json();
    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Proxy Error", details: message },
      { status: 500, headers: corsHeaders }
    );
  }
}