const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY environment variable is missing on Supabase Cloud." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let base64Data = "";
    let mimeType = "image/jpeg";
    let timezone = "Europe/Berlin";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const fileEntry = formData.get("file") || formData.get("image");
      const imageUrlParam = formData.get("imageUrl");
      const tzParam = formData.get("timezone");

      if (tzParam && typeof tzParam === "string") {
        timezone = tzParam;
      }

      if (fileEntry && (fileEntry instanceof File || fileEntry instanceof Blob)) {
        mimeType = fileEntry.type || "image/jpeg";
        const buffer = await fileEntry.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        base64Data = btoa(binary);
      } else if (imageUrlParam && typeof imageUrlParam === "string") {
        if (imageUrlParam.startsWith("data:")) {
          const parts = imageUrlParam.split(";base64,");
          if (parts.length === 2) {
            mimeType = parts[0].replace("data:", "");
            base64Data = parts[1];
          } else {
            base64Data = imageUrlParam.slice(imageUrlParam.indexOf(",") + 1);
          }
        } else {
          base64Data = imageUrlParam;
        }
      } else {
        return new Response(
          JSON.stringify({ error: "Missing required file or imageUrl in FormData" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // JSON body
      const body = await req.json();
      const imageUrl = body.imageUrl || body.base64Image;
      if (body.timezone) timezone = body.timezone;

      if (!imageUrl) {
        return new Response(
          JSON.stringify({ error: "Missing required parameter: imageUrl" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (imageUrl.startsWith("data:")) {
        const parts = imageUrl.split(";base64,");
        if (parts.length === 2) {
          mimeType = parts[0].replace("data:", "");
          base64Data = parts[1];
        } else {
          base64Data = imageUrl.slice(imageUrl.indexOf(",") + 1);
        }
      } else if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) {
          return new Response(
            JSON.stringify({ error: `Failed to download image from URL: ${imgRes.statusText}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        mimeType = imgRes.headers.get("content-type") || "image/jpeg";
        const buffer = await imgRes.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        base64Data = btoa(binary);
      } else {
        base64Data = imageUrl;
      }
    }

    const promptText = `Extract all scheduled event details, workshops, or performances from this flyer image.
Target Timezone: ${timezone}.
Current Date Context: ${new Date().toISOString()}.

Return ONLY a valid JSON array of event objects matching this schema:
[
  {
    "title": "Title of event or workshop",
    "artist": "Artist, DJ, or Instructor",
    "date": "YYYY-MM-DD",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "room": "Room or Stage name"
  }
]`;

    const requestPayload = {
      contents: [
        {
          parts: [
            { text: promptText },
            { inline_data: { mime_type: mimeType, data: base64Data } }
          ]
        }
      ],
      generationConfig: {
        response_mime_type: "application/json"
      }
    };

    // Primary & Fallback model endpoints
    const models = ["gemini-2.0-flash", "gemini-2.5-flash"];
    let geminiRes: Response | null = null;
    let lastErrBody = "";

    for (const model of models) {
      geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload)
        }
      );

      if (geminiRes.ok) {
        break;
      } else {
        lastErrBody = await geminiRes.text();
        if (geminiRes.status !== 404) {
          // If not a 404 model name error (e.g. rate limit 429), stop trying other models
          break;
        }
      }
    }

    if (!geminiRes || !geminiRes.ok) {
      return new Response(
        JSON.stringify({ error: `Gemini API Error (${geminiRes?.status || 500})`, details: lastErrBody }),
        { status: geminiRes?.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiJson = await geminiRes.json();
    const rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const events = JSON.parse(rawText);

    return new Response(JSON.stringify(events), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal Server Error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});