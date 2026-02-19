import React from 'react';

interface OutputDisplayProps {
  content: string;
  imageUrl?: string;
  isStreaming: boolean;
}

export const OutputDisplay: React.FC<OutputDisplayProps> = ({ content, imageUrl, isStreaming }) => {
  const text = content.toLowerCase();

  // 1. Freeze/Drone Context
  const isFreezeMode = (text.includes('hybrid reverb') && text.includes('freeze')) || 
                       (text.includes('drone') && text.includes('infinite'));

  // 2. LFO / Modulation Context
  const isLFO = text.includes('lfo') || text.includes('modulation') || text.includes('wobble');

  // 3. Spectral / EQ Context
  const isSpectrum = text.includes('spectrum') || text.includes('resonator') || text.includes('eq') || text.includes('filter');

  // 4. Dynamics / Compression Context
  const isDynamics = text.includes('compressor') || text.includes('sidechain') || text.includes('glue');

  // Simple parser to handle bolding and basic structure without a heavy library
  const renderText = (text: string) => {
    return text.split('\n').map((line, index) => {
      // Headers (### or ##)
      if (line.startsWith('### ')) {
        return <h3 key={index} className={`text-xl font-bold mt-6 mb-3 tracking-tight ${isFreezeMode ? 'text-cyan-400' : 'text-ableton-accent'}`}>{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-2xl font-bold text-white mt-8 mb-4 border-b border-ableton-border pb-2 tracking-tight">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('**Concept**') || line.startsWith('**Core Devices**') || line.startsWith('**Step-by-Step Guide**')) {
         return <h4 key={index} className={`text-sm font-bold mt-6 mb-2 uppercase tracking-widest ${isFreezeMode ? 'text-cyan-200' : 'text-ableton-warning'}`}>{line.replace(/\*\*/g, '')}</h4>
      }

      // List items
      if (line.trim().startsWith('- ')) {
        return (
          <li key={index} className={`ml-4 pl-2 text-ableton-text mb-2 list-disc ${isFreezeMode ? 'marker:text-cyan-400' : 'marker:text-ableton-accent'}`}>
            <span dangerouslySetInnerHTML={{ __html: parseBoldAndItalic(line.replace('- ', '')) }} />
          </li>
        );
      }
      
      // Numbered list
      if (/^\d+\./.test(line.trim())) {
         return (
          <div key={index} className="flex gap-3 mb-3 ml-1">
             <span className={`font-mono font-bold min-w-[20px] ${isFreezeMode ? 'text-cyan-400' : 'text-ableton-accent'}`}>{line.split('.')[0]}.</span>
             <p className="text-ableton-text" dangerouslySetInnerHTML={{ __html: parseBoldAndItalic(line.replace(/^\d+\.\s/, '')) }} />
          </div>
         )
      }

      // Blockquotes
      if (line.startsWith('>')) {
        return (
          <div key={index} className={`border-l-2 p-3 my-4 rounded-r text-sm italic text-gray-400 bg-ableton-base/50 ${isFreezeMode ? 'border-cyan-500' : 'border-ableton-warning'}`}>
             {line.replace('>', '')}
          </div>
        )
      }

      // Default paragraph
      if (line.trim() === '') return <div key={index} className="h-2" />;

      return (
        <p key={index} className="mb-2 leading-relaxed text-ableton-text/90" dangerouslySetInnerHTML={{ __html: parseBoldAndItalic(line) }} />
      );
    });
  };

  const parseBoldAndItalic = (text: string) => {
    // Replace **bold** with <b>
    let parsed = text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
    // Replace *italic* with <i>
    parsed = parsed.replace(/\*(.*?)\*/g, `<em class="${isFreezeMode ? 'text-cyan-200' : 'text-ableton-warning'} not-italic">$1</em>`);
    // Replace `code` with <code>
    parsed = parsed.replace(/`(.*?)`/g, '<code class="bg-ableton-base px-1.5 py-0.5 rounded text-xs font-mono text-pink-400 border border-ableton-border">$1</code>');
    return parsed;
  };

  return (
    <>
      <style>{`
        @keyframes deep-pulse {
          0%, 100% { background-color: rgba(34, 211, 238, 0.02); box-shadow: 0 0 20px rgba(34, 211, 238, 0.05) inset; border-color: rgba(34, 211, 238, 0.2); }
          50% { background-color: rgba(34, 211, 238, 0.08); box-shadow: 0 0 50px rgba(34, 211, 238, 0.15) inset; border-color: rgba(34, 211, 238, 0.5); }
        }
        .freeze-active {
          animation: deep-pulse 5s infinite ease-in-out;
        }
        @keyframes lfo-move {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        @keyframes spectrum-bounce {
            0%, 100% { height: 10%; }
            50% { height: 80%; }
        }
        @keyframes compressor-dip {
            0%, 100% { height: 100%; opacity: 0.2; }
            10% { height: 30%; opacity: 1; }
        }
      `}</style>
      
      <div className={`bg-ableton-surface rounded-xl p-6 md:p-8 shadow-2xl border border-ableton-border h-full overflow-y-auto relative transition-all duration-1000 ${isFreezeMode ? 'freeze-active' : ''}`}>
        
        {/* Visualizer Overlays */}
        <div className="absolute top-6 right-6 flex flex-col items-end gap-3 pointer-events-none z-10">
            {/* Freeze Indicator */}
            {isFreezeMode && (
            <div className="flex items-center gap-2 px-3 py-1 bg-cyan-950/80 border border-cyan-500/30 rounded-full animate-pulse backdrop-blur-sm">
                <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
                <span className="text-[10px] font-mono text-cyan-200 tracking-[0.2em] uppercase">Freeze</span>
            </div>
            )}
            
            {/* LFO Visualizer */}
            {isLFO && (
                <div className="w-24 h-12 bg-ableton-base/80 border border-ableton-border rounded overflow-hidden relative backdrop-blur-sm">
                     <div className="absolute inset-0 flex items-center">
                        <svg className="w-[200%] h-full text-ableton-accent" style={{animation: 'lfo-move 2s linear infinite'}}>
                            <path d="M0,24 Q24,0 48,24 T96,24 T144,24 T192,24" fill="none" stroke="currentColor" strokeWidth="2" />
                        </svg>
                     </div>
                     <span className="absolute bottom-1 right-1 text-[8px] text-ableton-muted font-mono uppercase">LFO</span>
                </div>
            )}

            {/* Spectrum Visualizer */}
            {isSpectrum && (
                <div className="w-24 h-12 bg-ableton-base/80 border border-ableton-border rounded flex items-end justify-between px-1 pb-1 gap-0.5 backdrop-blur-sm">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="w-full bg-ableton-warning/80 rounded-sm" style={{height: '20%', animation: `spectrum-bounce ${0.5 + Math.random()}s infinite ease-in-out`}}></div>
                    ))}
                    <span className="absolute top-1 left-1 text-[8px] text-ableton-muted font-mono uppercase">Spec</span>
                </div>
            )}

            {/* Compressor Visualizer */}
            {isDynamics && (
                <div className="w-4 h-16 bg-ableton-base/80 border border-ableton-border rounded relative flex flex-col justify-end p-0.5 backdrop-blur-sm">
                    <div className="w-full bg-ableton-accent rounded-sm" style={{height: '100%', animation: 'compressor-dip 0.8s infinite cubic-bezier(0.1, 0.7, 1.0, 0.1)'}}></div>
                    <span className="absolute top-1 -left-4 text-[8px] text-ableton-muted font-mono uppercase transform -rotate-90">GR</span>
                </div>
            )}
        </div>

        {imageUrl && (
          <div className="mb-6 rounded-lg overflow-hidden border border-ableton-panel relative group">
              <img src={`data:image/png;base64,${imageUrl}`} alt="Generated or Edited" className="w-full max-h-96 object-contain bg-black/50" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                 <span className="text-white text-xs font-mono uppercase tracking-widest border border-white px-3 py-1 rounded">Generated Visualization</span>
              </div>
          </div>
        )}
        
        {content ? (
          <div className="prose prose-invert max-w-none text-ableton-text font-light">
            {renderText(content)}
            {isStreaming && (
              <span className={`inline-block w-2 h-4 animate-pulse ml-1 align-middle ${isFreezeMode ? 'bg-cyan-400' : 'bg-ableton-accent'}`}></span>
            )}
          </div>
        ) : (
          !imageUrl && (
          <div className="h-full flex flex-col items-center justify-center text-ableton-muted opacity-30 space-y-6">
            <div className="w-24 h-24 rounded-full border-2 border-dashed border-ableton-muted/50 flex items-center justify-center animate-[spin_10s_linear_infinite]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
            </div>
            <div className="text-center space-y-2">
                <p className="text-xl font-light tracking-wide">Awaiting Input</p>
                <p className="text-xs font-mono uppercase tracking-widest text-ableton-muted/70">Configure parameters to generate arrangement</p>
            </div>
          </div>
          )
        )}
      </div>
    </>
  );
};