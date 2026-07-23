"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

interface CalendarEvent {
  title: string;
  artist: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
}

export default function NewProject() {
  const [user, setUser] = useState<any>(null);
  const [eventName, setEventName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [flyerDateContext, setFlyerDateContext] = useState("");
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [tempDate, setTempDate] = useState("");
  const [tempExtractedEvents, setTempExtractedEvents] = useState<CalendarEvent[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
    };
    checkAuth();
  }, [router]);

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

    const newFiles = [...files, ...selectedFiles].slice(0, 10);
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

  const handleUploadAndParse = async (forcedDate?: string) => {
    if (loading || cooldown > 0 || files.length === 0 || !eventName.trim()) {
      if (!eventName.trim()) {
        setErrorMessage("Please enter an Event Name first.");
      }
      return;
    }
 
    setLoading(true);
    setEvents([]);
    setErrorMessage(null);
 
    const activeDate = forcedDate !== undefined ? forcedDate : flyerDateContext;
 
    try {
      const allExtractedEvents: CalendarEvent[] = [];
      let successCount = 0;
 
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin");
        if (activeDate) {
          formData.append("baseDate", activeDate);
        }
 
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
          date: activeDate || evt.date || new Date().toISOString().split("T")[0],
          startTime: evt.startTime || evt.start_time || "12:00",
          endTime: evt.endTime || evt.end_time || "13:00",
          room: evt.room || evt.location || "Main Stage",
        }));

        const hasMissingDate = formattedEvents.some((e) => e.date === "date_missing");
        if (hasMissingDate) {
          setTempExtractedEvents(formattedEvents);
          setTempDate("");
          setShowDatePickerModal(true);
        } else {
          setEvents(formattedEvents);
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Error processing flyer upload. Please try again.");
    } finally {
      setLoading(false);
      startCooldown();
    }
  };

  const handleSaveProject = async () => {
    if (!eventName.trim() || events.length === 0 || saving || !user) return;

    setSaving(true);
    setErrorMessage(null);

    try {
      // 1. Create project
      const { data: project, error: pError } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          event_name: eventName,
          status: "draft",
        })
        .select()
        .single();

      if (pError || !project) {
        throw new Error(pError?.message || "Failed to create project.");
      }

      // 2. Insert schedule items
      const scheduleInserts = events.map((event) => {
        // Safe parsing of date & time boundaries
        const startISO = new Date(`${event.date}T${event.startTime}:00`).toISOString();
        const endISO = new Date(`${event.date}T${event.endTime}:00`).toISOString();

        return {
          project_id: project.id,
          title: event.title,
          artist: event.artist,
          start_time: startISO,
          end_time: endISO,
          room: event.room,
        };
      });

      const { error: sError } = await supabase
        .from("schedules")
        .insert(scheduleInserts);

      if (sError) {
        throw new Error(sError.message || "Failed to save schedule items.");
      }

      // 3. Log analytics
      await supabase.from("analytics_events").insert({
        event_type: "flyer_upload",
        project_id: project.id,
      });

      // 4. Redirect to editor
      router.push(`/dashboard/projects/${project.id}`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Error saving project.");
      setSaving(false);
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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-4 md:p-8 selection:bg-indigo-500 selection:text-white">
      <div className="max-w-4xl w-full space-y-8 mt-4 md:mt-8">
        
        {/* Navigation back */}
        <div className="text-left">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1.5"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="text-left space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Create New Event Project
          </h1>
          <p className="text-slate-400 text-xs">
            Enter your event title, upload the schedule flyers, and review the extracted agenda.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form details & uploads */}
          <div className="lg:col-span-5 bg-slate-900/60 border border-slate-850 rounded-2xl p-6 shadow-xl space-y-6 backdrop-blur-md">
            
            {/* Project Details */}
            <div className="space-y-4 text-left">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>📝</span> Event Information
              </h2>
              <div>
                <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1.5">
                  Event Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Berlin Bachata Congress 2026"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <hr className="border-slate-850" />

            {/* Timetable upload */}
            <div className="space-y-4 text-left">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>📚</span> Upload Timetable Flyers
              </h2>

              {previews.length < 10 ? (
                <label className="border-2 border-dashed border-slate-800 hover:border-indigo-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/40 min-h-[160px] group">
                  <div className="space-y-3 text-center">
                    <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                      <span>➕</span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">Click to select files</p>
                    <p className="text-[10px] text-slate-500">PNG, JPG, or WEBP (Max 10)</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    multiple
                    className="hidden"
                    ref={fileInputRef}
                  />
                </label>
              ) : null}

              {/* Previews */}
              {previews.length > 0 && (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {previews.map((preview, idx) => (
                    <div key={idx} className="relative bg-slate-950/60 border border-slate-850 p-2.5 rounded-xl flex items-center gap-3">
                      <img src={preview} alt={`Flyer Preview ${idx + 1}`} className="w-12 h-12 object-cover rounded-lg border border-slate-800" />
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-xs font-bold text-slate-300 truncate">Flyer_Graphic_{idx + 1}.png</p>
                        <p className="text-[10px] text-slate-500">Ready to parse</p>
                      </div>
                      <button
                        onClick={() => removeFile(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-900 transition-colors text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Optional Date Context Picker */}
            <div className="text-left space-y-1.5 pt-2">
              <label className="text-[10px] font-bold tracking-wider text-slate-550 uppercase block">
                Flyer Date Context (Optional)
              </label>
              <input
                type="date"
                value={flyerDateContext}
                onChange={(e) => setFlyerDateContext(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-350 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <p className="text-[9px] text-slate-505 leading-normal">
                If the flyer only shows weekdays (e.g. "Saturday") or days (e.g. "Day 1"), select a date here to help the AI map it.
              </p>
            </div>

            {/* Messages */}
            {errorMessage && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs text-left">
                <p className="font-semibold mb-0.5">Notice</p>
                <p className="text-amber-250/90 leading-relaxed">{errorMessage}</p>
              </div>
            )}

            <button
              onClick={() => {
                if (!eventName.trim()) {
                  setErrorMessage("Please enter an Event Name first.");
                  return;
                }
                handleUploadAndParse();
              }}
              disabled={files.length === 0 || loading || cooldown > 0 || !eventName.trim()}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <span className="animate-spin text-xs">🔄</span>
                  <span>Extracting event matrix...</span>
                </>
              ) : cooldown > 0 ? (
                <span>Please wait ({cooldown}s)...</span>
              ) : (
                <span>Convert to Calendar Events</span>
              )}
            </button>
          </div>

          {/* Right Column: Timetable preview list */}
          <div className="lg:col-span-7 bg-slate-900/60 border border-slate-850 rounded-2xl p-6 shadow-xl space-y-6 backdrop-blur-md flex flex-col min-h-[400px]">
            <h2 className="text-lg font-bold text-white text-left border-b border-slate-850 pb-4 flex items-center gap-2">
              <span>🗓️</span>
              Preview Extracted Timetable
            </h2>

            {events.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-sm font-medium">No events extracted yet.</p>
                <p className="text-xs text-slate-400 text-center max-w-xs mt-1 leading-relaxed">
                  Provide an event title, add your timetable graphics, and click "Convert to Calendar Events" to populate this workspace.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-4">
                {/* Scrollable list */}
                <div className="max-h-[380px] overflow-y-auto space-y-3 pr-1 text-left">
                  {events.map((event, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-850/80 hover:border-slate-800 rounded-xl p-4 space-y-3 relative transition">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1">Session / Class Title</label>
                          <input
                            type="text"
                            value={event.title}
                            onChange={(e) => updateEventField(idx, "title", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1">Instructors / Artists</label>
                          <input
                            type="text"
                            value={event.artist}
                            onChange={(e) => updateEventField(idx, "artist", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-350 focus:outline-none focus:border-indigo-500 transition"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1">Stage / Room</label>
                          <input
                            type="text"
                            value={event.room}
                            onChange={(e) => updateEventField(idx, "room", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-350 focus:outline-none focus:border-indigo-500 transition"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1">Date</label>
                          <input
                            type="date"
                            value={event.date}
                            onChange={(e) => updateEventField(idx, "date", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-350 focus:outline-none focus:border-indigo-500 transition"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1">Start</label>
                            <input
                              type="time"
                              value={event.startTime}
                              onChange={(e) => updateEventField(idx, "startTime", e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-350 focus:outline-none focus:border-indigo-500 transition"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1">End</label>
                            <input
                              type="time"
                              value={event.endTime}
                              onChange={(e) => updateEventField(idx, "endTime", e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-350 focus:outline-none focus:border-indigo-500 transition"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end border-t border-slate-900/50">
                        <button
                          onClick={() => deleteEvent(idx)}
                          className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 hover:underline transition"
                        >
                          🗑️ Remove Event
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Custom Button */}
                <div className="flex justify-start pt-1">
                  <button
                    onClick={addCustomEvent}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-750 text-xs font-semibold rounded-lg text-slate-200 hover:text-white transition flex items-center gap-1"
                  >
                    ➕ Add Custom Event
                  </button>
                </div>

                {/* Save Project Button */}
                <div className="pt-4 border-t border-slate-850">
                  <button
                    onClick={handleSaveProject}
                    disabled={saving}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <span className="animate-spin text-xs">🔄</span>
                        <span>Saving event project...</span>
                      </>
                    ) : (
                      <span>Save & Continue to Editor</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date Context Request Modal */}
      {showDatePickerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-center space-y-6">
            <button
              onClick={() => setShowDatePickerModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-xl font-bold p-1 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              ✕
            </button>
 
            <div className="space-y-2">
              <span className="text-4xl block">📅</span>
              <h3 className="text-lg font-bold text-white">Event Date Request</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                This flyer graphic does not list calendar dates explicitly. Select a date to automatically assign it to the extracted events.
              </p>
            </div>
 
            <div className="text-left space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider text-slate-550 uppercase block">Event Date</label>
              <input
                type="date"
                value={tempDate}
                onChange={(e) => setTempDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
 
            <div className="space-y-3">
              <button
                onClick={() => {
                  if (tempDate) {
                    const finalEvents = tempExtractedEvents.map(e => ({
                      ...e,
                      date: e.date === "date_missing" ? tempDate : e.date
                    }));
                    setEvents(finalEvents);
                    setFlyerDateContext(tempDate);
                    setShowDatePickerModal(false);
                  } else {
                    alert("Please select a date, or click 'Skip' to set today's date.");
                  }
                }}
                disabled={!tempDate}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20"
              >
                Apply Date
              </button>
              <button
                onClick={() => {
                  const todayStr = new Date().toISOString().split("T")[0];
                  const finalEvents = tempExtractedEvents.map(e => ({
                    ...e,
                    date: e.date === "date_missing" ? todayStr : e.date
                  }));
                  setEvents(finalEvents);
                  setShowDatePickerModal(false);
                }}
                className="w-full py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 rounded-xl text-xs font-bold transition"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
