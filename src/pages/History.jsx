import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function History() {
  const [history, setHistory] = useState([]);
  const user = auth.currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      const historyRef = collection(db, "users", user.uid, "history");
      const snapshot = await getDocs(historyRef);
      const data = snapshot.docs.map((doc) => ({
        date: doc.id,
        tasks: doc.data().tasks || [],
      }));

      // Sort history in descending order by date
      data.sort((a, b) => b.date.localeCompare(a.date));
      setHistory(data);
    };

    fetchHistory();
  }, [user]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4 text-gray-900 dark:text-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Checklist History</h2>
        <button
          onClick={() => navigate("/checklist")}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Back to Checklist
        </button>
      </div>

      {history.length === 0 ? (
        <p>No history found.</p>
      ) : (
        <div className="space-y-6">
          {history.map((entry) => (
            <div key={entry.date} className="border rounded p-4 bg-gray-100 dark:bg-gray-800">
              <h3 className="font-semibold mb-2">{entry.date}</h3>
              <ul className="list-disc list-inside space-y-1">
                {entry.tasks.map((task) => (
                  <li key={task.id} className={task.done ? "line-through text-green-600" : "text-red-500"}>
                    {task.label} {task.done ? "✔️" : "❌"}
                  </li>
                ))}
              </ul>
              <p className="mt-2 font-medium">
                ✔️ {entry.tasks.filter(t => t.done).length} / {entry.tasks.length} tasks done
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
