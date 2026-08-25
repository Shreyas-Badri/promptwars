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

// Vivid, high-contrast colors against dark background
const TYPE_COLORS: Record<string, string> = {
  RESEARCHER: '#60A5FA', // Bright blue
  PAPER: '#4ADE80',      // Bright green
  DATASET: '#FBBF24',    // Bright amber
  METHOD: '#C084FC',     // Bright purple
  TOPIC: '#22D3EE',      // Bright cyan
};

const TYPE_GLOW: Record<string, string> = {
  RESEARCHER: 'rgba(96, 165, 250, 0.4)',
  PAPER: 'rgba(74, 222, 128, 0.4)',
  DATASET: 'rgba(251, 191, 36, 0.4)',
  METHOD: 'rgba(192, 132, 252, 0.4)',
  TOPIC: 'rgba(34, 211, 238, 0.4)',
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
        color: TYPE_COLORS[n.type.toUpperCase()] || '#9B97A0',
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
        'text-margin-y': 6,
        color: '#E8E6E1',
        'font-size': '11px',
        'font-family': 'DM Sans, ui-sans-serif, system-ui, sans-serif',
        'font-weight': 600,
        'text-outline-color': '#0C0F1A',
        'text-outline-width': 2,
        'background-color': 'data(color)',
        width: '44px',
        height: '44px',
        'border-width': 2,
        'border-color': '#1E2340',
        'transition-property': 'background-color, border-color, width, height, border-width',
        'transition-duration': '0.2s',
      },
    },
    {
      selector: 'node[selected = "yes"]',
      style: {
        'border-color': '#D4A853',
        'border-width': 4,
        width: '52px',
        height: '52px',
      },
    },
    {
      selector: 'node:active',
      style: {
        'overlay-opacity': 0.1,
        'overlay-color': '#D4A853',
      },
    },
    {
      selector: 'edge',
      style: {
        width: 1.5,
        'line-color': 'rgba(255, 255, 255, 0.12)',
        'target-arrow-color': 'rgba(255, 255, 255, 0.25)',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        label: 'data(label)',
        'font-size': '9px',
        'font-family': 'JetBrains Mono, monospace',
        'text-rotation': 'autorotate',
        'text-background-color': '#141828',
        'text-background-opacity': 0.95,
        'text-background-padding': 3,
        'text-background-shape': 'roundrectangle',
        color: '#9B97A0',
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
    <div className="relative w-full h-[600px] rounded-xl border border-white/[0.08] bg-[#0C0F1A] overflow-hidden" role="img" aria-label="Interactive knowledge graph visualization. Click nodes to explore connections.">
      {/* Top Toolbar — Layout */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-[#141828]/95 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/[0.08] text-xs" role="toolbar" aria-label="Graph layout options">
        <span className="text-[#6B6775] text-[11px] mr-1" style={{ fontFamily: 'var(--font-mono)' }}>Layout</span>
        <button
          onClick={() => setLayoutName('cose')}
          aria-pressed={layoutName === 'cose'}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 min-h-[32px] ${
            layoutName === 'cose' 
              ? 'bg-[#D4A853] text-[#0C0F1A]' 
              : 'hover:bg-white/[0.06] text-[#9B97A0]'
          }`}
        >
          CoSE Force
        </button>
        <button
          onClick={() => setLayoutName('concentric')}
          aria-pressed={layoutName === 'concentric'}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 min-h-[32px] ${
            layoutName === 'concentric' 
              ? 'bg-[#D4A853] text-[#0C0F1A]' 
              : 'hover:bg-white/[0.06] text-[#9B97A0]'
          }`}
        >
          Concentric
        </button>
        <button
          onClick={() => setLayoutName('circle')}
          aria-pressed={layoutName === 'circle'}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 min-h-[32px] ${
            layoutName === 'circle' 
              ? 'bg-[#D4A853] text-[#0C0F1A]' 
              : 'hover:bg-white/[0.06] text-[#9B97A0]'
          }`}
        >
          Radial
        </button>
      </div>

      {/* Zoom / Reset Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-[#141828]/95 backdrop-blur-sm p-1 rounded-lg border border-white/[0.08]" role="toolbar" aria-label="Graph zoom controls">
        <button
          onClick={handleZoomIn}
          aria-label="Zoom in"
          className="p-2 hover:bg-white/[0.08] rounded-md text-[#9B97A0] hover:text-[#E8E6E1] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
        >
          <ZoomIn size={16} aria-hidden="true" />
        </button>
        <button
          onClick={handleZoomOut}
          aria-label="Zoom out"
          className="p-2 hover:bg-white/[0.08] rounded-md text-[#9B97A0] hover:text-[#E8E6E1] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
        >
          <ZoomOut size={16} aria-hidden="true" />
        </button>
        <div className="w-px h-5 bg-white/[0.08] mx-0.5" aria-hidden="true" />
        <button
          onClick={handleFit}
          aria-label="Reset view to fit all nodes"
          className="p-2 hover:bg-white/[0.08] rounded-md text-[#9B97A0] hover:text-[#E8E6E1] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
        >
          <Maximize2 size={16} aria-hidden="true" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-3 bg-[#141828]/95 backdrop-blur-sm px-3.5 py-2 rounded-lg border border-white/[0.08] text-[11px]" aria-label="Graph legend: entity types and their colors">
        <span className="font-semibold text-[#9B97A0]" style={{ fontFamily: 'var(--font-mono)' }}>Entities</span>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ backgroundColor: color, boxShadow: `0 0 6px ${TYPE_GLOW[type] || 'transparent'}` }}
              aria-hidden="true"
            />
            <span className="text-[#9B97A0]">{type}</span>
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
