import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface BasicTooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export function BasicTooltip({ content, children, className = '' }: BasicTooltipProps) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, showAbove: true });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    const MARGIN = 16;
    const OFFSET = 8;

    // Position par défaut : à droite de l'icône
    let left = triggerRect.right + scrollX + OFFSET;
    let top = triggerRect.top + scrollY;
    let showAbove = true;

    // Vérifier le débordement horizontal
    const tooltipWidth = tooltipRect.width || 250;
    
    // Si débordement à droite, placer à gauche de l'icône
    if (left + tooltipWidth > viewportWidth - MARGIN) {
      left = triggerRect.left + scrollX - tooltipWidth - OFFSET;
    }
    
    // Si encore débordement à gauche, centrer sous l'icône
    if (left < MARGIN) {
      left = triggerRect.left + scrollX + (triggerRect.width / 2) - (tooltipWidth / 2);
      top = triggerRect.bottom + scrollY + OFFSET;
      showAbove = false;
      
      // Ajuster si débordement horizontal en mode centré
      if (left < MARGIN) left = MARGIN;
      if (left + tooltipWidth > viewportWidth - MARGIN) {
        left = viewportWidth - tooltipWidth - MARGIN;
      }
    }

    // Vérifier le débordement vertical
    const tooltipHeight = tooltipRect.height || 80;
    
    // Si débordement en bas et pas déjà en mode "en dessous"
    if (showAbove && top + tooltipHeight > viewportHeight + scrollY - MARGIN) {
      top = triggerRect.bottom + scrollY + OFFSET;
      showAbove = false;
    }

    setPosition({ top, left, showAbove });
  };

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setShow(!show);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (triggerRef.current && !triggerRef.current.contains(event.target as Node) &&
        tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
      setShow(false);
    }
  };

  useEffect(() => {
    if (show) {
      // Petit délai pour que le tooltip soit rendu avant de calculer la position
      const timer = setTimeout(calculatePosition, 10);
      return () => clearTimeout(timer);
    }
  }, [show]);

  useEffect(() => {
    if (show) {
      // Écouter les clics à l'extérieur
      document.addEventListener('mousedown', handleClickOutside);
      
      // Recalculer la position lors du scroll ou redimensionnement
      const handleScroll = () => calculatePosition();
      const handleResize = () => calculatePosition();
      
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleResize, { passive: true });
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [show]);

  return (
    <>
      <span className={`inline-flex items-center gap-1 ${className}`}>
        {children}
        <button
          ref={triggerRef}
          onClick={handleClick}
          className={`inline-flex items-center justify-center w-4 h-4 rounded-full transition-colors ${
            show 
              ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
              : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
          }`}
          title="Plus d'informations"
        >
          <Info className="w-3 h-3" />
        </button>
      </span>
      
      {show && (
        <div
          ref={tooltipRef}
          className="fixed bg-white border border-gray-200 text-gray-800 text-sm px-4 py-3 rounded-lg shadow-xl z-[9999] leading-relaxed"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            maxWidth: '320px',
            minWidth: '200px',
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            lineHeight: '1.5'
          }}
        >
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>{content}</div>
          </div>
        </div>
      )}
    </>
  );
}