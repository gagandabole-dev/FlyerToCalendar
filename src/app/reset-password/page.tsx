"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in via reset link session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage({
          text: "Invalid or expired password reset session. Please request a new link on the login page.",
          type: "error",
        });
      }
    };
    checkSession();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setMessage({ text: error.message, type: "error" });
      } else {
        setMessage({
          text: "Password updated successfully! Redirecting to your dashboard...",
          type: "success",
        });
        setTimeout(() => router.push("/dashboard"), 1800);
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to update password.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 md:p-8 selection:bg-indigo-500 selection:text-white">
      <div className="max-w-md w-full text-center space-y-8">
        
        <div className="space-y-3">
          <Link href="/login" className="text-xs font-semibold text-slate-500 hover:text-slate-350 transition">
            ← Back to Login
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Reset Password
          </h1>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            Choose a secure new password for your organizer profile.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-8 shadow-xl space-y-6 backdrop-blur-md text-left">
          
          {/* Status Message */}
          {message && (
            <div className={`p-4 rounded-xl text-sm border ${
              message.type === "success" 
                ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/35 text-rose-300"
            }`}>
              <p className="font-semibold">{message.type === "success" ? "Notice" : "Error"}</p>
              <p className="text-xs mt-1 leading-relaxed">{message.text}</p>
            </div>
          )}

          {(!message || message.type !== "error") && (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1.5">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full py-3 px-6 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <>
                    <span className="animate-spin text-xs">🔄</span>
                    <span>Updating password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </form>
          )}

          <p className="text-[10px] text-slate-500 text-center leading-relaxed">
            By updating your credentials, you secure access to your event workspace.
          </p>
        </div>
      </div>
    </main>
  );
}
