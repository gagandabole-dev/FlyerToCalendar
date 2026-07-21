"use client";

import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<any[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setErrorMessage(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selected);
    }
  };

  const handleUpload = async () => {
    if (!file && !preview) return;
    setLoading(true);
    setEvents(null);
    setErrorMessage(null);

    try {
      let res: Response;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin");
        res = await fetch("/api/parse", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Image: preview,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin",
          }),
        });
      }

      const data = await res.json();
      const extractedEvents = Array.isArray(data) ? data : data.events;

      if (res.ok && extractedEvents) {
        setEvents(extractedEvents);
      } else {
        setErrorMessage(data.error || "Gemini AI API rate limit reached. Please wait a few seconds and try again.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Error processing flyer upload. Please try again.");
    } finally {
      setLoading(false);
    }
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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-xs font-semibold uppercase tracking-wider border border-indigo-500/20">
            AI Event Extraction MVP
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
            FlyerToCalendar
          </h1>
          <p className="text-slate-400 text-lg">
            Upload any dance festival or event flyer. Get structured, 1-click calendar invites instantly.
          </p>
        </div>

        {/* Upload Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/50">
            {preview ? (
              <img src={preview} alt="Flyer Preview" className="max-h-64 rounded-lg object-contain" />
            ) : (
              <div className="space-y-2 text-center">
                <svg className="w-12 h-12 mx-auto text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-slate-300 font-medium">Click to upload or drag & drop a flyer</p>
                <p className="text-xs text-slate-500">PNG, JPG, or WEBP up to 10MB</p>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>

          {errorMessage && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-sm text-left flex items-start gap-3">
              <span className="text-lg">⏳</span>
              <div>
                <p className="font-semibold">Rate Limit Notice</p>
                <p className="text-xs text-amber-200/80 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!preview || loading}
            className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-600/25"
          >
            {loading ? "Extracting Event Details..." : "Convert Flyer to Calendar"}
          </button>

          {/* Results Output */}
          {events && (
            <div className="mt-6 text-left bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
              <h3 className="font-semibold text-indigo-400">Extracted Events ({events.length})</h3>
              <div className="space-y-3">
                {events.map((evt, idx) => (
                  <div key={idx} className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                    <p className="font-bold text-white">{evt.title}</p>
                    <p className="text-xs text-slate-400">📍 {evt.room || evt.location || "Location not specified"}</p>
                    <p className="text-xs text-slate-400">🕒 {evt.startTime || evt.start_time} - {evt.endTime || evt.end_time}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* B2B Waitlist Form */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 text-center space-y-4">
          <h2 className="text-xl font-bold text-white">Are you an Event Organizer?</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Embed FlyerToCalendar directly into your event registration pages to boost calendar save rates by 40%.
          </p>
          {submittedEmail ? (
            <p className="text-emerald-400 text-sm font-semibold">Thanks! You are on the organizer priority list.</p>
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
    </main>
  );
}