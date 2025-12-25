import React from 'react';

interface OutputDisplayProps {
  content: string;
  imageUrl?: string;
  isStreaming: boolean;
}

export const OutputDisplay: React.FC<OutputDisplayProps> = ({ content, imageUrl, isStreaming }) => {
  // Detect "Freeze Drone" context to trigger visual effects
  const isFreezeMode = (content.toLowerCase().includes('hybrid reverb') && content.toLowerCase().includes('freeze')) || 
                       (content.toLowerCase().includes('drone') && content.toLowerCase().includes('infinite'));

  // Simple parser to handle bolding and basic structure without a heavy library
  const renderText = (text: string) => {
    return text.split('\n').map((line, index) => {
      // Headers (### or ##)
      if (line.startsWith('### ')) {
        return <h3 key={index} className={`text-xl font-bold mt-6 mb-3 ${isFreezeMode ? 'text-cyan-400' : 'text-ableton-accent'}`}>{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-2xl font-bold text-white mt-8 mb-4 border-b border-ableton-panel pb-2">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('**Concept**') || line.startsWith('**Core Devices**') || line.startsWith('**Step-by-Step Guide**')) {
         return <h4 key={index} className={`text-lg font-bold mt-6 mb-2 uppercase tracking-wider ${isFreezeMode ? 'text-cyan-200' : 'text-ableton-yellow'}`}>{line.replace(/\*\*/g, '')}</h4>
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
          <div key={index} className={`border-l-4 p-3 my-4 rounded-r text-sm italic text-gray-300 ${isFreezeMode ? 'border-cyan-500 bg-cyan-900/20' : 'border-ableton-yellow bg-ableton-light/20'}`}>
             {line.replace('>', '')}
          </div>
        )
      }

      // Default paragraph
      if (line.trim() === '') return <div key={index} className="h-2" />;

      return (
        <p key={index} className="mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: parseBoldAndItalic(line) }} />
      );
    });
  };

  const parseBoldAndItalic = (text: string) => {
    // Replace **bold** with <b>
    let parsed = text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
    // Replace *italic* with <i>
    parsed = parsed.replace(/\*(.*?)\*/g, `<em class="${isFreezeMode ? 'text-cyan-200' : 'text-ableton-yellow'} not-italic">$1</em>`);
    // Replace `code` with <code>
    parsed = parsed.replace(/`(.*?)`/g, '<code class="bg-black/30 px-1 py-0.5 rounded text-xs font-mono text-pink-400">$1</code>');
    return parsed;
  };

  return (
    <>
      {isFreezeMode && (
        <style>{`
          @keyframes deep-pulse {
            0%, 100% { background-color: rgba(34, 211, 238, 0.02); box-shadow: 0 0 20px rgba(34, 211, 238, 0.05) inset; border-color: rgba(34, 211, 238, 0.2); }
            50% { background-color: rgba(34, 211, 238, 0.08); box-shadow: 0 0 50px rgba(34, 211, 238, 0.15) inset; border-color: rgba(34, 211, 238, 0.5); }
          }
          .freeze-active {
            animation: deep-pulse 5s infinite ease-in-out;
          }
        `}</style>
      )}
      
      <div className={`bg-ableton-mid rounded-lg p-6 md:p-8 shadow-xl border border-ableton-light min-h-[400px] overflow-y-auto relative transition-all duration-1000 ${isFreezeMode ? 'freeze-active' : ''}`}>
        
        {/* Visual Indicator for Freeze Mode */}
        {isFreezeMode && (
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-cyan-950/50 border border-cyan-500/30 rounded-full animate-pulse">
            <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
            <span className="text-[10px] font-mono text-cyan-200 tracking-[0.2em] uppercase">Freeze Active</span>
          </div>
        )}

        {imageUrl && (
          <div className="mb-6 rounded-lg overflow-hidden border border-ableton-panel">
              <img src={`data:image/png;base64,${imageUrl}`} alt="Generated or Edited" className="w-full max-h-96 object-contain bg-black/50" />
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
          <div className="h-full flex flex-col items-center justify-center text-ableton-light opacity-50 space-y-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 3-2 3-2zm0 0v-8" />
            </svg>
            <p className="text-lg">Ready to construct your sound.</p>
          </div>
          )
        )}
      </div>
    </>
  );
};