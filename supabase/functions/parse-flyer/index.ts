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

    // Valid active Gemini API models
    const candidateModels = ["gemini-2.0-flash", "gemini-2.0-flash-lite"];
    let geminiRes: Response | null = null;
    let lastErrBody = "";
    let rateLimitStatus = false;

    for (const model of candidateModels) {
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
      }

      lastErrBody = await geminiRes.text();
      if (geminiRes.status === 429) {
        rateLimitStatus = true;
      }
    }

    if (!geminiRes || !geminiRes.ok) {
      const is429 = rateLimitStatus || geminiRes?.status === 429;
      let userMessage = "Gemini API Error";

      if (is429) {
        let retryMatch = lastErrBody.match(/retry in ([0-9.]+)s/i);
        let waitSec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : null;
        userMessage = waitSec
          ? `Gemini AI API rate limit reached. Please retry in ${waitSec} seconds.`
          : "Gemini AI API free tier quota limit reached. Please try again in 1 minute.";
      } else {
        userMessage = `Gemini API Error (${geminiRes?.status || 500})`;
      }

      return new Response(
        JSON.stringify({ error: userMessage, details: lastErrBody }),
        { status: is429 ? 429 : (geminiRes?.status || 500), headers: { ...corsHeaders, "Content-Type": "application/json" } }
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