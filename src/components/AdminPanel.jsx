import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, onSnapshot, doc, setDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from "firebase/firestore";

// ==========================================
// 🚀 ROW COMPONENT
// ==========================================
const UserRow = ({ u, updateUser, allLeaderNames, allCoAdminNames, handleOpenVersionModal, isVersionChild, isSettingsLocked, handleDeleteUser }) => {
  const [isNameLocked, setIsNameLocked] = useState(true);
  const [tempClientName, setTempClientName] = useState("");
  const [localPayRate, setLocalPayRate] = useState(u.payRateUSD || 0);
  const [isEditingPay, setIsEditingPay] = useState(false);

  useEffect(() => { setLocalPayRate(u.payRateUSD || 0); }, [u.payRateUSD]);

  const handleSaveName = () => {
    if (!tempClientName.trim()) return alert("Client name cannot be empty.");
    updateUser(u.email, "clientName", tempClientName.trim());
    setIsNameLocked(true);
  };

  const handleCancelName = () => setIsNameLocked(true);

  const handleBlurPay = () => {
    setIsEditingPay(false);
    if (Number(localPayRate) !== (u.payRateUSD || 0)) {
      updateUser(u.email, "payRateUSD", Number(localPayRate));
    }
  };

  const isSuspended = u.status === "suspended";
  const isImmuneAdmin = u.role === "admin";
  const allowedNames = u.role === 'leader' ? allLeaderNames : allCoAdminNames;

  return (
    <tr
      style={{
        borderBottom: "1px solid #e2e8f0",
        backgroundColor: isSuspended ? "#fff1f2" : (isVersionChild ? "#f8fafc" : "#fff"),
        opacity: isSuspended ? 0.8 : 1,
      }}
    >
      <td style={{ padding: "15px", paddingLeft: isVersionChild ? "40px" : "15px", fontWeight: "bold", color: "#1e293b", fontSize: "14px", borderLeft: isVersionChild ? "4px solid #cbd5e1" : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {isVersionChild && <span style={{ color: "#94a3b8", fontSize: "16px" }}>↳</span>}
          {u.email}
        </div>
      </td>

      <td style={{ padding: "15px", fontWeight: "bold" }}>
        {isNameLocked ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#1e293b", fontSize: "14px", width: "140px", display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={u.clientName}>
              {u.clientName || "-- No Name --"}
            </span>
            <button
              onClick={() => {
                setTempClientName(u.clientName || "");
                setIsNameLocked(false);
              }}
              style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontSize: "12px", padding: "6px", color: "#475569" }}
            >
              🔒 Edit
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <input
              type="text"
              value={tempClientName}
              onChange={(e) => setTempClientName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              style={{ padding: "8px", borderRadius: "6px", border: "2px solid #3b82f6", width: "130px", fontWeight: "bold", outline: "none" }}
              autoFocus
            />
            <button onClick={handleSaveName} style={{ background: "#10b981", color: "white", border: "none", cursor: "pointer", padding: "8px 10px", borderRadius: "6px" }}>💾</button>
            <button onClick={handleCancelName} style={{ background: "#ef4444", color: "white", border: "none", cursor: "pointer", padding: "8px 10px", borderRadius: "6px" }}>❌</button>
          </div>
        )}
      </td>

      <td style={{ padding: "15px" }}>
        <select
          value={u.role || "rater"}
          onChange={(e) => updateUser(u.email, "role", e.target.value)}
          style={{ padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontWeight: "bold", color: u.role === "admin" ? "#ef4444" : "#1e293b", outline: "none" }}
        >
          <option value="rater">Rater</option>
          <option value="leader">Leader</option>
          <option value="co-admin">Co-Admin</option>
          <option value="admin">Admin</option>
        </select>
      </td>

      <td style={{ padding: "15px" }}>
        {u.role === "leader" || u.role === "co-admin" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "10px", color: u.role === "leader" ? "#6366f1" : "#a855f7", fontWeight: "bold", textTransform: "uppercase" }}>
              Select {u.role === "leader" ? "Leader" : "Co-Admin"}
            </span>
            <select
              value={u.leaderName || ""}
              onChange={(e) => updateUser(u.email, "leaderName", e.target.value)}
              style={{
                padding: "8px",
                borderRadius: "6px",
                border: `2px solid ${u.role === "leader" ? "#a5b4fc" : "#d8b4fe"}`,
                width: "150px",
                fontWeight: "bold",
                color: u.role === "leader" ? "#312e81" : "#581c87",
                backgroundColor: isSuspended ? "#f8fafc" : u.role === "leader" ? "#e0e7ff" : "#f3e8ff",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="">-- Choose Name --</option>
              {allowedNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        ) : (
          <span style={{ color: "#94a3b8", fontSize: "12px", fontStyle: "italic" }}>Not Applicable</span>
        )}
      </td>

      <td style={{ padding: "15px", backgroundColor: isSuspended ? "transparent" : "#f0fdf4" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ color: "#166534", fontWeight: "900" }}>$</span>
          <input
            type="number"
            step="0.1"
            value={isEditingPay ? localPayRate : u.payRateUSD || 0}
            onFocus={() => { setLocalPayRate(u.payRateUSD || 0); setIsEditingPay(true); }}
            onChange={(e) => setLocalPayRate(e.target.value)}
            onBlur={handleBlurPay}
            onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
            style={{ padding: "6px", borderRadius: "4px", border: "1px solid #bbf7d0", width: "70px", fontWeight: "bold", color: "#166534", outline: "none", background: isSuspended ? "transparent" : "#fff" }}
          />
        </div>
      </td>

      <td style={{ padding: "15px", textAlign: "center" }}>
        {isImmuneAdmin ? (
          <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "bold" }}>IMMUNE 🛡️</span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => updateUser(u.email, "status", isSuspended ? "active" : "suspended")}
              style={{ padding: "8px 14px", borderRadius: "20px", border: "none", fontSize: "12px", fontWeight: "bold", cursor: "pointer", backgroundColor: isSuspended ? "#fecdd3" : "#dcfce3", color: isSuspended ? "#be123c" : "#166534", width: "120px" }}
            >
              {isSuspended ? "SUSPENDED 🔒" : "ACTIVE ✅"}
            </button>
            
            {isSuspended && (
              <button
                onClick={() => handleOpenVersionModal(u)}
                style={{ padding: "6px 10px", backgroundColor: "#3b82f6", color: "white", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "10px", fontWeight: "bold", width: "120px", boxShadow: "0 2px 4px rgba(59, 130, 246, 0.3)" }}
                title="Duplicate this account as a fresh V2, V3, etc."
              >
                ➕ Create New Ver.
              </button>
            )}

            {/* 🔴 DUAL-PROTECTED DELETE BUTTON */}
            {u.role === 'rater' && !isSettingsLocked && (
              <button
                onClick={() => handleDeleteUser(u.email)}
                style={{ 
                  padding: "4px 8px", 
                  backgroundColor: "transparent", 
                  color: "#ef4444", 
                  borderRadius: "6px", 
                  border: "1px solid #fca5a5", 
                  cursor: "pointer", 
                  fontSize: "10px", 
                  fontWeight: "bold", 
                  width: "120px", 
                  marginTop: "4px" 
                }}
                title="Permanently delete this rater account"
              >
                🗑️ Delete Account
              </button>
            )}
          </div>
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

  const [isSettingsLocked, setIsSettingsLocked] = useState(true); 
  const [sortBy, setSortBy] = useState("email"); 

  const [globalNames, setGlobalNames] = useState({ leaderNames: [], coAdminNames: [] });
  const [newLeader, setNewLeader] = useState("");
  const [newCoAdmin, setNewCoAdmin] = useState("");

  const [versionModal, setVersionModal] = useState({
    isOpen: false,
    acc: null,
    email: "",
    password: ""
  });

  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribeUsers = onSnapshot(q, (snap) => {
      setUsersList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsubscribeUsers();
  }, []);

  useEffect(() => {
    const settingsRef = doc(db, "systemSettings", "roles");
    const unsubscribeSettings = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) {
        setGlobalNames(snap.data());
      } else {
        setDoc(settingsRef, { leaderNames: [], coAdminNames: [] });
      }
    });
    return () => unsubscribeSettings();
  }, []);

  const activeLeaderNames = usersList.filter(u => u.role === 'leader' && u.leaderName).map(u => u.leaderName);
  const activeCoAdminNames = usersList.filter(u => u.role === 'co-admin' && u.leaderName).map(u => u.leaderName);

  const allLeaderNames = [...new Set([...(globalNames.leaderNames || []), ...activeLeaderNames])].sort();
  const allCoAdminNames = [...new Set([...(globalNames.coAdminNames || []), ...activeCoAdminNames])].sort();

  const updateUser = async (email, field, value) => {
    try {
      await setDoc(doc(db, "users", email), { [field]: value }, { merge: true });
    } catch (error) {
      alert("Failed to update user database.");
    }
  };

  const getBaseEmail = (email) => {
    const parts = email.split("@");
    if(parts.length !== 2) return email;
    const name = parts[0].replace(/_V\d+$/i, "");
    return `${name}@${parts[1]}`;
  };

  const getVersionNum = (email) => {
    const parts = email.split("@");
    if(parts.length !== 2) return 1;
    const m = parts[0].match(/_V(\d+)$/i);
    return m ? parseInt(m[1]) : 1;
  };

  const groupedUsers = {};
  usersList.forEach(u => {
    const base = getBaseEmail(u.email);
    if (!groupedUsers[base]) groupedUsers[base] = [];
    groupedUsers[base].push(u);
  });

  const sortedGroups = Object.values(groupedUsers).map(group => {
    return group.sort((a, b) => getVersionNum(a.email) - getVersionNum(b.email));
  }).sort((groupA, groupB) => {
    const a = groupA[0];
    const b = groupB[0];
    if (sortBy === "clientName") {
      return (a.clientName || "").localeCompare(b.clientName || "") || a.email.localeCompare(b.email);
    }
    if (sortBy === "role") {
      return (a.role || "").localeCompare(b.role || "") || a.email.localeCompare(b.email);
    }
    if (sortBy === "leader") {
      return (a.leaderName || a.assignedLeader || "").localeCompare(b.leaderName || b.assignedLeader || "") || a.email.localeCompare(b.email);
    }
    return a.email.localeCompare(b.email);
  });

  const handleOpenVersionModal = (acc) => {
    const baseEmail = getBaseEmail(acc.email);
    const group = usersList.filter(u => getBaseEmail(u.email) === baseEmail);
    const maxV = Math.max(...group.map(u => getVersionNum(u.email)));
    const nextV = maxV + 1;

    const parts = acc.email.split("@");
    const baseName = parts[0].replace(/_V\d+$/i, "");
    const domain = parts.length > 1 ? `@${parts[1]}` : "";
    const newEmail = `${baseName}_V${nextV}${domain}`;

    setVersionModal({
      isOpen: true,
      acc: acc,
      email: newEmail,
      password: ""
    });
  };

  const confirmCreateNewVersion = async () => {
    if (!versionModal.email || !versionModal.password) {
      return alert("Email and Password are required.");
    }
    try {
      await setDoc(doc(db, "users", versionModal.email.toLowerCase()), {
        email: versionModal.email.toLowerCase(),
        password: versionModal.password,
        clientName: versionModal.acc.clientName || "",
        role: "rater",
        status: "active",
        payRateUSD: versionModal.acc.payRateUSD || 0,
        createdAt: new Date().toISOString()
      });
      setVersionModal({ isOpen: false, acc: null, email: "", password: "" });
    } catch (err) {
      alert("Failed to create new account version.");
    }
  };

  // 🔴 NEW: STRICT DELETE LOGIC
  const handleDeleteUser = async (email) => {
    const confirmEmail = window.prompt(
      `⚠️ DANGER ZONE ⚠️\n\nYou are about to permanently delete the account:\n${email}\n\nThis action cannot be undone. To confirm, type the exact email address below:`
    );
    
    if (confirmEmail === null) return; // User clicked Cancel
    
    if (confirmEmail.trim().toLowerCase() === email.toLowerCase()) {
      try {
        await deleteDoc(doc(db, "users", email));
      } catch (err) {
        alert("Failed to delete account. Check permissions.");
      }
    } else {
      alert("Email did not match. Deletion cancelled.");
    }
  };

  const handleAddName = async (type, nameInput, setInput) => {
    if (!nameInput.trim()) return;
    try {
      const settingsRef = doc(db, "systemSettings", "roles");
      await setDoc(settingsRef, { [type]: arrayUnion(nameInput.trim()) }, { merge: true });
      setInput(""); 
    } catch (err) {
      alert("Failed to add name to system.");
    }
  };

  const checkIsNameInUse = (name) => {
    return usersList.some(u => u.leaderName === name || u.assignedLeader === name);
  };

  const handleRemoveName = async (type, nameToRemove) => {
    const isNameInUse = checkIsNameInUse(nameToRemove);
    if (isNameInUse) {
      alert(`⛔ ACTION BLOCKED: Cannot delete "${nameToRemove}".\n\nThis person is currently assigned to one or more accounts. You must unassign them before deleting this name.`);
      return;
    }
    if(!window.confirm(`Are you sure you want to completely remove ${nameToRemove} from the allowed list?`)) return;
    try {
      const settingsRef = doc(db, "systemSettings", "roles");
      await updateDoc(settingsRef, { [type]: arrayRemove(nameToRemove) });
    } catch (err) {
      alert("Failed to remove name.");
    }
  };

  if (loading) return <div style={{ padding: "100px", textAlign: "center", fontSize: "18px" }}>Loading Command Center...</div>;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px", fontFamily: "'Inter', sans-serif" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", backgroundColor: "#1e293b", padding: "20px", borderRadius: "12px", color: "white" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "800" }}>🔐 Admin Command Center</h1>
          <p style={{ margin: "5px 0 0 0", color: "#94a3b8", fontSize: "14px" }}>Manage System Roles and Access</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => setCurrentView("accountManagement")} style={{ padding: "10px 20px", backgroundColor: "#10b981", color: "white", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold" }}>💼 Account Management</button>
          <button onClick={() => setCurrentView("dashboard")} style={{ padding: "10px 20px", backgroundColor: "#3b82f6", color: "white", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "bold" }}>⬅ Back</button>
        </div>
      </div>

      {/* ⚙️ SETTINGS LOCK CONTROL */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
        <h2 style={{ margin: 0, color: "#1e293b", fontSize: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
          ⚙️ Global Configurations
        </h2>
        <button 
          onClick={() => setIsSettingsLocked(!isSettingsLocked)}
          style={{
            padding: "8px 16px",
            backgroundColor: isSettingsLocked ? "#f1f5f9" : "#ef4444",
            color: isSettingsLocked ? "#475569" : "#fff",
            border: isSettingsLocked ? "1px solid #cbd5e1" : "none",
            borderRadius: "6px",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: isSettingsLocked ? "none" : "0 2px 4px rgba(239, 68, 68, 0.3)"
          }}
        >
          {isSettingsLocked ? "🔓 Click to Unlock Configs & Actions" : "🔒 Lock Settings"}
        </button>
      </div>

      {/* ⚙️ OFFICIAL NAMES MANAGER CARDS */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "40px", opacity: isSettingsLocked ? 0.8 : 1, transition: "0.2s", pointerEvents: isSettingsLocked ? "none" : "auto" }}>
        <div style={{ flex: 1, backgroundColor: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <h3 style={{ margin: "0 0 15px 0", color: "#312e81", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>👑</span> Leaders
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "15px" }}>
            {allLeaderNames.map(name => {
              const inUse = checkIsNameInUse(name);
              return (
                <span key={name} style={{ background: inUse ? "#f1f5f9" : "#e0e7ff", color: inUse ? "#64748b" : "#3730a3", padding: "4px 10px", borderRadius: "20px", fontSize: "13px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px", border: inUse ? "1px solid #cbd5e1" : "none" }}>
                  {name}
                  <button 
                    onClick={() => handleRemoveName('leaderNames', name)} 
                    style={{ background: "transparent", border: "none", color: inUse ? "#94a3b8" : "#4f46e5", cursor: inUse ? "not-allowed" : "pointer", fontSize: "14px", padding: 0 }}
                    title={inUse ? "Protected: Currently assigned to an account." : "Remove name"}
                  >
                    {inUse ? "🔒" : "×"}
                  </button>
                </span>
              );
            })}
            {allLeaderNames.length === 0 && <span style={{ color: "#94a3b8", fontSize: "13px", fontStyle: "italic" }}>No names added.</span>}
          </div>
          
          <div style={{ display: "flex", gap: "8px" }}>
            <input type="text" value={newLeader} onChange={(e)=>setNewLeader(e.target.value)} placeholder="Add new Leader..." onKeyDown={(e)=>e.key === 'Enter' && handleAddName('leaderNames', newLeader, setNewLeader)} style={{ flex: 1, padding: "8px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none" }} />
            <button onClick={() => handleAddName('leaderNames', newLeader, setNewLeader)} style={{ padding: "8px 15px", background: "#4f46e5", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>Add</button>
          </div>
        </div>

        <div style={{ flex: 1, backgroundColor: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <h3 style={{ margin: "0 0 15px 0", color: "#581c87", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>🛡️</span> Co-Admins
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "15px" }}>
            {allCoAdminNames.map(name => {
              const inUse = checkIsNameInUse(name);
              return (
                <span key={name} style={{ background: inUse ? "#f8fafc" : "#f3e8ff", color: inUse ? "#64748b" : "#6b21a8", padding: "4px 10px", borderRadius: "20px", fontSize: "13px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px", border: inUse ? "1px solid #cbd5e1" : "none" }}>
                  {name}
                  <button 
                    onClick={() => handleRemoveName('coAdminNames', name)} 
                    style={{ background: "transparent", border: "none", color: inUse ? "#94a3b8" : "#7e22ce", cursor: inUse ? "not-allowed" : "pointer", fontSize: "14px", padding: 0 }}
                    title={inUse ? "Protected: Currently assigned to an account." : "Remove name"}
                  >
                    {inUse ? "🔒" : "×"}
                  </button>
                </span>
              );
            })}
            {allCoAdminNames.length === 0 && <span style={{ color: "#94a3b8", fontSize: "13px", fontStyle: "italic" }}>No names added.</span>}
          </div>
          
          <div style={{ display: "flex", gap: "8px" }}>
            <input type="text" value={newCoAdmin} onChange={(e)=>setNewCoAdmin(e.target.value)} placeholder="Add new Co-Admin..." onKeyDown={(e)=>e.key === 'Enter' && handleAddName('coAdminNames', newCoAdmin, setNewCoAdmin)} style={{ flex: 1, padding: "8px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none" }} />
            <button onClick={() => handleAddName('coAdminNames', newCoAdmin, setNewCoAdmin)} style={{ padding: "8px 15px", background: "#7e22ce", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>Add</button>
          </div>
        </div>
      </div>

      {/* 🗂️ TABLE SORTING CONTROLS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "15px" }}>
        <h2 style={{ margin: 0, color: "#1e293b", fontSize: "18px" }}>👥 System Accounts</h2>
        
        <div style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: "#f8fafc", padding: "8px 15px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "13px", fontWeight: "bold", color: "#64748b" }}>Sort by:</span>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)} 
            style={{ padding: "6px", borderRadius: "4px", border: "1px solid #cbd5e1", outline: "none", cursor: "pointer", fontWeight: "bold", color: "#1e293b" }}
          >
            <option value="email">Account Email</option>
            <option value="clientName">Client Name</option>
            <option value="role">System Role</option>
            <option value="leader">Assigned Leader</option>
          </select>
        </div>
      </div>

      {/* USER TABLE */}
      <div style={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", overflowX: "auto", paddingBottom: "20px" }}>
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
            {sortedGroups.map((group) => (
              <React.Fragment key={group[0].email + "_group"}>
                {group.map((u, index) => (
                  <UserRow 
                    key={u.email} 
                    u={u} 
                    updateUser={updateUser} 
                    allLeaderNames={allLeaderNames} 
                    allCoAdminNames={allCoAdminNames} 
                    handleOpenVersionModal={handleOpenVersionModal}
                    isVersionChild={index > 0} 
                    isSettingsLocked={isSettingsLocked}
                    handleDeleteUser={handleDeleteUser}
                  />
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* 🟢 BEAUTIFUL CUSTOM MODAL FOR NEW VERSION */}
      {versionModal.isOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
          <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "16px", width: "400px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
            
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ width: "50px", height: "50px", backgroundColor: "#eff6ff", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", margin: "0 auto 15px", color: "#3b82f6", fontSize: "24px" }}>➕</div>
              <h2 style={{ margin: "0 0 5px 0", color: "#1e293b", fontSize: "20px" }}>Create New Version</h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: "13px", lineHeight: "1.4" }}>
                This will spin up a fresh, active copy of the frozen account while preserving the old data.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginBottom: "25px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "#475569", marginBottom: "5px" }}>New Account Email (Auto-Generated)</label>
                <input 
                  type="text" 
                  value={versionModal.email} 
                  onChange={(e) => setVersionModal({ ...versionModal, email: e.target.value })}
                  style={{ width: "95%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px", fontWeight: "bold", color: "#1e293b", backgroundColor: "#f8fafc" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "#475569", marginBottom: "5px" }}>System Password <span style={{color: "#ef4444"}}>*</span></label>
                <input 
                  type="password" 
                  placeholder="Enter login password..."
                  value={versionModal.password} 
                  onChange={(e) => setVersionModal({ ...versionModal, password: e.target.value })}
                  style={{ width: "95%", padding: "10px", borderRadius: "8px", border: "1px solid #3b82f6", outline: "none", fontSize: "14px" }}
                  autoFocus
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={() => setVersionModal({ isOpen: false, acc: null, email: "", password: "" })}
                style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#475569", fontWeight: "bold", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmCreateNewVersion}
                style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", backgroundColor: "#3b82f6", color: "white", fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 6px rgba(59, 130, 246, 0.3)" }}
              >
                Create Account
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}