"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        setMessage({ text: error.message, type: "error" });
      } else {
        setMessage({
          text: "Check your email for the magic link to sign in!",
          type: "success",
        });
        
        // Log organizer signup intent analytics
        await supabase.from("analytics_events").insert({
          event_type: "organizer_signup"
        });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to send magic link.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 md:p-8 selection:bg-indigo-500 selection:text-white">
      <div className="max-w-md w-full text-center space-y-8">
        
        <div className="space-y-3">
          <Link href="/" className="text-xs font-semibold text-slate-500 hover:text-slate-350 transition">
            ← Back to App
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Organizer Portal
          </h1>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            Log in to manage event projects, customize schedules, and generate public QR assets.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-8 shadow-xl space-y-6 backdrop-blur-md text-left">
          {message ? (
            <div className={`p-4 rounded-xl text-sm border ${
              message.type === "success" 
                ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/35 text-rose-300"
            }`}>
              <p className="font-semibold">{message.type === "success" ? "Success!" : "Error"}</p>
              <p className="text-xs mt-1 leading-relaxed">{message.text}</p>
              {message.type === "success" && (
                <button 
                  onClick={() => setMessage(null)}
                  className="mt-3 text-xs text-indigo-400 hover:underline block font-medium"
                >
                  Change email address
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1.5">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@festival.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-3 px-6 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <>
                    <span className="animate-spin text-xs">🔄</span>
                    <span>Sending magic link...</span>
                  </>
                ) : (
                  <span>Send Magic Link</span>
                )}
              </button>
            </form>
          )}

          <p className="text-[10px] text-slate-500 text-center leading-relaxed">
            By signing in, you agree to our <Link href="/datenschutz" className="underline hover:text-slate-350">Privacy Policy</Link>. We utilize passwordless tokens to protect your account.
          </p>
        </div>
      </div>
    </main>
  );
}
