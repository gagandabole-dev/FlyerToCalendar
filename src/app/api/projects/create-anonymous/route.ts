import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseClient";
import { normalizeDateStr } from "@/lib/dateUtils";

export async function POST(request: Request) {
  try {
    if (process.env.NEXT_PUBLIC_MOCK_OFFLINE === "true") {
      return NextResponse.json({ projectId: "mock-project-123" });
    }

    const { eventName, events } = await request.json();

    if (!eventName || !events || !Array.isArray(events)) {
      return NextResponse.json({ error: "Missing required parameters: eventName and events" }, { status: 400 });
    }

    // 1. Resolve Super-Admin or System User ID to satisfy FK constraint
    let userId = "";
    const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (!listError && userList?.users && userList.users.length > 0) {
      const adminUser = userList.users.find(u => u.email?.toLowerCase() === "gagan.dabole@gmail.com") || userList.users[0];
      userId = adminUser.id;
    } else {
      // Create a system user to associate anonymous projects with
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: "system-anonymous@flyertocalendar.app",
        password: "system-anonymous-temp-password-123",
        email_confirm: true
      });
      if (newUser?.user) {
        userId = newUser.user.id;
      } else {
        return NextResponse.json({ error: createError?.message || "Failed to resolve system user." }, { status: 500 });
      }
    }

    // 2. Create dynamic anonymous project (bypass status enabled for universal compatibility)
    const { data: project, error: pError } = await supabaseAdmin
      .from("projects")
      .insert({
        user_id: userId,
        event_name: eventName,
        status: "bypass",
      })
      .select()
      .single();

    if (pError || !project) {
      return NextResponse.json({ error: pError?.message || "Failed to create anonymous project." }, { status: 500 });
    }

    // 3. Insert schedules
    const scheduleInserts = events.map((item: any) => {
      const today = new Date().toISOString().split("T")[0];
      const normDate = normalizeDateStr(item.date || today);
      const startStr = item.startTime || "12:00";
      const endStr = item.endTime || "13:00";

      return {
        project_id: project.id,
        title: item.title || "Untitled Event",
        start_time: new Date(`${normDate}T${startStr}`).toISOString(),
        end_time: new Date(`${normDate}T${endStr}`).toISOString(),
        room: item.room || item.location || "Main Stage",
        artist: item.artist || "",
      };
    });

    const { error: sError } = await supabaseAdmin
      .from("schedules")
      .insert(scheduleInserts);

    if (sError) {
      return NextResponse.json({ error: sError.message || "Failed to save schedules." }, { status: 500 });
    }

    return NextResponse.json({ projectId: project.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
