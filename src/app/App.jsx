import React, { useState, useEffect, useRef } from 'react';
import CurbInletOnGrade from './CurbInletOnGrade';
import ChannelCalculator from './ChannelCalculator';
import CommandPalette from './CommandPalette';
import { 
  Printer, 
  Calculator, 
  ChevronLeft, 
  FileText, 
  X, 
  Plus, 
  Trash2, 
  Layers,
  Edit3,
  Box,
  Triangle,
  ChevronDown,
  Copy,
  Table as TableIcon,
  Settings2,
  Sparkles,
  Download,
  Save,
  FolderOpen
} from 'lucide-react';

const formatToMarkdown = (scenario, results) => {
  const { units, type, solveFor, kind } = scenario;
  if (!results) return '';

  const isMetric = units === 'metric';
  const len = isMetric ? 'm' : 'ft';
  const flow = isMetric ? 'm³/s' : 'ft³/s';
  const slope = isMetric ? 'm/m' : 'ft/ft';
  const vel = isMetric ? 'm/s' : 'ft/s';
  const area = isMetric ? 'm²' : 'ft²';

  const date = new Date().toLocaleString();

  let md = `# ${scenario.title} Analysis Results\n`;
  md += `*Generated on ${date}*\n\n`;

  if (kind === 'channel') {
    md += `## Input Parameters\n`;
    md += `- **Channel Type:** ${type.charAt(0).toUpperCase() + type.slice(1)}\n`;
    md += `- **Solve For:** ${solveFor === 'discharge' ? 'Discharge' : (type === 'gutter' ? 'Spread' : (type === 'irregular' ? 'Water Surface Elevation' : 'Normal Depth'))}\n`;
    md += `- **Units:** ${isMetric ? 'Metric' : 'English'}\n`;
    
    if (solveFor !== 'discharge') {
      md += `- **Discharge:** ${scenario.discharge} ${flow}\n`;
    }
    
    md += `- **Slope:** ${scenario.slope} ${slope}\n`;
    md += `- **Manning's n:** ${scenario.manningsN}\n`;

    if (type === 'rectangular') {
      md += `- **Bottom Width:** ${scenario.width} ${len}\n`;
    } else if (type === 'trapezoidal') {
      md += `- **Bottom Width:** ${scenario.width} ${len}\n`;
      md += `- **Left Side Slope:** ${scenario.leftSideSlope}:1\n`;
      md += `- **Right Side Slope:** ${scenario.rightSideSlope}:1\n`;
    } else if (type === 'triangular') {
      md += `- **Left Side Slope:** ${scenario.leftSideSlope}:1\n`;
      md += `- **Right Side Slope:** ${scenario.rightSideSlope}:1\n`;
    } else if (type === 'gutter') {
      md += `- **Gutter Width:** ${scenario.gutterWidth} ${len}\n`;
      md += `- **Gutter Cross Slope:** ${scenario.gutterCrossSlope}\n`;
      md += `- **Road Cross Slope:** ${scenario.roadCrossSlope}\n`;
      if (solveFor === 'discharge') {
         md += `- **Spread:** ${scenario.spread} ${len}\n`;
      }
    } else if (type === 'irregular') {
       md += `- **Geometry:** ${scenario.irregularPoints?.length || 0} points defined\n`;
       if (solveFor === 'discharge') {
          md += `- **Water Surface Elevation:** ${scenario.waterSurfaceElevation} ${len}\n`;
       }
    }

    md += `\n## Results\n`;
    md += `- **Flow Regime:** ${results.flow_regime}\n`;
    
    if (solveFor === 'discharge') {
        md += `- **Discharge:** ${Number(results.discharge).toFixed(4)} ${flow}\n`;
    } else {
        if (type === 'irregular') {
            md += `- **Water Surface Elevation:** ${Number(results.waterSurfaceElevation ?? results.depth).toFixed(4)} ${len}\n`;
        } else if (type === 'gutter') {
            md += `- **Spread:** ${Number(results.spread).toFixed(4)} ${len}\n`;
        } else {
            md += `- **Normal Depth:** ${Number(results.depth).toFixed(4)} ${len}\n`;
        }
    }

    md += `- **Area:** ${Number(results.area).toFixed(4)} ${area}\n`;
    md += `- **Wetted Perimeter:** ${Number(results.wetted_perimeter).toFixed(4)} ${len}\n`;
    md += `- **Hydraulic Radius:** ${Number(results.hydraulic_radius).toFixed(4)} ${len}\n`;
    md += `- **Top Width:** ${Number(results.top_width).toFixed(4)} ${len}\n`;
    md += `- **Velocity:** ${Number(results.velocity).toFixed(4)} ${vel}\n`;
    md += `- **Velocity Head:** ${Number(results.velocity_head).toFixed(4)} ${len}\n`;
    md += `- **Specific Energy:** ${Number(results.specific_energy).toFixed(4)} ${len}\n`;
    md += `- **Froude Number:** ${Number(results.froude_number).toFixed(4)}\n`;
    md += `- **Critical Depth:** ${Number(results.critical_depth).toFixed(4)} ${len}\n`;
    md += `- **Critical Slope:** ${Number(results.critical_slope).toFixed(4)} ${slope}\n`;

    if (type === 'gutter') {
        md += `- **Gutter Depression:** ${Number(results.gutter_depression).toFixed(4)} ${len}\n`;
    }
  } else {
    // Inlet report
    md += `## Input Parameters\n`;
    md += `- **Inlet Type:** Curb Opening On-Grade\n`;
    md += `- **Discharge:** ${scenario.discharge} cfs\n`;
    md += `- **Slope:** ${scenario.slope} ft/ft\n`;
    md += `- **Gutter Width:** ${scenario.gutterWidth} ft\n`;
    md += `- **Gutter Cross Slope:** ${scenario.gutterCrossSlope} ft/ft\n`;
    md += `- **Road Cross Slope:** ${scenario.roadCrossSlope} ft/ft\n`;
    md += `- **Manning's n:** ${scenario.manningsN}\n`;
    md += `- **Curb Opening Length:** ${scenario.curbOpeningLength} ft\n`;

    md += `\n## Results\n`;
    md += `- **Efficiency:** ${results.efficiency_percent.toFixed(1)}%\n`;
    md += `- **Intercepted Flow:** ${results.intercepted_flow_cfs.toFixed(2)} cfs\n`;
    md += `- **Bypass Flow:** ${results.bypass_flow_cfs.toFixed(2)} cfs\n`;
    md += `- **Spread:** ${results.spread_ft.toFixed(2)} ft\n`;
    md += `- **Depth:** ${results.depth_ft.toFixed(2)} ft\n`;
    md += `- **Velocity:** ${results.velocity_fps.toFixed(2)} ft/s\n`;
  }

  if (scenario.notes) {
    md += `\n## Notes\n${scenario.notes}\n`;
  }

  return md;
};

const API_BASE = 'http://127.0.0.1:8000/api';
const NOTE_LIMIT = 500;

const PrintTableRow = ({ label, value, unit }) => (
  <tr className="border-b border-gray-100 last:border-0">
    <td className="py-2 text-gray-600 text-xs uppercase tracking-wider">{label}</td>
    <td className="py-2 text-right font-bold text-sm">{value} <span className="font-normal text-gray-400 text-[9px] ml-1">{unit}</span></td>
  </tr>
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
      if (intersections.length >= 2) {
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
      // depth_at_curb = Sx * (T_total - W) + (Sw - Sx) * W
      // T_total = (depth_at_curb - (Sw - Sx) * W) / Sx + W
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

const DEFAULT_CHANNEL = {
  kind: 'channel',
  type: 'rectangular',
  solveFor: 'spread',
  discharge: 10,
  width: 5,
  sideSlope: 2,
  leftSideSlope: 2,
  rightSideSlope: 2,
  slope: 0.001,
  manningsN: 0.013,
  units: 'imperial',
  notes: '',
  irregularData: '',
  irregularPoints: [],
  gutterWidth: 2.0,
  gutterCrossSlope: 0.060,
  roadCrossSlope: 0.020,
  spread: 5.0
};

const DEFAULT_INLET = {
  kind: 'inlet',
  inletType: 'curb_on_grade',
  discharge: 10,
  slope: 0.005,
  gutterWidth: 2.0,
  gutterCrossSlope: 0.060,
  roadCrossSlope: 0.020,
  manningsN: 0.016,
  curbOpeningLength: 12.0,
  localDepressionDepth: 0.6,
  localDepressionWidth: 2.0,
  units: 'imperial',
  notes: ''
};

const App = () => {
  // Navigation & UI State
  const [activeTab, setActiveTab] = useState('calc'); // 'calc' or 'print'
  const [showNotes, setShowNotes] = useState(false);
  const [showPrecisionModal, setShowPrecisionModal] = useState(false);
  const [editingPrecisionKey, setEditingPrecisionKey] = useState(null);
  const [tempPrecisionValue, setTempPrecisionValue] = useState('');
  const [showNewSectionModal, setShowNewSectionModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [projectName, setProjectName] = useState('New Project');
  
  // Scenarios State
  const [scenarios, setScenarios] = useState([
    {
      id: 'default-1',
      title: 'Section 1',
      ...DEFAULT_CHANNEL
    }
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [precision, setPrecision] = useState({
    depth: 2,
    area: 2,
    perimeter: 2,
    radius: 2,
    velocity: 2,
    topWidth: 2,
    froude: 3,
    criticalDepth: 2,
    criticalSlope: 4,
    velocityHead: 3,
    specificEnergy: 2
  });

  const [showAICopyMenu, setShowAICopyMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const aiCopyMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (aiCopyMenuRef.current && !aiCopyMenuRef.current.contains(event.target)) {
        setShowAICopyMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAICopy = async () => {
    const md = formatToMarkdown(currentScenario, currentScenario.results);
    if (!md) return;
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setShowAICopyMenu(false);
  };

  const handleAIDownload = () => {
    const md = formatToMarkdown(currentScenario, currentScenario.results);
    if (!md) return;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentScenario.title.toLowerCase().replace(/\s+/g, '_')}_results.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowAICopyMenu(false);
  };

  const currentScenario = scenarios[currentIndex];

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Don't trigger if user is typing in an input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      if (e.key === '/') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const commandActions = [
    { 
      id: 'new-rect', 
      label: 'New Rectangular Channel', 
      description: 'Manning\'s Open Channel',
      icon: <Box size={16} />, 
      run: () => addScenario('channel', 'rectangular') 
    },
    { 
      id: 'new-trap', 
      label: 'New Trapezoidal Channel', 
      description: 'Manning\'s Open Channel',
      icon: <Layers size={16} />, 
      run: () => addScenario('channel', 'trapezoidal') 
    },
    { 
      id: 'new-tri', 
      label: 'New Triangular Channel', 
      description: 'Manning\'s Open Channel',
      icon: <Triangle size={16} />, 
      run: () => addScenario('channel', 'triangular') 
    },
    { 
      id: 'new-irreg', 
      label: 'New Irregular Channel', 
      description: 'Manning\'s Open Channel',
      icon: <TableIcon size={16} />, 
      run: () => addScenario('channel', 'irregular') 
    },
    { 
      id: 'new-gutter', 
      label: 'New Gutter Flow', 
      description: 'Manning\'s Open Channel',
      icon: <Calculator size={16} />, 
      run: () => addScenario('channel', 'gutter') 
    },
    { 
      id: 'new-inlet', 
      label: 'New Curb Inlet On-Grade', 
      description: 'HEC-22 Inlet Capacity',
      icon: <Calculator size={16} />, 
      run: () => addScenario('inlet', 'curb_on_grade') 
    },
    { 
      id: 'open-notes', 
      label: 'Open Notes', 
      description: 'Edit section notes',
      icon: <FileText size={16} />, 
      run: () => setShowNotes(true) 
    },
    { 
      id: 'print', 
      label: 'Print Page', 
      description: 'Generate PDF or print',
      icon: <Printer size={16} />, 
      run: () => setActiveTab('print') 
    },
    { 
      id: 'set-metric', 
      label: 'Change to Metric Units', 
      description: 'Convert current section to SI',
      icon: <Settings2 size={16} />, 
      run: () => handleUnitChange({ target: { value: 'metric' } }) 
    },
    { 
      id: 'set-imperial', 
      label: 'Change to Imperial Units', 
      description: 'Convert current section to US Customary',
      icon: <Settings2 size={16} />, 
      run: () => handleUnitChange({ target: { value: 'imperial' } }) 
    },
  ];

  const handleScenarioUpdate = (index, updates) => {
    const updated = [...scenarios];
    updated[index] = { ...updated[index], ...updates };
    setScenarios(updated);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'notes' && value.length > NOTE_LIMIT) return;
    const isNumeric = name !== 'notes' && name !== 'title' && name !== 'type' && name !== 'kind' && name !== 'inletType';
    handleScenarioUpdate(currentIndex, {
      [name]: isNumeric ? (parseFloat(value) || 0) : value
    });
  };

  const handleUnitChange = (e) => {
    const newUnit = e.target.value;
    if (newUnit === currentScenario.units) return;
    
    const isMetricToImperial = currentScenario.units === 'metric' && newUnit === 'imperial';
    const isImperialToMetric = currentScenario.units === 'imperial' && newUnit === 'metric';
    
    const lenFactor = 3.28084;
    const qFactor = 35.3147;

    const updates = { units: newUnit };

    if (currentScenario.discharge !== undefined) {
      updates.discharge = isMetricToImperial ? +(currentScenario.discharge * qFactor).toFixed(2) : +(currentScenario.discharge / qFactor).toFixed(2);
    }
    if (currentScenario.width !== undefined) {
      updates.width = isMetricToImperial ? +(currentScenario.width * lenFactor).toFixed(2) : +(currentScenario.width / lenFactor).toFixed(2);
    }

    if (currentScenario.irregularPoints?.length > 0) {
        updates.irregularPoints = currentScenario.irregularPoints.map(p => {
             return isMetricToImperial 
                ? [p[0] * lenFactor, p[1] * lenFactor]
                : [p[0] / lenFactor, p[1] / lenFactor];
        });
        updates.irregularData = updates.irregularPoints.map(p => `${p[0].toFixed(3)}\t${p[1].toFixed(3)}`).join('\n');
    }

    handleScenarioUpdate(currentIndex, updates);
  };

  const addScenario = (kind, type) => {
    const base = kind === 'channel' ? DEFAULT_CHANNEL : DEFAULT_INLET;
    const newScenario = {
      ...base,
      id: crypto.randomUUID(),
      title: `${kind === 'channel' ? 'Channel' : 'Inlet'} ${scenarios.length + 1}`,
      type: kind === 'channel' ? type : base.type,
      inletType: kind === 'inlet' ? type : base.inletType,
    };
    setScenarios([...scenarios, newScenario]);
    setCurrentIndex(scenarios.length);
    setShowNewSectionModal(false);
  };

  const deleteScenario = (idx, e) => {
    e.stopPropagation();
    if (scenarios.length === 1) return;
    const updated = scenarios.filter((_, i) => i !== idx);
    setScenarios(updated);
    if (currentIndex >= updated.length) {
      setCurrentIndex(updated.length - 1);
    }
  };

  const copyToClipboard = async (format) => {
    alert(`Copying as ${format} (Integration coming soon)`);
  };

  const handlePrecisionChange = (key, e) => {
    e.preventDefault();
    setEditingPrecisionKey(key);
    setTempPrecisionValue(precision[key].toString());
    setShowPrecisionModal(true);
  };

  const savePrecision = () => {
    const val = parseInt(tempPrecisionValue);
    if (!isNaN(val) && val >= 0 && val <= 10) {
      setPrecision(prev => ({ ...prev, [editingPrecisionKey]: val }));
    }
    setShowPrecisionModal(false);
  };

  const saveProject = () => {
    const projectData = {
      version: "1.0",
      name: projectName,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      scenarios: scenarios.map(s => {
        const { id, title, notes, results, kind, ...inputs } = s;
        return {
          id,
          title,
          notes: notes || "",
          module: kind === 'channel' ? "manning.channels" : "curb_inlets.on_grade",
          inputs,
          results
        };
      })
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const projectData = JSON.parse(e.target.result);
          if (projectData.scenarios && Array.isArray(projectData.scenarios)) {
            setProjectName(projectData.name || 'Imported Project');
            
            const importedScenarios = projectData.scenarios.map(s => {
              if (s.inputs && s.module) {
                // Map from Project/Scenario model structure
                return {
                  id: s.id,
                  title: s.title,
                  notes: s.notes || "",
                  kind: s.module === "manning.channels" ? 'channel' : 'inlet',
                  results: s.results,
                  ...s.inputs
                };
              }
              // Fallback for older/UI-only format
              return s;
            });
            
            setScenarios(importedScenarios);
            setCurrentIndex(0);
          } else {
            alert('Invalid project file format.');
          }
        } catch (err) {
          console.error('Load error:', err);
          alert('Error parsing project file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  if (activeTab === 'calc') {
    return (
      <div className="flex h-screen bg-[#121212] text-[#d4d4d4] font-sans selection:bg-[#404040]">
        <aside className="w-64 border-r border-[#232323] bg-[#0f0f0f] flex flex-col hidden md:flex">
          <div className="p-4 border-b border-[#232323]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#525252]">Project</span>
              <div className="flex gap-2">
                <button onClick={loadProject} title="Load Project" className="text-[#a3a3a3] hover:text-white transition-colors">
                  <FolderOpen size={14} />
                </button>
                <button onClick={saveProject} title="Save Project" className="text-[#a3a3a3] hover:text-white transition-colors">
                  <Save size={14} />
                </button>
              </div>
            </div>
            <input 
              type="text" 
              value={projectName} 
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#525252]"
              placeholder="Project Name"
            />
          </div>

          <div className="p-4 border-b border-[#232323] flex justify-between items-center bg-[#0a0a0a]">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#525252]">Sections</span>
            <button onClick={() => setShowNewSectionModal(true)} className="text-[#a3a3a3] hover:text-white transition-colors">
              <Plus size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {scenarios.map((s, idx) => (
              <div 
                key={s.id}
                onClick={() => setCurrentIndex(idx)}
                className={`group flex items-center justify-between p-3 rounded cursor-pointer transition-all ${idx === currentIndex ? 'bg-[#1a1a1a] text-white border border-[#333]' : 'hover:bg-[#151515] text-[#737373] border border-transparent'}`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="min-w-[12px]">
                    {s.kind === 'channel' ? (
                      <>
                        {s.type === 'rectangular' && <Box size={12} className={idx === currentIndex ? 'text-white' : 'text-[#404040]'} />}
                        {s.type === 'trapezoidal' && <Layers size={12} className={idx === currentIndex ? 'text-white' : 'text-[#404040]'} />}
                        {s.type === 'triangular' && <Triangle size={12} className={idx === currentIndex ? 'text-white' : 'text-[#404040]'} />}
                        {s.type === 'irregular' && <TableIcon size={12} className={idx === currentIndex ? 'text-white' : 'text-[#404040]'} />}
                      </>
                    ) : (
                      <Calculator size={12} className={idx === currentIndex ? 'text-white' : 'text-[#404040]'} />
                    )}
                  </div>
                  <span className="text-xs truncate font-light tracking-wide">{s.title}</span>
                </div>
                {scenarios.length > 1 && (
                  <button 
                    onClick={(e) => deleteScenario(idx, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity p-1"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto flex flex-col items-center py-12 px-6">
          <div className="w-full max-w-2xl relative">
            <CommandPalette 
              isOpen={showCommandPalette} 
              onClose={() => setShowCommandPalette(false)} 
              actions={commandActions} 
            />
            {showPrecisionModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-[#1a1a1a] border border-[#333] w-full max-w-xs rounded-md p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] uppercase tracking-[0.2em] text-white font-medium">Precision: {editingPrecisionKey}</h3>
                    <button onClick={() => setShowPrecisionModal(false)} className="text-[#525252] hover:text-white transition-colors">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex flex-col space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-[#737373]">Decimal Places</label>
                      <input
                        type="number" min="0" max="10"
                        value={tempPrecisionValue}
                        onChange={(e) => setTempPrecisionValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && savePrecision()}
                        autoFocus
                        className="w-full bg-[#121212] border border-[#333] rounded p-3 text-sm text-[#e5e5e5] focus:outline-none focus:border-[#525252]"
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                      <button onClick={() => setShowPrecisionModal(false)} className="bg-transparent text-[#737373] text-[10px] uppercase px-4 py-2 rounded hover:text-white transition-colors">Cancel</button>
                      <button onClick={savePrecision} className="bg-white/5 text-white text-[10px] uppercase px-4 py-2 rounded border border-[#333] hover:bg-white/10 transition-colors">Save</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showNewSectionModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-[#1a1a1a] border border-[#333] w-full max-w-md rounded-md p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[10px] uppercase tracking-[0.2em] text-white font-medium">Create New Section</h3>
                    <button onClick={() => setShowNewSectionModal(false)} className="text-[#525252] hover:text-white transition-colors">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="space-y-6">
                    <section>
                      <label className="text-[9px] uppercase tracking-[0.2em] text-[#525252] block mb-3">Open Channel Flow (Manning's)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => addScenario('channel', 'rectangular')} className="bg-[#121212] border border-[#333] p-3 rounded text-xs text-left hover:border-[#525252] transition-colors flex items-center gap-3">
                          <Box size={14} className="text-[#525252]" /> Rectangular
                        </button>
                        <button onClick={() => addScenario('channel', 'trapezoidal')} className="bg-[#121212] border border-[#333] p-3 rounded text-xs text-left hover:border-[#525252] transition-colors flex items-center gap-3">
                          <Layers size={14} className="text-[#525252]" /> Trapezoidal
                        </button>
                        <button onClick={() => addScenario('channel', 'triangular')} className="bg-[#121212] border border-[#333] p-3 rounded text-xs text-left hover:border-[#525252] transition-colors flex items-center gap-3">
                          <Triangle size={14} className="text-[#525252]" /> Triangular
                        </button>
                        <button onClick={() => addScenario('channel', 'irregular')} className="bg-[#121212] border border-[#333] p-3 rounded text-xs text-left hover:border-[#525252] transition-colors flex items-center gap-3">
                          <TableIcon size={14} className="text-[#525252]" /> Irregular
                        </button>
                      </div>
                    </section>
                    <section>
                      <label className="text-[9px] uppercase tracking-[0.2em] text-[#525252] block mb-3">Inlet Capacity (HEC-22)</label>
                      <div className="grid grid-cols-1 gap-2">
                        <button onClick={() => addScenario('inlet', 'curb_on_grade')} className="bg-[#121212] border border-[#333] p-3 rounded text-xs text-left hover:border-[#525252] transition-colors flex items-center gap-3">
                          <Calculator size={14} className="text-[#525252]" /> Curb Opening On-Grade
                        </button>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            )}

            {showNotes && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-[#1a1a1a] border border-[#333] w-full max-w-md rounded-md p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] uppercase tracking-[0.2em] text-white font-medium">Notes for {currentScenario.title}</h3>
                    <button onClick={() => setShowNotes(false)} className="text-[#525252] hover:text-white transition-colors">
                      <X size={18} />
                    </button>
                  </div>
                  <textarea
                    name="notes" value={currentScenario.notes} onChange={handleInputChange}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.ctrlKey && e.key === 'Enter') {
                        setShowNotes(false);
                      }
                    }}
                    className="w-full h-40 bg-[#121212] border border-[#333] rounded p-3 text-sm text-[#e5e5e5] focus:outline-none focus:border-[#525252] resize-none"
                  />
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-[9px] uppercase tracking-widest text-[#525252]">{currentScenario.notes.length} / {NOTE_LIMIT}</span>
                    <button onClick={() => setShowNotes(false)} className="bg-white/5 text-white text-[10px] uppercase px-4 py-2 rounded border border-[#333]">Done</button>
                  </div>
                </div>
              </div>
            )}

            <header className="mb-8 text-center flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1 group">
                <input 
                  type="text" name="title" value={currentScenario.title} onChange={handleInputChange}
                  className="bg-transparent text-xl font-light tracking-widest uppercase text-[#ffffff] text-center focus:outline-none border-b border-transparent focus:border-[#333] w-auto max-w-xs transition-colors"
                />
                <Edit3 size={12} className="text-[#333] group-hover:text-[#525252]" />
              </div>
            </header>

            <div className="flex justify-between items-end mb-6">
              <div className="flex gap-2 items-end">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#525252] px-1">
                    Units
                  </label>
                  <div className="flex bg-[#1a1a1a] p-0.5 rounded border border-[#333] h-[31px] items-center">
                    <button
                      onClick={() => handleUnitChange({ target: { value: 'metric' } })}
                      className={`h-full text-[9px] uppercase tracking-widest px-3 transition-all rounded-sm ${currentScenario.units === 'metric' ? 'bg-[#333] text-white shadow-sm' : 'text-[#525252] hover:text-[#737373]'}`}
                    >
                      Metric
                    </button>
                    <button
                      onClick={() => handleUnitChange({ target: { value: 'imperial' } })}
                      className={`h-full text-[9px] uppercase tracking-widest px-3 transition-all rounded-sm ${currentScenario.units === 'imperial' ? 'bg-[#333] text-white shadow-sm' : 'text-[#525252] hover:text-[#737373]'}`}
                    >
                      Imperial
                    </button>
                  </div>
                </div>
                <button onClick={() => setShowNotes(true)} className={`flex items-center gap-2 text-[10px] uppercase tracking-tighter border border-[#333] px-3 h-[31px] rounded hover:bg-[#1e1e1e] transition-colors ${currentScenario.notes ? 'text-white' : 'text-[#a3a3a3]'}`}>
                  <FileText size={12} /> Notes
                </button>
              </div>
              <div className="flex gap-2 items-end">
                <div className="relative" ref={aiCopyMenuRef}>
                  <button 
                    onClick={() => setShowAICopyMenu(!showAICopyMenu)} 
                    className={`flex items-center gap-2 text-[10px] uppercase tracking-tighter border border-[#333] px-3 h-[31px] rounded hover:bg-[#1e1e1e] transition-colors ${currentScenario.results ? 'text-[#a3a3a3]' : 'text-[#404040] opacity-50 cursor-not-allowed'}`}
                    disabled={!currentScenario.results}
                  >
                    <Sparkles size={12} className={currentScenario.results ? "text-purple-400" : ""} /> 
                    {copied ? 'Copied!' : 'AI Copy'}
                    <ChevronDown size={10} className={`transition-transform ${showAICopyMenu ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showAICopyMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] border border-[#333] rounded shadow-xl z-50 overflow-hidden">
                      <button onClick={handleAICopy} className="w-full text-left px-4 py-2.5 text-xs text-[#d4d4d4] hover:bg-[#262626] flex items-center gap-2 transition-colors">
                        <Copy size={14} /> Copy Markdown
                      </button>
                      <button onClick={handleAIDownload} className="w-full text-left px-4 py-2.5 text-xs text-[#d4d4d4] hover:bg-[#262626] flex items-center gap-2 transition-colors border-t border-[#262626]">
                        <Download size={14} /> Save as File
                      </button>
                    </div>
                  )}
                </div>
                <button onClick={() => setActiveTab('print')} className="flex items-center gap-2 text-[10px] uppercase tracking-tighter border border-[#333] px-3 h-[31px] rounded hover:bg-[#1e1e1e] transition-colors text-[#a3a3a3]">
                  <Printer size={12} /> Print
                </button>
              </div>
            </div>

            {currentScenario.kind === 'channel' ? (
              <ChannelCalculator 
                scenario={currentScenario}
                onUpdate={(updates) => handleScenarioUpdate(currentIndex, updates)}
                precision={precision}
                handlePrecisionChange={handlePrecisionChange}
              />
            ) : (
              <CurbInletOnGrade 
                scenario={currentScenario}
                onUpdate={(updates) => handleScenarioUpdate(currentIndex, updates)}
              />
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black font-serif p-8 md:p-16 flex flex-col items-center overflow-auto print:p-0">
      <div className="w-full max-w-[8.5in] bg-white print:max-w-full">
        <div className="mb-8 flex items-center gap-4 print:hidden font-sans">
          <button onClick={() => setActiveTab('calc')} className="flex items-center gap-2 text-xs uppercase border border-black px-4 py-2"><ChevronLeft size={14} /> Back</button>
          <button onClick={() => window.print()} className="flex items-center gap-2 text-xs uppercase bg-black text-white px-4 py-2"><Printer size={14} /> Print</button>
        </div>

        <div className="border border-black p-6 md:p-10 space-y-8 print:p-0 print:border-0">
          <header className="border-b-2 border-black pb-4 flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-tight mb-1">{currentScenario.title}</h1>
              <p className="text-xs font-sans uppercase tracking-widest text-gray-600 italic">
                {currentScenario.kind === 'channel' ? `${currentScenario.type} Channel` : 'Curb Inlet'} Analysis
              </p>
            </div>
            <div className="text-right text-[9px] font-sans uppercase text-gray-500">
              Generated: {currentScenario.results?.timestamp || new Date().toLocaleString()}
            </div>
          </header>

          <div className="grid grid-cols-2 gap-8">
            <section>
              <h3 className="text-[10px] font-sans font-bold uppercase border-b border-black mb-3 pb-1">Inputs</h3>
              <table className="w-full text-sm font-sans">
                <tbody>
                  {currentScenario.kind === 'channel' ? (
                    <>
                      <PrintTableRow label="Discharge (Q)" value={currentScenario.discharge} unit={currentScenario.units === 'metric' ? 'm³/s' : 'ft³/s'} />
                      {currentScenario.type === 'irregular' ? (
                        <PrintTableRow label="Points Count" value={currentScenario.irregularPoints?.length || 0} unit="" />
                      ) : currentScenario.type === 'gutter' ? (
                        <>
                          <PrintTableRow label="Gutter Width" value={currentScenario.gutterWidth} unit={currentScenario.units === 'metric' ? 'm' : 'ft'} />
                          <PrintTableRow label="Gutter Cross Slope" value={currentScenario.gutterCrossSlope} unit="ft/ft" />
                          <PrintTableRow label="Road Cross Slope" value={currentScenario.roadCrossSlope} unit="ft/ft" />
                          {currentScenario.solveFor === 'discharge' && <PrintTableRow label="Spread" value={currentScenario.spread} unit={currentScenario.units === 'metric' ? 'm' : 'ft'} />}
                        </>
                      ) : (
                        <>
                          {currentScenario.type !== 'triangular' && <PrintTableRow label="Bottom Width (b)" value={currentScenario.width} unit={currentScenario.units === 'metric' ? 'm' : 'ft'} />}
                          {currentScenario.type !== 'rectangular' && (
                            <>
                              <PrintTableRow label="Left Slope (zL:1)" value={currentScenario.leftSideSlope} unit="H:V" />
                              <PrintTableRow label="Right Slope (zR:1)" value={currentScenario.rightSideSlope} unit="H:V" />
                            </>
                          )}
                        </>
                      )}
                      <PrintTableRow label="Slope (S)" value={currentScenario.slope} unit={currentScenario.units === 'metric' ? 'm/m' : 'ft/ft'} />
                      <PrintTableRow label="Manning's n" value={currentScenario.manningsN} unit="—" />
                    </>
                  ) : (
                    <>
                      <PrintTableRow label="Discharge" value={currentScenario.discharge} unit="cfs" />
                      <PrintTableRow label="Slope" value={currentScenario.slope} unit="ft/ft" />
                      <PrintTableRow label="Gutter Width" value={currentScenario.gutterWidth} unit="ft" />
                      <PrintTableRow label="Gutter Cross Slope" value={currentScenario.gutterCrossSlope} unit="ft/ft" />
                      <PrintTableRow label="Road Cross Slope" value={currentScenario.roadCrossSlope} unit="ft/ft" />
                      <PrintTableRow label="Manning's n" value={currentScenario.manningsN} unit="—" />
                      <PrintTableRow label="Curb Opening Length" value={currentScenario.curbOpeningLength} unit="ft" />
                    </>
                  )}
                </tbody>
              </table>
            </section>
            <section>
              <h3 className="text-[10px] font-sans font-bold uppercase border-b border-black mb-3 pb-1">Primary Result</h3>
              <div className="py-2">
                {currentScenario.kind === 'channel' ? (
                  <>
                    <p className="text-[9px] uppercase font-sans text-gray-600">
                      {currentScenario.type === 'irregular' ? 'Water Surface Elevation (WSE)' : 
                       currentScenario.type === 'gutter' ? (currentScenario.solveFor === 'spread' ? 'Spread (T)' : 'Discharge (Q)') :
                       'Normal Depth (yₙ)'}
                    </p>
                    <p className="text-4xl font-bold">
                      {currentScenario.results ? 
                        Number(
                          currentScenario.type === 'irregular' ? (currentScenario.results.waterSurfaceElevation ?? currentScenario.results.depth) : 
                          currentScenario.type === 'gutter' ? (currentScenario.solveFor === 'spread' ? currentScenario.results.spread : currentScenario.results.discharge) :
                          currentScenario.results.depth
                        ).toFixed(currentScenario.type === 'gutter' && currentScenario.solveFor === 'discharge' ? 2 : precision.depth) 
                        : '0.00'} 
                      <span className="text-lg font-normal text-gray-500">
                        {currentScenario.type === 'gutter' && currentScenario.solveFor === 'discharge' ? 
                          (currentScenario.units === 'metric' ? 'm³/s' : 'ft³/s') : 
                          (currentScenario.units === 'metric' ? 'm' : 'ft')}
                      </span>
                    </p>
                    {currentScenario.type === 'gutter' && (
                      <p className="mt-1 text-[10px] font-sans text-gray-500 uppercase tracking-tight">
                        {currentScenario.solveFor === 'spread' ? 
                          `Discharge: ${currentScenario.discharge} ${currentScenario.units === 'metric' ? 'm³/s' : 'ft³/s'}` : 
                          `Spread: ${currentScenario.spread} ${currentScenario.units === 'metric' ? 'm' : 'ft'}`}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] font-sans font-bold uppercase tracking-widest">Regime: {currentScenario.results?.flow_regime}</p>
                  </>
                ) : (
                  <>
                    <p className="text-[9px] uppercase font-sans text-gray-600">Efficiency</p>
                    <p className="text-4xl font-bold">
                      {currentScenario.results ? currentScenario.results.efficiency_percent.toFixed(1) : '0.0'} 
                      <span className="text-lg font-normal text-gray-500">%</span>
                    </p>
                    <p className="mt-1 text-[10px] font-sans font-bold uppercase tracking-widest">
                      Intercepted: {currentScenario.results?.intercepted_flow_cfs.toFixed(2)} cfs
                    </p>
                  </>
                )}
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2 font-sans">
            <section>
              <h3 className="text-[10px] font-bold uppercase border-b border-black mb-3 pb-1">Analysis Properties</h3>
              <table className="w-full text-xs">
                <tbody>
                  {currentScenario.kind === 'channel' ? (
                    <>
                      <PrintTableRow label="Flow Area (A)" value={currentScenario.results ? Number(currentScenario.results.area).toFixed(precision.area) : '0.00'} unit={currentScenario.units === 'metric' ? 'm²' : 'ft²'} />
                      <PrintTableRow label="Wetted Perimeter (P)" value={currentScenario.results ? Number(currentScenario.results.wetted_perimeter).toFixed(precision.perimeter) : '0.00'} unit={currentScenario.units === 'metric' ? 'm' : 'ft'} />
                      <PrintTableRow label="Hydraulic Radius (R)" value={currentScenario.results ? Number(currentScenario.results.hydraulic_radius).toFixed(precision.radius) : '0.00'} unit={currentScenario.units === 'metric' ? 'm' : 'ft'} />
                      {currentScenario.type === 'gutter' && (
                        <>
                          <PrintTableRow label="Spread (T)" value={currentScenario.results ? Number(currentScenario.results.spread).toFixed(precision.depth) : '0.00'} unit={currentScenario.units === 'metric' ? 'm' : 'ft'} />
                          <PrintTableRow label="Gutter Depression" value={currentScenario.results ? Number(currentScenario.results.gutter_depression).toFixed(precision.depth) : '0.00'} unit={currentScenario.units === 'metric' ? 'm' : 'ft'} />
                          <PrintTableRow label="Depth at Curb" value={currentScenario.results ? Number(currentScenario.results.depth).toFixed(precision.depth) : '0.00'} unit={currentScenario.units === 'metric' ? 'm' : 'ft'} />
                        </>
                      )}
                      <PrintTableRow label="Top Width (T)" value={currentScenario.results ? Number(currentScenario.results.top_width).toFixed(precision.topWidth) : '0.00'} unit={currentScenario.units === 'metric' ? 'm' : 'ft'} />
                      <PrintTableRow label="Crit. Depth (yc)" value={currentScenario.results ? Number(currentScenario.results.critical_depth).toFixed(precision.criticalDepth) : '0.00'} unit={currentScenario.units === 'metric' ? 'm' : 'ft'} />
                      <PrintTableRow label="Crit. Slope (Sc)" value={currentScenario.results ? Number(currentScenario.results.critical_slope).toFixed(precision.criticalSlope) : '0.0000'} unit={currentScenario.units === 'metric' ? 'm/m' : 'ft/ft'} />
                      <PrintTableRow label="Velocity (V)" value={currentScenario.results ? Number(currentScenario.results.velocity).toFixed(precision.velocity) : '0.00'} unit={currentScenario.units === 'metric' ? 'm/s' : 'ft/s'} />
                      <PrintTableRow label="Vel. Head (hv)" value={currentScenario.results ? Number(currentScenario.results.velocity_head).toFixed(precision.velocityHead) : '0.000'} unit={currentScenario.units === 'metric' ? 'm' : 'ft'} />
                      <PrintTableRow label="Spec. Energy (E)" value={currentScenario.results ? Number(currentScenario.results.specific_energy).toFixed(precision.specificEnergy) : '0.00'} unit={currentScenario.units === 'metric' ? 'm' : 'ft'} />
                      <PrintTableRow label="Froude (Fr)" value={currentScenario.results ? Number(currentScenario.results.froude_number).toFixed(precision.froude) : '0.000'} unit="—" />
                    </>
                  ) : (
                    <>
                      <PrintTableRow label="Bypass Flow" value={currentScenario.results?.bypass_flow_cfs.toFixed(2)} unit="cfs" />
                      <PrintTableRow label="Spread" value={currentScenario.results?.spread_ft.toFixed(1)} unit="ft" />
                      <PrintTableRow label="Depth" value={currentScenario.results?.depth_ft.toFixed(2)} unit="ft" />
                      <PrintTableRow label="Velocity" value={currentScenario.results?.velocity_fps.toFixed(2)} unit="ft/s" />
                      <PrintTableRow label="Gutter Depression" value={currentScenario.results?.gutter_depression_in.toFixed(1)} unit="in" />
                      <PrintTableRow label="Total Depression" value={currentScenario.results?.total_depression_in.toFixed(1)} unit="in" />
                    </>
                  )}
                </tbody>
              </table>
            </section>
            <div className="flex flex-col gap-6">
              <section className="flex items-center justify-center p-2 border border-gray-100 min-h-[160px]">
                <ChannelPlot 
                  type={currentScenario.type} 
                  width={currentScenario.type === 'gutter' ? currentScenario.gutterWidth : currentScenario.width} 
                  zL={currentScenario.type === 'gutter' ? currentScenario.gutterCrossSlope : currentScenario.leftSideSlope} 
                  zR={currentScenario.type === 'gutter' ? currentScenario.roadCrossSlope : currentScenario.rightSideSlope} 
                  depth={currentScenario.results?.depth || 1} 
                  points={currentScenario.irregularPoints}
                  mode="print" 
                />
              </section>
              
              {currentScenario.notes && (
                <section>
                  <h3 className="text-[10px] font-sans font-bold uppercase border-b border-black mb-2 pb-1">Notes</h3>
                  <div className="p-3 border border-gray-200 bg-gray-50 text-[11px] whitespace-pre-wrap leading-relaxed break-words overflow-hidden font-sans">
                    {currentScenario.notes}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
