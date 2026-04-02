import React, { useState, useEffect } from 'react';
import { db } from "../firebase";
import { collection, query, onSnapshot, doc, setDoc } from "firebase/firestore";

// ==========================================
// 🚀 ROW COMPONENT (Handles Lock/Unlock state cleanly)
// ==========================================
const UserRow = ({ u, updateUser }) => {
  // Lock state for the Client Name
  const [isNameLocked, setIsNameLocked] = useState(true);
  const [tempClientName, setTempClientName] = useState(u.clientName || "");

  const handleSaveName = () => {
    if (!tempClientName.trim()) return alert("Client name cannot be empty.");
    updateUser(u.email, 'clientName', tempClientName);
    setIsNameLocked(true); // Lock it again after saving
  };

  const isSuspended = u.status === 'suspended';
  const isImmuneAdmin = u.role === 'admin';

  return (
    <tr style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: isSuspended ? "#fff1f2" : "#fff", opacity: isSuspended ? 0.8 : 1 }}>
      
      {/* 1. ACCOUNT EMAIL */}
      <td style={{ padding: "15px", fontWeight: "bold", color: "#1e293b", fontSize: "14px" }}>
        {u.email}
      </td>

      {/* 2. CLIENT NAME (LOCKED / UNLOCKED) */}
      <td style={{ padding: "15px", fontWeight: "bold" }}>
        {isNameLocked ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#1e293b", fontSize: "14px", width: "140px", display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={u.clientName}>
              {u.clientName || "-- No Name --"}
            </span>
            <button 
              onClick={() => { setTempClientName(u.clientName || ""); setIsNameLocked(false); }} 
              style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontSize: "12px", padding: "6px", color: "#475569", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }} 
              title="Unlock to edit name"
            >
              🔒 Edit
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <input 
              type="text" 
              placeholder="Client Name"
              value={tempClientName} 
              onChange={(e) => setTempClientName(e.target.value)} 
              style={{ padding: "8px", borderRadius: "6px", border: "2px solid #3b82f6", width: "130px", fontWeight: "bold", color: "#1e293b", outline: "none" }} 
              autoFocus 
            />
            <button 
              onClick={handleSaveName} 
              style={{ background: "#10b981", color: "white", border: "none", cursor: "pointer", fontSize: "12px", padding: "8px 10px", borderRadius: "6px", fontWeight: "bold", boxShadow: "0 2px 4px rgba(16,185,129,0.3)" }} 
              title="Save Name"
            >
              💾 Save
            </button>
          </div>
        )}
      </td>

      {/* 3. SYSTEM ROLE */}
      <td style={{ padding: "15px" }}>
        <select 
          value={u.role || 'rater'} 
          onChange={(e) => updateUser(u.email, 'role', e.target.value)}
          style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#fff", fontWeight: "bold", color: u.role === 'admin' ? '#ef4444' : '#1e293b' }}
        >
          <option value="rater">Rater</option>
          <option value="leader">Leader</option>
          <option value="co-admin">Co-Admin</option>
          <option value="admin">Admin</option>
        </select>
      </td>

      {/* 4. SMART LEADER INFO (Different Colors & Logic Based on Role) */}
      <td style={{ padding: "15px" }}>
        {u.role === 'leader' ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "10px", color: "#6366f1", fontWeight: "bold", textTransform: "uppercase" }}>Set Leader Name</span>
            <input 
              type="text" 
              placeholder="e.g., Bob" 
              value={u.leaderName || ''} 
              onChange={(e) => updateUser(u.email, 'leaderName', e.target.value)}
              style={{ padding: "8px", borderRadius: "6px", border: "2px solid #a5b4fc", width: "130px", fontWeight: "bold", color: "#312e81", backgroundColor: isSuspended ? "#f8fafc" : "#e0e7ff", outline: "none" }}
            />
          </div>
        ) : u.role === 'co-admin' ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "10px", color: "#a855f7", fontWeight: "bold", textTransform: "uppercase" }}>Set Co-Admin Name</span>
            <input 
              type="text" 
              placeholder="e.g., Alice" 
              value={u.leaderName || ''} 
              onChange={(e) => updateUser(u.email, 'leaderName', e.target.value)}
              style={{ padding: "8px", borderRadius: "6px", border: "2px solid #d8b4fe", width: "130px", fontWeight: "bold", color: "#581c87", backgroundColor: isSuspended ? "#f8fafc" : "#f3e8ff", outline: "none" }}
            />
          </div>
        ) : u.role === 'rater' ? (
          <span style={{ color: "#94a3b8", fontSize: "12px", fontStyle: "italic", fontWeight: "bold" }}>Assigned via Accounts</span>
        ) : (
          <span style={{ color: "#94a3b8", fontSize: "12px", fontStyle: "italic" }}>Not Applicable</span>
        )}
      </td>

      {/* 5. RATE IN DOLLARS ($) */}
      <td style={{ padding: "15px", backgroundColor: "#f0fdf4" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ color: "#166534", fontWeight: "900" }}>$</span>
          <input 
            type="number" 
            step="0.1" 
            value={u.payRateUSD || 0} 
            onChange={(e) => updateUser(u.email, 'payRateUSD', Number(e.target.value))} 
            style={{ padding: "6px", borderRadius: "4px", border: "1px solid #bbf7d0", width: "70px", fontWeight: "bold", color: "#166534", backgroundColor: isSuspended ? "#f8fafc" : "#fff", outline: "none" }} 
            title="Rate in USD" 
          />
        </div>
      </td>

      {/* 6. STATUS TOGGLE */}
      <td style={{ padding: "15px", textAlign: "center" }}>
        {isImmuneAdmin ? (
          <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "bold" }}>IMMUNE 🛡️</span>
        ) : (
          <button 
            onClick={() => updateUser(u.email, 'status', isSuspended ? 'active' : 'suspended')} 
            style={{ padding: "8px 14px", borderRadius: "20px", border: "none", fontSize: "12px", fontWeight: "bold", cursor: "pointer", backgroundColor: isSuspended ? "#fecdd3" : "#dcfce3", color: isSuspended ? "#be123c" : "#166534", width: "120px" }}
          >
            {isSuspended ? "SUSPENDED 🔒" : "ACTIVE ✅"}
          </button>
        )}
      </td>
    </tr>
  );
};

// ==========================================
// 🚀 MAIN ADMIN PANEL COMPONENT
// ==========================================
export default function AdminPanel({ setCurrentView }) {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // FETCH ALL USERS FROM FIRESTORE
  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // UPDATE USER DATA
  const updateUser = async (email, field, value) => {
    try {
      const userRef = doc(db, "users", email); 
      await setDoc(userRef, { [field]: value }, { merge: true });
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user database.");
    }
  };

  if (loading) return <div style={{ padding: "100px", textAlign: "center", fontSize: "18px" }}>Loading Command Center...</div>;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px", fontFamily: "'Inter', sans-serif" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", backgroundColor: "#1e293b", padding: "20px", borderRadius: "12px", color: "white", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "800" }}>🔐 Admin Command Center</h1>
          <p style={{ margin: "5px 0 0 0", color: "#94a3b8", fontSize: "14px" }}>Manage System Roles and Access</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {/* 🚀 NEW BUTTON TO GO TO ACCOUNT MANAGEMENT */}
          <button 
            onClick={() => setCurrentView('accountManagement')} 
            style={{ padding: "10px 20px", backgroundColor: "#10b981", color: "white", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold" }}
          >
            💼 Account Management
          </button>
          
          <button onClick={() => setCurrentView('dashboard')} style={{ padding: "10px 20px", backgroundColor: "#3b82f6", color: "white", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold" }}>⬅ Back</button>
        </div>
      </div>

      {/* USER TABLE */}
      <div style={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", overflowX: "auto", boxShadow: "0 4px 6px rgba(0,0,0,0.02)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "1000px" }}>
          <thead style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
            <tr>
              <th style={{ padding: "15px", color: "#475569", fontSize: "13px" }}>ACCOUNT EMAIL</th>
              <th style={{ padding: "15px", color: "#475569", fontSize: "13px" }}>CLIENT NAME</th>
              <th style={{ padding: "15px", color: "#475569", fontSize: "13px" }}>SYSTEM ROLE</th>
              <th style={{ padding: "15px", color: "#475569", fontSize: "13px" }}>ASSIGNMENT / NAME</th>
              <th style={{ padding: "15px", color: "#166534", fontSize: "13px" }}>PAY RATE ($/hr)</th>
              <th style={{ padding: "15px", color: "#475569", fontSize: "13px", textAlign: "center" }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {usersList.map((u) => (
              <UserRow 
                key={u.email} 
                u={u} 
                updateUser={updateUser} 
              />
            ))}
          </tbody>
        </table>
      </div>
      
      <p style={{ marginTop: "15px", fontSize: "13px", color: "#64748b" }}>* Note: Admin accounts are immune to suspension.</p>
    </div>
  );
}