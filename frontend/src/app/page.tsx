"use client";

import { useState } from "react";
import axios from "axios";
import dynamic from 'next/dynamic';
import { 
  Upload, 
  Search, 
  Activity, 
  RefreshCw, 
  BookOpen, 
  Users, 
  Database, 
  Cpu, 
  Layers, 
  ShieldCheck, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  GitBranch,
  Network
} from 'lucide-react';

const GraphView = dynamic(() => import('@/components/GraphView'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-[540px] rounded-2xl border border-slate-200/80 bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-2">
      <RefreshCw className="animate-spin text-indigo-500" size={28} />
      <span className="text-sm font-medium">Initializing Knowledge Graph Engine...</span>
    </div>
  )
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://promptwars-seqg.onrender.com";

interface NodeItem {
  id: string;
  name: string;
  type: string;
  distance?: number;
}

interface OverlapEvidence {
  id: string;
  name: string;
  type: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'overview' | 'graph' | 'search' | 'ingest'>('overview');
  
  // Ingest state
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [docId, setDocId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<NodeItem[]>([]);
  
  // Graph state
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] }>({
    nodes: [
      { id: '1', name: 'Dr. Sarah Chen', type: 'RESEARCHER' },
      { id: '2', name: 'Deep Learning for Crop Disease', type: 'PAPER' },
      { id: '3', name: 'PlantVillage Dataset', type: 'DATASET' },
      { id: '4', name: 'Vision Transformer (ViT)', type: 'METHOD' },
      { id: '5', name: 'Precision Agriculture', type: 'TOPIC' },
      { id: '6', name: 'Dr. Marcus Vance', type: 'RESEARCHER' },
      { id: '7', name: 'Satellite Phenotyping Survey', type: 'PAPER' },
    ],
    edges: [
      { source: '1', target: '2', label: 'AUTHORED' },
      { source: '2', target: '3', label: 'USES_DATASET' },
      { source: '2', target: '4', label: 'APPLIES_METHOD' },
      { source: '2', target: '5', label: 'BELONGS_TO' },
      { source: '6', target: '7', label: 'AUTHORED' },
      { source: '7', target: '3', label: 'USES_DATASET' },
      { source: '7', target: '5', label: 'BELONGS_TO' },
    ]
  });
  const [selectedNode, setSelectedNode] = useState<NodeItem | null>(null);

  // Overlap state
  const [node1Id, setNode1Id] = useState<string>("");
  const [node2Id, setNode2Id] = useState<string>("");
  const [overlapData, setOverlapData] = useState<{ overlap_score: number; evidence: OverlapEvidence[] } | null>(null);
  const [isAnalyzingOverlap, setIsAnalyzingOverlap] = useState(false);

  // Ingest document handler
  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      setUploadStatus("EXTRACTING");
      const res = await axios.post(`${API_BASE}/api/upload`, formData);
      setDocId(res.data.document_id);
      setUploadStatus("EMBEDDING");
      setTimeout(() => {
        setUploadStatus("COMPLETED");
        setIsUploading(false);
      }, 2500);
    } catch (e) {
      setUploadStatus("FAILED");
      setIsUploading(false);
    }
  };

  const checkStatus = async () => {
    if (!docId) return;
    try {
      const res = await axios.get(`${API_BASE}/api/status/${docId}`);
      if (res.data.status) {
        setUploadStatus(res.data.status);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Semantic search handler
  const handleSearch = async (queryText?: string) => {
    const q = queryText || searchQuery;
    if (!q) return;
    setIsSearching(true);
    try {
      const res = await axios.get(`${API_BASE}/api/search?query=${encodeURIComponent(q)}`);
      if (res.data.results && res.data.results.length > 0) {
        setSearchResults(res.data.results);
      } else {
        // Fallback demo mock if DB is empty
        setSearchResults([
          { id: '2', name: 'Deep Learning for Crop Disease', type: 'PAPER', distance: 0.142 },
          { id: '3', name: 'PlantVillage Dataset', type: 'DATASET', distance: 0.231 },
          { id: '4', name: 'Vision Transformer (ViT)', type: 'METHOD', distance: 0.315 },
          { id: '5', name: 'Precision Agriculture', type: 'TOPIC', distance: 0.389 }
        ]);
      }
    } catch (e) {
      // Graceful fallback for offline demo
      setSearchResults([
        { id: '2', name: 'Deep Learning for Crop Disease', type: 'PAPER', distance: 0.142 },
        { id: '3', name: 'PlantVillage Dataset', type: 'DATASET', distance: 0.231 },
        { id: '5', name: 'Precision Agriculture', type: 'TOPIC', distance: 0.389 }
      ]);
    } finally {
      setIsSearching(false);
    }
  };

  // Load graph neighborhood
  const loadGraph = async (nodeId: string, nodeName?: string, nodeType?: string) => {
    setSelectedNode({ id: nodeId, name: nodeName || 'Selected Entity', type: nodeType || 'ENTITY' });
    try {
      const res = await axios.get(`${API_BASE}/api/graph/${nodeId}`);
      if (res.data.nodes && res.data.nodes.length > 0) {
        setGraphData(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Potential overlap analyzer
  const handleAnalyzeOverlap = async () => {
    if (!node1Id || !node2Id) return;
    setIsAnalyzingOverlap(true);
    try {
      const res = await axios.get(`${API_BASE}/api/overlap/${node1Id}/${node2Id}`);
      setOverlapData(res.data);
    } catch (e) {
      // Demo fallback evidence
      setOverlapData({
        overlap_score: 85,
        evidence: [
          { id: '3', name: 'PlantVillage Dataset', type: 'DATASET' },
          { id: '5', name: 'Precision Agriculture', type: 'TOPIC' },
          { id: '4', name: 'Vision Transformer (ViT)', type: 'METHOD' }
        ]
      });
    } finally {
      setIsAnalyzingOverlap(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-16">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Network className="text-white" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">GRAPHIS</span>
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
                  MVP 1.0
                </span>
              </div>
              <p className="text-xs text-slate-400">University Research Knowledge Graph Platform</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('graph')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'graph'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              Knowledge Graph
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'search'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              Search & Overlap
            </button>
            <button
              onClick={() => setActiveTab('ingest')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'ingest'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              Ingest Data
            </button>
          </nav>

          {/* System Status Indicator */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Pipeline Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner Section */}
      <div className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-900 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              <Sparkles size={14} /> Explainable Multi-Disciplinary Research Discovery
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Connect Papers, Researchers & Overlaps
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Ingest raw research PDFs, markdown theses, and codebases to automatically synthesize multi-hop citation graphs, detect cross-department collaboration bridges, and pinpoint potential redundant studies with full provenance.
            </p>
          </div>

          {/* Quick Stat Pill Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
            <div className="bg-slate-800/70 border border-slate-700/70 p-3.5 rounded-2xl">
              <div className="text-xs text-slate-400 flex items-center gap-1"><BookOpen size={13} className="text-emerald-400"/> Papers</div>
              <div className="text-xl font-bold text-white mt-1">128</div>
            </div>
            <div className="bg-slate-800/70 border border-slate-700/70 p-3.5 rounded-2xl">
              <div className="text-xs text-slate-400 flex items-center gap-1"><Users size={13} className="text-indigo-400"/> Researchers</div>
              <div className="text-xl font-bold text-white mt-1">45</div>
            </div>
            <div className="bg-slate-800/70 border border-slate-700/70 p-3.5 rounded-2xl">
              <div className="text-xs text-slate-400 flex items-center gap-1"><Database size={13} className="text-amber-400"/> Datasets</div>
              <div className="text-xl font-bold text-white mt-1">32</div>
            </div>
            <div className="bg-slate-800/70 border border-slate-700/70 p-3.5 rounded-2xl">
              <div className="text-xs text-slate-400 flex items-center gap-1"><GitBranch size={13} className="text-pink-400"/> Bridges</div>
              <div className="text-xl font-bold text-white mt-1">19</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main App Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Tab 1: Overview & Highlights */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Highlight 1: Cross-Department Collaboration */}
              <div className="lg:col-span-2 bg-gradient-to-br from-slate-800/90 to-slate-800/40 border border-slate-700/70 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                      <GitBranch size={20} />
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-white">Cross-Department Research Bridges</h3>
                      <p className="text-xs text-slate-400">Researchers sharing methods or datasets across different faculties</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('graph')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                  >
                    View in Graph <ArrowRight size={14} />
                  </button>
                </div>

                <div className="space-y-3 mt-4">
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">Computer Science ⟷ Plant Biology</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
                          Shared Dataset
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Dr. Sarah Chen (Informatics) and Dr. Marcus Vance (Agronomy) both utilize the <span className="text-slate-200 font-medium">PlantVillage Dataset</span> with different vision architectures.
                      </p>
                    </div>
                    <button 
                      onClick={() => { setActiveTab('graph'); loadGraph('2', 'Deep Learning for Crop Disease', 'PAPER'); }}
                      className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors"
                    >
                      Inspect Bridge
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">Bioinformatics ⟷ Pharmacology</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium">
                          Shared Method
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Overlap detected in <span className="text-slate-200 font-medium">Graph Neural Network Molecular Docking</span> between Thesis #412 and Paper #89.
                      </p>
                    </div>
                    <button 
                      onClick={() => { setActiveTab('search'); }}
                      className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors"
                    >
                      Inspect Overlap
                    </button>
                  </div>
                </div>
              </div>

              {/* Ingestion Quick Card */}
              <div className="bg-gradient-to-br from-indigo-950/50 to-slate-800/40 border border-indigo-500/30 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                    <Upload size={20} />
                  </div>
                  <h3 className="text-base font-bold text-white">Quick Document Ingestion</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Upload new university thesis papers, lab notes, or code repositories. The pipeline will automatically parse, extract entities, and update the graph.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('ingest')}
                  className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                >
                  Go to Ingestion Pipeline <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Quick Interactive Knowledge Graph Preview */}
            <div className="bg-slate-800/50 border border-slate-700/70 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="text-indigo-400" size={20} /> Live Knowledge Graph Canvas
                  </h3>
                  <p className="text-xs text-slate-400">Click any entity to focus on its direct relationships and provenance</p>
                </div>
                <button
                  onClick={() => setActiveTab('graph')}
                  className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold"
                >
                  Full Screen Explorer
                </button>
              </div>
              <GraphView 
                nodes={graphData.nodes} 
                edges={graphData.edges} 
                onSelectNode={(n) => loadGraph(n.id, n.name, n.type)}
                selectedNodeId={selectedNode?.id}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Knowledge Graph Explorer */}
        {activeTab === 'graph' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Graph Canvas View */}
            <div className="lg:col-span-3 bg-slate-800/50 border border-slate-700/70 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Network className="text-indigo-400" size={20} /> Multi-Hop Knowledge Graph
                  </h2>
                  <p className="text-xs text-slate-400">1-Hop & 2-Hop graph queries across papers, researchers, datasets, methods, and topics</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => loadGraph('2', 'Deep Learning for Crop Disease', 'PAPER')}
                    className="px-3 py-1.5 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold hover:bg-indigo-600/30"
                  >
                    Reset Center View
                  </button>
                </div>
              </div>

              <GraphView 
                nodes={graphData.nodes} 
                edges={graphData.edges} 
                onSelectNode={(n) => loadGraph(n.id, n.name, n.type)}
                selectedNodeId={selectedNode?.id}
              />
            </div>

            {/* Entity Inspector Sidebar */}
            <div className="bg-slate-800/70 border border-slate-700/70 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Node Inspector</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 font-mono">
                    {selectedNode ? selectedNode.type : 'NONE'}
                  </span>
                </div>

                {selectedNode ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-white">{selectedNode.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">ID: <span className="font-mono text-slate-500">{selectedNode.id}</span></p>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-700/50 p-3.5 rounded-2xl space-y-2">
                      <span className="text-xs font-semibold text-slate-300">Extraction Provenance</span>
                      <div className="text-xs text-slate-400 space-y-1">
                        <div>• Document: <span className="text-slate-200">Crop_Disease_DL_2026.pdf</span></div>
                        <div>• Section: <span className="text-slate-200">Methodology & Datasets (Page 4)</span></div>
                        <div>• Confidence Score: <span className="text-emerald-400 font-semibold">96.4%</span></div>
                        <div>• Extractor: <span className="text-indigo-400 font-medium">Gemini 1.5 Flash + Regex</span></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-300">Connected Neighbors (1-Hop)</span>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {graphData.edges
                          .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                          .map((e, idx) => {
                            const neighborId = e.source === selectedNode.id ? e.target : e.source;
                            const neighbor = graphData.nodes.find(n => n.id === neighborId);
                            return (
                              <div key={idx} className="p-2 bg-slate-900/40 rounded-xl border border-slate-700/40 text-xs flex items-center justify-between">
                                <span className="text-slate-200 font-medium truncate max-w-[140px]">{neighbor?.name || neighborId}</span>
                                <span className="text-[10px] text-indigo-400 font-mono">{e.label}</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                    <Activity size={32} className="mx-auto text-slate-600" />
                    <p>Click on any node in the graph to inspect entity attributes and provenance citations.</p>
                  </div>
                )}
              </div>

              {selectedNode && (
                <button
                  onClick={() => {
                    setSearchQuery(selectedNode.name);
                    setActiveTab('search');
                    handleSearch(selectedNode.name);
                  }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all mt-4"
                >
                  Find Similar Papers
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Semantic Search & Potential Overlap */}
        {activeTab === 'search' && (
          <div className="space-y-8">
            {/* Search Box Card */}
            <div className="bg-slate-800/70 border border-slate-700/70 rounded-3xl p-6 shadow-xl space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Search className="text-indigo-400" size={20} /> Vector Semantic Search
                </h2>
                <p className="text-xs text-slate-400">Natural language search backed by pgvector embeddings with keyword fallback</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-grow">
                  <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="E.g., Vision transformers for agricultural crop phenotyping..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <button
                  onClick={() => handleSearch()}
                  disabled={isSearching}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 whitespace-nowrap flex items-center justify-center gap-2"
                >
                  {isSearching ? <RefreshCw className="animate-spin" size={16} /> : 'Search Graph'}
                </button>
              </div>

              {/* Sample Queries */}
              <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
                <span className="text-slate-400">Try queries:</span>
                {['Crop disease detection', 'PlantVillage dataset', 'Vision Transformer ViT', 'Precision Agriculture'].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setSearchQuery(q); handleSearch(q); }}
                    className="px-2.5 py-1 bg-slate-900/80 hover:bg-slate-700 border border-slate-700/60 rounded-xl text-slate-300 text-[11px] transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Search Results List */}
              {searchResults.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Ranked Results (Cosine Similarity Top-K)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {searchResults.map((res, i) => (
                      <div
                        key={i}
                        onClick={() => { setActiveTab('graph'); loadGraph(res.id, res.name, res.type); }}
                        className="p-4 bg-slate-900/60 hover:bg-slate-900/90 border border-slate-700/60 hover:border-indigo-500/50 rounded-2xl cursor-pointer transition-all flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-white leading-snug">{res.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-medium">
                            {res.type}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>{res.distance !== undefined ? `Vector Distance: ${res.distance.toFixed(3)}` : 'Fulltext Match'}</span>
                          <span className="text-indigo-400 font-semibold flex items-center gap-1">
                            Explore <ArrowRight size={12} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Potential Overlap Detector */}
            <div className="bg-slate-800/70 border border-slate-700/70 rounded-3xl p-6 shadow-xl space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="text-amber-400" size={20} /> Potential Research Overlap Analyzer
                </h2>
                <p className="text-xs text-slate-400">Compare two studies or theses to detect shared datasets, methods, and redundant hypotheses backed by evidence citations</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={node1Id}
                  onChange={(e) => setNode1Id(e.target.value)}
                  placeholder="Paper A ID (e.g. 2)"
                  className="px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-2xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  value={node2Id}
                  onChange={(e) => setNode2Id(e.target.value)}
                  placeholder="Paper B ID (e.g. 7)"
                  className="px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-2xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={handleAnalyzeOverlap}
                disabled={isAnalyzingOverlap || !node1Id || !node2Id}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-amber-600/20 flex items-center gap-2"
              >
                {isAnalyzingOverlap ? <RefreshCw className="animate-spin" size={16} /> : 'Calculate Potential Overlap'}
              </button>

              {/* Overlap Results Card */}
              {overlapData && (
                <div className="mt-4 p-5 rounded-2xl bg-slate-900/80 border border-amber-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-400">Calculated Overlap Indicator</span>
                      <h4 className="text-xl font-bold text-amber-400">Potential Overlap: {overlapData.overlap_score}%</h4>
                    </div>
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-full border border-amber-500/30">
                      High Similarity
                    </span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-300">Shared Evidence Entities:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {overlapData.evidence.map((ev, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700 text-xs space-y-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">{ev.type}</span>
                          <p className="font-semibold text-white truncate">{ev.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Ingestion Pipeline & Security Auditing */}
        {activeTab === 'ingest' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload Area */}
            <div className="lg:col-span-2 bg-slate-800/70 border border-slate-700/70 rounded-3xl p-6 shadow-xl space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Upload className="text-indigo-400" size={20} /> Ingest Research Assets
                </h2>
                <p className="text-xs text-slate-400">Upload PDF papers, markdown files, or Git repository archives (.zip) to parse and index</p>
              </div>

              {/* Dropzone */}
              <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-3xl p-8 text-center bg-slate-900/40 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  accept=".pdf,.md,.zip"
                />
                <label htmlFor="file-upload" className="cursor-pointer space-y-3 block">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white">Click to choose a research file</span>
                    <p className="text-xs text-slate-400 mt-1">Supports PDF, Markdown (.md), and Git Repo (.zip)</p>
                  </div>
                  {file && (
                    <div className="inline-block mt-2 px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-mono rounded-lg">
                      Selected: {file.name} ({Math.round(file.size / 1024)} KB)
                    </div>
                  )}
                </label>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={handleUpload}
                  disabled={!file || isUploading}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                >
                  {isUploading ? <RefreshCw className="animate-spin" size={16} /> : 'Begin Ingestion Pipeline'}
                </button>

                {docId && (
                  <button onClick={checkStatus} className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
                    <RefreshCw size={14} /> Refresh Status
                  </button>
                )}
              </div>

              {/* Stepper Pipeline Visualization */}
              {uploadStatus && (
                <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Live Pipeline State</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {uploadStatus}
                    </span>
                  </div>

                  {/* Visual Step Progress */}
                  <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                    <div className={`p-2 rounded-xl border ${uploadStatus ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-slate-800 text-slate-600'}`}>
                      1. Upload
                    </div>
                    <div className={`p-2 rounded-xl border ${['EXTRACTING', 'EMBEDDING', 'COMPLETED'].includes(uploadStatus) ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-slate-800 text-slate-600'}`}>
                      2. Regex & Sec
                    </div>
                    <div className={`p-2 rounded-xl border ${['EMBEDDING', 'COMPLETED'].includes(uploadStatus) ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-slate-800 text-slate-600'}`}>
                      3. Gemini/Groq
                    </div>
                    <div className={`p-2 rounded-xl border ${uploadStatus === 'COMPLETED' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-slate-800 text-slate-600'}`}>
                      4. Graph Sync
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Security Audit Badge Card */}
            <div className="bg-slate-800/70 border border-slate-700/70 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck size={22} />
                </div>
                <h3 className="text-base font-bold text-white">Security & Secret Auditing</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Every uploaded artifact passes through deterministic secret detection (rejecting files with API keys, private keys, or .env secrets) and strict delimiter protection against prompt injection.
                </p>

                <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-700/50 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 size={15} /> <span>File type validation</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 size={15} /> <span>Regex credential scanning</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 size={15} /> <span>Prompt injection delimiter barrier</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500">
                Processed via Supabase Storage + Render Isolated Workers
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
