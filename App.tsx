import React, { useState, useRef, useEffect } from 'react';
import { generateAbletonGuideStream, transcribeAudio, editImage } from './services/geminiService';
import { Button } from './components/Button';
import { OutputDisplay } from './components/OutputDisplay';
import { Switch } from './components/Switch';
import { ChatMessage, Theme, SavedTemplate, UserPreferences, CustomTheme } from './types';

// Icons
const HistoryIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const TemplateIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>;
const ConfigIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const SendIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>;
const MicIcon = ({ active }: { active: boolean }) => <svg className={`w-5 h-5 ${active ? 'animate-pulse text-red-500' : ''}`} fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>;
const ImageIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [lastPrompt, setLastPrompt] = useState(''); 
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
  
  const [preferences, setPreferences] = useState<UserPreferences>({
      detailLevel: 'intermediate',
      deviceSuite: 'stock',
      creativity: 'standard',
      os: 'mac',
      liveVersion: '12',
      genre: 'general',
      tone: 'encouraging',
      outputLength: 'balanced',
      sentenceComplexity: 5,
      jargonLevel: 5,
      deviceExplanationDepth: 5,
      midiComplexity: 5,
      midiMusicality: 8,
      useEmojis: true,
      useAnalogies: true,
      showShortcuts: true,
      format: 'steps',
      includeTroubleshooting: false
  });

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

  const [isRecording, setIsRecording] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null); 
  const [isEditMode, setIsEditMode] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    if (response && bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [response]);

  useEffect(() => {
    if (theme === 'custom') {
       // Logic to re-apply custom theme active logic could go here
    } else {
        document.documentElement.setAttribute('data-theme', theme);
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

  useEffect(() => {
    localStorage.setItem('ableton-templates', JSON.stringify(templates));
  }, [templates]);

  const technoWorkflows = [
    { label: "Kick Rumble", icon: "🥁", prompt: "Create a detailed chain for a Techno Rumble Kick using Hybrid Reverb and Roar. Explain macro mappings for decay and distortion." },
    { label: "Polymetric Seq", icon: "🎼", prompt: "Explain how to set up a polymetric techno sequence using the new Live 12 MIDI Tools, mixing 4/4 kicks with 3/16 synth lines." },
    { label: "Dub Chords", icon: "🎹", prompt: "Design a classic Dub Techno chord rack using Analog, Echo, and Auto Filter. Focus on texture and feedback loops." },
    { label: "Indus. Distortion", icon: "🏭", prompt: "Create an industrial techno drum bus processing chain using Roar in Multiband mode and Drum Buss." },
    { label: "Hypnotic Bleeps", icon: "🌀", prompt: "Show me a workflow to generate hypnotic, evolving bleep loops using Note Echo, Random, and Scale Awareness." },
    { label: "Hardgroove", icon: "🔥", prompt: "Create a processing chain for 90s Hardgroove loops using Vocoder (noise mode) and Overdrive to add texture." }
  ];

  const advancedWorkflows = [
    { label: "REX Slicing", icon: "✂️", prompt: "Explain how to use 'Slice to New MIDI Track' to recreate the REX file workflow. Discuss preserving transients in Simpler." },
    { label: "Stem Remixing", icon: "🎤", prompt: "Provide a step-by-step guide on using Ableton Live 12's Stem Separation feature to isolate vocals, drums, bass, or other instruments from an audio clip. Include tips for cleaning up artifacts." },
    { label: "Generative MIDI", icon: "🤖", prompt: "Explain how to use Ableton Live 12's new MIDI Clip view features like 'Seed', 'Rhythm', and 'Shape' to generate melodic patterns. Also, detail how to use 'Scale Awareness' for musical results." }
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
    setLastPrompt(activePrompt);

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
        const newImageBase64 = await editImage(selectedImage, contextPrompt);
        setResponseImage(newImageBase64);
        setResponse("Here is your edited image based on the prompt.");
        setHistory(prev => [{ id: (Date.now() + 1).toString(), role: 'model', text: "Here is your edited image based on the prompt.", imageUrl: newImageBase64, timestamp: Date.now() }, ...prev]);
      } else {
        let accumulatedResponse = "";
        await generateAbletonGuideStream(contextPrompt, selectedImage, (chunk) => {
          accumulatedResponse += chunk;
          setResponse(accumulatedResponse);
        });
        setHistory(prev => [{ id: (Date.now() + 1).toString(), role: 'model', text: accumulatedResponse, timestamp: Date.now() }, ...prev]);
      }
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
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
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
    setShowHistory(false);
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

  const SidebarTabButton = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: React.FC<any>, label: string }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`flex-1 py-4 flex flex-col items-center justify-center gap-1 transition-all duration-200 border-b-2 ${activeTab === id ? 'border-ableton-accent text-ableton-text bg-ableton-panel/50' : 'border-transparent text-ableton-muted hover:text-ableton-text hover:bg-ableton-panel/30'}`}
    >
        <Icon />
        <span className="text-[10px] uppercase font-bold tracking-wider">{label}</span>
    </button>
  );

  return (
    <div className="h-screen bg-ableton-base text-ableton-text font-sans flex flex-col md:flex-row overflow-hidden transition-colors duration-300">
      
      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
           <div className="bg-ableton-surface border border-ableton-border shadow-2xl rounded-xl max-w-lg w-full p-6 relative">
              <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-ableton-muted hover:text-ableton-text">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <h2 className="text-xl font-bold text-ableton-accent mb-4">LiveWire Assistant Guide</h2>
              <div className="space-y-3 text-sm text-ableton-text">
                <p><strong>1. Prompting:</strong> Describe a sound or workflow. Use the "Quick Workflows" for instant results.</p>
                <p><strong>2. Audio/Image:</strong> Use the mic to ask questions or upload a screenshot of a device to get an explanation.</p>
                <p><strong>3. Config:</strong> Tune the AI's personality in the Config tab. Use "The Purist" for strict manuals.</p>
                <p><strong>4. Templates:</strong> Save useful responses to build your own library of techniques.</p>
              </div>
           </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
           <div className="bg-ableton-surface border border-ableton-border shadow-2xl rounded-xl max-w-2xl w-full p-6 flex flex-col max-h-[90vh]">
              <h3 className="text-lg font-bold text-ableton-text mb-4">Save Template</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-1">
                      <label className="text-xs text-ableton-muted uppercase tracking-wider font-bold">Template Name</label>
                      <input type="text" autoFocus value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-ableton-text focus:border-ableton-accent outline-none" placeholder="e.g. Techno Rumble" />
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs text-ableton-muted uppercase tracking-wider font-bold">Category</label>
                      <select value={newTemplateCategory} onChange={(e) => setNewTemplateCategory(e.target.value)} className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-ableton-text focus:border-ableton-accent outline-none">
                          <option value="Workflow">Workflow</option>
                          <option value="Effect Rack">Effect Rack</option>
                          <option value="Sound Design">Sound Design</option>
                      </select>
                  </div>
              </div>
              <textarea value={newTemplateContent} onChange={(e) => setNewTemplateContent(e.target.value)} className="flex-1 w-full bg-ableton-base border border-ableton-border rounded p-3 text-ableton-text font-mono text-xs focus:border-ableton-accent outline-none resize-none mb-4 min-h-[200px]" />
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setShowSaveModal(false)}>Cancel</Button>
                <Button onClick={saveTemplate} disabled={!newTemplateName.trim()}>Save Template</Button>
              </div>
           </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-ableton-surface border-r border-ableton-border transform transition-transform duration-300 md:relative md:translate-x-0 ${showHistory ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-2xl md:shadow-none`}>
        <div className="flex bg-ableton-base/50">
           <SidebarTabButton id="history" icon={HistoryIcon} label="History" />
           <SidebarTabButton id="templates" icon={TemplateIcon} label="Templates" />
           <SidebarTabButton id="config" icon={ConfigIcon} label="Config" />
        </div>

        <button onClick={() => setShowHistory(false)} className="md:hidden absolute top-3 right-3 text-ableton-muted p-2 rounded-full hover:bg-ableton-panel">
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="flex-1 overflow-y-auto p-3 scrollbar-hide">
          {activeTab === 'history' && (
             <div className="space-y-2">
                {history.filter(h => h.role === 'user').map((item) => (
                  <div key={item.id} onClick={() => loadFromHistory(item)} className="p-3 rounded-lg bg-ableton-panel hover:bg-ableton-border cursor-pointer transition-all border border-transparent hover:border-ableton-accent/30 group">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-ableton-muted font-mono">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        {item.imageUrl && <span className="text-[10px] bg-ableton-accent/20 text-ableton-accent px-1.5 py-0.5 rounded">IMG</span>}
                    </div>
                    <p className="text-sm truncate text-ableton-text group-hover:text-white">{item.text || "Image Analysis"}</p>
                  </div>
                ))}
                {history.length === 0 && <div className="p-8 text-center text-ableton-muted text-sm italic opacity-50">No history yet.</div>}
             </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-2">
               {templates.map((t) => (
                 <div key={t.id} className="bg-ableton-panel rounded-lg p-3 border border-ableton-border hover:border-ableton-accent/50 transition-all group relative overflow-hidden">
                    <div onClick={() => loadTemplate(t)} className="cursor-pointer relative z-10">
                      <div className="flex justify-between items-start">
                         <h4 className="text-sm font-semibold text-ableton-text group-hover:text-ableton-accent transition-colors truncate pr-2">{t.name}</h4>
                         {t.category && <span className="text-[9px] uppercase tracking-wider bg-black/20 px-1.5 py-0.5 rounded text-ableton-muted">{t.category}</span>}
                      </div>
                      <p className="text-[10px] text-ableton-muted mt-2 font-mono">ID: {t.id.slice(-4)}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }} className="absolute bottom-2 right-2 text-ableton-muted hover:text-red-400 z-20 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                 </div>
               ))}
               {templates.length === 0 && <div className="p-8 text-center text-ableton-muted text-sm italic opacity-50">No saved templates.</div>}
            </div>
          )}

          {activeTab === 'config' && (
             <div className="space-y-8 pb-10 px-1">
                <section>
                   <h3 className="text-xs font-bold text-ableton-muted uppercase tracking-widest mb-3 pl-1">Preset Modes</h3>
                   <div className="grid grid-cols-3 gap-2">
                      {['Purist', 'Experimental', 'Beginner'].map(mode => (
                          <button key={mode} onClick={() => applyConfigPreset(mode.toLowerCase())} className="bg-ableton-panel border border-ableton-border rounded-md py-2 text-[10px] font-bold uppercase hover:bg-ableton-accent hover:text-white hover:border-transparent transition-all">
                            {mode}
                          </button>
                      ))}
                   </div>
                </section>

                <section>
                    <h3 className="text-xs font-bold text-ableton-muted uppercase tracking-widest mb-3 pl-1">Response Style</h3>
                    <div className="space-y-4 bg-ableton-panel p-4 rounded-lg border border-ableton-border">
                        {[
                            { label: 'Complexity', key: 'sentenceComplexity' },
                            { label: 'Jargon', key: 'jargonLevel' },
                            { label: 'Depth', key: 'deviceExplanationDepth' }
                        ].map((item) => (
                            <div key={item.key} className="space-y-1">
                                <div className="flex justify-between text-[10px] text-ableton-muted uppercase font-bold">
                                    <span>{item.label}</span>
                                    <span className="text-ableton-accent">{(preferences as any)[item.key]}/10</span>
                                </div>
                                <input type="range" min="1" max="10" value={(preferences as any)[item.key]} onChange={(e) => setPreferences({...preferences, [item.key]: parseInt(e.target.value)})} className="w-full h-1.5 bg-ableton-base rounded-full appearance-none cursor-pointer accent-ableton-accent" />
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <h3 className="text-xs font-bold text-ableton-muted uppercase tracking-widest mb-3 pl-1 flex items-center justify-between">
                        <span>MIDI Generators</span>
                        <span className="text-[9px] bg-ableton-accent px-1.5 rounded text-white">v12</span>
                    </h3>
                    <div className="space-y-4 bg-ableton-panel p-4 rounded-lg border border-ableton-border">
                         {[
                            { label: 'Pattern Chaos', key: 'midiComplexity' },
                            { label: 'Musicality', key: 'midiMusicality' }
                        ].map((item) => (
                            <div key={item.key} className="space-y-1">
                                <div className="flex justify-between text-[10px] text-ableton-muted uppercase font-bold">
                                    <span>{item.label}</span>
                                    <span className="text-ableton-accent">{(preferences as any)[item.key]}/10</span>
                                </div>
                                <input type="range" min="1" max="10" value={(preferences as any)[item.key]} onChange={(e) => setPreferences({...preferences, [item.key]: parseInt(e.target.value)})} className="w-full h-1.5 bg-ableton-base rounded-full appearance-none cursor-pointer accent-ableton-accent" />
                            </div>
                        ))}
                    </div>
                </section>
                
                <section>
                   <h3 className="text-xs font-bold text-ableton-muted uppercase tracking-widest mb-3 pl-1">Themes</h3>
                   <div className="grid grid-cols-4 gap-2">
                     {availableThemes.map(t => (
                         <button key={t.id} onClick={() => setTheme(t.id)} className={`h-8 rounded-md border-2 transition-all ${theme === t.id ? 'border-ableton-accent scale-105' : 'border-transparent hover:scale-105'}`} style={{backgroundColor: t.color}} title={t.name} />
                     ))}
                     <button onClick={() => setIsCreatingTheme(!isCreatingTheme)} className="h-8 rounded-md border-2 border-dashed border-ableton-muted flex items-center justify-center text-ableton-muted hover:text-ableton-accent hover:border-ableton-accent transition-all">+</button>
                   </div>
                   {isCreatingTheme && (
                       <div className="mt-4 p-3 bg-ableton-panel rounded-lg border border-ableton-border space-y-3">
                           <input type="text" placeholder="Theme Name" value={newThemeName} onChange={(e) => setNewThemeName(e.target.value)} className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-xs text-ableton-text outline-none focus:border-ableton-accent" />
                           <div className="grid grid-cols-4 gap-2">
                               {['base', 'surface', 'text', 'accent'].map(k => (
                                   <div key={k} className="flex flex-col gap-1">
                                       <label className="text-[9px] uppercase text-ableton-muted">{k}</label>
                                       <input type="color" value={(newThemeDraft as any)[k]} onChange={e => setNewThemeDraft({...newThemeDraft, [k]: e.target.value})} className="w-full h-6 bg-transparent cursor-pointer rounded" />
                                   </div>
                               ))}
                           </div>
                           <Button onClick={saveCustomTheme} disabled={!newThemeName} className="w-full py-1 text-xs mt-2">Save</Button>
                       </div>
                   )}
                </section>
             </div>
          )}
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col relative">
        <header className="h-16 bg-ableton-surface/80 backdrop-blur-md border-b border-ableton-border flex items-center justify-between px-6 z-20 absolute top-0 left-0 right-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowHistory(true)} className="md:hidden text-ableton-muted hover:text-ableton-text">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="flex flex-col leading-none">
                <h1 className="text-lg font-bold tracking-tight text-ableton-text">LiveWire</h1>
                <span className="text-[10px] text-ableton-accent font-mono uppercase tracking-widest">Architect</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-[10px] font-mono text-ableton-muted bg-ableton-panel px-2 py-1 rounded border border-ableton-border hidden sm:block">Ableton Live {preferences.liveVersion}</div>
             <button onClick={() => setShowHelp(true)} className="text-ableton-muted hover:text-ableton-text transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pt-20 pb-40 px-4 md:px-8 scroll-smooth" ref={bottomRef}>
           {!response && !isGenerating && !responseImage ? (
             <div className="max-w-5xl mx-auto mt-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-12">
                    <h2 className="text-4xl md:text-5xl font-light text-ableton-text mb-4 tracking-tight">What are we building?</h2>
                    <p className="text-ableton-muted text-lg max-w-2xl mx-auto font-light">Select a workflow or describe your idea below.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-xs font-bold text-ableton-muted uppercase tracking-widest mb-4 border-b border-ableton-border pb-2">Techno Workflows</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {technoWorkflows.map((s, i) => (
                                <button key={i} onClick={() => { setPrompt(s.prompt); handleGenerate(s.prompt); }} className="text-left p-4 bg-ableton-panel border border-ableton-border hover:border-ableton-accent hover:bg-ableton-surface transition-all rounded-lg group shadow-sm hover:shadow-md">
                                    <span className="text-xl mb-2 block">{s.icon}</span>
                                    <span className="font-semibold text-sm text-ableton-text block mb-1 group-hover:text-ableton-accent">{s.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-ableton-muted uppercase tracking-widest mb-4 border-b border-ableton-border pb-2">Live 12 Advanced</h3>
                         <div className="flex flex-col gap-3">
                            {advancedWorkflows.map((s, i) => (
                                <button key={i} onClick={() => { setPrompt(s.prompt); handleGenerate(s.prompt); }} className="text-left p-4 bg-ableton-panel border border-ableton-border hover:border-ableton-accent hover:bg-ableton-surface transition-all rounded-lg flex items-center gap-4 group shadow-sm hover:shadow-md">
                                    <span className="text-2xl">{s.icon}</span>
                                    <div>
                                        <span className="font-semibold text-sm text-ableton-text block group-hover:text-ableton-accent">{s.label}</span>
                                        <span className="text-xs text-ableton-muted line-clamp-1">{s.prompt}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
             </div>
           ) : (
             <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex justify-end gap-2 opacity-0 hover:opacity-100 transition-opacity">
                    <Button variant="secondary" onClick={handleCopy} className="text-xs py-1 h-8">{copied ? 'Copied' : 'Copy'}</Button>
                    <Button variant="secondary" onClick={handleExport} className="text-xs py-1 h-8">Export</Button>
                    <Button variant="secondary" onClick={openSaveModal} className="text-xs py-1 h-8">Save</Button>
                </div>
                <OutputDisplay content={response} imageUrl={responseImage} isStreaming={isGenerating} />
                {lastPrompt && !isGenerating && (
                    <div className="flex justify-center gap-2 mt-4">
                        <button onClick={() => handleGenerate(lastPrompt, 'much_longer')} className="text-xs bg-ableton-panel px-3 py-1 rounded-full text-ableton-muted hover:text-ableton-text hover:bg-ableton-border transition-colors">More Detail</button>
                        <button onClick={() => handleGenerate(lastPrompt, 'short')} className="text-xs bg-ableton-panel px-3 py-1 rounded-full text-ableton-muted hover:text-ableton-text hover:bg-ableton-border transition-colors">Simplify</button>
                    </div>
                )}
             </div>
           )}
           <div className="h-24"></div> 
        </div>

        {/* Floating Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 pointer-events-none z-30 flex justify-center">
            <div className="w-full max-w-3xl bg-ableton-surface/90 backdrop-blur-xl border border-ableton-border shadow-2xl rounded-2xl p-2 pointer-events-auto flex flex-col gap-2 transition-all focus-within:ring-2 focus-within:ring-ableton-accent/50 focus-within:border-ableton-accent">
                
                {selectedImage && (
                    <div className="px-3 pt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                             <img src={`data:image/png;base64,${selectedImage}`} className="h-10 w-10 rounded object-cover border border-ableton-border" alt="Selected" />
                             <div className="flex flex-col">
                                <span className="text-xs font-bold text-ableton-text">Image Attached</span>
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="checkbox" checked={isEditMode} onChange={(e) => setIsEditMode(e.target.checked)} className="accent-ableton-accent w-3 h-3" />
                                    <span className="text-[10px] text-ableton-muted">Edit Mode</span>
                                </label>
                             </div>
                        </div>
                        <button onClick={() => {setSelectedImage(null); setIsEditMode(false)}} className="text-ableton-muted hover:text-red-400"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                )}

                <div className="flex items-end gap-2">
                    <div className="flex gap-1 pb-1 pl-1">
                         <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                         <Button variant="icon" onClick={() => fileInputRef.current?.click()} title="Upload Image"><ImageIcon /></Button>
                         <Button variant="icon" onClick={isRecording ? stopRecording : startRecording} title="Record Audio"><MicIcon active={isRecording} /></Button>
                    </div>
                    
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={selectedImage ? (isEditMode ? "Describe edits..." : "Ask about this image...") : "Ask LiveWire..."}
                        className="flex-1 bg-transparent border-none text-ableton-text placeholder-ableton-muted/50 focus:ring-0 resize-none py-3 px-2 max-h-32 min-h-[44px] text-sm leading-relaxed scrollbar-hide"
                        rows={1}
                    />

                    <Button 
                        onClick={() => handleGenerate()} 
                        disabled={!prompt.trim() && !selectedImage} 
                        isLoading={isGenerating}
                        className="rounded-xl h-10 w-10 !p-0 !min-w-0 bg-ableton-accent hover:bg-ableton-accent-hover text-white shadow-lg mb-1 mr-1 flex-shrink-0"
                    >
                        {!isGenerating && <SendIcon />}
                    </Button>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;