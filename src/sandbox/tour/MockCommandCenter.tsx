// Visually-faithful mock of the real DashboardShell + Command Center.
// Pure presentation — no auth, no data, no router.
//
// Nav matches DashboardShell.tsx exactly: 10 items, same for every role.
// The Command Center panel matches pages/dashboard/CommandCenter.tsx:
// header + date pill, 4 stat tiles, middle row of 3 columns
// (Today's Schedule / Recent Announcements / Needs Your Attention), and
// bottom row of 3 columns (Upcoming Events / Quick Actions / Activity
// Feed).
//
// Perspective swap doesn't change the nav or layout — it just rebinds the
// data inside each panel and the header user pill, which mirrors how the
// real product behaves under row-level security.

import { forwardRef, useImperativeHandle, useState } from 'react';
import {
  Home,
  MessageSquare,
  Calendar,
  CalendarClock,
  CalendarPlus,
  GraduationCap,
  Music,
  Camera,
  Users,
  TrendingUp,
  Settings,
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Send,
  FileSignature,
  Video,
  Megaphone,
  type LucideIcon,
} from 'lucide-react';
import type { PanelId, Perspective } from './types';

export interface MockCommandCenterHandle {
  setPanel: (id: PanelId) => void;
  setPerspective: (p: Perspective) => void;
}

interface NavItem {
  id: PanelId;
  label: string;
  icon: LucideIcon;
}

// Exact match to src/components/dashboard/DashboardShell.tsx
const NAV: NavItem[] = [
  { id: 'command-center', label: 'Command Center', icon: Home },
  { id: 'messenger', label: 'Messenger', icon: MessageSquare },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'office-hours', label: 'Office Hours', icon: CalendarClock },
  { id: 'academy', label: 'Academy', icon: GraduationCap },
  { id: 'music-library', label: 'Music Library', icon: Music },
  { id: 'quick-cam', label: 'Quick Cam', icon: Camera },
  { id: 'people', label: 'People', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const MockCommandCenter = forwardRef<MockCommandCenterHandle>((_props, ref) => {
  const [perspective, setPerspectiveState] = useState<Perspective>('admin');
  const [panel, setPanel] = useState<PanelId>('command-center');

  useImperativeHandle(
    ref,
    () => ({
      setPanel,
      setPerspective: (p: Perspective) => {
        setPerspectiveState(p);
        setPanel('command-center');
      },
    }),
    [],
  );

  const isStudent = perspective === 'student';

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col bg-white border-r border-slate-200">
          <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-200">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-base shrink-0"
              style={{
                background: 'linear-gradient(135deg,#3b82f6 0%,#8b5cf6 50%,#c084fc 100%)',
              }}
            >
              G
            </div>
            <span className="font-bold text-xl tracking-tight">GleeWorld</span>
          </div>

          <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = panel === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-tour={`nav-${item.id}`}
                  onClick={() => setPanel(item.id)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
                  style={
                    active
                      ? { background: '#fef3c7', color: '#78350f', fontWeight: 600 }
                      : { background: 'transparent', color: '#334155', fontWeight: 500 }
                  }
                >
                  <Icon
                    className="w-4 h-4 shrink-0"
                    style={{ color: active ? '#b45309' : '#64748b' }}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-3 border-t border-slate-200">
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 inline-flex items-center justify-center text-xs font-bold shrink-0">
                  G
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">GleeWorld Demo C...</div>
                  <div className="text-sm text-slate-500">Pro Plan</div>
                </div>
              </div>
              <button
                type="button"
                className="block w-full text-center text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md py-1.5 transition-colors"
              >
                Switch Site &rarr;
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {/* Top bar */}
          <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4 sticky top-0 z-20">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search…"
                  className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-100 border border-transparent rounded-lg focus:bg-white focus:border-slate-300 focus:outline-none transition"
                  readOnly
                />
              </div>
            </div>

            <span
              className={`text-xs uppercase tracking-wider font-bold px-2 py-0.5 rounded-full transition-colors ${
                isStudent ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'
              }`}
            >
              {isStudent ? 'Student view' : 'Admin view'}
            </span>

            <button className="relative w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-rose-500" />
            </button>

            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div
                className="w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center transition-all"
                style={{
                  background: isStudent
                    ? 'linear-gradient(135deg,#34d399,#06b6d4)'
                    : 'linear-gradient(135deg,#a78bfa,#e879f9)',
                }}
              >
                {isStudent ? 'AC' : 'KJ'}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold leading-tight">
                  {isStudent ? 'Aaliyah Carter' : 'Kevin Johnson'}
                </div>
                <div className="text-xs text-slate-500 leading-tight">
                  {isStudent ? 'Student · Soprano 1' : 'Super Admin'}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
          </header>

          <main className="px-6 py-6 min-h-[calc(100vh-4rem)]">
            <PanelView panel={panel} perspective={perspective} />
          </main>
        </div>
      </div>
    </div>
  );
});
MockCommandCenter.displayName = 'MockCommandCenter';

function PanelView({ panel, perspective }: { panel: PanelId; perspective: Perspective }) {
  switch (panel) {
    case 'command-center': return <CommandCenterPanel perspective={perspective} />;
    case 'messenger': return <MessengerPanel perspective={perspective} />;
    case 'calendar': return <CalendarPanel perspective={perspective} />;
    case 'office-hours': return <OfficeHoursPanel perspective={perspective} />;
    case 'academy': return <AcademyPanel perspective={perspective} />;
    case 'music-library': return <MusicLibraryPanel perspective={perspective} />;
    case 'quick-cam': return <QuickCamPanel perspective={perspective} />;
    case 'people': return <PeoplePanel perspective={perspective} />;
    case 'analytics': return <AnalyticsPanel perspective={perspective} />;
    case 'settings': return <SettingsPanel perspective={perspective} />;
  }
}

/* ───────────────── Shared bits matching real CommandCenter.tsx ───────────────── */

const SOFT_CARD = 'rounded-2xl bg-white border-0';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 4px 10px rgba(15,23,42,0.10), 0 16px 32px -8px rgba(15,23,42,0.22)',
};
const AMBER_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 4px 10px rgba(180,83,9,0.12), 0 16px 32px -8px rgba(180,83,9,0.24)',
};

function StatTile({
  icon: Icon,
  iconBg,
  iconFg,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  iconBg: string;
  iconFg: string;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className={`${SOFT_CARD} h-full`} style={SOFT_CARD_STYLE}>
      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon className={`w-5 h-5 ${iconFg}`} />
          </div>
          <div className="text-sm font-semibold truncate">{label}</div>
        </div>
        <div className="text-3xl font-bold tracking-tight mt-3 leading-none">{value}</div>
        <div className="text-xs text-slate-500 mt-2">{detail}</div>
      </div>
    </div>
  );
}

/* ───────────────────────── COMMAND CENTER PANEL ───────────────────────── */

function CommandCenterPanel({ perspective }: { perspective: Perspective }) {
  const isStudent = perspective === 'student';

  // Match the four StatTile slots from the real page.
  const stats = isStudent
    ? [
        { icon: ClipboardCheck, iconBg: 'bg-purple-50', iconFg: 'text-purple-600', label: "Your Attendance",   value: '96%',  detail: 'Above your target' },
        { icon: Calendar,        iconBg: 'bg-emerald-50', iconFg: 'text-emerald-600', label: 'Upcoming Events',   value: '4',    detail: 'Next: Concert Choir rehearsal' },
        { icon: ClipboardList,   iconBg: 'bg-orange-50',  iconFg: 'text-orange-600',  label: 'Assignments Due',   value: '2',    detail: 'Theory + listening' },
        { icon: MessageSquare,   iconBg: 'bg-cyan-50',    iconFg: 'text-cyan-600',    label: 'Unread Messages',   value: '3',    detail: 'Director + section' },
      ]
    : [
        { icon: Users,           iconBg: 'bg-purple-50', iconFg: 'text-purple-600', label: "Today's Attendance", value: '4',    detail: '4 sessions pending' },
        { icon: Calendar,        iconBg: 'bg-emerald-50', iconFg: 'text-emerald-600', label: 'Upcoming Events',   value: '12',   detail: 'Next: Winter Concert' },
        { icon: ClipboardList,   iconBg: 'bg-orange-50',  iconFg: 'text-orange-600',  label: 'Pending Tasks',     value: '7',    detail: 'Requires your attention' },
        { icon: MessageSquare,   iconBg: 'bg-cyan-50',    iconFg: 'text-cyan-600',    label: 'Unread Messages',   value: '23',   detail: 'Across all channels' },
      ];

  const schedule = isStudent
    ? [
        { time: '3:30 PM', dot: 'bg-emerald-500', title: 'Concert Choir rehearsal',  loc: 'Choral Hall' },
        { time: '6:30 PM', dot: 'bg-purple-500',  title: 'Voice lesson — Ms. Chen',  loc: 'Room 204' },
      ]
    : [
        { time: '9:00 AM',  dot: 'bg-emerald-500', title: 'Music Theory I',           loc: 'Room 110' },
        { time: '11:00 AM', dot: 'bg-emerald-500', title: 'Chamber Singers sectional', loc: 'Choral Hall' },
        { time: '3:30 PM',  dot: 'bg-emerald-500', title: 'Concert Choir rehearsal',   loc: 'Choral Hall' },
        { time: '5:00 PM',  dot: 'bg-purple-500',  title: 'Booster meeting',           loc: 'Library' },
      ];

  const announcements = isStudent
    ? [
        { title: 'Dress rehearsal moved to Saturday 10am', detail: 'Concert Choir + Chamber — please bring concert black.', when: '2h ago' },
        { title: 'Theory homework #6 posted', detail: 'Due tomorrow night by 11:59 PM.', when: '1d ago' },
        { title: 'Spring tour deposit reminder', detail: '$250 due Friday — pay online from Settings.', when: '3d ago' },
      ]
    : [
        { title: 'Winter Concert call time confirmed', detail: 'All performers report 6 PM Sat — dress rehearsal at 10 AM.', when: '1h ago' },
        { title: 'New sub plan ready for Theory I',  detail: 'Ms. Chen out Thursday — substitute roster in folder.', when: '4h ago' },
        { title: 'Booster auction closes Friday',     detail: 'Twelve baskets, three live items, four more emails to draft.', when: '1d ago' },
      ];

  const needs = isStudent
    ? [
        { icon: ClipboardCheck, title: 'Theory homework #6 due tomorrow',    detail: 'MUS-110' },
        { icon: MessageSquare,  title: '1 reply from Dr. Johnson',          detail: 'Reschedule sectional' },
        { icon: ClipboardCheck, title: 'Practice recording — Lift Every Voice', detail: 'CHO-101 · S1 part' },
      ]
    : [
        { icon: ClipboardCheck, title: '4 sessions missing attendance',     detail: 'Mon–Tue rehearsals' },
        { icon: MessageSquare,  title: '7 unread parent messages',          detail: 'Concert logistics' },
        { icon: ClipboardCheck, title: 'Setlist incomplete',                detail: 'Winter Concert · 4 of 6' },
      ];

  const upcoming = isStudent
    ? [
        { month: 'DEC', day: '18', title: 'Sectional — Soprano 1', meta: '3:30 PM · Choral Hall' },
        { month: 'DEC', day: '21', title: 'Winter Concert',         meta: '7:00 PM · Auditorium' },
        { month: 'JAN', day: '08', title: 'Spring semester begins', meta: 'Concert Choir resumes' },
      ]
    : [
        { month: 'DEC', day: '18', title: 'Booster auction live',    meta: '7:00 PM · Cafeteria' },
        { month: 'DEC', day: '21', title: 'Winter Concert',          meta: '7:00 PM · Auditorium' },
        { month: 'JAN', day: '15', title: 'Audition open house',     meta: 'Spring 2027 prospects' },
      ];

  // The 6 quick actions exactly as defined in src/pages/dashboard/CommandCenter.tsx
  const quickActions: Array<{ label: string; icon: LucideIcon; bg: string; fg: string }> = [
    { label: 'Take Attendance',   icon: ClipboardCheck, bg: 'bg-emerald-50', fg: 'text-emerald-600' },
    { label: 'Send Announcement', icon: Send,           bg: 'bg-cyan-50',    fg: 'text-cyan-600' },
    { label: 'Add Event',         icon: CalendarPlus,   bg: 'bg-purple-50',  fg: 'text-purple-600' },
    { label: 'Upload Music',      icon: Music,          bg: 'bg-rose-50',    fg: 'text-rose-600' },
    { label: 'Create Assignment', icon: FileSignature,  bg: 'bg-orange-50',  fg: 'text-orange-600' },
    { label: 'Record Rehearsal',  icon: Video,          bg: 'bg-teal-50',    fg: 'text-teal-600' },
  ];

  const activity = isStudent
    ? [
        { actor: 'Dr. Johnson', verb: 'posted "Dress rehearsal moved to Saturday"', when: '2h ago' },
        { actor: 'Music Theory I', verb: 'on the schedule', when: '4h ago' },
        { actor: 'Messages', verb: 'Brandon Liu sent you a message', when: '6h ago' },
      ]
    : [
        { actor: 'Ms. Chen', verb: 'posted "Sub plan ready"', when: '4h ago' },
        { actor: 'Winter Concert', verb: 'on the schedule', when: '6h ago' },
        { actor: 'Attendance', verb: 'needs to be taken for Mon rehearsal', when: '8h ago' },
      ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
          <p className="text-sm text-slate-500 mt-1.5">Your daily overview of what matters most.</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm inline-flex items-center gap-2 shrink-0">
          <Calendar className="w-4 h-4 text-slate-400" />
          Jun 15, 2026
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (<StatTile key={s.label} {...s} />))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-5">
          <div className={SOFT_CARD} style={SOFT_CARD_STYLE}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-500" /><h2 className="font-semibold">Today's Schedule</h2></div>
                <button className="text-xs px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600">View Calendar</button>
              </div>
              <ul className="space-y-5">
                {schedule.map((s) => (
                  <li key={s.title} className="flex gap-3 items-start">
                    <div className="w-16 text-xs text-slate-500 pt-0.5 shrink-0">{s.time}</div>
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${s.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{s.title}</div>
                      <div className="text-xs text-slate-500 truncate">{s.loc}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className={SOFT_CARD} style={SOFT_CARD_STYLE}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Recent Announcements</h2>
                <button className="text-xs text-violet-600 hover:underline">View All</button>
              </div>
              <ul className="space-y-5">
                {announcements.map((a) => (
                  <li key={a.title} className="flex gap-3 items-start">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                      <Megaphone className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium leading-tight">{a.title}</div>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">{a.detail}</p>
                      <p className="text-sm text-slate-500 mt-1">{a.when}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="rounded-2xl bg-amber-50/40 border-0 h-full" style={AMBER_CARD_STYLE}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-amber-900">Needs Your Attention</h2>
                <span className="text-xs font-semibold text-amber-700 bg-amber-100 rounded-full w-6 h-6 inline-flex items-center justify-center">
                  {needs.length}
                </span>
              </div>
              <ul className="space-y-4">
                {needs.map((t) => {
                  const Icon = t.icon;
                  return (
                    <li key={t.title} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-white border border-amber-200 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-amber-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{t.title}</div>
                        <div className="text-xs text-slate-500 truncate">{t.detail}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-amber-700 shrink-0" />
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <div className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Upcoming Events</h2>
              <button className="text-xs text-violet-600 hover:underline">View All</button>
            </div>
            <ul className="space-y-4">
              {upcoming.map((e) => (
                <li key={e.title} className="flex gap-3 items-center">
                  <div className="w-12 text-center shrink-0">
                    <div className="text-sm font-semibold uppercase text-slate-500 tracking-wide">{e.month}</div>
                    <div className="text-xl font-bold leading-tight">{e.day}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{e.title}</div>
                    <div className="text-xs text-slate-500 truncate">{e.meta}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <div className="p-5">
            <h2 className="font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-3 gap-3">
              {quickActions.map((a) => (
                <div
                  key={a.label}
                  className={`${a.bg} rounded-xl p-4 flex flex-col items-center justify-center gap-2.5 min-h-[100px]`}
                >
                  <a.icon className={`w-7 h-7 ${a.fg}`} />
                  <span className="text-xs font-semibold text-center leading-tight">{a.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Activity Feed</h2>
              <button className="text-xs text-violet-600 hover:underline">View All</button>
            </div>
            <ul className="space-y-4">
              {activity.map((r, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm leading-tight">
                      <span className="font-semibold">{r.actor}</span>{' '}
                      <span className="text-slate-500">{r.verb}</span>
                    </div>
                    <div className="text-sm text-slate-500 mt-0.5">{r.when}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── OTHER PANELS ───────────────────────── */

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-sm text-slate-500 mt-1.5">{subtitle}</p>
    </div>
  );
}

function MessengerPanel({ perspective }: { perspective: Perspective }) {
  const isStudent = perspective === 'student';
  const threads = isStudent
    ? [
        { who: 'Dr. Johnson', last: "Don't forget the Tuesday rehearsal moved to 4 PM.", when: '2h' },
        { who: 'Section · Soprano 1', last: 'Brandon: anyone have the S1 part track?', when: '5h' },
        { who: 'Ms. Chen', last: 'Your theory homework is graded — nice work!', when: '1d' },
      ]
    : [
        { who: 'All Directors', last: "Sub plan for Theory I — Ms. Chen out Thursday.", when: '40m' },
        { who: 'Maria Gomez (parent)', last: 'Will Aaliyah be staying after Saturday\'s show?', when: '2h' },
        { who: 'Booster Officers', last: 'Auction baskets — five still need write-ups.', when: '5h' },
        { who: 'Devon Williams', last: 'Permission slip submitted.', when: '1d' },
      ];
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="Messenger" subtitle="Class-scoped conversations across email, SMS, and push." />
      <div className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        {threads.map((t, i, arr) => (
          <div key={t.who} className={`flex gap-3 px-5 py-4 ${i !== arr.length - 1 ? 'border-b border-slate-100' : ''} hover:bg-slate-50`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {t.who.split(' ').map((w) => w[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">{t.who}</div>
                <div className="text-xs text-slate-400">{t.when}</div>
              </div>
              <div className="text-xs text-slate-600 truncate mt-0.5">{t.last}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarPanel({ perspective }: { perspective: Perspective }) {
  const isStudent = perspective === 'student';
  const eventDays = isStudent ? [3, 10, 17, 19, 21] : [3, 5, 8, 10, 12, 14, 17, 19, 21, 24, 26];
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Calendar"
        subtitle={isStudent ? "Just your classes, sectionals, and concerts." : "Every rehearsal, every concert, every meeting."}
      />
      <div className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <div className="p-5">
          <div className="grid grid-cols-7 gap-1 text-center text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1 text-sm">
            {Array.from({ length: 35 }).map((_, i) => {
              const day = i - 1;
              const hasEvent = eventDays.includes(day);
              return (
                <div
                  key={i}
                  className={`aspect-square rounded-md flex items-center justify-center text-xs ${day < 1 || day > 30 ? 'text-slate-300' : 'text-slate-700'} ${hasEvent ? 'font-bold text-white' : ''}`}
                  style={hasEvent ? { background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)' } : undefined}
                >
                  {day > 0 && day <= 30 ? day : ''}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function OfficeHoursPanel({ perspective }: { perspective: Perspective }) {
  const isStudent = perspective === 'student';
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Office Hours"
        subtitle={isStudent ? "Book a voice lesson or section meeting with your director." : "Set availability; bookings sync to your main calendar."}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(isStudent
          ? [
              { title: 'Voice lesson · 30 min', detail: 'Dr. Johnson — Tue 4–6 PM available' },
              { title: 'Section help · 15 min', detail: 'Dr. Johnson — Thu 3:30–4 PM' },
              { title: 'Audition prep · 45 min', detail: 'Dr. Johnson — by request' },
            ]
          : [
              { title: 'Voice lesson · 30 min', detail: '14 booked this week · 6 open' },
              { title: 'Section help · 15 min', detail: 'Tue/Thu 3:30 PM blocks' },
              { title: 'Audition prep · 45 min', detail: '8 prospects scheduled' },
              { title: 'Parent meeting · 30 min', detail: '2 confirmed for Friday' },
            ]
        ).map((s) => (
          <div key={s.title} className={SOFT_CARD} style={SOFT_CARD_STYLE}>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <CalendarClock className="w-5 h-5 text-violet-600" />
                <h3 className="font-semibold">{s.title}</h3>
              </div>
              <p className="text-sm text-slate-500">{s.detail}</p>
              <button className="mt-3 text-xs font-semibold text-violet-600 hover:underline">{isStudent ? 'Book →' : 'Manage →'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AcademyPanel({ perspective }: { perspective: Perspective }) {
  const isStudent = perspective === 'student';
  const courses = isStudent
    ? [
        { code: 'CHO-101', name: 'Concert Choir', meta: 'Soprano 1 · Grade: A−' },
        { code: 'CHO-201', name: 'Chamber Singers', meta: 'Soprano 1 · Grade: A' },
        { code: 'MUS-110', name: 'Music Theory I', meta: 'Grade: B+' },
        { code: 'MUS-240', name: 'African American Music', meta: 'Grade: A' },
      ]
    : [
        { code: 'CHO-101', name: 'Concert Choir', meta: '64 enrolled · Dr. Johnson' },
        { code: 'CHO-201', name: 'Chamber Singers', meta: '24 enrolled · Dr. Johnson' },
        { code: 'MUS-110', name: 'Music Theory I', meta: '38 enrolled · Ms. Chen' },
        { code: 'MUS-240', name: 'African American Music', meta: '22 enrolled · Dr. Johnson' },
      ];
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Academy"
        subtitle={isStudent ? "Your enrolled courses for Fall 2026." : "Courses, syllabi, gradebooks, and student progress."}
      />
      <div className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        {courses.map((c, i, arr) => (
          <div key={c.code} className={`grid grid-cols-12 px-5 py-3.5 ${i !== arr.length - 1 ? 'border-b border-slate-100' : ''} text-sm`}>
            <div className="col-span-2 font-mono text-xs text-slate-500">{c.code}</div>
            <div className="col-span-6 font-semibold">{c.name}</div>
            <div className="col-span-4 text-slate-600 text-right">{c.meta}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MusicLibraryPanel({ perspective }: { perspective: Perspective }) {
  const isStudent = perspective === 'student';
  const pieces = [
    { title: 'Lift Every Voice and Sing', composer: 'J. Rosamond Johnson', voicing: 'SATB' },
    { title: 'Hallelujah Chorus', composer: 'G.F. Handel', voicing: 'SATB' },
    { title: 'Wade in the Water', composer: 'arr. M. Hogan', voicing: 'SSAA' },
    { title: 'Sicut Cervus', composer: 'G.P. Palestrina', voicing: 'SATB' },
  ];
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Music Library"
        subtitle={isStudent ? "Repertoire — PDFs, recordings, and part tracks for your voice part." : "Your whole repertoire — PDFs, recordings, setlists, tagged by voicing."}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {pieces.map((p) => (
          <div key={p.title} className={SOFT_CARD} style={SOFT_CARD_STYLE}>
            <div className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: 'linear-gradient(135deg,#ec4899,#8b5cf6)' }}>
                <Music className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{p.title}</div>
                <div className="text-xs text-slate-500">{p.composer} · {p.voicing}</div>
                <div className="mt-1 text-sm text-violet-700 font-medium">
                  {isStudent ? 'PDF · Recording · S1 part track' : 'PDF · Recording · All parts'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickCamPanel({ perspective }: { perspective: Perspective }) {
  const isStudent = perspective === 'student';
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Quick Cam"
        subtitle={isStudent ? "Snap a photo or short video to submit straight from your phone." : "All recent uploads from students, sorted by class."}
      />
      {isStudent ? (
        <>
          <div className="rounded-3xl bg-slate-900 aspect-video overflow-hidden relative flex items-center justify-center">
            <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(6,182,212,0.25) 0%, transparent 60%), radial-gradient(circle at 70% 70%, rgba(139,92,246,0.18) 0%, transparent 60%)' }} />
            <div className="relative text-center">
              <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)' }}>
                <Camera className="w-9 h-9 text-white" />
              </div>
              <div className="text-white font-bold text-lg">Tap to open camera</div>
              <div className="text-cyan-200/80 text-sm mt-1">Photo, short video, or voice memo</div>
            </div>
            <div className="absolute bottom-4 left-4 text-xs uppercase tracking-wider font-bold text-white/70 bg-black/40 px-2 py-1 rounded-full">
              Submitting to: CHO-101 · Voice memo
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {['Practice recording', 'Sight-singing video', 'Section memo'].map((t) => (
              <div key={t} className={`${SOFT_CARD} text-center text-xs font-semibold text-slate-700`} style={SOFT_CARD_STYLE}>
                <div className="p-3">{t}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={SOFT_CARD} style={SOFT_CARD_STYLE}>
              <div className="aspect-square bg-gradient-to-br from-slate-200 to-slate-300 rounded-t-2xl flex items-center justify-center">
                <Camera className="w-8 h-8 text-slate-400" />
              </div>
              <div className="p-3">
                <div className="text-xs font-semibold truncate">Student submission #{i + 1}</div>
                <div className="text-xs text-slate-500">CHO-101 · Today</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PeoplePanel({ perspective }: { perspective: Perspective }) {
  const isStudent = perspective === 'student';
  const rows = isStudent
    ? [
        { name: 'Brandon Liu', role: 'Section · Tenor 2' },
        { name: 'Devon Williams', role: 'Section · Bass 1' },
        { name: 'Maya Patel', role: 'Section · Alto 1' },
      ]
    : [
        { name: 'Aaliyah Carter', role: 'Student · Soprano 1' },
        { name: 'Brandon Liu', role: 'Student · Tenor 2' },
        { name: 'Maria Gomez', role: 'Parent' },
        { name: 'Dr. Sarah Chen', role: 'Staff · Theory' },
        { name: 'Devon Williams', role: 'Student · Bass 1' },
      ];
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="People"
        subtitle={isStudent ? "Your section directory and classmates." : "247 members across students, parents, staff, and alumni."}
      />
      <div className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        {rows.map((r, i, arr) => (
          <div key={r.name} className={`flex items-center gap-3 px-5 py-3.5 ${i !== arr.length - 1 ? 'border-b border-slate-100' : ''}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 text-white text-xs font-bold flex items-center justify-center">
              {r.name.split(' ').map((p) => p[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{r.name}</div>
              <div className="text-xs text-slate-500">{r.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsPanel({ perspective }: { perspective: Perspective }) {
  const isStudent = perspective === 'student';
  const stats = isStudent
    ? [
        { label: 'Your Attendance', value: '96%', detail: 'Above your target' },
        { label: 'Practice this week', value: '4.1 hrs', detail: '68% of goal' },
        { label: 'Current GPA', value: '3.78', detail: 'Up from 3.62' },
        { label: 'Assignments completed', value: '14 / 16', detail: 'On track' },
      ]
    : [
        { label: 'Program attendance', value: '94.2%', detail: '+2.1% vs last week' },
        { label: 'Engagement', value: '88%', detail: 'Weekly active members' },
        { label: 'Dues collected', value: '92%', detail: 'Of fall goal' },
        { label: 'Email open rate', value: '64%', detail: 'Above benchmark' },
      ];
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Analytics"
        subtitle={isStudent ? "Your progress across the semester." : "Program-wide metrics, attendance, engagement, and revenue."}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <StatTile key={s.label} icon={TrendingUp} iconBg="bg-purple-50" iconFg="text-purple-600" {...s} />
        ))}
      </div>
      <div className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <div className="p-6">
          <h3 className="font-semibold mb-4">Trend</h3>
          <div className="h-32 flex items-end gap-2">
            {[42, 56, 48, 71, 65, 78, 84, 79, 88, 92, 87, 96].map((v, i) => (
              <div key={i} className="flex-1 rounded-t" style={{ height: `${v}%`, background: 'linear-gradient(180deg,#8b5cf6,#3b82f6)' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ perspective }: { perspective: Perspective }) {
  const isStudent = perspective === 'student';
  const sections = isStudent
    ? [
        { title: 'Profile', items: ['Name: Aaliyah Carter', 'Voice part: Soprano 1', 'Class of 2027'] },
        { title: 'Notifications', items: ['Push: on', 'Email: on', 'SMS: critical only'] },
      ]
    : [
        { title: 'Workspace', items: ['Name', 'Subdomain', 'Time zone'] },
        { title: 'Billing', items: ['Plan: Pro', 'Next invoice Dec 1', 'Payment method ending 4242'] },
        { title: 'Integrations', items: ['Google Calendar ✓', 'Stripe ✓', 'Resend ✓', 'Twilio ✓'] },
        { title: 'iOS App', items: ['Push notifications ✓', 'TestFlight build 4'] },
      ];
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Settings"
        subtitle={isStudent ? "Your profile and notification preferences." : "Workspace, billing, and integrations."}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((s) => (
          <div key={s.title} className={SOFT_CARD} style={SOFT_CARD_STYLE}>
            <div className="p-5">
              <h3 className="font-semibold mb-3">{s.title}</h3>
              <ul className="space-y-1.5 text-sm text-slate-600">
                {s.items.map((it) => (<li key={it}>{it}</li>))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
