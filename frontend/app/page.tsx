import Link from "next/link";
import { Stethoscope, User, ShieldCheck, Database, MessageSquare, Clock } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
            CV
          </div>
          <span className="text-xl font-bold tracking-tight">CareVault</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/doctor"
            className="text-sm font-medium px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Doctor Portal
          </Link>
          <Link
            href="/patient"
            className="text-sm font-medium px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
          >
            Patient Portal
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 flex flex-col justify-center items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-6">
          <ShieldCheck className="w-4 h-4" /> HIPAA-Compliant Architecture & Clinical RAG
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
          Intelligent Health Records & <br />
          <span className="text-blue-600 dark:text-blue-400">Clinical History Assistant</span>
        </h1>

        <p className="max-w-2xl text-slate-600 dark:text-slate-300 text-base sm:text-lg mb-10">
          Seamlessly manage longitudinal health tenures, schedule consultations, and query comprehensive patient medical histories with AI vector search.
        </p>

        {/* Portals Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mb-12">
          {/* Doctor Portal Card */}
          <Link
            href="/doctor"
            className="group p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-blue-500 dark:hover:border-blue-500 transition text-left flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-105 transition">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold mb-2">Doctor Portal</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Access your appointment requests, view patient tenure profiles, and chat with patient medical histories powered by vector search.
              </p>
            </div>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
              Enter Doctor Dashboard &rarr;
            </span>
          </Link>

          {/* Patient Portal Card */}
          <Link
            href="/patient"
            className="group p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-emerald-500 dark:hover:border-emerald-500 transition text-left flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 group-hover:scale-105 transition">
                <User className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold mb-2">Patient Portal</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Create and track your medical tenures, securely log conditions, and schedule consultations with healthcare specialists.
              </p>
            </div>
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              Enter Patient Dashboard &rarr;
            </span>
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl text-left border-t border-slate-200 dark:border-slate-800 pt-8">
          <div className="flex gap-3 items-start">
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold">Vector Search RAG</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                MongoDB Vector Search retrieves context-relevant medical consultation excerpts.
              </p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold">Tenure Organization</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Segment health history by discrete medical conditions and treatment periods.
              </p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold">Conversation History</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Continuous dialogue tracking for doctors reviewing complex clinical timelines.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-4 text-center text-xs text-slate-500">
        CareVault Healthcare System &copy; 2026. All medical data encrypted.
      </footer>
    </div>
  );
}
