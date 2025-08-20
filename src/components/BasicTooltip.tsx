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

    const MARGIN = 20;
    const OFFSET = 8;

    // Dimensions du tooltip
    const tooltipWidth = Math.min(320, tooltipRect.width || 250);
    const tooltipHeight = tooltipRect.height || 80;

    // Calculer l'espace disponible dans chaque direction
    const spaceRight = viewportWidth - triggerRect.right;
    const spaceLeft = triggerRect.left;
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    let left, top, showAbove = true;

    // Logique de positionnement prioritaire
    // 1. En bas à droite si assez de place
    if (spaceBelow >= tooltipHeight + MARGIN && spaceRight >= tooltipWidth + MARGIN) {
      left = triggerRect.right + OFFSET;
      top = triggerRect.bottom + OFFSET;
      showAbove = false;
    }
    // 2. En bas à gauche si pas de place à droite
    else if (spaceBelow >= tooltipHeight + MARGIN && spaceLeft >= tooltipWidth + MARGIN) {
      left = triggerRect.left - tooltipWidth - OFFSET;
      top = triggerRect.bottom + OFFSET;
      showAbove = false;
    }
    // 3. En haut à droite si pas de place en bas
    else if (spaceAbove >= tooltipHeight + MARGIN && spaceRight >= tooltipWidth + MARGIN) {
      left = triggerRect.right + OFFSET;
      top = triggerRect.top - tooltipHeight - OFFSET;
      showAbove = true;
    }
    // 4. En haut à gauche
    else if (spaceAbove >= tooltipHeight + MARGIN && spaceLeft >= tooltipWidth + MARGIN) {
      left = triggerRect.left - tooltipWidth - OFFSET;
      top = triggerRect.top - tooltipHeight - OFFSET;
      showAbove = true;
    }
    // 5. Centré en bas (fallback)
    else {
      left = Math.max(MARGIN, Math.min(
        triggerRect.left + (triggerRect.width / 2) - (tooltipWidth / 2),
        viewportWidth - tooltipWidth - MARGIN
      ));
      top = triggerRect.bottom + OFFSET;
      showAbove = false;
    }

    // Convertir en coordonnées absolues pour le positionnement fixed
    setPosition({ 
      top: top + window.scrollY, 
      left: left + window.scrollX, 
      showAbove 
    });
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
          className="fixed bg-white border border-gray-300 text-gray-800 text-sm px-3 py-2 rounded-lg shadow-2xl z-[9999] leading-snug"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            maxWidth: '320px',
            minWidth: '180px',
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            lineHeight: '1.4'
          }}
        >
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs">{content}</div>
          </div>
          {/* Bouton de fermeture optionnel */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShow(false);
            }}
            className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 w-4 h-4 flex items-center justify-center text-xs"
            title="Fermer"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}