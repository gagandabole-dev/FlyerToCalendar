import { GoogleGenAI } from "npm:@google/genai";
import { getSystemPrompt } from "./prompt-template.ts";


// CORS headers to allow cross-origin requests from the browser client
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { imageUrl, timezone } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: imageUrl" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const targetTimezone = timezone || "UTC";

    // 1. Fetch the target image bytes
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch image: ${imageResponse.statusText}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await imageResponse.arrayBuffer();
    const imageBytes = new Uint8Array(arrayBuffer);

    // Convert Uint8Array to base64 safely
    let base64Image = "";
    if (typeof imageBytes.toBase64 === "function") {
      base64Image = imageBytes.toBase64();
    } else {
      let binary = "";
      const len = imageBytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(imageBytes[i]);
      }
      base64Image = btoa(binary);
    }

    // 2. Initialize Google Gen AI SDK
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY environment variable is not configured on the server." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // 3. Define the response schema to enforce the structure array of ParsedEvents
    const responseSchema = {
      type: "array",
      description: "A list of parsed calendar events from the flyer image.",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "The title of the event (e.g. show title, party name, performance name).",
          },
          artist: {
            type: "string",
            description: "The artist, DJ, or band performing, if specified. Return empty string if not applicable.",
          },
          date: {
            type: "string",
            description: "The date of the event in YYYY-MM-DD format.",
          },
          startTime: {
            type: "string",
            description: "The start time of the event in HH:MM 24-hour format.",
          },
          endTime: {
            type: "string",
            description: "The end time of the event in HH:MM 24-hour format.",
          },
          room: {
            type: "string",
            description: "The room, stage, or area where the event takes place. Return empty string if not applicable.",
          },
        },
        required: ["title", "artist", "date", "startTime", "endTime", "room"],
      },
    };

    // 4. Construct prompt with context
    const currentISOString = new Date().toISOString();
    const systemPrompt = getSystemPrompt(targetTimezone, currentISOString);


    // 5. Call the gemini-3.5-flash model with fallback to gemini-3.1-flash-lite on 503/429
    const requestPayload = {
      contents: [
        {
          inlineData: {
            data: base64Image,
            mimeType: contentType,
          },
        },
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
        model: "gemini-3.5-flash",
        ...requestPayload,
      });
    } catch (err: any) {
      const errMessage = String(err?.message || err);
      const status = err?.status || err?.statusCode;
      const is503Or429 =
        status === 503 ||
        status === 429 ||
        errMessage.includes("503") ||
        errMessage.includes("429") ||
        errMessage.includes("RESOURCE_EXHAUSTED") ||
        errMessage.includes("UNAVAILABLE");

      if (is503Or429) {
        console.warn("gemini-3.5-flash encountered rate limit / service unavailable (503/429). Falling back to gemini-3.1-flash-lite.", err);
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          ...requestPayload,
        });
      } else {
        throw err;
      }
    }

    let responseText = response.text || "";

    // 6. Clean markdown wrappers if returned
    if (responseText.startsWith("```json")) {
      responseText = responseText.substring(7);
    } else if (responseText.startsWith("```")) {
      responseText = responseText.substring(3);
    }
    if (responseText.endsWith("```")) {
      responseText = responseText.substring(0, responseText.length - 3);
    }
    responseText = responseText.trim();

    // Verify it parses as valid JSON
    const parsedData = JSON.parse(responseText);

    return new Response(JSON.stringify(parsedData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error processing flyer:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An unexpected error occurred while processing the flyer",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
