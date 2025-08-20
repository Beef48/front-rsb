import React, { useState, useRef, useEffect } from 'react';

interface BasicTooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export function BasicTooltip({ content, children, className = '' }: BasicTooltipProps) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, showAbove: true });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    // Position horizontale : centré par défaut, mais ajusté si ça dépasse
    let left = triggerRect.left + scrollX + (triggerRect.width / 2);
    
    // Vérifier le débordement horizontal
    const tooltipWidth = Math.min(320, viewportWidth - 20); // Max 320px ou largeur disponible
    
    if (left - tooltipWidth / 2 < 10) {
      left = tooltipWidth / 2 + 10; // Marge gauche
    } else if (left + tooltipWidth / 2 > viewportWidth - 10) {
      left = viewportWidth - tooltipWidth / 2 - 10; // Marge droite
    }

    // Position verticale : au-dessus par défaut, en dessous si pas de place
    let top = triggerRect.top + scrollY - 10;
    let showAbove = true;

    // Si pas assez de place au-dessus, mettre en dessous
    if (triggerRect.top < 100) {
      top = triggerRect.bottom + scrollY + 10;
      showAbove = false;
    }

    setPosition({ top, left, showAbove });
  };

  const handleMouseEnter = () => {
    setShow(true);
  };

  const handleMouseLeave = () => {
    setShow(false);
  };

  useEffect(() => {
    if (show) {
      // Petit délai pour que le tooltip soit rendu avant de calculer la position
      const timer = setTimeout(calculatePosition, 10);
      return () => clearTimeout(timer);
    }
  }, [show]);

  return (
    <>
      <span
        ref={triggerRef}
        className={`cursor-help border-b border-dotted border-gray-400 hover:border-gray-600 ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </span>
      
      {show && (
        <div
          ref={tooltipRef}
          className="fixed bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg z-[9999] pointer-events-none leading-relaxed"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: position.showAbove ? 'translateX(-50%) translateY(-100%)' : 'translateX(-50%)',
            maxWidth: '320px',
            minWidth: '200px',
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            lineHeight: '1.4'
          }}
        >
          {content}
          <div 
            className={`absolute left-1/2 transform -translate-x-1/2 border-4 border-transparent ${
              position.showAbove 
                ? 'top-full border-t-gray-900' 
                : 'bottom-full border-b-gray-900'
            }`}
            style={{ 
              marginTop: position.showAbove ? '-1px' : undefined,
              marginBottom: position.showAbove ? undefined : '-1px'
            }}
          ></div>
        </div>
      )}
    </>
  );
}