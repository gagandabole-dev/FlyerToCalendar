"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { ADMIN_EMAIL } from "@/lib/permissions";

interface Project {
  id: string;
  event_name: string;
  status: "draft" | "paid" | "bypass";
  flyer_url?: string;
  created_at: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUserAndFetchProjects = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/login");
        return;
      }
      
      setUser(session.user);

      // Fetch projects
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (data && !error) {
        setProjects(data as Project[]);
      }
      setLoading(false);
    };

    checkUserAndFetchProjects();
  }, [router]);

  // Client-side checkout callback fallback updater
  useEffect(() => {
    if (typeof window === "undefined" || !user) return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const projectId = params.get("project_id");

    if (status === "success" && projectId) {
      const updateProjectStatus = async () => {
        try {
          const { error } = await supabase
            .from("projects")
            .update({ status: "paid" })
            .eq("id", projectId);

          if (!error) {
            // Silence query parameters
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Re-fetch project list to show updated status immediately
            const { data } = await supabase
              .from("projects")
              .select("*")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false });
            if (data) {
              setProjects(data as Project[]);
            }
          }
        } catch (e) {
          console.error("Failed to update status on client callback", e);
        }
      };
      updateProjectStatus();
    }
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-emerald-500/10 border-emerald-550/30 text-emerald-455";
      case "bypass":
        return "bg-sky-500/10 border-sky-550/30 text-sky-400";
      default:
        return "bg-slate-500/10 border-slate-750 text-slate-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "paid":
        return "Paid Pass";
      case "bypass":
        return "Admin Bypass";
      default:
        return "Draft";
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="flex items-center gap-2">
          <span className="animate-spin text-sm">🔄</span>
          <span className="text-slate-400 text-sm">Loading workspace...</span>
        </div>
      </main>
    );
  }

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-4 md:p-8 selection:bg-indigo-500 selection:text-white">
      <div className="max-w-4xl w-full space-y-8 mt-4 md:mt-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-900 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Organizer Panel
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Logged in as <span className="font-semibold text-slate-200">{user?.email}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {isAdmin && (
              <Link
                href="/admin"
                className="px-4 py-2 bg-indigo-950/40 hover:bg-indigo-900/40 text-indigo-400 border border-indigo-900/30 hover:border-indigo-500/30 text-xs font-bold rounded-lg transition"
              >
                🛠️ Admin Metrics
              </Link>
            )}
            <Link
              href="/dashboard/projects/new"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-lg text-white transition shadow-md shadow-indigo-600/20"
            >
              ➕ New Project
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-bold rounded-lg text-slate-400 hover:text-slate-200 transition border border-slate-800"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Projects List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white text-left flex items-center gap-2">
            <span>📋</span>
            My Event Schedules
          </h2>

          {projects.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-12 text-center text-slate-500">
              <div className="text-4xl mb-3">📁</div>
              <p className="text-sm font-semibold">No projects created yet.</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                Create a new event project, upload your timetable flyer, and let AI build your digital schedule assets instantly.
              </p>
              <Link
                href="/dashboard/projects/new"
                className="mt-4 inline-block px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-lg text-white transition shadow-md"
              >
                Create First Project
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-slate-900/60 border border-slate-850 hover:border-slate-800 p-5 rounded-2xl flex flex-col justify-between gap-4 transition shadow-sm hover:shadow-md"
                >
                  <div className="space-y-2 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(project.status)}`}>
                        {getStatusLabel(project.status)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-white text-base truncate">
                      {project.event_name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-950/60">
                    <Link
                      href={`/dashboard/projects/${project.id}`}
                      className="flex-1 py-2 text-center bg-slate-950 hover:bg-slate-850 text-xs font-semibold rounded-lg text-slate-200 hover:text-white transition border border-slate-800"
                    >
                      ✏️ Edit Schedule
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
