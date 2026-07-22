"use client";

import { useState, useRef } from "react";

interface CalendarEvent {
  title: string;
  artist: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
}

export default function Home() {
  const [userMode, setUserMode] = useState<"user" | "organizer">("user");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Organizer waitlist
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState(false);

  // Sharing Modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCooldown = () => {
    setCooldown(5);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    if (selectedFiles.length === 0) return;

    setErrorMessage(null);

    const maxFiles = userMode === "organizer" ? 10 : 1;
    const newFiles = [...files, ...selectedFiles].slice(0, maxFiles);
    setFiles(newFiles);

    // Generate previews
    const newPreviews: string[] = [];
    let loaded = 0;
    
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        loaded++;
        if (loaded === newFiles.length) {
          setPreviews(newPreviews);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    setPreviews(updatedPreviews);
    setErrorMessage(null);
  };

  const handleUpload = async () => {
    if (loading || cooldown > 0 || files.length === 0) return;

    setLoading(true);
    setEvents([]);
    setErrorMessage(null);

    try {
      const allExtractedEvents: CalendarEvent[] = [];
      let successCount = 0;

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin");

        const res = await fetch("/api/parse", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        const extracted = Array.isArray(data) ? data : data.events;

        if (res.ok && extracted) {
          allExtractedEvents.push(...extracted);
          successCount++;
        } else {
          setErrorMessage(data.error || "Gemini AI API rate limit reached. Please wait a few seconds and try again.");
          break;
        }
      }

      if (successCount === files.length) {
        const formattedEvents = allExtractedEvents.map((evt) => ({
          title: evt.title || "Untitled Event",
          artist: evt.artist || "",
          date: evt.date || new Date().toISOString().split("T")[0],
          startTime: evt.startTime || evt.start_time || "12:00",
          endTime: evt.endTime || evt.end_time || "13:00",
          room: evt.room || evt.location || "Main Stage",
        }));
        setEvents(formattedEvents);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Error processing flyer upload. Please try again.");
    } finally {
      setLoading(false);
      startCooldown();
    }
  };

  const updateEventField = (index: number, field: keyof CalendarEvent, value: string) => {
    const updated = [...events];
    updated[index] = { ...updated[index], [field]: value };
    setEvents(updated);
  };

  const deleteEvent = (index: number) => {
    setEvents(events.filter((_, i) => i !== index));
  };

  const addCustomEvent = () => {
    const newEvent: CalendarEvent = {
      title: "New Session / Class",
      artist: "Instructor / Artist",
      date: new Date().toISOString().split("T")[0],
      startTime: "14:00",
      endTime: "15:00",
      room: "Room 1",
    };
    setEvents([...events, newEvent]);
  };

  // Calendar Exports
  const triggerIcsDownload = (calendarName?: string) => {
    if (events.length === 0) return;
    
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//FlyerToCalendar//NONSGML v1.0//EN\n";
    events.forEach(event => {
      const cleanDate = event.date.replace(/-/g, "");
      const startClean = event.startTime.replace(/:/g, "") + "00";
      const endClean = event.endTime.replace(/:/g, "") + "00";
      icsContent += `BEGIN:VEVENT\nSUMMARY:${event.title} - ${event.artist}\nDTSTART:${cleanDate}T${startClean}\nDTEND:${cleanDate}T${endClean}\nLOCATION:${event.room}\nEND:VEVENT\n`;
    });
    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = calendarName ? `${calendarName}-schedule.ics` : "festival-events.ics";
    link.click();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://flyertocalendar.com/shared/bachata-greece-festival-2026");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      await fetch("/api/intent-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, intent_type: "b2b_organizer_waitlist" }),
      });
      setSubmittedEmail(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleModeChange = (mode: "user" | "organizer") => {
    setUserMode(mode);
    setFiles([]);
    setPreviews([]);
    setEvents([]);
    setErrorMessage(null);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-4 md:p-8 selection:bg-indigo-500 selection:text-white">
      <div className="max-w-4xl w-full text-center space-y-8 mt-4 md:mt-8">
        
        {/* Top Header */}
        <div className="space-y-4">
          <span className="px-3.5 py-1 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 text-indigo-400 rounded-full text-xs font-semibold uppercase tracking-wider border border-indigo-500/20 shadow-sm">
            AI Event Extraction Platform 2.0
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            FlyerToCalendar
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Convert event timetable graphics into structured, editable calendar events with instant sharing options.
          </p>
        </div>

        {/* User Mode Selector Toggle Switch */}
        <div className="flex justify-center">
          <div className="bg-slate-900/80 p-1 rounded-xl border border-slate-800 flex items-center relative shadow-inner">
            <button
              onClick={() => handleModeChange("user")}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-250 flex items-center gap-2 ${
                userMode === "user"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>👤</span> Normal User
            </button>
            <button
              onClick={() => handleModeChange("organizer")}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-250 flex items-center gap-2 ${
                userMode === "organizer"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>⚡</span> Organizer Pro
            </button>
          </div>
        </div>

        {/* Primary Interactive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Dropzone uploads */}
          <div className="lg:col-span-5 bg-slate-900/60 border border-slate-850 rounded-2xl p-6 shadow-xl space-y-6 backdrop-blur-md">
            <h2 className="text-lg font-bold text-white text-left flex items-center gap-2">
              <span>{userMode === "user" ? "📸" : "📚"}</span>
              {userMode === "user" ? "Upload Flyer Graphic" : `Upload Flyer Graphics (Max ${files.length >= 10 ? files.length : 10})`}
            </h2>

            {/* Dropzone area */}
            {previews.length < (userMode === "organizer" ? 10 : 1) ? (
              <label className="border-2 border-dashed border-slate-800 hover:border-indigo-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/40 min-h-[220px] group">
                <div className="space-y-3 text-center">
                  <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                    <span>➕</span>
                  </div>
                  <p className="text-sm text-slate-300 font-medium">Click to select image file</p>
                  <p className="text-xs text-slate-500">Supports PNG, JPG, or WEBP (Up to 10)</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  multiple={userMode === "organizer"}
                  className="hidden"
                  ref={fileInputRef}
                />
              </label>
            ) : null}

            {/* Preview List */}
            {previews.length > 0 && (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {previews.map((preview, idx) => (
                  <div key={idx} className="relative bg-slate-950/60 border border-slate-850 p-3 rounded-xl flex items-center gap-3">
                    <img src={preview} alt={`Flyer Preview ${idx + 1}`} className="w-14 h-14 object-cover rounded-lg border border-slate-800" />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-xs font-bold text-slate-300 truncate">Flyer_Graphic_{idx + 1}.png</p>
                      <p className="text-[10px] text-slate-500">Ready to parse</p>
                    </div>
                    <button
                      onClick={() => removeFile(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-900 transition-colors text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Error notifications */}
            {errorMessage && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-sm text-left flex items-start gap-3">
                <span className="text-lg">⏳</span>
                <div>
                  <p className="font-semibold">Notice</p>
                  <p className="text-xs text-amber-200/80 mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={files.length === 0 || loading || cooldown > 0}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin text-sm">🔄</span>
                  <span>Extracting Event Matrix...</span>
                </>
              ) : cooldown > 0 ? (
                <span>Please wait ({cooldown}s)...</span>
              ) : (
                <span>Convert to Calendar Events</span>
              )}
            </button>
          </div>

          {/* Right Column: Editable review list */}
          <div className="lg:col-span-7 bg-slate-900/60 border border-slate-850 rounded-2xl p-6 shadow-xl space-y-6 backdrop-blur-md flex flex-col min-h-[420px]">
            
            {/* Header and top buttons */}
            <div className="flex flex-col border-b border-slate-800/85 pb-4 shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🗓️</span>
                  Review Extracted Events
                </h2>
                {events.length > 0 && userMode === "user" && (
                  <button
                    onClick={() => triggerIcsDownload("user")}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-lg text-white transition shadow-md flex items-center gap-1.5"
                  >
                    📅 Export to Calendar (.ics)
                  </button>
                )}
              </div>

              {/* Organizer Actions moved directly below header */}
              {events.length > 0 && userMode === "organizer" && (
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => triggerIcsDownload("organizer")}
                    className="flex-1 py-2.5 px-4 rounded-xl font-bold bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-white transition border border-slate-750 flex items-center justify-center gap-2 text-xs shadow-md"
                  >
                    <span>💾</span> Download Combined .ICS
                  </button>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="flex-1 py-2.5 px-4 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center justify-center gap-2 text-xs shadow-lg shadow-indigo-600/20"
                  >
                    <span>🔗</span> Generate Social Link & QR
                  </button>
                </div>
              )}
            </div>

            {/* Empty state */}
            {events.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-sm font-medium">No events parsed yet.</p>
                <p className="text-xs text-slate-650 text-center max-w-xs mt-1 leading-relaxed">
                  Upload {userMode === "organizer" ? "up to 10 flyers" : "your timetable flyer"} on the left panel to populate this interactive grid.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 space-y-4">
                
                {/* Scrolling Grid */}
                <div className="max-h-[440px] overflow-y-auto space-y-3 pr-1 text-left">
                  {events.map((event, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-850/80 hover:border-slate-800 rounded-xl p-4 space-y-3 relative group transition">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1">Session / Class Title</label>
                          <input
                            type="text"
                            value={event.title}
                            onChange={(e) => updateEventField(idx, "title", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1">Instructors / Artists</label>
                          <input
                            type="text"
                            value={event.artist}
                            onChange={(e) => updateEventField(idx, "artist", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1">Stage / Room</label>
                          <input
                            type="text"
                            value={event.room}
                            onChange={(e) => updateEventField(idx, "room", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1">Date</label>
                          <input
                            type="date"
                            value={event.date}
                            onChange={(e) => updateEventField(idx, "date", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1">Start</label>
                            <input
                              type="time"
                              value={event.startTime}
                              onChange={(e) => updateEventField(idx, "startTime", e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1">End</label>
                            <input
                              type="time"
                              value={event.endTime}
                              onChange={(e) => updateEventField(idx, "endTime", e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Row Action Panel (Persistent Visible Remove Button) */}
                      <div className="pt-2 flex justify-end border-t border-slate-900/50">
                        <button
                          onClick={() => deleteEvent(idx)}
                          className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 hover:underline transition"
                        >
                          🗑️ Remove Event
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add custom event at the bottom of the list */}
                <div className="flex justify-start pt-2">
                  <button
                    onClick={addCustomEvent}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-750 text-xs font-semibold rounded-lg text-slate-200 hover:text-white transition flex items-center gap-1"
                  >
                    ➕ Add Custom Event
                  </button>
                </div>

                {/* User mode final export panel */}
                {userMode === "user" && (
                  <div className="pt-4 border-t border-slate-850 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => triggerIcsDownload("user")}
                      className="flex-1 py-3 px-5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center justify-center gap-2 text-sm shadow-md"
                    >
                      <span>💾</span> Export Calendar (.ICS)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Lead waitlist banner */}
        <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 text-center space-y-4 backdrop-blur-md">
          <h2 className="text-xl font-bold text-white">Embed FlyerToCalendar API</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Integrate calendar extraction directly into your ticketing website to increase add-to-calendar rates.
          </p>
          {submittedEmail ? (
            <p className="text-emerald-400 text-sm font-semibold">Thank you! We will reach out shortly.</p>
          ) : (
            <form onSubmit={handleWaitlistSubmit} className="flex gap-2 max-w-md mx-auto">
              <input
                type="email"
                required
                placeholder="organizer@festival.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition"
              >
                Join Waitlist
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Share / QR Code modal for Organizers */}
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

              {/* QR Code Graphic */}
              <div className="bg-white p-4 rounded-xl max-w-[180px] mx-auto shadow-lg">
                <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900">
                  <path fill="currentColor" d="M0 0h30v30H0zM10 10h10v10H10zM70 0h30v30H70zM80 10h10v10H80zM0 70h30v30H0zM10 80h10v10H10zM40 0h20v10H40zM50 20h10v10H50zM30 40h10v20H30zM50 40h20v10H50zM80 40h20v20H80zM40 70h10v30H40zM60 80h30v10H60zM70 90h10v10H70z" />
                  <rect x="42" y="42" width="16" height="16" rx="4" fill="#4f46e5" />
                  <text x="50" y="52" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">F2C</text>
                </svg>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex items-center justify-between gap-3 text-left">
                  <span className="text-xs font-mono text-indigo-400 truncate">https://flyertocalendar.com/shared/bachata-greece-festival-2026</span>
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-md border border-slate-700 text-slate-200 hover:text-white transition shrink-0"
                  >
                    {copied ? "Copied! ✅" : "Copy"}
                  </button>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => alert("Social media sharing assets generated & copied to clipboard.")}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-md"
                  >
                    📱 Copy Instagram Asset
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