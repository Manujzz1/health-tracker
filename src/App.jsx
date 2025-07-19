import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Checklist from "./components/Checklist";
import History from "./pages/History";
import { auth } from "./firebase";
import {
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { useEffect, useState } from "react";

function App() {
  const [user, setUser] = useState(undefined); // use undefined to detect loading

  useEffect(() => {
    // Set session persistence
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          setUser(user);
        });
        return () => unsubscribe();
      })
      .catch((err) => {
        console.error("❌ Auth persistence error:", err);
        setUser(null);
      });
  }, []);

  if (user === undefined) return <div>Loading...</div>; // prevent flashing

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            user ? <Navigate to="/checklist" /> : <Navigate to="/login" />
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/checklist" element={<Checklist />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
