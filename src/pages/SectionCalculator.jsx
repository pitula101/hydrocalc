import React, { useState, useEffect, useRef } from 'react';
import { 
  getArea, getPerimeter, getTopWidth, getSpecificEnergy, 
  solveBisection, solveDepthsForEnergy, g, getReinforcementSuggestion 
} from '../utils/hydraulics';
import { storage, STORAGE_KEYS } from '../utils/storage';

const DEFAULT_PARAMS = {
  b: 1.0, m: 1.5, h_total: 1.5, n: 0.03, slope: 0.05, Q: 10.0,
};

const SectionCalculator = () => {
  const [params, setParams] = useState(() => {
    return storage.get(STORAGE_KEYS.SECTION_PARAMS, DEFAULT_PARAMS);
  });

  const [results, setResults] = useState({
    yn: 0, yc: 0, vn: 0, vc: 0, Fr: 0, flowType: '', 
    En: 0, Emin: 0, isOverflow: false, freeboard: 0, An: 0, Pn: 0, Rh: 0,
    I_min: 0, v_Imin: 0, Q_Imin: 0, Fr_Imin: 0, Q_hmax: 0, v_hmax: 0, Fr_hmax: 0,
    widthAnalysisData: [], widthAnalysisExtra: [], Ic: 0,
    reinforcement: { type: '', desc: '', color: '' }, error: null
  });

  const [hoverData, setHoverData] = useState(null);
  const [hoverWidthData, setHoverWidthData] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const canvasRef = useRef(null);
  const widthAnalysisCanvasRef = useRef(null);

  useEffect(() => {
    storage.set(STORAGE_KEYS.SECTION_PARAMS, params);
  }, [params]);

  const analyzeWithGemini = async () => {
    setIsAiLoading(true);
    setAiAnalysis(null);
    const apiKey = ""; 
    const prompt = `
      Jesteś ekspertem inżynierii wodnej i hydrotechniki.
      Przeanalizuj krótko poniższe parametry hydrauliczne koryta otwartego i oceń warunki przepływu oraz dobór umocnienia.
      Dane:
      - Przepływ Q: ${params.Q} m3/s
      - Geometria: dno b=${params.b}m, skarpy 1:${params.m}, spadek dna ${(params.slope * 100).toFixed(2)}%
      - Wyniki:
        - Głębokość normalna hn: ${results.yn.toFixed(2)} m
        - Prędkość vn: ${results.vn.toFixed(2)} m/s
        - Liczba Froude'a: ${results.Fr.toFixed(2)} (${results.flowType})
        - Sugerowane umocnienie (algorytm): ${results.reinforcement.type}
      Napisz zwięzłą opinię (max 3-4 zdania) czy prędkość jest bezpieczna, czy istnieje ryzyko erozji lub zamulania, oraz czy zaproponowane umocnienie jest adekwatne. 
      WAŻNE: Nie używaj formatowania LaTeX, stosuj zwykły tekst.
    `;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      setAiAnalysis(data.candidates?.[0]?.content?.parts?.[0]?.text || "Błąd AI.");
    } catch (e) { setAiAnalysis("Błąd komunikacji z AI."); } finally { setIsAiLoading(false); }
  };

  const calculateSection = () => {
    const { b, m, n, slope, Q, h_total } = params;
    if (slope <= 0 || Q <= 0 || b <= 0 || n <= 0) {
      setResults(prev => ({ ...prev, error: "Parametry muszą być dodatnie (Q, b, n, i > 0)" }));
      return;
    }

    let yc = solveBisection((y) => g * Math.pow(getArea(y, b, m), 3) - Math.pow(Q, 2) * getTopWidth(y, b, m), 0.01, 20);
    let yn = solveBisection((y) => Math.pow(getArea(y, b, m), 5/3) / Math.pow(getPerimeter(y, b, m), 2/3) - (n * Q) / Math.sqrt(slope), 0.01, 50);

    if (yn === null || yc === null) {
      setResults(prev => ({ ...prev, error: "Brak rozwiązania dla zadanych danych." }));
      return;
    }

    const Ac = getArea(yc, b, m); const Pc = getPerimeter(yc, b, m); const Rc = Ac / Pc; const vc = Q / Ac; 
    const termIc = (n * Q) / (Ac * Math.pow(Rc, 2/3)); const Ic = Math.pow(termIc, 2);
    
    const An = getArea(yn, b, m); const Pn = getPerimeter(yn, b, m); const Rh = An / Pn; const vn = Q / An; 
    const Tn = getTopWidth(yn, b, m); const hydDepthN = An / Tn; 
    
    const Fr = vn / Math.sqrt(g * hydDepthN);
    const flowType = Fr < 1 ? "Spokojny" : (Fr > 1 ? "Rwący" : "Krytyczny");

    const En = getSpecificEnergy(yn, b, m, Q); const Emin = getSpecificEnergy(yc, b, m, Q);
    const isOverflow = yn > h_total; const freeboard = h_total - yn;

    const A_full = getArea(h_total, b, m); const P_full = getPerimeter(h_total, b, m); const R_full = A_full / P_full;
    const T_full = getTopWidth(h_total, b, m); const hydDepthFull = A_full / T_full;

    const termImin = (n * Q) / (A_full * Math.pow(R_full, 2/3));
    const I_min = Math.pow(termImin, 2); const v_Imin = Q / A_full;
    const Q_Imin = (1/n) * A_full * Math.pow(R_full, 2/3) * Math.sqrt(I_min);
    const Fr_Imin = v_Imin / Math.sqrt(g * hydDepthFull);

    const Q_hmax = (1/n) * A_full * Math.pow(R_full, 2/3) * Math.sqrt(slope);
    const v_hmax = Q_hmax / A_full; const Fr_hmax = v_hmax / Math.sqrt(g * hydDepthFull);

    const widthAnalysisPoints = [];
    const popularSlopes = [1.5, 2.0, 2.5, 3.0];
    const widthAnalysisExtra = popularSlopes.filter(val => Math.abs(val - m) > 0.01).map(s => ({ m: s, points: [] }));
    const b_start = 0.2; const b_end = Math.max(b * 2.5, 5.0); const steps = 60; const step_val = (b_end - b_start) / steps;

    for(let i=0; i<=steps; i++) {
        const b_iter = b_start + i * step_val;
        const yn_main = solveBisection((y) => Math.pow(getArea(y, b_iter, m), 5/3) / Math.pow(getPerimeter(y, b_iter, m), 2/3) - (n * Q) / Math.sqrt(slope), 0.01, 50);
        if(yn_main !== null) widthAnalysisPoints.push({ b: b_iter, h: yn_main });
        widthAnalysisExtra.forEach(dataset => {
            const yn_ex = solveBisection((y) => Math.pow(getArea(y, b_iter, dataset.m), 5/3) / Math.pow(getPerimeter(y, b_iter, dataset.m), 2/3) - (n * Q) / Math.sqrt(slope), 0.01, 50);
            if(yn_ex !== null) dataset.points.push({ b: b_iter, h: yn_ex });
        });
    }

    setResults({
      yn, yc, vn, vc, Fr, flowType, En, Emin, An, Pn, Rh, isOverflow, freeboard,
      I_min, v_Imin, Q_Imin, Fr_Imin, Q_hmax, v_hmax, Fr_hmax, Ic,
      widthAnalysisData: widthAnalysisPoints, widthAnalysisExtra, 
      reinforcement: getReinforcementSuggestion(vn), error: null
    });
  };

  useEffect(() => { calculateSection(); }, [params]);

  const calculateStepVal = (maxVal) => {
    if (maxVal <= 0.5) return 0.1; if (maxVal <= 1.5) return 0.25; if (maxVal <= 3.0) return 0.5;
    if (maxVal <= 6.0) return 1.0; return 2.0;
  };

  const drawArrowAxisLocal = (ctx, x1, y1, x2, y2, label) => {
    ctx.beginPath(); ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5; ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const headlen = 8; const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
    ctx.fillStyle = '#555'; ctx.fill();
    ctx.fillStyle = '#000'; ctx.font = 'bold 12px sans-serif';
    if (label === 'b' || label === 'E') { ctx.textAlign = 'right'; ctx.fillText(label, x2, y2 - 8); } 
    else { ctx.textAlign = 'right'; ctx.fillText(label, x2 - 8, y2 + 15); }
  };

  useEffect(() => {
    if (!canvasRef.current || results.error) return;
    const { yn, yc, isOverflow, En, Emin } = results;
    const { b, m, h_total, Q } = params;
    const ctx = canvasRef.current.getContext('2d');
    const W = canvasRef.current.width; const H = canvasRef.current.height;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);

    const SPLIT_RATIO = 0.55; const X_SPLIT = W * SPLIT_RATIO;
    const MARGIN = 40; const BOTTOM_Y = H - MARGIN;
    const yMaxMetric = Math.max(h_total, yn, yc) * 1.3;
    const topWidthMetric = b + 2 * m * yMaxMetric;
    const scale = Math.min((X_SPLIT - 2 * MARGIN) / topWidthMetric, (H - 2 * MARGIN) / yMaxMetric);
    const toY = (y) => BOTTOM_Y - y * scale;
    const cx = X_SPLIT / 2; const toX = (x) => cx + x * scale;

    const halfB = b / 2; const halfTopPhys = halfB + m * h_total;
    ctx.beginPath(); ctx.moveTo(toX(-halfTopPhys), toY(h_total)); ctx.lineTo(toX(-halfB), toY(0));
    ctx.lineTo(toX(halfB), toY(0)); ctx.lineTo(toX(halfTopPhys), toY(h_total));
    ctx.strokeStyle = '#5D4037'; ctx.lineWidth = 4; ctx.stroke();

    const halfTopWater = halfB + m * yn;
    ctx.fillStyle = isOverflow ? 'rgba(239, 68, 68, 0.5)' : 'rgba(37, 99, 235, 0.5)';
    ctx.beginPath(); ctx.moveTo(toX(-halfB), toY(0)); ctx.lineTo(toX(halfB), toY(0));
    ctx.lineTo(toX(halfTopWater), toY(yn)); ctx.lineTo(toX(-halfTopWater), toY(yn));
    ctx.closePath(); ctx.fill();

    const eOriginX = X_SPLIT + 40; const eWidth = W - eOriginX - 30;
    const maxE_Draw = Math.max(En, Emin * 3, 0.5) * 1.5;
    const scaleX_Energy = eWidth / maxE_Draw; const toXE = (e) => eOriginX + e * scaleX_Energy;
    drawArrowAxisLocal(ctx, eOriginX, BOTTOM_Y, eOriginX, MARGIN, 'h');
    drawArrowAxisLocal(ctx, eOriginX, BOTTOM_Y, W - 10, BOTTOM_Y, 'E');

    ctx.beginPath(); ctx.strokeStyle = '#7C3AED'; ctx.lineWidth = 3;
    for (let y = 0.02; y <= yMaxMetric; y += 0.05) {
      const e = getSpecificEnergy(y, b, m, Q);
      if (e < maxE_Draw * 1.5) {
        const px = toXE(e); const py = toY(y);
        if (y === 0.02) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
    }
    ctx.stroke();

    const step = calculateStepVal(yMaxMetric);
    ctx.font = '10px sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = '#666';
    for(let v = step; v < yMaxMetric; v += step) {
      ctx.beginPath(); ctx.strokeStyle = '#f1f5f9'; ctx.moveTo(eOriginX, toY(v)); ctx.lineTo(W - 10, toY(v)); ctx.stroke();
      ctx.fillText(v.toFixed(1), eOriginX - 5, toY(v) + 3);
    }

    const drawLine = (y, e, color, label) => {
      const py = toY(y); const px = toXE(e);
      ctx.beginPath(); ctx.strokeStyle = color; ctx.setLineDash([4, 4]); ctx.moveTo(eOriginX, py); ctx.lineTo(px, py); ctx.lineTo(px, BOTTOM_Y); ctx.stroke();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillText(e.toFixed(2), px, BOTTOM_Y + 15); ctx.setLineDash([]);
    };
    drawLine(yn, En, '#2563EB', 'n');
    drawLine(yc, Emin, '#DC2626', 'c');

  }, [results, params]);

  useEffect(() => {
    if (!widthAnalysisCanvasRef.current || results.widthAnalysisData.length < 2) return;
    const canvas = widthAnalysisCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = canvas.width; const H = canvas.height;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
    
    const MARGIN = 40;
    const mainData = results.widthAnalysisData;
    const minB = mainData[0].b; const maxB = mainData[mainData.length - 1].b;
    const maxH = Math.max(...mainData.map(d => d.h), params.h_total) * 1.1;
    const scaleX = (W - 2 * MARGIN) / (maxB - minB);
    const scaleY = (H - 2 * MARGIN) / maxH;
    const toX = (b) => MARGIN + (b - minB) * scaleX;
    const toY = (h) => H - MARGIN - h * scaleY;

    drawArrowAxisLocal(ctx, MARGIN, H - MARGIN, MARGIN, MARGIN, 'h [m]');
    drawArrowAxisLocal(ctx, MARGIN, H - MARGIN, W - 10, H - MARGIN, 'b [m]');

    results.widthAnalysisExtra.forEach(ex => {
      ctx.beginPath(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5;
      ex.points.forEach((p, i) => { if (i === 0) ctx.moveTo(toX(p.b), toY(p.h)); else ctx.lineTo(toX(p.b), toY(p.h)); });
      ctx.stroke();
    });

    ctx.beginPath(); ctx.strokeStyle = '#2563EB'; ctx.lineWidth = 3;
    mainData.forEach((p, i) => { if (i === 0) ctx.moveTo(toX(p.b), toY(p.h)); else ctx.lineTo(toX(p.b), toY(p.h)); });
    ctx.stroke();

    ctx.fillStyle = '#2563EB'; ctx.beginPath(); ctx.arc(toX(params.b), toY(results.yn), 5, 0, Math.PI * 2); ctx.fill();

  }, [results, params]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Kalkulator Przekroju</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2 text-sm uppercase tracking-wide">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span> Dane Wejściowe
            </h3>
            <div className="space-y-5">
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Przepływ Q [m³/s]</label><input type="number" step="0.1" value={params.Q} onChange={e => setParams({...params, Q: parseFloat(e.target.value)||0})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 font-bold text-blue-600 outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Dno b [m]</label><input type="number" step="0.1" value={params.b} onChange={e => setParams({...params, b: parseFloat(e.target.value)||0})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Nachylenie 1:m</label><input type="number" step="0.1" value={params.m} onChange={e => setParams({...params, m: parseFloat(e.target.value)||0})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Szorstkość n</label><input type="number" step="0.001" value={params.n} onChange={e => setParams({...params, n: parseFloat(e.target.value)||0})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs" /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Spadek i [-]</label><input type="number" step="0.0001" value={params.slope} onChange={e => setParams({...params, slope: parseFloat(e.target.value)||0})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs" /></div>
              </div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">Głęb. koryta h [m]</label><input type="number" step="0.1" value={params.h_total} onChange={e => setParams({...params, h_total: parseFloat(e.target.value)||0})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-blue-600 p-5 rounded-3xl text-white shadow-lg shadow-blue-500/20">
              <div className="text-[10px] font-bold uppercase tracking-widest text-blue-200 mb-4">Stan Normalny</div>
              <div className="space-y-1">
                <div className="text-3xl font-black">{results.yn.toFixed(2)}m</div>
                <div className="text-[10px] opacity-70">Głębokość (hn)</div>
              </div>
              <div className="mt-4 pt-4 border-t border-blue-500/50 flex justify-between items-end">
                <div><div className="text-lg font-bold">{results.vn.toFixed(2)}</div><div className="text-[9px] opacity-60">Prędkość [m/s]</div></div>
                <div className="text-right"><div className="text-lg font-bold">{results.Fr.toFixed(2)}</div><div className="text-[9px] opacity-60">Froude ({results.flowType})</div></div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Stan Krytyczny</div>
              <div className="space-y-1">
                <div className="text-3xl font-black text-slate-800 dark:text-white">{results.yc.toFixed(2)}m</div>
                <div className="text-[10px] text-slate-400">Głębokość (hc)</div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-end">
                <div><div className="text-lg font-bold text-slate-700 dark:text-slate-300">{results.vc.toFixed(2)}</div><div className="text-[9px] opacity-60">Prędkość [m/s]</div></div>
                <div className="text-right"><div className="text-lg font-bold text-slate-700 dark:text-slate-300">{results.Ic.toFixed(4)}</div><div className="text-[9px] opacity-60">Spadek Kryt. Ic</div></div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Min. Spadek (dla Q)</div>
              <div className="space-y-1">
                <div className="text-3xl font-black text-slate-800 dark:text-white">{(results.I_min*100).toFixed(2)}%</div>
                <div className="text-[10px] text-slate-400">Wymagany spadek Imin</div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-end">
                <div><div className="text-lg font-bold text-slate-700 dark:text-slate-300">{results.v_Imin.toFixed(2)}</div><div className="text-[9px] opacity-60">vn(Imin) [m/s]</div></div>
                <div className="text-right"><div className="text-lg font-bold text-slate-700 dark:text-slate-300">{results.Fr_Imin.toFixed(2)}</div><div className="text-[9px] opacity-60">Fr(Imin)</div></div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Pełne Koryto (dla i)</div>
              <div className="space-y-1">
                <div className="text-3xl font-black text-slate-800 dark:text-white">{results.Q_hmax.toFixed(1)}</div>
                <div className="text-[10px] text-slate-400">Przepływ Qmax [m3/s]</div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-end">
                <div><div className="text-lg font-bold text-slate-700 dark:text-slate-300">{results.v_hmax.toFixed(2)}</div><div className="text-[9px] opacity-60">vn(hmax) [m/s]</div></div>
                <div className="text-right"><div className="text-lg font-bold text-slate-700 dark:text-slate-300">{results.Fr_hmax.toFixed(2)}</div><div className="text-[9px] opacity-60">Fr(hmax)</div></div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-2 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <canvas ref={canvasRef} width={1000} height={450} className="w-full h-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
               <h4 className="text-xs font-bold text-slate-400 uppercase text-center mb-4">Analiza: h = f(b) dla zadanego Q i nachylenia m</h4>
               <canvas ref={widthAnalysisCanvasRef} width={800} height={350} className="w-full h-auto" />
            </div>
            <div className="space-y-6">
                <div className={`p-6 rounded-3xl border ${results.reinforcement.color} border-current border-opacity-10`}>
                    <h4 className="font-bold text-sm mb-2 uppercase tracking-wide">🛡️ Umocnienie</h4>
                    <div className="text-xl font-black mb-1">{results.reinforcement.type}</div>
                    <p className="text-xs opacity-80 leading-relaxed">{results.reinforcement.desc}</p>
                </div>
                <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl shadow-slate-900/20">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-xs uppercase tracking-widest text-slate-400">🤖 Ekspert AI</h4>
                        <button onClick={analyzeWithGemini} disabled={isAiLoading} className="text-[10px] font-black bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded-full transition-colors disabled:opacity-50 uppercase tracking-tighter">
                            {isAiLoading ? 'Analiza...' : 'Generuj Opinię'}
                        </button>
                    </div>
                    {aiAnalysis ? (
                        <p className="text-[11px] leading-relaxed italic text-slate-300">"{aiAnalysis}"</p>
                    ) : (
                        <p className="text-[10px] text-slate-500 text-center py-4">Kliknij przycisk powyżej, aby uzyskać opinię inżynierską od AI Gemini.</p>
                    )}
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionCalculator;