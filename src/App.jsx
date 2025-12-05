import React, { useEffect, useState, useRef } from "react";
// App.jsx - single-file React component (default export)
// TailwindCSS utility classes are used throughout (no import needed here).
// Dependencies (install in your project):
// npm install firebase react-router-dom recharts framer-motion
// Tailwind should be configured for your React project (PostCSS + tailwind.config.js)

// QUICK SETUP (Firebase):
// 1. Create Firebase project at https://console.firebase.google.com/
// 2. Enable Email/Password sign-in in Authentication > Sign-in method
// 3. Create a Firestore database (production or test) and set rules as needed.
// 4. Copy your Firebase config and paste into the `firebaseConfig` below.

// DATA MODEL (Firestore)
// Collection: "entries"
// Document fields:
// - userId (string)
// - userName (string)
// - projectId (string)
// - projectName (string)
// - task (string)
// - hours (number)
// - date (timestamp)
// - createdAt (timestamp)

// Collection: "projects" (optional, to list projects)
// Document fields: { name: string, code?: string }

// SECURITY NOTE:
// Restrict Firestore rules so users can only write their own entries and read appropriate data.

// --- Firebase setup (replace with your config) ---
const firebaseConfig = {
  apiKey: "AIzaSyAPqVvzt8UNGI5qxn5-k8hwZuF3M3SQ2Fk",
  authDomain: "s4hpc-indus.firebaseapp.com",
  projectId: "s4hpc-indus",
  storageBucket: "s4hpc-indus.firebasestorage.app",
  messagingSenderId: "815589772318",
  appId: "1:815589772318:web:f0fd02da9f3bf2e6eaf20f"
};

// Lazy-import firebase so this file can be dropped into most projects.
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  doc,
  getDoc
} from "firebase/firestore";

// Charts
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Framer Motion for small animations
import { motion } from "framer-motion";

// Ensure we only initialize the Firebase app once. This prevents the "Component auth has not been registered yet"
// error that can happen when initializeApp is called multiple times or when multiple SDK copies are present.
let app;
if (getApps().length === 0) {
  // If firebaseConfig is still placeholder, avoid initializing to reduce developer friction during testing.
  const hasConfig = firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId;
  if (!hasConfig) {
    // Create a lightweight mock to avoid crashing during local static rendering.
    // Note: For real usage, replace firebaseConfig with your project values.
    console.warn("Firebase config missing — auth/firestore will not initialize until you add your config.");
    app = null;
  } else {
    app = initializeApp(firebaseConfig);
  }
} else {
  try {
    app = getApp();
  } catch (err) {
    app = initializeApp(firebaseConfig);
  }
}

const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    if (!auth) {
      // No firebase configured — skip auth checks and mark loading false.
      setLoadingAuth(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingAuth(false);
    });
    return () => unsub();
  }, []);

  if (loadingAuth) return <FullScreenLoader message="Checking authentication..." />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-md p-6">
        <Header user={user} onSignOut={() => auth ? signOut(auth) : null} />
        {!user ? <AuthPanel /> : <Dashboard user={user} />}
      </div>
    </div>
  );
}

function Header({ user, onSignOut }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold">Consultant Timesheets</h1>
        <p className="text-sm text-gray-500">Clock tasks and hours per project — live analytics included</p>
      </div>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <div className="text-sm text-gray-700">Signed in as <strong>{user.email}</strong></div>
            <button onClick={onSignOut} className="px-3 py-1 rounded-md border hover:bg-gray-100">Sign out</button>
          </>
        ) : (
          <div className="text-sm text-gray-500">Not signed in</div>
        )}
      </div>
    </div>
  );
}

function AuthPanel() {
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setProcessing(true);
    try {
      if (!auth) throw new Error("Firebase not configured — cannot authenticate. Add firebaseConfig in App.jsx.");
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-6 border rounded-lg">
        <h2 className="text-lg font-medium mb-2">{mode === "login" ? "Sign in" : "Create account"}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border rounded" />
          <input required type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border rounded" />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex items-center gap-2">
            <button disabled={processing} type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">{processing ? "Please wait..." : (mode === "login" ? "Sign in" : "Register")}</button>
            <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")} className="text-sm text-gray-600">{mode === "login" ? "Create an account" : "Already have an account? Sign in"}</button>
          </div>
        </form>
      </motion.div>

      <div className="p-6 border rounded-lg">
        <h3 className="text-sm font-semibold mb-2">Quick guide</h3>
        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
          <li>Sign up / Sign in</li>
          <li>Add a timesheet entry with project, task, hours and date</li>
          <li>Use the Analytics tab to review daily/weekly totals</li>
          <li>Export CSV from Analytics if you want to pull data for external reporting</li>
        </ol>
      </div>
    </div>
  );
}

function Dashboard({ user }) {
  const [view, setView] = useState("log"); // log | my-entries | analytics | projects

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <nav className="flex gap-2 mb-4">
          <TabButton active={view === "log"} onClick={() => setView("log")}>Log Time</TabButton>
          <TabButton active={view === "my-entries"} onClick={() => setView("my-entries")}>My Entries</TabButton>
          <TabButton active={view === "analytics"} onClick={() => setView("analytics")}>Analytics</TabButton>
          <TabButton active={view === "projects"} onClick={() => setView("projects")}>Projects</TabButton>
        </nav>

        <div className="p-4 border rounded-lg bg-white">
          {view === "log" && <LogTimePanel user={user} />}
          {view === "my-entries" && <MyEntries user={user} />}
          {view === "analytics" && <Analytics user={user} />}
          {view === "projects" && <ProjectsManager user={user} />}
        </div>
      </div>

      <aside className="p-4 border rounded-lg bg-gray-50">
        <QuickSummary user={user} />
      </aside>
    </div>
  );
}

function TabButton({ children, active, onClick }) {
  return (
    <button onClick={onClick} className={`px-3 py-1 rounded ${active ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}>{children}</button>
  );
}

function LogTimePanel({ user }) {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [task, setTask] = useState("");
  const [hours, setHours] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const timerRef = useRef(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!db) return;
    // subscribe to projects collection
    const q = query(collection(db, "projects"));
    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setProjects(arr);
      if (arr.length && !projectId) {
        setProjectId(arr[0].id);
        setProjectName(arr[0].name);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  useEffect(() => {
    // convert elapsed seconds to hours float when updating hours input
    setHours(Math.round((elapsedSeconds / 3600) * 100) / 100);
  }, [elapsedSeconds]);

  async function handleSave(e) {
    e?.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      if (!db) throw new Error("Firestore not configured — cannot save entry. Add firebaseConfig in App.jsx.");
      const docRef = await addDoc(collection(db, "entries"), {
        userId: user.uid,
        userName: user.email,
        projectId: projectId || null,
        projectName: projectName || "(manual)",
        task,
        hours: Number(hours),
        date: new Date(date),
        createdAt: serverTimestamp()
      });
      setMessage("Saved — ID: " + docRef.id);
      setTask("");
      setHours(1);
      setElapsedSeconds(0);
      setTimerRunning(false);
    } catch (err) {
      setMessage("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h3 className="text-lg font-medium mb-3">Log time</h3>
      <form onSubmit={handleSave} className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <label className="flex flex-col">
            <span className="text-sm text-gray-600">Project</span>
            <select value={projectId} onChange={(e) => { setProjectId(e.target.value); const p = projects.find(x => x.id === e.target.value); setProjectName(p?.name || ""); }} className="p-2 border rounded">
              <option value="">-- Select or choose Manual --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>

          <label className="flex flex-col">
            <span className="text-sm text-gray-600">Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="p-2 border rounded" />
          </label>
        </div>

        <label className="flex flex-col">
          <span className="text-sm text-gray-600">Task description</span>
          <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="What did you work on?" className="p-2 border rounded" />
        </label>

        <div className="grid md:grid-cols-3 gap-3 items-end">
          <label className="flex flex-col">
            <span className="text-sm text-gray-600">Hours (decimal)</span>
            <input type="number" step="0.01" min="0" value={hours} onChange={(e) => setHours(e.target.value)} className="p-2 border rounded" />
          </label>

          <div className="flex flex-col">
            <span className="text-sm text-gray-600">Timer</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setTimerRunning(true); setElapsedSeconds(0); }} className="px-3 py-1 rounded border">Start</button>
              <button type="button" onClick={() => setTimerRunning(false)} className="px-3 py-1 rounded border">Stop</button>
              <div className="px-3 py-1 rounded border min-w-[110px] flex items-center justify-center">{formatSeconds(elapsedSeconds)}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded">Save entry</button>
            <button type="button" onClick={() => { setTask(""); setHours(1); setElapsedSeconds(0); setTimerRunning(false); }} className="px-3 py-1 border rounded">Clear</button>
          </div>
        </div>
        {message && <div className="text-sm text-gray-700">{message}</div>}
      </form>
    </div>
  );
}

function MyEntries({ user }) {
  const [entries, setEntries] = useState([]);
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "entries"), where("userId", "==", user.uid), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      setEntries(arr);
    });
    return () => unsub();
  }, [user.uid]);

  return (
    <div>
      <h3 className="text-lg font-medium mb-3">My recent entries</h3>
      <div className="space-y-3">
        {entries.length === 0 && <div className="text-sm text-gray-500">No entries yet.</div>}
        {entries.map(e => (
          <div key={e.id} className="p-3 border rounded">
            <div className="flex justify-between text-sm text-gray-700 mb-1">
              <div>{e.projectName || "(manual)"} — {e.task}</div>
              <div className="font-semibold">{e.hours}h</div>
            </div>
            <div className="text-xs text-gray-500">{formatDate(e.date?.toDate ? e.date.toDate() : (e.date || new Date()))}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Analytics({ user }) {
  const [entries, setEntries] = useState([]);
  const [rangeDays, setRangeDays] = useState(7);
  const [aggregated, setAggregated] = useState([]);

  useEffect(() => {
    if (!db) return;
    // load all entries for simplicity; in production, query with range.
    const q = query(collection(db, "entries"), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      setEntries(arr);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // aggregate project-wise totals for the selected range
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - rangeDays + 1);
    const filtered = entries.filter(e => new Date(e.date?.toDate ? e.date.toDate() : e.date) >= cutoff);

    const map = new Map();
    filtered.forEach(e => {
      const key = e.projectName || e.projectId || "(manual)";
      const prev = map.get(key) || 0;
      map.set(key, prev + Number(e.hours || 0));
    });
    const arr = Array.from(map.entries()).map(([name, total]) => ({ name, total }));
    setAggregated(arr);
  }, [entries, rangeDays]);

  function exportCSV() {
    // create CSV of filtered entries
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - rangeDays + 1);
    const filtered = entries.filter(e => new Date(e.date?.toDate ? e.date.toDate() : e.date) >= cutoff);
    const rows = ["userName,projectName,task,hours,date"].concat(filtered.map(e => `${safe(e.userName)},${safe(e.projectName)},${safe(e.task)},${e.hours},${new Date(e.date?.toDate ? e.date.toDate() : e.date).toISOString().slice(0,10)}`));
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `timesheet_export_${rangeDays}d.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h3 className="text-lg font-medium mb-3">Analytics</h3>
      <div className="flex gap-3 mb-3">
        <label className="flex items-center gap-2 text-sm">
          Last
          <select value={rangeDays} onChange={(e) => setRangeDays(Number(e.target.value))} className="p-1 border rounded mx-2">
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
          of entries
        </label>
        <button onClick={exportCSV} className="px-3 py-1 rounded border">Export CSV</button>
      </div>

      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={aggregated} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="total" name="Hours" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-semibold mb-2">Top projects</h4>
        {aggregated.length === 0 && <div className="text-sm text-gray-500">No data in the selected range.</div>}
        <ul className="space-y-2">
          {aggregated.map(a => (
            <li key={a.name} className="p-2 border rounded flex justify-between">
              <div className="truncate max-w-[60%]">{a.name}</div>
              <div className="font-semibold">{Math.round(a.total*100)/100}h</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ProjectsManager({ user }) {
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "projects"));
    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      setProjects(arr);
    });
    return () => unsub();
  }, []);

  async function addProject() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (!db) throw new Error("Firestore not configured — cannot add project. Add firebaseConfig in App.jsx.");
      await addDoc(collection(db, "projects"), { name: name.trim() });
      setName("");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h3 className="text-lg font-medium mb-3">Projects</h3>
      <div className="flex gap-2 mb-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New project name" className="p-2 border rounded flex-1" />
        <button onClick={addProject} disabled={saving} className="px-3 py-1 rounded bg-blue-600 text-white">Add</button>
      </div>
      <div className="space-y-2">
        {projects.map(p => (
          <div key={p.id} className="p-2 border rounded">{p.name}</div>
        ))}
      </div>
    </div>
  );
}

function QuickSummary({ user }) {
  const [todayTotal, setTodayTotal] = useState(0);
  const [weekTotal, setWeekTotal] = useState(0);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(query(collection(db, "entries")), (snap) => {
      const now = new Date();
      let t = 0, w = 0;
      snap.forEach(d => {
        const data = d.data();
        if (data.userId !== user.uid) return; // only for current user
        const dt = new Date(data.date?.toDate ? data.date.toDate() : data.date);
        if (isSameDay(dt, now)) t += Number(data.hours || 0);
        if (isSameWeek(dt, now)) w += Number(data.hours || 0);
      });
      setTodayTotal(Math.round(t*100)/100);
      setWeekTotal(Math.round(w*100)/100);
    });
    return () => unsub();
  }, [user.uid]);

  return (
    <div>
      <h4 className="text-sm font-semibold mb-2">Quick summary</h4>
      <div className="space-y-2 text-sm text-gray-700">
        <div>Today: <strong>{todayTotal} h</strong></div>
        <div>This week: <strong>{weekTotal} h</strong></div>
        <div className="text-xs text-gray-500">Tip: use the Timer in Log Time to quickly track hours.</div>
      </div>
    </div>
  );
}

function FullScreenLoader({ message }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-gray-600">{message || "Loading..."}</div>
    </div>
  );
}

// --- Utilities ---
function formatSeconds(s) {
  const hh = Math.floor(s / 3600).toString().padStart(2, '0');
  const mm = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleString();
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isSameWeek(a, b) {
  // week starts Monday
  const getWeekStart = (x) => {
    const d = new Date(x);
    const day = (d.getDay() + 6) % 7; // Monday=0
    d.setDate(d.getDate() - day);
    d.setHours(0,0,0,0);
    return d;
  };
  const wa = getWeekStart(a).getTime();
  const wb = getWeekStart(b).getTime();
  return wa === wb;
}

function safe(s) {
  if (!s && s !== 0) return "";
  return `"${String(s).replace(/"/g, '""')}"`;
}
