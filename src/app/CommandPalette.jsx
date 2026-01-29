import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  FileText, 
  Printer, 
  Settings2, 
  Box, 
  Layers, 
  Triangle, 
  Table as TableIcon, 
  Calculator,
  Search,
  Command
} from 'lucide-react';

const CommandPalette = ({ isOpen, onClose, actions }) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const filteredActions = actions.filter(action => 
    action.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredActions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredActions.length) % filteredActions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredActions[selectedIndex]) {
          filteredActions[selectedIndex].run();
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredActions, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-[#1a1a1a] border border-[#333] w-full max-w-xl rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 border-b border-[#333] bg-[#1a1a1a]">
          <Search size={18} className="text-[#525252]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="What would you like to do?"
            className="flex-1 bg-transparent border-none text-sm text-white h-14 px-3 focus:outline-none placeholder-[#525252]"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#121212] border border-[#333] rounded text-[10px] text-[#525252]">
            <kbd className="font-sans">ESC</kbd>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto p-2 bg-[#1a1a1a]">
          {filteredActions.length > 0 ? (
            filteredActions.map((action, idx) => (
              <div
                key={action.id}
                onClick={() => {
                  action.run();
                  onClose();
                }}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors ${
                  idx === selectedIndex ? 'bg-[#232323] text-white' : 'text-[#a3a3a3] hover:bg-[#1f1f1f] hover:text-[#d4d4d4]'
                }`}
              >
                <div className={`p-2 rounded-md ${idx === selectedIndex ? 'bg-[#333] text-white' : 'bg-[#121212] text-[#525252]'}`}>
                  {action.icon}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{action.label}</div>
                  {action.description && (
                    <div className="text-[10px] text-[#525252] uppercase tracking-wider">{action.description}</div>
                  )}
                </div>
                {idx === selectedIndex && (
                  <div className="text-[10px] text-[#525252] flex items-center gap-1">
                    <span>Select</span>
                    <kbd className="px-1.5 py-0.5 bg-[#121212] border border-[#333] rounded">↵</kbd>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-[#525252]">
              <div className="text-sm mb-1">No results for "{search}"</div>
              <div className="text-[10px] uppercase tracking-widest">Try another search term</div>
            </div>
          )}
        </div>
        
        <div className="px-4 py-3 bg-[#121212] border-t border-[#333] flex justify-between items-center">
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5 text-[10px] text-[#525252]">
              <kbd className="px-1.5 py-0.5 bg-[#1a1a1a] border border-[#333] rounded">↑↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[#525252]">
              <kbd className="px-1.5 py-0.5 bg-[#1a1a1a] border border-[#333] rounded">↵</kbd>
              <span>Execute</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#525252]">
             <Command size={10} />
             <span>Actions</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
