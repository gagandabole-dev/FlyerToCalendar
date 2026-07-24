"use client";

import React, { useState, useEffect } from "react";

interface CalendarEvent {
  id?: string;
  title: string;
  artist?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  start_time?: string;
  end_time?: string;
  room?: string;
  location?: string;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  projectId?: string;
  status?: string;
  userEmail?: string;
  eventName: string;
}

export default function ExportModal({
  isOpen,
  onClose,
  events,
  projectId,
  status,
  userEmail,
  eventName,
}: ExportModalProps) {
  const [origin, setOrigin] = useState("https://flyertocalendar.vercel.app");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  if (!isOpen) return null;

  const isPreview = status !== "paid" && status !== "bypass" && userEmail?.toLowerCase() !== "gagan.dabole@gmail.com";
  const subscribePageUrl = `${origin}/project/${projectId || "dummy"}/subscribe`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    subscribePageUrl
  )}&color=0f172a&bgcolor=ffffff`;

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

    const eventsToExport = isPreview ? events.slice(0, 5) : events;

    eventsToExport.forEach((item: any) => {
      const sTimeStr = item.start_time || item.startTime;
      const eTimeStr = item.end_time || item.endTime;
      
      let sDate: Date;
      let eDate: Date;
      
      if (sTimeStr && sTimeStr.includes("T")) {
        sDate = new Date(sTimeStr);
      } else {
        const dateStr = item.date || new Date().toISOString().split("T")[0];
        sDate = new Date(`${dateStr}T${item.startTime || "12:00"}`);
      }

      if (eTimeStr && eTimeStr.includes("T")) {
        eDate = new Date(eTimeStr);
      } else {
        const dateStr = item.date || new Date().toISOString().split("T")[0];
        eDate = new Date(`${dateStr}T${item.endTime || "13:00"}`);
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
SUMMARY:${item.title}${item.artist ? ` - ${item.artist}` : ""}
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
    link.download = `${eventName.toLowerCase().replace(/\s+/g, "-")}-schedule.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-center space-y-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-xl font-bold p-1 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Close modal"
        >
          ✕
        </button>

        <div className="space-y-2">
          <span className="text-4xl block">📅</span>
          <h3 className="text-xl font-extrabold text-white">Download Calendar</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Download the timetable as an `.ics` file to import all events directly into your phone or desktop calendar.
          </p>
        </div>

        <div className="space-y-5">
          <div className="flex flex-col items-center gap-3">
            <div className="bg-white p-3 rounded-2xl shadow-lg border border-slate-700">
              <img
                src={qrCodeImageUrl}
                alt="Schedule QR Code"
                className="w-44 h-44 object-contain"
              />
            </div>
            <p className="text-[10px] text-slate-400 leading-normal max-w-xs">
              Scan with your phone camera to open this landing page on your mobile device and download the calendar directly!
            </p>
          </div>

          <div className="space-y-3">
            {/* Primary CTA to download static ICS file directly */}
            <button
              onClick={handleIcsDownload}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              📥 Download Calendar File (.ics)
            </button>

            {isPreview ? (
              <div className="bg-amber-500/10 border border-amber-500/25 p-3 rounded-xl text-left">
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Preview Mode</p>
                <p className="text-[11px] text-amber-250 mt-1 leading-normal">
                  Since this event pass is not activated, only the **first 5 events** will be exported. Activate the event pass to unlock the full schedule.
                </p>
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/25 p-3 rounded-xl text-left">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Full Access</p>
                <p className="text-[11px] text-emerald-250 mt-1 leading-normal">
                  You have full access. The complete schedule will be exported.
                </p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-bold transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
