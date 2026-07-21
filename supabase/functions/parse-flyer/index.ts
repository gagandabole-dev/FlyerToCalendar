import { GoogleGenAI } from "npm:@google/genai";
import { getSystemPrompt } from "./prompt-template.ts";

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

    const { imageUrl, timezone } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: imageUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetTimezone = timezone || "Europe/Berlin";

    // Handle base64 vs HTTP URL payload safely
    let base64Image = "";
    let contentType = "image/jpeg";

    if (imageUrl.startsWith("data:")) {
      const parts = imageUrl.split(";base64,");
      contentType = parts[0].replace("data:", "");
      base64Image = parts[1];
    } else if (imageUrl.startsWith("http")) {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        return new Response(
          JSON.stringify({ error: `Failed to fetch image: ${imageResponse.statusText}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      contentType = imageResponse.headers.get("content-type") || "image/jpeg";
      const arrayBuffer = await imageResponse.arrayBuffer();
      const imageBytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < imageBytes.byteLength; i++) {
        binary += String.fromCharCode(imageBytes[i]);
      }
      base64Image = btoa(binary);
    } else {
      base64Image = imageUrl;
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY environment variable is not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const responseSchema = {
      type: "array",
      description: "A list of parsed calendar events from the flyer image.",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Title of the event or performance." },
          artist: { type: "string", description: "Artist, DJ, or band name." },
          date: { type: "string", description: "YYYY-MM-DD format date." },
          startTime: { type: "string", description: "Start time in HH:MM 24-hour format." },
          endTime: { type: "string", description: "End time in HH:MM 24-hour format." },
          room: { type: "string", description: "Room, stage, or area." },
        },
        required: ["title", "artist", "date", "startTime", "endTime", "room"],
      },
    };

    const currentISOString = new Date().toISOString();
    const systemPrompt = getSystemPrompt ? getSystemPrompt(targetTimezone, currentISOString) : "Extract event details from this flyer into JSON.";

    const requestPayload = {
      contents: [
        { inlineData: { data: base64Image, mimeType: contentType } },
        systemPrompt,
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    };

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        ...requestPayload,
      });
    } catch (err: any) {
      console.warn("Primary model invocation failed, attempting fallback:", err);
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        ...requestPayload,
      });
    }

    let responseText = response.text || "";
    if (responseText.startsWith("```json")) responseText = responseText.substring(7);
    if (responseText.startsWith("```")) responseText = responseText.substring(3);
    if (responseText.endsWith("```")) responseText = responseText.substring(0, responseText.length - 3);

    const parsedData = JSON.parse(responseText.trim());

    return new Response(JSON.stringify(parsedData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error processing flyer:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "An unexpected error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});