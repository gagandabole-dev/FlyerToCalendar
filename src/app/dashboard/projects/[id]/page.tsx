"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { canExportProject } from "@/lib/permissions";

interface ScheduleItem {
  id?: string;
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
  user_id: string;
  created_at: string;
}

export default function ProjectEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [user, setUser] = useState<any>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sharing Modal & QR Card
  const [showShareModal, setShowShareModal] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [copied, setCopied] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const checkAuthAndFetchDetails = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);

      // Fetch project
      const { data: pData, error: pError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();

      if (pError || !pData) {
        setErrorMessage("Project not found or access denied.");
        setLoading(false);
        return;
      }
      setProject(pData as Project);
      setCustomLabel(`${pData.event_name} Schedule`);

      // Fetch schedules
      const { data: sData, error: sError } = await supabase
        .from("schedules")
        .select("*")
        .eq("project_id", id)
        .order("start_time", { ascending: true });

      if (sData && !sError) {
        // Format ISO timestamps to browser time input format or simple format
        const formatted = sData.map((item: any) => {
          const sDate = new Date(item.start_time);
          const eDate = new Date(item.end_time);

          // Get local date YYYY-MM-DD
          const tzOffset = sDate.getTimezoneOffset() * 60000;
          const localSDate = new Date(sDate.getTime() - tzOffset);
          const localEDate = new Date(eDate.getTime() - tzOffset);

          const dateStr = localSDate.toISOString().split("T")[0];
          const startTimeStr = localSDate.toISOString().split("T")[1].substring(0, 5);
          const endTimeStr = localEDate.toISOString().split("T")[1].substring(0, 5);

          return {
            id: item.id,
            title: item.title,
            artist: item.artist || "",
            date: dateStr, // stored locally for input binds
            startTime: startTimeStr,
            endTime: endTimeStr,
            room: item.room || "",
          };
        });
        setSchedules(formatted as any);
      }
      setLoading(false);
    };

    checkAuthAndFetchDetails();
  }, [id, router]);

  const handleUpdateField = (index: number, field: string, value: string) => {
    const updated = [...schedules];
    updated[index] = { ...updated[index], [field]: value };
    setSchedules(updated);
  };

  const handleDeleteItem = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const handleAddCustomItem = () => {
    const newItem = {
      title: "New Session / Class",
      artist: "Instructor / Artist",
      date: new Date().toISOString().split("T")[0],
      startTime: "14:00",
      endTime: "15:00",
      room: "Room A",
    };
    setSchedules([...schedules, newItem as any]);
  };

  const handleSaveChanges = async () => {
    if (!project || saving) return;

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // 1. Delete all existing schedules for this project
      const { error: dError } = await supabase
        .from("schedules")
        .delete()
        .eq("project_id", project.id);

      if (dError) throw new Error(dError.message);

      // 2. Insert updated schedules list
      const scheduleInserts = schedules.map((item: any) => {
        const startISO = new Date(`${item.date}T${item.startTime}:00`).toISOString();
        const endISO = new Date(`${item.date}T${item.endTime}:00`).toISOString();

        return {
          project_id: project.id,
          title: item.title,
          artist: item.artist,
          start_time: startISO,
          end_time: endISO,
          room: item.room,
        };
      });

      const { error: iError } = await supabase
        .from("schedules")
        .insert(scheduleInserts);

      if (iError) throw new Error(iError.message);

      setSuccessMessage("Changes saved successfully!");
      
      // Auto dismiss success notice
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleStripeCheckout = async () => {
    if (!project) return;
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to initiate payment checkout.");
      }
    } catch (e) {
      console.error(e);
      alert("Error triggering payment gate.");
    }
  };

  // Calendar Exports
  const triggerCombinedIcsDownload = () => {
    if (schedules.length === 0) return;
    
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//FlyerToCalendar//NONSGML v1.0//EN\n";
    schedules.forEach((item: any) => {
      const cleanDate = item.date.replace(/-/g, "");
      const startClean = item.startTime.replace(/:/g, "") + "00";
      const endClean = item.endTime.replace(/:/g, "") + "00";
      icsContent += `BEGIN:VEVENT\nSUMMARY:${item.title} - ${item.artist}\nDTSTART:${cleanDate}T${startClean}\nDTEND:${cleanDate}T${endClean}\nLOCATION:${item.room}\nEND:VEVENT\n`;
    });
    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${project?.event_name.toLowerCase().replace(/\s+/g, "-")}-schedule.ics`;
    link.click();

    // Log analytics
    supabase.from("analytics_events").insert({
      event_type: "ics_export",
      project_id: project?.id,
    });
  };

  const downloadSvgFlyer = () => {
    const svgEl = document.getElementById("qr-flyer-svg");
    if (!svgEl) return;
    const svgString = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = `${customLabel.toLowerCase().replace(/\s+/g, "-")}-qr-flyer.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(sharedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="flex items-center gap-2">
          <span className="animate-spin text-sm">🔄</span>
          <span className="text-slate-400 text-sm">Loading project schedule...</span>
        </div>
      </main>
    );
  }

  if (errorMessage && !project) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <p className="text-rose-400 font-semibold">{errorMessage}</p>
        <Link href="/dashboard" className="px-5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-200">
          ← Back to Dashboard
        </Link>
      </main>
    );
  }

  const exportAllowed = canExportProject(user?.email, project?.status);

  // Generate dynamic Vercel project viewer URL
  const sharedUrl = `https://flyertocalendar.vercel.app/project/${project?.id}`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(sharedUrl)}&color=0f172a&bgcolor=ffffff`;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-4 md:p-8 selection:bg-indigo-500 selection:text-white">
      <div className="max-w-4xl w-full space-y-8 mt-4 md:mt-8">
        
        {/* Top Header Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-900 pb-6">
          <div className="space-y-1.5">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              {project?.event_name}
            </h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSaveChanges}
              disabled={saving}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white transition text-xs font-bold rounded-lg border border-slate-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "💾 Save Changes"}
            </button>
            
            {exportAllowed ? (
              <>
                <button
                  onClick={triggerCombinedIcsDownload}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-bold rounded-lg transition"
                >
                  📥 Export Combined .ICS
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition shadow-md shadow-indigo-600/20"
                >
                  🔗 Share Assets & QR
                </button>
              </>
            ) : (
              <button
                onClick={handleStripeCheckout}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition shadow-md shadow-indigo-600/20 animate-pulse"
              >
                🔓 Unlock Exports & QR (€29)
              </button>
            )}
          </div>
        </div>

        {/* Notices */}
        {successMessage && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/35 rounded-xl text-emerald-350 text-xs text-left">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/35 rounded-xl text-rose-350 text-xs text-left">
            {errorMessage}
          </div>
        )}

        {/* Gate Banner for Unpaid Draft Status */}
        {!exportAllowed && (
          <div className="p-6 bg-slate-900/80 border border-slate-850 rounded-2xl text-left space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <h3 className="text-base font-bold text-white">Exports & Public Schedule Assets are Locked</h3>
                <p className="text-xs text-slate-400">Unlock full access to download combined schedules and generate social sharing QR codes.</p>
              </div>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <button
                onClick={handleStripeCheckout}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition shadow-md"
              >
                Activate One-Time Event Pass (€29)
              </button>
              <span className="text-xs text-slate-500">Instant activation • Single-event pass • Unlimited public scans</span>
            </div>
          </div>
        )}

        {/* Agenda Editor Grid */}
        <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-6 shadow-xl space-y-6 backdrop-blur-md">
          <h2 className="text-lg font-bold text-white text-left border-b border-slate-850 pb-4 flex items-center gap-2">
            <span>🗓️</span>
            Event Schedule Timetable
          </h2>

          <div className="space-y-4">
            {schedules.length === 0 ? (
              <div className="text-slate-500 text-center py-8 text-xs">
                No items in schedule. Add one below to get started.
              </div>
            ) : (
              <div className="space-y-3 text-left">
                {schedules.map((item: any, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-850/80 hover:border-slate-800 rounded-xl p-4 space-y-3 relative transition">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1">Session / Class Title</label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => handleUpdateField(idx, "title", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1">Instructors / Artists</label>
                        <input
                          type="text"
                          value={item.artist}
                          onChange={(e) => handleUpdateField(idx, "artist", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-350 focus:outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1">Stage / Room</label>
                        <input
                          type="text"
                          value={item.room}
                          onChange={(e) => handleUpdateField(idx, "room", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-350 focus:outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1">Date</label>
                        <input
                          type="date"
                          value={item.date}
                          onChange={(e) => handleUpdateField(idx, "date", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-350 focus:outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1">Start</label>
                          <input
                            type="time"
                            value={item.startTime}
                            onChange={(e) => handleUpdateField(idx, "startTime", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-350 focus:outline-none focus:border-indigo-500 transition"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1">End</label>
                          <input
                            type="time"
                            value={item.endTime}
                            onChange={(e) => handleUpdateField(idx, "endTime", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-350 focus:outline-none focus:border-indigo-500 transition"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end border-t border-slate-900/50">
                      <button
                        onClick={() => handleDeleteItem(idx)}
                        className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 hover:underline transition"
                      >
                        🗑️ Remove Event
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-start">
              <button
                onClick={handleAddCustomItem}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-750 text-xs font-semibold rounded-lg text-slate-200 hover:text-white transition flex items-center gap-1"
              >
                ➕ Add Custom Event
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Share Assets / QR Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-xl font-bold p-1 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              ✕
            </button>

            <div className="text-center space-y-6">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Shareable Event Assets</h3>
                <p className="text-xs text-slate-400">Share your live schedule on Instagram, Facebook, and link-in-bios.</p>
              </div>

              {/* Dynamic Branded SVG Card with Editable Label & Actual Scannable QR Code */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 shadow-inner flex justify-center">
                <svg id="qr-flyer-svg" width="260" height="360" viewBox="0 0 260 360" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Background rect */}
                  <rect width="260" height="360" rx="16" fill="#0f172a"/>
                  <rect x="1" y="1" width="258" height="358" rx="15" stroke="#1e293b" strokeWidth="2"/>
                  
                  {/* Styled Header Text using foreignObject for text wrapping & auto-sizing */}
                  <foreignObject x="15" y="22" width="230" height="48">
                    <div xmlns="http://www.w3.org/1999/xhtml" style={{
                      color: "#818cf8",
                      fontFamily: "sans-serif",
                      fontSize: "14px",
                      fontWeight: "bold",
                      textAlign: "center",
                      lineHeight: "1.25",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}>
                      {customLabel || "Event Schedule"}
                    </div>
                  </foreignObject>

                  {/* Subtitle */}
                  <text x="130" y="86" fill="#94a3b8" fontFamily="sans-serif" fontSize="9" textAnchor="middle">
                    Scan to add the schedule to your calendar
                  </text>
                  
                  {/* White background card for QR Code to pop and scan successfully */}
                  <rect x="55" y="106" width="150" height="150" rx="8" fill="#ffffff" />

                  {/* Real Scannable QR Code Image */}
                  <image href={qrCodeImageUrl} x="60" y="111" width="140" height="140" />
                  
                  {/* Footer branding */}
                  <text x="130" y="302" fill="#818cf8" fontFamily="sans-serif" fontSize="11" fontWeight="bold" textAnchor="middle">
                    ⚡ FlyerToCalendar
                  </text>
                  <text x="130" y="322" fill="#64748b" fontFamily="sans-serif" fontSize="9" textAnchor="middle">
                    flyertocalendar.vercel.app
                  </text>
                </svg>
              </div>

              {/* Editable Label Form Input */}
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block">Custom QR Label Text</label>
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="e.g. Bachata King Festival Schedule"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-3">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex items-center justify-between gap-3 text-left">
                  <span className="text-xs font-mono text-indigo-400 truncate">{sharedUrl}</span>
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-md border border-slate-700 text-slate-200 hover:text-white transition shrink-0"
                  >
                    {copied ? "Copied! ✅" : "Copy"}
                  </button>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={downloadSvgFlyer}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-md flex items-center justify-center gap-1.5"
                  >
                    💾 Download QR Card
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`Scan to view the live schedule for ${customLabel}: ${sharedUrl}`);
                      alert("Social media share copy copied to clipboard!");
                    }}
                    className="flex-1 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 rounded-lg text-xs font-bold transition"
                  >
                    📱 Copy Share Text
                  </button>
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
