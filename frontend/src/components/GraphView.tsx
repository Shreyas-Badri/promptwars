"use client";

import React from 'react';
import CytoscapeComponent from 'react-cytoscapejs';

export default function GraphView({ nodes, edges }: { nodes: any[], edges: any[] }) {
  const elements = [
    ...nodes.map(n => ({ data: { id: n.id, label: n.name, type: n.type } })),
    ...edges.map(e => ({ data: { source: e.source, target: e.target, label: e.label } }))
  ];

  const stylesheet = [
    {
      selector: 'node',
      style: {
        'label': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#fff',
        'background-color': '#0074D9',
        'font-size': '12px',
        'width': '60px',
        'height': '60px'
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#ccc',
        'target-arrow-color': '#ccc',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'label': 'data(label)',
        'font-size': '10px'
      }
    }
  ];

  return (
    <div className="w-full h-[500px] border rounded bg-white shadow-sm">
      <CytoscapeComponent 
        elements={elements} 
        style={{ width: '100%', height: '100%' }}
        stylesheet={stylesheet as any}
        layout={{ name: 'cose' }} 
      />
    </div>
  );
}
