"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { ADMIN_EMAIL } from "@/lib/permissions";

interface AnalyticsSummary {
  views: number;
  uploads: number;
  exports: number;
  signups: number;
  conversion: number;
}

interface AdminProject {
  id: string;
  event_name: string;
  status: "draft" | "paid" | "bypass";
  user_id: string;
  created_at: string;
}

export default function AdminConsole() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AnalyticsSummary>({ views: 0, uploads: 0, exports: 0, signups: 0, conversion: 0 });
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    const fetchAdminData = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || session.user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        router.push("/dashboard");
        return;
      }
      
      setUser(session.user);

      // Fetch analytics
      const { data: analyticsData } = await supabase
        .from("analytics_events")
        .select("event_type");

      // Fetch projects
      const { data: projectData } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (analyticsData) {
        const counts = { views: 0, uploads: 0, exports: 0, signups: 0 };
        analyticsData.forEach((evt) => {
          if (evt.event_type === "page_view") counts.views++;
          else if (evt.event_type === "flyer_upload") counts.uploads++;
          else if (evt.event_type === "ics_export") counts.exports++;
          else if (evt.event_type === "organizer_signup") counts.signups++;
        });

        const conversionRate = counts.uploads > 0 
          ? Math.round((counts.exports / counts.uploads) * 100) 
          : 0;

        setStats({
          views: counts.views,
          uploads: counts.uploads,
          exports: counts.exports,
          signups: counts.signups,
          conversion: conversionRate
        });
      }

      if (projectData) {
        setProjects(projectData as AdminProject[]);
      }
      setLoading(false);
    };

    fetchAdminData();
  }, [router]);

  const handleUpdateStatus = async (projectId: string, newStatus: "draft" | "paid" | "bypass") => {
    setUpdatingId(projectId);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ status: newStatus })
        .eq("id", projectId);

      if (!error) {
        setProjects(projects.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
      } else {
        alert(error.message);
      }
    } catch (e: any) {
      alert(e.message || "Failed to update project status.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="flex items-center gap-2">
          <span className="animate-spin text-sm">🔄</span>
          <span className="text-slate-400 text-sm">Loading admin console...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-4 md:p-8 selection:bg-indigo-500 selection:text-white">
      <div className="max-w-4xl w-full space-y-8 mt-4 md:mt-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-900/85 pb-6">
          <div className="text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Super-Admin Cockpit
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              Welcome back, <span className="font-semibold text-slate-400">{user?.email}</span>
            </p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-bold rounded-lg text-slate-400 hover:text-slate-200 transition border border-slate-800"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Metrics Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl text-left space-y-1">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Page Views</span>
            <p className="text-2xl font-extrabold text-white">{stats.views}</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl text-left space-y-1">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Flyer Uploads</span>
            <p className="text-2xl font-extrabold text-white">{stats.uploads}</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl text-left space-y-1">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Exports</span>
            <p className="text-2xl font-extrabold text-white">{stats.exports}</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl text-left space-y-1">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Organizers</span>
            <p className="text-2xl font-extrabold text-white">{stats.signups}</p>
          </div>
          <div className="bg-indigo-950/20 border border-indigo-900/35 p-4 rounded-xl text-left col-span-2 md:col-span-1 space-y-1">
            <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-wider">Conversion %</span>
            <p className="text-2xl font-extrabold text-indigo-300">{stats.conversion}%</p>
          </div>
        </div>

        {/* B2B Overrides & Bypass */}
        <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-6 shadow-xl space-y-4 backdrop-blur-md text-left">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>⚙️</span>
            B2B Organizer Bypass & Passes
          </h2>
          <p className="text-slate-400 text-xs">
            Manually trigger status modifications to unlock and override export gating rules for specific events.
          </p>

          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-850 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="pb-3 pr-4">Event Project Name</th>
                  <th className="pb-3 pr-4">Created</th>
                  <th className="pb-3 pr-4">Current Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-950/20 transition-colors">
                    <td className="py-3.5 pr-4 font-bold text-white max-w-[200px] truncate">{project.event_name}</td>
                    <td className="py-3.5 pr-4 text-slate-450">{new Date(project.created_at).toLocaleDateString()}</td>
                    <td className="py-3.5 pr-4">
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${
                        project.status === "paid" 
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : project.status === "bypass"
                          ? "bg-sky-500/10 border-sky-500/30 text-sky-400"
                          : "bg-slate-900 border-slate-800 text-slate-500"
                      }`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right space-x-1">
                      <button
                        onClick={() => handleUpdateStatus(project.id, "draft")}
                        disabled={updatingId === project.id}
                        className="px-2.5 py-1 bg-slate-950 border border-slate-800 hover:bg-slate-900 rounded font-semibold text-[10px] text-slate-450 hover:text-slate-200 transition"
                      >
                        Draft
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(project.id, "paid")}
                        disabled={updatingId === project.id}
                        className="px-2.5 py-1 bg-emerald-950/30 border border-emerald-900/30 hover:bg-emerald-900/40 rounded font-semibold text-[10px] text-emerald-400 transition"
                      >
                        Paid Pass
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(project.id, "bypass")}
                        disabled={updatingId === project.id}
                        className="px-2.5 py-1 bg-sky-950/30 border border-sky-900/30 hover:bg-sky-900/40 rounded font-semibold text-[10px] text-sky-400 transition"
                      >
                        Bypass
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}
