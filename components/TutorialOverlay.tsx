import React, { useEffect, useState, useLayoutEffect } from 'react';
import { TutorialStep } from '../types';
import { Button } from './Button';

interface TutorialOverlayProps {
  steps: TutorialStep[];
  currentStepIndex: number;
  onNext: () => void;
  onSkip: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  steps,
  currentStepIndex,
  onNext,
  onSkip,
}) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const step = steps[currentStepIndex];

  useLayoutEffect(() => {
    const updatePosition = () => {
      const element = document.querySelector(`[data-tour="${step.target}"]`);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        // Ensure element is visible if inside scrollable area
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // Fallback for 'center' position if target not found or generic
        setTargetRect(null);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [step, currentStepIndex]);

  // Calculate tooltip position
  const getTooltipStyle = () => {
    if (!targetRect || step.position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const gap = 20;
    let top = 0;
    let left = 0;
    const transform = 'none';

    switch (step.position) {
      case 'top':
        top = targetRect.top - gap;
        left = targetRect.left + targetRect.width / 2;
        return { top, left, transform: 'translate(-50%, -100%)' };
      case 'bottom':
        top = targetRect.bottom + gap;
        left = targetRect.left + targetRect.width / 2;
        return { top, left, transform: 'translate(-50%, 0)' };
      case 'left':
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.left - gap;
        return { top, left, transform: 'translate(-100%, -50%)' };
      case 'right':
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.right + gap;
        return { top, left, transform: 'translate(0, -50%)' };
      default:
        return {};
    }
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto">
      {/* SVG Mask for the Spotlight Effect */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="tour-mask" x="0" y="0" width="100%" height="100%">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && step.position !== 'center' && (
              <rect
                x={targetRect.left - 5}
                y={targetRect.top - 5}
                width={targetRect.width + 10}
                height={targetRect.height + 10}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#tour-mask)"
        />
        {/* Animated Highlight Border */}
        {targetRect && step.position !== 'center' && (
           <rect
             x={targetRect.left - 5}
             y={targetRect.top - 5}
             width={targetRect.width + 10}
             height={targetRect.height + 10}
             rx="8"
             fill="none"
             stroke="#ffcc00"
             strokeWidth="2"
             className="animate-pulse"
           />
        )}
      </svg>

      {/* Tooltip Card */}
      <div
        className="absolute w-80 bg-ableton-surface border border-ableton-accent shadow-2xl rounded-lg p-5 flex flex-col gap-3 transition-all duration-300"
        style={getTooltipStyle()}
      >
        <div className="flex items-center justify-between border-b border-ableton-border pb-2 mb-1">
            <h4 className="text-sm font-bold text-ableton-accent uppercase tracking-wider">
                {step.title}
            </h4>
            <span className="text-[10px] text-ableton-muted font-mono">
                {currentStepIndex + 1} / {steps.length}
            </span>
        </div>
        
        <p className="text-xs text-ableton-text leading-relaxed">
            {step.content}
        </p>

        <div className="flex justify-between items-center mt-2 pt-2">
            <button 
                onClick={onSkip} 
                className="text-[10px] text-ableton-muted hover:text-white transition-colors"
            >
                Skip Tour
            </button>
            <Button onClick={onNext} className="h-7 text-xs px-4">
                {currentStepIndex === steps.length - 1 ? "Finish" : "Next"}
            </Button>
        </div>
        
        {/* Decorative arrow/triangle could go here, but omitted for simplicity */}
      </div>
    </div>
  );
};
