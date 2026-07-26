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
    window.location.href = `/api/feed/${id}/calendar.ics`;
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
