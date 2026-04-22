import React, { useState, useEffect, useMemo } from 'react';
import { getArea, getPerimeter, getTopWidth, getSpecificEnergy, solveBisection, g } from '../utils/hydraulics';

const MatrixCalculator = () => {
  const [matrixParams, setMatrixParams] = useState({
    Q: "10, 15",
    b: "1.0",
    m: "1.5, 2.0",
    h_total: "1.5",
    n: "0.03",
    slope: "0.01, 0.05"
  });
  const [matrixResults, setMatrixResults] = useState([]);
  const [matrixError, setMatrixError] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc', isInput: false });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleMatrixInputChange = (e) => {
    const { name, value } = e.target;
    setMatrixParams({ ...matrixParams, [name]: value });
  };

  const parseMatrixInput = (str, allowZero = false) => {
    return str.split(',')
      .map(s => parseFloat(s.trim()))
      .filter(v => !isNaN(v) && (allowZero ? v >= 0 : v > 0));
  };

  const calculateMatrix = () => {
    const Qs = parseMatrixInput(matrixParams.Q);
    const bs = parseMatrixInput(matrixParams.b);
    const ms = parseMatrixInput(matrixParams.m, true);
    const hs = parseMatrixInput(matrixParams.h_total);
    const ns = parseMatrixInput(matrixParams.n);
    const slopes = parseMatrixInput(matrixParams.slope);

    if (!Qs.length || !bs.length || !ms.length || !hs.length || !ns.length || !slopes.length) {
      setMatrixError("Upewnij się, że wpisano przynajmniej jedną poprawną wartość dla każdego parametru (oddzielone przecinkami).");
      setMatrixResults([]);
      return;
    }

    const totalCombos = Qs.length * bs.length * ms.length * hs.length * ns.length * slopes.length;
    if (totalCombos > 1000) {
      setMatrixError(`Zbyt wiele kombinacji (${totalCombos}). Limit wynosi 1000, aby zapobiec zawieszeniu przeglądarki.`);
      setMatrixResults([]);
      return;
    }

    setMatrixError(null);
    const newResults = [];

    Qs.forEach(Q => {
      bs.forEach(b => {
        ms.forEach(m => {
          hs.forEach(h_total => {
            ns.forEach(n => {
              slopes.forEach(slope => {
                let yc = solveBisection((y) => {
                  const A = getArea(y, b, m);
                  const T = getTopWidth(y, b, m);
                  return g * Math.pow(A, 3) - Math.pow(Q, 2) * T;
                }, 0.01, 20);

                let yn = solveBisection((y) => {
                  const A = getArea(y, b, m);
                  const P = getPerimeter(y, b, m);
                  return Math.pow(A, 5/3) / Math.pow(P, 2/3) - (n * Q) / Math.sqrt(slope);
                }, 0.01, 50);

                if (yn !== null && yc !== null) {
                  const An = getArea(yn, b, m);
                  const Tn = getTopWidth(yn, b, m);
                  const vn = Q / An;
                  const Fr = vn / Math.sqrt(g * (An / Tn));
                  const flowType = Fr < 1 ? "Spokojny" : (Fr > 1 ? "Rwący" : "Krytyczny");
                  const En = yn + (vn * vn) / (2 * g);
                  const isOverflow = yn > h_total;

                  newResults.push({
                    inputs: { Q, b, m, h_total, n, slope },
                    outputs: { yn, yc, vn, Fr, flowType, En, isOverflow }
                  });
                } else {
                  newResults.push({
                    inputs: { Q, b, m, h_total, n, slope },
                    outputs: null
                  });
                }
              });
            });
          });
        });
      });
    });

    setMatrixResults(newResults);
  };

  useEffect(() => {
    const timeoutId = setTimeout(calculateMatrix, 500);
    return () => clearTimeout(timeoutId);
  }, [matrixParams]);

  const handleSort = (key, isInput = false) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction, isInput });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <span className="opacity-30 ml-1">↕</span>;
    return sortConfig.direction === 'asc' ? <span className="text-blue-500 ml-1">↑</span> : <span className="text-blue-500 ml-1">↓</span>;
  };

  const sortedMatrixResults = useMemo(() => {
    let sortableItems = [...matrixResults];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (!a.outputs || !b.outputs) return 0;
        const aValue = sortConfig.isInput ? a.inputs[sortConfig.key] : a.outputs[sortConfig.key];
        const bValue = sortConfig.isInput ? b.inputs[sortConfig.key] : b.outputs[sortConfig.key];

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [matrixResults, sortConfig]);

  const exportToCSV = () => {
    if (sortedMatrixResults.length === 0) return;
    
    const formatNumber = (num, dec) => num.toFixed(dec).replace('.', ',');
    
    const headers = ['Q [m3/s]', 'b [m]', '1:m', 'n', 'i [-]', 'h_max [m]', 'h_n [m]', 'v_n [m/s]', 'Fr [-]', 'Rezim', 'h_c [m]', 'E [m]', 'Status'];
    const rows = sortedMatrixResults.map(res => {
      if (!res.outputs) return `${formatNumber(res.inputs.Q, 2)};${formatNumber(res.inputs.b, 2)};${formatNumber(res.inputs.m, 2)};${formatNumber(res.inputs.n, 3)};${formatNumber(res.inputs.slope, 4)};${formatNumber(res.inputs.h_total, 2)};Błąd;;;;;;`;
      
      return `${formatNumber(res.inputs.Q, 2)};${formatNumber(res.inputs.b, 2)};${formatNumber(res.inputs.m, 2)};${formatNumber(res.inputs.n, 3)};${formatNumber(res.inputs.slope, 4)};${formatNumber(res.inputs.h_total, 2)};${formatNumber(res.outputs.yn, 2)};${formatNumber(res.outputs.vn, 2)};${formatNumber(res.outputs.Fr, 2)};${res.outputs.flowType};${formatNumber(res.outputs.yc, 2)};${formatNumber(res.outputs.En, 2)};${res.outputs.isOverflow ? 'PRZELEWA' : 'OK'}`;
    });
    
    const csvContent = "\uFEFF" + headers.join(';') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Kombinacje_Koryta.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const colorPalette = [
    'text-blue-600 dark:text-blue-400 font-black',
    'text-emerald-600 dark:text-emerald-400 font-black',
    'text-purple-600 dark:text-purple-400 font-black',
    'text-amber-600 dark:text-amber-400 font-black',
    'text-pink-600 dark:text-pink-400 font-black',
    'text-cyan-600 dark:text-cyan-400 font-black',
  ];

  const uniqueValues = useMemo(() => {
    const uniques = { Q: [], b: [], m: [], n: [], slope: [], h_total: [] };
    matrixResults.forEach(res => {
      Object.keys(uniques).forEach(key => {
        if (!uniques[key].includes(res.inputs[key])) {
          uniques[key].push(res.inputs[key]);
        }
      });
    });
    Object.keys(uniques).forEach(key => uniques[key].sort((a,b)=>a-b));
    return uniques;
  }, [matrixResults]);

  const getColorClass = (key, value, defaultClass) => {
    const index = uniqueValues[key]?.indexOf(value);
    if (index === -1 || uniqueValues[key]?.length <= 1) return defaultClass;
    return colorPalette[index % colorPalette.length];
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Zestawienia Kombinacji</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2 text-sm uppercase tracking-wide">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-[10px]">1</span> Parametry
            </h3>
            <div className="space-y-4">
              {['Q', 'b', 'm', 'h_total', 'n', 'slope'].map(param => (
                <div key={param}>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider">
                    {param === 'Q' ? 'Przepływ Q [m³/s]' :
                     param === 'b' ? 'Szerokość dna b [m]' :
                     param === 'm' ? 'Nachylenie 1:m' :
                     param === 'h_total' ? 'Głębokość h [m]' :
                     param === 'n' ? 'Współczynnik n' :
                     param === 'slope' ? 'Spadek i [-]' : param}
                  </label>
                  <input
                    type="text"
                    name={param}
                    value={matrixParams[param]}
                    onChange={handleMatrixInputChange}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all"
                  />
                </div>
              ))}
              <p className="text-xs text-slate-400">Wartości oddziel przecinkami, np. "1.0, 1.5, 2.0"</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 text-sm uppercase tracking-wide">Statystyki</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Liczba kombinacji:</span>
                <span className="font-bold">{matrixParams.Q.split(',').length * matrixParams.b.split(',').length * matrixParams.m.split(',').length * matrixParams.h_total.split(',').length * matrixParams.n.split(',').length * matrixParams.slope.split(',').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Poprawne:</span>
                <span className="font-bold text-green-600">{matrixResults.filter(r => r.outputs).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Błędne:</span>
                <span className="font-bold text-red-600">{matrixResults.filter(r => !r.outputs).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Przelew:</span>
                <span className="font-bold text-red-500">{matrixResults.filter(r => r.outputs?.isOverflow).length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {matrixError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-2xl">
              {matrixError}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button onClick={exportToCSV} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-2xl text-sm font-bold transition-colors">
                Eksportuj CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-700">
                  <th className="p-3 text-left font-bold cursor-pointer hover:bg-slate-200" onClick={() => handleSort('Q', true)}>Q {getSortIcon('Q')}</th>
                  <th className="p-3 text-right font-bold cursor-pointer hover:bg-slate-200" onClick={() => handleSort('b', true)}>b {getSortIcon('b')}</th>
                  <th className="p-3 text-right font-bold cursor-pointer hover:bg-slate-200" onClick={() => handleSort('m', true)}>1:m {getSortIcon('m')}</th>
                  <th className="p-3 text-right font-bold cursor-pointer hover:bg-slate-200" onClick={() => handleSort('n', true)}>n {getSortIcon('n')}</th>
                  <th className="p-3 text-right font-bold cursor-pointer hover:bg-slate-200" onClick={() => handleSort('slope', true)}>i {getSortIcon('slope')}</th>
                  <th className="p-3 text-right font-bold cursor-pointer hover:bg-slate-200" onClick={() => handleSort('h_total', true)}>h_max {getSortIcon('h_total')}</th>
                  <th className="p-3 text-right font-bold text-blue-600 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('yn', false)}>h_n {getSortIcon('yn')}</th>
                  <th className="p-3 text-right font-bold text-green-600 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('vn', false)}>v {getSortIcon('vn')}</th>
                  <th className="p-3 text-right font-bold cursor-pointer hover:bg-slate-200" onClick={() => handleSort('Fr', false)}>Fr {getSortIcon('Fr')}</th>
                  <th className="p-3 text-right font-bold">Regim</th>
                  <th className="p-3 text-right font-bold text-orange-600">h_c</th>
                  <th className="p-3 text-right font-bold text-purple-600">E</th>
                  <th className="p-3 text-right font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedMatrixResults.map((res, i) => {
                  const textValueClass = "text-slate-700 dark:text-slate-300";
                  if (!res.outputs) {
                    return (
                      <tr key={i} className="border-b border-slate-200 dark:border-slate-700">
                        <td className={`p-2 text-sm font-mono ${textValueClass}`}>{res.inputs.Q}</td>
                        <td className={`p-2 text-sm font-mono ${textValueClass}`}>{res.inputs.b}</td>
                        <td className={`p-2 text-sm font-mono ${textValueClass}`}>{res.inputs.m}</td>
                        <td className={`p-2 text-sm font-mono ${textValueClass}`}>{res.inputs.n}</td>
                        <td className={`p-2 text-sm font-mono ${textValueClass}`}>{res.inputs.slope}</td>
                        <td className={`p-2 text-sm font-mono border-r ${textValueClass}`}>{res.inputs.h_total}</td>
                        <td colSpan="7" className="p-2 text-sm text-red-500 font-semibold text-center">Błąd obliczeń</td>
                      </tr>
                    );
                  }

                  const { Q, b, m, n, slope, h_total } = res.inputs;
                  const { yn, yc, vn, Fr, flowType, En, isOverflow } = res.outputs;
                  
                  const rowBg = isOverflow 
                    ? (isDarkMode ? 'bg-red-900/20' : 'bg-red-50')
                    : (isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50');

                  return (
                    <tr key={i} className={`border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'} ${rowBg}`}>
                      <td className={`p-2 text-sm font-mono ${getColorClass('Q', Q, textValueClass)}`}>{Q.toFixed(2)}</td>
                      <td className={`p-2 text-sm font-mono ${getColorClass('b', b, textValueClass)}`}>{b.toFixed(2)}</td>
                      <td className={`p-2 text-sm font-mono ${getColorClass('m', m, textValueClass)}`}>{m.toFixed(2)}</td>
                      <td className={`p-2 text-sm font-mono ${getColorClass('n', n, textValueClass)}`}>{n.toFixed(3)}</td>
                      <td className={`p-2 text-sm font-mono ${getColorClass('slope', slope, textValueClass)}`}>{slope.toFixed(4)}</td>
                      <td className={`p-2 text-sm font-mono border-r ${isDarkMode ? 'border-slate-700' : 'border-slate-200'} ${getColorClass('h_total', h_total, textValueClass)}`}>{h_total.toFixed(2)}</td>
                      
                      <td className={`p-2 text-sm font-mono font-bold ${isOverflow ? 'text-red-500' : textValueClass}`}>{yn.toFixed(2)}</td>
                      <td className={`p-2 text-sm font-mono ${textValueClass}`}>{vn.toFixed(2)}</td>
                      <td className={`p-2 text-sm font-mono ${Fr > 1 ? 'text-orange-500' : 'text-green-500'}`}>{Fr.toFixed(2)}</td>
                      <td className={`p-2 text-xs font-bold ${Fr > 1 ? 'text-orange-500' : 'text-green-500'}`}>{flowType}</td>
                      <td className={`p-2 text-sm font-mono ${textValueClass}`}>{yc.toFixed(2)}</td>
                      <td className={`p-2 text-sm font-mono ${textValueClass}`}>{En.toFixed(2)}</td>
                      <td className={`p-2 text-xs font-bold ${isOverflow ? 'text-red-500' : 'text-green-500'}`}>
                        {isOverflow ? 'PRZELEWA' : 'OK'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatrixCalculator;