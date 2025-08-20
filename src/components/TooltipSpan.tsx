import React from 'react';

interface TooltipSpanProps {
  tooltip: string;
  children: React.ReactNode;
  className?: string;
}

export function TooltipSpan({ tooltip, children, className = '' }: TooltipSpanProps) {
  return (
    <span 
      className={`tooltip-enhanced ${className}`}
      title={tooltip}
      role="tooltip"
      aria-label={tooltip}
    >
      {children}
    </span>
  );
}