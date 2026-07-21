'use client';

import React from 'react';
import {
  ChevronRight,
  GraduationCap,
  Users,
  ShieldCheck,
  Check,
  Heart,
  LineChart,
  Shield,
  Info,
  Sparkles,
} from 'lucide-react';
import type { PortalId } from '@/constants/app';

interface PortalSelectorProps {
  onSelect: (id: PortalId) => void;
}

// ─────────────────────────────────────────────────────────────────
// Visual Avatars (SVGs matching the screenshot's premium design)
// ─────────────────────────────────────────────────────────────────

const StudentAvatar = () => (
  <svg viewBox="0 0 100 100" className="w-14 h-14 md:w-18 md:h-18 shrink-0 opacity-95">
    <circle cx="50" cy="50" r="45" className="fill-blue-50 dark:fill-blue-950/30" />
    <circle cx="50" cy="40" r="14" className="fill-amber-100 dark:fill-amber-200" />
    {/* Hair */}
    <path d="M36 40 C34 26, 66 26, 64 40 C64 44, 36 44, 36 40 Z" className="fill-slate-800" />
    {/* Body */}
    <path d="M28 85 C28 66, 38 60, 50 60 C62 60, 72 66, 72 85 Z" className="fill-blue-600" />
    {/* Book */}
    <rect
      x="44"
      y="68"
      width="16"
      height="20"
      rx="1.5"
      className="fill-purple-400 stroke-purple-500"
      strokeWidth="1"
      transform="rotate(-5 44 68)"
    />
    <rect x="48" y="72" width="8" height="2" className="fill-white" transform="rotate(-5 48 72)" />
  </svg>
);

const CounselorAvatar = () => (
  <svg viewBox="0 0 100 100" className="w-14 h-14 md:w-18 md:h-18 shrink-0 opacity-95">
    <circle cx="50" cy="50" r="45" className="fill-emerald-50 dark:fill-emerald-950/30" />
    <circle cx="50" cy="40" r="14" className="fill-amber-100 dark:fill-amber-200" />
    {/* Hair */}
    <path d="M35 38 C35 22, 65 22, 65 38 C65 42, 35 42, 35 38 Z" className="fill-amber-900" />
    {/* Body */}
    <path d="M28 85 C28 66, 38 60, 50 60 C62 60, 72 66, 72 85 Z" className="fill-emerald-600" />
    {/* Clipboard */}
    <rect
      x="38"
      y="66"
      width="14"
      height="20"
      rx="1"
      className="fill-slate-300 stroke-slate-400"
      strokeWidth="1"
      transform="rotate(10 38 66)"
    />
    <line x1="43" y1="74" x2="49" y2="75" stroke="#1E293B" strokeWidth="1.5" />
    <line x1="42" y1="79" x2="48" y2="80" stroke="#1E293B" strokeWidth="1.5" />
  </svg>
);

const AdminAvatar = () => (
  <svg viewBox="0 0 100 100" className="w-14 h-14 md:w-18 md:h-18 shrink-0 opacity-95">
    <circle cx="50" cy="50" r="45" className="fill-purple-50 dark:fill-purple-950/30" />
    <circle cx="50" cy="40" r="14" className="fill-amber-100 dark:fill-amber-200" />
    {/* Hair */}
    <path d="M36 34 C42 28, 58 28, 64 34" stroke="#1E293B" strokeWidth="7" strokeLinecap="round" />
    {/* Body */}
    <path d="M28 85 C28 66, 38 60, 50 60 C62 60, 72 66, 72 85 Z" className="fill-purple-600" />
    {/* Laptop */}
    <rect x="36" y="70" width="22" height="14" rx="1.5" className="fill-slate-800" />
    <rect x="34" y="82" width="26" height="3" rx="0.5" className="fill-slate-500" />
  </svg>
);

const LeftIllustration = () => (
  <svg
    viewBox="0 0 400 250"
    className="w-full max-w-[340px] mx-auto mt-6"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Left Armchair */}
    <path
      d="M60 170 C60 135, 80 125, 110 125 C120 125, 130 135, 130 155 L130 185 L60 185 Z"
      className="fill-slate-200 dark:fill-slate-800"
    />
    <rect
      x="70"
      y="185"
      width="8"
      height="20"
      rx="2"
      className="fill-slate-300 dark:fill-slate-700"
    />
    <rect
      x="112"
      y="185"
      width="8"
      height="20"
      rx="2"
      className="fill-slate-300 dark:fill-slate-700"
    />
    {/* Right Armchair */}
    <path
      d="M340 170 C340 135, 320 125, 290 125 C280 125, 270 135, 270 155 L270 185 L340 185 Z"
      className="fill-slate-200 dark:fill-slate-800"
    />
    <rect
      x="280"
      y="185"
      width="8"
      height="20"
      rx="2"
      className="fill-slate-300 dark:fill-slate-700"
    />
    <rect
      x="322"
      y="185"
      width="8"
      height="20"
      rx="2"
      className="fill-slate-300 dark:fill-slate-700"
    />
    {/* Coffee Table */}
    <rect
      x="175"
      y="170"
      width="50"
      height="6"
      rx="2.5"
      className="fill-slate-300 dark:fill-slate-700"
    />
    <line
      x1="185"
      y1="176"
      x2="185"
      y2="210"
      strokeWidth="2.5"
      className="stroke-slate-300 dark:stroke-slate-700"
    />
    <line
      x1="215"
      y1="176"
      x2="215"
      y2="210"
      strokeWidth="2.5"
      className="stroke-slate-300 dark:stroke-slate-700"
    />
    {/* Plant on Table */}
    <path d="M195 170 L205 170 L202 160 L198 160 Z" className="fill-amber-600" />
    <path d="M198 160 Q192 150 196 146 Q200 150 200 160" className="fill-emerald-500" />
    <path d="M202 160 Q208 150 204 146 Q200 150 200 160" className="fill-emerald-500" />
    {/* Speech Bubble */}
    <path
      d="M200 100 C225 100, 240 88, 240 73 C240 58, 225 46, 200 46 C175 46, 160 58, 160 73 C160 88, 175 100, 200 100 Z"
      className="fill-purple-50 dark:fill-purple-950/30 stroke-purple-200 dark:stroke-purple-900"
      strokeWidth="1.5"
    />
    <path d="M196 100 L200 108 L204 100" className="fill-purple-50 dark:fill-purple-950/30" />
    {/* Brain Icon inside Speech Bubble */}
    <path
      d="M192 68 C188 68 185 71 185 75 C185 77 186 79 188 80 C186 81 185 83 185 85 C185 89 188 92 192 92 L200 92 L200 68 Z"
      className="fill-purple-400 dark:fill-purple-500"
    />
    <path
      d="M208 68 C212 68 215 71 215 75 C215 77 214 79 212 80 C214 81 215 83 215 85 C215 89 212 92 208 92 L200 92 L200 68 Z"
      className="fill-purple-300 dark:fill-purple-400"
    />
    {/* Therapist (Left Person) */}
    <circle cx="105" cy="110" r="11" className="fill-orange-200" />
    <path
      d="M98 103 C101 98, 108 98, 111 103 C109 101, 101 101, 98 103"
      className="fill-slate-800"
    />{' '}
    {/* Hair */}
    <path
      d="M85 150 C85 132, 95 125, 110 125 C120 125, 125 132, 125 150 L115 180 L95 180 Z"
      className="fill-violet-600"
    />
    <rect
      x="114"
      y="138"
      width="9"
      height="12"
      rx="1"
      className="fill-slate-400"
      transform="rotate(15 114 138)"
    />{' '}
    {/* Clipboard */}
    {/* Patient (Right Person) */}
    <circle cx="295" cy="110" r="11" className="fill-orange-200" />
    <path
      d="M275 150 C275 132, 285 125, 300 125 C310 125, 315 132, 315 150 L305 180 L285 180 Z"
      className="fill-emerald-600"
    />
  </svg>
);

export default function PortalSelector({ onSelect }: PortalSelectorProps) {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* ── Left Column: About Section ── */}
        <div className="lg:col-span-5 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-350 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40">
            <Sparkles size={11} /> About Our System
          </div>

          <h2 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-slate-800 dark:text-white leading-tight">
            Wellness Counseling Centre Management System
          </h2>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Our Wellness Counseling Centre Management System is a comprehensive digital platform
            designed to streamline and enhance the delivery of mental health and wellness services.
          </p>

          {/* Benefit items */}
          <div className="space-y-3 pt-1">
            {/* Holistic Care */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center shrink-0">
                <Heart size={15} className="text-blue-600 dark:text-blue-450" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Holistic Care
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Manage counseling sessions, assessments, appointments and client well-being in one
                  secure platform.
                </p>
              </div>
            </div>

            {/* Efficient Management */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/30 flex items-center justify-center shrink-0">
                <Users size={15} className="text-sky-650 dark:text-sky-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Efficient Management
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Streamline workflows for students, counselors and admins with role-based access
                  and powerful tools.
                </p>
              </div>
            </div>

            {/* Data-Driven Insights */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center shrink-0">
                <LineChart size={15} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Data-Driven Insights
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Generate reports and analytics to improve decision-making and service outcomes.
                </p>
              </div>
            </div>

            {/* Secure & Confidential */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                <Shield size={15} className="text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Secure & Confidential
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  We ensure the highest standards of data security and client confidentiality.
                </p>
              </div>
            </div>
          </div>

          {/* Illustration */}
          <LeftIllustration />
        </div>

        {/* ── Right Column: Portal Choice ── */}
        <div className="lg:col-span-7 space-y-6">
          <div className="text-center lg:text-left space-y-1 mb-2">
            <h3 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white">
              Choose Your Portal
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select the appropriate portal to access the system
            </p>
          </div>

          <div className="space-y-4">
            {/* Student Portal Card */}
            <div
              id="portal-student"
              onClick={() => onSelect('student')}
              className="group flex flex-col md:flex-row justify-between items-start md:items-center p-3.5 md:p-4 rounded-xl border border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                    <GraduationCap size={16} className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs md:text-sm font-extrabold text-slate-800 dark:text-white leading-tight">
                      Student Portal
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-sm">
                      New student? Register here to get started with our counseling services.
                    </p>
                  </div>
                </div>

                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 pt-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-350">
                  <li className="flex items-center gap-1">
                    <Check size={10} className="text-blue-600" /> Create new account
                  </li>
                  <li className="flex items-center gap-1">
                    <Check size={10} className="text-blue-600" /> Book appointments
                  </li>
                  <li className="flex items-center gap-1">
                    <Check size={10} className="text-blue-600" /> Access assessments
                  </li>
                  <li className="flex items-center gap-1">
                    <Check size={10} className="text-blue-600" /> View resources
                  </li>
                </ul>

                <button className="flex items-center justify-between px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold text-white bg-blue-600 hover:bg-blue-700 transition w-full md:w-auto">
                  Student Login <ChevronRight size={10} className="ml-1" />
                </button>
              </div>
              <div className="w-12 h-12 shrink-0 md:ml-4">
                <StudentAvatar />
              </div>
            </div>

            {/* Counselor Portal Card */}
            <div
              id="portal-provider"
              onClick={() => onSelect('provider')}
              className="group flex flex-col md:flex-row justify-between items-start md:items-center p-3.5 md:p-4 rounded-xl border border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-900 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                    <Users size={15} className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs md:text-sm font-extrabold text-slate-800 dark:text-white leading-tight">
                      Counselor Portal
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-sm">
                      Counselors can login to manage their clients, sessions, assessments and
                      reports.
                    </p>
                  </div>
                </div>

                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 pt-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-350">
                  <li className="flex items-center gap-1">
                    <Check size={10} className="text-indigo-600" /> Manage clients
                  </li>
                  <li className="flex items-center gap-1">
                    <Check size={10} className="text-indigo-600" /> Conduct sessions
                  </li>
                  <li className="flex items-center gap-1">
                    <Check size={10} className="text-indigo-600" /> Assessments
                  </li>
                  <li className="flex items-center gap-1">
                    <Check size={10} className="text-indigo-600" /> View reports
                  </li>
                </ul>

                <button className="flex items-center justify-between px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold text-white bg-indigo-600 hover:bg-indigo-750 transition w-full md:w-auto">
                  Counselor Login <ChevronRight size={10} className="ml-1" />
                </button>
              </div>
              <div className="w-12 h-12 shrink-0 md:ml-4">
                <CounselorAvatar />
              </div>
            </div>

            {/* Admin Portal Card */}
            <div
              id="portal-admin"
              onClick={() => onSelect('admin')}
              className="group flex flex-col md:flex-row justify-between items-start md:items-center p-3.5 md:p-4 rounded-xl border border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-slate-550 dark:hover:border-slate-800 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                    <ShieldCheck size={16} className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs md:text-sm font-extrabold text-slate-800 dark:text-white leading-tight">
                      Admin Portal
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-sm">
                      Administrators have full access and control over the entire system.
                    </p>
                  </div>
                </div>

                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 pt-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-350">
                  <li className="flex items-center gap-1">
                    <Check size={10} className="text-slate-900 dark:text-slate-200" /> User
                    management
                  </li>
                  <li className="flex items-center gap-1">
                    <Check size={10} className="text-slate-900 dark:text-slate-200" /> System
                    settings
                  </li>
                  <li className="flex items-center gap-1">
                    <Check size={10} className="text-slate-900 dark:text-slate-200" /> Reports &
                    analytics
                  </li>
                  <li className="flex items-center gap-1">
                    <Check size={10} className="text-slate-900 dark:text-slate-200" /> Manage all
                    data
                  </li>
                </ul>

                <button className="flex items-center justify-between px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold text-white bg-slate-900 hover:bg-slate-950 dark:bg-slate-800 dark:hover:bg-slate-850 transition w-full md:w-auto">
                  Admin Login <ChevronRight size={10} className="ml-1" />
                </button>
              </div>
              <div className="w-12 h-12 shrink-0 md:ml-4">
                <AdminAvatar />
              </div>
            </div>
          </div>

          {/* Bottom Alert/Strip */}
          <div className="flex gap-2.5 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 text-[11px] md:text-xs font-semibold leading-relaxed">
            <Info size={14} className="shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <span>
              <strong>New Student?</strong> If you are a new student, please register using the
              Student Portal to access our counseling services.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
