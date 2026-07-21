"use client";

import React, { useState, useRef } from "react";

interface CalendarEvent {
  title: string;
  artist: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
}

export default function DashboardPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"flyer" | "schedule">("flyer");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Intent validation modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [intentType, setIntentType] = useState<"direct_sync" | "shareable_link" | null>(null);
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenModal = (type: "direct_sync" | "shareable_link") => {
    setIntentType(type);
    setIsModalOpen(true);
    setIsSubmitted(false);
  };

  const handleIntentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    try {
      await fetch("/api/intent-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, intentType }),
      });
      setIsSubmitted(true);
    } catch (error) {
      console.error("Error submitting intent signup:", error);
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert uploaded image file to Base64 string for preview and post FormData to API route proxy
  const processImageFile = async (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin");

      const response = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      const eventsList = Array.isArray(data) ? data : data.events;
      if (eventsList) {
        setEvents(eventsList);
        setActiveTab("schedule");
      } else {
        console.error("Failed to parse schedule:", data.error || data.details);
      }
    } catch (error) {
      console.error("Upstream parsing failure:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const updateEventField = (index: number, field: keyof CalendarEvent, value: string) => {
    const updated = [...events];
    updated[index] = { ...updated[index], [field]: value };
    setEvents(updated);
  };

  const triggerIcsDownload = () => {
    // Basic structural generation for production verification
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
    link.download = "dance-festival-schedule.ics";
    link.click();
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 antialiased font-sans">
      {/* Dynamic Header Block */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-lg">⚡</div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">FlyerToCalendar</h1>
        </div>
        {events.length > 0 && (
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <button
              onClick={() => handleOpenModal("direct_sync")}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium rounded-lg text-sm transition-all flex items-center gap-1.5 shadow-sm"
            >
              ⚡ Sync directly to Calendar
            </button>
            <button
              onClick={() => handleOpenModal("shareable_link")}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium rounded-lg text-sm transition-all flex items-center gap-1.5 shadow-sm"
            >
              🔗 Create Shareable Live Schedule Link
            </button>
            <button onClick={triggerIcsDownload} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg shadow-lg shadow-emerald-950/20 transition-all text-sm flex items-center gap-2">
              <span>💾 Export .ICS File</span>
            </button>
          </div>
        )}
      </header>

      {/* Mobile-Only Tab Switcher Controls */}
      <div className="flex md:hidden bg-slate-950 border-b border-slate-800 shrink-0">
        <button onClick={() => setActiveTab("flyer")} className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-all ${activeTab === "flyer" ? "border-emerald-500 text-emerald-400 bg-slate-900" : "border-transparent text-slate-400"}`}>
          📸 Schedule Graphic
        </button>
        <button onClick={() => setActiveTab("schedule")} className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-all ${activeTab === "schedule" ? "border-emerald-500 text-emerald-400 bg-slate-900" : "border-transparent text-slate-400"}`}>
          📊 Data Sheet ({events.length})
        </button>
      </div>

      {/* Responsive Workspace Grid Splitter */}
      <main className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        
        {/* Left Pane: Interactive Dropzone Image Presenter */}
        <section className={`flex-1 flex flex-col p-6 bg-slate-900/50 overflow-y-auto ${activeTab === "flyer" ? "flex" : "hidden md:flex"} border-r border-slate-800`}>
          <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} className="flex-1 min-h-[350px] border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl bg-slate-950/40 cursor-pointer flex flex-col items-center justify-center p-8 text-center transition-all group relative overflow-hidden">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            
            {imagePreview ? (
              <img src={imagePreview} alt="Target Schedule" className="w-full h-full object-contain rounded-lg" />
            ) : (
              <div className="max-w-sm flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-slate-900 flex items-center justify-center mb-4 border border-slate-850 group-hover:scale-110 transition-transform duration-200">✨</div>
                <p className="font-semibold text-slate-200 mb-1 text-base md:text-lg">Drag & drop your festival flyer</p>
                <p className="text-xs text-slate-500 px-4">Supports PNG, JPEG screenshots straight from your photo library or camera roll</p>
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-fade-in">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-semibold text-emerald-400 tracking-wide text-sm animate-pulse">GEMINI ENGINE EXTRACTING GRID SCHEMATICS...</p>
                <p className="text-xs text-slate-500 mt-1">Isolating concurrent rooms and mapping timeline date shifts</p>
              </div>
            )}
          </div>
        </section>

        {/* Right Pane: Live Spreadsheet Event Grid */}
        <section className={`flex-1 flex flex-col bg-slate-950 ${activeTab === "schedule" ? "flex" : "hidden md:flex"} overflow-hidden`}>
          {events.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-sm font-medium">No schedule items extracted yet.</p>
              <p className="text-xs text-slate-600 text-center max-w-xs mt-1">Upload a timetable flyer image on the left window block to hydrate the system.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-6 py-4 bg-slate-900/30 border-b border-slate-800 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Extracted Time Slots</span>
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-semibold">{events.length} Active Tracks</span>
              </div>
              
              {/* Dynamic Scrolling Data View */}
              <div className="flex-1 overflow-auto p-4 md:p-6 space-y-3">
                {events.map((event, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 transition-colors">
                    <div className="sm:col-span-2 lg:col-span-1">
                      <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1">Class/Workshop Title</label>
                      <input type="text" value={event.title} onChange={(e) => updateEventField(idx, "title", e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500 text-slate-200" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1">Instructors / Artists</label>
                      <input type="text" value={event.artist} onChange={(e) => updateEventField(idx, "artist", e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500 text-slate-300" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1">Assigned Stage / Room</label>
                      <input type="text" value={event.room} onChange={(e) => updateEventField(idx, "room", e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500 text-slate-300" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1">ISO Target Date</label>
                      <input type="date" value={event.date} onChange={(e) => updateEventField(idx, "date", e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500 text-slate-300" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1">Start Time</label>
                      <input type="time" value={event.startTime} onChange={(e) => updateEventField(idx, "startTime", e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500 text-slate-300" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1">End Time</label>
                      <input type="time" value={event.endTime} onChange={(e) => updateEventField(idx, "endTime", e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500 text-slate-300" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Lead Capture Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-xl font-bold p-1 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              ✕
            </button>

            {!isSubmitted ? (
              <div>
                <h2 className="text-xl font-bold text-slate-100 mb-2">
                  Feature Launching Soon
                </h2>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                  Direct sync and shareable link coming soon! Enter your email to get early access + 5 free parses.
                </p>

                <form onSubmit={handleIntentSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? "Submitting..." : "Get Early Access"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="text-center py-4 space-y-4">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center text-2xl mx-auto">
                  🎉
                </div>
                <h2 className="text-xl font-bold text-slate-100">
                  You're on the list!
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Thank you for signing up! We'll notify you as soon as early access opens.
                </p>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 text-sm transition-all"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
