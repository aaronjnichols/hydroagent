import React, { useState, useEffect } from 'react';
import { 
  Info, 
  AlertCircle, 
  Layers,
  Box,
  Triangle,
  Table as TableIcon,
  X
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api';

const parseIrregularData = (text) => {
  if (!text) return [];
  return text.trim().split('\n').map(line => {
    const parts = line.trim().split(/[\s,\t]+/);
    if (parts.length >= 2) {
      return [parseFloat(parts[0]), parseFloat(parts[1])];
    }
    return null;
  }).filter(p => p && !isNaN(p[0]) && !isNaN(p[1])).sort((a, b) => a[0] - b[0]);
};

const TypeBtn = ({ active, onClick, label }) => (
  <button 
    onClick={onClick}
    className={`flex-1 text-[9px] uppercase tracking-widest py-2 px-3 transition-all rounded ${active ? 'bg-white/10 text-white shadow-sm' : 'text-[#525252] hover:text-[#737373]'}`}
  >
    {label}
  </button>
);

const InputField = ({ label, name, value, onChange, unit }) => (
  <div className="flex flex-col space-y-1.5">
    <label className="text-[10px] uppercase tracking-widest text-[#737373] flex justify-between">
      {label} <span className="text-[#404040] lowercase">{unit}</span>
    </label>
    <input type="number" name={name} step="any" value={value} onChange={onChange} className="bg-[#121212] border border-[#333] rounded px-3 py-2 text-sm text-[#e5e5e5] focus:outline-none focus:border-[#525252]" />
  </div>
);

const ResultCard = ({ label, value, unit, onContextMenu }) => (
  <div 
    className="bg-[#1a1a1a] border border-[#2e2e2e] rounded p-3 text-center cursor-help select-none"
    onContextMenu={onContextMenu}
    title="Right-click to change decimal places"
  >
    <p className="text-[9px] uppercase tracking-widest text-[#525252] mb-1">{label}</p>
    <p className="text-sm font-light text-[#d4d4d4]">{value} <span className="text-[10px] text-[#525252] ml-0.5">{unit}</span></p>
  </div>
);

const ChannelPlot = ({ type, width, zL = 0, zR = 0, depth, points = [], mode = "dark" }) => {
  const svgWidth = 240;
  const svgHeight = 140;
  const margin = 30;
  const isPrint = mode === 'print';
  const color = isPrint ? "black" : "#525252";
  const waterColor = isPrint ? "none" : "#3b82f6";
  const centerX = svgWidth / 2;
  const bottomY = svgHeight - margin;

  let path, waterPath, waterTopY;

  if (type === 'irregular') {
      if (!points || points.length < 2) return null;
      const minX = Math.min(...points.map(p => p[0]));
      const maxX = Math.max(...points.map(p => p[0]));
      const minZ = Math.min(...points.map(p => p[1]));
      const maxZ = Math.max(...points.map(p => p[1]));
      const widthX = maxX - minX;
      const wse = minZ + depth;
      const heightZ = Math.max(maxZ, wse) - minZ;
      const scaleX = (svgWidth - 2 * margin) / (widthX || 1);
      const scaleZ = (svgHeight - 2 * margin) / (heightZ || 1);
      const tx = (x) => margin + (x - minX) * scaleX;
      const ty = (z) => svgHeight - margin - (z - minZ) * scaleZ;
      path = "M " + points.map(p => `${tx(p[0])} ${ty(p[1])}`).join(" L ");
      waterTopY = ty(wse);

      // Find intersections of the water surface line with the ground segments
      const intersections = [];
      const waterPolygonPoints = [];
      
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        
        const x1 = tx(p1[0]);
        const y1 = ty(p1[1]);
        const x2 = tx(p2[0]);
        const y2 = ty(p2[1]);

        // Add the first point if it's below water
        if (p1[1] <= wse) {
          waterPolygonPoints.push(`${x1},${y1}`);
        }

        // Check for intersection
        if ((p1[1] <= wse && p2[1] > wse) || (p1[1] > wse && p2[1] <= wse)) {
          const t = (wse - p1[1]) / (p2[1] - p1[1]);
          const intersectX = p1[0] + t * (p2[0] - p1[0]);
          const txIntersect = tx(intersectX);
          intersections.push(txIntersect);
          waterPolygonPoints.push(`${txIntersect},${waterTopY}`);
        }
      }
      
      // Add the last point if it's below water
      const lastPoint = points[points.length - 1];
      if (lastPoint[1] <= wse) {
        waterPolygonPoints.push(`${tx(lastPoint[0])},${ty(lastPoint[1])}`);
      }

      // Sort intersections by x-coordinate for the dashed line
      intersections.sort((a, b) => a - b);
      
      // Create water path by connecting intersections at the top
      // This is a simplified approach that works for single-basin channels.
      // For multi-basin, we would need more complex logic.
      if (intersections.length >= 2) {
        const firstX = intersections[0];
        const lastX = intersections[intersections.length - 1];
        
        // Filter and sort points for the polygon to ensure it's closed correctly
        // We need the points below water plus the top line
        waterPath = "M " + waterPolygonPoints.join(" L ") + ` L ${intersections[intersections.length-1]},${waterTopY} L ${intersections[0]},${waterTopY} Z`;
      }
      
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="max-w-[280px]">
          {waterPath && <path d={waterPath} fill={waterColor} fillOpacity={isPrint ? "0" : "0.15"} />}
          <path d={path} fill="none" stroke={color} strokeWidth={isPrint ? "1" : "1.5"} />
          {intersections.length >= 2 && (
            <line 
              x1={intersections[0]} 
              y1={waterTopY} 
              x2={intersections[intersections.length - 1]} 
              y2={waterTopY} 
              stroke={isPrint ? "black" : "#60a5fa"} 
              strokeWidth="1" 
              strokeDasharray="3,2" 
            />
          )}
        </svg>
      );
  } else if (type === 'gutter') {
      const Sw = zL;
      const Sx = zR;
      const W = width;
      
      // Calculate spread endpoint for scaling
      const T_total = depth > (Sw * W) 
        ? (depth - (Sw - Sx) * W) / Sx + W 
        : depth / Sw;

      // Visual extent: show at least 2x the gutter width or 1.2x the spread
      const visualT = Math.max(W * 2.0, T_total * 1.2);
      const visualDepth = Math.max(depth * 1.5, Sw * W * 1.2);
      
      const scaleX = (svgWidth - 2 * margin) / visualT;
      const scaleY = (svgHeight - 2 * margin) / visualDepth;
      
      const curbX = margin;
      const curbTopY = margin;
      const curbBottomY = bottomY;
      
      const xW = curbX + W * scaleX;
      const yW = curbBottomY - (Sw * W) * scaleY;
      
      const xEnd = curbX + visualT * scaleX;
      const yEnd = curbBottomY - (Sw * W + Sx * (visualT - W)) * scaleY;

      const xT = curbX + T_total * scaleX;
      const waterSurfaceY = curbBottomY - depth * scaleY;

      // Ground path
      path = `M ${curbX} ${curbTopY} L ${curbX} ${curbBottomY} L ${xW} ${yW} L ${xEnd} ${yEnd}`;
      
      // Water path
      if (depth > Sw * W) {
        // Composite section water
        waterPath = `M ${curbX} ${waterSurfaceY} L ${curbX} ${curbBottomY} L ${xW} ${yW} L ${xT} ${waterSurfaceY} Z`;
      } else {
        // Simple triangular water
        const xWaterEnd = curbX + (depth / Sw) * scaleX;
        waterPath = `M ${curbX} ${waterSurfaceY} L ${curbX} ${curbBottomY} L ${xWaterEnd} ${waterSurfaceY} Z`;
      }
      
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="max-w-[280px]">
          <path d={waterPath} fill={waterColor} fillOpacity={isPrint ? "0" : "0.25"} />
          <path d={path} fill="none" stroke={color} strokeWidth={isPrint ? "1.5" : "2"} />
          <line 
            x1={curbX} 
            y1={waterSurfaceY} 
            x2={xT} 
            y2={waterSurfaceY} 
            stroke={isPrint ? "black" : "#60a5fa"} 
            strokeWidth="1.5" 
            strokeDasharray="4,3" 
          />
        </svg>
      );
  } else {
      const channelHeight = depth * 1.35;
      let T;
      if (type === 'rectangular') T = width;
      else if (type === 'trapezoidal') T = width + (zL + zR) * channelHeight;
      else T = (zL + zR) * channelHeight;
      const scale = Math.min((svgWidth - 2 * margin) / T, (svgHeight - 2 * margin) / channelHeight);
      waterTopY = bottomY - depth * scale;
      const topY = bottomY - channelHeight * scale;
      if (type === 'rectangular') {
        const w = width * scale;
        const x1 = centerX - w / 2;
        path = `M ${x1} ${topY} L ${x1} ${bottomY} L ${x1 + w} ${bottomY} L ${x1 + w} ${topY}`;
        waterPath = `M ${x1} ${waterTopY} L ${x1} ${bottomY} L ${x1 + w} ${bottomY} L ${x1 + w} ${waterTopY} Z`;
      } else if (type === 'trapezoidal') {
        const b = width * scale;
        const xBottomLeft = centerX - b / 2;
        const xBottomRight = centerX + b / 2;
        const xTopLeft = xBottomLeft - zL * channelHeight * scale;
        const xTopRight = xBottomRight + zR * channelHeight * scale;
        const xWaterLeft = xBottomLeft - zL * depth * scale;
        const xWaterRight = xBottomRight + zR * depth * scale;
        path = `M ${xTopLeft} ${topY} L ${xBottomLeft} ${bottomY} L ${xBottomRight} ${bottomY} L ${xTopRight} ${topY}`;
        waterPath = `M ${xWaterLeft} ${waterTopY} L ${xBottomLeft} ${bottomY} L ${xBottomRight} ${bottomY} L ${xWaterRight} ${waterTopY} Z`;
      } else { // triangular
        const xBottom = centerX;
        const xTopLeft = xBottom - zL * channelHeight * scale;
        const xTopRight = xBottom + zR * channelHeight * scale;
        const xWaterLeft = xBottom - zL * depth * scale;
        const xWaterRight = xBottom + zR * depth * scale;
        path = `M ${xTopLeft} ${topY} L ${xBottom} ${bottomY} L ${xTopRight} ${topY}`;
        waterPath = `M ${xWaterLeft} ${waterTopY} L ${xBottom} ${bottomY} L ${xWaterRight} ${waterTopY} Z`;
      }
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="max-w-[280px]">
          <path d={waterPath} fill={waterColor} fillOpacity={isPrint ? "0" : "0.15"} />
          <path d={path} fill="none" stroke={color} strokeWidth={isPrint ? "1" : "1.5"} />
          <line 
            x1={type === 'rectangular' ? centerX - (width * scale / 2) : (type === 'trapezoidal' ? centerX - (width * scale / 2) - zL * depth * scale : centerX - zL * depth * scale)} 
            y1={waterTopY} 
            x2={type === 'rectangular' ? centerX + (width * scale / 2) : (type === 'trapezoidal' ? centerX + (width * scale / 2) + zR * depth * scale : centerX + zR * depth * scale)} 
            y2={waterTopY} 
            stroke={isPrint ? "black" : "#60a5fa"} 
            strokeWidth="1" 
            strokeDasharray="3,2" 
          />
        </svg>
      );
  }
};

const ChannelCalculator = ({ scenario, onUpdate, precision, handlePrecisionChange }) => {
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showIrregularModal, setShowIrregularModal] = useState(false);
  const [tempIrregularData, setTempIrregularData] = useState('');

  const solveNormalDepth = async () => {
    const { 
      type, discharge, width, sideSlope, leftSideSlope, rightSideSlope, 
      slope, manningsN, units, irregularPoints, 
      solveFor, gutterWidth, gutterCrossSlope, roadCrossSlope, spread,
      normalDepth, waterSurfaceElevation
    } = scenario;

    // Common validation
    if (slope <= 0 || manningsN <= 0) {
      setError("Check Slope and Manning's n.");
      setResults(null);
      return;
    }

    // Gutter specific validation
    if (type === 'gutter') {
      if (gutterCrossSlope <= 0 || roadCrossSlope <= 0) {
        setError("Check Cross Slopes.");
        setResults(null);
        return;
      }
    }

    // Solve Mode Validation
    if (solveFor === 'discharge') {
      if (type === 'irregular') {
        if (waterSurfaceElevation === undefined || waterSurfaceElevation === null || isNaN(waterSurfaceElevation)) {
          setError("Water Surface Elevation is required.");
          setResults(null);
          return;
        }
      } else if (type === 'gutter') {
        if (!spread || spread <= 0) {
          setError("Spread is required to solve for Discharge.");
          setResults(null);
          return;
        }
      } else {
        if (!normalDepth || normalDepth <= 0) {
          setError("Normal Depth is required to solve for Discharge.");
          setResults(null);
          return;
        }
      }
    } else {
      // Solve for Depth (or Spread)
      if (!discharge || discharge <= 0) {
        setError("Discharge is required.");
        setResults(null);
        return;
      }
    }

    setIsCalculating(true);
    try {
      const response = await fetch(`${API_BASE}/manning/channels/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type, 
          solve_for: solveFor || 'depth',
          discharge: solveFor === 'discharge' ? null : discharge, 
          bottom_width: width, 
          side_slope: sideSlope,
          left_side_slope: leftSideSlope, 
          right_side_slope: rightSideSlope,
          slope, 
          mannings_n: manningsN, 
          units,
          station_elevation_points: type === 'irregular' ? irregularPoints : [],
          gutter_width: gutterWidth,
          gutter_cross_slope: gutterCrossSlope,
          road_cross_slope: roadCrossSlope,
          spread: spread,
          known_depth: normalDepth,
          known_wse: waterSurfaceElevation
        })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Calculation failed');
      }
      const data = await response.json();
      const isIrregular = type === 'irregular';
      const minElev = isIrregular && irregularPoints?.length ? Math.min(...irregularPoints.map(p => p[1])) : null;
      const res = {
        ...data,
        waterSurfaceElevation: data.water_surface_elevation ?? (minElev != null ? minElev + data.depth : null),
        timestamp: new Date(data.timestamp).toLocaleString()
      };
      setResults(res);
      onUpdate({ results: res }); // Report results back to parent
      setError(null);
    } catch (e) {
      setError(e.message);
      setResults(null);
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => solveNormalDepth(), 300);
    return () => clearTimeout(timer);
  }, [scenario]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onUpdate({ [name]: parseFloat(value) || 0 });
  };

  const saveIrregularData = () => {
    const points = parseIrregularData(tempIrregularData);
    if (points.length < 2) {
        alert("Please enter at least 2 valid points");
        return;
    }
    onUpdate({ irregularData: tempIrregularData, irregularPoints: points });
    setShowIrregularModal(false);
  };

  return (
    <div className="animate-in fade-in duration-500">
      {showIrregularModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] border border-[#333] w-full max-w-lg rounded-md p-6 shadow-2xl flex flex-col h-[500px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-white font-medium">Station Elevation Data</h3>
              <button onClick={() => setShowIrregularModal(false)} className="text-[#525252] hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <textarea
              value={tempIrregularData} onChange={(e) => setTempIrregularData(e.target.value)}
              placeholder={`0\t100\n5\t98\n10\t95\n15\t98\n20\t100`}
              autoFocus
              onKeyDown={(e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                  saveIrregularData();
                }
              }}
              className="flex-1 w-full bg-[#121212] border border-[#333] rounded p-3 text-sm font-mono text-[#e5e5e5] focus:outline-none resize-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowIrregularModal(false)} className="bg-transparent text-[#737373] text-[10px] uppercase px-4 py-2 hover:text-white">Cancel</button>
              <button onClick={saveIrregularData} className="bg-white/5 text-white text-[10px] uppercase px-4 py-2 rounded border border-[#333] hover:bg-white/10">Save</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex bg-[#1a1a1a] p-1 rounded border border-[#2e2e2e] mb-8 w-full max-w-md mx-auto">
        <TypeBtn active={scenario.type === 'rectangular'} onClick={() => onUpdate({ type: 'rectangular' })} label="Rectangular" />
        <TypeBtn active={scenario.type === 'trapezoidal'} onClick={() => onUpdate({ type: 'trapezoidal' })} label="Trapezoidal" />
        <TypeBtn active={scenario.type === 'triangular'} onClick={() => onUpdate({ type: 'triangular' })} label="Triangular" />
        <TypeBtn active={scenario.type === 'irregular'} onClick={() => onUpdate({ type: 'irregular' })} label="Irregular" />
        <TypeBtn active={scenario.type === 'gutter'} onClick={() => onUpdate({ type: 'gutter' })} label="Gutter" />
      </div>

      <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-md p-6 mb-8 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-full mb-2">
            <label className="text-[10px] uppercase tracking-widest text-[#737373] mb-2 block">
              Solve For
            </label>
            <select 
              value={scenario.solveFor || (scenario.type === 'gutter' ? 'spread' : 'depth')} 
              onChange={(e) => onUpdate({ solveFor: e.target.value })}
              className="w-full appearance-none bg-[#121212] border border-[#333] rounded px-3 py-2 text-sm text-[#e5e5e5] focus:outline-none focus:border-[#525252] cursor-pointer"
            >
              <option value={scenario.type === 'gutter' ? 'spread' : 'depth'} className="bg-[#1a1a1a]">
                {scenario.type === 'gutter' ? 'Spread' : (scenario.type === 'irregular' ? 'Water Surface Elevation' : 'Normal Depth')}
              </option>
              <option value="discharge" className="bg-[#1a1a1a]">Discharge</option>
            </select>
          </div>

          {scenario.solveFor === 'discharge' ? (
            <>
              {scenario.type === 'irregular' ? (
                <InputField label="Water Surface Elev." name="waterSurfaceElevation" value={scenario.waterSurfaceElevation} onChange={handleInputChange} unit={scenario.units === 'metric' ? 'm' : 'ft'} />
              ) : scenario.type === 'gutter' ? (
                <InputField label="Spread (T)" name="spread" value={scenario.spread} onChange={handleInputChange} unit={scenario.units === 'metric' ? 'm' : 'ft'} />
              ) : (
                <InputField label="Normal Depth (y)" name="normalDepth" value={scenario.normalDepth} onChange={handleInputChange} unit={scenario.units === 'metric' ? 'm' : 'ft'} />
              )}
            </>
          ) : (
            <InputField label="Discharge (Q)" name="discharge" value={scenario.discharge} onChange={handleInputChange} unit={scenario.units === 'metric' ? 'm³/s' : 'ft³/s'} />
          )}

          {scenario.type === 'gutter' ? (
            <>
              <InputField label="Gutter Width (W)" name="gutterWidth" value={scenario.gutterWidth} onChange={handleInputChange} unit={scenario.units === 'metric' ? 'm' : 'ft'} />
              <InputField label="Gutter Cross Slope (Sw)" name="gutterCrossSlope" value={scenario.gutterCrossSlope} onChange={handleInputChange} unit="v:h" />
              <InputField label="Road Cross Slope (Sx)" name="roadCrossSlope" value={scenario.roadCrossSlope} onChange={handleInputChange} unit="v:h" />
            </>
          ) : (
            <>
              {scenario.type === 'irregular' ? (
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-[#737373]">Geometry</label>
                  <button onClick={() => { setTempIrregularData(scenario.irregularData || ''); setShowIrregularModal(true); }} className={`bg-[#121212] border ${scenario.irregularPoints?.length > 0 ? 'border-blue-900/50 text-blue-200' : 'border-[#333] text-[#737373]'} rounded px-3 py-2 text-sm text-left hover:border-[#525252]`}>
                    {scenario.irregularPoints?.length > 0 ? `${scenario.irregularPoints.length} Points Defined` : 'Enter Data...'}
                  </button>
                </div>
              ) : (
                <>
                  {scenario.type !== 'triangular' && <InputField label="Bottom Width (b)" name="width" value={scenario.width} onChange={handleInputChange} unit={scenario.units === 'metric' ? 'm' : 'ft'} />}
                  {scenario.type !== 'rectangular' && (
                    <>
                      <InputField label="Left Slope (zL:1)" name="leftSideSlope" value={scenario.leftSideSlope} onChange={handleInputChange} unit="H:V" />
                      <InputField label="Right Slope (zR:1)" name="rightSideSlope" value={scenario.rightSideSlope} onChange={handleInputChange} unit="H:V" />
                    </>
                  )}
                </>
              )}
            </>
          )}
          <InputField label="Channel Slope (S)" name="slope" value={scenario.slope} onChange={handleInputChange} unit={scenario.units === 'metric' ? 'm/m' : 'ft/ft'} />
          <InputField label="Manning's n" name="manningsN" value={scenario.manningsN} onChange={handleInputChange} unit="—" />
        </div>
        {error && <div className="mt-6 text-red-400 text-[10px] bg-red-950/20 p-3 rounded border border-red-900/30 uppercase tracking-wider flex items-center gap-2"><AlertCircle size={14} />{error}</div>}
        <div className={`mt-4 text-center text-[10px] uppercase tracking-widest text-[#525252] transition-opacity duration-200 ${isCalculating ? 'opacity-100' : 'opacity-0'}`}>
          Calculating...
        </div>
      </div>

      {results && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-md p-8 text-center flex flex-col justify-center border-b-2 border-b-[#404040] cursor-help" onContextMenu={(e) => handlePrecisionChange('depth', e)}>
              <p className="text-[10px] uppercase tracking-widest text-[#737373] mb-1">
                {scenario.solveFor === 'discharge' ? 'Discharge (Q)' : 
                 (scenario.type === 'irregular' ? 'WSE' : 
                 (scenario.type === 'gutter' ? 'Spread (T)' : 'Normal Depth (yₙ)'))}
              </p>
              <h2 className="text-4xl font-light text-white tracking-tight">
                {Number(
                  scenario.solveFor === 'discharge' ? results.discharge :
                  (scenario.type === 'irregular' ? (results.waterSurfaceElevation ?? results.depth) : 
                  (scenario.type === 'gutter' ? results.spread : results.depth))
                ).toFixed(scenario.solveFor === 'discharge' ? 2 : precision.depth)} 
                <span className="text-lg text-[#525252] ml-1">
                  {scenario.solveFor === 'discharge' ? (scenario.units === 'metric' ? 'm³/s' : 'ft³/s') : (scenario.units === 'metric' ? 'm' : 'ft')}
                </span>
              </h2>
              <p className={`mt-4 text-[9px] font-medium tracking-[0.25em] uppercase ${results.flow_regime === 'Supercritical' ? 'text-amber-500/80' : 'text-blue-500/80'}`}>{results.flow_regime} Flow</p>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-md p-4 flex flex-col items-center justify-center min-h-[160px]">
              <ChannelPlot 
                type={scenario.type} 
                width={scenario.type === 'gutter' ? scenario.gutterWidth : scenario.width} 
                zL={scenario.type === 'gutter' ? scenario.gutterCrossSlope : scenario.leftSideSlope} 
                zR={scenario.type === 'gutter' ? scenario.roadCrossSlope : scenario.rightSideSlope} 
                depth={results.depth} 
                points={scenario.irregularPoints} 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 border-t border-[#232323] pt-6">
            <ResultCard label="Area" value={Number(results.area).toFixed(precision.area)} unit={scenario.units === 'metric' ? 'm²' : 'ft²'} onContextMenu={(e) => handlePrecisionChange('area', e)} />
            {scenario.type === 'gutter' && (
              <>
                <ResultCard label="Spread (T)" value={Number(results.spread).toFixed(precision.depth)} unit={scenario.units === 'metric' ? 'm' : 'ft'} onContextMenu={(e) => handlePrecisionChange('depth', e)} />
                <ResultCard label="Gutter Depr." value={Number(results.gutter_depression).toFixed(precision.depth)} unit={scenario.units === 'metric' ? 'm' : 'ft'} onContextMenu={(e) => handlePrecisionChange('depth', e)} />
              </>
            )}
            <ResultCard label="Perimeter" value={Number(results.wetted_perimeter).toFixed(precision.perimeter)} unit={scenario.units === 'metric' ? 'm' : 'ft'} onContextMenu={(e) => handlePrecisionChange('perimeter', e)} />
            <ResultCard label="Radius" value={Number(results.hydraulic_radius).toFixed(precision.radius)} unit={scenario.units === 'metric' ? 'm' : 'ft'} onContextMenu={(e) => handlePrecisionChange('radius', e)} />
            <ResultCard label="Top Width" value={Number(results.top_width).toFixed(precision.topWidth)} unit={scenario.units === 'metric' ? 'm' : 'ft'} onContextMenu={(e) => handlePrecisionChange('topWidth', e)} />
            <ResultCard label="Crit. Depth" value={Number(results.critical_depth).toFixed(precision.criticalDepth)} unit={scenario.units === 'metric' ? 'm' : 'ft'} onContextMenu={(e) => handlePrecisionChange('criticalDepth', e)} />
            <ResultCard label="Crit. Slope" value={Number(results.critical_slope).toFixed(precision.criticalSlope)} unit={scenario.units === 'metric' ? 'm/m' : 'ft/ft'} onContextMenu={(e) => handlePrecisionChange('criticalSlope', e)} />
            <ResultCard label="Velocity" value={Number(results.velocity).toFixed(precision.velocity)} unit={scenario.units === 'metric' ? 'm/s' : 'ft/s'} onContextMenu={(e) => handlePrecisionChange('velocity', e)} />
            <ResultCard label="Vel. Head" value={Number(results.velocity_head).toFixed(precision.velocityHead)} unit={scenario.units === 'metric' ? 'm' : 'ft'} onContextMenu={(e) => handlePrecisionChange('velocityHead', e)} />
            <ResultCard label="Energy" value={Number(results.specific_energy).toFixed(precision.specificEnergy)} unit={scenario.units === 'metric' ? 'm' : 'ft'} onContextMenu={(e) => handlePrecisionChange('specificEnergy', e)} />
            <ResultCard label="Froude" value={Number(results.froude_number).toFixed(precision.froude)} onContextMenu={(e) => handlePrecisionChange('froude', e)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelCalculator;
