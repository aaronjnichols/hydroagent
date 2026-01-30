import React, { useState, useEffect } from 'react';
import { 
  Settings2, 
  ChevronDown, 
  HelpCircle,
  AlertCircle,
  Activity
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api';

const PressurePipeCalculator = ({ scenario, onUpdate, precision, handlePrecisionChange }) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState(null);

  const solveForOptions = [
    { value: 'discharge', label: 'Discharge' },
    { value: 'diameter', label: 'Diameter' },
    { value: 'length', label: 'Length' },
    { value: 'roughness', label: 'Roughness' },
    { value: 'pressure_1', label: 'Pressure at Node 1' },
    { value: 'pressure_2', label: 'Pressure at Node 2' },
    { value: 'elevation_1', label: 'Elevation at Node 1' },
    { value: 'elevation_2', label: 'Elevation at Node 2' },
  ];

  const frictionMethods = [
    { value: 'manning', label: 'Manning' },
    { value: 'kutter', label: 'Kutter' },
    { value: 'darcy_weisbach', label: 'Darcy-Weisbach' },
    { value: 'hazen_williams', label: 'Hazen-Williams' },
  ];

  const calculate = async () => {
    setIsCalculating(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/pressure-pipes/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solve_for: scenario.solveFor,
          friction_method: scenario.frictionMethod,
          discharge: scenario.discharge,
          diameter: scenario.diameter,
          length: scenario.length,
          pressure_1: scenario.pressure1,
          elevation_1: scenario.elevation1,
          pressure_2: scenario.pressure2,
          elevation_2: scenario.elevation2,
          roughness: scenario.roughness,
          roughness_height: scenario.roughnessHeight,
          kinematic_viscosity: scenario.kinematicViscosity,
          specific_weight: scenario.specificWeight,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Calculation failed');
      }

      const results = await response.json();
      onUpdate({ results });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      calculate();
    }, 500);
    return () => clearTimeout(timer);
  }, [
    scenario.solveFor,
    scenario.frictionMethod,
    scenario.discharge,
    scenario.diameter,
    scenario.length,
    scenario.pressure1,
    scenario.elevation1,
    scenario.pressure2,
    scenario.elevation2,
    scenario.roughness,
    scenario.roughnessHeight,
    scenario.kinematicViscosity,
    scenario.specificWeight,
  ]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onUpdate({ [name]: name === 'solveFor' || name === 'frictionMethod' ? value : parseFloat(value) || 0 });
  };

  const results = scenario.results;

  const InputField = ({ label, name, value, unit, disabled }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] uppercase tracking-widest text-[#525252] font-bold px-1 flex justify-between">
        {label}
        <span className="text-[#404040] font-normal">{unit}</span>
      </label>
      <input
        type="number"
        name={name}
        value={value ?? ''}
        onChange={handleInputChange}
        disabled={disabled}
        className={`bg-[#1a1a1a] border ${disabled ? 'border-[#262626] text-[#404040]' : 'border-[#333] text-white focus:border-[#525252]'} rounded p-2 text-sm focus:outline-none transition-colors`}
      />
    </div>
  );

  const ResultRow = ({ label, value, unit, precisionKey }) => (
    <div className="group flex justify-between items-center py-2 border-b border-[#1a1a1a] last:border-0">
      <span className="text-[11px] text-[#737373] uppercase tracking-tight">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[#e5e5e5]">
          {value !== undefined && value !== null ? Number(value).toFixed(precision[precisionKey] || 2) : '—'}
        </span>
        <span className="text-[10px] text-[#404040] w-8">{unit}</span>
        {precisionKey && (
          <button 
            onClick={(e) => handlePrecisionChange(precisionKey, e)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:text-white text-[#404040] transition-all"
          >
            <Settings2 size={12} />
          </button>
        )}
      </div>
    </div>
  );

  const getRoughnessLabel = () => {
    switch (scenario.frictionMethod) {
      case 'manning': return "Manning's n";
      case 'kutter': return "Kutter's n";
      case 'hazen_williams': return "Hazen-Williams C";
      case 'darcy_weisbach': return "Roughness Height";
      default: return "Roughness";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
      {/* Inputs Column */}
      <div className="md:col-span-5 space-y-6">
        <section className="bg-[#0f0f0f] border border-[#232323] rounded-md p-4 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#525252] px-1">Solve For</label>
            <div className="relative">
              <select
                name="solveFor"
                value={scenario.solveFor}
                onChange={handleInputChange}
                className="w-full bg-[#1a1a1a] border border-[#333] text-white rounded p-2 text-sm appearance-none focus:outline-none focus:border-[#525252] cursor-pointer"
              >
                {solveForOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#525252] pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#525252] px-1">Friction Method</label>
            <div className="relative">
              <select
                name="frictionMethod"
                value={scenario.frictionMethod}
                onChange={handleInputChange}
                className="w-full bg-[#1a1a1a] border border-[#333] text-white rounded p-2 text-sm appearance-none focus:outline-none focus:border-[#525252] cursor-pointer"
              >
                {frictionMethods.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#525252] pointer-events-none" />
            </div>
          </div>
        </section>

        <section className="bg-[#0f0f0f] border border-[#232323] rounded-md p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Discharge" name="discharge" value={scenario.discharge} unit="cfs" disabled={scenario.solveFor === 'discharge'} />
            <InputField label="Diameter" name="diameter" value={scenario.diameter} unit="in" disabled={scenario.solveFor === 'diameter'} />
          </div>
          <InputField label="Length" name="length" value={scenario.length} unit="ft" disabled={scenario.solveFor === 'length'} />
          
          <div className="pt-2 border-t border-[#1a1a1a] space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Pressure 1" name="pressure1" value={scenario.pressure1} unit="psi" disabled={scenario.solveFor === 'pressure_1'} />
              <InputField label="Elevation 1" name="elevation1" value={scenario.elevation1} unit="ft" disabled={scenario.solveFor === 'elevation_1'} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Pressure 2" name="pressure2" value={scenario.pressure2} unit="psi" disabled={scenario.solveFor === 'pressure_2'} />
              <InputField label="Elevation 2" name="elevation2" value={scenario.elevation2} unit="ft" disabled={scenario.solveFor === 'elevation_2'} />
            </div>
          </div>

          <div className="pt-2 border-t border-[#1a1a1a]">
            {scenario.frictionMethod === 'darcy_weisbach' ? (
              <div className="space-y-4">
                <InputField label="Roughness Height" name="roughnessHeight" value={scenario.roughnessHeight} unit="ft" />
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Kinematic Visc." name="kinematicViscosity" value={scenario.kinematicViscosity} unit="ft²/s" />
                  <InputField label="Spec. Weight" name="specificWeight" value={scenario.specificWeight} unit="lb/ft³" />
                </div>
              </div>
            ) : (
              <InputField label={getRoughnessLabel()} name="roughness" value={scenario.roughness} unit="" disabled={scenario.solveFor === 'roughness'} />
            )}
          </div>
        </section>
      </div>

      {/* Results Column */}
      <div className="md:col-span-7 space-y-6">
        <section className="bg-[#0f0f0f] border border-[#232323] rounded-md overflow-hidden">
          <div className="bg-[#141414] px-4 py-3 border-b border-[#232323] flex justify-between items-center">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#737373]">Analysis Results</h3>
            {isCalculating && <Activity size={14} className="text-blue-500 animate-spin" />}
          </div>
          
          <div className="p-6">
            {error ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded p-4 flex items-start gap-3">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <div className="text-xs text-red-200/80 leading-relaxed">{error}</div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#525252] mb-1 font-bold">
                    {scenario.solveFor === 'discharge' ? 'Calculated Discharge' : 
                     scenario.solveFor === 'diameter' ? 'Calculated Diameter' : 
                     scenario.solveFor === 'length' ? 'Calculated Length' :
                     scenario.solveFor === 'roughness' ? `Calculated ${getRoughnessLabel()}` :
                     scenario.solveFor === 'pressure_1' ? 'Calculated Pressure 1' :
                     scenario.solveFor === 'pressure_2' ? 'Calculated Pressure 2' :
                     scenario.solveFor === 'elevation_1' ? 'Calculated Elevation 1' :
                     'Calculated Elevation 2'}
                  </div>
                  <div className="text-4xl font-light tracking-tight text-white flex items-baseline gap-2">
                    {results ? Number(results[scenario.solveFor.replace('pressure_1', 'pressure_1').replace('pressure_2', 'pressure_2').replace('elevation_1', 'elevation_1').replace('elevation_2', 'elevation_2')]).toFixed(precision.depth || 2) : '0.00'}
                    <span className="text-sm text-[#525252] font-normal uppercase tracking-widest">
                      {scenario.solveFor === 'discharge' ? 'cfs' : 
                       scenario.solveFor === 'diameter' ? 'in' : 
                       scenario.solveFor === 'length' ? 'ft' :
                       scenario.solveFor.includes('pressure') ? 'psi' :
                       scenario.solveFor.includes('elevation') ? 'ft' : ''}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-12 gap-y-2 pt-4 border-t border-[#1a1a1a]">
                  <div className="space-y-1">
                    <ResultRow label="Headloss" value={results?.headloss} unit="ft" precisionKey="depth" />
                    <ResultRow label="Friction Slope" value={results?.friction_slope} unit="ft/ft" precisionKey="criticalSlope" />
                    <ResultRow label="Velocity" value={results?.velocity} unit="ft/s" precisionKey="velocity" />
                    <ResultRow label="Velocity Head" value={results?.velocity_head} unit="ft" precisionKey="velocityHead" />
                  </div>
                  <div className="space-y-1">
                    <ResultRow label="Energy Grade 1" value={results?.energy_grade_1} unit="ft" precisionKey="depth" />
                    <ResultRow label="Energy Grade 2" value={results?.energy_grade_2} unit="ft" precisionKey="depth" />
                    <ResultRow label="Hydraulic Grade 1" value={results?.hydraulic_grade_1} unit="ft" precisionKey="depth" />
                    <ResultRow label="Hydraulic Grade 2" value={results?.hydraulic_grade_2} unit="ft" precisionKey="depth" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-12 gap-y-2 pt-4 border-t border-[#1a1a1a]">
                  <div className="space-y-1">
                    <ResultRow label="Flow Area" value={results?.area} unit="ft²" precisionKey="area" />
                    <ResultRow label="Wetted Perimeter" value={results?.wetted_perimeter} unit="ft" precisionKey="perimeter" />
                  </div>
                  <div className="space-y-1">
                    {scenario.frictionMethod === 'darcy_weisbach' && (
                      <>
                        <ResultRow label="Friction Factor" value={results?.friction_factor} unit="" precisionKey="froude" />
                        <ResultRow label="Reynolds Number" value={results?.reynolds_number} unit="" precisionKey="area" />
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="bg-[#0f0f0f] border border-[#232323] rounded-md p-4">
          <div className="flex items-center gap-2 text-[#525252] mb-3">
            <HelpCircle size={14} />
            <span className="text-[10px] uppercase tracking-widest font-bold">Methodology</span>
          </div>
          <p className="text-[11px] text-[#737373] leading-relaxed">
            Calculates pressure pipe flow using energy balance: E₁ = E₂ + h_f. 
            Energy Grade E = Z + P/γ + V²/2g. Hydraulic Grade HGL = Z + P/γ.
            Friction loss h_f is computed using the selected method (Manning, Kutter, Hazen-Williams, or Darcy-Weisbach).
          </p>
        </section>
      </div>
    </div>
  );
};

export default PressurePipeCalculator;
