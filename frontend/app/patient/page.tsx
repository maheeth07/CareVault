"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  loginPatient,
  registerPatient,
  parseJwt,
  getPatientTenures,
  addTenure,
  getPatientAppointments,
  requestAppointment,
  searchDoctors,
  DoctorSummary,
  TenureSummary,
  AppointmentRecord,
} from "../lib/api";
import {
  User,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar,
  Video,
  LogOut,
  RefreshCw,
  FolderPlus,
  FileCheck2,
  Stethoscope,
  Search,
} from "lucide-react";

export default function PatientPortal() {
  // Auth state
  const [token, setToken] = useState<string>("");
  const [patientId, setPatientId] = useState<string>("");
  const [patientEmail, setPatientEmail] = useState<string>("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  // Forms
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    dob: "1995-05-15",
    gender: "Female",
    blood_group: "O+",
    emergency_contact: "+1 555-0199",
  });

  // UI state
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  // Tenures
  const [tenures, setTenures] = useState<TenureSummary[]>([]);
  const [loadingTenures, setLoadingTenures] = useState(false);
  const [showAddTenure, setShowAddTenure] = useState(false);
  const [tenureForm, setTenureForm] = useState({
    title: "",
    description: "",
    status: "active",
  });
  const [addingTenure, setAddingTenure] = useState(false);

  // Appointments
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [showBookAppt, setShowBookAppt] = useState(false);

  // Doctor search state for booking
  const [availableDoctors, setAvailableDoctors] = useState<DoctorSummary[]>([]);
  const [doctorSearchQuery, setDoctorSearchQuery] = useState("");
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorSummary | null>(null);

  const [apptForm, setApptForm] = useState({
    doctor_id: "",
    tenure_id: "",
  });
  const [bookingAppt, setBookingAppt] = useState(false);

  // Load token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("carevault_pat_token");
    if (savedToken) {
      const payload = parseJwt(savedToken);
      if (payload && payload.patient_id) {
        setToken(savedToken);
        setPatientId(payload.patient_id);
        setPatientEmail(payload.email || "");
      } else {
        localStorage.removeItem("carevault_pat_token");
      }
    }
  }, []);

  // Fetch tenures & appointments on login
  useEffect(() => {
    if (token && patientId) {
      fetchTenures();
      fetchAppointments();
      fetchDoctorsList();
    }
  }, [token, patientId]);

  const fetchDoctorsList = async (query: string = "") => {
    setLoadingDoctors(true);
    try {
      const docs = await searchDoctors(query);
      setAvailableDoctors(docs || []);
      if (docs && docs.length > 0 && !selectedDoctor && !apptForm.doctor_id) {
        setSelectedDoctor(docs[0]);
        setApptForm((prev) => ({ ...prev, doctor_id: docs[0]._id }));
      }
    } catch (err: any) {
      console.error("Failed to load doctors:", err);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const fetchTenures = async () => {
    if (!patientId || !token) return;
    setLoadingTenures(true);
    try {
      const data = await getPatientTenures(patientId, token);
      setTenures(data || []);
      if (data && data.length > 0 && !apptForm.tenure_id) {
        setApptForm((prev) => ({ ...prev, tenure_id: data[0]._id }));
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingTenures(false);
    }
  };

  const fetchAppointments = async () => {
    if (!patientId) return;
    setLoadingAppts(true);
    try {
      const data = await getPatientAppointments(patientId);
      setAppointments(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingAppts(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const res = await loginPatient(loginForm);
      const payload = parseJwt(res.access_token);
      if (!payload || !payload.patient_id) {
        throw new Error("Invalid token received from server");
      }
      localStorage.setItem("carevault_pat_token", res.access_token);
      setToken(res.access_token);
      setPatientId(payload.patient_id);
      setPatientEmail(payload.email || loginForm.email);
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
      const res = await registerPatient(regForm);
      if (res.error) throw new Error(res.error);
      setAuthSuccess("Registration successful! Logging you in...");

      const loginRes = await loginPatient({
        email: regForm.email,
        password: regForm.password,
      });
      const payload = parseJwt(loginRes.access_token);
      if (payload?.patient_id) {
        localStorage.setItem("carevault_pat_token", loginRes.access_token);
        setToken(loginRes.access_token);
        setPatientId(payload.patient_id);
        setPatientEmail(payload.email || regForm.email);
      }
    } catch (err: any) {
      setAuthError(err.message || "Registration failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("carevault_pat_token");
    setToken("");
    setPatientId("");
    setPatientEmail("");
    setTenures([]);
    setAppointments([]);
  };

  const handleAddTenure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenureForm.title.trim()) return;
    setAddingTenure(true);
    try {
      await addTenure(
        {
          patient_id: patientId,
          title: tenureForm.title,
          description: tenureForm.description,
          status: tenureForm.status,
        },
        token
      );
      setTenureForm({ title: "", description: "", status: "active" });
      setShowAddTenure(false);
      fetchTenures();
    } catch (err: any) {
      alert("Error adding tenure: " + err.message);
    } finally {
      setAddingTenure(false);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apptForm.doctor_id || !apptForm.tenure_id) {
      alert("Please select a doctor and a medical tenure.");
      return;
    }
    setBookingAppt(true);
    try {
      await requestAppointment({
        patient_id: patientId,
        doctor_id: apptForm.doctor_id,
        tenure_id: apptForm.tenure_id,
      });
      setShowBookAppt(false);
      fetchAppointments();
    } catch (err: any) {
      alert("Error requesting appointment: " + err.message);
    } finally {
      setBookingAppt(false);
    }
  };

  // ---------------- AUTHENTICATION VIEW ----------------
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold">Patient Portal</h1>
          </div>

          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 mb-6">
            <button
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
              }}
              className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition ${
                authMode === "login"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Patient Login
            </button>
            <button
              onClick={() => {
                setAuthMode("register");
                setAuthError("");
              }}
              className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition ${
                authMode === "register"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Patient Register
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
                  placeholder="patient@example.com"
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
                className="w-full py-2.5 px-4 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition flex items-center justify-center gap-2"
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
                  placeholder="Eleanor Vance"
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
                    placeholder="eleanor@example.com"
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
                    placeholder="+1 555-0199"
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    value={regForm.dob}
                    onChange={(e) => setRegForm({ ...regForm, dob: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold mb-1">Gender</label>
                  <select
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    value={regForm.gender}
                    onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Blood Group</label>
                  <input
                    type="text"
                    placeholder="O+"
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    value={regForm.blood_group}
                    onChange={(e) => setRegForm({ ...regForm, blood_group: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Emergency</label>
                  <input
                    type="text"
                    placeholder="Contact"
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    value={regForm.emergency_contact}
                    onChange={(e) => setRegForm({ ...regForm, emergency_contact: e.target.value })}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={authLoading}
                className="w-full mt-2 py-2.5 px-4 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition flex items-center justify-center gap-2"
              >
                {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Patient Account"}
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

  // ---------------- AUTHENTICATED PATIENT PORTAL ----------------
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-3.5 px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            CareVault <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">Patient Portal</span>
          </Link>
        </div>

        {/* Patient Info & Logout */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold">{patientEmail}</p>
            <p className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">ID: {patientId}</p>
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

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-8">
        {/* Patient Profile Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Patient Profile
            </span>
            <h2 className="text-xl font-bold mt-0.5">{patientEmail}</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Unique ID: <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{patientId}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchTenures();
                fetchAppointments();
                fetchDoctorsList();
              }}
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingTenures || loadingAppts ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              onClick={() => setShowAddTenure(true)}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Medical Tenure
            </button>
            <button
              onClick={() => {
                fetchDoctorsList();
                setShowBookAppt(true);
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" /> Book Consultation
            </button>
          </div>
        </div>

        {/* SECTION 1: MEDICAL TENURES */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600" /> Longitudinal Medical Tenures
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Discrete clinical conditions, treatments, and recovery periods linked to your health record.
              </p>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {tenures.length} Tenures Recorded
            </span>
          </div>

          {loadingTenures ? (
            <div className="py-8 flex justify-center items-center text-slate-500 text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading your medical tenures...
            </div>
          ) : tenures.length === 0 ? (
            <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <FolderPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold">No medical tenures found</p>
              <button
                onClick={() => setShowAddTenure(true)}
                className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold underline"
              >
                Create your first medical tenure
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tenures.map((tenure) => (
                <div
                  key={tenure._id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          tenure.status === "active"
                            ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {tenure.status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Tenure: {tenure._id.slice(-6)}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {tenure.title}
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
                      {tenure.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {tenure.created_at ? new Date(tenure.created_at).toLocaleDateString() : "Active"}
                    </span>
                    <span className="font-mono text-[10px] select-all">
                      {tenure._id}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: APPOINTMENTS WITH DOCTORS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" /> Consultations & Appointments
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Track appointments requested with healthcare specialists and join scheduled sessions.
              </p>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {appointments.length} Consultations
            </span>
          </div>

          {loadingAppts ? (
            <div className="py-8 flex justify-center items-center text-slate-500 text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading appointment history...
            </div>
          ) : appointments.length === 0 ? (
            <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold">No appointments scheduled</p>
              <button
                onClick={() => {
                  fetchDoctorsList();
                  setShowBookAppt(true);
                }}
                className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-semibold underline"
              >
                Request an appointment with a doctor
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appointments.map((appt) => (
                <div
                  key={appt._id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
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
                    <span className="text-[10px] text-slate-400 font-mono">
                      Ref: {appt._id.slice(-6)}
                    </span>
                  </div>

                  {/* Prominent Doctor & Tenure Names */}
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-blue-600" />
                      {appt.doctor_name || "Specialist Doctor"}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                      Tenure: <span className="font-semibold">{appt.tenure_title || "General Health Record"}</span>
                    </p>
                  </div>

                  <div className="text-xs space-y-1 pt-1 border-t border-slate-200 dark:border-slate-800">
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
                          Open Video Consultation
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MODAL 1: ADD MEDICAL TENURE */}
        {showAddTenure && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
              <h4 className="font-bold text-base">Add New Medical Tenure</h4>
              <form onSubmit={handleAddTenure} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Condition / Tenure Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Post-COVID Respiratory Therapy"
                    className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    value={tenureForm.title}
                    onChange={(e) => setTenureForm({ ...tenureForm, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Clinical Description / Summary</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe symptoms, start date, previous treatments..."
                    className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    value={tenureForm.description}
                    onChange={(e) => setTenureForm({ ...tenureForm, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Status</label>
                  <select
                    className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    value={tenureForm.status}
                    onChange={(e) => setTenureForm({ ...tenureForm, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddTenure(false)}
                    className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingTenure}
                    className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center gap-1.5"
                  >
                    {addingTenure && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save Medical Tenure
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: BOOK APPOINTMENT (NAME-BASED SEARCH & SELECT) */}
        {showBookAppt && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
              <h4 className="font-bold text-base">Request Doctor Consultation</h4>
              <form onSubmit={handleBookAppointment} className="space-y-4">
                {/* Search & Select Doctor by Name */}
                <div>
                  <label className="block text-xs font-semibold mb-1">Search Doctor by Name</label>
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Type doctor's name (e.g. Dr. Sarah)..."
                      className="w-full text-xs pl-8 pr-2 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      value={doctorSearchQuery}
                      onChange={(e) => {
                        setDoctorSearchQuery(e.target.value);
                        fetchDoctorsList(e.target.value);
                      }}
                    />
                  </div>

                  {/* Doctor Selection List */}
                  <div className="max-h-36 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 bg-slate-50 dark:bg-slate-950">
                    {loadingDoctors ? (
                      <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" /> Searching doctors...
                      </div>
                    ) : availableDoctors.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No doctors found matching &ldquo;{doctorSearchQuery}&rdquo;
                      </div>
                    ) : (
                      availableDoctors.map((doc) => {
                        const isSelected = apptForm.doctor_id === doc._id;
                        return (
                          <div
                            key={doc._id}
                            onClick={() => {
                              setSelectedDoctor(doc);
                              setApptForm({ ...apptForm, doctor_id: doc._id });
                            }}
                            className={`p-2 rounded cursor-pointer transition text-xs flex items-center justify-between ${
                              isSelected
                                ? "bg-blue-600 text-white font-medium"
                                : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                            }`}
                          >
                            <div>
                              <p className="font-semibold">{doc.name}</p>
                              <p className={`text-[10px] ${isSelected ? "text-blue-100" : "text-slate-500"}`}>
                                {doc.specialization || "General Physician"} • {doc.qualification || "MBBS"}
                              </p>
                            </div>
                            {isSelected && <CheckCircle className="w-4 h-4 shrink-0" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Selected Doctor Summary */}
                {selectedDoctor && (
                  <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200">
                    <p className="font-semibold flex items-center gap-1">
                      <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                      Selected: {selectedDoctor.name}
                    </p>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300">
                      {selectedDoctor.specialization} ({selectedDoctor.experience || "Experienced"})
                    </p>
                  </div>
                )}

                {/* Select Relevant Medical Tenure */}
                <div>
                  <label className="block text-xs font-semibold mb-1">Select Relevant Medical Tenure</label>
                  {tenures.length > 0 ? (
                    <select
                      className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                      value={apptForm.tenure_id}
                      onChange={(e) => setApptForm({ ...apptForm, tenure_id: e.target.value })}
                    >
                      {tenures.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.title} ({t.status})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-2.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                      You haven&apos;t created any medical tenures yet. Please add a tenure first.
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBookAppt(false)}
                    className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bookingAppt || !apptForm.doctor_id || !apptForm.tenure_id}
                    className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {bookingAppt && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
