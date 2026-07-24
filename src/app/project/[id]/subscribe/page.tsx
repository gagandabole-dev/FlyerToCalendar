"use client";

import React, { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SubscribeLandingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      const { data } = await supabase
        .from("projects")
        .select("event_name")
        .eq("id", id)
        .single();
      if (data) {
        setProject(data);
      }
      setLoading(false);
    };
    fetchProject();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="text-center space-y-2">
          <div className="animate-spin text-2xl">🔄</div>
          <p className="text-sm font-medium">Resolving calendar feed...</p>
        </div>
      </div>
    );
  }

  const [origin, setOrigin] = useState("https://flyertocalendar.vercel.app");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const eventName = project?.event_name || "Festival Schedule";
  const webcalUrl = origin.replace(/^https?:/, "webcal:") + `/api/feed/${id}/calendar.ics`;
  const httpUrl = `${origin}/api/feed/${id}/calendar.ics`;
  const googleCalUrl = `https://www.google.com/calendar/render?cid=${encodeURIComponent(httpUrl)}`;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 text-center">
        <div className="space-y-2">
          <span className="text-4xl block">📅</span>
          <h1 className="text-xl font-extrabold text-white">{eventName}</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Choose your calendar application below to subscribe to the live schedule. Events will auto-sync and update on your device.
          </p>
        </div>

        <div className="space-y-3.5 pt-2">
          <a
            href={googleCalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            🤖 Subscribe on Google Calendar (Android / Chrome)
          </a>

          <a
            href={webcalUrl}
            className="w-full py-3.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
          >
            🍎 Subscribe on Apple Calendar (iOS / Mac)
          </a>
        </div>

        <div className="pt-4 border-t border-slate-850 space-y-2 text-left">
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block">
            Manual Feed Link (Outlook / Samsung)
          </span>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 select-all font-mono text-[9px] text-indigo-400 break-all">
            {httpUrl}
          </div>
        </div>
      </div>
    </div>
  );
}
