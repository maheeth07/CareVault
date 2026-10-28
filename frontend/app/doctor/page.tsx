"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  loginDoctor,
  registerDoctor,
  parseJwt,
  getDoctorAppointments,
  acceptAppointment,
  rejectAppointment,
  completeAppointment,
  askRAG,
  searchPatients,
  RAGSource,
  AppointmentRecord,
  PatientSummary,
} from "../lib/api";
import {
  Stethoscope,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  User,
  Calendar,
  Clock,
  Video,
  LogOut,
  RefreshCw,
  Sparkles,
  BookOpen,
  Search,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "doctor" | "ai";
  text: string;
  timestamp: string;
  sources?: RAGSource[];
}

export default function DoctorPortal() {
  // Auth state
  const [token, setToken] = useState<string>("");
  const [doctorId, setDoctorId] = useState<string>("");
  const [doctorEmail, setDoctorEmail] = useState<string>("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  // Login form
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  // Register form
  const [regForm, setRegForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    specialization: "General Physician",
    qualification: "MBBS, MD",
    experience: "5 years",
    license_no: "DOC-894123",
  });

  // UI status
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  // Appointments / Patients
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);

  // Active view tab
  const [activeTab, setActiveTab] = useState<"dashboard" | "chat">("dashboard");

  // RAG Chat State
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedPatientName, setSelectedPatientName] = useState("");
  const [selectedTenureId, setSelectedTenureId] = useState("");
  const [selectedTenureTitle, setSelectedTenureTitle] = useState("");

  // Patient Search for RAG
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [patientSearchResults, setPatientSearchResults] = useState<PatientSummary[]>([]);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const [question, setQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Accept modal state
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [schedData, setSchedData] = useState({
    date: "2026-10-27",
    time: "10:00:00",
    meeting_id: "meet-7821",
    meeting_link: "https://meet.google.com/xyz-care-vault",
  });

  // Load token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("carevault_doc_token");
    if (savedToken) {
      const payload = parseJwt(savedToken);
      if (payload && payload.doctor_id) {
        setToken(savedToken);
        setDoctorId(payload.doctor_id);
        setDoctorEmail(payload.email || "");
      } else {
        localStorage.removeItem("carevault_doc_token");
      }
    }

    // Load persisted chat history
    const savedMessages = localStorage.getItem("carevault_doc_chat");
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Fetch appointments when authenticated
  useEffect(() => {
    if (token && doctorId) {
      fetchAppointments();
    }
  }, [token, doctorId]);

  // Persist messages when updated
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("carevault_doc_chat", JSON.stringify(messages));
    }
  }, [messages]);

  const fetchAppointments = async () => {
    if (!doctorId) return;
    setLoadingAppts(true);
    try {
      const data = await getDoctorAppointments(doctorId);
      setAppointments(data || []);
      // Auto-set patient & tenure from first appointment if not set
      if (data && data.length > 0 && !selectedPatientId) {
        setSelectedPatientId(data[0].patient_id);
        setSelectedPatientName(data[0].patient_name || "Patient");
        setSelectedTenureId(data[0].tenure_id);
        setSelectedTenureTitle(data[0].tenure_title || "Medical Tenure");
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingAppts(false);
    }
  };

  const handleSearchPatientsByName = async (query: string) => {
    setPatientSearchQuery(query);
    if (!query.trim()) {
      setPatientSearchResults([]);
      return;
    }
    setIsSearchingPatients(true);
    try {
      const results = await searchPatients(query);
      setPatientSearchResults(results || []);
    } catch (err: any) {
      console.error("Patient search error:", err);
    } finally {
      setIsSearchingPatients(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const res = await loginDoctor(loginForm);
      const payload = parseJwt(res.access_token);
      if (!payload || !payload.doctor_id) {
        throw new Error("Invalid token payload received from server");
      }
      localStorage.setItem("carevault_doc_token", res.access_token);
      setToken(res.access_token);
      setDoctorId(payload.doctor_id);
      setDoctorEmail(payload.email || loginForm.email);
    } catch (err: any) {
      setAuthError(err.message || "Login failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);
    try {
      const res = await registerDoctor(regForm);
      if (res.error) throw new Error(res.error);
      setAuthSuccess("Registration successful! Logging you in...");

      const loginRes = await loginDoctor({
        email: regForm.email,
        password: regForm.password,
      });
      const payload = parseJwt(loginRes.access_token);
      if (payload?.doctor_id) {
        localStorage.setItem("carevault_doc_token", loginRes.access_token);
        setToken(loginRes.access_token);
        setDoctorId(payload.doctor_id);
        setDoctorEmail(payload.email || regForm.email);
      }
    } catch (err: any) {
      setAuthError(err.message || "Registration failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("carevault_doc_token");
    setToken("");
    setDoctorId("");
    setDoctorEmail("");
    setAppointments([]);
  };

  const handleAcceptAppointment = async (apptId: string) => {
    try {
      await acceptAppointment(apptId, {
        appointment_date: schedData.date,
        appointment_time: schedData.time,
        meeting_id: schedData.meeting_id,
        meeting_link: schedData.meeting_link,
      });
      setSchedulingId(null);
      fetchAppointments();
    } catch (err: any) {
      alert("Error accepting appointment: " + err.message);
    }
  };

  const handleRejectAppointment = async (apptId: string) => {
    if (!confirm("Are you sure you want to reject this appointment?")) return;
    try {
      await rejectAppointment(apptId);
      fetchAppointments();
    } catch (err: any) {
      alert("Error rejecting appointment: " + err.message);
    }
  };

  const handleCompleteAppointment = async (apptId: string) => {
    try {
      await completeAppointment(apptId);
      fetchAppointments();
    } catch (err: any) {
      alert("Error marking as completed: " + err.message);
    }
  };

  const handleSelectPatientForChat = (
    patientId: string,
    patientName: string,
    tenureId: string,
    tenureTitle: string
  ) => {
    setSelectedPatientId(patientId);
    setSelectedPatientName(patientName || "Patient");
    setSelectedTenureId(tenureId);
    setSelectedTenureTitle(tenureTitle || "Medical Tenure");
    setActiveTab("chat");
  };

  const handleSendQuestion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim()) return;

    if (!selectedPatientId || !selectedTenureId) {
      setChatError("Please select a patient and tenure before querying.");
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: "doctor",
      text: question.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentQ = question.trim();
    setQuestion("");
    setChatError("");
    setChatLoading(true);

    try {
      const res = await askRAG(
        {
          patient_id: selectedPatientId,
          tenure_id: selectedTenureId,
          question: currentQ,
        },
        token
      );

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: res.answer || "No response received.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sources: res.sources || [],
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      setChatError(
        err.message ||
          "Failed to retrieve medical answer. Verify that this patient and tenure are assigned to your doctor account in appointments."
      );
    } finally {
      setChatLoading(false);
    }
  };

  // ---------------- AUTHENTICATION VIEW ----------------
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <Stethoscope className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold">Doctor Portal</h1>
          </div>

          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 mb-6">
            <button
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
              }}
              className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition ${
                authMode === "login"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Doctor Login
            </button>
            <button
              onClick={() => {
                setAuthMode("register");
                setAuthError("");
              }}
              className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition ${
                authMode === "register"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Doctor Register
            </button>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-lg text-xs text-green-700 dark:text-green-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{authSuccess}</span>
            </div>
          )}

          {authMode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="doctor@hospital.org"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                />
              </div>
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Dr. Sarah Jenkins"
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="doctor@hospital.org"
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="+1 555-0192"
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Specialization</label>
                  <input
                    type="text"
                    required
                    placeholder="Cardiologist"
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    value={regForm.specialization}
                    onChange={(e) => setRegForm({ ...regForm, specialization: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold mb-1">Qualification</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    value={regForm.qualification}
                    onChange={(e) => setRegForm({ ...regForm, qualification: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">License No.</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    value={regForm.license_no}
                    onChange={(e) => setRegForm({ ...regForm, license_no: e.target.value })}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={authLoading}
                className="w-full mt-2 py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Doctor Account"}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
              &larr; Return to Home Selection
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- AUTHENTICATED DOCTOR DASHBOARD & CHAT ----------------
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-3.5 px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Stethoscope className="w-4 h-4" />
            </div>
            CareVault <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold">Doctor Portal</span>
          </Link>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === "dashboard"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            Dashboard & Patients
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
              activeTab === "chat"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            Medical History Chat
          </button>
        </div>

        {/* Doctor Info & Logout */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold">{doctorEmail}</p>
            <p className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">ID: {doctorId}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {/* ================= TAB 1: DASHBOARD & PATIENT LIST ================= */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Header overview */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
              <div>
                <h2 className="text-xl font-bold">Doctor Clinical Dashboard</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Manage patient consultation appointments and select patients for vector search analysis.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchAppointments}
                  className="px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingAppts ? "animate-spin" : ""}`} /> Refresh
                </button>
                <button
                  onClick={() => setActiveTab("chat")}
                  className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Start RAG Query
                </button>
              </div>
            </div>

            {/* Appointments & Patient Profiles Table/List */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" /> Patient Consultation Requests & Profiles
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  {appointments.length} Consultations
                </span>
              </div>

              {loadingAppts ? (
                <div className="py-12 flex justify-center items-center text-slate-500 text-sm gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Loading appointment records...
                </div>
              ) : appointments.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold">No appointments found</p>
                  <p className="text-xs mt-1 text-slate-400">
                    When patients schedule a consultation with your Doctor ID, they will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {appointments.map((appt) => (
                    <div
                      key={appt._id}
                      className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              appt.status === "scheduled"
                                ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                                : appt.status === "requested"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                : appt.status === "completed"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {appt.status}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Ref: {appt._id.slice(-6)}
                          </span>
                        </div>

                        {/* Prominent Patient & Tenure Names */}
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <User className="w-4 h-4 text-blue-600" />
                            {appt.patient_name || "Patient Record"}
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                            Tenure: <span className="font-semibold">{appt.tenure_title || "General Health Record"}</span>
                          </p>
                        </div>

                        <div className="text-xs space-y-1 pt-1">
                          {appt.appointment_date && (
                            <p className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-blue-500" />
                              {appt.appointment_date} at {appt.appointment_time || "10:00 AM"}
                            </p>
                          )}
                          {appt.meeting_link && (
                            <p className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                              <Video className="w-3.5 h-3.5" />
                              <a href={appt.meeting_link} target="_blank" rel="noreferrer" className="underline">
                                Start Video Consultation
                              </a>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Action Controls */}
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
                        {appt.status === "requested" && (
                          <>
                            <button
                              onClick={() => setSchedulingId(appt._id)}
                              className="px-2.5 py-1 text-xs font-semibold bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                            >
                              Accept & Schedule
                            </button>
                            <button
                              onClick={() => handleRejectAppointment(appt._id)}
                              className="px-2.5 py-1 text-xs font-semibold border border-red-200 dark:border-red-900 text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-950 transition"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {appt.status === "scheduled" && (
                          <button
                            onClick={() => handleCompleteAppointment(appt._id)}
                            className="px-2.5 py-1 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                          >
                            Mark Completed
                          </button>
                        )}

                        <button
                          onClick={() =>
                            handleSelectPatientForChat(
                              appt.patient_id,
                              appt.patient_name || "Patient",
                              appt.tenure_id,
                              appt.tenure_title || "Tenure"
                            )
                          }
                          className="ml-auto px-2.5 py-1 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-md hover:bg-indigo-100 transition flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" /> Medical History Chat
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Accept / Scheduling Modal */}
            {schedulingId && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
                  <h4 className="font-bold text-base">Schedule Appointment</h4>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Date</label>
                    <input
                      type="date"
                      className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      value={schedData.date}
                      onChange={(e) => setSchedData({ ...schedData, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Time</label>
                    <input
                      type="time"
                      className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      value={schedData.time}
                      onChange={(e) => setSchedData({ ...schedData, time: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Meeting Link</label>
                    <input
                      type="url"
                      className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      value={schedData.meeting_link}
                      onChange={(e) => setSchedData({ ...schedData, meeting_link: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setSchedulingId(null)}
                      className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleAcceptAppointment(schedulingId)}
                      className="px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Confirm Schedule
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: MEDICAL HISTORY CHAT (CLINICAL RAG) ================= */}
        {activeTab === "chat" && (
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            {/* Name-based Patient and Tenure Selection Bar */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap relative">
                {/* Search / Select Patient by Name */}
                <div className="relative">
                  <span className="text-xs font-semibold text-slate-500 mr-1.5">Patient:</span>
                  <button
                    type="button"
                    onClick={() => setShowPatientDropdown(!showPatientDropdown)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 inline-flex items-center gap-1.5 shadow-2xs hover:border-blue-500"
                  >
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>{selectedPatientName || "Choose Patient by Name"}</span>
                    <span className="text-slate-400 font-normal text-[10px]">▼</span>
                  </button>

                  {/* Patient Search & Dropdown */}
                  {showPatientDropdown && (
                    <div className="absolute left-0 top-9 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-2 space-y-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search patient by name..."
                          className="w-full text-xs pl-7 pr-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                          value={patientSearchQuery}
                          onChange={(e) => handleSearchPatientsByName(e.target.value)}
                        />
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                          From Appointments:
                        </p>
                        {appointments.map((appt) => (
                          <div
                            key={appt._id}
                            onClick={() => {
                              setSelectedPatientId(appt.patient_id);
                              setSelectedPatientName(appt.patient_name || "Patient");
                              setSelectedTenureId(appt.tenure_id);
                              setSelectedTenureTitle(appt.tenure_title || "Tenure");
                              setShowPatientDropdown(false);
                            }}
                            className="p-1.5 text-xs rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex flex-col"
                          >
                            <span className="font-semibold">{appt.patient_name || "Patient"}</span>
                            <span className="text-[10px] text-slate-500">{appt.tenure_title || "Medical Tenure"}</span>
                          </div>
                        ))}

                        {patientSearchResults.length > 0 && (
                          <>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 pt-1">
                              Search Results:
                            </p>
                            {patientSearchResults.map((pat) => (
                              <div
                                key={pat._id}
                                onClick={() => {
                                  setSelectedPatientId(pat._id);
                                  setSelectedPatientName(pat.name);
                                  setShowPatientDropdown(false);
                                }}
                                className="p-1.5 text-xs rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between"
                              >
                                <span className="font-semibold">{pat.name}</span>
                                <span className="text-[10px] text-slate-500">{pat.blood_group || ""}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Tenure Tag */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-500 font-semibold">Tenure:</span>
                  <span className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-200 dark:border-indigo-800">
                    {selectedTenureTitle || "Selected Tenure"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setMessages([]);
                    localStorage.removeItem("carevault_doc_chat");
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
                >
                  Clear History
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {chatError && (
              <div className="m-4 p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Retrieval Error</p>
                  <p className="mt-0.5">{chatError}</p>
                </div>
              </div>
            )}

            {/* Chat Thread */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 min-h-[360px] max-h-[580px]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-center py-12 text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                    {selectedPatientName ? `Consultation History for ${selectedPatientName}` : "Medical History Vector Search"}
                  </h3>
                  <p className="text-xs max-w-sm mt-1 text-slate-500">
                    Ask questions about symptoms, clinical treatments, or prescription timelines for this patient.
                  </p>

                  {/* Suggestion Prompts */}
                  <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-md">
                    {[
                      "Summarize this patient's medical condition and symptoms",
                      "What medications or treatments were prescribed?",
                      "Are there any chronic allergies or past surgical notes?",
                    ].map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setQuestion(prompt);
                        }}
                        className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1.5 transition text-left"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === "doctor" ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                      <span>{msg.sender === "doctor" ? "You (Doctor)" : "CareVault AI"}</span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div
                      className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.sender === "doctor"
                          ? "bg-blue-600 text-white rounded-tr-none"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-200/60 dark:border-slate-700/60"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>

                      {/* Source excerpts from MongoDB Vector Search */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-blue-500" />
                            Retrieved Consultation Excerpts ({msg.sources.length})
                          </p>
                          <div className="space-y-1.5">
                            {msg.sources.map((src, idx) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 text-xs"
                              >
                                {src.score !== undefined && (
                                  <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mb-1">
                                    Relevance Match: {(src.score * 100).toFixed(0)}%
                                  </span>
                                )}
                                <p className="text-slate-600 dark:text-slate-300 italic">
                                  &ldquo;{src.text}&rdquo;
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Chat Loading Indicator */}
              {chatLoading && (
                <div className="flex items-start gap-2">
                  <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Searching MongoDB Vector Search & generating clinical answer...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleSendQuestion}
              className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                placeholder={
                  selectedPatientName
                    ? `Ask a question about ${selectedPatientName}'s medical history...`
                    : "Select a patient above to start asking..."
                }
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={chatLoading}
                className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={chatLoading || !question.trim()}
                className="px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-1.5 text-sm"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Ask AI</span>
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
