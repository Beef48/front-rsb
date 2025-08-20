import React, { useState, useRef, useEffect } from 'react';

interface BasicTooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export function BasicTooltip({ content, children, className = '' }: BasicTooltipProps) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, showAbove: true });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculatePosition = () => {
    if (!tooltipRef.current) return;

    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    const MARGIN = 16; // Marge de sécurité
    const OFFSET = 12; // Distance par rapport à la souris
    
    // Position basée sur la souris
    let left = mousePosition.x + scrollX + OFFSET;
    let top = mousePosition.y + scrollY - OFFSET;
    let showAbove = true;

    // Vérifier le débordement horizontal
    const tooltipWidth = tooltipRect.width || 200;
    
    // Si débordement à droite, placer à gauche de la souris
    if (left + tooltipWidth > viewportWidth - MARGIN) {
      left = mousePosition.x + scrollX - tooltipWidth - OFFSET;
    }
    
    // Si encore débordement à gauche, forcer dans la fenêtre
    if (left < MARGIN) {
      left = MARGIN;
    }

    // Vérifier le débordement vertical
    const tooltipHeight = tooltipRect.height || 60;
    
    // Si débordement en haut, placer en dessous de la souris
    if (top < MARGIN) {
      top = mousePosition.y + scrollY + OFFSET;
      showAbove = false;
    }
    
    // Si débordement en bas, placer au-dessus de la souris
    if (top + tooltipHeight > viewportHeight + scrollY - MARGIN) {
      top = mousePosition.y + scrollY - tooltipHeight - OFFSET;
      showAbove = true;
    }

    setPosition({ top, left, showAbove });
  };

  const handleMouseEnter = (event: React.MouseEvent) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
    setShow(true);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
    setShow(false);
  };

  useEffect(() => {
    if (show) {
      calculatePosition();
    }
  }, [show, mousePosition]);

  useEffect(() => {
    if (show) {
      // Recalculer la position lors du scroll ou redimensionnement
      const handleScroll = () => calculatePosition();
      const handleResize = () => calculatePosition();
      
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleResize, { passive: true });
      
      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [show]);

  return (
    <>
      <span
        ref={triggerRef}
        className={`cursor-help border-b border-dotted border-gray-400 hover:border-gray-600 ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
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
            maxWidth: '320px',
            minWidth: '200px',
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            lineHeight: '1.4'
          }}
        >
          {content}
        </div>
      )}
    </>
  );
}