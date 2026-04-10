"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
}

export function DiscrepancyTooltip({ content }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ top: rect.top, left: rect.left - 8 });
    setShow(true);
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
    >
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 cursor-help">
        <AlertTriangle className="w-3 h-3" />
        Discrepancy
      </span>

      {show && content && (
        <div 
          className="fixed z-[9999] px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl whitespace-pre-wrap max-w-xs"
          style={{ top: pos.top, left: pos.left }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

interface TooltipWrapperProps {
  content: string;
  children: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipWrapperProps) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ top: rect.top, left: rect.left - 8 });
    setShow(true);
  };

  if (!content) return <>{children}</>;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div 
          className="fixed z-[9999] px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl whitespace-pre-wrap max-w-xs"
          style={{ top: pos.top, left: pos.left }}
        >
          {content}
        </div>
      )}
    </div>
  );
}