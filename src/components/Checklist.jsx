// src/components/Checklist.jsx
import { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";

const today = format(new Date(), "yyyy-MM-dd");

export default function Checklist() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [reminderHour, setReminderHour] = useState("");
  const [reminderMinute, setReminderMinute] = useState("");
  const [reminderAmPm, setReminderAmPm] = useState("AM");
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editHour, setEditHour] = useState("");
  const [editMinute, setEditMinute] = useState("");
  const [editAmPm, setEditAmPm] = useState("AM");
  const reminderIntervals = useRef({});
  const audioRef = useRef(null);

  const hourOptions = [...Array(12)].map((_, i) => String(i + 1).padStart(2, "0"));
  const minuteOptions = [...Array(60)].map((_, i) => String(i).padStart(2, "0"));

  useEffect(() => {
    audioRef.current = new Audio("/assets/notify.mp3"); // place notify.mp3 in public/assets
  }, []);

  useEffect(() => {
    if (Notification.permission !== "granted") Notification.requestPermission();

    const now = new Date();
    const end = new Date(today + "T23:59:00");
    const ms = end.getTime() - now.getTime();

    const midnightTimeout = setTimeout(() => {
      const missed = tasks.filter((t) => !t.done).length;
      if (missed > 0 && Notification.permission === "granted") {
        new Notification(`You missed ${missed} task(s) today`);
        audioRef.current?.play();
      }
    }, ms);

    return () => clearTimeout(midnightTimeout);
  }, [tasks]);

  useEffect(() => {
    const saved = localStorage.getItem(`checklist-${today}`);
    if (saved) setTasks(JSON.parse(saved));

    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (!u) return navigate("/login");
      const snap = await getDoc(doc(db, "users", u.uid, "history", today));
      if (snap.exists()) {
        const d = snap.data().tasks;
        setTasks(d);
        localStorage.setItem(`checklist-${today}`, JSON.stringify(d));
      }
    });
    return unsubscribe;
  }, [navigate]);

  useEffect(() => {
    Object.values(reminderIntervals.current).forEach(clearInterval);
    reminderIntervals.current = {};

    tasks.forEach((t) => {
      if (!t.done && t.time) {
        const [time, mod] = t.time.split(" ");
        let [h, m] = time.split(":").map(Number);
        if (mod === "PM" && h < 12) h += 12;
        if (mod === "AM" && h === 12) h = 0;

        const now = Date.now();
        const target = new Date().setHours(h, m, 0, 0);
        const delay = target - now;

        const notify = () => {
          const arr = JSON.parse(localStorage.getItem(`checklist-${today}`)) || [];
          const still = arr.find((x) => x.id === t.id && !x.done);
          if (still && Notification.permission === "granted") {
            new Notification(`🔔 Reminder: ${t.label}`);
            audioRef.current?.play();
          }
        };

        if (delay > 0) {
          setTimeout(() => {
            notify();
            reminderIntervals.current[t.id] = setInterval(notify, 10 * 60 * 1000);
          }, delay);
        } else {
          reminderIntervals.current[t.id] = setInterval(notify, 10 * 60 * 1000);
        }
      }
    });

    return () =>
      Object.values(reminderIntervals.current).forEach(clearInterval);
  }, [tasks]);

  const save = async (arr) => {
    const u = auth.currentUser;
    if (!u) return;
    await setDoc(doc(db, "users", u.uid, "history", today), { tasks: arr });
    localStorage.setItem(`checklist-${today}`, JSON.stringify(arr));
  };

  const toggle = (id) => {
    const arr = tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    setTasks(arr);
    save(arr);
  };

  const formatTime = (h, m, ap) =>
    `${h.padStart(2, "0")}:${m.padStart(2, "0")} ${ap}`;

  const addTask = () => {
    if (!newTask) return;
    const time = reminderHour && reminderMinute ? formatTime(reminderHour, reminderMinute, reminderAmPm) : null;
    const t = { id: Date.now(), label: newTask, done: false, time };
    const arr = [...tasks, t];
    setTasks(arr);
    save(arr);
    setNewTask(""); setReminderHour(""); setReminderMinute(""); setReminderAmPm("AM");
  };

  const edit = (t) => {
    setEditingId(t.id); setEditLabel(t.label);
    if (t.time) {
      const [tm, ap] = t.time.split(" ");
      const [hh, mm] = tm.split(":");
      setEditHour(hh); setEditMinute(mm); setEditAmPm(ap);
    } else {
      setEditHour(""); setEditMinute(""); setEditAmPm("AM");
    }
  };

  const saveEdit = () => {
    const time = editHour && editMinute ? formatTime(editHour, editMinute, editAmPm) : null;
    const arr = tasks.map((t) =>
      t.id === editingId ? { ...t, label: editLabel, time } : t
    );
    setTasks(arr);
    save(arr);
    setEditingId(null);
  };

  const del = (id) => {
    const arr = tasks.filter((t) => t.id !== id);
    setTasks(arr);
    save(arr);
  };

  const logout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4 text-gray-900 dark:text-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Manuniki_Test1</h2>
        <div className="flex gap-2">
          <button onClick={() => navigate("/history")} className="btn-gray">View History</button>
          <button onClick={logout} className="btn-red">Logout</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text" value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="New task" className="input"
        />
        <select value={reminderHour} onChange={(e) => setReminderHour(e.target.value)} className="select">
          <option value="">HH</option>{hourOptions.map((h) => <option key={h}>{h}</option>)}
        </select>
        <select value={reminderMinute} onChange={(e) => setReminderMinute(e.target.value)} className="select">
          <option value="">MM</option>{minuteOptions.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select value={reminderAmPm} onChange={(e) => setReminderAmPm(e.target.value)} className="select">
          <option>AM</option><option>PM</option>
        </select>
        <button onClick={addTask} className="btn-blue">Add</button>
      </div>

      <ol className="list-decimal pl-6 space-y-3">
        {tasks.map((t) => (
          <li key={t.id} className="task-row">
            <div className="flex items-center gap-2">
              <input
                type="checkbox" checked={t.done}
                onChange={() => toggle(t.id)}
                className="h-4 w-4"
              />
              {editingId === t.id ? (
                <>
                  <input
                    type="text" value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="input-edit"
                  />
                  <select value={editHour} onChange={(e) => setEditHour(e.target.value)} className="select-edit">
                    <option value="">HH</option>{hourOptions.map((h) => <option key={h}>{h}</option>)}
                  </select>
                  <select value={editMinute} onChange={(e) => setEditMinute(e.target.value)} className="select-edit">
                    <option value="">MM</option>{minuteOptions.map((m) => <option key={m}>{m}</option>)}
                  </select>
                  <select value={editAmPm} onChange={(e) => setEditAmPm(e.target.value)} className="select-edit">
                    <option>AM</option><option>PM</option>
                  </select>
                </>
              ) : (
                <span className={t.done ? "line-through" : ""}>
                  {t.label}{t.time && ` (${t.time})`}
                </span>
              )}
            </div>
            <div className="flex gap-2 mt-2 sm:mt-0">
              {editingId === t.id ? (
                <>
                  <button onClick={saveEdit} className="btn-green">Save</button>
                  <button onClick={() => setEditingId(null)} className="btn-gray">Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={() => edit(t)} className="btn-yellow">Edit</button>
                  <button onClick={() => del(t.id)} className="btn-red">Delete</button>
                </>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
