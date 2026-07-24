"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import ExportModal from "@/components/ExportModal";
import { normalizeDateStr } from "@/lib/dateUtils";

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
  const [flyerDateContext, setFlyerDateContext] = useState("");
  const [fileDates, setFileDates] = useState<string[]>([]);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [tempDate, setTempDate] = useState("");
  const [tempExtractedEvents, setTempExtractedEvents] = useState<CalendarEvent[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [anonProjectId, setAnonProjectId] = useState<string | null>(null);
  const [anonCreating, setAnonCreating] = useState(false);
  
  // Organizer waitlist
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState(false);

  // Sharing Modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customLabel, setCustomLabel] = useState("Bachata Greece Festival Schedule");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compact serialization helper functions for scan-friendly low-density QR codes
  const encodeEvents = (eventsList: CalendarEvent[]): string => {
    try {
      const flatString = eventsList.map(e => {
        const t = (e.title || "Untitled").replace(/[|;]/g, " ");
        const a = (e.artist || "").replace(/[|;]/g, " ");
        const d = e.date || "";
        const s = e.startTime || "";
        const end = e.endTime || "";
        const r = (e.room || "").replace(/[|;]/g, " ");
        return `${t}|${a}|${d}|${s}|${end}|${r}`;
      }).join(";");
      return btoa(unescape(encodeURIComponent(flatString)));
    } catch (e) {
      console.error("Failed to encode events", e);
      return "";
    }
  };

  const decodeEvents = (encoded: string): CalendarEvent[] => {
    try {
      const flatString = decodeURIComponent(escape(atob(encoded)));
      if (!flatString) return [];
      return flatString.split(";").map(row => {
        const [title, artist, date, startTime, endTime, room] = row.split("|");
        return {
          title: title || "Untitled Event",
          artist: artist || "",
          date: date || new Date().toISOString().split("T")[0],
          startTime: startTime || "12:00",
          endTime: endTime || "13:00",
          room: room || "Main Stage"
        };
      });
    } catch (e) {
      console.error("Failed to decode events", e);
      return [];
    }
  };

  // Client-side query parameters import check
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const importData = params.get("import");
    if (importData) {
      try {
        const parsedEvents = decodeEvents(importData);
        if (parsedEvents.length > 0) {
          setEvents(parsedEvents);
          
          // Generate & trigger immediate download of the calendar .ics file to reduce friction
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
          parsedEvents.forEach(event => {
            const normDate = normalizeDateStr(event.date);
            const sDate = new Date(`${normDate}T${event.startTime || "12:00"}`);
            let eDate = new Date(`${normDate}T${event.endTime || "13:00"}`);
            
            if (eDate <= sDate) {
              eDate.setDate(eDate.getDate() + 1);
            }

            const pad = (num: number) => String(num).padStart(2, "0");
            const cleanStartDate = `${sDate.getFullYear()}${pad(sDate.getMonth() + 1)}${pad(sDate.getDate())}`;
            const startClean = `${pad(sDate.getHours())}${pad(sDate.getMinutes())}00`;
            const cleanEndDate = `${eDate.getFullYear()}${pad(eDate.getMonth() + 1)}${pad(eDate.getDate())}`;
            const endClean = `${pad(eDate.getHours())}${pad(eDate.getMinutes())}00`;

            const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@flyertocalendar.app`;
            icsContent += `BEGIN:VEVENT
UID:${uid}
SUMMARY:${event.title} - ${event.artist || ""}
DTSTART;TZID=Europe/Berlin:${cleanStartDate}T${startClean}
DTEND;TZID=Europe/Berlin:${cleanEndDate}T${endClean}
LOCATION:${event.room || ""}
END:VEVENT
`;
          });
          icsContent += "END:VCALENDAR";
          icsContent = icsContent.replace(/\r?\n/g, "\r\n");

          const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = "festival-events.ics";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          setErrorMessage("Importing schedule... Your calendar file (.ics) has been downloaded automatically. If the download did not start, click 'Export Calendar' below.");
        }
      } catch (e) {
        console.error("Failed to parse imported events", e);
      }
    }
  }, []);

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

    const maxFiles = 1;
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

    setFileDates((prev) => {
      const next = [...prev];
      while (next.length < newFiles.length) {
        next.push("");
      }
      return next.slice(0, maxFiles);
    });
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    setPreviews(updatedPreviews);
    setFileDates((prev) => prev.filter((_, i) => i !== index));
    setErrorMessage(null);
  };

  const handleUpload = async (forcedDate?: string) => {
    if (loading || cooldown > 0 || files.length === 0) return;
 
    setLoading(true);
    setEvents([]);
    setErrorMessage(null);
 
    const activeDate = forcedDate !== undefined ? forcedDate : "";
 
    try {
      const allExtractedEvents: CalendarEvent[] = [];
      let successCount = 0;
 
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileDate = fileDates[i] || activeDate;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin");
        if (fileDate) {
          formData.append("baseDate", fileDate);
        }
 
        const res = await fetch("/api/parse", {
          method: "POST",
          body: formData,
        });
 
        const data = await res.json();
        const extracted = Array.isArray(data) ? data : data.events;
 
        if (res.ok && extracted) {
          const formatted = extracted.map((evt: any) => ({
            title: evt.title || "Untitled Event",
            artist: evt.artist || "",
            date: fileDate || evt.date || new Date().toISOString().split("T")[0],
            startTime: evt.startTime || evt.start_time || "12:00",
            endTime: evt.endTime || evt.end_time || "13:00",
            room: evt.room || evt.location || "Main Stage",
          }));
          allExtractedEvents.push(...formatted);
          successCount++;
        } else {
          setErrorMessage(data.error || "Gemini AI API rate limit reached. Please wait a few seconds and try again.");
          break;
        }
      }
 
      if (successCount === files.length) {
        const hasMissingDate = allExtractedEvents.some((e) => e.date === "date_missing");
        if (hasMissingDate) {
          setTempExtractedEvents(allExtractedEvents);
          setTempDate("");
          setShowDatePickerModal(true);
        } else {
          setEvents(allExtractedEvents);
          if (userMode === "organizer") {
            createAnonymousProject("Public Flyer Schedule", allExtractedEvents);
          }
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
  const createAnonymousProject = async (eventName: string, eventsList: CalendarEvent[]) => {
    setAnonCreating(true);
    setAnonProjectId(null);
    try {
      const res = await fetch("/api/projects/create-anonymous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventName, events: eventsList }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnonProjectId(data.projectId);
      }
    } catch (err) {
      console.error("Failed to create anonymous project feed:", err);
    } finally {
      setAnonCreating(false);
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

    const downloadChunk = (chunk: CalendarEvent[], partNum: number) => {
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
      chunk.forEach((item: any) => {
        const sTimeStr = item.start_time || item.startTime;
        const eTimeStr = item.end_time || item.endTime;
        
        let sDate: Date;
        let eDate: Date;
        
        if (sTimeStr && sTimeStr.includes("T")) {
          sDate = new Date(sTimeStr);
        } else {
          const normDate = normalizeDateStr(item.date);
          sDate = new Date(`${normDate}T${item.startTime || "12:00"}`);
        }

        if (eTimeStr && eTimeStr.includes("T")) {
          eDate = new Date(eTimeStr);
        } else {
          const normDate = normalizeDateStr(item.date);
          eDate = new Date(`${normDate}T${item.endTime || "13:00"}`);
        }

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
SUMMARY:${item.title} - ${item.artist || ""}
DTSTART;TZID=Europe/Berlin:${cleanStartDate}T${startClean}
DTEND;TZID=Europe/Berlin:${cleanEndDate}T${endClean}
LOCATION:${item.room || item.location || ""}
END:VEVENT
`;
      });
      icsContent += "END:VCALENDAR";
      icsContent = icsContent.replace(/\r?\n/g, "\r\n");

      const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = calendarName ? `${calendarName}-part${partNum}.ics` : `events-part${partNum}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    if (events.length <= 10) {
      downloadChunk(events, 1);
    } else {
      const chunkSize = 10;
      for (let i = 0; i < events.length; i += chunkSize) {
        const chunk = events.slice(i, i + chunkSize);
        const partNum = Math.floor(i / chunkSize) + 1;
        setTimeout(() => {
          downloadChunk(chunk, partNum);
        }, (i / chunkSize) * 300);
      }
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(sharedUrl);
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

  // Download dynamically generated styled SVG QR Flyer
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

  // Generate dynamic compressed Base64 sharing link containing the events state
  const getSharedUrl = () => {
    const baseOrigin = typeof window !== "undefined" ? window.location.origin : "https://flyertocalendar.vercel.app";
    if (events.length === 0) return `${baseOrigin}/`;
    const encoded = encodeEvents(events);
    return encoded 
      ? `${baseOrigin}/?import=${encoded}`
      : `${baseOrigin}/`;
  };

  const sharedUrl = getSharedUrl();
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(sharedUrl)}&color=0f172a&bgcolor=ffffff`;

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

        {/* Organizer Portal Entry Banner */}
        {userMode === "organizer" && (
          <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-2xl max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-left backdrop-blur-md">
            <div className="space-y-0.5">
              <p className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <span>🔑</span> Unlock Pro Features
              </p>
              <p className="text-xs text-slate-400">
                Without signing in, you can only upload 1 image. **Sign in / Sign up** to upload up to 10 images and download your shareable QR card!
              </p>
            </div>
            <Link
              href="/login"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-lg text-white transition shadow-md shadow-indigo-600/20 shrink-0"
            >
              Sign In / Sign Up
            </Link>
          </div>
        )}

        {/* Primary Interactive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Dropzone uploads */}
          <div className="lg:col-span-5 bg-slate-900/60 border border-slate-850 rounded-2xl p-6 shadow-xl space-y-6 backdrop-blur-md">
            <h2 className="text-lg font-bold text-white text-left flex items-center gap-2">
              <span>{userMode === "user" ? "📸" : "📚"}</span>
              {userMode === "user" ? "Upload Flyer Graphic" : "Upload Flyer Graphic (1 Image Limit)"}
            </h2>

            {/* Dropzone area */}
            {previews.length < 1 ? (
              <label className="border-2 border-dashed border-slate-800 hover:border-indigo-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/40 min-h-[220px] group">
                <div className="space-y-3 text-center">
                  <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                    <span>➕</span>
                  </div>
                  <p className="text-sm text-slate-300 font-medium">Click to select image file</p>
                  <p className="text-xs text-slate-500">Supports PNG, JPG, or WEBP (1 Image Limit)</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  multiple={false}
                  className="hidden"
                  ref={fileInputRef}
                />
              </label>
            ) : null}

            {/* Preview List */}
            {previews.length > 0 && (
              <div className="space-y-2.5 text-left">
                {previews.map((preview, idx) => (
                  <div key={idx} className="relative bg-slate-950/60 border border-slate-850 p-4 rounded-xl flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <img src={preview} alt={`Flyer Preview ${idx + 1}`} className="w-12 h-12 object-cover rounded-lg border border-slate-800" />
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-xs font-bold text-slate-300 truncate">{files[idx]?.name || `Flyer_Graphic_${idx + 1}.png`}</p>
                        <p className="text-[10px] text-slate-500">Ready to parse</p>
                      </div>
                      <button
                        onClick={() => removeFile(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-900 transition-colors text-xs"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="border-t border-slate-850/40 pt-2.5 flex flex-col gap-1.5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Flyer Date Context:</label>
                        <input
                          type="date"
                          value={fileDates[idx] || ""}
                          onChange={(e) => {
                            const newDates = [...fileDates];
                            newDates[idx] = e.target.value;
                            setFileDates(newDates);
                          }}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors w-full sm:w-auto"
                        />
                      </div>
                      <p className="text-[9px] text-slate-500 leading-normal">
                        Provide date if flyer has no date (e.g. shows weekdays like "Saturday" or days like "Day 1").
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error / Notice notifications */}
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
              onClick={() => handleUpload()}
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
                    onClick={() => triggerIcsDownload("flyer")}
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
                    onClick={() => triggerIcsDownload("flyer")}
                    className="flex-1 py-2.5 px-4 rounded-xl font-bold bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-white transition border border-slate-750 flex items-center justify-center gap-2 text-xs shadow-md"
                  >
                    💾 Download .ICS
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
                <p className="text-xs text-slate-655 text-center max-w-xs mt-1 leading-relaxed">
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
                          <label className="text-[10px] font-bold tracking-wider text-slate-550 uppercase block mb-1">Stage / Room</label>
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
                      onClick={() => triggerIcsDownload("flyer")}
                      className="flex-1 py-3 px-5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center justify-center gap-2 text-sm shadow-md"
                    >
                      <span className="flex items-center gap-1.5">💾 Export Calendar (.ICS)</span>
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-center space-y-6">
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-xl font-bold p-1 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              ✕
            </button>

            <div className="space-y-2">
              <span className="text-4xl block">🔒</span>
              <h3 className="text-lg font-bold text-white">QR Card Assets are Locked</h3>
              <p className="text-xs text-slate-455 leading-relaxed">
                To download your branded scannable QR card and upload up to 10 flyers concurrently, create a free Organizer account!
              </p>
            </div>

            {/* Beautiful Dummy QR Card Preview */}
            <div className="flex justify-center py-1 relative group">
              <div className="relative filter blur-[0.5px] opacity-75 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl scale-90 bg-slate-950">
                <svg width="200" height="276" viewBox="0 0 260 360" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Background rect */}
                  <rect width="260" height="360" rx="16" fill="#0f172a"/>

                  {/* Header card branding */}
                  <rect x="20" y="20" width="220" height="52" rx="10" fill="#1e293b" />
                  <text x="130" y="44" fill="#ffffff" fontFamily="sans-serif" fontSize="13" fontWeight="bold" textAnchor="middle">
                    Sunday Party!
                  </text>
                  <text x="130" y="60" fill="#94a3b8" fontFamily="sans-serif" fontSize="9" textAnchor="middle">
                    Event Schedule
                  </text>

                  {/* Subtitle */}
                  <text x="130" y="90" fill="#64748b" fontFamily="sans-serif" fontSize="8" textAnchor="middle">
                    Scan to add the schedule to your calendar
                  </text>
                  
                  {/* White background card for QR Code */}
                  <rect x="55" y="106" width="150" height="150" rx="8" fill="#ffffff" />

                  {/* Mock QR Code Image Finder Patterns */}
                  <rect x="67" y="118" width="126" height="126" fill="#e2e8f0" rx="4" />
                  <rect x="75" y="126" width="30" height="30" fill="#0f172a" />
                  <rect x="80" y="131" width="20" height="20" fill="#ffffff" />
                  <rect x="85" y="136" width="10" height="10" fill="#0f172a" />

                  <rect x="153" y="126" width="30" height="30" fill="#0f172a" />
                  <rect x="158" y="131" width="20" height="20" fill="#ffffff" />
                  <rect x="163" y="136" width="10" height="10" fill="#0f172a" />

                  <rect x="75" y="204" width="30" height="30" fill="#0f172a" />
                  <rect x="80" y="209" width="20" height="20" fill="#ffffff" />
                  <rect x="85" y="214" width="10" height="10" fill="#0f172a" />

                  {/* Mock QR modules */}
                  <rect x="120" y="130" width="10" height="20" fill="#0f172a" />
                  <rect x="140" y="145" width="10" height="10" fill="#0f172a" />
                  <rect x="110" y="170" width="30" height="10" fill="#0f172a" />
                  <rect x="150" y="180" width="20" height="30" fill="#0f172a" />
                  <rect x="125" y="200" width="20" height="10" fill="#0f172a" />
                  <rect x="160" y="215" width="15" height="15" fill="#0f172a" />
                  
                  {/* Footer branding */}
                  <text x="130" y="302" fill="#818cf8" fontFamily="sans-serif" fontSize="11" fontWeight="bold" textAnchor="middle">
                    ⚡ FlyerToCalendar
                  </text>
                  <text x="130" y="322" fill="#475569" fontFamily="sans-serif" fontSize="8" textAnchor="middle">
                    flyertocalendar.vercel.app
                  </text>
                </svg>
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="bg-indigo-600/90 text-white font-bold text-[9px] px-2.5 py-1 rounded-full border border-indigo-500 shadow-md">
                  ✨ PRO PREVIEW
                </span>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-left space-y-3">
              <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">Pro features unlocked on sign up:</p>
              <ul className="text-xs text-slate-300 space-y-2 list-inside list-disc">
                <li>Upload up to 10 schedule images concurrently</li>
                <li>Download scannable high-contrast PNG/JPEG QR flyers</li>
                <li>Edit sessions, rooms, artists and reshare QR cards</li>
                <li>Create and manage multiple event projects concurrently</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Link
                href="/login"
                className="block w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20 text-center"
              >
                Sign Up / Sign In (Free)
              </Link>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-full py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
                    if (userMode === "organizer") {
                      createAnonymousProject("Public Flyer Schedule", finalEvents);
                    }
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
                  if (userMode === "organizer") {
                    createAnonymousProject("Public Flyer Schedule", finalEvents);
                  }
                }}
                className="w-full py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 rounded-xl text-xs font-bold transition"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        events={events}
        projectId={anonProjectId || undefined}
        eventName="flyertocalendar"
      />
    </main>
  );
}