import React, { useState, useEffect, useRef } from 'react';

export default function TaskTimer() {
  const [targetMin, setTargetMin] = useState(5);
  const [targetSec, setTargetSec] = useState(0);
  
  const targetMs = (Number(targetMin) * 60 + Number(targetSec)) * 1000 || 0;

  const [timeLeftMs, setTimeLeftMs] = useState(targetMs || 300000);
  const [runningTotalMs, setRunningTotalMs] = useState(0);
  
  const [isRunning, setIsRunning] = useState(false);
  const [autoLoop, setAutoLoop] = useState(false);
  const [loopCount, setLoopCount] = useState(1);
  
  const [sessionId, setSessionId] = useState(Date.now());
  
  // 🚀 UI States: Initially Minimized!
  const [isMinimized, setIsMinimized] = useState(true); 
  const [showSettings, setShowSettings] = useState(false);
  const [isHovered, setIsHovered] = useState(false); 
  const [isFlipped, setIsFlipped] = useState(false);
  
  // History State
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('taskTimerHistory');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('taskTimerHistory', JSON.stringify(history));
  }, [history]);
  
  // Draggable positioning
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight / 2 - 200 });
  
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const audioCtxRef = useRef(null);

  // 🔊 Clear 1.5 Second Beep Alert
  const playAlertSound = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'square'; 
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      osc.frequency.setValueAtTime(700, ctx.currentTime + 0.5); 
      osc.frequency.setValueAtTime(500, ctx.currentTime + 1.0); 

      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 1.5); 
    } catch (e) {
      console.log("Audio alert not supported on this browser.");
    }
  };

  // 📝 SMART HISTORY SAVER
  const saveToHistory = () => {
    setHistory(prev => {
      const currentTarget = `${String(targetMin).padStart(2, '0')}:${String(targetSec).padStart(2, '0')}`;
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      if (prev.length > 0 && prev[0].sessionId === sessionId && prev[0].target === currentTarget) {
        const updatedHistory = [...prev];
        updatedHistory[0] = { ...updatedHistory[0], loop: loopCount, time: nowTime };
        return updatedHistory;
      } else {
        const newRecord = {
          id: Date.now(),
          sessionId: sessionId,
          time: nowTime,
          loop: loopCount,
          target: currentTarget
        };
        return [newRecord, ...prev].slice(0, 50); 
      }
    });
  };

  // ⏱️ Master Timer Engine
  useEffect(() => {
    if (!isRunning) return;

    let targetEndTime = Date.now() + timeLeftMs;
    let lastTick = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTick;
      lastTick = now;

      setRunningTotalMs(prev => prev + delta);

      let remaining = targetEndTime - now;
      
      if (remaining <= 0) {
        playAlertSound();
        if (autoLoop) {
          saveToHistory(); 
          setLoopCount(c => c + 1);
          targetEndTime = now + targetMs + remaining; 
          remaining = targetEndTime - now;
        } else {
          setIsRunning(false);
          remaining = 0;
        }
      }
      setTimeLeftMs(remaining);
    }, 50); 

    return () => clearInterval(interval);
  }, [isRunning, autoLoop, targetMs, targetMin, targetSec, loopCount, sessionId]); 

  // 🖱️ Draggable Window Logic
  const handleMouseDown = (e) => {
    if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'button') return;
    draggingRef.current = true;
    offsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (draggingRef.current) {
        setPosition({
          x: e.clientX - offsetRef.current.x,
          y: e.clientY - offsetRef.current.y
        });
      }
    };
    const handleMouseUp = () => { draggingRef.current = false; };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // 🎛️ Controls
  const handleStart = () => {
    if (targetMs === 0) return; 
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (timeLeftMs <= 0) setTimeLeftMs(targetMs);
    setIsRunning(true);
  };
  
  const handlePause = () => setIsRunning(false);

  const handleManualSubmit = () => {
    saveToHistory(); 
    setIsRunning(false);
    setLoopCount(c => c + 1);
    setTimeLeftMs(targetMs);
    setTimeout(() => setIsRunning(true), 10); 
  };

  const handleStopReset = () => {
    setIsRunning(false);
    setTimeLeftMs(targetMs);
  };

  const handleFullSessionReset = () => {
    setIsRunning(false);
    setTimeLeftMs(targetMs);
    setRunningTotalMs(0);
    setLoopCount(1);
    setSessionId(Date.now()); 
  };

  const handleTargetChange = (type, val) => {
    let newMin = targetMin;
    let newSec = targetSec;
    if (type === 'min') { newMin = val; setTargetMin(val); }
    if (type === 'sec') { newSec = val; setTargetSec(val); }
    
    const newTargetMs = ((Number(newMin) * 60) + Number(newSec)) * 1000;
    
    setIsRunning(false);
    setTimeLeftMs(newTargetMs);
    setRunningTotalMs(0);
    setLoopCount(1);
    setSessionId(Date.now()); 
  };

  // 📝 Formatters
  const currentSecTotal = Math.ceil(timeLeftMs / 1000);
  const dispM = Math.floor(currentSecTotal / 60);
  const dispS = currentSecTotal % 60;

  const runTotalSec = Math.floor(runningTotalMs / 1000);
  const runH = Math.floor(runTotalSec / 3600);
  const runM = Math.floor((runTotalSec % 3600) / 60);
  const runS = runTotalSec % 60;

  const radius = 85;
  const circumference = 2 * Math.PI * radius;
  const percent = targetMs > 0 ? (timeLeftMs / targetMs) : 0;
  const strokeDashoffset = circumference - (percent * circumference);

  // Controls UI Visibility logic
  const showFullUI = isHovered || isFlipped;

  // =====================================
  // 🚀 MINIMIZED VIEW
  // =====================================
  if (isMinimized) {
    return (
      <div 
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ 
          position: "fixed", top: position.y, left: position.x, zIndex: 9999, 
          backgroundColor: "#e5e7eb", color: "#334155", padding: "8px 18px", 
          borderRadius: "30px", cursor: "grab", boxShadow: "0 4px 10px rgba(0,0,0,0.1)", 
          display: "flex", alignItems: "center", gap: "15px", fontWeight: "600", border: "1px solid #cbd5e1",
          userSelect: "none", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          opacity: isHovered ? 1 : 0.6, 
          transition: "opacity 0.3s ease"
        }}
      >
        <span style={{ fontSize: "16px", letterSpacing: "1px" }}>
          ⏱️ {String(dispM).padStart(2, '0')}:{String(dispS).padStart(2, '0')}
        </span>
        <span style={{ color: "#6b21a8", fontSize: "14px", fontWeight: "800" }}>L:{loopCount}</span>
        
        <button 
          onClick={() => setIsMinimized(false)} 
          style={{ background: "transparent", color: "#475569", border: "none", cursor: "pointer", fontSize: "18px", fontWeight: "bold", padding: "0 5px" }} 
          title="Restore"
        >
          +
        </button>
      </div>
    );
  }

  // =====================================
  // 🚀 MAIN VIEW (Floating Clock -> 3D Card)
  // =====================================
  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        position: "fixed", top: position.y, left: position.x, zIndex: 9999,
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        perspective: "1000px" 
      }}
    >
      <div style={{
        width: "300px",
        transition: "transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)",
        transformStyle: "preserve-3d",
        transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        position: "relative"
      }}>
        
        {/* ===================================== */}
        {/* 🕐 FRONT FACE: TIMER                  */}
        {/* ===================================== */}
        <div style={{ 
          backfaceVisibility: "hidden", 
          WebkitBackfaceVisibility: "hidden",
          backgroundColor: showFullUI ? "#e8eaed" : "transparent", 
          borderRadius: "24px", 
          boxShadow: showFullUI ? "0 20px 40px rgba(0,0,0,0.15)" : "none", 
          border: showFullUI ? "1px solid #d1d5db" : "1px solid transparent", 
          width: "100%",
          transition: "all 0.3s ease"
        }}>
          
          {/* HEADER */}
          <div onMouseDown={handleMouseDown} style={{ 
            padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "grab", userSelect: "none",
            opacity: showFullUI ? 1 : 0, transition: "opacity 0.3s ease"
          }}>
            <span style={{ fontSize: "10px", fontWeight: "800", color: "#94a3b8", letterSpacing: "1px" }}>≡ DRAG</span>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <button onClick={() => setIsFlipped(true)} style={{ background: "transparent", color: "#64748b", border: "none", cursor: "pointer", fontSize: "16px", padding: 0 }} title="History">📜</button>
              <button onClick={() => setIsMinimized(true)} style={{ background: "transparent", color: "#64748b", border: "none", cursor: "pointer", fontSize: "18px", padding: 0, fontWeight: "bold", lineHeight: "1" }} title="Minimize">−</button>
              <button onClick={() => setShowSettings(!showSettings)} style={{ background: "transparent", color: "#64748b", border: "none", cursor: "pointer", fontSize: "16px", padding: 0 }} title="Settings">⚙️</button>
            </div>
          </div>

          <div style={{ padding: showFullUI ? "10px 20px 30px" : "10px 20px 10px", display: "flex", flexDirection: "column", gap: "10px", alignItems: "center", transition: "padding 0.3s ease" }}>
            
            {/* 🚀 CIRCULAR TIMER (ALWAYS VISIBLE) */}
            <div style={{ 
              position: "relative", width: "200px", height: "200px", display: "flex", justifyContent: "center", alignItems: "center",
              backgroundColor: showFullUI ? "transparent" : "rgba(248, 250, 252, 0.95)",
              borderRadius: "50%",
              boxShadow: showFullUI ? "none" : "0 10px 30px rgba(0,0,0,0.15)",
              transition: "all 0.3s ease"
            }}>
              <svg width="200" height="200" viewBox="0 0 200 200" style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
                <defs>
                  <linearGradient id="timerGradient" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#5e4b9c" />
                    <stop offset="100%" stopColor="#42b883" />
                  </linearGradient>
                </defs>
                <circle cx="100" cy="100" r={radius} stroke={showFullUI ? "#d1d5db" : "#e2e8f0"} strokeWidth="6" fill="none" style={{ transition: "stroke 0.3s ease" }} />
                <circle cx="100" cy="100" r={radius} stroke="url(#timerGradient)" strokeWidth="10" fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.1s linear" }} />
              </svg>
              <div style={{ fontSize: "42px", fontWeight: "300", color: "#334155", letterSpacing: "1px", position: "relative", zIndex: 1 }}>
                {String(dispM).padStart(2, '0')}:{String(dispS).padStart(2, '0')}
              </div>
            </div>

            {/* 🚀 HIDDEN SECTION (Fades out when not hovering) */}
            <div style={{
              display: "flex", flexDirection: "column", gap: "10px", width: "100%", alignItems: "center",
              opacity: showFullUI ? 1 : 0,
              pointerEvents: showFullUI ? "auto" : "none",
              transition: "opacity 0.3s ease"
            }}>
              
              {/* LOOP COUNTER */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#94a3b8", fontSize: "14px", fontWeight: "500", marginTop: "5px", marginBottom: "15px" }}>
                <span>🔁</span> Loop: <strong style={{ color: "#6b21a8" }}>{loopCount}</strong>
              </div>

              {/* CONTROLS */}
              <div style={{ display: "flex", gap: "15px", width: "100%", justifyContent: "center", alignItems: "center" }}>
                
                {!isRunning ? (
                  <button 
                    disabled={targetMs === 0}
                    onClick={handleStart} 
                    style={{ width: "45px", height: "45px", borderRadius: "50%", border: "2px solid", borderColor: targetMs === 0 ? "#cbd5e1" : "#5e4b9c", backgroundColor: "transparent", color: targetMs === 0 ? "#cbd5e1" : "#5e4b9c", fontSize: "16px", display: "flex", justifyContent: "center", alignItems: "center", cursor: targetMs === 0 ? "not-allowed" : "pointer", transition: "0.2s" }}
                  >▶</button>
                ) : (
                  <button 
                    onClick={handlePause} 
                    style={{ width: "45px", height: "45px", borderRadius: "50%", border: "2px solid #5e4b9c", backgroundColor: "transparent", color: "#5e4b9c", fontSize: "16px", display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", transition: "0.2s" }}
                  >⏸</button>
                )}
                
                {autoLoop ? (
                  <button 
                    onClick={handleStopReset} 
                    style={{ flex: 1, padding: "12px 20px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "30px", fontWeight: "600", cursor: "pointer", fontSize: "15px", boxShadow: "0 4px 10px rgba(239,68,68,0.3)", transition: "0.2s", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }}
                  >
                    <span style={{ fontSize: "12px" }}>⏹</span> Stop Loop
                  </button>
                ) : (
                  <button 
                    onClick={handleManualSubmit} 
                    style={{ flex: 1, padding: "12px 20px", backgroundColor: "#6254a3", color: "white", border: "none", borderRadius: "30px", fontWeight: "600", cursor: "pointer", fontSize: "15px", boxShadow: "0 4px 10px rgba(94,75,156,0.3)", transition: "0.2s", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }}
                  >
                    <span style={{ fontSize: "12px" }}>■</span> Submit Next
                  </button>
                )}

                <button 
                  onClick={handleFullSessionReset} 
                  title="Reset Session" 
                  style={{ width: "45px", height: "45px", borderRadius: "50%", border: "2px solid #5e4b9c", backgroundColor: "transparent", color: "#5e4b9c", fontSize: "20px", display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", transition: "0.2s" }}
                >⟳</button>
              </div>

              {/* SETTINGS DRAWER */}
              {showSettings && (
                <div style={{ width: "100%", marginTop: "20px", padding: "15px", backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "12px", boxSizing: "border-box" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>Target (AET):</span>
                    <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                      <input type="number" min="0" value={targetMin} onChange={e => handleTargetChange('min', e.target.value)} style={{ width: "35px", padding: "4px", textAlign: "center", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "13px" }} /> <span style={{fontWeight:"600", fontSize:"12px", color: "#64748b"}}>m</span>
                      <input type="number" min="0" max="59" value={targetSec} onChange={e => handleTargetChange('sec', e.target.value)} style={{ width: "35px", padding: "4px", textAlign: "center", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "13px" }} /> <span style={{fontWeight:"600", fontSize:"12px", color: "#64748b"}}>s</span>
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>Auto-Loop at Zero:</span>
                    <input type="checkbox" checked={autoLoop} onChange={(e) => setAutoLoop(e.target.checked)} style={{ transform: "scale(1.2)", cursor: "pointer", accentColor: "#6254a3" }} />
                  </div>

                  <div style={{ textAlign: "center", fontSize: "11px", color: "#94a3b8", fontWeight: "600", marginTop: "15px", borderTop: "1px solid #e2e8f0", paddingTop: "10px" }}>
                    Active Session: {String(runH).padStart(2, '0')}:{String(runM).padStart(2, '0')}:{String(runS).padStart(2, '0')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===================================== */}
        {/* 📜 BACK FACE: HISTORY                 */}
        {/* ===================================== */}
        <div style={{ 
          position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
          backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
          transform: "rotateY(180deg)", 
          backgroundColor: showFullUI ? "#f8fafc" : "transparent", 
          borderRadius: "24px", 
          boxShadow: showFullUI ? "0 20px 40px rgba(0,0,0,0.15)" : "none", 
          border: showFullUI ? "1px solid #cbd5e1" : "1px solid transparent",
          display: "flex", flexDirection: "column", overflow: "hidden",
          opacity: showFullUI ? 1 : 0,
          transition: "all 0.3s ease"
        }}>
          
          <div onMouseDown={handleMouseDown} style={{ backgroundColor: "#2d2d2d", color: "#fff", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "grab" }}>
            <span style={{ fontSize: "12px", fontWeight: "800", letterSpacing: "1px" }}>📜 SESSION HISTORY</span>
            <button onClick={() => setIsFlipped(false)} style={{ background: "transparent", color: "#fff", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "15px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "13px", marginTop: "40px", fontStyle: "italic" }}>No completed sessions.</div>
            ) : (
              history.map((record) => (
                <div key={record.id} style={{ backgroundColor: "#fff", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                  <div>
                    <strong style={{ color: "#475569", fontSize: "13px" }}>Completed: {record.loop} {record.loop === 1 ? 'Loop' : 'Loops'}</strong>
                    <div style={{ color: "#94a3b8", fontSize: "10px", marginTop: "4px" }}>Last active: {record.time}</div>
                  </div>
                  <div style={{ fontWeight: "bold", color: "#6254a3", backgroundColor: "#f3e8ff", border: "1px solid #d8b4fe", padding: "4px 8px", borderRadius: "6px" }}>
                    {record.target} AET
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ padding: "15px", borderTop: "1px solid #e2e8f0", backgroundColor: "#fff" }}>
            <button 
              onClick={() => setHistory([])} 
              style={{ width: "100%", padding: "10px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}
            >
              🗑️ Clear Entire History
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}