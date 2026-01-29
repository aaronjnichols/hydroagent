import React, { useEffect, useState } from 'react';

const API_BASE = 'http://127.0.0.1:8000/api';

const numberOrZero = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return Number(value).toFixed(decimals);
};

const InputField = ({ label, name, value, onChange, unit }) => (
  <div className="flex flex-col space-y-1.5">
    <label className="text-[10px] uppercase tracking-widest text-[#737373] flex justify-between">
      {label} <span className="text-[#404040] lowercase">{unit}</span>
    </label>
    <input
      type="number"
      step="any"
      name={name}
      value={value}
      onChange={onChange}
      className="bg-[#121212] border border-[#333] rounded px-3 py-2 text-sm text-[#e5e5e5] focus:outline-none focus:border-[#525252]"
    />
  </div>
);

const ResultField = ({ label, value, unit, highlight = false }) => (
  <div className={`bg-[#121212] border ${highlight ? 'border-yellow-500/40' : 'border-[#333]'} rounded px-3 py-2`}>
    <div className="text-[10px] uppercase tracking-widest text-[#737373] flex justify-between">
      <span>{label}</span>
      <span className="text-[#404040] lowercase">{unit}</span>
    </div>
    <div className={`text-sm ${highlight ? 'text-yellow-200' : 'text-[#e5e5e5]'}`}>
      {value}
    </div>
  </div>
);

const CurbInletOnGrade = ({ scenario, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('gutter');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onUpdate({ [name]: numberOrZero(value) });
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsCalculating(true);
      try {
        const response = await fetch(`${API_BASE}/curb-inlets/on-grade/solve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            discharge_cfs: scenario.discharge,
            longitudinal_slope: scenario.slope,
            gutter_width_ft: scenario.gutterWidth,
            gutter_cross_slope: scenario.gutterCrossSlope,
            road_cross_slope: scenario.roadCrossSlope,
            mannings_n: scenario.manningsN,
            curb_opening_length_ft: scenario.curbOpeningLength,
            local_depression_depth_in: scenario.localDepressionDepth,
            local_depression_width_in: scenario.localDepressionWidth
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || 'Calculation failed');
        }

        const data = await response.json();
        setResults(data);
        onUpdate({ results: data }); // Report results back to parent
        setError(null);
      } catch (e) {
        setError(e.message);
        setResults(null);
      } finally {
        setIsCalculating(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [scenario]);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-6">
        <div className="bg-[#141414] border border-[#2e2e2e] rounded-md p-5">
          <div className="flex mb-5 bg-[#1a1a1a] border border-[#2e2e2e] rounded p-1">
            <button
              onClick={() => setActiveTab('curb')}
              className={`flex-1 text-[10px] uppercase tracking-widest py-2 rounded ${activeTab === 'curb' ? 'bg-white/10 text-white' : 'text-[#525252] hover:text-[#737373]'}`}
            >
              Curb
            </button>
            <button
              onClick={() => setActiveTab('gutter')}
              className={`flex-1 text-[10px] uppercase tracking-widest py-2 rounded ${activeTab === 'gutter' ? 'bg-white/10 text-white' : 'text-[#525252] hover:text-[#737373]'}`}
            >
              Gutter
            </button>
          </div>

          {activeTab === 'curb' && (
            <div className="space-y-4">
              <ResultField
                label="Efficiency"
                unit="%"
                value={results ? formatNumber(results.efficiency_percent, 2) : '—'}
                highlight
              />
              <InputField
                label="Curb Opening Length"
                name="curbOpeningLength"
                value={scenario.curbOpeningLength}
                onChange={handleInputChange}
                unit="ft"
              />
              <InputField
                label="Local Depression"
                name="localDepressionDepth"
                value={scenario.localDepressionDepth}
                onChange={handleInputChange}
                unit="in"
              />
              <InputField
                label="Local Depression Width"
                name="localDepressionWidth"
                value={scenario.localDepressionWidth}
                onChange={handleInputChange}
                unit="in"
              />
            </div>
          )}

          {activeTab === 'gutter' && (
            <div className="space-y-4">
              <InputField label="Discharge" name="discharge" value={scenario.discharge} onChange={handleInputChange} unit="cfs" />
              <InputField label="Slope" name="slope" value={scenario.slope} onChange={handleInputChange} unit="ft/ft" />
              <InputField label="Gutter Width" name="gutterWidth" value={scenario.gutterWidth} onChange={handleInputChange} unit="ft" />
              <InputField label="Gutter Cross Slope" name="gutterCrossSlope" value={scenario.gutterCrossSlope} onChange={handleInputChange} unit="ft/ft" />
              <InputField label="Road Cross Slope" name="roadCrossSlope" value={scenario.roadCrossSlope} onChange={handleInputChange} unit="ft/ft" />
              <InputField label="Roughness Coefficient" name="manningsN" value={scenario.manningsN} onChange={handleInputChange} unit="—" />
            </div>
          )}
          {error && (
            <div className="mt-5 text-[10px] uppercase tracking-widest text-red-400 bg-red-950/20 border border-red-900/30 rounded p-3">
              {error}
            </div>
          )}
          <div className={`mt-4 text-center text-[10px] uppercase tracking-widest text-[#525252] transition-opacity duration-200 ${isCalculating ? 'opacity-100' : 'opacity-0'}`}>
            Calculating...
          </div>
        </div>

        <div className="bg-[#141414] border border-[#2e2e2e] rounded-md p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultField label="Intercepted Flow" unit="cfs" value={formatNumber(results?.intercepted_flow_cfs, 2)} />
            <ResultField label="Bypass Flow" unit="cfs" value={formatNumber(results?.bypass_flow_cfs, 2)} />
            <ResultField label="Spread" unit="ft" value={formatNumber(results?.spread_ft, 1)} />
            <ResultField label="Depth" unit="ft" value={formatNumber(results?.depth_ft, 2)} />
            <ResultField label="Flow Area" unit="ft²" value={formatNumber(results?.flow_area_ft2, 1)} />
            <ResultField label="Gutter Depression" unit="in" value={formatNumber(results?.gutter_depression_in, 1)} />
            <ResultField label="Total Depression" unit="in" value={formatNumber(results?.total_depression_in, 1)} />
            <ResultField label="Velocity" unit="ft/s" value={formatNumber(results?.velocity_fps, 2)} />
            <ResultField label="Equivalent Cross Slope" unit="ft/ft" value={formatNumber(results?.equivalent_cross_slope, 3)} />
            <ResultField label="Length Factor" unit="—" value={formatNumber(results?.length_factor, 3)} />
            <ResultField label="Total Interception Length" unit="ft" value={formatNumber(results?.total_interception_length_ft, 1)} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurbInletOnGrade;
