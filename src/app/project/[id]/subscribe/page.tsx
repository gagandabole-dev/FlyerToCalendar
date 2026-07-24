"use client";

import React, { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SubscribeLandingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjectAndSchedules = async () => {
      // 1. Fetch project details
      const { data: pData } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();
      if (pData) {
        setProject(pData);

        // 2. Fetch schedules
        const { data: sData } = await supabase
          .from("schedules")
          .select("*")
          .eq("project_id", id)
          .order("start_time", { ascending: true });
        if (sData) {
          setSchedules(sData);
        }
      }
      setLoading(false);
    };
    fetchProjectAndSchedules();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="text-center space-y-2">
          <div className="animate-spin text-2xl">🔄</div>
          <p className="text-sm font-medium">Loading schedule...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-rose-450 p-6 text-center">
        <p className="font-semibold">Schedule not found or private.</p>
      </div>
    );
  }

  const eventName = project.event_name || "Festival Schedule";
  const isPreview = project.status !== "paid" && project.status !== "bypass";

  const handleIcsDownload = () => {
    let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//FlyerToCalendar//NONSGML v1.0//EN
BEGIN:VTIMEZONE
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
END:VTIMEZONE
`;

    const eventsToExport = isPreview ? schedules.slice(0, 5) : schedules;

    eventsToExport.forEach((item: any) => {
      const sTimeStr = item.start_time;
      const eTimeStr = item.end_time;
      
      let sDate = new Date(sTimeStr);
      let eDate = new Date(eTimeStr);

      // Fallback for invalid dates
      if (isNaN(sDate.getTime())) sDate = new Date();
      if (isNaN(eDate.getTime())) eDate = new Date(sDate.getTime() + 3600000);

      // Fix overnight events going past midnight
      if (eDate <= sDate) {
        eDate.setDate(eDate.getDate() + 1);
      }

      const pad = (num: number) => String(num).padStart(2, "0");
      const cleanStartDate = `${sDate.getFullYear()}${pad(sDate.getMonth() + 1)}${pad(sDate.getDate())}`;
      const startClean = `${pad(sDate.getHours())}${pad(sDate.getMinutes())}00`;
      const cleanEndDate = `${eDate.getFullYear()}${pad(eDate.getMonth() + 1)}${pad(eDate.getDate())}`;
      const endClean = `${pad(eDate.getHours())}${pad(eDate.getMinutes())}00`;

      const uid = item.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@flyertocalendar.app`;
      
      icsContent += `BEGIN:VEVENT
UID:${uid}
SUMMARY:${item.title}${item.artist ? ` - ${item.artist}` : ""}
DTSTART;TZID=Europe/Berlin:${cleanStartDate}T${startClean}
DTEND;TZID=Europe/Berlin:${cleanEndDate}T${endClean}
LOCATION:${item.room || ""}
END:VEVENT
`;
    });

    icsContent += "END:VCALENDAR";
    icsContent = icsContent.replace(/\r?\n/g, "\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${eventName.toLowerCase().replace(/\s+/g, "-")}-schedule.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 text-center">
        <div className="space-y-2">
          <span className="text-4xl block">📅</span>
          <h1 className="text-xl font-extrabold text-white">{eventName}</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Download the timetable directly to your device calendar.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleIcsDownload}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            📥 Download Calendar File (.ics)
          </button>

          {isPreview ? (
            <div className="bg-amber-500/10 border border-amber-500/25 p-4 rounded-xl text-left">
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Preview Mode</p>
              <p className="text-xs text-amber-250 mt-1 leading-normal">
                Since this event page is not activated, only the **first 5 events** will be exported.
              </p>
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/25 p-4 rounded-xl text-left">
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Full Access</p>
              <p className="text-xs text-emerald-250 mt-1 leading-normal">
                The complete schedule will be exported.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
