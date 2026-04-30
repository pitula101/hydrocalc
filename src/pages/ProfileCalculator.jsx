import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
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

      if(slope <= 0 || b <= 0 || effN <= 0 || L <= 0 || hmin <= 0 || isNaN(chainage) || hasErrors) {
        hasErrors = true;
        return { ...sec, hn: null, error: true };
      }
      if (m < 0) {
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

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg text-xs">
        <p className="font-bold mb-1">PK = {label} m</p>
        {payload.map((entry, idx) => (
          <p key={idx} style={{ color: entry.color }} className="font-mono">
            {entry.name}: {entry.value?.toFixed(2)} m
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight dark:text-white">Kalkulator Profilu</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2 text-sm uppercase tracking-wide">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">1</span> Dane Globalne
            </h3>
            <div className="space-y-5">
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Przepływ Q [m³/s]</label><input type="number" step="0.1" value={profileGlobal.Q} onChange={e => setProfileGlobal({...profileGlobal, Q: parseFloat(e.target.value)||0})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 font-bold text-purple-600 dark:text-purple-400 outline-none focus:ring-2 focus:ring-purple-500 transition-all text-slate-900 dark:text-slate-100" /></div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Globalne n (opcjonalne)</label><input type="number" step="0.001" value={profileGlobal.globalN} onChange={e => setProfileGlobal({...profileGlobal, globalN: e.target.value})} placeholder="Puste = z odcinków" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500 transition-all text-xs text-slate-900 dark:text-slate-100" /></div>
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
                    <div><label className="text-[9px] text-slate-400">PK</label><input type="number" value={sec.chainage} onChange={e => updateProfileSection(sec.id, 'chainage', e.target.value)} className="w-full text-xs p-1 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600" /></div>
                    <div><label className="text-[9px] text-slate-400">i [-]</label><input type="number" step="0.001" value={sec.slope} onChange={e => updateProfileSection(sec.id, 'slope', e.target.value)} className="w-full text-xs p-1 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600" /></div>
                    <div><label className="text-[9px] text-slate-400">b [m]</label><input type="number" step="0.1" value={sec.b} onChange={e => updateProfileSection(sec.id, 'b', e.target.value)} className="w-full text-xs p-1 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600" /></div>
                    <div><label className="text-[9px] text-slate-400">1:m</label><input type="number" step="0.1" value={sec.m} onChange={e => updateProfileSection(sec.id, 'm', e.target.value)} className="w-full text-xs p-1 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600" /></div>
                    <div><label className="text-[9px] text-slate-400">h_min</label><input type="number" step="0.1" value={sec.h_min} onChange={e => updateProfileSection(sec.id, 'h_min', e.target.value)} className="w-full text-xs p-1 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600" /></div>
                    <div><label className="text-[9px] text-slate-400">n</label><input type="number" step="0.001" value={sec.n} onChange={e => updateProfileSection(sec.id, 'n', e.target.value)} className="w-full text-xs p-1 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600" /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-8">
          {profileResults.hasErrors ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-2xl text-center font-semibold">
              ⚠️ Sprawdź parametry odcinków. Wartości S, b, n, pikietaże muszą być dodatnie.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 p-4 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="h-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={profileResults.points} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="x" 
                      type="number" 
                      label={{ value: 'L [m]', position: 'insideBottomRight', offset: -5, fill: '#94a3b8', fontSize: 12 }}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      stroke="#cbd5e1"
                    />
                    <YAxis 
                      domain={['auto', 'auto']} 
                      reversed={true}
                      label={{ value: 'Z [m]', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      stroke="#cbd5e1"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Line type="linear" dataKey="ztop" name="Korona skarpy" stroke="#EF5350" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    <Line type="linear" dataKey="ze" name="Linia Energii E" stroke="#9C27B0" strokeWidth={2} strokeDasharray="8 4" dot={false} />
                    <Line type="linear" dataKey="zc" name="Głęb. krytyczna hc" stroke="#FF9800" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                    <Line type="linear" dataKey="zw" name="Zwierciadło wody" stroke="#1976D2" strokeWidth={2} dot={false} />
                    <Line type="linear" dataKey="zb" name="Dno koryta" stroke="#5D4037" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                  <th className="p-3 text-left font-bold">Odc.</th>
                  <th className="p-3 text-right font-bold">PK [m]</th>
                  <th className="p-3 text-right font-bold">i [-]</th>
                  <th className="p-3 text-right font-bold">b [m]</th>
                  <th className="p-3 text-right font-bold">1:m</th>
                  <th className="p-3 text-right font-bold">h_min</th>
                  <th className="p-3 text-right font-bold">n</th>
                  <th className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">h_n</th>
                  <th className="p-3 text-right font-bold text-orange-600 dark:text-orange-400">h_c</th>
                  <th className="p-3 text-right font-bold text-green-600 dark:text-green-400">v [m/s]</th>
                  <th className="p-3 text-right font-bold">Fr</th>
                </tr>
              </thead>
              <tbody>
                {profileResults.sections.map((sec, idx) => (
                  <tr key={sec.id} className="border-b border-slate-200 dark:border-slate-700">
                    <td className="p-3 font-bold text-slate-700 dark:text-slate-300">{idx + 1}</td>
                    <td className="p-3 text-right text-slate-700 dark:text-slate-300">{sec.chainage}</td>
                    <td className="p-3 text-right text-slate-700 dark:text-slate-300">{sec.slope}</td>
                    <td className="p-3 text-right text-slate-700 dark:text-slate-300">{sec.b}</td>
                    <td className="p-3 text-right text-slate-700 dark:text-slate-300">1:{sec.m}</td>
                    <td className="p-3 text-right text-slate-700 dark:text-slate-300">{sec.h_min}</td>
                    <td className="p-3 text-right text-slate-700 dark:text-slate-300">{sec.n}</td>
                    <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">{sec.hn?.toFixed(2) || '-'}</td>
                    <td className="p-3 text-right text-orange-600 dark:text-orange-400">{sec.hc?.toFixed(2) || '-'}</td>
                    <td className="p-3 text-right text-green-600 dark:text-green-400">{sec.vn?.toFixed(2) || '-'}</td>
                    <td className="p-3 text-right text-slate-700 dark:text-slate-300">{sec.Fr?.toFixed(2) || '-'}</td>
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
