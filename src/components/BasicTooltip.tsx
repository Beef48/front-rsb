import React, { useState, useRef, useEffect } from 'react';

interface BasicTooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export function BasicTooltip({ content, children, className = '' }: BasicTooltipProps) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, showAbove: true, arrowOffset: 50 });
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

    const MARGIN = 16; // Marge de sécurité
    const TOOLTIP_MAX_WIDTH = 320;
    
    // Position horizontale : centré par défaut, mais ajusté si ça dépasse
    const triggerCenterX = triggerRect.left + scrollX + (triggerRect.width / 2);
    
    // Vérifier le débordement horizontal avec la vraie largeur du tooltip
    const actualTooltipWidth = Math.min(TOOLTIP_MAX_WIDTH, tooltipRect.width || 200);
    
    // Centrer le tooltip horizontalement sur l'élément déclencheur
    let left = triggerCenterX - (actualTooltipWidth / 2);
    
    // Calculer le décalage de la flèche si le tooltip doit être déplacé
    let arrowOffset = 50; // Centré par défaut (50%)
    
    // Ajuster si débordement à gauche
    if (left < MARGIN) {
      const shift = MARGIN - left;
      left = MARGIN;
      // Calculer le nouveau pourcentage pour la flèche
      arrowOffset = ((triggerCenterX - MARGIN) / actualTooltipWidth) * 100;
      arrowOffset = Math.max(10, Math.min(90, arrowOffset)); // Limiter entre 10% et 90%
    }
    // Ajuster si débordement à droite
    else if (left + actualTooltipWidth > viewportWidth - MARGIN) {
      const newLeft = viewportWidth - actualTooltipWidth - MARGIN;
      // Calculer le nouveau pourcentage pour la flèche
      arrowOffset = ((triggerCenterX - newLeft) / actualTooltipWidth) * 100;
      arrowOffset = Math.max(10, Math.min(90, arrowOffset)); // Limiter entre 10% et 90%
      left = newLeft;
    }

    // Position verticale : calculer l'espace disponible au-dessus et en dessous
    const spaceAbove = triggerRect.top;
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const tooltipHeight = tooltipRect.height || 60; // Estimation si pas encore rendu
    
    let top;
    let showAbove;
    
    // Préférer placer au-dessus si il y a assez de place, sinon en dessous
    if (spaceAbove >= tooltipHeight + MARGIN && spaceAbove >= spaceBelow) {
      // Au-dessus
      top = triggerRect.top + scrollY - MARGIN;
      showAbove = true;
    } else {
      // En dessous
      top = triggerRect.bottom + scrollY + MARGIN;
      showAbove = false;
    }

    setPosition({ top, left, showAbove, arrowOffset });
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
      
      // Recalculer la position lors du scroll ou redimensionnement
      const handleScroll = () => calculatePosition();
      const handleResize = () => calculatePosition();
      
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleResize, { passive: true });
      
      return () => {
        clearTimeout(timer);
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
            transform: position.showAbove ? 'translateY(-100%)' : 'translateY(0)',
            maxWidth: '320px',
            minWidth: '200px',
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            lineHeight: '1.4'
          }}
        >
          {content}
          <div 
            className={`absolute border-4 border-transparent ${
              position.showAbove 
                ? 'top-full border-t-gray-900' 
                : 'bottom-full border-b-gray-900'
            }`}
            style={{ 
              left: `${position.arrowOffset}%`,
              transform: 'translateX(-50%)',
              marginTop: position.showAbove ? '-1px' : undefined,
              marginBottom: position.showAbove ? undefined : '-1px'
            }}
          ></div>
        </div>
      )}
    </>
  );
}