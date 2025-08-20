import React, { useState, useRef, useEffect } from 'react';

interface CustomTooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export function CustomTooltip({ content, children, className = '' }: CustomTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      let top = triggerRect.bottom + scrollTop + 8;
      let left = triggerRect.left + scrollLeft + (triggerRect.width / 2) - (tooltipRect.width / 2);
      
      // Ajustements pour éviter le débordement
      if (left < 10) left = 10;
      if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
      }
      
      // Si le tooltip dépasse en bas, le mettre au-dessus
      if (top + tooltipRect.height > window.innerHeight + scrollTop - 10) {
        top = triggerRect.top + scrollTop - tooltipRect.height - 8;
      }
      
      setPosition({ top, left });
    }
  };

  const handleMouseEnter = () => {
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      const handleScroll = () => updatePosition();
      const handleResize = () => updatePosition();
      
      window.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isVisible]);

  return (
    <>
      <div
        ref={triggerRef}
        className={`inline-block cursor-help border-b border-dotted border-gray-400 ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg max-w-xs transition-opacity duration-200 opacity-100"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`
          }}
        >
          <div className="relative">
            {content}
            {/* Flèche pointant vers l'élément */}
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
          </div>
        </div>
      )}
    </>
  );
}