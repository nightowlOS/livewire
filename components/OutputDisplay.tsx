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

  // Simple parser to handle bolding and basic structure
  const renderText = (text: string) => {
    return text.split('\n').map((line, index) => {
      // Headers (### or ##)
      if (line.startsWith('### ')) {
        return <h3 key={index} className={`text-xl font-bold mt-8 mb-4 ${isFreezeMode ? 'text-cyan-400' : 'text-ableton-accent'}`}>{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-2xl font-bold text-white mt-10 mb-6 border-b border-ableton-border pb-2">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('**Concept**') || line.startsWith('**Core Devices**') || line.startsWith('**Step-by-Step Guide**')) {
         return <h4 key={index} className={`text-sm font-bold mt-6 mb-3 uppercase tracking-widest ${isFreezeMode ? 'text-cyan-200' : 'text-ableton-yellow'}`}>{line.replace(/\*\*/g, '')}</h4>
      }

      // List items
      if (line.trim().startsWith('- ')) {
        return (
          <li key={index} className={`ml-4 pl-2 text-ableton-text mb-3 list-disc ${isFreezeMode ? 'marker:text-cyan-400' : 'marker:text-ableton-accent'}`}>
            <span dangerouslySetInnerHTML={{ __html: parseBoldAndItalic(line.replace('- ', '')) }} />
          </li>
        );
      }
      
      // Numbered list
      if (/^\d+\./.test(line.trim())) {
         return (
          <div key={index} className="flex gap-4 mb-4 ml-1">
             <span className={`font-mono font-bold min-w-[20px] pt-1 ${isFreezeMode ? 'text-cyan-400' : 'text-ableton-accent'}`}>{line.split('.')[0]}.</span>
             <p className="text-ableton-text leading-relaxed" dangerouslySetInnerHTML={{ __html: parseBoldAndItalic(line.replace(/^\d+\.\s/, '')) }} />
          </div>
         )
      }

      // Blockquotes
      if (line.startsWith('>')) {
        return (
          <div key={index} className={`border-l-4 p-4 my-6 rounded-r bg-ableton-surface/50 text-sm italic text-gray-300 ${isFreezeMode ? 'border-cyan-500 bg-cyan-900/10' : 'border-ableton-yellow'}`}>
             {line.replace('>', '')}
          </div>
         )
      }

      // Default paragraph
      if (line.trim() === '') return <div key={index} className="h-2" />;

      return (
        <p key={index} className="mb-4 text-base leading-7 text-ableton-text/90" dangerouslySetInnerHTML={{ __html: parseBoldAndItalic(line) }} />
      );
    });
  };

  const parseBoldAndItalic = (text: string) => {
    let parsed = text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
    parsed = parsed.replace(/\*(.*?)\*/g, `<em class="${isFreezeMode ? 'text-cyan-200' : 'text-ableton-yellow'} not-italic opacity-90">$1</em>`);
    parsed = parsed.replace(/`(.*?)`/g, '<code class="bg-black/20 border border-ableton-border px-1.5 py-0.5 rounded text-xs font-mono text-ableton-accent">$1</code>');
    return parsed;
  };

  return (
    <>
      {isFreezeMode && (
        <style>{`
          @keyframes deep-pulse {
            0%, 100% { box-shadow: 0 0 20px rgba(34, 211, 238, 0.05) inset; border-color: rgba(34, 211, 238, 0.2); }
            50% { box-shadow: 0 0 50px rgba(34, 211, 238, 0.15) inset; border-color: rgba(34, 211, 238, 0.5); }
          }
          .freeze-active { animation: deep-pulse 5s infinite ease-in-out; }
        `}</style>
      )}
      
      <div className={`bg-ableton-mid rounded-xl p-6 md:p-10 shadow-2xl border border-ableton-border min-h-[200px] overflow-hidden relative transition-all duration-1000 ${isFreezeMode ? 'freeze-active bg-cyan-950/10' : 'bg-ableton-surface/50'}`}>
        
        {isFreezeMode && (
          <div className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1 bg-cyan-950/50 border border-cyan-500/30 rounded-full animate-pulse">
            <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
            <span className="text-[10px] font-mono text-cyan-200 tracking-[0.2em] uppercase">Freeze Active</span>
          </div>
        )}

        {imageUrl && (
          <div className="mb-8 rounded-lg overflow-hidden border border-ableton-border shadow-lg">
              <img src={`data:image/png;base64,${imageUrl}`} alt="Generated or Edited" className="w-full max-h-[500px] object-contain bg-black/40 backdrop-blur-sm" />
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
          <div className="flex flex-col items-center justify-center py-20 text-ableton-muted/30 space-y-4">
             <div className="w-16 h-16 rounded-full border-2 border-current border-dashed animate-[spin_10s_linear_infinite] flex items-center justify-center opacity-50">
                <div className="w-2 h-2 bg-current rounded-full"></div>
             </div>
          </div>
          )
        )}
      </div>
    </>
  );
};