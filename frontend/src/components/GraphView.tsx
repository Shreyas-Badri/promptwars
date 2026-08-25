"use client";

import React, { useRef, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface GraphNode {
  id: string;
  name: string;
  type: string;
}

interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}

interface GraphViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelectNode?: (node: GraphNode) => void;
  selectedNodeId?: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  RESEARCHER: '#1e40af', // Blue 800
  PAPER: '#065f46',      // Emerald 800
  DATASET: '#92400e',    // Amber 800
  METHOD: '#6b21a8',     // Purple 800
  TOPIC: '#075985',      // Sky 800
};

export default function GraphView({
  nodes,
  edges,
  onSelectNode,
  selectedNodeId,
}: GraphViewProps) {
  const cyRef = useRef<any>(null);
  const [layoutName, setLayoutName] = useState<'cose' | 'concentric' | 'circle'>('cose');

  const elements = [
    ...nodes.map((n) => ({
      data: {
        id: n.id,
        label: n.name,
        type: n.type,
        color: TYPE_COLORS[n.type.toUpperCase()] || '#475569',
        selected: n.id === selectedNodeId ? 'yes' : 'no',
      },
    })),
    ...edges.map((e, idx) => ({
      data: {
        id: `edge-${e.source}-${e.target}-${idx}`,
        source: e.source,
        target: e.target,
        label: e.label || 'CONNECTED_TO',
      },
    })),
  ];

  const stylesheet = [
    {
      selector: 'node',
      style: {
        label: 'data(label)',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 4,
        color: '#0f172a',
        'font-size': '11px',
        'font-family': 'ui-sans-serif, system-ui, sans-serif',
        'font-weight': 600,
        'background-color': 'data(color)',
        width: '38px',
        height: '38px',
        'border-width': 2,
        'border-color': '#ffffff',
        'transition-property': 'background-color, border-color, width, height',
        'transition-duration': '0.15s',
      },
    },
    {
      selector: 'node[selected = "yes"]',
      style: {
        'border-color': '#0284c7',
        'border-width': 4,
        width: '46px',
        height: '46px',
      },
    },
    {
      selector: 'edge',
      style: {
        width: 1.5,
        'line-color': '#cbd5e1',
        'target-arrow-color': '#94a3b8',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        label: 'data(label)',
        'font-size': '9px',
        'font-family': 'ui-sans-serif, system-ui, sans-serif',
        'text-rotation': 'autorotate',
        'text-background-color': '#ffffff',
        'text-background-opacity': 0.95,
        'text-background-padding': 2,
        'text-background-shape': 'roundrectangle',
        color: '#475569',
      },
    },
  ];

  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.25);
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8);
    }
  };

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 35);
    }
  };

  return (
    <div className="relative w-full h-[480px] rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
      {/* Top Toolbar */}
      <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs text-xs font-medium text-slate-700">
        <span className="text-slate-500 text-[11px]">Layout:</span>
        <button
          onClick={() => setLayoutName('cose')}
          className={`px-2 py-0.5 rounded text-[11px] transition-colors ${layoutName === 'cose' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
        >
          CoSE Force
        </button>
        <button
          onClick={() => setLayoutName('concentric')}
          className={`px-2 py-0.5 rounded text-[11px] transition-colors ${layoutName === 'concentric' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
        >
          Concentric
        </button>
        <button
          onClick={() => setLayoutName('circle')}
          className={`px-2 py-0.5 rounded text-[11px] transition-colors ${layoutName === 'circle' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
        >
          Radial
        </button>
      </div>

      {/* Zoom / Reset Toolbar */}
      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 bg-white p-1 rounded-md border border-slate-200 shadow-2xs text-slate-600">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1 hover:bg-slate-100 rounded text-slate-700 transition-colors"
        >
          <ZoomIn size={15} />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1 hover:bg-slate-100 rounded text-slate-700 transition-colors"
        >
          <ZoomOut size={15} />
        </button>
        <button
          onClick={handleFit}
          title="Reset View"
          className="p-1 hover:bg-slate-100 rounded text-slate-700 transition-colors"
        >
          <Maximize2 size={15} />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-2.5 left-2.5 z-10 flex flex-wrap items-center gap-2.5 bg-white/95 px-3 py-1.5 rounded-md border border-slate-200 text-[11px] text-slate-600">
        <span className="font-semibold text-slate-800">Entity Types:</span>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{ backgroundColor: color }}
            />
            <span>{type}</span>
          </div>
        ))}
      </div>

      {/* Cytoscape Canvas */}
      <CytoscapeComponent
        elements={elements}
        style={{ width: '100%', height: '100%' }}
        stylesheet={stylesheet as any}
        layout={{
          name: layoutName,
          animate: false,
          padding: 40,
        }}
        cy={(cy: any) => {
          cyRef.current = cy;
          cy.on('tap', 'node', (evt: any) => {
            const nodeData = evt.target.data();
            if (onSelectNode) {
              onSelectNode({
                id: nodeData.id,
                name: nodeData.label,
                type: nodeData.type,
              });
            }
          });
        }}
      />
    </div>
  );
}
