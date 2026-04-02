import React, { useState, useEffect } from 'react';
import { db } from "../firebase";
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";

export default function AccountManagement() {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. AUTO-FETCH EVERYTHING DIRECTLY FROM THE USERS COLLECTION
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const updateAccount = (email, field, val) => {
    setDoc(doc(db, "users", email), { [field]: val }, { merge: true });
  };

  // 🚀 SAFE VERSION BUMP (Only triggers when explicitly replacing the worker)
  const handleReplaceRater = async (acc) => {
    const currentV = acc.currentVersion || 1;
    const nextV = (acc.maxVersion || 1) + 1;
    
    const confirm = window.confirm(
      `⚠️ WARNING: NEW RATER PROTOCOL\n\nAre you sure you want to wipe the calendar for ${acc.email}?\n\n- YES: The account upgrades to Version ${nextV} and the calendar goes blank for the new worker. You keep the old data.\n- NO: Click cancel. If you just want to change the LEADER, use the dropdown menu instead!`
    );

    if (confirm) {
      try {
        await setDoc(doc(db, "users", acc.email), {
          currentVersion: nextV,
          maxVersion: nextV
        }, { merge: true });
        alert(`✅ Success! ${acc.email} is wiped clean and ready for the new rater (Now on Version ${nextV}).`);
      } catch (err) {
        alert("Failed to update version.");
      }
    }
  };

  if (loading) return <div style={{ padding: "100px", textAlign: "center", fontWeight: "bold" }}>Fetching Agency Hierarchy...</div>;

  // 2. EXTRACT UNIQUE MANAGERS 
  const managerDetails = {};
  usersList.forEach(u => {
    if ((u.role === 'leader' || u.role === 'co-admin') && u.leaderName?.trim()) {
      if (!managerDetails[u.leaderName]) {
        managerDetails[u.leaderName] = { name: u.leaderName, role: u.role };
      }
    }
  });
  const uniqueManagers = Object.values(managerDetails);

  // 3. GET ALL ASSIGNABLE ACCOUNTS 
  const assignableAccounts = usersList.filter(u => u.role !== 'admin');

  // ==========================================
  // REUSABLE TABLE COMPONENT
  // ==========================================
  const AccountTable = ({ filteredAccounts }) => (
    <div style={{ overflowX: "auto", marginTop: "10px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #e2e8f0", color: "#64748b" }}>
            <th style={{ padding: "12px" }}>Account Login & Client</th>
            <th style={{ padding: "12px", backgroundColor: "#f0fdf4" }}>$ Rev</th>
            <th style={{ padding: "12px", backgroundColor: "#eff6ff" }}>Leader (Base/Bonus)</th>
            <th style={{ padding: "12px", backgroundColor: "#faf5ff" }}>Rater (Base/Bonus)</th>
            <th style={{ padding: "12px" }}>Target</th>
            {/* Split the actions clearly */}
            <th style={{ padding: "12px", backgroundColor: "#f8fafc", borderLeft: "2px solid #e2e8f0" }}>1. Manage Leader</th>
            <th style={{ padding: "12px", backgroundColor: "#fffbeb" }}>2. Manage Worker</th>
          </tr>
        </thead>
        <tbody>
          {filteredAccounts.map(acc => {
            const isManagerAccount = acc.role === 'leader' || acc.role === 'co-admin';

            return (
              <tr key={acc.email} style={{ borderBottom: "1px solid #f1f5f9" }}>
                
                {/* Client Name & Email */}
                <td style={{ padding: "12px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "bold", color: "#1e293b" }}>{acc.email}</div>
                  <div style={{ fontSize: "12px", color: isManagerAccount ? "#3b82f6" : "#64748b", fontWeight: isManagerAccount ? "bold" : "normal" }}>
                    Client: {acc.clientName || "-- No Name --"} {isManagerAccount && `(${acc.role})`}
                  </div>
                </td>
                
                {/* USD Revenue */}
                <td style={{ padding: "12px", backgroundColor: "#f0fdf4" }}>
                  <input type="number" step="0.1" value={acc.payRateUSD ?? ''} onChange={(e) => updateAccount(acc.email, 'payRateUSD', Number(e.target.value))} style={{ width: "50px", border: "1px solid #bbf7d0", padding: "5px", outline: "none", borderRadius: "4px" }} />
                </td>

                {/* Leader INR */}
                <td style={{ padding: "12px", backgroundColor: "#eff6ff" }}>
                  <input type="number" value={acc.leaderBaseINR ?? ''} onChange={(e) => updateAccount(acc.email, 'leaderBaseINR', Number(e.target.value))} style={{ width: "50px", border: "1px solid #bfdbfe", padding: "5px", outline: "none", borderRadius: "4px" }} />
                  <span style={{ margin: "0 5px", color: "#93c5fd" }}>/</span>
                  <input type="number" value={acc.leaderBonusINR ?? ''} onChange={(e) => updateAccount(acc.email, 'leaderBonusINR', Number(e.target.value))} style={{ width: "50px", border: "2px solid #3b82f6", padding: "5px", fontWeight: "bold", outline: "none", borderRadius: "4px" }} />
                </td>

                {/* Rater INR */}
                <td style={{ padding: "12px", backgroundColor: "#faf5ff" }}>
                  <input type="number" value={acc.raterBaseINR ?? ''} onChange={(e) => updateAccount(acc.email, 'raterBaseINR', Number(e.target.value))} style={{ width: "50px", border: "1px solid #e9d5ff", padding: "5px", outline: "none", borderRadius: "4px" }} />
                  <span style={{ margin: "0 5px", color: "#d8b4fe" }}>/</span>
                  <input type="number" value={acc.raterBonusINR ?? ''} onChange={(e) => updateAccount(acc.email, 'raterBonusINR', Number(e.target.value))} style={{ width: "50px", border: "2px solid #a855f7", padding: "5px", fontWeight: "bold", outline: "none", borderRadius: "4px" }} />
                </td>

                {/* Bonus Target Hrs */}
                <td style={{ padding: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <input type="number" value={acc.bonusThreshold ?? 40} onChange={(e) => updateAccount(acc.email, 'bonusThreshold', Number(e.target.value))} style={{ width: "40px", border: "1px solid #ddd", padding: "5px", textAlign: "center", outline: "none", borderRadius: "4px" }} />
                    <span style={{ fontSize: "11px", color: "#64748b" }}>hrs</span>
                  </div>
                </td>

                {/* 🚀 ACTION 1: MOVE LEADER (SAFE - KEEPS DATA) */}
                <td style={{ padding: "12px", backgroundColor: "#f8fafc", borderLeft: "2px solid #e2e8f0" }}>
                  {isManagerAccount ? (
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "bold" }}>👤 Auto-Owned</span>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Transfer to:</span>
                      <select 
                        value={acc.assignedLeader || ""} 
                        onChange={(e) => updateAccount(acc.email, 'assignedLeader', e.target.value)} 
                        style={{ padding: "6px", width: "140px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer", outline: "none" }}
                        title="Change leader without deleting rater hours."
                      >
                        <option value="">-- Unassigned Pool --</option>
                        {uniqueManagers.map(m => (
                          <option key={m.name} value={m.name}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </td>

                {/* 🚀 ACTION 2: REPLACE RATER (DANGER - WIPES DATA) */}
                <td style={{ padding: "12px", backgroundColor: "#fffbeb" }}>
                  {isManagerAccount ? (
                    <span style={{ color: "#cbd5e1", fontSize: "12px", fontStyle: "italic" }}>Not Applicable</span>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{ fontSize: "10px", color: "#b45309", textTransform: "uppercase", fontWeight: "bold" }}>Current: V{acc.currentVersion || 1}</span>
                      <button 
                        onClick={() => handleReplaceRater(acc)}
                        style={{ padding: "6px 10px", background: "#f59e0b", color: "white", border: "none", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 2px 4px rgba(245, 158, 11, 0.2)" }}
                        title="Click to wipe the calendar for a new rater."
                      >
                        Wipe for New Rater
                      </button>
                    </div>
                  )}
                </td>

              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // ==========================================
  // 4. FILTERING LOGIC FOR GROUPS
  // ==========================================
  
  const unassignedAccounts = assignableAccounts.filter(a => a.role === 'rater' && !a.assignedLeader?.trim());

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", borderBottom: "1px solid #e2e8f0", paddingBottom: "15px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "26px", color: "#1e293b", fontWeight: "900" }}>📁 Agency Hierarchy & Payouts</h1>
          <p style={{ color: "#64748b", margin: "5px 0" }}>Group accounts under leaders and set the financial margins. Moving a leader is safe; wiping a rater hides old data.</p>
        </div>
      </div>

      {/* 1. UNASSIGNED POOL */}
      <div style={{ marginBottom: "40px", padding: "20px", background: "#f8fafc", borderRadius: "12px", border: "2px dashed #cbd5e1" }}>
        <h3 style={{ margin: "0 0 10px 0", color: "#475569", display: "flex", alignItems: "center", gap: "10px" }}>
          📥 Unassigned Accounts Pool (Raters Only)
          <span style={{ fontSize: "12px", background: "#64748b", color: "#fff", padding: "2px 8px", borderRadius: "10px" }}>
            {unassignedAccounts.length}
          </span>
        </h3>
        {unassignedAccounts.length > 0 ? (
          <AccountTable filteredAccounts={unassignedAccounts} />
        ) : (
          <p style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "14px" }}>No unassigned rater accounts. All accounts are currently grouped.</p>
        )}
      </div>

      {/* 2. LEADER GROUPS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "40px" }}>
        {uniqueManagers.map(manager => {
          const groupAccounts = assignableAccounts.filter(a => {
            if (a.role === 'leader' || a.role === 'co-admin') return a.leaderName === manager.name;
            if (a.role === 'rater') return a.assignedLeader === manager.name;
            return false;
          });
          
          return (
            <div key={manager.name} style={{ padding: "25px", background: "white", borderRadius: "15px", border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "3px solid #eff6ff", paddingBottom: "15px", marginBottom: "15px" }}>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: "900", color: manager.role === 'co-admin' ? "#a855f7" : "#3b82f6", textTransform: "uppercase" }}>
                    {manager.role} Group
                  </span>
                  <h2 style={{ margin: "5px 0", color: "#1e3a8a", fontSize: "22px" }}>{manager.name}</h2>
                </div>
                <div style={{ textAlign: "right", color: "#64748b", fontSize: "14px" }}>
                  Managing: <b>{groupAccounts.length} Accounts</b>
                </div>
              </div>
              
              {groupAccounts.length > 0 ? (
                <AccountTable filteredAccounts={groupAccounts} />
              ) : (
                <p style={{ color: "#cbd5e1", fontStyle: "italic", padding: "20px", textAlign: "center" }}>No accounts moved to this group yet.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}