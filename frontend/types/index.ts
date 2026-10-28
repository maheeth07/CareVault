export type UserRole = "doctor" | "patient";

export interface Patient {
  _id: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  gender: string;
  blood_group: string;
  emergency_contact: string;
}

export interface Doctor {
  _id: string;
  name: string;
  email: string;
  specialization: string;
  phone: string;
  license_number: string;
}

export interface Tenure {
  _id: string;
  patient_id: string;
  patient_name: string;
  title: string;
  description: string;
  status: "active" | "under_review" | "completed";
  created_at: string;
  doctor_name?: string;
  category?: string;
}

export interface Appointment {
  _id: string;
  patient_id: string;
  patient_name: string;
  doctor_id: string;
  doctor_name: string;
  tenure_id: string;
  tenure_title: string;
  status: "requested" | "scheduled" | "completed" | "cancelled";
  requested_at: string;
  appointment_date?: string;
  appointment_time?: string;
  meeting_id?: string;
  meeting_link?: string;
  created_at: string;
}

export interface Consultation {
  _id: string;
  doctor_id: string;
  patient_id: string;
  tenure_id: string;
  appointment_id: string;
  transcript?: string;
  consultation_date: string;
  summary?: string;
  diagnosis?: string;
}

export interface RAGMessage {
  id: string;
  sender: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: {
    tenure_title: string;
    section: string;
    snippet: string;
  }[];
}
