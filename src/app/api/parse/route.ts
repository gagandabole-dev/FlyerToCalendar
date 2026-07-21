import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Dynamically fallback to local Supabase CLI if env variable isn't set
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
    const functionEndpoint = `${supabaseUrl}/functions/v1/parse-flyer`;

    const response = await fetch(functionEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
      },
      body: JSON.stringify({
        imageUrl: body.base64Image || body.imageUrl,
        timezone: body.timezone || "Europe/Berlin",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Edge Function responded with status ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Proxy Error";
    return NextResponse.json({ error: "Internal Server Proxy Error", message }, { status: 500 });
  }
}