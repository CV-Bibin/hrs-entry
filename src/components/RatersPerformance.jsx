import React, { useState, useEffect } from 'react';
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

// --- STABLE UTILITIES ---
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatTime = (decimalHours) => {
  const val = Number(decimalHours);
  if (isNaN(val) || val <= 0) return "-";
  const h = Math.floor(val);
  const m = Math.round((val - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const formatMoney = (num, decimals = 0) => {
  const val = Number(num);
  if (isNaN(val)) return "0";
  return val.toLocaleString('en-IN', { maximumFractionDigits: decimals });
};

const getWeeksWithDates = (monthString) => {
  try {
    if (!monthString || typeof monthString !== 'string' || !monthString.includes('-')) return [];
    const [yStr, mStr] = monthString.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);

    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) return [];

    const firstDay = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0);
    
    if (isNaN(firstDay.getTime()) || isNaN(lastDay.getTime())) return [];

    const weeks = [];
    let currentStart = new Date(firstDay);
    let safeLoopGuard = 0;

    while (currentStart <= lastDay && safeLoopGuard < 6) {
      safeLoopGuard++;
      let currentEnd = new Date(currentStart);
      
      const dayOfWeek = currentEnd.getDay();
      const daysToSat = 6 - (isNaN(dayOfWeek) ? 0 : dayOfWeek); 
      
      currentEnd.setDate(currentEnd.getDate() + daysToSat);
      if (currentEnd > lastDay) currentEnd = new Date(lastDay);

      const startM = MONTHS[currentStart.getMonth()] || "";
      const endM = MONTHS[currentEnd.getMonth()] || "";

      weeks.push({ 
        label: `W${weeks.length + 1}`, 
        dateRange: `${currentStart.getDate()} ${startM} - ${currentEnd.getDate()} ${endM}` 
      });
      
      currentStart = new Date(currentEnd);
      currentStart.setDate(currentStart.getDate() + 1);
    }
    return weeks;
  } catch (err) {
    return [];
  }
};

const getWeekIndex = (dateString) => { 
  try {
    if (!dateString || typeof dateString !== 'string' || !dateString.includes('-')) return 0;
    const parts = dateString.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return 0;

    const firstDayOffset = new Date(y, m - 1, 1).getDay();
    const index = Math.floor((d - 1 + firstDayOffset) / 7);
    return isNaN(index) || index < 0 ? 0 : index;
  } catch (err) {
    return 0;
  }
};

export default function RatersPerformance({ user }) {
  const [usersList, setUsersList] = useState([]);
  const [timeData, setTimeData] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const unsubTime = onSnapshot(collection(db, "time_entries"), (snap) => {
      setTimeData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubUsers(); unsubTime(); };
  }, []);

  if (loading) return <div style={{ padding: "100px", textAlign: "center", color: "#64748b", fontWeight: "600" }}>Fetching Database...</div>;
  if (!user || !user.email) return <div style={{ padding: "100px", textAlign: "center", color: "#64748b", fontWeight: "600" }}>Authenticating Session...</div>;

  const myProfile = usersList.find(u => u.email === user.email);
  if (!myProfile) return <div style={{ padding: "100px", textAlign: "center", color: "#64748b", fontWeight: "600" }}>Loading Permissions...</div>;

  const isAdmin = myProfile.role === 'admin' || myProfile.role === 'co-admin';
  const myLeaderName = myProfile.leaderName;
  
  let myTeam = [];
  let isMasterView = false;

  if (isAdmin) {
    if (myLeaderName) {
      myTeam = usersList.filter(u => (u.role === 'rater' && u.assignedLeader === myLeaderName) || u.email === user.email);
    } else {
      myTeam = usersList.filter(u => u.role === 'rater' || u.email === user.email);
      isMasterView = true;
    }
  } else if (myProfile.role === 'leader') {
    if (!myLeaderName) return <div style={{ margin: "100px auto", textAlign: "center", color: "#be123c", backgroundColor: "#fff1f2", padding: "40px", borderRadius: "12px", border: "1px solid #fecdd3", maxWidth: "500px" }}><h2 style={{margin: 0}}>Profile Incomplete</h2><p>Admin has not assigned you a Leader Name.</p></div>;
    myTeam = usersList.filter(u => (u.role === 'rater' && u.assignedLeader === myLeaderName) || u.email === user.email);
  } else {
    return <div style={{ padding: "100px", textAlign: "center", color: "#ef4444", fontWeight: "bold" }}>Unauthorized Access.</div>;
  }

  // SAFE DATES & GROUPS
  const activeMonth = selectedMonth || currentMonthStr;
  const monthWeeks = getWeeksWithDates(activeMonth);
  const numWeeks = Math.max(1, monthWeeks.length);
  const totalColumns = numWeeks + 8;

  let displayMonthName = activeMonth;
  const [yStr, mStr] = activeMonth.split('-');
  const mIndex = parseInt(mStr, 10) - 1;
  if (!isNaN(mIndex) && mIndex >= 0 && mIndex < 12) {
    displayMonthName = `${MONTHS[mIndex]} ${yStr}`;
  }

  const clientGroups = {};
  myTeam.forEach(acc => {
    const c = (acc.clientName && typeof acc.clientName === 'string' && acc.clientName.trim() !== '') ? acc.clientName.trim() : "General Pool";
    if (!clientGroups[c]) clientGroups[c] = [];
    clientGroups[c].push(acc);
  });

  // 🚀 THIS IS THE FIX: Variables accurately and strictly named
  let grandTotalHrs = 0;
  let grandTotalLeaderPay = 0;
  let grandTotalRaterPay = 0;
  const grandWkTotal = new Array(numWeeks).fill(0);

  // --- STYLES ---
  const s = {
    th: { padding: "12px 10px", backgroundColor: "#f8fafc", color: "#475569", fontWeight: "700", fontSize: "11px", textAlign: "center", borderBottom: "2px solid #e2e8f0", borderRight: "1px solid #f1f5f9" },
    td: { padding: "12px 10px", borderBottom: "1px solid #f1f5f9", borderRight: "1px solid #f8fafc", fontSize: "13px", color: "#1e293b", textAlign: "center", verticalAlign: "middle" },
    spacer: { width: "16px", backgroundColor: "#f1f5f9", border: "none" },
    alertBadge: { padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px", width: "max-content", border: "1px solid transparent" }
  };

  return (
    <div style={{ padding: "30px", backgroundColor: "#f1f5f9", minHeight: "100vh", fontFamily: "'Inter', sans-serif", boxSizing: "border-box" }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "25px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "900", color: "#0f172a" }}>Performance Master Ledger</h1>
          <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" }}>
            {isMasterView ? "Agency Master View" : `Team: ${myLeaderName}`} • {displayMonthName}
          </p>
        </div>
        <input 
          type="month" 
          value={selectedMonth} 
          onChange={(e) => { if (e.target.value) setSelectedMonth(e.target.value); }}
          style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", fontWeight: "700", color: "#334155", outline: "none", cursor: "pointer", backgroundColor: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", fontSize: "14px" }}
        />
      </div>

      <div style={{ backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", overflowX: "auto" }}>
        {Object.keys(clientGroups).length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>No active accounts found for this selection.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th style={{ ...s.th, textAlign: "left", paddingLeft: "20px" }}>Account Name</th>
                {monthWeeks.map((w, i) => (
                  <th key={i} style={s.th}>
                    <div style={{ fontSize: "12px", color: "#1e293b" }}>{w.label}</div>
                    <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "2px", fontWeight: "600" }}>{w.dateRange}</div>
                  </th>
                ))}
                <th style={{ ...s.th, backgroundColor: "#fffbeb", color: "#b45309" }}>Total Mnthly</th>
                <th style={s.spacer}></th> 
                <th style={s.th}>Total Payrate<br/><span style={{fontSize: "9px", color: "#94a3b8"}}>(Leader)</span></th>
                <th style={{ ...s.th, backgroundColor: "#eff6ff", color: "#1d4ed8" }}>Total Payment<br/><span style={{fontSize: "9px"}}>(Revenue)</span></th>
                <th style={s.th}>Rater Payrate</th>
                <th style={{ ...s.th, backgroundColor: "#fdf2f8", color: "#be123c" }}>Rater Payment<br/><span style={{fontSize: "9px"}}>(Cost)</span></th>
                <th style={{ ...s.th, textAlign: "left", paddingLeft: "15px", backgroundColor: "#f8fafc", width: "200px" }}>Notifications & Alerts</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(clientGroups).sort().map(client => {
                
                // 🚀 FIXED: Inner variables strictly named
                let clientTotalHrs = 0;
                let clientTotalLeaderPay = 0;
                let clientTotalRaterPay = 0;
                const clientWeekTotals = new Array(numWeeks).fill(0);

                return (
                  <React.Fragment key={client}>
                    <tr>
                      <td colSpan={totalColumns} style={{ backgroundColor: "#f1f5f9", padding: "10px 20px", fontWeight: "800", color: "#334155", fontSize: "12px", letterSpacing: "0.5px", borderBottom: "1px solid #cbd5e1" }}>
                        💼 {client.toUpperCase()}
                      </td>
                    </tr>

                    {clientGroups[client].map((acc) => {
                      const logs = timeData.filter(l => l.email === acc.email && typeof l.assigned_date === 'string' && l.assigned_date.startsWith(activeMonth));
                      const wHrs = new Array(numWeeks).fill(0);
                      let mTotal = 0;

                      logs.forEach(l => {
                        const h = Number(l.time_value_hours) || 0;
                        if (!isNaN(h)) {
                          mTotal += h;
                          const wIdx = getWeekIndex(l.assigned_date);
                          if (wIdx >= 0 && wIdx < numWeeks) {
                            wHrs[wIdx] += h;
                            clientWeekTotals[wIdx] += h;
                            grandWkTotal[wIdx] += h; 
                          }
                        }
                      });

                      const tBase = Number(acc.bonusThreshold) || 40;
                      const isBonusMet = acc.hasBonus && mTotal >= tBase;
                      
                      const currentLRate = isBonusMet ? (Number(acc.leaderMaxINR) || Number(acc.leaderBaseINR) || 0) : (Number(acc.leaderBaseINR) || 0);
                      const currentRRate = isBonusMet ? (Number(acc.raterMaxINR) || Number(acc.raterBaseINR) || 0) : (Number(acc.raterBaseINR) || 0);
                      
                      const rev = mTotal * currentLRate;
                      const cost = mTotal * currentRRate;

                      // 🚀 FIXED: Adding to the strictly named variables
                      clientTotalHrs += mTotal; 
                      clientTotalLeaderPay += rev; 
                      clientTotalRaterPay += cost;
                      
                      grandTotalHrs += mTotal; 
                      grandTotalLeaderPay += rev; 
                      grandTotalRaterPay += cost;

                      const isSuspended = acc.status === 'suspended';
                      const alerts = [];
                      
                      if (activeMonth === currentMonthStr && !isSuspended) {
                        if (logs.length === 0) {
                          alerts.push(<span key="no-log" style={{...s.alertBadge, backgroundColor: "#fef2f2", color: "#e11d48", borderColor: "#fecdd3"}}>⚠️ No hours logged this month</span>);
                        } else {
                          const sortedLogs = [...logs].sort((a,b) => {
                            const dateA = new Date(a.assigned_date || 0).getTime() || 0;
                            const dateB = new Date(b.assigned_date || 0).getTime() || 0;
                            return dateB - dateA;
                          });
                          const lastLogDate = new Date(sortedLogs[0].assigned_date);
                          const timeDiff = today.getTime() - lastLogDate.getTime();
                          
                          if (!isNaN(timeDiff)) {
                            const daysInactive = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                            if (daysInactive >= 2) {
                              alerts.push(<span key="inactive" style={{...s.alertBadge, backgroundColor: "#fef2f2", color: "#e11d48", borderColor: "#fecdd3"}}>⚠️ Inactive for {daysInactive} days</span>);
                            }
                          }
                        }
                      }

                      if (mTotal > 0 && mTotal < 5) {
                        alerts.push(<span key="low-mon" style={{...s.alertBadge, backgroundColor: "#fff7ed", color: "#ea580c", borderColor: "#fed7aa"}}>📉 Low Vol: &lt; 5 hrs</span>);
                      }

                      const monthNumSafe = parseInt(activeMonth.split("-")[1], 10);
                      if (!isNaN(monthNumSafe) && [3, 6, 9, 12].includes(monthNumSafe) && mTotal > 0 && mTotal < 20) {
                        alerts.push(<span key="q-risk" style={{...s.alertBadge, backgroundColor: "#fff7ed", color: "#ea580c", borderColor: "#fed7aa"}}>🕒 Q-Risk: &lt; 20 hrs</span>);
                      }

                      const safeKey = acc.id || acc.email || Math.random().toString();

                      return (
                        <tr key={safeKey} style={{ backgroundColor: isSuspended ? "#fff1f2" : "#fff", transition: "0.2s" }} onMouseOver={(e) => !isSuspended && (e.currentTarget.style.backgroundColor = "#f8fafc")} onMouseOut={(e) => !isSuspended && (e.currentTarget.style.backgroundColor = "#fff")}>
                          <td style={{ ...s.td, textAlign: "left", paddingLeft: "20px", color: isSuspended ? "#94a3b8" : "#0f172a", fontWeight: "600" }}>
                            {acc.email || "Unknown Account"} {isSuspended && "🔒"}
                          </td>
                          {wHrs.map((h, i) => (
                            <td key={i} style={{ ...s.td, color: h === 0 ? "#cbd5e1" : "#475569", fontWeight: h > 0 ? "600" : "400" }}>
                              {formatTime(h)}
                            </td>
                          ))}
                          <td style={{ ...s.td, backgroundColor: "#fffbeb", fontWeight: "800", color: mTotal === 0 ? "#94a3b8" : "#d97706" }}>
                            {mTotal > 0 ? Number(mTotal).toFixed(2) : "-"}
                          </td>
                          <td style={s.spacer}></td>
                          <td style={{ ...s.td, color: "#64748b", fontWeight: "600" }}>₹{currentLRate}</td>
                          <td style={{ ...s.td, backgroundColor: "#eff6ff", color: "#1d4ed8", fontWeight: "800", fontSize: "14px" }}>
                            ₹{formatMoney(rev, 0)}
                          </td>
                          <td style={{ ...s.td, backgroundColor: isBonusMet ? "#ecfdf5" : "transparent" }}>
                            {isBonusMet ? (
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                                <span style={{ color: "#059669", fontWeight: "900", fontSize: "14px" }}>₹{currentRRate}</span>
                                <span style={{ fontSize: "9px", backgroundColor: "#10b981", color: "#fff", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>🎯 BONUS ACTIVE</span>
                              </div>
                            ) : (
                              <span style={{ color: "#64748b", fontWeight: "600" }}>₹{currentRRate}</span>
                            )}
                          </td>
                          <td style={{ ...s.td, backgroundColor: isBonusMet ? "#fdf2f8" : "#fff", color: "#be123c", fontWeight: "800", fontSize: "14px" }}>
                            ₹{formatMoney(cost, 2)}
                          </td>
                          <td style={{ ...s.td, textAlign: "left", paddingLeft: "15px", backgroundColor: "#f8fafc", borderRight: "none" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                              {isSuspended ? (
                                <span style={{ ...s.alertBadge, backgroundColor: "#f1f5f9", color: "#64748b", border: "1px solid #cbd5e1" }}>❄️ Account Frozen</span>
                              ) : alerts.length > 0 ? (
                                alerts
                              ) : (
                                <span style={{ fontSize: "11px", color: "#10b981", fontWeight: "600" }}>✔️ On Track</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    <tr style={{ backgroundColor: "#f8fafc", borderTop: "2px solid #e2e8f0" }}>
                      <td style={{ ...s.td, textAlign: "right", paddingRight: "20px", fontWeight: "800", color: "#475569" }}>Subtotal:</td>
                      {clientWeekTotals.map((h, i) => <td key={i} style={{ ...s.td, fontWeight: "700", color: "#64748b" }}>{formatTime(h)}</td>)}
                      <td style={{ ...s.td, fontWeight: "800", color: "#b45309" }}>{clientTotalHrs > 0 ? Number(clientTotalHrs).toFixed(2) : "-"}</td>
                      <td style={s.spacer}></td>
                      <td style={s.td}></td>
                      <td style={{ ...s.td, fontWeight: "800", color: "#1d4ed8" }}>₹{formatMoney(clientTotalLeaderPay, 0)}</td>
                      <td style={s.td}></td>
                      <td style={{ ...s.td, fontWeight: "800", color: "#be123c" }}>₹{formatMoney(clientTotalRaterPay, 2)}</td>
                      <td style={{ ...s.td, borderRight: "none" }}></td>
                    </tr>
                    <tr style={{ height: "8px" }}><td colSpan={totalColumns} style={{ border: "none" }}></td></tr>
                  </React.Fragment>
                );
              })}

              <tr style={{ backgroundColor: "#0f172a" }}>
                <td style={{ padding: "20px", textAlign: "right", fontWeight: "900", color: "#fff", fontSize: "14px", border: "none" }}>AGENCY TOTALS:</td>
                {grandWkTotal.map((h, i) => <td key={i} style={{ padding: "20px 10px", textAlign: "center", color: "#94a3b8", fontWeight: "700", border: "none" }}>{formatTime(h)}</td>)}
                <td style={{ padding: "20px 10px", textAlign: "center", color: "#fbbf24", fontWeight: "900", fontSize: "15px", border: "none" }}>{grandTotalHrs > 0 ? Number(grandTotalHrs).toFixed(2) : "-"}</td>
                <td style={{ backgroundColor: "#0f172a", border: "none" }}></td>
                <td style={{ border: "none" }}></td>
                <td style={{ padding: "20px 10px", textAlign: "center", color: "#60a5fa", fontWeight: "900", fontSize: "16px", border: "none" }}>₹{formatMoney(grandTotalLeaderPay, 0)}</td>
                <td style={{ border: "none" }}></td>
                <td style={{ padding: "20px 10px", textAlign: "center", color: "#f87171", fontWeight: "900", fontSize: "16px", border: "none" }}>₹{formatMoney(grandTotalRaterPay, 2)}</td>
                <td style={{ border: "none" }}></td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}