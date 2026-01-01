import React, { useState, useRef, useEffect } from 'react';
import { generateAbletonGuideStream, transcribeAudio, editImage } from './services/geminiService';
import { Button } from './components/Button';
import { OutputDisplay } from './components/OutputDisplay';
import { Switch } from './components/Switch';
import { ChatMessage, Theme, SavedTemplate, UserPreferences, CustomTheme } from './types';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [lastPrompt, setLastPrompt] = useState(''); // Store last prompt for regeneration modifiers
  const [isGenerating, setIsGenerating] = useState(false);
  const [response, setResponse] = useState('');
  const [responseImage, setResponseImage] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Feature states
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
        return (localStorage.getItem('ableton-theme') as Theme) || 'dark';
    }
    return 'dark';
  });
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>(() => {
    try {
        const saved = localStorage.getItem('ableton-custom-themes');
        return saved ? JSON.parse(saved) : [];
    } catch(e) { return [] }
  });
  
  // New Theme Creation State
  const [isCreatingTheme, setIsCreatingTheme] = useState(false);
  const [newThemeDraft, setNewThemeDraft] = useState<CustomTheme['colors']>({
      base: '#1a1a1a',
      surface: '#222222',
      panel: '#2a2a2a',
      border: '#333333',
      text: '#d9d9d9',
      muted: '#9ca3af',
      accent: '#ff764d'
  });
  const [newThemeName, setNewThemeName] = useState('');

  const [activeTab, setActiveTab] = useState<'history' | 'templates' | 'config'>('history');
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Preferences
  const [preferences, setPreferences] = useState<UserPreferences>({
      detailLevel: 'intermediate',
      deviceSuite: 'stock',
      creativity: 'standard',
      os: 'mac',
      liveVersion: '12',
      genre: 'general',
      tone: 'encouraging',
      outputLength: 'balanced',
      
      // Default Granulars
      sentenceComplexity: 5,
      jargonLevel: 5,
      deviceExplanationDepth: 5,
      
      // Default MIDI
      midiComplexity: 5,
      midiMusicality: 8,

      useEmojis: true,
      useAnalogies: true,
      showShortcuts: true,
      format: 'steps',
      includeTroubleshooting: false
  });

  // Template States
  const [templates, setTemplates] = useState<SavedTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('ableton-templates');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('Workflow');

  // Multi-modal state
  const [isRecording, setIsRecording] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // Base64
  const [isEditMode, setIsEditMode] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Apply theme to document and persist
  useEffect(() => {
    if (theme === 'custom') {
       // Look for active custom theme? Logic to store active custom ID would be needed, 
       // but for simplicity, let's assume if it's custom, we load the variables manually
       // This part actually requires knowing WHICH custom theme is active. 
       // For this implementation, selecting a custom theme will simply set the variables directly
       // and set theme state to 'custom'.
    } else {
        document.documentElement.setAttribute('data-theme', theme);
        // Clear custom properties if any
        document.documentElement.style.removeProperty('--color-base');
        document.documentElement.style.removeProperty('--color-surface');
        document.documentElement.style.removeProperty('--color-panel');
        document.documentElement.style.removeProperty('--color-border');
        document.documentElement.style.removeProperty('--color-text');
        document.documentElement.style.removeProperty('--color-muted');
        document.documentElement.style.removeProperty('--color-accent');
    }
    localStorage.setItem('ableton-theme', theme);
  }, [theme]);

  const applyCustomTheme = (customTheme: CustomTheme) => {
    setTheme('custom');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.setProperty('--color-base', customTheme.colors.base);
    document.documentElement.style.setProperty('--color-surface', customTheme.colors.surface);
    document.documentElement.style.setProperty('--color-panel', customTheme.colors.panel);
    document.documentElement.style.setProperty('--color-border', customTheme.colors.border);
    document.documentElement.style.setProperty('--color-text', customTheme.colors.text);
    document.documentElement.style.setProperty('--color-muted', customTheme.colors.muted);
    document.documentElement.style.setProperty('--color-accent', customTheme.colors.accent);
  };

  const saveCustomTheme = () => {
    if (!newThemeName.trim()) return;
    const newTheme: CustomTheme = {
        id: Date.now().toString(),
        name: newThemeName,
        colors: newThemeDraft
    };
    const updated = [...customThemes, newTheme];
    setCustomThemes(updated);
    localStorage.setItem('ableton-custom-themes', JSON.stringify(updated));
    applyCustomTheme(newTheme);
    setIsCreatingTheme(false);
    setNewThemeName('');
  };

  // Save templates to local storage
  useEffect(() => {
    localStorage.setItem('ableton-templates', JSON.stringify(templates));
  }, [templates]);

  // Specific Techno Workflows
  const technoWorkflows = [
    { label: "Kick Rumble Generator", prompt: "Create a detailed chain for a Techno Rumble Kick using Hybrid Reverb and Roar. Explain macro mappings for decay and distortion." },
    { label: "Polymetric Sequencer", prompt: "Explain how to set up a polymetric techno sequence using the new Live 12 MIDI Tools, mixing 4/4 kicks with 3/16 synth lines." },
    { label: "Dub Techno Chord Rack", prompt: "Design a classic Dub Techno chord rack using Analog, Echo, and Auto Filter. Focus on texture and feedback loops." },
    { label: "Industrial Distortion Bus", prompt: "Create an industrial techno drum bus processing chain using Roar in Multiband mode and Drum Buss." },
    { label: "Hypnotic Bleep Loop", prompt: "Show me a workflow to generate hypnotic, evolving bleep loops using Note Echo, Random, and Scale Awareness." },
    { label: "Hardgroove Percussion", prompt: "Create a processing chain for 90s Hardgroove loops using Vocoder (noise mode) and Overdrive to add texture." }
  ];

  // Advanced Feature Prompts
  const advancedWorkflows = [
    { label: "REX & Slicing Masterclass", prompt: "Explain how to use 'Slice to New MIDI Track' to recreate the REX file workflow. Discuss preserving transients in Simpler." },
    { label: "Stem Separation Remixing", prompt: "Provide a step-by-step guide on using Ableton Live 12's Stem Separation feature to isolate vocals, drums, bass, or other instruments from an audio clip. Include tips for cleaning up artifacts." },
    { label: "Generative MIDI Tools", prompt: "Explain how to use Ableton Live 12's new MIDI Clip view features like 'Seed', 'Rhythm', and 'Shape' to generate melodic patterns. Also, detail how to use 'Scale Awareness' for musical results." }
  ];

  const applyConfigPreset = (preset: string) => {
    switch (preset) {
        case 'purist':
            setPreferences({
                ...preferences,
                deviceSuite: 'stock',
                creativity: 'standard',
                tone: 'professional',
                useEmojis: false,
                useAnalogies: false,
                outputLength: 'detailed',
                includeTroubleshooting: true,
                sentenceComplexity: 8,
                jargonLevel: 9,
                deviceExplanationDepth: 9
            });
            break;
        case 'experimental':
            setPreferences({
                ...preferences,
                deviceSuite: 'm4l',
                creativity: 'experimental',
                tone: 'encouraging',
                useEmojis: true,
                useAnalogies: true,
                outputLength: 'balanced',
                includeTroubleshooting: false,
                sentenceComplexity: 6,
                jargonLevel: 7,
                deviceExplanationDepth: 7,
                midiComplexity: 9,
                midiMusicality: 4
            });
            break;
        case 'beginner':
            setPreferences({
                ...preferences,
                detailLevel: 'beginner',
                tone: 'encouraging',
                outputLength: 'detailed',
                useEmojis: true,
                useAnalogies: true,
                format: 'steps',
                showShortcuts: true,
                sentenceComplexity: 3,
                jargonLevel: 2,
                deviceExplanationDepth: 3
            });
            break;
    }
  };

  const handleGenerate = async (textToUse?: string, modifier?: string) => {
    const activePrompt = textToUse || prompt;
    if (!activePrompt.trim() && !selectedImage) return;

    // Determine config overrides based on modifier
    let tempPrefs = { ...preferences };
    let extraInstruction = "";

    if (modifier === 'much_longer') {
        extraInstruction = "Make this response EXTENSIVE, DETAILED, and LONG. Cover every nuance.";
        tempPrefs.outputLength = 'detailed';
    } else if (modifier === 'professional') {
        extraInstruction = "Use a strictly PROFESSIONAL, TECHNICAL, and ACADEMIC tone. No fluff.";
        tempPrefs.tone = 'professional';
        tempPrefs.useEmojis = false;
        tempPrefs.useAnalogies = false;
        tempPrefs.jargonLevel = 9;
    } else if (modifier === 'short') {
        extraInstruction = "Make this response extremely SHORT and CONCISE. Bullet points only.";
        tempPrefs.outputLength = 'concise';
        tempPrefs.format = 'bullet_points';
    }

    setIsGenerating(true);
    setResponse('');
    setResponseImage(undefined);
    setLastPrompt(activePrompt); // Save for re-runs

    // Contextualize prompt with preferences
    const contextPrompt = `${activePrompt} 
    
    ${extraInstruction ? `[IMPORTANT MODIFICATION]: ${extraInstruction}` : ''}

    [Configuration Constraints]:
    - Expertise Level: ${tempPrefs.detailLevel}
    - OS for Shortcuts: ${tempPrefs.os === 'mac' ? 'macOS (Cmd, Opt)' : 'Windows (Ctrl, Alt)'}
    - Live Version: Ableton Live ${tempPrefs.liveVersion}
    - Preferred Genre Context: ${tempPrefs.genre}
    - Tone: ${tempPrefs.tone}
    - Length: ${tempPrefs.outputLength}
    - Format: ${tempPrefs.format}
    - Emojis: ${tempPrefs.useEmojis ? 'Yes' : 'No'}
    - Analogies: ${tempPrefs.useAnalogies ? 'Use helpful analogies' : 'Technical only'}
    - Device Restriction: ${tempPrefs.deviceSuite === 'stock' ? 'Use ONLY Stock Ableton Devices.' : 'You may include Max for Live devices.'}
    - Creativity Mode: ${tempPrefs.creativity === 'experimental' ? 'Suggest unconventional signal routing and weird sound design tricks.' : 'Stick to standard, reliable industry techniques.'}
    - Show Shortcuts: ${tempPrefs.showShortcuts ? 'Yes' : 'No'}
    - Troubleshooting: ${tempPrefs.includeTroubleshooting ? 'Include common pitfalls' : 'No'}
    
    [Style Fine-Tuning (1-10)]:
    - Sentence Complexity: ${tempPrefs.sentenceComplexity}/10
    - Technical Jargon: ${tempPrefs.jargonLevel}/10
    - Device Explanation Depth: ${tempPrefs.deviceExplanationDepth}/10
    
    [MIDI Generation Settings (1-10)]:
    - MIDI Pattern Complexity: ${tempPrefs.midiComplexity}/10
    - MIDI Musicality/Scale Adherence: ${tempPrefs.midiMusicality}/10
    `;
    
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: modifier ? `${activePrompt} (${modifier.replace('_', ' ')})` : activePrompt,
      imageUrl: selectedImage || undefined,
      timestamp: Date.now()
    };
    setHistory(prev => [userMsg, ...prev]);

    try {
      if (selectedImage && isEditMode) {
        // Image Editing Flow
        const newImageBase64 = await editImage(selectedImage, contextPrompt);
        setResponseImage(newImageBase64);
        setResponse("Here is your edited image based on the prompt.");

        const modelMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: "Here is your edited image based on the prompt.",
            imageUrl: newImageBase64,
            timestamp: Date.now()
        };
        setHistory(prev => [modelMsg, ...prev]);

      } else {
        // Text Generation / Image Analysis Flow
        let accumulatedResponse = "";
        await generateAbletonGuideStream(contextPrompt, selectedImage, (chunk) => {
          accumulatedResponse += chunk;
          setResponse(accumulatedResponse);
        });
        
        const modelMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: accumulatedResponse,
          timestamp: Date.now()
        };
        setHistory(prev => [modelMsg, ...prev]);
      }
      
      // Clear inputs after success
      setPrompt('');
      if (!modifier) {
          setSelectedImage(null);
          setIsEditMode(false);
      }

    } catch (error) {
      console.error("Failed to generate", error);
      setResponse("**Error:** Failed to process request. Please check your connection or API key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' }); // or webm
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            setIsGenerating(true);
            try {
                const transcript = await transcribeAudio(base64Audio, 'audio/wav');
                setPrompt(prev => (prev + " " + transcript).trim());
            } catch (err) {
                console.error(err);
                alert("Failed to transcribe audio.");
            } finally {
                setIsGenerating(false);
            }
        };
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setSelectedImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const loadFromHistory = (item: ChatMessage) => {
    if (item.role === 'user') {
        setPrompt(item.text);
    } else {
        setResponse(item.text);
        setResponseImage(item.imageUrl);
    }
    setShowHistory(false);
  };

  const openSaveModal = () => {
    setNewTemplateContent(response);
    setNewTemplateName('');
    setNewTemplateCategory('Workflow');
    setShowSaveModal(true);
  };

  const saveTemplate = () => {
    if (!newTemplateName.trim()) return;
    const template: SavedTemplate = {
      id: Date.now().toString(),
      name: newTemplateName,
      content: newTemplateContent,
      category: newTemplateCategory,
      createdAt: Date.now()
    };
    setTemplates(prev => [template, ...prev]);
    setShowSaveModal(false);
    setNewTemplateName('');
    setNewTemplateContent('');
    setActiveTab('templates');
  };

  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const loadTemplate = (template: SavedTemplate) => {
    setResponse(template.content);
    setResponseImage(undefined);
    setShowHistory(false); // Close sidebar on mobile
  };

  const handleExport = () => {
    if (!response) return;
    const blob = new Blob([response], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ableton-guide-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!response) return;
    try {
        await navigator.clipboard.writeText(response);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
    }
  };

  const availableThemes: {id: Theme, name: string, color: string}[] = [
      { id: 'dark', name: 'Live 12 Dark', color: '#1a1a1a' },
      { id: 'light', name: 'Live 12 Light', color: '#f3f3f3' },
      { id: 'live9', name: 'Live 9 Legacy', color: '#dcdcdc' },
      { id: 'vaporwave', name: 'Vaporwave', color: '#24123b' },
      { id: 'matrix', name: 'The Matrix', color: '#000000' },
      { id: 'rust', name: 'Rust', color: '#1c1917' },
      { id: 'ocean', name: 'Deep Ocean', color: '#0f172a' },
  ];

  return (
    <div className="min-h-screen bg-ableton-base text-ableton-text font-sans selection:bg-ableton-accent selection:text-white flex flex-col md:flex-row overflow-hidden transition-colors duration-300">
      
      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
           <div className="bg-ableton-surface border border-ableton-border shadow-2xl rounded-lg max-w-lg w-full p-6 relative">
              <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-ableton-muted hover:text-ableton-text">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <h2 className="text-xl font-bold text-ableton-accent mb-4">How to use LiveWire</h2>
              <div className="space-y-3 text-sm text-ableton-text">
                <p><strong>1. Text Prompts:</strong> Ask for sound design recipes (e.g., "Create a dubstep wobble bass").</p>
                <p><strong>2. Audio Input:</strong> Click the mic to speak your request or record a sound to describe.</p>
                <p><strong>3. Image Analysis:</strong> Upload a screenshot of a plugin or VST and ask "What is this setting?"</p>
                <p><strong>4. Image Editing:</strong> Upload an image, check "Edit Mode", and prompt to modify it (e.g., "Make it cyberpunk").</p>
                <p><strong>5. Templates:</strong> Save your favorite generated guides as templates to recall later.</p>
              </div>
           </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
           <div className="bg-ableton-surface border border-ableton-border shadow-2xl rounded-lg max-w-2xl w-full p-6 flex flex-col max-h-[90vh]">
              <h3 className="text-lg font-bold text-ableton-text mb-4">Save Template</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-1">
                      <label className="text-xs text-ableton-muted uppercase tracking-wider font-bold">Template Name</label>
                      <input 
                        type="text" 
                        autoFocus
                        placeholder="e.g. Techno Rumble Chain" 
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-ableton-text focus:outline-none focus:border-ableton-accent"
                      />
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs text-ableton-muted uppercase tracking-wider font-bold">Category</label>
                      <select 
                        value={newTemplateCategory}
                        onChange={(e) => setNewTemplateCategory(e.target.value)}
                        className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-ableton-text focus:outline-none focus:border-ableton-accent"
                      >
                          <option value="Workflow">Workflow</option>
                          <option value="Effect Rack">Effect Rack</option>
                          <option value="Sound Design">Sound Design</option>
                          <option value="Project Setup">Project Setup</option>
                          <option value="Other">Other</option>
                      </select>
                  </div>
              </div>

              <div className="flex-1 min-h-[200px] mb-4 flex flex-col space-y-1">
                 <label className="text-xs text-ableton-muted uppercase tracking-wider font-bold">Template Content (Editable)</label>
                 <textarea 
                    value={newTemplateContent}
                    onChange={(e) => setNewTemplateContent(e.target.value)}
                    className="flex-1 w-full bg-ableton-base border border-ableton-border rounded p-3 text-ableton-text font-mono text-xs focus:outline-none focus:border-ableton-accent resize-none leading-relaxed"
                 />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setShowSaveModal(false)}>Cancel</Button>
                <Button onClick={saveTemplate} disabled={!newTemplateName.trim()}>Save Template</Button>
              </div>
           </div>
        </div>
      )}

      {/* Sidebar (History & Config) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-ableton-surface border-r border-ableton-border transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${showHistory ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        
        {/* Sidebar Header/Tabs */}
        <div className="p-0 border-b border-ableton-border grid grid-cols-3">
           <button 
             onClick={() => setActiveTab('history')}
             className={`p-3 text-[10px] font-bold uppercase tracking-wider transition-colors truncate ${activeTab === 'history' ? 'bg-ableton-base text-ableton-accent border-b-2 border-ableton-accent' : 'text-ableton-muted hover:text-ableton-text'}`}
           >
             History
           </button>
           <button 
             onClick={() => setActiveTab('templates')}
             className={`p-3 text-[10px] font-bold uppercase tracking-wider transition-colors truncate ${activeTab === 'templates' ? 'bg-ableton-base text-ableton-accent border-b-2 border-ableton-accent' : 'text-ableton-muted hover:text-ableton-text'}`}
           >
             Templates
           </button>
           <button 
             onClick={() => setActiveTab('config')}
             className={`p-3 text-[10px] font-bold uppercase tracking-wider transition-colors truncate ${activeTab === 'config' ? 'bg-ableton-base text-ableton-accent border-b-2 border-ableton-accent' : 'text-ableton-muted hover:text-ableton-text'}`}
           >
             Config
           </button>
        </div>

        <button onClick={() => setShowHistory(false)} className="md:hidden absolute top-3 right-3 text-ableton-muted">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-2">
          {activeTab === 'history' && (
             <div className="space-y-2">
                {history.filter(h => h.role === 'user').map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => loadFromHistory(item)}
                    className="p-3 rounded bg-ableton-panel hover:bg-ableton-border cursor-pointer transition-colors text-xs border-l-2 border-transparent hover:border-ableton-accent truncate flex items-center justify-between"
                  >
                    <span className="truncate">{item.text || "(Image)"}</span>
                    {item.imageUrl && (
                        <svg className="w-3 h-3 text-ableton-muted flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    )}
                  </div>
                ))}
                {history.length === 0 && (
                  <div className="p-4 text-xs text-ableton-muted text-center italic mt-10">
                    No generations yet.
                  </div>
                )}
             </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-2">
               {templates.length > 0 ? templates.map((t) => (
                 <div key={t.id} className="group bg-ableton-panel rounded p-3 border border-ableton-border hover:border-ableton-accent/50 transition-colors">
                    <div onClick={() => loadTemplate(t)} className="cursor-pointer">
                      <div className="flex justify-between items-start">
                         <h4 className="text-sm font-semibold text-ableton-text group-hover:text-ableton-accent transition-colors truncate pr-2">{t.name}</h4>
                         {t.category && <span className="text-[9px] uppercase tracking-wider bg-ableton-base px-1.5 py-0.5 rounded text-ableton-muted border border-ableton-border">{t.category}</span>}
                      </div>
                      <p className="text-[10px] text-ableton-muted mt-1">{new Date(t.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex justify-end mt-2 pt-2 border-t border-white/5">
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}
                          className="text-xs text-ableton-muted hover:text-red-400 flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          Delete
                        </button>
                    </div>
                 </div>
               )) : (
                 <div className="p-4 text-xs text-ableton-muted text-center italic mt-10">
                    No saved templates. Generate a recipe and save it here.
                 </div>
               )}
            </div>
          )}

          {activeTab === 'config' && (
             <div className="p-4 space-y-8 pb-24">
                
                {/* 0. Smart Presets (Synthesized Configs) */}
                <div className="space-y-3">
                   <h3 className="text-xs font-bold text-ableton-accent uppercase tracking-wider">Quick Config Presets</h3>
                   <div className="flex gap-2">
                      <button onClick={() => applyConfigPreset('purist')} className="flex-1 bg-ableton-panel border border-ableton-border rounded px-2 py-2 text-[10px] hover:bg-ableton-surface hover:text-ableton-accent transition-colors">
                        The Purist
                      </button>
                      <button onClick={() => applyConfigPreset('experimental')} className="flex-1 bg-ableton-panel border border-ableton-border rounded px-2 py-2 text-[10px] hover:bg-ableton-surface hover:text-ableton-accent transition-colors">
                        Experimental
                      </button>
                      <button onClick={() => applyConfigPreset('beginner')} className="flex-1 bg-ableton-panel border border-ableton-border rounded px-2 py-2 text-[10px] hover:bg-ableton-surface hover:text-ableton-accent transition-colors">
                        Beginner
                      </button>
                   </div>
                </div>

                {/* Granular Style Control */}
                <div className="space-y-4 border-t border-ableton-border pt-4">
                    <h3 className="text-xs font-bold text-ableton-muted uppercase tracking-wider">Output Style Fine-Tuning</h3>
                    
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-ableton-muted uppercase">
                                <span>Sentence Complexity</span>
                                <span>{preferences.sentenceComplexity}/10</span>
                            </div>
                            <input 
                                type="range" min="1" max="10" 
                                value={preferences.sentenceComplexity}
                                onChange={(e) => setPreferences({...preferences, sentenceComplexity: parseInt(e.target.value)})}
                                className="w-full h-1 bg-ableton-panel rounded-lg appearance-none cursor-pointer accent-ableton-accent"
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-ableton-muted uppercase">
                                <span>Technical Jargon</span>
                                <span>{preferences.jargonLevel}/10</span>
                            </div>
                            <input 
                                type="range" min="1" max="10" 
                                value={preferences.jargonLevel}
                                onChange={(e) => setPreferences({...preferences, jargonLevel: parseInt(e.target.value)})}
                                className="w-full h-1 bg-ableton-panel rounded-lg appearance-none cursor-pointer accent-ableton-accent"
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-ableton-muted uppercase">
                                <span>Device Depth</span>
                                <span>{preferences.deviceExplanationDepth}/10</span>
                            </div>
                            <input 
                                type="range" min="1" max="10" 
                                value={preferences.deviceExplanationDepth}
                                onChange={(e) => setPreferences({...preferences, deviceExplanationDepth: parseInt(e.target.value)})}
                                className="w-full h-1 bg-ableton-panel rounded-lg appearance-none cursor-pointer accent-ableton-accent"
                            />
                        </div>
                    </div>
                </div>

                {/* MIDI Generator Section */}
                <div className="space-y-4 border-t border-ableton-border pt-4">
                     <h3 className="text-xs font-bold text-ableton-muted uppercase tracking-wider flex items-center gap-2">
                        <span>Generative MIDI Tools</span>
                        <span className="text-[9px] bg-ableton-accent/20 text-ableton-accent px-1 rounded">Live 12</span>
                     </h3>
                     <div className="p-3 bg-ableton-panel rounded border border-ableton-border space-y-4">
                        <div className="space-y-1">
                             <div className="flex justify-between text-[10px] text-ableton-muted uppercase">
                                <span>Pattern Complexity</span>
                                <span>{preferences.midiComplexity}/10</span>
                            </div>
                            <input 
                                type="range" min="1" max="10" 
                                value={preferences.midiComplexity}
                                onChange={(e) => setPreferences({...preferences, midiComplexity: parseInt(e.target.value)})}
                                className="w-full h-1 bg-ableton-base rounded-lg appearance-none cursor-pointer accent-ableton-accent"
                            />
                        </div>
                        <div className="space-y-1">
                             <div className="flex justify-between text-[10px] text-ableton-muted uppercase">
                                <span>Musicality / Scale Adherence</span>
                                <span>{preferences.midiMusicality}/10</span>
                            </div>
                            <input 
                                type="range" min="1" max="10" 
                                value={preferences.midiMusicality}
                                onChange={(e) => setPreferences({...preferences, midiMusicality: parseInt(e.target.value)})}
                                className="w-full h-1 bg-ableton-base rounded-lg appearance-none cursor-pointer accent-ableton-accent"
                            />
                        </div>
                     </div>
                </div>

                <div className="space-y-3 border-t border-ableton-border pt-4">
                   <h3 className="text-xs font-bold text-ableton-muted uppercase tracking-wider">Visual Theme</h3>
                   <div className="grid grid-cols-3 gap-2">
                     {availableThemes.map(t => (
                         <button
                           key={t.id}
                           onClick={() => setTheme(t.id)}
                           className={`p-1 rounded border transition-all ${theme === t.id ? 'border-ableton-accent bg-ableton-panel' : 'border-transparent hover:bg-ableton-panel'}`}
                           title={t.name}
                         >
                            <div className="w-full h-8 rounded mb-1" style={{backgroundColor: t.color}}></div>
                            <span className="text-[9px] text-ableton-muted block text-center truncate">{t.name}</span>
                         </button>
                     ))}
                     {customThemes.map(t => (
                         <button
                           key={t.id}
                           onClick={() => applyCustomTheme(t)}
                           className={`p-1 rounded border transition-all ${theme === 'custom' && document.documentElement.style.getPropertyValue('--color-base') === t.colors.base ? 'border-ableton-accent bg-ableton-panel' : 'border-transparent hover:bg-ableton-panel'}`}
                           title={t.name}
                         >
                             <div className="w-full h-8 rounded mb-1 border border-white/10" style={{backgroundColor: t.colors.base}}>
                                 <div className="w-full h-1/2" style={{backgroundColor: t.colors.accent}}></div>
                             </div>
                            <span className="text-[9px] text-ableton-muted block text-center truncate">{t.name}</span>
                         </button>
                     ))}
                     <button
                        onClick={() => setIsCreatingTheme(!isCreatingTheme)}
                        className="p-1 rounded border border-dashed border-ableton-muted hover:border-ableton-accent hover:text-ableton-accent text-ableton-muted flex flex-col items-center justify-center h-[54px]"
                     >
                        <span className="text-lg font-bold">+</span>
                        <span className="text-[9px]">Custom</span>
                     </button>
                   </div>
                   
                   {/* Custom Theme Creator */}
                   {isCreatingTheme && (
                       <div className="mt-4 p-3 bg-ableton-panel rounded border border-ableton-border space-y-3 animate-in fade-in slide-in-from-top-2">
                           <input 
                              type="text" 
                              placeholder="Theme Name"
                              value={newThemeName}
                              onChange={(e) => setNewThemeName(e.target.value)}
                              className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-xs text-ableton-text mb-2"
                           />
                           <div className="grid grid-cols-2 gap-2">
                               <div className="space-y-1">
                                   <label className="text-[9px] text-ableton-muted uppercase">Base (Bg)</label>
                                   <div className="flex gap-2">
                                     <input type="color" value={newThemeDraft.base} onChange={e => setNewThemeDraft({...newThemeDraft, base: e.target.value})} className="h-6 w-8 bg-transparent cursor-pointer" />
                                     <input type="text" value={newThemeDraft.base} onChange={e => setNewThemeDraft({...newThemeDraft, base: e.target.value})} className="w-full text-[10px] bg-ableton-base border-none rounded px-1" />
                                   </div>
                               </div>
                               <div className="space-y-1">
                                   <label className="text-[9px] text-ableton-muted uppercase">Accent</label>
                                   <div className="flex gap-2">
                                     <input type="color" value={newThemeDraft.accent} onChange={e => setNewThemeDraft({...newThemeDraft, accent: e.target.value})} className="h-6 w-8 bg-transparent cursor-pointer" />
                                     <input type="text" value={newThemeDraft.accent} onChange={e => setNewThemeDraft({...newThemeDraft, accent: e.target.value})} className="w-full text-[10px] bg-ableton-base border-none rounded px-1" />
                                   </div>
                               </div>
                               <div className="space-y-1">
                                   <label className="text-[9px] text-ableton-muted uppercase">Text</label>
                                   <div className="flex gap-2">
                                     <input type="color" value={newThemeDraft.text} onChange={e => setNewThemeDraft({...newThemeDraft, text: e.target.value})} className="h-6 w-8 bg-transparent cursor-pointer" />
                                     <input type="text" value={newThemeDraft.text} onChange={e => setNewThemeDraft({...newThemeDraft, text: e.target.value})} className="w-full text-[10px] bg-ableton-base border-none rounded px-1" />
                                   </div>
                               </div>
                               <div className="space-y-1">
                                   <label className="text-[9px] text-ableton-muted uppercase">Surface (Nav)</label>
                                   <div className="flex gap-2">
                                     <input type="color" value={newThemeDraft.surface} onChange={e => setNewThemeDraft({...newThemeDraft, surface: e.target.value})} className="h-6 w-8 bg-transparent cursor-pointer" />
                                     <input type="text" value={newThemeDraft.surface} onChange={e => setNewThemeDraft({...newThemeDraft, surface: e.target.value})} className="w-full text-[10px] bg-ableton-base border-none rounded px-1" />
                                   </div>
                               </div>
                           </div>
                           <Button onClick={saveCustomTheme} disabled={!newThemeName} className="w-full mt-2 py-1 text-xs">Save Theme</Button>
                       </div>
                   )}
                </div>

                <div className="space-y-3 border-t border-ableton-border pt-4">
                   <h3 className="text-xs font-bold text-ableton-muted uppercase tracking-wider">Assistant Personality</h3>
                   <div className="bg-ableton-panel p-4 rounded border border-ableton-border space-y-4">
                       
                       {/* 1. Detail Level */}
                       <div className="space-y-1">
                           <label className="text-[10px] text-ableton-muted uppercase">Expertise Level</label>
                           <select 
                              value={preferences.detailLevel}
                              onChange={(e) => setPreferences(prev => ({...prev, detailLevel: e.target.value as any}))}
                              className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-xs text-ableton-text"
                            >
                               <option value="beginner">Beginner (Detailed explanations)</option>
                               <option value="intermediate">Intermediate (Balanced)</option>
                               <option value="expert">Expert (Concise, technical)</option>
                           </select>
                       </div>

                       {/* 2. Device Suite */}
                       <div className="space-y-1">
                           <label className="text-[10px] text-ableton-muted uppercase">Device Restrictions</label>
                           <select 
                              value={preferences.deviceSuite}
                              onChange={(e) => setPreferences(prev => ({...prev, deviceSuite: e.target.value as any}))}
                              className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-xs text-ableton-text"
                            >
                               <option value="stock">Stock Devices Only</option>
                               <option value="m4l">Allow Max for Live</option>
                           </select>
                       </div>

                       {/* 3. Creativity */}
                       <div className="space-y-1">
                           <label className="text-[10px] text-ableton-muted uppercase">Creativity Mode</label>
                           <select 
                              value={preferences.creativity}
                              onChange={(e) => setPreferences(prev => ({...prev, creativity: e.target.value as any}))}
                              className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-xs text-ableton-text"
                            >
                               <option value="standard">Standard Techniques</option>
                               <option value="experimental">Experimental / Sound Design</option>
                           </select>
                       </div>

                        {/* 4. OS */}
                       <div className="space-y-1">
                           <label className="text-[10px] text-ableton-muted uppercase">Operating System</label>
                           <div className="flex bg-ableton-base rounded p-1 border border-ableton-border">
                               <button 
                                 onClick={() => setPreferences(p => ({...p, os: 'mac'}))}
                                 className={`flex-1 text-[10px] py-1 rounded ${preferences.os === 'mac' ? 'bg-ableton-panel text-ableton-text' : 'text-ableton-muted'}`}
                               >macOS</button>
                               <button 
                                 onClick={() => setPreferences(p => ({...p, os: 'windows'}))}
                                 className={`flex-1 text-[10px] py-1 rounded ${preferences.os === 'windows' ? 'bg-ableton-panel text-ableton-text' : 'text-ableton-muted'}`}
                               >Windows</button>
                           </div>
                       </div>

                       {/* 5. Live Version */}
                        <div className="space-y-1">
                           <label className="text-[10px] text-ableton-muted uppercase">Target Version</label>
                           <select 
                              value={preferences.liveVersion}
                              onChange={(e) => setPreferences(prev => ({...prev, liveVersion: e.target.value as any}))}
                              className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-xs text-ableton-text"
                            >
                               <option value="12">Live 12</option>
                               <option value="11">Live 11</option>
                           </select>
                       </div>

                       {/* 6. Genre Context */}
                       <div className="space-y-1">
                           <label className="text-[10px] text-ableton-muted uppercase">Musical Context</label>
                           <select 
                              value={preferences.genre}
                              onChange={(e) => setPreferences(prev => ({...prev, genre: e.target.value as any}))}
                              className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-xs text-ableton-text"
                            >
                               <option value="general">General / No Specific Genre</option>
                               <option value="techno">Techno</option>
                               <option value="house">House</option>
                               <option value="hiphop">Hip Hop / Trap</option>
                               <option value="ambient">Ambient / Cinematic</option>
                           </select>
                       </div>

                       {/* 7. Tone */}
                       <div className="space-y-1">
                           <label className="text-[10px] text-ableton-muted uppercase">Tone</label>
                           <select 
                              value={preferences.tone}
                              onChange={(e) => setPreferences(prev => ({...prev, tone: e.target.value as any}))}
                              className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-xs text-ableton-text"
                            >
                               <option value="encouraging">Encouraging & Helpful</option>
                               <option value="professional">Professional & Direct</option>
                               <option value="technical">Highly Technical</option>
                           </select>
                       </div>

                        {/* 8. Output Length */}
                       <div className="space-y-1">
                           <label className="text-[10px] text-ableton-muted uppercase">Default Length</label>
                           <select 
                              value={preferences.outputLength}
                              onChange={(e) => setPreferences(prev => ({...prev, outputLength: e.target.value as any}))}
                              className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-xs text-ableton-text"
                            >
                               <option value="concise">Short / Concise</option>
                               <option value="balanced">Balanced</option>
                               <option value="detailed">Long / Detailed</option>
                           </select>
                       </div>

                        {/* 9. Format */}
                       <div className="space-y-1">
                           <label className="text-[10px] text-ableton-muted uppercase">Output Format</label>
                           <select 
                              value={preferences.format}
                              onChange={(e) => setPreferences(prev => ({...prev, format: e.target.value as any}))}
                              className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-xs text-ableton-text"
                            >
                               <option value="steps">Step-by-Step Guide</option>
                               <option value="paragraphs">Paragraphs</option>
                               <option value="bullet_points">Bullet Points</option>
                           </select>
                       </div>

                       {/* Switches for Toggles */}
                       <div className="space-y-2 pt-2 border-t border-ableton-border">
                          <Switch 
                            checked={preferences.useEmojis} 
                            onChange={(c) => setPreferences(p => ({...p, useEmojis: c}))} 
                            label="Use Emojis 🎛️"
                            className="scale-90 origin-left"
                          />
                          <Switch 
                            checked={preferences.useAnalogies} 
                            onChange={(c) => setPreferences(p => ({...p, useAnalogies: c}))} 
                            label="Use Analogies"
                            className="scale-90 origin-left"
                          />
                          <Switch 
                            checked={preferences.showShortcuts} 
                            onChange={(c) => setPreferences(p => ({...p, showShortcuts: c}))} 
                            label="Show Keyboard Shortcuts"
                            className="scale-90 origin-left"
                          />
                          <Switch 
                            checked={preferences.includeTroubleshooting} 
                            onChange={(c) => setPreferences(p => ({...p, includeTroubleshooting: c}))} 
                            label="Include Troubleshooting Tips"
                            className="scale-90 origin-left"
                          />
                       </div>

                   </div>
                </div>
             </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-ableton-base">
        
        {/* Header */}
        <header className="h-16 bg-ableton-surface border-b border-ableton-border flex items-center justify-between px-6 flex-shrink-0 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowHistory(true)} className="md:hidden text-ableton-muted">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="w-8 h-8 bg-ableton-accent rounded-sm flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 2v20h2V2H6zm4 0v20h2V2h-2zm4 0v20h2V2h-2zm4 0v20h2V2h-2z"/></svg>
            </div>
            <h1 className="text-lg font-semibold tracking-wide text-ableton-text">LiveWire <span className="text-xs text-ableton-muted font-normal ml-2 hidden sm:inline">Ableton 12 Assistant</span></h1>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="text-xs font-mono text-ableton-yellow bg-yellow-900/20 px-2 py-1 rounded hidden sm:block border border-yellow-900/30">
                v12.0
             </div>
             {/* Help Button */}
             <button onClick={() => setShowHelp(true)} className="p-2 text-ableton-muted hover:text-ableton-text hover:bg-ableton-panel rounded-full transition-colors" title="Help">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </button>
          </div>
        </header>

        {/* Scrollable Output Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
           {/* Suggestions Grid (only if no response yet) */}
           {!response && !isGenerating && !responseImage && (
             <div className="max-w-4xl mx-auto space-y-8">
                
                {/* Workflow Section */}
                <div>
                   <p className="text-center text-ableton-muted mb-4 uppercase tracking-widest text-xs font-bold">Techno Workflows</p>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {technoWorkflows.map((s, i) => (
                      <button 
                        key={i} 
                        onClick={() => { setPrompt(s.prompt); handleGenerate(s.prompt); }}
                        className="text-left p-4 bg-ableton-panel border border-ableton-border hover:border-ableton-accent/50 hover:bg-ableton-surface transition-all rounded-sm text-sm text-ableton-text shadow-sm opacity-80 hover:opacity-100 flex flex-col gap-2"
                      >
                        <span className="font-bold text-ableton-accent">{s.label}</span>
                        <span className="text-xs text-ableton-muted leading-snug">{s.prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Advanced Features Section */}
                <div>
                   <p className="text-center text-ableton-muted mb-4 uppercase tracking-widest text-xs font-bold">Advanced Features</p>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {advancedWorkflows.map((s, i) => (
                      <button 
                        key={i} 
                        onClick={() => { setPrompt(s.prompt); handleGenerate(s.prompt); }}
                        className="text-left p-4 bg-ableton-panel border border-ableton-border hover:border-ableton-accent/50 hover:bg-ableton-surface transition-all rounded-sm text-sm text-ableton-text shadow-sm opacity-80 hover:opacity-100 flex flex-col gap-2 group"
                      >
                         <div className="flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-ableton-yellow group-hover:animate-pulse"></span>
                             <span className="font-bold text-ableton-text group-hover:text-ableton-accent transition-colors">{s.label}</span>
                         </div>
                         <span className="text-xs text-ableton-muted leading-snug pl-4">{s.prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>

             </div>
           )}

           <div className="max-w-4xl mx-auto relative">
             {/* Action Toolbar */}
             {response && !isGenerating && (
                 <div className="flex justify-end mb-2 gap-2">
                    <Button variant="secondary" onClick={handleCopy} className="flex items-center gap-2 text-xs">
                        {copied ? (
                             <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                        )}
                        {copied ? 'Copied' : 'Copy'}
                    </Button>
                    <Button variant="secondary" onClick={handleExport} className="flex items-center gap-2 text-xs">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Export
                    </Button>
                    <Button variant="secondary" onClick={openSaveModal} className="flex items-center gap-2 text-xs">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                        Save as Template
                    </Button>
                 </div>
             )}
             <OutputDisplay content={response} imageUrl={responseImage} isStreaming={isGenerating} />
           </div>
        </div>

        {/* Input Footer */}
        <div className="bg-ableton-surface border-t border-ableton-border p-4 flex-shrink-0 z-10 transition-colors duration-300">
          <div className="max-w-4xl mx-auto space-y-3">
             
             {/* Text Modifiers (Tiny Buttons) - Only show if there is a lastPrompt and not generating */}
             {lastPrompt && !isGenerating && (
                <div className="flex gap-2 justify-center mb-1">
                    <button 
                        onClick={() => handleGenerate(lastPrompt, 'much_longer')}
                        className="text-[10px] uppercase font-bold tracking-wider px-3 py-1 bg-ableton-panel hover:bg-ableton-accent hover:text-white text-ableton-muted rounded-full transition-colors border border-ableton-border"
                    >
                        Much Longer
                    </button>
                    <button 
                        onClick={() => handleGenerate(lastPrompt, 'professional')}
                        className="text-[10px] uppercase font-bold tracking-wider px-3 py-1 bg-ableton-panel hover:bg-ableton-accent hover:text-white text-ableton-muted rounded-full transition-colors border border-ableton-border"
                    >
                        Make Professional
                    </button>
                    <button 
                        onClick={() => handleGenerate(lastPrompt, 'short')}
                        className="text-[10px] uppercase font-bold tracking-wider px-3 py-1 bg-ableton-panel hover:bg-ableton-accent hover:text-white text-ableton-muted rounded-full transition-colors border border-ableton-border"
                    >
                        Short
                    </button>
                </div>
             )}

             {/* Selected Image Preview */}
             {selectedImage && (
                 <div className="flex items-center gap-3 bg-ableton-base p-2 rounded border border-ableton-border w-fit">
                    <img src={`data:image/png;base64,${selectedImage}`} className="h-10 w-10 object-cover rounded-sm" alt="Upload" />
                    <div className="flex flex-col">
                        <span className="text-xs text-ableton-muted">Image attached</span>
                        <label className="flex items-center gap-2 cursor-pointer mt-1">
                            <input 
                                type="checkbox" 
                                checked={isEditMode}
                                onChange={(e) => setIsEditMode(e.target.checked)}
                                className="w-3 h-3 accent-ableton-accent"
                            />
                            <span className="text-xs text-ableton-text hover:text-ableton-accent">Edit Mode</span>
                        </label>
                    </div>
                    <button onClick={() => { setSelectedImage(null); setIsEditMode(false); }} className="text-ableton-muted hover:text-ableton-text ml-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                 </div>
             )}

             <div className="flex gap-3">
                <div className="flex items-center gap-2">
                     {/* Image Upload Button */}
                     <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileSelect} 
                        accept="image/*" 
                        className="hidden" 
                    />
                    <Button variant="icon" onClick={() => fileInputRef.current?.click()} title="Upload Image">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </Button>
                    
                    {/* Microphone Button */}
                    <Button 
                        variant="icon" 
                        onClick={isRecording ? stopRecording : startRecording}
                        className={isRecording ? "text-red-500 bg-red-500/10 animate-pulse" : ""}
                        title="Transcribe Audio"
                    >
                        {isRecording ? (
                             <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
                        ) : (
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        )}
                    </Button>
                </div>

                <div className="flex-1 relative">
                    <input 
                    type="text" 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={selectedImage ? (isEditMode ? "Describe how to edit this image..." : "Ask about this image...") : "Describe a sound, effect, or workflow..."}
                    className="w-full bg-ableton-base border border-ableton-border rounded p-4 pr-12 text-ableton-text placeholder-ableton-muted focus:outline-none focus:border-ableton-accent focus:ring-1 focus:ring-ableton-accent transition-all font-mono text-sm"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-ableton-muted border border-ableton-border rounded px-1.5 py-0.5">
                    ENTER
                    </div>
                </div>
                <Button 
                onClick={() => handleGenerate()} 
                isLoading={isGenerating}
                disabled={(!prompt.trim() && !selectedImage)}
                >
                Generate
                </Button>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;