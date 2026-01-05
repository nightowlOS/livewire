import React, { useState, useRef, useEffect } from 'react';
import { generateAbletonGuideStream, transcribeAudio, editImage } from './services/geminiService';
import { Button } from './components/Button';
import { OutputDisplay } from './components/OutputDisplay';
import { Switch } from './components/Switch';
import { ChatMessage, Theme, SavedTemplate, UserPreferences, CustomTheme, ShortcutMap } from './types';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [lastPrompt, setLastPrompt] = useState(''); 
  const [isGenerating, setIsGenerating] = useState(false);
  const [response, setResponse] = useState('');
  const [responseImage, setResponseImage] = useState<string | undefined>(undefined);
  
  // History & Undo/Redo
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [redoStack, setRedoStack] = useState<ChatMessage[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Export State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'md' | 'txt' | 'html' | 'docx' | 'pdf'>('md');
  const [exportThemeId, setExportThemeId] = useState<string>('dark');
  
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
  
  // Shortcuts
  const [shortcuts, setShortcuts] = useState<ShortcutMap>(() => {
      try {
          const saved = localStorage.getItem('ableton-shortcuts');
          return saved ? JSON.parse(saved) : {
              generate: 'Enter',
              undo: 'z',
              redo: 'y',
              tabHistory: '1',
              tabTemplates: '2',
              tabTools: '3',
              tabSettings: '4'
          };
      } catch {
          return {
              generate: 'Enter',
              undo: 'z',
              redo: 'y',
              tabHistory: '1',
              tabTemplates: '2',
              tabTools: '3',
              tabSettings: '4'
          };
      }
  });
  const [recordingShortcut, setRecordingShortcut] = useState<keyof ShortcutMap | null>(null);

  // MIDI Tool State
  const [midiTarget, setMidiTarget] = useState<'general' | 'techno_bass' | 'atmos_pad' | 'glitch_drums'>('general');
  const [midiHumanization, setMidiHumanization] = useState(0); // 0-100
  const [midiStructure, setMidiStructure] = useState('Main Loop');

  // Arrangement Tool State
  const [arrangeGenre, setArrangeGenre] = useState('Techno');
  const [arrangeEnergy, setArrangeEnergy] = useState('Peak Time');
  const [arrangeVarIntro, setArrangeVarIntro] = useState(false);
  const [arrangeVarDrop, setArrangeVarDrop] = useState(true);
  const [arrangeVarBreakdown, setArrangeVarBreakdown] = useState(false);
  const [arrangeVarOutro, setArrangeVarOutro] = useState(false);
  
  // Effect Chain Tool State
  const [effectTarget, setEffectTarget] = useState('Distortion');
  const [effectGenre, setEffectGenre] = useState('Techno');

  // Documentation Tool State
  const [docType, setDocType] = useState<'user_manual' | 'dev_specs'>('user_manual');

  // Theme Creator
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

  // Tabs now include 'tools' for MIDI
  const [activeTab, setActiveTab] = useState<'history' | 'templates' | 'tools' | 'settings'>('history');
  
  // Help Modal
  const [showHelp, setShowHelp] = useState(false);
  const [helpTab, setHelpTab] = useState<'guide' | 'shortcuts'>('guide');

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

  // Templates
  const [templates, setTemplates] = useState<SavedTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('ableton-templates');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('Workflow');

  // Media
  const [isRecording, setIsRecording] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionInputRef = useRef<HTMLInputElement>(null);

  // Apply theme
  useEffect(() => {
    if (theme === 'custom') {
       const activeCustom = customThemes.find(c => c.id === exportThemeId) || customThemes[0];
       if(activeCustom) applyCustomTheme(activeCustom);
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
    setExportThemeId(theme === 'custom' ? (customThemes[0]?.id || 'dark') : theme);
  }, [theme]);

  // Global Key Listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
        // Avoid triggering shortcuts when typing in inputs
        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

        // Custom Recording Logic
        if (recordingShortcut) return;

        const key = e.key.toLowerCase();
        
        if (key === shortcuts.undo.toLowerCase() && (e.ctrlKey || e.metaKey)) {
             e.preventDefault();
             handleUndo();
        } else if (key === shortcuts.redo.toLowerCase() && (e.ctrlKey || e.metaKey)) {
             e.preventDefault();
             handleRedo();
        } else if (key === shortcuts.tabHistory.toLowerCase()) setActiveTab('history');
        else if (key === shortcuts.tabTemplates.toLowerCase()) setActiveTab('templates');
        else if (key === shortcuts.tabTools.toLowerCase()) setActiveTab('tools');
        else if (key === shortcuts.tabSettings.toLowerCase()) setActiveTab('settings');
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [shortcuts, history, redoStack, recordingShortcut]);

  // Persist Shortcuts
  useEffect(() => {
      localStorage.setItem('ableton-shortcuts', JSON.stringify(shortcuts));
  }, [shortcuts]);

  const applyCustomTheme = (customTheme: CustomTheme) => {
    setTheme('custom');
    document.documentElement.removeAttribute('data-theme');
    const c = customTheme.colors;
    const style = document.documentElement.style;
    style.setProperty('--color-base', c.base);
    style.setProperty('--color-surface', c.surface);
    style.setProperty('--color-panel', c.panel);
    style.setProperty('--color-border', c.border);
    style.setProperty('--color-text', c.text);
    style.setProperty('--color-muted', c.muted);
    style.setProperty('--color-accent', c.accent);
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

  // Persist Templates
  useEffect(() => {
    localStorage.setItem('ableton-templates', JSON.stringify(templates));
  }, [templates]);

  // Session Management
  const handleUndo = () => {
      if (history.length < 2) return;
      const newHistory = [...history];
      const modelMsg = newHistory.shift();
      const userMsg = newHistory.shift();
      
      if (modelMsg && userMsg) {
          setRedoStack(prev => [modelMsg, userMsg, ...prev]);
          setHistory(newHistory);
          if (history.length === 2) { 
              setResponse('');
              setResponseImage(undefined);
          } else {
              const prevModel = newHistory[0];
              if (prevModel && prevModel.role === 'model') {
                  setResponse(prevModel.text);
                  setResponseImage(prevModel.imageUrl);
              }
          }
          setPrompt(userMsg.text);
      }
  };

  const handleRedo = () => {
      if (redoStack.length < 2) return;
      const newRedo = [...redoStack];
      const modelMsg = newRedo.shift();
      const userMsg = newRedo.shift();

      if (modelMsg && userMsg) {
          setHistory(prev => [modelMsg, userMsg, ...prev]);
          setRedoStack(newRedo);
          setResponse(modelMsg.text);
          setResponseImage(modelMsg.imageUrl);
      }
  };

  const handleSaveSession = () => {
      const sessionData = {
          date: new Date().toISOString(),
          history,
          preferences,
          templates,
          theme,
          customThemes
      };
      const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `livewire-session-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleLoadSession = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
          try {
              const data = JSON.parse(ev.target?.result as string);
              if (data.history) setHistory(data.history);
              if (data.preferences) setPreferences(data.preferences);
              if (data.templates) setTemplates(data.templates);
              if (data.theme) setTheme(data.theme);
              if (data.customThemes) setCustomThemes(data.customThemes);
              alert("Session loaded successfully!");
          } catch (err) {
              console.error(err);
              alert("Failed to load session. Invalid file.");
          }
      };
      reader.readAsText(file);
  };

  // Workflows
  const technoWorkflows = [
    { label: "Kick Rumble Generator", prompt: "Create a detailed chain for a Techno Rumble Kick using Hybrid Reverb and Roar. Explain macro mappings for decay and distortion." },
    { label: "Polymetric Sequencer", prompt: "Explain how to set up a polymetric techno sequence using the new Live 12 MIDI Tools, mixing 4/4 kicks with 3/16 synth lines." },
    { label: "Dub Techno Chord Rack", prompt: "Design a classic Dub Techno chord rack using Analog, Echo, and Auto Filter. Focus on texture and feedback loops." },
    { label: "Industrial Distortion Bus", prompt: "Create an industrial techno drum bus processing chain using Roar in Multiband mode and Drum Buss." },
    { label: "Hypnotic Bleep Loop", prompt: "Show me a workflow to generate hypnotic, evolving bleep loops using Note Echo, Random, and Scale Awareness." },
    { label: "Hardgroove Percussion", prompt: "Create a processing chain for 90s Hardgroove loops using Vocoder (noise mode) and Overdrive to add texture." }
  ];

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

  const getSmartSuggestions = (currentPrompt: string) => {
      const p = currentPrompt.toLowerCase();
      const suggestions = [];

      if (p.includes('bass') || p.includes('rumble') || p.includes('kick')) {
          suggestions.push("Add Sidechain Compression");
          suggestions.push("Create Sub-Bass Layer");
          suggestions.push("Apply Saturation (Roar)");
      } else if (p.includes('pad') || p.includes('ambient') || p.includes('atmosphere')) {
          suggestions.push("Add Shimmer Reverb");
          suggestions.push("Modulate with LFO");
          suggestions.push("Layer with Granular Texture");
      } else if (p.includes('drum') || p.includes('percussion') || p.includes('beat')) {
          suggestions.push("Apply Parallel Compression");
          suggestions.push("Add Swing/Groove");
          suggestions.push("Process with Drum Buss");
      } else {
          suggestions.push("Explain the Signal Flow");
          suggestions.push("Suggest Macro Mappings");
          suggestions.push("Create Audio Effect Rack");
      }
      return suggestions;
  };

  const handleGenerate = async (textToUse?: string, modifier?: string) => {
    const activePrompt = textToUse || prompt;
    if (!activePrompt.trim() && !selectedImage) return;

    setRedoStack([]); // Clear redo on new action

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
    - Humanization: ${midiHumanization}%
    - Structure Context: ${midiStructure}
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

        const modelMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: "Here is your edited image based on the prompt.",
            imageUrl: newImageBase64,
            timestamp: Date.now()
        };
        setHistory(prev => [modelMsg, ...prev]);

      } else {
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
    if (e.key === shortcuts.generate && !e.shiftKey) {
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

  // Export Logic
  const standardThemeColors: Record<string, any> = {
      dark: { base: '#1a1a1a', text: '#d9d9d9', accent: '#ff764d', surface: '#222222' },
      light: { base: '#f3f3f3', text: '#1a1a1a', accent: '#ff764d', surface: '#e6e6e6' },
      live9: { base: '#dcdcdc', text: '#111111', accent: '#00a0ff', surface: '#c0c0c0' },
      vaporwave: { base: '#180d26', text: '#ff99e6', accent: '#00f2ff', surface: '#24123b' },
      matrix: { base: '#000000', text: '#00ff00', accent: '#00ff00', surface: '#0a0a0a' },
      rust: { base: '#1c1917', text: '#e7e5e4', accent: '#ea580c', surface: '#292524' },
      ocean: { base: '#0f172a', text: '#e2e8f0', accent: '#38bdf8', surface: '#1e293b' },
  };

  const simpleMarkdownToHtml = (md: string) => {
      let html = md
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
        .replace(/`(.*?)`/gim, '<code>$1</code>')
        .replace(/\n/gim, '<br />');
      return html;
  };

  const performExport = () => {
    let content = response;
    let mimeType = 'text/markdown';
    let extension = 'md';
    let colors = standardThemeColors[exportThemeId];
    if (!colors) {
        const custom = customThemes.find(c => c.id === exportThemeId);
        if (custom) colors = custom.colors;
        else colors = standardThemeColors['dark'];
    }

    if (exportFormat === 'txt') {
        mimeType = 'text/plain';
        extension = 'txt';
        content = content.replace(/\*\*/g, '').replace(/###/g, '').replace(/##/g, '').replace(/`/g, '');
    } else if (['html', 'pdf', 'docx'].includes(exportFormat)) {
        const htmlBody = simpleMarkdownToHtml(response);
        const fullHtml = `<!DOCTYPE html><html><head><style>
            body { background: ${colors.base}; color: ${colors.text}; font-family: sans-serif; padding: 3rem; max-width: 800px; margin: 0 auto; line-height: 1.6; }
            h1, h2, h3 { color: ${colors.accent}; margin-top: 2rem; border-bottom: 1px solid ${colors.surface}; padding-bottom: 0.5rem; }
            code { background: ${colors.surface}; color: ${colors.accent}; padding: 2px 5px; border-radius: 4px; font-family: monospace; }
            strong { color: ${colors.text}; font-weight: 800; }
            em { color: ${colors.accent}; font-style: italic; }
            blockquote { border-left: 4px solid ${colors.accent}; margin: 1.5rem 0; padding-left: 1rem; font-style: italic; opacity: 0.8; }
        </style></head><body>${htmlBody}</body></html>`;
        
        content = fullHtml;

        if (exportFormat === 'html') {
            mimeType = 'text/html';
            extension = 'html';
        } else if (exportFormat === 'docx') {
             mimeType = 'application/vnd.ms-word';
             extension = 'doc'; 
        } else if (exportFormat === 'pdf') {
             const printWindow = window.open('', '_blank', 'width=800,height=900');
             if (printWindow) {
                 printWindow.document.write(content);
                 printWindow.document.close();
                 printWindow.focus();
                 setTimeout(() => {
                     printWindow.print();
                     printWindow.close();
                 }, 500);
             } else {
                 alert("Please allow popups to print to PDF.");
             }
             setShowExportModal(false);
             return;
        }
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ableton-guide-${new Date().toISOString().slice(0, 10)}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const handleCopy = async () => {
    if (!response) return;
    try {
        await navigator.clipboard.writeText(response);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    } catch (err) { console.error('Failed to copy:', err); }
  };

  const handleRecordShortcut = (action: keyof ShortcutMap) => {
      setRecordingShortcut(action);
  };

  // Listener for recording a new shortcut
  useEffect(() => {
      if (!recordingShortcut) return;
      
      const handler = (e: KeyboardEvent) => {
          e.preventDefault();
          const key = e.key;
          // You might want to handle modifiers properly here, but for simplicity:
          setShortcuts(prev => ({...prev, [recordingShortcut]: key}));
          setRecordingShortcut(null);
      };
      
      window.addEventListener('keydown', handler, {once: true});
      return () => window.removeEventListener('keydown', handler);
  }, [recordingShortcut]);


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
           <div className="bg-ableton-surface border border-ableton-border shadow-2xl rounded-lg max-w-lg w-full p-0 flex flex-col relative overflow-hidden">
              <div className="p-4 border-b border-ableton-border bg-ableton-panel flex justify-between items-center">
                 <h2 className="text-lg font-bold text-ableton-text">LiveWire Help</h2>
                 <button onClick={() => setShowHelp(false)} className="text-ableton-muted hover:text-ableton-text">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
              
              <div className="flex border-b border-ableton-border">
                  <button onClick={() => setHelpTab('guide')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${helpTab === 'guide' ? 'bg-ableton-base text-ableton-accent border-b-2 border-ableton-accent' : 'bg-ableton-panel text-ableton-muted'}`}>Guide</button>
                  <button onClick={() => setHelpTab('shortcuts')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${helpTab === 'shortcuts' ? 'bg-ableton-base text-ableton-accent border-b-2 border-ableton-accent' : 'bg-ableton-panel text-ableton-muted'}`}>Shortcuts</button>
              </div>

              <div className="p-6 h-80 overflow-y-auto">
                 {helpTab === 'guide' && (
                     <div className="space-y-4 text-sm text-ableton-text">
                        <p><strong>1. Text Prompts:</strong> Ask for sound design recipes (e.g., "Create a dubstep wobble bass").</p>
                        <p><strong>2. Audio Input:</strong> Click the mic to speak your request or record a sound to describe.</p>
                        <p><strong>3. Image Analysis:</strong> Upload a screenshot of a plugin or VST and ask "What is this setting?"</p>
                        <p><strong>4. Image Editing:</strong> Upload an image, check "Edit Mode", and prompt to modify it.</p>
                        <p><strong>5. Tools & Config:</strong> Use the sidebar to access MIDI Tools or configure the AI's personality.</p>
                     </div>
                 )}
                 {helpTab === 'shortcuts' && (
                     <div className="space-y-2 text-sm">
                         {Object.entries(shortcuts).map(([key, value]) => (
                             <div key={key} className="flex justify-between border-b border-ableton-border pb-1">
                                 <span className="capitalize">{key.replace('tab', 'Switch to ')}</span>
                                 <code className="text-ableton-accent">{value}</code>
                             </div>
                         ))}
                     </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
           <div className="bg-ableton-surface border border-ableton-border shadow-2xl rounded-lg max-w-md w-full p-6 flex flex-col">
              <h3 className="text-lg font-bold text-ableton-text mb-4">Export Guide</h3>
              <div className="space-y-4 mb-6">
                 <div className="space-y-2">
                    <label className="text-xs text-ableton-muted uppercase tracking-wider font-bold">Format</label>
                    <div className="grid grid-cols-2 gap-2">
                        {['md', 'txt', 'html', 'docx', 'pdf'].map(fmt => (
                            <button
                                key={fmt}
                                onClick={() => setExportFormat(fmt as any)}
                                className={`text-sm py-2 px-3 rounded border transition-colors uppercase font-bold tracking-wide ${exportFormat === fmt ? 'bg-ableton-accent text-white border-ableton-accent' : 'bg-ableton-base text-ableton-muted border-ableton-border hover:border-ableton-accent'}`}
                            >
                                {fmt}
                            </button>
                        ))}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs text-ableton-muted uppercase tracking-wider font-bold">Export Theme</label>
                    <select 
                       value={exportThemeId}
                       onChange={(e) => setExportThemeId(e.target.value)}
                       className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-sm text-ableton-text focus:outline-none focus:border-ableton-accent"
                    >
                       {availableThemes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                       {customThemes.map(t => <option key={t.id} value={t.id}>{t.name} (Custom)</option>)}
                    </select>
                 </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setShowExportModal(false)}>Cancel</Button>
                <Button onClick={performExport}>Download</Button>
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

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-ableton-surface border-r border-ableton-border transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${showHistory ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        {/* Brand Area */}
        <div className="h-16 flex items-center px-4 border-b border-ableton-border bg-ableton-surface flex-shrink-0">
             <div className="w-8 h-8 bg-ableton-accent rounded-sm flex items-center justify-center shadow-lg mr-3">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 2v20h2V2H6zm4 0v20h2V2h-2zm4 0v20h2V2h-2zm4 0v20h2V2h-2z"/></svg>
            </div>
            <div>
                 <h1 className="text-lg font-bold tracking-tight text-ableton-text leading-none">LiveWire</h1>
                 <span className="text-[10px] text-ableton-muted uppercase tracking-wider font-semibold">Ableton Architect</span>
            </div>
        </div>

        {/* Sidebar Tabs */}
        <div className="p-0 border-b border-ableton-border grid grid-cols-4 bg-ableton-panel">
           {['history', 'templates', 'tools', 'settings'].map((tab) => (
               <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`p-3 flex items-center justify-center transition-colors border-b-2 ${activeTab === tab ? 'bg-ableton-base text-ableton-accent border-ableton-accent' : 'text-ableton-muted border-transparent hover:text-ableton-text'}`}
                title={tab.charAt(0).toUpperCase() + tab.slice(1)}
               >
                 {tab === 'history' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                 {tab === 'templates' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                 {tab === 'tools' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 3-2 3-2zm0 0v-8" /></svg>}
                 {tab === 'settings' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
               </button>
           ))}
        </div>

        <button onClick={() => setShowHistory(false)} className="md:hidden absolute top-3 right-3 text-ableton-muted">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {activeTab === 'history' && (
             <div className="space-y-2">
                {history.filter(h => h.role === 'user').map((item) => (
                  <div key={item.id} onClick={() => loadFromHistory(item)} className="p-3 rounded bg-ableton-panel hover:bg-ableton-border cursor-pointer transition-colors text-xs border-l-2 border-transparent hover:border-ableton-accent truncate flex items-center justify-between group">
                    <span className="truncate group-hover:text-white">{item.text || "(Image)"}</span>
                  </div>
                ))}
                {history.length === 0 && <div className="p-4 text-xs text-ableton-muted text-center italic mt-10">No sessions recorded.</div>}
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
                        <button onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }} className="text-xs text-ableton-muted hover:text-red-400 flex items-center gap-1">Delete</button>
                    </div>
                 </div>
               )) : (
                 <div className="p-4 text-xs text-ableton-muted text-center italic mt-10">No saved templates.</div>
               )}
            </div>
          )}

          {activeTab === 'tools' && (
              <div className="space-y-6">
                 {/* MIDI Generator Tool */}
                 <div className="space-y-3">
                     <h3 className="text-xs font-bold text-ableton-accent uppercase tracking-wider border-b border-ableton-border pb-1">MIDI Pattern Generator</h3>
                     <p className="text-[10px] text-ableton-muted leading-tight">Generate prompt commands for Live 12's transformation tools.</p>
                     
                     <div className="space-y-3 bg-ableton-panel p-3 rounded border border-ableton-border">
                        <div className="space-y-1">
                             <div className="flex justify-between text-[10px] text-ableton-muted uppercase"><span>Target Context</span></div>
                             <select 
                                value={midiTarget}
                                onChange={(e) => setMidiTarget(e.target.value as any)}
                                className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-xs text-ableton-text focus:outline-none focus:border-ableton-accent"
                             >
                                 <option value="general">General</option>
                                 <option value="techno_bass">Dark Techno Bassline</option>
                                 <option value="atmos_pad">Atmospheric Pads</option>
                                 <option value="glitch_drums">Glitch/IDM Drums</option>
                             </select>
                        </div>
                        <div className="space-y-1">
                             <div className="flex justify-between text-[10px] text-ableton-muted uppercase"><span>Structure Context</span></div>
                             <select 
                                value={midiStructure}
                                onChange={(e) => setMidiStructure(e.target.value)}
                                className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-xs text-ableton-text focus:outline-none focus:border-ableton-accent"
                             >
                                 <option value="Intro">Intro (Sparse)</option>
                                 <option value="Build-up">Build-up (Rising)</option>
                                 <option value="Drop">Drop (Main)</option>
                                 <option value="Breakdown">Breakdown (Atmospheric)</option>
                             </select>
                        </div>
                        <div className="space-y-1">
                             <div className="flex justify-between text-[10px] text-ableton-muted uppercase"><span>Complexity</span><span>{preferences.midiComplexity}/10</span></div>
                             <input type="range" min="1" max="10" value={preferences.midiComplexity} onChange={(e) => setPreferences({...preferences, midiComplexity: parseInt(e.target.value)})} className="w-full h-1 bg-ableton-base rounded-lg appearance-none cursor-pointer accent-ableton-accent"/>
                        </div>
                        <div className="space-y-1">
                             <div className="flex justify-between text-[10px] text-ableton-muted uppercase"><span>Musicality</span><span>{preferences.midiMusicality}/10</span></div>
                             <input type="range" min="1" max="10" value={preferences.midiMusicality} onChange={(e) => setPreferences({...preferences, midiMusicality: parseInt(e.target.value)})} className="w-full h-1 bg-ableton-base rounded-lg appearance-none cursor-pointer accent-ableton-accent"/>
                        </div>
                        <div className="space-y-1">
                             <div className="flex justify-between text-[10px] text-ableton-muted uppercase"><span>Humanization</span><span>{midiHumanization}%</span></div>
                             <input type="range" min="0" max="100" value={midiHumanization} onChange={(e) => setMidiHumanization(parseInt(e.target.value))} className="w-full h-1 bg-ableton-base rounded-lg appearance-none cursor-pointer accent-ableton-accent"/>
                        </div>
                        <Button 
                            className="w-full text-xs py-2 mt-2"
                            onClick={() => {
                                let contextText = "";
                                if (midiTarget === 'techno_bass') contextText = "Dark Techno Basslines";
                                else if (midiTarget === 'atmos_pad') contextText = "Atmospheric Pads";
                                else if (midiTarget === 'glitch_drums') contextText = "Glitch and IDM Drum Patterns";
                                
                                const toolPrompt = `Generate a detailed guide using Live 12's 'Seed', 'Rhythm', and 'Shape' generators specifically for ${contextText || 'creative patterns'}. 
                                Context: ${midiStructure}. 
                                Complexity: ${preferences.midiComplexity}/10, Musicality: ${preferences.midiMusicality}/10. 
                                Humanization: ${midiHumanization}% (Explain how to use Velocity and Chance tools for this).`;
                                setPrompt(toolPrompt);
                                handleGenerate(toolPrompt);
                            }}
                        >
                            Generate MIDI Guide
                        </Button>
                     </div>
                 </div>

                 {/* Arrangement Architect Tool */}
                 <div className="space-y-3">
                     <h3 className="text-xs font-bold text-ableton-accent uppercase tracking-wider border-b border-ableton-border pb-1">Arrangement Architect</h3>
                     <div className="space-y-3 bg-ableton-panel p-3 rounded border border-ableton-border">
                        <div className="space-y-1">
                           <div className="flex justify-between text-[10px] text-ableton-muted uppercase"><span>Genre</span></div>
                           <select value={arrangeGenre} onChange={(e) => setArrangeGenre(e.target.value)} className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-xs text-ableton-text">
                              <option value="Techno">Techno</option>
                              <option value="House">House</option>
                              <option value="DnB">Drum & Bass</option>
                              <option value="Ambient">Ambient</option>
                              <option value="Pop">Pop / Structure</option>
                           </select>
                        </div>
                        <div className="space-y-1">
                           <div className="flex justify-between text-[10px] text-ableton-muted uppercase"><span>Energy Curve</span></div>
                           <select value={arrangeEnergy} onChange={(e) => setArrangeEnergy(e.target.value)} className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-xs text-ableton-text">
                              <option value="Peak Time">Peak Time (High Energy)</option>
                              <option value="Deep">Deep / Hypnotic</option>
                              <option value="Radio">Radio Edit (Short)</option>
                           </select>
                        </div>
                        
                        {/* Variations Selection */}
                        <div className="space-y-2 mt-2 pt-2 border-t border-ableton-border">
                            <div className="text-[10px] text-ableton-muted uppercase">Generate Variations</div>
                            <div className="grid grid-cols-2 gap-2">
                                <label className="flex items-center gap-2 cursor-pointer bg-ableton-base p-1.5 rounded border border-ableton-border hover:border-ableton-muted transition-colors">
                                    <input type="checkbox" checked={arrangeVarIntro} onChange={(e) => setArrangeVarIntro(e.target.checked)} className="accent-ableton-accent w-3 h-3" />
                                    <span className="text-[10px] text-ableton-text">Intro</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer bg-ableton-base p-1.5 rounded border border-ableton-border hover:border-ableton-muted transition-colors">
                                    <input type="checkbox" checked={arrangeVarBreakdown} onChange={(e) => setArrangeVarBreakdown(e.target.checked)} className="accent-ableton-accent w-3 h-3" />
                                    <span className="text-[10px] text-ableton-text">Breakdown</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer bg-ableton-base p-1.5 rounded border border-ableton-border hover:border-ableton-muted transition-colors">
                                    <input type="checkbox" checked={arrangeVarDrop} onChange={(e) => setArrangeVarDrop(e.target.checked)} className="accent-ableton-accent w-3 h-3" />
                                    <span className="text-[10px] text-ableton-text">Drop (Main)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer bg-ableton-base p-1.5 rounded border border-ableton-border hover:border-ableton-muted transition-colors">
                                    <input type="checkbox" checked={arrangeVarOutro} onChange={(e) => setArrangeVarOutro(e.target.checked)} className="accent-ableton-accent w-3 h-3" />
                                    <span className="text-[10px] text-ableton-text">Outro</span>
                                </label>
                            </div>
                        </div>

                        <Button 
                            className="w-full text-xs py-2 mt-2"
                            onClick={() => {
                                const vars = [];
                                if (arrangeVarIntro) vars.push("Intro (e.g. rhythmic start vs atmospheric)");
                                if (arrangeVarBreakdown) vars.push("Breakdown (e.g. harmonic shift vs stripping back)");
                                if (arrangeVarDrop) vars.push("Drop/Chorus (e.g. variation in energy or rhythm)");
                                if (arrangeVarOutro) vars.push("Outro (e.g. abrupt stop vs long fade)");
                                
                                const varInstruction = vars.length > 0 
                                    ? `\n\n**Requested Variations**: Provide alternative arrangement ideas for the following sections:\n- ${vars.join('\n- ')}` 
                                    : "";

                                const toolPrompt = `Create a complete arrangement structure guide for a ${arrangeGenre} track with a ${arrangeEnergy} vibe. 
                                Break it down into sections (Intro, Verse/Build, Drop/Chorus, etc.) with **specific bar counts**. 
                                **Crucial**: Include specific transition ideas (automation curves, FX fills) between each section.${varInstruction}`;
                                setPrompt(toolPrompt);
                                handleGenerate(toolPrompt);
                            }}
                        >
                            Generate Arrangement
                        </Button>
                     </div>
                 </div>

                 {/* Audio Effect Chain Generator */}
                 <div className="space-y-3">
                     <h3 className="text-xs font-bold text-ableton-accent uppercase tracking-wider border-b border-ableton-border pb-1">Audio Effect Rack</h3>
                     <div className="space-y-3 bg-ableton-panel p-3 rounded border border-ableton-border">
                        <div className="space-y-1">
                           <div className="flex justify-between text-[10px] text-ableton-muted uppercase"><span>Effect Target</span></div>
                           <select value={effectTarget} onChange={(e) => setEffectTarget(e.target.value)} className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-xs text-ableton-text">
                              <option value="Distortion">Distortion / Saturation</option>
                              <option value="Space">Reverb / Space / Atmosphere</option>
                              <option value="Modulation">Modulation / Movement</option>
                              <option value="Glitch">Glitch / Lo-Fi</option>
                              <option value="Dynamics">Dynamics / Bus Processing</option>
                           </select>
                        </div>
                        <div className="space-y-1">
                           <div className="flex justify-between text-[10px] text-ableton-muted uppercase"><span>Genre Context</span></div>
                           <select value={effectGenre} onChange={(e) => setEffectGenre(e.target.value)} className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-xs text-ableton-text">
                              <option value="Techno">Techno</option>
                              <option value="House">House</option>
                              <option value="Ambient">Ambient</option>
                              <option value="Experimental">Experimental</option>
                              <option value="HipHop">Hip Hop / Trap</option>
                           </select>
                        </div>
                        <Button 
                            className="w-full text-xs py-2 mt-2"
                            onClick={() => {
                                const toolPrompt = `Design a comprehensive Audio Effect Rack for **${effectTarget}** suitable for **${effectGenre}**. 
                                List the devices in order. Explain the Macro mappings (8 Macros) in detail.`;
                                setPrompt(toolPrompt);
                                handleGenerate(toolPrompt);
                            }}
                        >
                            Generate Effect Chain
                        </Button>
                     </div>
                 </div>
                 
                 {/* Stem Separation Helper */}
                 <div className="space-y-3">
                     <h3 className="text-xs font-bold text-ableton-accent uppercase tracking-wider border-b border-ableton-border pb-1">Stem Splitter</h3>
                      <Button 
                            variant="secondary"
                            className="w-full text-xs py-2"
                            onClick={() => {
                                const toolPrompt = "Guide me through splitting audio into stems using Live 12's Stem Separation feature, focusing on artifact removal.";
                                setPrompt(toolPrompt);
                                handleGenerate(toolPrompt);
                            }}
                        >
                            Start Stem Separation
                        </Button>
                 </div>
              </div>
          )}

          {activeTab === 'settings' && (
             <div className="space-y-6 pb-24">
                <div className="space-y-3">
                   <h3 className="text-xs font-bold text-ableton-muted uppercase tracking-wider">Quick Config</h3>
                   <div className="flex gap-2">
                      <button onClick={() => applyConfigPreset('purist')} className="flex-1 bg-ableton-panel border border-ableton-border rounded px-2 py-2 text-[10px] hover:bg-ableton-surface hover:text-ableton-accent transition-colors">Purist</button>
                      <button onClick={() => applyConfigPreset('experimental')} className="flex-1 bg-ableton-panel border border-ableton-border rounded px-2 py-2 text-[10px] hover:bg-ableton-surface hover:text-ableton-accent transition-colors">Experimental</button>
                      <button onClick={() => applyConfigPreset('beginner')} className="flex-1 bg-ableton-panel border border-ableton-border rounded px-2 py-2 text-[10px] hover:bg-ableton-surface hover:text-ableton-accent transition-colors">Beginner</button>
                   </div>
                </div>

                <div className="space-y-4 border-t border-ableton-border pt-4">
                    <h3 className="text-xs font-bold text-ableton-muted uppercase tracking-wider">System & Environment</h3>
                    <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1">
                            <label className="text-[10px] text-ableton-muted uppercase block">Ableton Version</label>
                            <select 
                                value={preferences.liveVersion} 
                                onChange={(e) => setPreferences({...preferences, liveVersion: e.target.value as any})}
                                className="w-full bg-ableton-panel border border-ableton-border rounded p-2 text-xs text-ableton-text focus:outline-none focus:border-ableton-accent"
                            >
                                <option value="12">Live 12</option>
                                <option value="11">Live 11</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-ableton-muted uppercase block">Operating System</label>
                            <select 
                                value={preferences.os} 
                                onChange={(e) => setPreferences({...preferences, os: e.target.value as any})}
                                className="w-full bg-ableton-panel border border-ableton-border rounded p-2 text-xs text-ableton-text focus:outline-none focus:border-ableton-accent"
                            >
                                <option value="mac">macOS</option>
                                <option value="windows">Windows</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 border-t border-ableton-border pt-4">
                    <h3 className="text-xs font-bold text-ableton-muted uppercase tracking-wider">Fine-Tuning</h3>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-ableton-muted uppercase"><span>Sentence Complexity</span><span>{preferences.sentenceComplexity}/10</span></div>
                            <input type="range" min="1" max="10" value={preferences.sentenceComplexity} onChange={(e) => setPreferences({...preferences, sentenceComplexity: parseInt(e.target.value)})} className="w-full h-1 bg-ableton-panel rounded-lg appearance-none cursor-pointer accent-ableton-accent"/>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-ableton-muted uppercase"><span>Jargon</span><span>{preferences.jargonLevel}/10</span></div>
                            <input type="range" min="1" max="10" value={preferences.jargonLevel} onChange={(e) => setPreferences({...preferences, jargonLevel: parseInt(e.target.value)})} className="w-full h-1 bg-ableton-panel rounded-lg appearance-none cursor-pointer accent-ableton-accent"/>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-ableton-muted uppercase"><span>Depth</span><span>{preferences.deviceExplanationDepth}/10</span></div>
                            <input type="range" min="1" max="10" value={preferences.deviceExplanationDepth} onChange={(e) => setPreferences({...preferences, deviceExplanationDepth: parseInt(e.target.value)})} className="w-full h-1 bg-ableton-panel rounded-lg appearance-none cursor-pointer accent-ableton-accent"/>
                        </div>
                    </div>
                </div>

                {/* Keyboard Shortcuts */}
                <div className="space-y-3 border-t border-ableton-border pt-4">
                    <h3 className="text-xs font-bold text-ableton-muted uppercase tracking-wider">Keyboard Shortcuts</h3>
                    <div className="space-y-2">
                        {Object.entries(shortcuts).map(([key, val]) => (
                            <div key={key} className="flex items-center justify-between bg-ableton-panel p-2 rounded border border-ableton-border">
                                <span className="text-[10px] text-ableton-text capitalize">{key.replace('tab', 'Switch to ')}</span>
                                <button 
                                    onClick={() => handleRecordShortcut(key as keyof ShortcutMap)}
                                    className={`text-[10px] px-2 py-1 rounded min-w-[50px] text-center ${recordingShortcut === key ? 'bg-red-500 text-white animate-pulse' : 'bg-ableton-base text-ableton-accent'}`}
                                >
                                    {recordingShortcut === key ? 'Press Key...' : val}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-3 border-t border-ableton-border pt-4">
                   <h3 className="text-xs font-bold text-ableton-muted uppercase tracking-wider">Theme</h3>
                   <div className="grid grid-cols-3 gap-2">
                     {availableThemes.map(t => (
                         <button key={t.id} onClick={() => setTheme(t.id)} className={`p-1 rounded border transition-all ${theme === t.id ? 'border-ableton-accent bg-ableton-panel' : 'border-transparent hover:bg-ableton-panel'}`} title={t.name}>
                            <div className="w-full h-4 rounded mb-1" style={{backgroundColor: t.color}}></div>
                            <span className="text-[9px] text-ableton-muted block text-center truncate">{t.name}</span>
                         </button>
                     ))}
                     <button onClick={() => setIsCreatingTheme(!isCreatingTheme)} className="p-1 rounded border border-dashed border-ableton-muted hover:border-ableton-accent text-ableton-muted flex flex-col items-center justify-center h-[42px]"><span className="text-lg font-bold leading-none">+</span></button>
                   </div>
                   
                   {isCreatingTheme && (
                       <div className="mt-4 p-3 bg-ableton-panel rounded border border-ableton-border space-y-3 animate-in fade-in slide-in-from-top-2">
                           <input type="text" placeholder="Theme Name" value={newThemeName} onChange={(e) => setNewThemeName(e.target.value)} className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-xs text-ableton-text mb-2"/>
                           
                           {/* Color Pickers */}
                           <div className="grid grid-cols-2 gap-2">
                              {Object.entries(newThemeDraft).map(([key, value]) => (
                                <div key={key} className="space-y-1">
                                  <label className="text-[9px] text-ableton-muted uppercase">{key}</label>
                                  <div className="flex gap-2">
                                     <input type="color" value={value} onChange={(e) => setNewThemeDraft(prev => ({...prev, [key]: e.target.value}))} className="h-6 w-8 bg-transparent cursor-pointer" />
                                     <input type="text" value={value} onChange={(e) => setNewThemeDraft(prev => ({...prev, [key]: e.target.value}))} className="w-full text-[10px] bg-ableton-base border-none rounded px-1 text-ableton-text" />
                                  </div>
                                </div>
                              ))}
                           </div>

                           <Button onClick={saveCustomTheme} disabled={!newThemeName} className="w-full mt-2 py-1 text-xs">Save Theme</Button>
                       </div>
                   )}
                </div>

                {/* Documentation Generator */}
                <div className="space-y-3 border-t border-ableton-border pt-4">
                    <h3 className="text-xs font-bold text-ableton-muted uppercase tracking-wider">Documentation & Meta-Tools</h3>
                    <div className="space-y-2">
                        <select value={docType} onChange={(e) => setDocType(e.target.value as any)} className="w-full bg-ableton-base border border-ableton-border rounded p-2 text-xs text-ableton-text focus:outline-none focus:border-ableton-accent">
                            <option value="user_manual">User Manual (EN/DE + HTML/MD)</option>
                            <option value="dev_specs">Developer Specifications & Meta-Prompt</option>
                        </select>
                        <Button 
                            className="w-full text-xs border-dashed"
                            variant="secondary"
                            onClick={() => {
                                let docPrompt = "";
                                if (docType === 'user_manual') {
                                    docPrompt = "Create a comprehensive User Manual for this 'LiveWire' application. \n\nOutput Requirements:\n1. Provide the content in both **English** and **German**.\n2. Format as **Markdown**.\n3. Include a section with the HTML code block for a standalone 'Help.html' page containing this manual.\n4. Cover features: MIDI Tools, Arrangement Architect, Stem Splitter, Theme Creator.";
                                } else {
                                    docPrompt = "Create advanced developer documentation for 'LiveWire'. \n\nOutput Requirements:\n1. **funct_python3.md**: Functional requirements tailored for a Python backend.\n2. **metaPrompt.md**: A master prompt to generate these specs.\n3. **Architecture**: Describe the React/TypeScript frontend and Gemini integration.\n4. Provide both English and German translations for the high-level summary.";
                                }
                                setPrompt(docPrompt);
                                handleGenerate(docPrompt);
                            }}
                        >
                            Generate Documentation
                        </Button>
                    </div>
                </div>
             </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-ableton-base">
        
        {/* Top Utility Bar */}
        <header className="h-14 bg-ableton-surface border-b border-ableton-border flex items-center justify-between px-6 flex-shrink-0">
          <button onClick={() => setShowHistory(true)} className="md:hidden text-ableton-muted"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
          
          <div className="flex items-center gap-4">
              {/* Undo/Redo */}
              <div className="flex bg-ableton-base rounded-sm border border-ableton-border">
                  <button onClick={handleUndo} disabled={history.length < 2} className="p-2 text-ableton-muted hover:text-white disabled:opacity-30 transition-colors border-r border-ableton-border"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg></button>
                  <button onClick={handleRedo} disabled={redoStack.length < 2} className="p-2 text-ableton-muted hover:text-white disabled:opacity-30 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg></button>
              </div>
          </div>
          
          <div className="flex items-center gap-3">
             <input type="file" ref={sessionInputRef} onChange={handleLoadSession} accept=".json" className="hidden" />
             <Button variant="secondary" onClick={() => sessionInputRef.current?.click()} className="text-[10px] py-1 h-8">Load Session</Button>
             <Button variant="secondary" onClick={handleSaveSession} className="text-[10px] py-1 h-8">Save Session</Button>
             <button onClick={() => setShowHelp(true)} className="w-8 h-8 rounded-full bg-ableton-panel text-ableton-muted hover:text-ableton-accent hover:bg-white/5 flex items-center justify-center transition-colors ml-2" title="Help">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </button>
          </div>
        </header>

        {/* Scrollable Output Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
           {!response && !isGenerating && !responseImage && (
             <div className="max-w-4xl mx-auto space-y-12 mt-8">
                <div>
                   <h2 className="text-xl font-bold text-ableton-text mb-6 tracking-tight border-b border-ableton-border pb-2">Techno Workflows</h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {technoWorkflows.map((s, i) => (
                      <button key={i} onClick={() => { setPrompt(s.prompt); handleGenerate(s.prompt); }} className="text-left p-5 bg-ableton-panel border border-ableton-border hover:border-ableton-accent/50 hover:bg-ableton-surface transition-all rounded-sm shadow-sm opacity-90 hover:opacity-100 flex flex-col gap-3 group">
                        <span className="font-bold text-ableton-accent group-hover:text-white transition-colors">{s.label}</span>
                        <span className="text-xs text-ableton-muted leading-relaxed">{s.prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                   <h2 className="text-xl font-bold text-ableton-text mb-6 tracking-tight border-b border-ableton-border pb-2">Advanced Features</h2>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {advancedWorkflows.map((s, i) => (
                      <button key={i} onClick={() => { setPrompt(s.prompt); handleGenerate(s.prompt); }} className="text-left p-5 bg-ableton-panel border border-ableton-border hover:border-ableton-accent/50 hover:bg-ableton-surface transition-all rounded-sm shadow-sm opacity-90 hover:opacity-100 flex flex-col gap-3 group">
                         <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-ableton-yellow group-hover:animate-pulse"></span><span className="font-bold text-ableton-text group-hover:text-white transition-colors">{s.label}</span></div>
                         <span className="text-xs text-ableton-muted leading-relaxed pl-4">{s.prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>
             </div>
           )}

           <div className="max-w-4xl mx-auto relative">
             {response && !isGenerating && (
                 <>
                     <div className="flex justify-end mb-3 gap-2">
                        <Button variant="secondary" onClick={handleCopy} className="flex items-center gap-2 text-[10px] h-7 px-3">{copied ? 'Copied' : 'Copy'}</Button>
                        <Button variant="secondary" onClick={() => setShowExportModal(true)} className="flex items-center gap-2 text-[10px] h-7 px-3">Export</Button>
                        <Button variant="secondary" onClick={openSaveModal} className="flex items-center gap-2 text-[10px] h-7 px-3">Save as Template</Button>
                     </div>
                     <OutputDisplay content={response} imageUrl={responseImage} isStreaming={isGenerating} />
                     
                     {/* Intelligent Suggestions */}
                     <div className="mt-4 border-t border-ableton-border pt-4 animate-in fade-in slide-in-from-top-4">
                         <h4 className="text-[10px] text-ableton-muted uppercase tracking-wider font-bold mb-2 flex items-center gap-1">
                             <svg className="w-3 h-3 text-ableton-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                             Intelligent Suggestions
                         </h4>
                         <div className="flex gap-2">
                             {getSmartSuggestions(lastPrompt).map((suggestion, idx) => (
                                 <button 
                                     key={idx}
                                     onClick={() => { setPrompt(suggestion); handleGenerate(suggestion); }}
                                     className="text-xs bg-ableton-panel hover:bg-ableton-accent hover:text-white text-ableton-text px-3 py-2 rounded transition-colors border border-ableton-border"
                                 >
                                     {suggestion}
                                 </button>
                             ))}
                         </div>
                     </div>
                 </>
             )}
           </div>
        </div>

        {/* Input Footer */}
        <div className="bg-ableton-surface border-t border-ableton-border p-4 flex-shrink-0 z-10">
          <div className="max-w-4xl mx-auto space-y-3">
             {selectedImage && (
                 <div className="flex items-center gap-3 bg-ableton-base p-2 rounded border border-ableton-border w-fit animate-in slide-in-from-bottom-2 fade-in">
                    <img src={`data:image/png;base64,${selectedImage}`} className="h-10 w-10 object-cover rounded-sm" alt="Upload" />
                    <div className="flex flex-col">
                        <span className="text-xs text-ableton-muted">Image attached</span>
                        <label className="flex items-center gap-2 cursor-pointer mt-1">
                            <input type="checkbox" checked={isEditMode} onChange={(e) => setIsEditMode(e.target.checked)} className="w-3 h-3 accent-ableton-accent"/>
                            <span className="text-xs text-ableton-text hover:text-ableton-accent">Edit Mode</span>
                        </label>
                    </div>
                    <button onClick={() => { setSelectedImage(null); setIsEditMode(false); }} className="text-ableton-muted hover:text-ableton-text ml-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                 </div>
             )}

             <div className="flex gap-3">
                <div className="flex items-center gap-2">
                     <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                    <Button variant="icon" onClick={() => fileInputRef.current?.click()} title="Upload Image">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </Button>
                    <Button variant="icon" onClick={isRecording ? stopRecording : startRecording} className={isRecording ? "text-red-500 bg-red-500/10 animate-pulse" : ""} title="Transcribe Audio">
                        {isRecording ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
                    </Button>
                </div>

                <div className="flex-1 relative group">
                    <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={handleKeyDown} placeholder={selectedImage ? (isEditMode ? "Describe how to edit this image..." : "Ask about this image...") : "Describe a sound, effect, or workflow..."} className="w-full bg-ableton-base border border-ableton-border rounded p-4 pr-12 text-ableton-text placeholder-ableton-muted focus:outline-none focus:border-ableton-accent focus:ring-1 focus:ring-ableton-accent transition-all font-mono text-sm shadow-inner" />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[10px] text-ableton-muted border border-ableton-border rounded px-1.5 py-0.5 opacity-50 group-hover:opacity-100 transition-opacity">{shortcuts.generate.toUpperCase()}</div>
                </div>
                <Button onClick={() => handleGenerate()} isLoading={isGenerating} disabled={(!prompt.trim() && !selectedImage)}>Generate</Button>
             </div>

             {/* Tiny Buttons - Modifiers */}
             {lastPrompt && !isGenerating && (
                <div className="flex gap-2 justify-center pt-2 animate-in fade-in slide-in-from-top-1">
                    <button onClick={() => handleGenerate(lastPrompt, 'much_longer')} className="text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 bg-ableton-panel hover:bg-ableton-accent hover:text-white text-ableton-muted rounded-full transition-colors border border-ableton-border">Much Longer</button>
                    <button onClick={() => handleGenerate(lastPrompt, 'professional')} className="text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 bg-ableton-panel hover:bg-ableton-accent hover:text-white text-ableton-muted rounded-full transition-colors border border-ableton-border">Much More Professional</button>
                    <button onClick={() => handleGenerate(lastPrompt, 'short')} className="text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 bg-ableton-panel hover:bg-ableton-accent hover:text-white text-ableton-muted rounded-full transition-colors border border-ableton-border">Short</button>
                </div>
             )}
          </div>
        </div>

        {/* New Footer */}
        <footer className="bg-ableton-panel border-t border-ableton-border py-2 px-6 flex flex-col md:flex-row items-center justify-between text-[10px] text-ableton-muted">
            <div className="flex gap-4">
                <a href="#" className="hover:text-ableton-text transition-colors">Home</a>
                <a href="#" className="hover:text-ableton-text transition-colors">Blog</a>
                <a href="#" className="hover:text-ableton-text transition-colors">Config</a>
            </div>
            <div className="flex gap-4 mt-2 md:mt-0">
                <span>LiveWire: Ableton Architect</span>
                <span className="font-mono text-ableton-accent">v1.2.0</span>
                <div className="flex gap-2">
                    <a href="#" className="hover:text-ableton-text transition-colors" title="GitHub">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    </a>
                </div>
            </div>
        </footer>
      </main>
    </div>
  );
};

export default App;