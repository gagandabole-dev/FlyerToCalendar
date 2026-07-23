"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

interface ScheduleItem {
  id: string;
  title: string;
  artist: string;
  start_time: string;
  end_time: string;
  room: string;
}

interface Project {
  id: string;
  event_name: string;
  status: "draft" | "paid" | "bypass";
  created_at: string;
}

export default function ProjectPublicViewer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicSchedule = async () => {
      setLoading(true);
      
      // 1. Fetch project details
      const { data: pData, error: pError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();

      if (pError || !pData) {
        setErrorMessage("Schedule not found, or it has been set to private by the organizer.");
        setLoading(false);
        return;
      }
      const proj = pData as Project;
      setProject(proj);

      // 2. Fetch all schedules
      const { data: sData, error: sError } = await supabase
        .from("schedules")
        .select("*")
        .eq("project_id", id)
        .order("start_time", { ascending: true });

      if (sData && !sError) {
        setSchedules(sData as ScheduleItem[]);
        
        // 3. Compile and trigger automatic ICS download
        if (sData.length > 0) {
          let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//FlyerToCalendar//NONSGML v1.0//EN\n";
          sData.forEach((item: any) => {
            const sDate = new Date(item.start_time);
            const eDate = new Date(item.end_time);

            // Format date to local standard YYYYMMDD
            const pad = (num: number) => String(num).padStart(2, "0");
            const cleanDate = `${sDate.getFullYear()}${pad(sDate.getMonth() + 1)}${pad(sDate.getDate())}`;
            const startClean = `${pad(sDate.getHours())}${pad(sDate.getMinutes())}00`;
            const endClean = `${pad(eDate.getHours())}${pad(eDate.getMinutes())}00`;

            icsContent += `BEGIN:VEVENT\nSUMMARY:${item.title} - ${item.artist || ""}\nDTSTART:${cleanDate}T${startClean}\nDTEND:${cleanDate}T${endClean}\nLOCATION:${item.room || ""}\nEND:VEVENT\n`;
          });
          icsContent += "END:VCALENDAR";

          const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `${proj.event_name.toLowerCase().replace(/\s+/g, "-")}-schedule.ics`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        // 4. Log page view analytics event
        supabase.from("analytics_events").insert({
          event_type: "page_view",
          project_id: id,
        });
      }
      setLoading(false);
    };

    fetchPublicSchedule();
  }, [id]);

  const handleManualDownload = () => {
    if (schedules.length === 0 || !project) return;
    
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//FlyerToCalendar//NONSGML v1.0//EN\n";
    schedules.forEach((item: any) => {
      const sDate = new Date(item.start_time);
      const eDate = new Date(item.end_time);

      const pad = (num: number) => String(num).padStart(2, "0");
      const cleanDate = `${sDate.getFullYear()}${pad(sDate.getMonth() + 1)}${pad(sDate.getDate())}`;
      const startClean = `${pad(sDate.getHours())}${pad(sDate.getMinutes())}00`;
      const endClean = `${pad(eDate.getHours())}${pad(eDate.getMinutes())}00`;

      icsContent += `BEGIN:VEVENT\nSUMMARY:${item.title} - ${item.artist || ""}\nDTSTART:${cleanDate}T${startClean}\nDTEND:${cleanDate}T${endClean}\nLOCATION:${item.room || ""}\nEND:VEVENT\n`;
    });
    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${project.event_name.toLowerCase().replace(/\s+/g, "-")}-schedule.ics`;
    link.click();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="flex items-center gap-2">
          <span className="animate-spin text-sm">🔄</span>
          <span className="text-slate-400 text-sm">Syncing schedule...</span>
        </div>
      </main>
    );
  }

  if (errorMessage || !project) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <p className="text-rose-450 font-semibold">{errorMessage}</p>
        <Link href="/" className="px-5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-200">
          ← Back to Homepage
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-indigo-500 selection:text-white">
      <div className="max-w-md w-full text-center space-y-8">
        
        <div className="space-y-4">
          <span className="px-3.5 py-1 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 text-indigo-400 rounded-full text-xs font-semibold uppercase tracking-wider border border-indigo-500/20 shadow-sm">
            Timetable Synced
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            {project.event_name}
          </h1>
          <p className="text-slate-400 text-xs max-w-xs mx-auto leading-relaxed">
            Your calendar file (.ics) has been downloaded automatically. Tap it to import all event items instantly.
          </p>
        </div>

        {/* Action Panel */}
        <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-8 shadow-xl space-y-6 backdrop-blur-md">
          <div className="w-12 h-12 bg-indigo-950/30 border border-indigo-900/30 rounded-full flex items-center justify-center mx-auto text-indigo-400 text-lg animate-bounce">
            📥
          </div>

          <div className="space-y-3">
            <button
              onClick={handleManualDownload}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/25 text-sm"
            >
              Download Calendar File (.ICS)
            </button>
            <Link
              href="/"
              className="block w-full py-3.5 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition text-xs font-bold rounded-xl"
            >
              Create Your Own Schedule
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}
