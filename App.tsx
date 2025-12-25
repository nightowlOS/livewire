import React, { useState, useRef, useEffect } from 'react';
import { generateAbletonGuideStream, transcribeAudio, editImage } from './services/geminiService';
import { Button } from './components/Button';
import { OutputDisplay } from './components/OutputDisplay';
import { Switch } from './components/Switch';
import { ChatMessage, Theme, SavedTemplate } from './types';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [response, setResponse] = useState('');
  const [responseImage, setResponseImage] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Feature states
  const [theme, setTheme] = useState<Theme>('dark');
  const [activeTab, setActiveTab] = useState<'history' | 'templates' | 'config'>('history');
  const [showHelp, setShowHelp] = useState(false);
  
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

  // Multi-modal state
  const [isRecording, setIsRecording] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // Base64
  const [isEditMode, setIsEditMode] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Save templates to local storage
  useEffect(() => {
    localStorage.setItem('ableton-templates', JSON.stringify(templates));
  }, [templates]);

  // Suggestions for empty state
  const suggestions = [
    "Meld & Roar: Bi-timbral granular texture with multiband distortion",
    "Roar: Multiband distortion for Drum Bus",
    "Workflow: Generative MIDI for trap hi-hats",
    "Glitchy breakbeats like a REX loop",
    "Scale Awareness: Quantizing live MIDI input",
    "Performance: Hybrid Reverb freeze drones"
  ];

  const handleGenerate = async (textToUse?: string) => {
    const activePrompt = textToUse || prompt;
    if (!activePrompt.trim() && !selectedImage) return;

    setIsGenerating(true);
    setResponse('');
    setResponseImage(undefined);
    
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: activePrompt,
      imageUrl: selectedImage || undefined,
      timestamp: Date.now()
    };
    setHistory(prev => [userMsg, ...prev]);

    try {
      if (selectedImage && isEditMode) {
        // Image Editing Flow
        const newImageBase64 = await editImage(selectedImage, activePrompt);
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
        await generateAbletonGuideStream(activePrompt, selectedImage, (chunk) => {
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
      setSelectedImage(null);
      setIsEditMode(false);

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

  const toggleTheme = (checked: boolean) => {
      setTheme(checked ? 'light' : 'dark');
  };

  const saveTemplate = () => {
    if (!newTemplateName.trim()) return;
    const template: SavedTemplate = {
      id: Date.now().toString(),
      name: newTemplateName,
      content: response,
      createdAt: Date.now()
    };
    setTemplates(prev => [template, ...prev]);
    setShowSaveModal(false);
    setNewTemplateName('');
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
           <div className="bg-ableton-surface border border-ableton-border shadow-2xl rounded-lg max-w-sm w-full p-6">
              <h3 className="text-lg font-bold text-ableton-text mb-4">Save as Template</h3>
              <input 
                type="text" 
                autoFocus
                placeholder="Template Name (e.g. Techno Rumble)" 
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveTemplate()}
                className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-ableton-text mb-4 focus:outline-none focus:border-ableton-accent"
              />
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setShowSaveModal(false)}>Cancel</Button>
                <Button onClick={saveTemplate} disabled={!newTemplateName.trim()}>Save</Button>
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
                        <svg className="w-3 h-3 text-ableton-muted flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
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
                      <h4 className="text-sm font-semibold text-ableton-text group-hover:text-ableton-accent transition-colors">{t.name}</h4>
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
             <div className="p-4 space-y-6">
                <div className="space-y-3">
                   <h3 className="text-xs font-bold text-ableton-muted uppercase tracking-wider">Appearance</h3>
                   <div className="bg-ableton-panel p-4 rounded border border-ableton-border">
                      <Switch 
                        checked={theme === 'light'} 
                        onChange={toggleTheme} 
                        label={theme === 'light' ? 'Light Theme' : 'Dark Theme'}
                      />
                   </div>
                </div>

                <div className="space-y-3">
                   <h3 className="text-xs font-bold text-ableton-muted uppercase tracking-wider">Preferences</h3>
                   <div className="bg-ableton-panel p-4 rounded border border-ableton-border space-y-4">
                       <label className="flex items-center gap-2 text-xs text-ableton-muted opacity-50 cursor-not-allowed">
                          <input type="checkbox" disabled className="rounded border-ableton-border bg-ableton-base" />
                          Always use High Quality Audio
                       </label>
                       <label className="flex items-center gap-2 text-xs text-ableton-muted opacity-50 cursor-not-allowed">
                          <input type="checkbox" disabled className="rounded border-ableton-border bg-ableton-base" />
                          Auto-save Recipes
                       </label>
                   </div>
                   <p className="text-[10px] text-ableton-muted">Additional settings coming soon.</p>
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
             <div className="max-w-4xl mx-auto">
                <p className="text-center text-ableton-muted mb-6 uppercase tracking-widest text-xs">Quick Start Recipes</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suggestions.map((s, i) => (
                    <button 
                      key={i} 
                      onClick={() => { setPrompt(s); handleGenerate(s); }}
                      className="text-left p-4 bg-ableton-panel border border-ableton-border hover:border-ableton-accent/50 hover:bg-ableton-surface transition-all rounded-sm text-sm text-ableton-text shadow-sm"
                    >
                      {s}
                    </button>
                  ))}
                </div>
             </div>
           )}

           <div className="max-w-4xl mx-auto relative">
             {/* Action Toolbar */}
             {response && !isGenerating && (
                 <div className="flex justify-end mb-2">
                    <Button variant="secondary" onClick={() => setShowSaveModal(true)} className="flex items-center gap-2 text-xs">
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
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
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