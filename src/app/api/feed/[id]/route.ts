import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
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

    // 1. Fetch project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
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
      name: `${project.event_name} - Schedule`,
    });
    cal.timezone("Europe/Berlin");

    for (const event of schedules) {
      cal.createEvent({
        id: event.id,
        sequence: 0,
        start: new Date(event.start_time),
        end: new Date(event.end_time),
        summary: event.title,
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

    // Return RFC-5545 compliant calendar feed with specific response headers
    return new Response(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="project_${id}.ics"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate calendar feed" }, { status: 500 });
  }
}
