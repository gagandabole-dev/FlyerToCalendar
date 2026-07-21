import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Pass the payload directly to the local edge function port
    const response = await fetch("http://127.0.0.1:54321/functions/v1/parse-flyer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageUrl: body.base64Image || body.imageUrl,
        timezone: body.timezone || "Europe/Berlin",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `Edge Function responded with status ${response.status}`, details: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Server Proxy Error", message: error.message }, { status: 500 });
  }
}
