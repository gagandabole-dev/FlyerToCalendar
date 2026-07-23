"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Login() {
  const [passwordMode, setPasswordMode] = useState<"signin" | "signup">("signin");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  
  const router = useRouter();

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setMessage(null);

    try {
      if (passwordMode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage({ text: error.message, type: "error" });
        } else {
          router.push("/dashboard");
        }
      } else {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          }
        });

        if (error) {
          setMessage({ text: error.message, type: "error" });
        } else {
          setMessage({
            text: data.session 
              ? "Account created successfully! Redirecting..." 
              : "Account created! If email confirmation is enabled, check your inbox. Otherwise, you can now Sign In with your password.",
            type: "success",
          });
          
          await supabase.from("analytics_events").insert({
            event_type: "organizer_signup"
          });

          if (data.session) {
            setTimeout(() => router.push("/dashboard"), 1500);
          } else {
            setPasswordMode("signin");
          }
        }
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Authentication failed.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setMessage({ text: "Please enter your email address first in the input field.", type: "error" });
      return;
    }

    setResetLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setMessage({ text: error.message, type: "error" });
      } else {
        setMessage({
          text: "Password reset link has been sent to your email!",
          type: "success",
        });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to send reset link.", type: "error" });
    } finally {
      setResetLoading(false);
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
            Sign up or sign in to manage event projects, customize schedules, and generate public QR assets.
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

          {/* Form Content */}
          <form onSubmit={handlePasswordAuth} className="space-y-4">
            <div>
              <label htmlFor="email-pwd" className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1.5">
                Email Address
              </label>
              <input
                id="email-pwd"
                type="email"
                required
                placeholder="name@festival.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block">
                  Password
                </label>
                {passwordMode === "signin" && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={resetLoading}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors focus:outline-none"
                  >
                    {resetLoading ? "Sending link..." : "Forgot Password?"}
                  </button>
                )}
              </div>
              <input
                id="password"
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
              disabled={loading || !email || !password}
              className="w-full py-3 px-6 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <span className="animate-spin text-xs">🔄</span>
                  <span>Authenticating...</span>
                </>
              ) : passwordMode === "signin" ? (
                <span>Sign In with Password</span>
              ) : (
                <span>Create Organizer Account</span>
              )}
            </button>

            {/* Password mode switch */}
            <div className="text-center pt-2">
              {passwordMode === "signin" ? (
                <button
                  type="button"
                  onClick={() => {
                    setPasswordMode("signup");
                    setMessage(null);
                  }}
                  className="text-xs text-indigo-400 hover:underline font-medium"
                >
                  Need an account? Sign Up instead
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setPasswordMode("signin");
                    setMessage(null);
                  }}
                  className="text-xs text-indigo-400 hover:underline font-medium"
                >
                  Already have an account? Sign In instead
                </button>
              )}
            </div>
          </form>

          <p className="text-[10px] text-slate-500 text-center leading-relaxed">
            By signing in, you agree to our <Link href="/datenschutz" className="underline hover:text-slate-350">Privacy Policy</Link>. Passwords are encrypted end-to-end.
          </p>
        </div>
      </div>
    </main>
  );
}
