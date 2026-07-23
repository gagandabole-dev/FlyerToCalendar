const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function extractJsonArray(text: string): string {
  let cleanText = text.trim();
  // Remove markdown backticks if present
  if (cleanText.startsWith("```")) {
    const lines = cleanText.split("\n");
    if (lines[0].startsWith("```")) {
      lines.shift();
    }
    if (lines[lines.length - 1].startsWith("```")) {
      lines.pop();
    }
    cleanText = lines.join("\n").trim();
  }
  
  // Find first '[' and last ']'
  const firstBracket = cleanText.indexOf("[");
  const lastBracket = cleanText.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    return cleanText.substring(firstBracket, lastBracket + 1);
  }
  
  // Try matching braces '{' and '}'
  const firstBrace = cleanText.indexOf("{");
  const lastBrace = cleanText.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleanText.substring(firstBrace, lastBrace + 1);
  }
  
  return cleanText;
}

function repairTruncatedJson(jsonStr: string): string {
  try {
    JSON.parse(jsonStr);
    return jsonStr;
  } catch (_) {
    // Continue to repair
  }

  let repaired = jsonStr.trim();

  // Strip trailing commas
  if (repaired.endsWith(",")) {
    repaired = repaired.slice(0, -1).trim();
  }

  let openBrackets = 0;
  let openBraces = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === "\\") {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "[") openBrackets++;
      else if (char === "]") openBrackets--;
      else if (char === "{") openBraces++;
      else if (char === "}") openBraces--;
    }
  }

  if (inString) {
    repaired += '"';
  }

  let closing = "";
  let tempBraces = openBraces;
  let tempBrackets = openBrackets;
  while (tempBraces > 0) {
    closing += "}";
    tempBraces--;
  }
  while (tempBrackets > 0) {
    closing += "]";
    tempBrackets--;
  }

  try {
    const testStr = repaired + closing;
    JSON.parse(testStr);
    return testStr;
  } catch (_) {
    // If simple closing fails, cut back to the last complete object closing brace
    const lastBrace = repaired.lastIndexOf("}");
    if (lastBrace !== -1) {
      let cutStr = repaired.substring(0, lastBrace + 1).trim();
      if (cutStr.endsWith(",")) {
        cutStr = cutStr.slice(0, -1).trim();
      }

      let brackets = 0;
      let braces = 0;
      let strState = false;
      let escState = false;

      for (let i = 0; i < cutStr.length; i++) {
        const char = cutStr[i];
        if (escState) { escState = false; continue; }
        if (char === "\\") { escState = true; continue; }
        if (char === '"') { strState = !strState; continue; }
        if (!strState) {
          if (char === "[") brackets++;
          else if (char === "]") brackets--;
          else if (char === "{") braces++;
          else if (char === "}") braces--;
        }
      }

      let closeExtra = "";
      while (braces > 0) { closeExtra += "}"; braces--; }
      while (brackets > 0) { closeExtra += "]"; brackets--; }

      try {
        const parsedCut = cutStr + closeExtra;
        JSON.parse(parsedCut);
        return parsedCut;
      } catch (_) {
        // Fallback
      }
    }
  }

  return jsonStr;
}

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
        response_mime_type: "application/json",
        maxOutputTokens: 8192
      }
    };

    // Valid active Gemini API models (including 3.6/3.5/2.5 flash models for 2026 context)
    const candidateModels = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-2.5-flash", "gemini-3.5-flash-lite"];
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
    
    // Clean and repair potential truncation
    const cleanJsonString = repairTruncatedJson(extractJsonArray(rawText));
    let events = JSON.parse(cleanJsonString);

    if (events && !Array.isArray(events) && Array.isArray(events.events)) {
      events = events.events;
    }
    if (!Array.isArray(events)) {
      events = [events];
    }

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