"use client";

import React, { useRef, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw } from 'lucide-react';

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
  RESEARCHER: '#4f46e5', // Indigo
  PAPER: '#059669',      // Emerald
  DATASET: '#d97706',    // Amber
  METHOD: '#e11d48',     // Rose
  TOPIC: '#0284c7',      // Sky
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
        color: TYPE_COLORS[n.type.toUpperCase()] || '#6b7280',
        selected: n.id === selectedNodeId ? 'yes' : 'no',
      },
    })),
    ...edges.map((e, idx) => ({
      data: {
        id: `e-${e.source}-${e.target}-${idx}`,
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
        'text-margin-y': 6,
        color: '#1e293b',
        'font-size': '11px',
        'font-weight': 600,
        'background-color': 'data(color)',
        width: '44px',
        height: '44px',
        'border-width': 3,
        'border-color': '#ffffff',
        'shadow-blur': 10,
        'shadow-color': 'rgba(0,0,0,0.1)',
        'shadow-opacity': 0.8,
        'transition-property': 'background-color, border-color, width, height',
        'transition-duration': '0.2s',
      },
    },
    {
      selector: 'node[selected = "yes"]',
      style: {
        'border-color': '#f59e0b',
        'border-width': 5,
        width: '54px',
        height: '54px',
        'shadow-color': '#f59e0b',
        'shadow-blur': 16,
      },
    },
    {
      selector: 'edge',
      style: {
        width: 2,
        'line-color': '#cbd5e1',
        'target-arrow-color': '#94a3b8',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        label: 'data(label)',
        'font-size': '9px',
        'text-rotation': 'autorotate',
        'text-background-color': '#ffffff',
        'text-background-opacity': 0.9,
        'text-background-padding': 2,
        'text-background-shape': 'roundrectangle',
        color: '#64748b',
      },
    },
    {
      selector: 'edge:active',
      style: {
        'line-color': '#6366f1',
        'target-arrow-color': '#6366f1',
        width: 3,
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
      cyRef.current.fit(undefined, 40);
    }
  };

  return (
    <div className="relative w-full h-[540px] rounded-2xl border border-slate-200/80 bg-slate-50/50 overflow-hidden shadow-inner">
      {/* Canvas Top Bar Controls */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs font-medium text-slate-700">
        <span className="text-slate-400">Layout:</span>
        <button
          onClick={() => setLayoutName('cose')}
          className={`px-2 py-0.5 rounded-lg transition-colors ${layoutName === 'cose' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          Force (CoSE)
        </button>
        <button
          onClick={() => setLayoutName('concentric')}
          className={`px-2 py-0.5 rounded-lg transition-colors ${layoutName === 'concentric' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          Concentric
        </button>
        <button
          onClick={() => setLayoutName('circle')}
          className={`px-2 py-0.5 rounded-lg transition-colors ${layoutName === 'circle' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          Radial
        </button>
      </div>

      {/* Floating Zoom & Reset Tools */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 bg-white/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-sm">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={handleFit}
          title="Center & Fit"
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-3 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm text-xs text-slate-600">
        <span className="font-semibold text-slate-800">Legend:</span>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: color }}
            />
            <span className="capitalize">{type.toLowerCase()}</span>
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
          animate: true,
          animationDuration: 500,
          padding: 50,
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
