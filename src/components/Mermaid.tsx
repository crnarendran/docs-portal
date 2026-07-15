'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'var(--font-geist-sans), sans-serif',
});

export function Mermaid({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    
    const renderChart = async () => {
      try {
        if (containerRef.current) {
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, chart);
          if (isMounted) {
            setSvgContent(svg);
          }
        }
      } catch (error) {
        console.error('Failed to render mermaid diagram', error);
        if (isMounted) {
          setSvgContent(`<pre class="text-red-400"><code>${error}</code></pre>`);
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  return (
    <div className="my-8 flex flex-col border border-emerald-500/30 rounded-lg overflow-hidden">
      <div className="bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-400 tracking-wider uppercase border-b border-emerald-500/30">
        Mermaid Diagram
      </div>
      <div 
        ref={containerRef} 
        className="flex justify-center bg-zinc-900/50 p-4 overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: svgContent || '<div class="text-gray-400 animate-pulse">Rendering diagram...</div>' }} 
      />
      {svgContent === '' && <div className="p-4 text-xs font-mono text-gray-500 whitespace-pre">{chart}</div>}
    </div>
  );
}
