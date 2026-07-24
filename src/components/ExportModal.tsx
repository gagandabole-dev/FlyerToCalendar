"use client";

import React, { useState, useEffect } from "react";
import { canExportProject } from "@/lib/permissions";

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
  const [copied, setCopied] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  if (!isOpen) return null;

  const isPro = canExportProject(userEmail, status);
  const host = typeof window !== "undefined" ? window.location.host : "flyertocalendar.vercel.app";
  const protocol = typeof window !== "undefined" ? window.location.protocol : "https:";
  const appUrl = `${protocol}//${host}`;
  const webcalUrl = `webcal://${host}/api/feed/${projectId || "dummy"}`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    webcalUrl
  )}&color=0f172a&bgcolor=ffffff`;

  // Chunk events helper for downloads
  const downloadChunk = (chunk: CalendarEvent[], partNum: number) => {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//FlyerToCalendar//NONSGML v1.0//EN\n";
    chunk.forEach((item: any) => {
      const sTimeStr = item.start_time || item.startTime;
      const eTimeStr = item.end_time || item.endTime;
      const sDate = sTimeStr ? new Date(sTimeStr) : new Date(`${item.date}T${item.startTime}`);
      const eDate = eTimeStr ? new Date(eTimeStr) : new Date(`${item.date}T${item.endTime}`);

      const pad = (num: number) => String(num).padStart(2, "0");
      const cleanDate = `${sDate.getFullYear()}${pad(sDate.getMonth() + 1)}${pad(sDate.getDate())}`;
      const startClean = `${pad(sDate.getHours())}${pad(sDate.getMinutes())}00`;
      const endClean = `${pad(eDate.getHours())}${pad(eDate.getMinutes())}00`;

      icsContent += `BEGIN:VEVENT\nSUMMARY:${item.title} - ${item.artist || ""}\nDTSTART:${cleanDate}T${startClean}\nDTEND:${cleanDate}T${endClean}\nLOCATION:${item.room || item.location || ""}\nEND:VEVENT\n`;
    });
    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${eventName.toLowerCase().replace(/\s+/g, "-")}-part${partNum}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStaticDownload = () => {
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
    navigator.clipboard.writeText(webcalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubscribe = () => {
    setSubscribing(true);
    window.location.href = webcalUrl;
    setTimeout(() => setSubscribing(false), 2500);
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
          <span className="text-4xl block">{isPro ? "⚡" : "📅"}</span>
          <h3 className="text-xl font-extrabold text-white">
            {isPro ? "Pro Live Calendar Sync" : "Export Calendar Events"}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isPro
              ? "Your Pro Account unlocks 1-Click webcal live synchronization for Samsung, Apple, and Google Calendars."
              : "Download your schedule as static calendar files to import into your calendar application."}
          </p>
        </div>

        {isPro ? (
          /* Tier 1: Pro/Admin Webcal Subscription Engine */
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-3 rounded-2xl shadow-lg border border-slate-700">
                <img
                  src={qrCodeImageUrl}
                  alt="Webcal Subscription QR Code"
                  className="w-44 h-44 object-contain"
                />
              </div>
              <p className="text-[10px] text-slate-400 leading-normal max-w-xs">
                Scan with your phone camera to subscribe to the live dynamic calendar feed directly on your mobile device!
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleSubscribe}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                {subscribing ? "Opening Calendar..." : "🔗 1-Click Live Subscription"}
              </button>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex items-center justify-between gap-3 text-left">
                <span className="text-[10px] font-mono text-indigo-400 truncate">{webcalUrl}</span>
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold rounded-lg border border-slate-700 text-slate-200 hover:text-white transition shrink-0"
                >
                  {copied ? "Copied! ✅" : "Copy Feed Link"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Tier 2: Free User Static Chunked Download Pipeline */
          <div className="space-y-4">
            {events.length > 10 ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-left space-y-2">
                <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  ⚠️ Samsung Calendar Compatibility Chunking
                </p>
                <p className="text-[10px] text-amber-200/85 leading-normal">
                  Your schedule contains <strong>{events.length}</strong> events. To prevent Samsung and Google Calendar bulk import parser crashes, your download is split into parts of max 10 events each.
                </p>
              </div>
            ) : null}

            <button
              onClick={handleStaticDownload}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20"
            >
              Download Static .ics File {events.length > 10 ? `(${Math.ceil(events.length / 10)} parts)` : ""}
            </button>

            {events.length > 10 && (
              <div className="space-y-2 text-left pt-1">
                <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block">
                  Individual Download Parts:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: Math.ceil(events.length / 10) }).map((_, idx) => {
                    const startIdx = idx * 10;
                    const endIdx = Math.min((idx + 1) * 10, events.length);
                    const partEvents = events.slice(startIdx, endIdx);
                    return (
                      <button
                        key={idx}
                        onClick={() => downloadChunk(partEvents, idx + 1)}
                        className="py-2 px-3 bg-slate-950 border border-slate-850 hover:bg-slate-900 rounded-xl text-[10px] text-slate-350 hover:text-slate-200 transition font-medium text-center truncate"
                      >
                        Part {idx + 1} ({startIdx + 1}-{endIdx} events)
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

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
