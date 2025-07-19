// src/reminderManager.js
const taskTimers = {};

export function scheduleRepeatingReminder(task) {
  const intervalMs = task.repeatIntervalMinutes * 60 * 1000;

  const timerId = setInterval(() => {
    const now = new Date();
    const [hh, mm] = task.time.split(":").map(Number);
    const taskTime = new Date();
    taskTime.setHours(hh, mm, 0, 0);

    if (!task.isDone) {
      new Notification(task.title, {
        body: `Reminder: ${task.title}`,
        icon: "/icon-192.png", // optional
      });

      const sound = new Audio("/reminder.mp3"); // optional
      sound.play();
    }
  }, intervalMs);

  taskTimers[task.id] = timerId;
}

export function cancelReminder(taskId) {
  if (taskTimers[taskId]) {
    clearInterval(taskTimers[taskId]);
    delete taskTimers[taskId];
  }
}
