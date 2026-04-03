import React, { useState, useEffect } from 'react';
import { db } from "../firebase";
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";

// ==========================================
// 🚀 UTILITY FUNCTIONS (For Version Stapling)
// ==========================================
const getBaseEmail = (email) => {
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const name = parts[0].replace(/_V\d+$/i, "");
  return `${name}@${parts[1]}`;
};

const getVersionNum = (email) => {
  const parts = email.split("@");
  if (parts.length !== 2) return 1;
  const m = parts[0].match(/_V(\d+)$/i);
  return m ? parseInt(m[1]) : 1;
};

// ==========================================
// 🚀 ROW COMPONENT (With Total Freeze Lockdown)
// ==========================================
const AccountRow = ({ acc, updateAccount, isManagerAccount, allManagers, isVersionChild }) => {
  const [activeInput, setActiveInput] = useState(null); 
  const [localVals, setLocalVals] = useState({});

  const handleFocus = (field, value) => {
    setActiveInput(field);
    setLocalVals({ ...localVals, [field]: value ?? "" });
  };

  const handleChange = (field, value) => {
    setLocalVals({ ...localVals, [field]: value });
  };

  const handleBlur = (field, originalValue, isString = false) => {
    setActiveInput(null);
    const rawVal = localVals[field];
    
    let finalValue;
    if (isString) {
      finalValue = rawVal?.trim() || "";
    } else {
      finalValue = (rawVal === "" || rawVal === undefined) ? null : Number(rawVal);
    }
    
    if (finalValue !== originalValue) {
      updateAccount(acc.email, field, finalValue);
    }
  };

  const hasBonus = !!acc.hasBonus; 
  const isSuspended = acc.status === "suspended"; // 🚀 FROZEN CHECK

  const handleAutoName = () => {
    if (isSuspended) return; // Extra safety
    const prefix = acc.assignedLeader ? acc.assignedLeader.replace(/\s+/g, '') : "Pool";
    const autoName = `${prefix}_rater${acc.leaderIndex}`;
    updateAccount(acc.email, 'raterName', autoName);
  };

  // Modern input styling with Frozen support
  const inputStyle = {
    padding: "8px 10px",
    outline: "none",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "13px",
    transition: "all 0.2s ease",
    backgroundColor: isSuspended ? "#fff1f2" : "#f8fafc",
    color: isSuspended ? "#be123c" : "#1e293b",
    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)",
    cursor: isSuspended ? "not-allowed" : "text"
  };

  const focusStyle = { border: "1px solid #3b82f6", backgroundColor: "#fff", boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)" };

  return (
    <tr style={{ 
      borderBottom: "1px solid #f1f5f9", 
      backgroundColor: isSuspended ? "#fff1f2" : (isVersionChild ? "#fafafa" : "#fff"), 
      transition: "background-color 0.2s"
    }}>
      
      {/* 1. Account Identity & Frozen Warning */}
      <td style={{ 
        padding: "16px 12px", 
        paddingLeft: isVersionChild ? "45px" : "16px",
        borderLeft: isVersionChild ? "3px solid #cbd5e1" : (isSuspended ? "3px solid #f43f5e" : "3px solid transparent")
      }}>
        <div style={{ fontSize: "14px", fontWeight: "700", color: isSuspended ? "#be123c" : "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
          {isVersionChild && <span style={{ color: "#94a3b8", fontSize: "18px", lineHeight: "1" }}>↳</span>}
          {acc.email}
          {isSuspended && (
            <span style={{ background: "#f43f5e", color: "white", fontSize: "10px", padding: "3px 8px", borderRadius: "12px", fontWeight: "bold", letterSpacing: "0.5px", boxShadow: "0 2px 4px rgba(244, 63, 94, 0.2)" }}>
              FROZEN
            </span>
          )}
        </div>
        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ background: "#e2e8f0", width: "6px", height: "6px", borderRadius: "50%" }}></span>
          {acc.clientName || "Unassigned Client"}
        </div>
      </td>
      
      {/* USD Revenue */}
      <td style={{ padding: "16px 12px" }}>
        <input 
          type="number" step="0.1" 
          placeholder="Nil"
          disabled={isSuspended}
          value={activeInput === 'payRateUSD' ? localVals.payRateUSD : (acc.payRateUSD ?? '')} 
          onFocus={() => handleFocus('payRateUSD', acc.payRateUSD)}
          onChange={(e) => handleChange('payRateUSD', e.target.value)}
          onBlur={() => handleBlur('payRateUSD', acc.payRateUSD)}
          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
          style={{ ...inputStyle, width: "65px", fontWeight: "800", color: isSuspended ? "#be123c" : "#059669", border: `1px solid ${isSuspended ? '#fda4af' : '#a7f3d0'}`, backgroundColor: isSuspended ? "#ffe4e6" : "#ecfdf5" }} 
        />
      </td>

      {/* 2. Leader Pay (Base ➔ Max) */}
      <td style={{ padding: "16px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: isSuspended ? "transparent" : "#eff6ff", padding: "8px", borderRadius: "10px", width: "max-content", opacity: isSuspended ? 0.7 : 1 }}>
          <input 
            type="number" placeholder="Nil" title="Base Rate (e.g. 200)"
            disabled={isSuspended}
            value={activeInput === 'leaderBaseINR' ? localVals.leaderBaseINR : (acc.leaderBaseINR ?? '')} 
            onFocus={() => handleFocus('leaderBaseINR', acc.leaderBaseINR)}
            onChange={(e) => handleChange('leaderBaseINR', e.target.value)}
            onBlur={() => handleBlur('leaderBaseINR', acc.leaderBaseINR)}
            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
            style={{ ...inputStyle, width: "55px", border: "1px solid #bfdbfe", backgroundColor: isSuspended ? "#fff1f2" : "#fff" }} 
            onFocusCapture={(e) => !isSuspended && Object.assign(e.target.style, focusStyle)}
            onBlurCapture={(e) => !isSuspended && Object.assign(e.target.style, { border: "1px solid #bfdbfe", backgroundColor: "#fff", boxShadow: "none" })}
          />
          {hasBonus && (
            <>
              <span style={{ color: "#60a5fa", fontWeight: "900" }}>➔</span>
              <input 
                type="number" placeholder="Nil" title="Target Rate with Bonus (e.g. 220)"
                disabled={isSuspended}
                value={activeInput === 'leaderMaxINR' ? localVals.leaderMaxINR : (acc.leaderMaxINR ?? '')} 
                onFocus={() => handleFocus('leaderMaxINR', acc.leaderMaxINR)}
                onChange={(e) => handleChange('leaderMaxINR', e.target.value)}
                onBlur={() => handleBlur('leaderMaxINR', acc.leaderMaxINR)}
                onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                style={{ ...inputStyle, width: "55px", border: "2px solid #3b82f6", fontWeight: "800", color: "#1d4ed8", backgroundColor: isSuspended ? "#fff1f2" : "#fff" }} 
              />
            </>
          )}
        </div>
      </td>

      {/* 3. Rater Pay (Base ➔ Max) */}
      <td style={{ padding: "16px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: isSuspended ? "transparent" : "#faf5ff", padding: "8px", borderRadius: "10px", width: "max-content", opacity: isSuspended ? 0.7 : 1 }}>
          <input 
            type="number" placeholder="Nil" title="Base Rate (e.g. 160)"
            disabled={isSuspended}
            value={activeInput === 'raterBaseINR' ? localVals.raterBaseINR : (acc.raterBaseINR ?? '')} 
            onFocus={() => handleFocus('raterBaseINR', acc.raterBaseINR)}
            onChange={(e) => handleChange('raterBaseINR', e.target.value)}
            onBlur={() => handleBlur('raterBaseINR', acc.raterBaseINR)}
            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
            style={{ ...inputStyle, width: "55px", border: "1px solid #e9d5ff", backgroundColor: isSuspended ? "#fff1f2" : "#fff" }} 
            onFocusCapture={(e) => !isSuspended && Object.assign(e.target.style, focusStyle)}
            onBlurCapture={(e) => !isSuspended && Object.assign(e.target.style, { border: "1px solid #e9d5ff", backgroundColor: "#fff", boxShadow: "none" })}
          />
          {hasBonus && (
            <>
              <span style={{ color: "#c084fc", fontWeight: "900" }}>➔</span>
              <input 
                type="number" placeholder="Nil" title="Target Rate with Bonus (e.g. 180)"
                disabled={isSuspended}
                value={activeInput === 'raterMaxINR' ? localVals.raterMaxINR : (acc.raterMaxINR ?? '')} 
                onFocus={() => handleFocus('raterMaxINR', acc.raterMaxINR)}
                onChange={(e) => handleChange('raterMaxINR', e.target.value)}
                onBlur={() => handleBlur('raterMaxINR', acc.raterMaxINR)}
                onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                style={{ ...inputStyle, width: "55px", border: "2px solid #a855f7", fontWeight: "800", color: "#6b21a8", backgroundColor: isSuspended ? "#fff1f2" : "#fff" }} 
              />
            </>
          )}
        </div>
      </td>

      {/* Bonus Toggle & Settings */}
      <td style={{ padding: "16px 12px", borderRight: "1px dashed #e2e8f0" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", opacity: isSuspended ? 0.6 : 1 }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: "800", color: hasBonus ? "#059669" : "#94a3b8", cursor: isSuspended ? "not-allowed" : "pointer", background: hasBonus ? "#ecfdf5" : "#f1f5f9", padding: "4px 8px", borderRadius: "6px", width: "max-content", transition: "all 0.2s" }}>
            <input 
              type="checkbox" 
              checked={hasBonus} 
              disabled={isSuspended}
              onChange={(e) => updateAccount(acc.email, 'hasBonus', e.target.checked)} 
              style={{ cursor: isSuspended ? "not-allowed" : "pointer", accentColor: "#10b981", width: "14px", height: "14px" }}
            />
            {hasBonus ? "BONUS ON" : "NO BONUS"}
          </label>
          
          {hasBonus && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <input 
                type="number" placeholder="40"
                disabled={isSuspended}
                value={activeInput === 'bonusThreshold' ? localVals.bonusThreshold : (acc.bonusThreshold ?? 40)} 
                onFocus={() => handleFocus('bonusThreshold', acc.bonusThreshold ?? 40)}
                onChange={(e) => handleChange('bonusThreshold', e.target.value)}
                onBlur={() => handleBlur('bonusThreshold', acc.bonusThreshold ?? 40)}
                onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                style={{ ...inputStyle, width: "50px", textAlign: "center", padding: "6px" }} 
                onFocusCapture={(e) => !isSuspended && Object.assign(e.target.style, focusStyle)}
                onBlurCapture={(e) => !isSuspended && Object.assign(e.target.style, { border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)" })}
              />
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>hrs target</span>
            </div>
          )}
        </div>
      </td>

      {/* 🚀 ACTION: MANAGE HIERARCHY */}
      <td style={{ padding: "16px 16px" }}>
        {isManagerAccount ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", opacity: isSuspended ? 0.6 : 1 }}>
            <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: "800", letterSpacing: "0.5px" }}>Managed By</span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: acc.role === 'co-admin' ? "#faf5ff" : "#eff6ff", padding: "8px 12px", borderRadius: "8px", border: `1px solid ${acc.role === 'co-admin' ? "#e9d5ff" : "#bfdbfe"}`, width: "max-content" }}>
              <span style={{ fontSize: "16px" }}>👤</span>
              <span style={{ fontSize: "13px", color: acc.role === 'co-admin' ? "#7e22ce" : "#1d4ed8", fontWeight: "800" }}>
                {acc.leaderName || "Unnamed"} <span style={{ opacity: 0.7, fontWeight: "600", fontSize: "11px" }}>({acc.role})</span>
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", opacity: isSuspended ? 0.6 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "800", width: "55px", textAlign: "right" }}>Leader</span>
              <select 
                value={acc.assignedLeader || ""} 
                disabled={isSuspended}
                onChange={(e) => updateAccount(acc.email, 'assignedLeader', e.target.value)} 
                style={{ ...inputStyle, width: "160px", cursor: isSuspended ? "not-allowed" : "pointer", fontWeight: "700", backgroundColor: isSuspended ? "#fff1f2" : "#fff", border: "1px solid #cbd5e1" }}
                onFocusCapture={(e) => !isSuspended && Object.assign(e.target.style, focusStyle)}
                onBlurCapture={(e) => !isSuspended && Object.assign(e.target.style, { border: "1px solid #cbd5e1", boxShadow: "none" })}
              >
                <option value="">-- Unassigned --</option>
                {allManagers.map(m => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "800", width: "55px", textAlign: "right" }}>Worker</span>
              <div style={{ display: "flex", gap: "6px" }}>
                <input 
                  type="text" placeholder="Worker Name"
                  disabled={isSuspended}
                  value={activeInput === 'raterName' ? localVals.raterName : (acc.raterName || '')} 
                  onFocus={() => handleFocus('raterName', acc.raterName)}
                  onChange={(e) => handleChange('raterName', e.target.value)}
                  onBlur={() => handleBlur('raterName', acc.raterName, true)}
                  onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                  style={{ ...inputStyle, width: "118px", backgroundColor: isSuspended ? "#fff1f2" : "#fff" }} 
                  onFocusCapture={(e) => !isSuspended && Object.assign(e.target.style, focusStyle)}
                  onBlurCapture={(e) => !isSuspended && Object.assign(e.target.style, { border: "1px solid #e2e8f0", boxShadow: "none" })}
                />
                <button 
                  onClick={handleAutoName} 
                  disabled={isSuspended}
                  style={{ background: "#e2e8f0", color: "#475569", border: "none", borderRadius: "8px", cursor: isSuspended ? "not-allowed" : "pointer", padding: "0 10px", fontSize: "13px", fontWeight: "bold", transition: "all 0.2s" }}
                  onMouseOver={(e) => !isSuspended && (e.target.style.background = "#cbd5e1")}
                  onMouseOut={(e) => !isSuspended && (e.target.style.background = "#e2e8f0")}
                  title={isSuspended ? "Cannot auto-name frozen account" : "Auto-generate name based on leader"}
                >
                  ✨ Auto
                </button>
              </div>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function AccountManagement() {
  const [usersList, setUsersList] = useState([]);
  const [globalNames, setGlobalNames] = useState({ leaderNames: [], coAdminNames: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "systemSettings", "roles"), (snap) => {
      if (snap.exists()) {
        setGlobalNames(snap.data());
      }
    });
    return () => unsub();
  }, []);

  const updateAccount = (email, field, val) => {
    setDoc(doc(db, "users", email), { [field]: val }, { merge: true });
  };

  if (loading) return <div style={{ padding: "100px", textAlign: "center", fontWeight: "bold", color: "#64748b", fontSize: "18px" }}>Fetching Agency Hierarchy...</div>;

  // Dynamic Manager Merge
  const managerMap = {};
  (globalNames.leaderNames || []).forEach(name => { managerMap[name] = { name, role: 'leader' }; });
  (globalNames.coAdminNames || []).forEach(name => { managerMap[name] = { name, role: 'co-admin' }; });

  usersList.forEach(u => {
    if ((u.role === 'leader' || u.role === 'co-admin') && u.leaderName?.trim()) {
      if (!managerMap[u.leaderName]) {
        managerMap[u.leaderName] = { name: u.leaderName, role: u.role };
      }
    }
  });

  const allManagers = Object.values(managerMap).sort((a, b) => a.name.localeCompare(b.name));

  // Base Logic & Indexing
  const leaderCounters = {};
  const assignableAccounts = usersList
    .filter(u => u.role !== 'admin')
    .sort((a, b) => a.email.localeCompare(b.email)) 
    .map(acc => {
      const groupKey = acc.assignedLeader || 'Unassigned';
      if (!leaderCounters[groupKey]) leaderCounters[groupKey] = 0;
      leaderCounters[groupKey]++;
      return { ...acc, leaderIndex: leaderCounters[groupKey] };
    });

  // ==========================================
  // TABLE RENDERING (With Version Grouping)
  // ==========================================
  const AccountTable = ({ filteredAccounts }) => {
    // 1. Group by Base Email
    const grouped = {};
    filteredAccounts.forEach(acc => {
      const base = getBaseEmail(acc.email);
      if(!grouped[base]) grouped[base] = [];
      grouped[base].push(acc);
    });

    // 2. Sort groups by Base Email, and internally by Version Number
    const sortedGroups = Object.values(grouped).map(group => {
      return group.sort((a, b) => getVersionNum(a.email) - getVersionNum(b.email));
    }).sort((g1, g2) => g1[0].email.localeCompare(g2[0].email));

    return (
      <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", backgroundColor: "#fff" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
              <th style={{ padding: "16px 12px", color: "#475569", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>Account & Client</th>
              <th style={{ padding: "16px 12px", color: "#475569", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>Rev / hr</th>
              <th style={{ padding: "16px 12px", color: "#475569", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>Leader Pay</th>
              <th style={{ padding: "16px 12px", color: "#475569", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>Rater Pay</th>
              <th style={{ padding: "16px 12px", color: "#475569", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>Settings</th>
              <th style={{ padding: "16px 16px", color: "#475569", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>Assignments</th>
            </tr>
          </thead>
          <tbody>
            {sortedGroups.map((group) => (
              <React.Fragment key={group[0].email + "_group"}>
                {group.map((acc, index) => (
                  <AccountRow 
                    key={acc.email} 
                    acc={acc} 
                    updateAccount={updateAccount} 
                    isManagerAccount={acc.role === 'leader' || acc.role === 'co-admin'} 
                    allManagers={allManagers} 
                    isVersionChild={index > 0} 
                  />
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const unassignedAccounts = assignableAccounts.filter(a => {
    if (a.role !== 'rater') return false;
    const hasNoLeader = !a.assignedLeader?.trim();
    const leaderIsMissing = !allManagers.some(m => m.name === a.assignedLeader);
    return hasNoLeader || leaderIsMissing;
  });

  return (
    <div style={{ backgroundColor: "#f1f5f9", minHeight: "100vh", padding: "40px 20px", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        
        {/* HEADER */}
        <div style={{ marginBottom: "40px", paddingBottom: "20px", borderBottom: "2px solid #e2e8f0" }}>
          <h1 style={{ margin: "0 0 8px 0", fontSize: "32px", color: "#0f172a", fontWeight: "900", letterSpacing: "-0.5px" }}>📁 Agency Hierarchy & Payouts</h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "15px" }}>Manage account distribution, adjust payout metrics, and cycle workers seamlessly. <br/>Leave inputs empty to register as <strong style={{color: "#0f172a"}}>Nil</strong>.</p>
        </div>

        {/* UNASSIGNED POOL */}
        <div style={{ marginBottom: "50px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "15px" }}>
            <h2 style={{ margin: 0, fontSize: "20px", color: "#334155", fontWeight: "800" }}>Unassigned Raters</h2>
            <span style={{ backgroundColor: "#e2e8f0", color: "#475569", padding: "4px 10px", borderRadius: "20px", fontSize: "13px", fontWeight: "800" }}>{unassignedAccounts.length}</span>
          </div>
          {unassignedAccounts.length > 0 ? (
            <AccountTable filteredAccounts={unassignedAccounts} />
          ) : (
            <div style={{ padding: "40px", textAlign: "center", background: "#fff", borderRadius: "16px", border: "2px dashed #cbd5e1", color: "#94a3b8" }}>
              <span style={{ fontSize: "30px", display: "block", marginBottom: "10px" }}>🎉</span>
              <span style={{ fontWeight: "600" }}>All accounts are currently assigned to a leader!</span>
            </div>
          )}
        </div>

        {/* LEADER GROUPS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
          {allManagers.map(manager => {
            const groupAccounts = assignableAccounts.filter(a => 
              (a.role === 'leader' || a.role === 'co-admin' ? a.leaderName === manager.name : a.assignedLeader === manager.name)
            );
            
            const isCoAdmin = manager.role === 'co-admin';
            const accentColor = isCoAdmin ? "#a855f7" : "#3b82f6";
            const lightColor = isCoAdmin ? "#faf5ff" : "#eff6ff";

            return (
              <div key={manager.name} style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0", borderTop: `6px solid ${accentColor}`, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02)", overflow: "hidden" }}>
                
                <div style={{ padding: "20px 25px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", backgroundColor: "#f8fafc" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                    <div style={{ width: "45px", height: "45px", borderRadius: "12px", backgroundColor: lightColor, color: accentColor, display: "flex", justifyContent: "center", alignItems: "center", fontSize: "20px", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)" }}>
                      {isCoAdmin ? "🛡️" : "👑"}
                    </div>
                    <div>
                      <h2 style={{ margin: "0 0 4px 0", color: "#0f172a", fontSize: "22px", fontWeight: "900", letterSpacing: "-0.5px" }}>{manager.name}</h2>
                      <span style={{ fontSize: "11px", color: accentColor, fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px" }}>{manager.role} Group</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "24px", fontWeight: "900", color: "#1e293b", lineHeight: "1" }}>{groupAccounts.length}</div>
                    <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", marginTop: "4px" }}>Accounts</div>
                  </div>
                </div>
                
                <div style={{ padding: "20px" }}>
                  {groupAccounts.length > 0 ? (
                    <AccountTable filteredAccounts={groupAccounts} />
                  ) : (
                    <div style={{ padding: "40px", textAlign: "center", background: "#f8fafc", borderRadius: "12px", color: "#94a3b8", border: "1px dashed #cbd5e1" }}>
                      <span style={{ fontWeight: "600" }}>No accounts assigned to this manager yet.</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}