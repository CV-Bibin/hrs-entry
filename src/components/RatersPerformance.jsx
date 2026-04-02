import React, { useState, useEffect } from 'react';
import { db } from "../firebase";
import { collection, query, onSnapshot } from "firebase/firestore";

export default function RatersPerformance({ user, setCurrentView }) {
  const [allData, setAllData] = useState([]);
  const [orgUsers, setOrgUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const currentMonthString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthString);

  useEffect(() => {
    const qTime = query(collection(db, "time_entries"));
    const unsubTime = onSnapshot(qTime, (snap) => setAllData(snap.docs.map(d => d.data())));

    const qUsers = query(collection(db, "users"));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      setOrgUsers(snap.docs.map(d => d.data()));
      setLoading(false);
    });

    return () => { unsubTime(); unsubUsers(); };
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: "100px" }}>Loading Master View...</div>;

  // 1. DETERMINE WHO THE VIEWER IS
  const myProfile = orgUsers.find(u => u.email === user.email) || { role: 'rater' };
  const myRole = myProfile.role;

  // If a standard rater somehow gets here, kick them out
  if (myRole === 'rater') {
    return <div style={{ padding: "50px", textAlign: "center", color: "red", fontWeight: "bold" }}>Access Denied: You do not have permission to view this page.</div>;
  }

  // 2. DETERMINE WHICH RATERS THEY CAN SEE
  let allowedRaters = [];
  if (myRole === 'admin' || myRole === 'co-admin') {
    allowedRaters = orgUsers; // Admins see everyone in the company
  } else if (myRole === 'leader') {
    // Leaders only see raters assigned to them
    allowedRaters = orgUsers.filter(u => u.leaderEmail === user.email);
  }

  // 3. CALCULATE STATS FOR ALLOWED RATERS
  const performanceData = allowedRaters.map(rater => {
    // Filter time entries for this specific rater in the selected month
    const raterEntries = allData.filter(entry => 
      entry.email === rater.email && 
      entry?.assigned_date?.startsWith(selectedMonth)
    );

    const totalHours = raterEntries.reduce((sum, entry) => sum + (entry.time_value_hours || 0), 0);
    const activeDays = new Set(raterEntries.map(entry => entry.assigned_date)).size;

    return {
      email: rater.email,
      role: rater.role,
      totalHours: totalHours,
      activeDays: activeDays
    };
  }).sort((a, b) => b.totalHours - a.totalHours); // Sort by highest hours first

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <div>
          <h1 style={{ margin: 0, color: "#1e293b", fontSize: "26px" }}>👥 Raters Performance</h1>
          <p style={{ margin: "5px 0 0 0", color: "#64748b" }}>{myRole === 'leader' ? "Your Team's Overview" : "Company Master Overview"}</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontWeight: "bold" }} />
          <button onClick={() => setCurrentView('dashboard')} style={{ padding: "10px 20px", backgroundColor: "#3b82f6", color: "white", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}>⬅ Back</button>
        </div>
      </div>

      <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 6px rgba(0,0,0,0.02)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
            <tr>
              <th style={{ padding: "15px", color: "#475569" }}>Rater Email</th>
              <th style={{ padding: "15px", color: "#475569" }}>Role</th>
              <th style={{ padding: "15px", color: "#475569" }}>Active Days</th>
              <th style={{ padding: "15px", color: "#475569" }}>Total Hours Logged</th>
            </tr>
          </thead>
          <tbody>
            {performanceData.length === 0 && (
              <tr><td colSpan="4" style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>No raters assigned or found for this view.</td></tr>
            )}
            {performanceData.map((data, idx) => (
              <tr key={data.email} style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                <td style={{ padding: "15px", fontWeight: "bold", color: "#3b82f6" }}>{data.email}</td>
                <td style={{ padding: "15px", color: "#64748b", textTransform: "capitalize" }}>{data.role || 'rater'}</td>
                <td style={{ padding: "15px", fontWeight: "bold", color: "#1e293b" }}>{data.activeDays} days</td>
                <td style={{ padding: "15px", fontWeight: "900", color: data.totalHours > 0 ? "#10b981" : "#94a3b8" }}>{data.totalHours.toFixed(2)}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}