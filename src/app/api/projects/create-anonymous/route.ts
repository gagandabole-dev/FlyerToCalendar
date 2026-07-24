import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseClient";

export async function POST(request: Request) {
  try {
    const { eventName, events } = await request.json();

    if (!eventName || !events || !Array.isArray(events)) {
      return NextResponse.json({ error: "Missing required parameters: eventName and events" }, { status: 400 });
    }

    // 1. Resolve Super-Admin User ID to satisfy FK constraint
    const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError || !userList?.users) {
      return NextResponse.json({ error: "Failed to resolve system admin user." }, { status: 500 });
    }

    const adminUser = userList.users.find(u => u.email?.toLowerCase() === "gagan.dabole@gmail.com");
    if (!adminUser) {
      return NextResponse.json({ error: "Super-Admin user not found. Please register gagan.dabole@gmail.com first." }, { status: 500 });
    }

    // 2. Create dynamic anonymous project (bypass status enabled for universal compatibility)
    const { data: project, error: pError } = await supabaseAdmin
      .from("projects")
      .insert({
        user_id: adminUser.id,
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
      const dateStr = item.date || today;
      const startStr = item.startTime || "12:00";
      const endStr = item.endTime || "13:00";

      return {
        project_id: project.id,
        title: item.title || "Untitled Event",
        start_time: new Date(`${dateStr}T${startStr}`).toISOString(),
        end_time: new Date(`${dateStr}T${endStr}`).toISOString(),
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
