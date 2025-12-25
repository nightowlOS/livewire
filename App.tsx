import React, { useState, useRef, useEffect } from 'react';
import { generateAbletonGuideStream, transcribeAudio, editImage } from './services/geminiService';
import { Button } from './components/Button';
import { OutputDisplay } from './components/OutputDisplay';
import { ChatMessage } from './types';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [response, setResponse] = useState('');
  const [responseImage, setResponseImage] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Multi-modal state
  const [isRecording, setIsRecording] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // Base64
  const [isEditMode, setIsEditMode] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-gray-200 font-sans selection:bg-ableton-accent selection:text-white flex flex-col md:flex-row overflow-hidden">
      
      {/* Sidebar (History) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#222] border-r border-[#333] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${showHistory ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-[#333] flex justify-between items-center">
          <h2 className="text-sm font-bold tracking-widest text-ableton-accent uppercase">History</h2>
          <button onClick={() => setShowHistory(false)} className="md:hidden text-gray-400">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-60px)] p-2 space-y-2">
          {history.filter(h => h.role === 'user').map((item) => (
            <div 
              key={item.id} 
              onClick={() => loadFromHistory(item)}
              className="p-3 rounded bg-[#2a2a2a] hover:bg-[#333] cursor-pointer transition-colors text-xs border-l-2 border-transparent hover:border-ableton-accent truncate flex items-center justify-between"
            >
              <span className="truncate">{item.text || "(Image)"}</span>
              {item.imageUrl && (
                  <svg className="w-3 h-3 text-gray-500 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              )}
            </div>
          ))}
          {history.length === 0 && (
            <div className="p-4 text-xs text-gray-500 text-center italic">
              No generations yet.
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Header */}
        <header className="h-16 bg-[#222] border-b border-[#333] flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowHistory(true)} className="md:hidden text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="w-8 h-8 bg-ableton-accent rounded-sm flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 2v20h2V2H6zm4 0v20h2V2h-2zm4 0v20h2V2h-2zm4 0v20h2V2h-2z"/></svg>
            </div>
            <h1 className="text-lg font-semibold tracking-wide text-white">LiveWire <span className="text-xs text-gray-500 font-normal ml-2">Ableton 12 Assistant</span></h1>
          </div>
          <div className="text-xs font-mono text-ableton-yellow bg-yellow-900/20 px-2 py-1 rounded hidden sm:block">
            v12.0 Compatible
          </div>
        </header>

        {/* Scrollable Output Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
           {/* Suggestions Grid (only if no response yet) */}
           {!response && !isGenerating && !responseImage && (
             <div className="max-w-4xl mx-auto">
                <p className="text-center text-gray-500 mb-6 uppercase tracking-widest text-xs">Quick Start Recipes</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suggestions.map((s, i) => (
                    <button 
                      key={i} 
                      onClick={() => { setPrompt(s); handleGenerate(s); }}
                      className="text-left p-4 bg-[#262626] border border-[#333] hover:border-ableton-accent/50 hover:bg-[#2a2a2a] transition-all rounded-sm text-sm text-gray-300 shadow-sm"
                    >
                      {s}
                    </button>
                  ))}
                </div>
             </div>
           )}

           <div className="max-w-4xl mx-auto">
             <OutputDisplay content={response} imageUrl={responseImage} isStreaming={isGenerating} />
           </div>
        </div>

        {/* Input Footer */}
        <div className="bg-[#222] border-t border-[#333] p-4 flex-shrink-0 z-10">
          <div className="max-w-4xl mx-auto space-y-3">
             {/* Selected Image Preview */}
             {selectedImage && (
                 <div className="flex items-center gap-3 bg-[#111] p-2 rounded border border-[#333] w-fit">
                    <img src={`data:image/png;base64,${selectedImage}`} className="h-10 w-10 object-cover rounded-sm" alt="Upload" />
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-400">Image attached</span>
                        <label className="flex items-center gap-2 cursor-pointer mt-1">
                            <input 
                                type="checkbox" 
                                checked={isEditMode}
                                onChange={(e) => setIsEditMode(e.target.checked)}
                                className="w-3 h-3 accent-ableton-accent"
                            />
                            <span className="text-xs text-ableton-text hover:text-white">Edit Mode</span>
                        </label>
                    </div>
                    <button onClick={() => { setSelectedImage(null); setIsEditMode(false); }} className="text-gray-500 hover:text-white ml-2">
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
                    className="w-full bg-[#151515] border border-[#333] rounded p-4 pr-12 text-white placeholder-gray-600 focus:outline-none focus:border-ableton-accent focus:ring-1 focus:ring-ableton-accent transition-all font-mono text-sm"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-600 border border-gray-700 rounded px-1.5 py-0.5">
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