import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'icon';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "font-sans font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";
  
  const variants = {
    primary: "bg-ableton-accent text-white hover:bg-ableton-accent-hover px-6 py-2 rounded-lg text-sm shadow-md hover:shadow-lg border border-transparent",
    secondary: "bg-ableton-panel text-ableton-text border border-ableton-border hover:bg-ableton-border hover:text-white px-4 py-2 rounded-lg text-sm shadow-sm",
    icon: "p-2 text-ableton-muted hover:text-ableton-accent hover:bg-ableton-panel/50 rounded-lg transition-colors"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className} flex items-center justify-center`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </span>
      ) : children}
    </button>
  );
};