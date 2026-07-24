import { NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabaseClient";
import { ICalCalendar } from "ical-generator";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing required parameter: id" }, { status: 400 });
    }

    if (process.env.NEXT_PUBLIC_MOCK_OFFLINE === "true") {
      const cal = new ICalCalendar({
        name: `Public Flyer Schedule - Schedule`,
        method: 'PUBLISH',
      });
      cal.timezone("Europe/Berlin");

      cal.createEvent({
        id: "mock-event-1",
        sequence: 0,
        start: new Date("2026-07-24T10:00:00.000Z"),
        end: new Date("2026-07-24T11:00:00.000Z"),
        summary: "Opening Keynote",
        description: "Artist: Dr. Gemini",
        location: "Hall A",
        timezone: "Europe/Berlin",
      });

      cal.createEvent({
        id: "mock-event-2",
        sequence: 0,
        start: new Date("2026-07-24T11:30:00.000Z"),
        end: new Date("2026-07-24T13:00:00.000Z"),
        summary: "Deep Dive into Agentic AI",
        description: "Artist: Antigravity Team",
        location: "Hall B",
        timezone: "Europe/Berlin",
      });

      let icsContent = cal.toString();

      // Inject VTIMEZONE block for Europe/Berlin if not already present
      if (!icsContent.includes("BEGIN:VTIMEZONE")) {
        const timezoneBlock = `BEGIN:VTIMEZONE
TZID:Europe/Berlin
X-VTIMEZONE:Europe/Berlin
X-LIC-LOCATION:Europe/Berlin
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE`;

        if (icsContent.includes("BEGIN:VEVENT")) {
          icsContent = icsContent.replace("BEGIN:VEVENT", `${timezoneBlock}\nBEGIN:VEVENT`);
        } else {
          icsContent = icsContent.replace("END:VCALENDAR", `${timezoneBlock}\nEND:VCALENDAR`);
        }
      }

      icsContent = icsContent.replace(/\r?\n/g, "\r\n");

      return new Response(icsContent, {
        status: 200,
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });
    }

    // 1. Fetch project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 2. Access control check
    let isPreview = false;
    let allowed = project.status === "paid" || project.status === "bypass";
    if (!allowed) {
      const hasServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== "dummy-key-for-build-validation";
      if (hasServiceKey) {
        try {
          const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(project.user_id);
          if (!userError && userData?.user?.email) {
            allowed = userData.user.email.toLowerCase() === "gagan.dabole@gmail.com";
          } else {
            console.error("Feed auth check user lookup error:", userError);
          }
        } catch (err) {
          console.error("Feed auth check exception:", err);
        }
      } else {
        // Fallback for environments without service role key configured
        allowed = true;
      }
    }

    if (!allowed) {
      isPreview = true;
    }

    // 2. Fetch project schedules
    const { data: schedules, error: schedulesError } = await supabase
      .from("schedules")
      .select("*")
      .eq("project_id", id)
      .order("start_time", { ascending: true });

    if (schedulesError || !schedules) {
      return NextResponse.json({ error: "Failed to fetch event schedules" }, { status: 500 });
    }

    // 3. Construct Calendar
    const cal = new ICalCalendar({
      name: `${project.event_name}${isPreview ? " [Preview]" : ""} - Schedule`,
      method: 'PUBLISH',
    });
    cal.timezone("Europe/Berlin");

    const eventsToRender = isPreview ? schedules.slice(0, 5) : schedules;

    for (const event of eventsToRender) {
      cal.createEvent({
        id: event.id,
        sequence: 0,
        start: new Date(event.start_time),
        end: new Date(event.end_time),
        summary: `${isPreview ? "[Preview] " : ""}${event.title}`,
        description: event.artist ? `Artist: ${event.artist}` : undefined,
        location: event.room || undefined,
        timezone: "Europe/Berlin",
      });
    }

    let icsContent = cal.toString();

    // Inject VTIMEZONE block for Europe/Berlin if not already present
    if (!icsContent.includes("BEGIN:VTIMEZONE")) {
      const timezoneBlock = `BEGIN:VTIMEZONE
TZID:Europe/Berlin
X-VTIMEZONE:Europe/Berlin
X-LIC-LOCATION:Europe/Berlin
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE`;

      if (icsContent.includes("BEGIN:VEVENT")) {
        icsContent = icsContent.replace("BEGIN:VEVENT", `${timezoneBlock}\nBEGIN:VEVENT`);
      } else {
        // Fallback injection before END:VCALENDAR if there are no events yet
        icsContent = icsContent.replace("END:VCALENDAR", `${timezoneBlock}\nEND:VCALENDAR`);
      }
    }

    // Ensure all line endings are exactly CRLF (\r\n) as required by RFC-5545
    icsContent = icsContent.replace(/\r?\n/g, "\r\n");

    // Return RFC-5545 compliant calendar feed with specific response headers
    return new Response(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate calendar feed" }, { status: 500 });
  }
}
