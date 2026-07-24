"use client";

import React, { useState } from "react";

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

  const host = "flyertocalendar.vercel.app";
  const webcalUrl = `webcal://${host}/api/feed/${projectId || "dummy"}`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    webcalUrl
  )}&color=0f172a&bgcolor=ffffff`;

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
          <span className="text-4xl block">⚡</span>
          <h3 className="text-xl font-extrabold text-white">Live Calendar Subscription</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Subscribe directly to this live timetable. All events will automatically sync and update in your phone's native calendar.
          </p>
        </div>

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
              {subscribing ? "Opening Calendar..." : "🔗 1-Click Add to Phone Calendar"}
            </button>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex items-center justify-between gap-3 text-left">
              <span className="text-[10px] font-mono text-indigo-400 truncate">{webcalUrl}</span>
              <button
                onClick={handleCopyLink}
                className="px-3 py-1 bg-slate-850 hover:bg-slate-800 text-[10px] font-bold rounded-lg border border-slate-700 text-slate-200 hover:text-white transition shrink-0"
              >
                {copied ? "Copied! ✅" : "Copy Feed Link"}
              </button>
            </div>
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
