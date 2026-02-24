import React, { useState, useEffect } from 'react';
import { generateAbletonGuideStream } from './services/geminiService';
import { Button } from './components/Button';
import { OutputDisplay } from './components/OutputDisplay';
import { WorkflowPreset } from './types';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  // Arrangement Architect State
  const [arrangeGenre, setArrangeGenre] = useState<string>('Techno');
  const [arrangeStructure, setArrangeStructure] = useState<string>('Club Extended');
  const [arrangeEnergy, setArrangeEnergy] = useState<string>('Peak Time');
  const [arrangeTransitionIntensity, setArrangeTransitionIntensity] = useState<string>('Medium');
  
  // New Advanced Options
  const [arrangeKey, setArrangeKey] = useState<string>('F');
  const [arrangeScale, setArrangeScale] = useState<string>('Minor');
  const [arrangeTempoMin, setArrangeTempoMin] = useState<number>(128);
  const [arrangeTempoMax, setArrangeTempoMax] = useState<number>(132);
  const [arrangeMood, setArrangeMood] = useState<string>('Hypnotic & Driving');

  // Variations State
  const [arrangeVarIntro, setArrangeVarIntro] = useState<boolean>(false);
  const [arrangeVarBreakdown, setArrangeVarBreakdown] = useState<boolean>(false);
  const [arrangeVarDrop, setArrangeVarDrop] = useState<boolean>(false);
  const [arrangeVarOutro, setArrangeVarOutro] = useState<boolean>(false);

  // Preset Management
  const [presets, setPresets] = useState<WorkflowPreset[]>(() => {
    const saved = localStorage.getItem('ableton_architect_presets');
    return saved ? JSON.parse(saved) : [];
  });
  const [presetName, setPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);

  const savePreset = () => {
    if (!presetName.trim()) return;
    const newPreset: WorkflowPreset = {
      id: Date.now().toString(),
      name: presetName,
      genre: arrangeGenre,
      structure: arrangeStructure,
      energy: arrangeEnergy,
      transitionIntensity: arrangeTransitionIntensity,
      key: arrangeKey,
      scale: arrangeScale,
      tempoMin: arrangeTempoMin,
      tempoMax: arrangeTempoMax,
      mood: arrangeMood,
      variations: {
        intro: arrangeVarIntro,
        breakdown: arrangeVarBreakdown,
        drop: arrangeVarDrop,
        outro: arrangeVarOutro
      },
      createdAt: Date.now()
    };
    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem('ableton_architect_presets', JSON.stringify(updatedPresets));
    setPresetName('');
    setShowSavePreset(false);
  };

  const loadPreset = (preset: WorkflowPreset) => {
    setArrangeGenre(preset.genre);
    setArrangeStructure(preset.structure);
    setArrangeEnergy(preset.energy);
    setArrangeTransitionIntensity(preset.transitionIntensity);
    setArrangeKey(preset.key);
    setArrangeScale(preset.scale);
    setArrangeTempoMin(preset.tempoMin);
    setArrangeTempoMax(preset.tempoMax);
    setArrangeMood(preset.mood);
    setArrangeVarIntro(preset.variations.intro);
    setArrangeVarBreakdown(preset.variations.breakdown);
    setArrangeVarDrop(preset.variations.drop);
    setArrangeVarOutro(preset.variations.outro);
  };

  const deletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    localStorage.setItem('ableton_architect_presets', JSON.stringify(updated));
  };

  const handleGenerate = async (promptText: string) => {
    setIsLoading(true);
    setIsStreaming(true);
    setResponse('');
    
    try {
      await generateAbletonGuideStream(promptText, null, (chunk) => {
        setResponse((prev) => prev + chunk);
      });
    } catch (error) {
      console.error('Generation failed:', error);
      setResponse('An error occurred while generating the content. Please check your API key and try again.');
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const scales = ['Major', 'Minor', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Locrian'];

  return (
    <div className="min-h-screen bg-ableton-base text-ableton-text font-sans selection:bg-ableton-accent selection:text-white flex flex-col">
      {/* Header */}
      <header className="bg-ableton-surface border-b border-ableton-border h-16 flex items-center px-6 justify-between sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-ableton-accent to-red-600 rounded-lg shadow-glow flex items-center justify-center">
             <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
             </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">LiveWire <span className="text-ableton-muted font-normal">Architect</span></h1>
          </div>
        </div>
        <div className="text-xs font-mono text-ableton-muted bg-ableton-panel px-2 py-1 rounded border border-ableton-border">
          v2.0.0 • Gemini 2.0 Flash
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          
          {/* Sidebar / Tools Panel */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Control Card */}
            <div className="bg-ableton-surface border border-ableton-border rounded-xl overflow-hidden shadow-lg">
                 <div className="bg-ableton-panel px-4 py-3 border-b border-ableton-border flex justify-between items-center">
                    <h3 className="text-xs font-bold text-ableton-text uppercase tracking-widest">Configuration</h3>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShowSavePreset(!showSavePreset)}
                            className="text-[10px] uppercase tracking-wider text-ableton-accent hover:text-white transition-colors"
                        >
                            {showSavePreset ? 'Cancel' : 'Save Preset'}
                        </button>
                        <div className="w-2 h-2 rounded-full bg-ableton-success shadow-[0_0_5px_rgba(0,255,153,0.5)]"></div>
                    </div>
                 </div>
                 
                 <div className="p-5 space-y-5">
                    
                    {/* Preset Saver */}
                    {showSavePreset && (
                        <div className="bg-ableton-base p-3 rounded border border-ableton-border space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="text-[10px] font-bold text-ableton-muted uppercase tracking-wider">Save Current Workflow</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={presetName}
                                    onChange={(e) => setPresetName(e.target.value)}
                                    placeholder="Preset Name..."
                                    className="flex-1 bg-ableton-surface border border-ableton-border rounded p-1.5 text-xs text-ableton-text focus:outline-none focus:border-ableton-accent"
                                />
                                <button 
                                    onClick={savePreset}
                                    className="bg-ableton-accent text-white px-3 py-1 rounded text-xs uppercase font-bold hover:bg-ableton-accent-hover"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Preset Loader */}
                    {presets.length > 0 && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-ableton-muted uppercase tracking-wider">Load Preset</label>
                            <div className="flex flex-wrap gap-2">
                                {presets.map(preset => (
                                    <div key={preset.id} className="group flex items-center bg-ableton-base border border-ableton-border rounded overflow-hidden hover:border-ableton-muted transition-colors cursor-pointer">
                                        <span 
                                            onClick={() => loadPreset(preset)}
                                            className="px-2 py-1 text-xs text-ableton-text hover:text-white transition-colors"
                                        >
                                            {preset.name}
                                        </span>
                                        <button 
                                            onClick={(e) => deletePreset(preset.id, e)}
                                            className="px-1.5 py-1 text-ableton-muted hover:text-red-500 hover:bg-ableton-surface border-l border-ableton-border transition-colors"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Core Settings */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold text-ableton-muted uppercase tracking-wider">Genre</label>
                           <select value={arrangeGenre} onChange={(e) => setArrangeGenre(e.target.value)} className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-xs text-ableton-text focus:outline-none focus:border-ableton-accent transition-colors">
                              <option value="Techno">Techno</option>
                              <option value="House">House</option>
                              <option value="DnB">Drum & Bass</option>
                              <option value="Trance">Trance</option>
                              <option value="Dubstep">Dubstep</option>
                              <option value="HipHop">Hip Hop / Trap</option>
                              <option value="Lo-Fi">Lo-Fi / Chill</option>
                              <option value="Ambient">Ambient</option>
                              <option value="Pop">Pop / Structure</option>
                           </select>
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold text-ableton-muted uppercase tracking-wider">Structure</label>
                           <select value={arrangeStructure} onChange={(e) => setArrangeStructure(e.target.value)} className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-xs text-ableton-text focus:outline-none focus:border-ableton-accent transition-colors">
                              <option value="Club Extended">Club Extended</option>
                              <option value="Radio Edit">Radio Edit</option>
                              <option value="Progressive">Progressive</option>
                              <option value="Streaming">Streaming Opt.</option>
                              <option value="Live Performance">Live Set</option>
                           </select>
                        </div>
                    </div>

                    {/* Musical Context */}
                    <div className="space-y-3 pt-4 border-t border-ableton-border/50">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-ableton-muted uppercase tracking-wider">Musical Context</label>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                             <select value={arrangeKey} onChange={(e) => setArrangeKey(e.target.value)} className="col-span-1 bg-ableton-base border border-ableton-border rounded p-2 text-xs text-ableton-text focus:outline-none focus:border-ableton-accent">
                                {keys.map(k => <option key={k} value={k}>{k}</option>)}
                             </select>
                             <select value={arrangeScale} onChange={(e) => setArrangeScale(e.target.value)} className="col-span-2 bg-ableton-base border border-ableton-border rounded p-2 text-xs text-ableton-text focus:outline-none focus:border-ableton-accent">
                                {scales.map(s => <option key={s} value={s}>{s}</option>)}
                             </select>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] text-ableton-muted">
                                <span>Tempo Range</span>
                                <span className="font-mono text-ableton-accent">{arrangeTempoMin} - {arrangeTempoMax} BPM</span>
                            </div>
                            <div className="flex gap-4 items-center">
                                <input 
                                    type="range" 
                                    min="60" max="200" 
                                    value={arrangeTempoMin} 
                                    onChange={(e) => setArrangeTempoMin(Number(e.target.value))}
                                    className="w-full h-1 bg-ableton-border rounded-lg appearance-none cursor-pointer"
                                />
                                <input 
                                    type="range" 
                                    min="60" max="200" 
                                    value={arrangeTempoMax} 
                                    onChange={(e) => setArrangeTempoMax(Number(e.target.value))}
                                    className="w-full h-1 bg-ableton-border rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold text-ableton-muted uppercase tracking-wider">Mood / Vibe</label>
                           <input 
                                type="text" 
                                value={arrangeMood} 
                                onChange={(e) => setArrangeMood(e.target.value)}
                                className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-xs text-ableton-text focus:outline-none focus:border-ableton-accent placeholder-ableton-muted/50"
                                placeholder="e.g. Dark, Ethereal, Aggressive..."
                           />
                        </div>
                    </div>

                    {/* Dynamics */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-ableton-border/50">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold text-ableton-muted uppercase tracking-wider">Energy</label>
                           <select value={arrangeEnergy} onChange={(e) => setArrangeEnergy(e.target.value)} className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-xs text-ableton-text focus:outline-none focus:border-ableton-accent">
                              <option value="Peak Time">Peak Time</option>
                              <option value="Deep">Deep / Hypnotic</option>
                              <option value="Radio">Radio Friendly</option>
                              <option value="Rollercoaster">Dynamic</option>
                           </select>
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold text-ableton-muted uppercase tracking-wider">Transitions</label>
                           <select value={arrangeTransitionIntensity} onChange={(e) => setArrangeTransitionIntensity(e.target.value)} className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-xs text-ableton-text focus:outline-none focus:border-ableton-accent">
                              <option value="Subtle">Subtle</option>
                              <option value="Medium">Medium</option>
                              <option value="High">High Impact</option>
                           </select>
                        </div>
                    </div>
                    
                    {/* Variations Selection */}
                    <div className="space-y-3 pt-4 border-t border-ableton-border/50">
                        <label className="text-[10px] font-bold text-ableton-muted uppercase tracking-wider">Variations</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['Intro', 'Breakdown', 'Drop', 'Outro'].map((section) => {
                                const stateMap: Record<string, [boolean, React.Dispatch<React.SetStateAction<boolean>>]> = {
                                    'Intro': [arrangeVarIntro, setArrangeVarIntro],
                                    'Breakdown': [arrangeVarBreakdown, setArrangeVarBreakdown],
                                    'Drop': [arrangeVarDrop, setArrangeVarDrop],
                                    'Outro': [arrangeVarOutro, setArrangeVarOutro]
                                };
                                const [checked, setChecked] = stateMap[section];
                                
                                return (
                                    <label key={section} className={`flex items-center gap-2 cursor-pointer p-2 rounded border transition-all duration-200 ${checked ? 'bg-ableton-accent/10 border-ableton-accent text-white' : 'bg-ableton-base border-ableton-border text-ableton-muted hover:border-ableton-muted'}`}>
                                        <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${checked ? 'bg-ableton-accent border-ableton-accent' : 'border-ableton-muted'}`}>
                                            {checked && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="hidden" />
                                        <span className="text-[10px] font-medium uppercase tracking-wide">{section}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <Button 
                        className="w-full py-3 mt-2 shadow-glow hover:shadow-glow-blue transition-shadow duration-300"
                        isLoading={isLoading}
                        onClick={() => {
                            const vars = [];
                            if (arrangeVarIntro) vars.push("Intro (e.g. rhythmic start vs atmospheric)");
                            if (arrangeVarBreakdown) vars.push("Breakdown (e.g. harmonic shift vs stripping back)");
                            if (arrangeVarDrop) vars.push("Drop/Chorus (e.g. variation in energy or rhythm)");
                            if (arrangeVarOutro) vars.push("Outro (e.g. abrupt stop vs long fade)");
                            
                            const varInstruction = vars.length > 0 
                                ? `\n\n**Requested Variations**: Provide alternative arrangement ideas for the following sections:\n- ${vars.join('\n- ')}` 
                                : "";

                            let transitionFocus = "";
                            switch(arrangeGenre) {
                                case 'Techno': transitionFocus = "Focus on tension-building transitions like white noise risers, filtered rumble kicks, and snare rolls."; break;
                                case 'House': transitionFocus = "Suggest transitions using reverse cymbals, filter sweeps on the master bus, and classic drum fills."; break;
                                case 'DnB': transitionFocus = "Emphasize rapid breakbeat edits, silence gaps, and heavy impact FX."; break;
                                case 'Trance': transitionFocus = "Use long white noise sweeps, filter opening on supersaws, and snare rolls building to a climax."; break;
                                case 'Dubstep': transitionFocus = "Build tension with pitch risers and silence right before the drop. Heavy impact FX on the one."; break;
                                case 'HipHop': transitionFocus = "Focus on beat drop-outs, vocal tags, and tape stop effects."; break;
                                case 'Lo-Fi': transitionFocus = "Use vinyl spin-backs, tape stops, and foley textures (rain, keys) to transition."; break;
                                case 'Ambient': transitionFocus = "Use slow reverb swells, delay feedback loops, and crossfading textures."; break;
                                case 'Pop': transitionFocus = "Include standard pop transitions: reverse crashes, vocal chops, and clear drum fills."; break;
                                default: transitionFocus = "Include creative transition ideas suitable for the genre.";
                            }

                            const toolPrompt = `Create a complete arrangement structure guide for a ${arrangeGenre} track. 
                            Structure Type: ${arrangeStructure}.
                            Key: ${arrangeKey} ${arrangeScale}.
                            Tempo: ${arrangeTempoMin}-${arrangeTempoMax} BPM.
                            Mood: ${arrangeMood}.
                            Energy Vibe: ${arrangeEnergy}.
                            Transition Intensity: ${arrangeTransitionIntensity}.

                            Please provide:
                            1. **Structural Table**: Create a clear table with columns: [Section Name | Bar Count | Key Elements | Energy (1-10)].
                            2. **Transition Strategy**: Describe specific automation moves (e.g., "Filter Cutoff 200Hz -> 20kHz") or FX fills for ${arrangeTransitionIntensity} intensity transitions between major sections.
                            **IMPORTANT**: Suggest specific Ableton Live devices (e.g., Auto Filter, Echo, Hybrid Reverb, Redux) and their parameter automation for these transitions.
                            3. **Element Entry/Exit**: Timeline of when to bring specific elements in or out.
                            **Transition Style**: ${transitionFocus}${varInstruction}`;
                            setPrompt(toolPrompt);
                            handleGenerate(toolPrompt);
                        }}
                    >
                        Generate Arrangement
                    </Button>
                 </div>
            </div>
            
          </div>

          {/* Main Output Panel */}
          <div className="lg:col-span-8 h-full flex flex-col">
             <OutputDisplay content={response} isStreaming={isStreaming} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
