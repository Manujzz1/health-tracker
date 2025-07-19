// src/components/Checklist.jsx
import React, { useEffect, useState, useRef } from "react";
import { auth, db, requestNotificationPermission } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { format, isBefore } from "date-fns";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { RRule } from "rrule";

const todayStr = format(new Date(), "yyyy-MM-dd");
const weekdays = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Checklist() {
  const nav = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [reminderTime, setReminderTime] = useState("09:00");
  const [repeatInterval, setRepeatInterval] = useState("");
  const [recurrenceOpts, setRecurrenceOpts] = useState({
    type: "none",
    interval: 1,
    days: [],
    date: 1,
    month: 1,
    start: new Date(),
    until: null,
  });
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editReminderTime, setEditReminderTime] = useState("09:00");
  const [editRepeatInterval, setEditRepeatInterval] = useState("");
  const [editRecurrence, setEditRecurrence] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const audioRef = useRef(new Audio("/assets/notify.mp3"));
  const timeouts = useRef({});

  const playSound = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.play().catch((err) => {
      console.warn("Audio play failed:", err);
    });
  };

  useEffect(() => {
    requestNotificationPermission().then((granted) => {
      if (granted) {
        new Notification("Health Tracker", {
          body: "Notifications are enabled!",
          icon: "/icon-192.png",
        });
      }
    });
  }, []);

  // 🔓 Unlock autoplay after first user click
  useEffect(() => {
    const unlock = () => {
      playSound(); // allows future autoplay
      window.removeEventListener("click", unlock);
    };
    window.addEventListener("click", unlock);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const u = auth.currentUser;
        if (!u) return nav("/login");
        const snap = await getDoc(doc(db, "users", u.uid, "history", todayStr));
        if (snap.exists()) return load(snap.data().tasks);
        const ls = localStorage.getItem(`checklist-${todayStr}`);
        if (ls) load(JSON.parse(ls));
      } catch {
        setErrorMsg("Load error");
      }
    };
    init();
  }, [nav]);

  const load = (arr) => {
    setTasks(arr);
    localStorage.setItem(`checklist-${todayStr}`, JSON.stringify(arr));
  };

  const save = async (arr) => {
    try {
      const u = auth.currentUser;
      if (!u) throw "";
      await setDoc(doc(db, "users", u.uid, "history", todayStr), { tasks: arr });
      load(arr);
      setErrorMsg("");
    } catch {
      setErrorMsg("Save error");
    }
  };

  function RecurrenceForm({ opts, onChange }) {
    const onVal = (f) => (e) => {
      const v = f === "start" || f === "until" ? e : e.target.value;
      onChange({ ...opts, [f]: v });
    };
    return (
      <div className="recurrence-form" style={{ border: "1px solid #aaa", padding: 8, margin: 8 }}>
        <select value={opts.type} onChange={onVal("type")}>
          <option value="none">None</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
        {opts.type !== "none" && (
          <>
            <div>
              <label>
                Interval:
                <input
                  type="number"
                  min="1"
                  value={opts.interval}
                  onChange={onVal("interval")}
                  style={{ width: 60, marginLeft: 4 }}
                /> {opts.type}
              </label>
            </div>
            {opts.type === "weekly" && (
              <div style={{ marginTop: 4 }}>
                {weekdayNames.map((wd, i) => (
                  <label key={i} style={{ marginRight: 8 }}>
                    <input
                      type="checkbox"
                      checked={opts.days.includes(weekdays[i])}
                      onChange={() => {
                        const days = opts.days.includes(weekdays[i])
                          ? opts.days.filter((d) => d !== weekdays[i])
                          : [...opts.days, weekdays[i]];
                        onChange({ ...opts, days });
                      }}
                    />
                    {wd}
                  </label>
                ))}
              </div>
            )}
            {opts.type === "monthly" && (
              <div>
                <label>
                  Day:
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={opts.date}
                    onChange={onVal("date")}
                    style={{ width: 60, marginLeft: 4 }}
                  />
                </label>
              </div>
            )}
            {opts.type === "yearly" && (
              <div>
                <label>
                  Month:
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={opts.month}
                    onChange={onVal("month")}
                    style={{ width: 60, marginLeft: 4 }}
                  />
                </label>
                <label>
                  Day:
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={opts.date}
                    onChange={onVal("date")}
                    style={{ width: 60, marginLeft: 4 }}
                  />
                </label>
              </div>
            )}
            <div style={{ marginTop: 4 }}>
              <label>Start:</label>
              <DatePicker selected={opts.start} onChange={onVal("start")} dateFormat="yyyy-MM-dd" />
            </div>
            <div style={{ marginTop: 4 }}>
              <label>Until:</label>
              <DatePicker selected={opts.until} onChange={onVal("until")} isClearable dateFormat="yyyy-MM-dd" />
            </div>
          </>
        )}
      </div>
    );
  }

  const buildRRule = (o) => {
    if (o.type === "none") return null;
    const cfg = {
      freq: RRule[o.type.toUpperCase()],
      interval: o.interval,
      dtstart: o.start,
    };
    if (o.until) cfg.until = o.until;
    if (o.type === "weekly") cfg.byweekday = o.days.map((d) => RRule[d]);
    if (o.type === "monthly") cfg.bymonthday = Number(o.date);
    if (o.type === "yearly") {
      cfg.bymonth = Number(o.month);
      cfg.bymonthday = Number(o.date);
    }
    return new RRule(cfg).toString();
  };

  const summary = (str) => {
    if (!str) return "No recurrence";
    try {
      return RRule.fromString(str).toText();
    } catch {
      return "Invalid recurrence";
    }
  };

  useEffect(() => {
    Object.values(timeouts.current).forEach(clearTimeout);
    timeouts.current = {};

    tasks.forEach((t) => {
      if (t.done) return;
      if (t.repeatInterval) {
        const intervalMs = parseInt(t.repeatInterval) * 60 * 1000;
        const notify = () => {
          if (Notification.permission === "granted") {
            new Notification(`🔁 ${t.label}`);
            playSound();
          }
          const stillPending = tasks.find(x => x.id === t.id && !x.done);
          if (stillPending) {
            timeouts.current[t.id] = setTimeout(notify, intervalMs);
          }
        };
        timeouts.current[t.id] = setTimeout(notify, intervalMs);
      } else {
        const rule = t.rrule ? RRule.fromString(t.rrule) : null;
        let next = rule ? rule.after(new Date(), true) : null;
        if (next && t.reminderTime) {
          const [hh, mm] = t.reminderTime.split(":").map(Number);
          next.setHours(hh, mm, 0, 0);
          if (isBefore(next, new Date())) next = rule.after(new Date(), true);
        }
        if (next) {
          const delay = next.getTime() - Date.now();
          timeouts.current[t.id] = setTimeout(() => {
            if (Notification.permission === "granted") {
              new Notification(`🔔 ${t.label}`);
              playSound();
            }
          }, delay);
        }
      }
    });

    return () => {
      Object.values(timeouts.current).forEach(clearTimeout);
    };
  }, [tasks]);

  const add = () => {
    if (!newTask.trim()) return alert("Enter label");
    const r = buildRRule(recurrenceOpts);
    const newObj = {
      id: Date.now(),
      label: newTask.trim(),
      done: false,
      reminderTime,
      rrule: r,
      repeatInterval
    };
    save([...tasks, newObj]);
    setNewTask("");
    setReminderTime("09:00");
    setRepeatInterval("");
    setRecurrenceOpts({ type: "none", interval: 1, days: [], date: 1, month: 1, start: new Date(), until: null });
  };

  const startEdit = (t) => {
    setEditingId(t.id);
    setEditLabel(t.label);
    setEditReminderTime(t.reminderTime);
    setEditRepeatInterval(t.repeatInterval || "");
    const rr = t.rrule ? RRule.fromString(t.rrule).options : null;
    if (rr) {
      setEditRecurrence({
        type: ["none", "daily", "weekly", "monthly", "yearly"][rr.freq],
        interval: rr.interval,
        days: rr.byweekday ? rr.byweekday.map((w) => w.toString().slice(0, 2)) : [],
        date: rr.bymonthday || 1,
        month: rr.bymonth || 1,
        start: rr.dtstart,
        until: rr.until || null,
      });
    } else {
      setEditRecurrence({ type: "none", interval: 1, days: [], date: 1, month: 1, start: new Date(), until: null });
    }
  };

  const saveEdit = () => {
    const r = buildRRule(editRecurrence);
    save(
      tasks.map((t) =>
        t.id === editingId
          ? { ...t, label: editLabel, reminderTime: editReminderTime, rrule: r, repeatInterval: editRepeatInterval }
          : t
      )
    );
    setEditingId(null);
  };

  const del = (id) => save(tasks.filter((t) => t.id !== id));
  const toggle = (id) => save(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const logout = async () => {
    await signOut(auth);
    nav("/login");
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h2>Advanced Task Scheduler</h2>
      {errorMsg && <div style={{ background: "#fdd", padding: 8 }}>{errorMsg}</div>}
      <button onClick={logout}>Logout</button>
      <button onClick={() => playSound()}>🔊 Test Notification Sound</button>

      <div style={{ margin: 12 }}>
        <input placeholder="Task" value={newTask} onChange={(e) => setNewTask(e.target.value)} />
        <input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
        <label>
          Repeat every:
          <select value={repeatInterval} onChange={(e) => setRepeatInterval(e.target.value)}>
            <option value="">None</option>
            <option value="5">5 minutes</option>
            <option value="10">10 minutes</option>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
          </select>
        </label>
        <RecurrenceForm opts={recurrenceOpts} onChange={setRecurrenceOpts} />
        <button onClick={add}>Add</button>
      </div>

      <h3>Tasks for {todayStr}</h3>
      <ol style={{ paddingLeft: 20 }}>
  {tasks.map((t, i) => (
    <li
      key={t.id}
      style={{
        marginBottom: 12,
        padding: 12,
        border: "1px solid #ccc",
        borderRadius: 6,
        background: t.done ? "#e0ffe0" : "#f9f9f9",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>
          <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} style={{ marginRight: 8 }} />
          <strong>{i + 1}. {t.label}</strong> <small>@ {t.reminderTime}</small>
        </span>
        {!t.done && (
          <span style={{ fontSize: "0.85em", color: "#888" }}>
            {summary(t.rrule)} | Every {t.repeatInterval || "—"} min
          </span>
        )}
      </div>

      {editingId === t.id ? (
        <>
          <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
          <input type="time" value={editReminderTime} onChange={(e) => setEditReminderTime(e.target.value)} />
          <label>
            Repeat every:
            <select value={editRepeatInterval} onChange={(e) => setEditRepeatInterval(e.target.value)}>
              <option value="">None</option>
              <option value="5">5 minutes</option>
              <option value="10">10 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
            </select>
          </label>
          <RecurrenceForm opts={editRecurrence} onChange={setEditRecurrence} />
          <button onClick={saveEdit}>Save</button>
          <button onClick={() => setEditingId(null)}>Cancel</button>
        </>
      ) : (
        <div style={{ marginTop: 6 }}>
          <button onClick={() => startEdit(t)}>Edit</button>
          <button onClick={() => del(t.id)}>Delete</button>
        </div>
      )}
    </li>
  ))}
</ol>
    </div>
  );
}
