import React, { useState, useEffect, useRef } from 'react';
import { getArea, getPerimeter, getTopWidth, getSpecificEnergy, solveBisection, g } from '../utils/hydraulics';
import { storage, STORAGE_KEYS } from '../utils/storage';

const DEFAULT_GLOBAL = { Q: 10.0, globalN: '' };
const DEFAULT_SECTIONS = [
  { id: 1, chainage: 100, slope: 0.01, b: 1.0, m: 1.5, h_min: 2.0, n: 0.03 },
  { id: 2, chainage: 150, slope: 0.005, b: 1.5, m: 1.5, h_min: 2.0, n: 0.03 },
  { id: 3, chainage: 230, slope: 0.02, b: 1.0, m: 2.0, h_min: 1.5, n: 0.035 }
];

const ProfileCalculator = () => {
  const [profileGlobal, setProfileGlobal] = useState(() => {
    const saved = storage.get(STORAGE_KEYS.PROFILE_GLOBAL, null);
    return saved && typeof saved === 'object' ? saved : DEFAULT_GLOBAL;
  });

  const [profileSections, setProfileSections] = useState(() => {
    const saved = storage.get(STORAGE_KEYS.PROFILE_SECTIONS, null);
    return saved && Array.isArray(saved) && saved.length > 0 ? saved : DEFAULT_SECTIONS;
  });

  const [profileResults, setProfileResults] = useState({
    sections: [], points: [], hasErrors: false
  });

  const [hoverProfileData, setHoverProfileData] = useState(null);

  const profileCanvasRef = useRef(null);

  useEffect(() => {
    storage.set(STORAGE_KEYS.PROFILE_GLOBAL, profileGlobal);
  }, [profileGlobal]);

  useEffect(() => {
    storage.set(STORAGE_KEYS.PROFILE_SECTIONS, profileSections);
  }, [profileSections]);

  const calculateProfile = () => {
    let currentX = 0;
    let currentZ = 100;
    let newPts = [];
    let hasErrors = false;

    const Q = parseFloat(profileGlobal.Q);
    if (isNaN(Q) || Q <= 0) hasErrors = true;

    const calculatedSections = profileSections.map((sec) => {
      const effN = profileGlobal.globalN !== '' ? parseFloat(profileGlobal.globalN) : parseFloat(sec.n);
      const slope = parseFloat(sec.slope);
      const b = parseFloat(sec.b);
      const m = parseFloat(sec.m);
      const chainage = sec.chainage !== undefined ? parseFloat(sec.chainage) : currentX + parseFloat(sec.length || 0);
      const L = chainage - currentX;
      const hmin = parseFloat(sec.h_min);

      if(slope <= 0 || b <= 0 || effN <= 0 || L <= 0 || isNaN(chainage) || hasErrors) {
        hasErrors = true;
        return { ...sec, hn: null, error: true };
      }

      let yc = solveBisection((y) => {
        const A = getArea(y, b, m);
        const T = getTopWidth(y, b, m);
        return g * Math.pow(A, 3) - Math.pow(Q, 2) * T;
      }, 0.01, 20);

      let yn = solveBisection((y) => {
        const A = (b + m * y) * y;
        const P = b + 2 * y * Math.sqrt(1 + m * m);
        return Math.pow(A, 5/3) / Math.pow(P, 2/3) - (effN * Q) / Math.sqrt(slope);
      }, 0.01, 50);

      if (yn === null || yc === null) {
        hasErrors = true;
        return { ...sec, hn: null, error: true };
      }

      const An = getArea(yn, b, m);
      const Tn = getTopWidth(yn, b, m);
      const vn = Q / An;
      const En = yn + (vn * vn) / (2 * g); 
      
      const Fr = vn / Math.sqrt(g * (An / Tn));
      const flowType = Fr < 1 ? "Spokojny" : (Fr > 1 ? "Rwący" : "Krytyczny");

      const startX = currentX;
      const startZ = currentZ;
      const endX = chainage;
      const endZ = currentZ - L * slope;

      newPts.push({ x: startX, zb: startZ, zw: startZ + yn, zc: startZ + yc, ze: startZ + En, ztop: startZ + hmin });
      newPts.push({ x: endX, zb: endZ, zw: endZ + yn, zc: endZ + yc, ze: endZ + En, ztop: endZ + hmin });

      currentX = endX;
      currentZ = endZ;

      return { ...sec, chainage, L, hn: yn, hc: yc, vn, En, Fr, flowType, startX, endX, startZ, endZ, error: false };
    });

    setProfileResults({ sections: calculatedSections, points: newPts, hasErrors });
  };

  useEffect(() => { calculateProfile(); }, [profileGlobal, profileSections]);

  const updateProfileSection = (id, field, value) => {
    setProfileSections(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const addProfileSection = () => {
    const lastSec = profileSections[profileSections.length - 1];
    const newId = Date.now();
    if(lastSec) {
      const newChainage = (parseFloat(lastSec.chainage) || 0) + 100;
      setProfileSections(prev => [...prev, { ...lastSec, id: newId, chainage: newChainage }]);
    } else {
      setProfileSections([{ id: newId, chainage: 100, slope: 0.01, b: 1, m: 1.5, h_min: 1.5, n: 0.03 }]);
    }
  };

  const removeProfileSection = (id) => {
    if(profileSections.length > 1) {
      setProfileSections(prev => prev.filter(s => s.id !== id));
    }
  };

  const drawArrowAxis = (ctx, x1, y1, x2, y2, label) => {
    ctx.beginPath(); ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5; ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const headlen = 8; const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
    ctx.fillStyle = '#555'; ctx.fill();
    ctx.fillStyle = '#000'; ctx.font = 'bold 14px serif';
    if (label.includes('b') || label.includes('L')) { ctx.textAlign = 'right'; ctx.fillText(label, x2, y2 - 8); } 
    else { ctx.textAlign = 'right'; ctx.fillText(label, x2 - 8, y2 + 15); }
  };

  const calculateStep = (range) => {
    if (range <= 1) return 0.25; if (range <= 5) return 1; if (range <= 10) return 2; if (range <= 20) return 5; return 10;
  };

  const handleMouseMoveProfile = (e) => {
    if (!profileCanvasRef.current || profileResults.hasErrors) return;
    const canvas = profileCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const x = (e.clientX - rect.left) * scaleX;
    
    const W = canvas.width;
    const MARGIN_X = 50;

    if (x < MARGIN_X || x > W - 10) {
      setHoverProfileData(null);
      return;
    }

    const pts = profileResults.points;
    if (!pts || pts.length === 0) return;

    const minX = 0;
    const maxX = pts[pts.length - 1].x;
    const drawW = W - 2 * MARGIN_X;
    const scaleXCoord = drawW / (maxX - minX);
    const xMetric = (x - MARGIN_X) / scaleXCoord + minX;

    const section = profileResults.sections.find(s => xMetric >= s.startX && xMetric <= s.endX);
    if (section && !section.error) {
      setHoverProfileData({ xPx: x, xMetric, section });
    } else {
      setHoverProfileData(null);
    }
  };

  const handleMouseLeaveProfile = () => { setHoverProfileData(null); };

  useEffect(() => {
    if (profileResults.hasErrors || profileResults.points.length === 0) return;
    const canvas = profileCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    const MARGIN_X = 50; const MARGIN_Y = 40;
    const pts = profileResults.points;
    const minX = 0; const maxX = pts[pts.length - 1].x;
    
    const minZ = Math.min(...pts.map(p => p.zb));
    const maxZ = Math.max(...pts.map(p => Math.max(p.ztop, p.zw, p.ze)));
    const rangeZ = maxZ - minZ; const padZ = rangeZ * 0.2;
    const drawMinZ = minZ - padZ; const drawMaxZ = maxZ + padZ;

    const scaleX = (W - 2 * MARGIN_X) / (maxX - minX);
    const scaleY = (H - 2 * MARGIN_Y) / (drawMaxZ - drawMinZ);

    const toX = (x) => MARGIN_X + (x - minX) * scaleX;
    const toY = (z) => H - MARGIN_Y - (z - drawMinZ) * scaleY;

    drawArrowAxis(ctx, MARGIN_X, H - MARGIN_Y + 20, W - 10, H - MARGIN_Y + 20, 'L [m]');
    drawArrowAxis(ctx, MARGIN_X - 20, H - MARGIN_Y, MARGIN_X - 20, 10, 'Z [m]');

    profileResults.sections.forEach(sec => {
      const xPx = toX(sec.endX);
      ctx.beginPath(); ctx.strokeStyle = '#f0f0f0'; ctx.moveTo(xPx, MARGIN_Y); ctx.lineTo(xPx, H - MARGIN_Y); ctx.stroke();
      ctx.fillStyle = '#888'; ctx.textAlign = 'center'; ctx.fillText(`L=${sec.endX.toFixed(0)}`, xPx, H - MARGIN_Y + 15);
    });
    ctx.fillText(`L=0`, toX(0), H - MARGIN_Y + 15);

    const stepZ = calculateStep(drawMaxZ - drawMinZ);
    for(let z = Math.ceil(drawMinZ/stepZ)*stepZ; z <= drawMaxZ; z += stepZ) {
      const yPx = toY(z);
      ctx.beginPath(); ctx.strokeStyle = '#f0f0f0'; ctx.moveTo(MARGIN_X, yPx); ctx.lineTo(W - MARGIN_X, yPx); ctx.stroke();
      ctx.fillStyle = '#666'; ctx.textAlign = 'right'; ctx.fillText(z.toFixed(1), MARGIN_X - 25, yPx + 4);
    }

    ctx.beginPath(); ctx.strokeStyle = '#EF5350'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5;
    pts.forEach((p, i) => { if(i===0) ctx.moveTo(toX(p.x), toY(p.ztop)); else ctx.lineTo(toX(p.x), toY(p.ztop)); });
    ctx.stroke(); ctx.setLineDash([]);

    ctx.beginPath(); ctx.strokeStyle = '#9C27B0'; ctx.setLineDash([8, 4]); ctx.lineWidth = 1.5;
    pts.forEach((p, i) => { if(i===0) ctx.moveTo(toX(p.x), toY(p.ze)); else ctx.lineTo(toX(p.x), toY(p.ze)); });
    ctx.stroke(); ctx.setLineDash([]);

    ctx.beginPath(); ctx.strokeStyle = '#FF9800'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5;
    pts.forEach((p, i) => { if(i===0) ctx.moveTo(toX(p.x), toY(p.zc)); else ctx.lineTo(toX(p.x), toY(p.zc)); });
    ctx.stroke(); ctx.setLineDash([]);

    ctx.beginPath(); ctx.moveTo(toX(pts[0].x), toY(pts[0].zb));
    pts.forEach(p => ctx.lineTo(toX(p.x), toY(p.zw)));
    for(let i = pts.length - 1; i >= 0; i--) { ctx.lineTo(toX(pts[i].x), toY(pts[i].zb)); }
    ctx.closePath(); ctx.fillStyle = 'rgba(33, 150, 243, 0.4)'; ctx.fill();

    ctx.beginPath(); ctx.strokeStyle = '#1976D2'; ctx.lineWidth = 2;
    pts.forEach((p, i) => { if(i===0) ctx.moveTo(toX(p.x), toY(p.zw)); else ctx.lineTo(toX(p.x), toY(p.zw)); });
    ctx.stroke();

    ctx.beginPath(); ctx.strokeStyle = '#5D4037'; ctx.lineWidth = 3;
    pts.forEach((p, i) => { if(i===0) ctx.moveTo(toX(p.x), toY(p.zb)); else ctx.lineTo(toX(p.x), toY(p.zb)); });
    ctx.stroke();

    if (hoverProfileData) {
      const { xPx, section } = hoverProfileData;
      ctx.beginPath(); ctx.strokeStyle = '#333'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
      ctx.moveTo(xPx, MARGIN_Y); ctx.lineTo(xPx, H - MARGIN_Y); ctx.stroke(); ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
      const boxW = 160; const boxH = 100;
      let boxX = xPx + 10; if (boxX + boxW > W) boxX = xPx - boxW - 10;
      const boxY = MARGIN_Y + 10;
      
      ctx.fillRect(boxX, boxY, boxW, boxH); ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.fillStyle = '#000'; ctx.textAlign = 'left'; ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`Odcinek ${section.id}`, boxX + 10, boxY + 18);
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#1976D2'; ctx.fillText(`h_n = ${section.hn.toFixed(2)} m`, boxX + 10, boxY + 36);
      ctx.fillStyle = '#FF9800'; ctx.fillText(`h_c = ${section.hc.toFixed(2)} m`, boxX + 10, boxY + 50);
      ctx.fillStyle = '#9C27B0'; ctx.fillText(`E = ${section.En.toFixed(2)} m`, boxX + 10, boxY + 64);
      ctx.fillStyle = '#333'; ctx.fillText(`v = ${section.vn.toFixed(2)} m/s`, boxX + 10, boxY + 78);
      ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = section.Fr > 1 ? '#EF5350' : '#4CAF50';
      ctx.fillText(`Fr = ${section.Fr.toFixed(2)} (${section.flowType})`, boxX + 10, boxY + 92);
    }

    ctx.textAlign = 'left'; ctx.fillStyle = '#5D4037'; ctx.font = 'bold 11px sans-serif'; ctx.fillText(`━━ Dno koryta`, MARGIN_X + 10, 20);
    ctx.fillStyle = '#1976D2'; ctx.fillText(`━━ Zwierciadło wody`, MARGIN_X + 10, 35);
    ctx.fillStyle = '#EF5350'; ctx.fillText(`-- Max. wys. skarp`, MARGIN_X + 130, 20);
    ctx.fillStyle = '#9C27B0'; ctx.fillText(`-- Linia Energii E`, MARGIN_X + 130, 35);
    ctx.fillStyle = '#FF9800'; ctx.fillText(`-- Głębokość Krytyczna h_c`, MARGIN_X + 250, 20);

  }, [profileResults, hoverProfileData]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Kalkulator Profilu</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2 text-sm uppercase tracking-wide">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">1</span> Dane Globalne
            </h3>
            <div className="space-y-5">
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Przepływ Q [m³/s]</label><input type="number" step="0.1" value={profileGlobal.Q} onChange={e => setProfileGlobal({...profileGlobal, Q: parseFloat(e.target.value)||0})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 font-bold text-purple-600 outline-none focus:ring-2 focus:ring-purple-500 transition-all" /></div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Globalne n (opcjonalne)</label><input type="number" step="0.001" value={profileGlobal.globalN} onChange={e => setProfileGlobal({...profileGlobal, globalN: e.target.value})} placeholder="Puste = z odcinków" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500 transition-all text-xs" /></div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wide">Odcinki</h3>
              <button onClick={addProfileSection} className="text-xs font-bold bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded-full transition-colors">+ Dodaj</button>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {profileSections.map((sec, idx) => (
                <div key={sec.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500">#{idx + 1}</span>
                    <button onClick={() => removeProfileSection(sec.id)} className="text-xs text-red-500 hover:text-red-700">×</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[9px] text-slate-400">PK</label><input type="number" value={sec.chainage} onChange={e => updateProfileSection(sec.id, 'chainage', e.target.value)} className="w-full text-xs p-1 rounded" /></div>
                    <div><label className="text-[9px] text-slate-400">i [-]</label><input type="number" step="0.001" value={sec.slope} onChange={e => updateProfileSection(sec.id, 'slope', e.target.value)} className="w-full text-xs p-1 rounded" /></div>
                    <div><label className="text-[9px] text-slate-400">b [m]</label><input type="number" step="0.1" value={sec.b} onChange={e => updateProfileSection(sec.id, 'b', e.target.value)} className="w-full text-xs p-1 rounded" /></div>
                    <div><label className="text-[9px] text-slate-400">1:m</label><input type="number" step="0.1" value={sec.m} onChange={e => updateProfileSection(sec.id, 'm', e.target.value)} className="w-full text-xs p-1 rounded" /></div>
                    <div><label className="text-[9px] text-slate-400">h_min</label><input type="number" step="0.1" value={sec.h_min} onChange={e => updateProfileSection(sec.id, 'h_min', e.target.value)} className="w-full text-xs p-1 rounded" /></div>
                    <div><label className="text-[9px] text-slate-400">n</label><input type="number" step="0.001" value={sec.n} onChange={e => updateProfileSection(sec.id, 'n', e.target.value)} className="w-full text-xs p-1 rounded" /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-8">
          <div className="bg-white dark:bg-slate-800 p-2 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <canvas 
              ref={profileCanvasRef} 
              width={1000} 
              height={450} 
              className="w-full h-auto"
              onMouseMove={handleMouseMoveProfile}
              onMouseLeave={handleMouseLeaveProfile}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-700">
                  <th className="p-3 text-left font-bold">Odc.</th>
                  <th className="p-3 text-right font-bold">PK [m]</th>
                  <th className="p-3 text-right font-bold">i [-]</th>
                  <th className="p-3 text-right font-bold">b [m]</th>
                  <th className="p-3 text-right font-bold">1:m</th>
                  <th className="p-3 text-right font-bold">h_min</th>
                  <th className="p-3 text-right font-bold">n</th>
                  <th className="p-3 text-right font-bold text-blue-600">h_n</th>
                  <th className="p-3 text-right font-bold text-orange-600">h_c</th>
                  <th className="p-3 text-right font-bold text-green-600">v [m/s]</th>
                  <th className="p-3 text-right font-bold">Fr</th>
                </tr>
              </thead>
              <tbody>
                {profileResults.sections.map((sec, idx) => (
                  <tr key={sec.id} className="border-b border-slate-200 dark:border-slate-700">
                    <td className="p-3 font-bold">{idx + 1}</td>
                    <td className="p-3 text-right">{sec.chainage}</td>
                    <td className="p-3 text-right">{sec.slope}</td>
                    <td className="p-3 text-right">{sec.b}</td>
                    <td className="p-3 text-right">1:{sec.m}</td>
                    <td className="p-3 text-right">{sec.h_min}</td>
                    <td className="p-3 text-right">{sec.n}</td>
                    <td className="p-3 text-right font-bold text-blue-600">{sec.hn?.toFixed(2) || '-'}</td>
                    <td className="p-3 text-right text-orange-600">{sec.hc?.toFixed(2) || '-'}</td>
                    <td className="p-3 text-right text-green-600">{sec.vn?.toFixed(2) || '-'}</td>
                    <td className="p-3 text-right">{sec.Fr?.toFixed(2) || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCalculator;