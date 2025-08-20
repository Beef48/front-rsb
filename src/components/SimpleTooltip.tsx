import React, { useState } from 'react';

interface SimpleTooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export function SimpleTooltip({ content, children, className = '' }: SimpleTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className="cursor-help border-b border-dotted border-gray-400"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-[9999]">
          <div className="bg-gray-900 text-white text-sm rounded-lg px-3 py-2 max-w-xs whitespace-normal shadow-lg">
            {content}
            {/* Flèche */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
}