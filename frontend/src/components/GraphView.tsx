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

// Matching mockup node colors: colored outlines on white
const TYPE_COLORS: Record<string, { border: string; bg: string; bgLight: string }> = {
  RESEARCHER: { border: '#06B6D4', bg: '#ECFEFF', bgLight: '#F0FDFA' },
  PAPER: { border: '#F59E0B', bg: '#FFFBEB', bgLight: '#FEF3C7' },
  DATASET: { border: '#22C55E', bg: '#F0FDF4', bgLight: '#DCFCE7' },
  METHOD: { border: '#A855F7', bg: '#FAF5FF', bgLight: '#F3E8FF' },
  TOPIC: { border: '#3B82F6', bg: '#EFF6FF', bgLight: '#DBEAFE' },
};

const TYPE_DOT_COLORS: Record<string, string> = {
  RESEARCHER: '#06B6D4',
  PAPER: '#F59E0B',
  DATASET: '#22C55E',
  METHOD: '#A855F7',
  TOPIC: '#3B82F6',
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
    ...nodes.map((n) => {
      const colors = TYPE_COLORS[n.type.toUpperCase()] || { border: '#9B97A8', bg: '#F8F7FF', bgLight: '#F1F0F7' };
      return {
        data: {
          id: n.id,
          label: n.name,
          type: n.type,
          borderColor: colors.border,
          bgColor: colors.bg,
          selected: n.id === selectedNodeId ? 'yes' : 'no',
        },
      };
    }),
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
        'text-margin-y': 7,
        color: '#1E1B4B',
        'font-size': '11px',
        'font-family': 'JetBrains Mono, monospace',
        'font-weight': 500,
        'background-color': 'data(bgColor)',
        width: '44px',
        height: '44px',
        'border-width': 2.5,
        'border-color': 'data(borderColor)',
        'transition-property': 'border-width, width, height',
        'transition-duration': '0.15s',
      },
    },
    {
      selector: 'node[selected = "yes"]',
      style: {
        'border-width': 4,
        'border-color': '#4F46E5',
        width: '52px',
        height: '52px',
      },
    },
    {
      selector: 'node:active',
      style: {
        'overlay-opacity': 0.08,
        'overlay-color': '#4F46E5',
      },
    },
    {
      selector: 'edge',
      style: {
        width: 1.5,
        'line-color': '#D4D2E0',
        'target-arrow-color': '#9B97A8',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        label: 'data(label)',
        'font-size': '9px',
        'font-family': 'JetBrains Mono, monospace',
        'text-rotation': 'autorotate',
        'text-background-color': '#FFFFFF',
        'text-background-opacity': 0.95,
        'text-background-padding': 3,
        'text-background-shape': 'roundrectangle',
        color: '#9B97A8',
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
    <div className="relative w-full h-full min-h-[560px] rounded-xl border border-[#E8E5F0] bg-white overflow-hidden" role="img" aria-label="Interactive knowledge graph. Click nodes to explore relationships.">
      
      {/* Zoom Controls — Vertical stack (matching mockup) */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-0.5 bg-white rounded-xl border border-[#E8E5F0] shadow-sm overflow-hidden" role="toolbar" aria-label="Graph zoom controls">
        <button
          onClick={handleZoomIn}
          aria-label="Zoom in"
          className="p-2.5 text-[#64607D] hover:text-[#1E1B4B] hover:bg-[#F8F7FF] transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
        >
          <ZoomIn size={16} />
        </button>
        <div className="h-px bg-[#E8E5F0]" aria-hidden="true" />
        <button
          onClick={handleZoomOut}
          aria-label="Zoom out"
          className="p-2.5 text-[#64607D] hover:text-[#1E1B4B] hover:bg-[#F8F7FF] transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
        >
          <ZoomOut size={16} />
        </button>
        <div className="h-px bg-[#E8E5F0]" aria-hidden="true" />
        <button
          onClick={handleFit}
          aria-label="Fit graph to view"
          className="p-2.5 text-[#64607D] hover:text-[#1E1B4B] hover:bg-[#F8F7FF] transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      {/* Layout Toggle — Top right */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-[#E8E5F0] shadow-sm text-xs" role="toolbar" aria-label="Graph layout options">
        {[
          { name: 'cose' as const, label: 'Force' },
          { name: 'concentric' as const, label: 'Concentric' },
          { name: 'circle' as const, label: 'Radial' },
        ].map(layout => (
          <button
            key={layout.name}
            onClick={() => setLayoutName(layout.name)}
            aria-pressed={layoutName === layout.name}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all min-h-[32px] ${
              layoutName === layout.name
                ? 'bg-[#EDE9FE] text-[#4F46E5]'
                : 'text-[#9B97A8] hover:text-[#64607D] hover:bg-[#F8F7FF]'
            }`}
          >
            {layout.label}
          </button>
        ))}
      </div>

      {/* Node Filters / Legend — Bottom left (matching mockup) */}
      <div className="absolute bottom-3 left-3 z-10 bg-white p-3 rounded-xl border border-[#E8E5F0] shadow-sm" aria-label="Node type legend">
        <p className="text-xs font-semibold text-[#1E1B4B] mb-2 flex items-center gap-1.5">
          <span className="text-[#9B97A8]">▽</span> Node Filters
        </p>
        <div className="space-y-1.5">
          {Object.entries(TYPE_DOT_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-[#4F46E5] bg-[#EDE9FE] flex items-center justify-center">
                <CheckMark />
              </div>
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <span className="text-[11px] font-medium text-[#1E1B4B]" style={{ fontFamily: 'var(--font-mono)' }}>
                {type}
              </span>
            </div>
          ))}
        </div>
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

// Small checkmark SVG for the filter checkboxes
function CheckMark() {
  return (
    <svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2 5L4.5 7.5L8 3" stroke="#4F46E5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
