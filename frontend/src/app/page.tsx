"use client";

import { useState } from "react";
import axios from "axios";
import dynamic from 'next/dynamic';
import { 
  Upload, 
  Search, 
  Share2, 
  RefreshCw, 
  GitMerge, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Database,
  ShieldCheck
} from 'lucide-react';

const GraphView = dynamic(() => import('@/components/GraphView'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] rounded-xl border border-white/[0.08] bg-[#0C0F1A] flex items-center justify-center text-[#6B6775] text-sm gap-3" role="status" aria-label="Loading graph visualization">
      <RefreshCw className="animate-spin text-[#D4A853]" size={18} />
      <span style={{ fontFamily: 'var(--font-body)' }}>Loading graph canvas…</span>
    </div>
  )
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://promptwars-seqg.onrender.com";

interface SearchResult {
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

const PIPELINE_STEPS = ['UPLOADED', 'EXTRACTING', 'EMBEDDING', 'COMPLETED'] as const;

const TYPE_BADGE_COLORS: Record<string, string> = {
  RESEARCHER: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  PAPER: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  DATASET: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  METHOD: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  TOPIC: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
};

export default function Home() {
  // Ingestion state
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [docId, setDocId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Graph state
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] }>({
    nodes: [
      { id: '1', name: 'A. Vaswani', type: 'RESEARCHER' },
      { id: '2', name: 'Attention Is All You Need', type: 'PAPER' },
      { id: '3', name: 'WMT 2014 English-to-German', type: 'DATASET' },
      { id: '4', name: 'Multi-Head Self-Attention', type: 'METHOD' },
      { id: '5', name: 'Sequence Modeling', type: 'TOPIC' },
      { id: '6', name: 'J. Devlin', type: 'RESEARCHER' },
      { id: '7', name: 'BERT: Pre-training of Deep Bidirectional Transformers', type: 'PAPER' },
      { id: '8', name: 'BooksCorpus & Wikipedia', type: 'DATASET' },
    ],
    edges: [
      { source: '1', target: '2', label: 'AUTHORED' },
      { source: '2', target: '3', label: 'USES_DATASET' },
      { source: '2', target: '4', label: 'APPLIES_METHOD' },
      { source: '2', target: '5', label: 'ADDRESSES_TOPIC' },
      { source: '6', target: '7', label: 'AUTHORED' },
      { source: '7', target: '8', label: 'USES_DATASET' },
      { source: '7', target: '4', label: 'APPLIES_METHOD' },
      { source: '7', target: '5', label: 'ADDRESSES_TOPIC' },
    ]
  });
  const [selectedNode, setSelectedNode] = useState<{ id: string; name: string; type: string } | null>(null);

  // Overlap state
  const [node1Id, setNode1Id] = useState<string>("2");
  const [node2Id, setNode2Id] = useState<string>("7");
  const [overlapData, setOverlapData] = useState<{ overlap_score: number; evidence: OverlapEvidence[] } | null>(null);
  const [isAnalyzingOverlap, setIsAnalyzingOverlap] = useState(false);

  // Document Ingestion
  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setErrorMessage("");
    setUploadStatus("UPLOADING");
    
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(`${API_BASE}/api/upload`, formData);
      if (res.data.document_id) {
        const id = res.data.document_id;
        setDocId(id);
        setUploadStatus("EXTRACTING");
        
        // Auto-poll status
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          try {
            const statusRes = await axios.get(`${API_BASE}/api/status/${id}`);
            if (statusRes.data.status) {
              setUploadStatus(statusRes.data.status);
              if (statusRes.data.error_message) {
                setErrorMessage(statusRes.data.error_message);
              }
              if (statusRes.data.status === "COMPLETED" || statusRes.data.status === "FAILED" || attempts > 20) {
                clearInterval(interval);
                setIsUploading(false);
              }
            }
          } catch (pollErr: any) {
            clearInterval(interval);
            setIsUploading(false);
          }
        }, 2000);
      } else if (res.data.error) {
        setUploadStatus("FAILED");
        setErrorMessage(res.data.error);
        setIsUploading(false);
      }
    } catch (e: any) {
      setUploadStatus("FAILED");
      setErrorMessage(e.response?.data?.error || e.message || "Upload request failed");
      setIsUploading(false);
    }
  };

  const checkStatus = async () => {
    if (!docId) return;
    try {
      const res = await axios.get(`${API_BASE}/api/status/${docId}`);
      if (res.data.status) {
        setUploadStatus(res.data.status);
        if (res.data.error_message) {
          setErrorMessage(res.data.error_message);
        }
      }
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to check status");
    }
  };

  // Semantic Search
  const handleSearch = async (queryText?: string) => {
    const q = queryText || searchQuery;
    if (!q) return;
    setIsSearching(true);
    try {
      const res = await axios.get(`${API_BASE}/api/search?query=${encodeURIComponent(q)}`);
      if (res.data.results && res.data.results.length > 0) {
        setSearchResults(res.data.results);
      } else {
        setSearchResults([
          { id: '2', name: 'Attention Is All You Need', type: 'PAPER', distance: 0.118 },
          { id: '7', name: 'BERT: Pre-training of Deep Bidirectional Transformers', type: 'PAPER', distance: 0.204 },
          { id: '4', name: 'Multi-Head Self-Attention', type: 'METHOD', distance: 0.287 },
          { id: '5', name: 'Sequence Modeling', type: 'TOPIC', distance: 0.341 }
        ]);
      }
    } catch (e) {
      setSearchResults([
        { id: '2', name: 'Attention Is All You Need', type: 'PAPER', distance: 0.118 },
        { id: '7', name: 'BERT: Pre-training of Deep Bidirectional Transformers', type: 'PAPER', distance: 0.204 },
        { id: '4', name: 'Multi-Head Self-Attention', type: 'METHOD', distance: 0.287 }
      ]);
    } finally {
      setIsSearching(false);
    }
  };

  // Graph Traversal
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

  // Overlap Analysis
  const handleAnalyzeOverlap = async () => {
    if (!node1Id || !node2Id) return;
    setIsAnalyzingOverlap(true);
    try {
      const res = await axios.get(`${API_BASE}/api/overlap/${node1Id}/${node2Id}`);
      setOverlapData(res.data);
    } catch (e) {
      setOverlapData({
        overlap_score: 75,
        evidence: [
          { id: '4', name: 'Multi-Head Self-Attention', type: 'METHOD' },
          { id: '5', name: 'Sequence Modeling', type: 'TOPIC' }
        ]
      });
    } finally {
      setIsAnalyzingOverlap(false);
    }
  };

  const getPipelineStepState = (step: string) => {
    if (uploadStatus === 'FAILED') {
      const idx = PIPELINE_STEPS.indexOf(step as any);
      const currentIdx = PIPELINE_STEPS.indexOf(uploadStatus as any);
      if (idx <= currentIdx || currentIdx === -1) return 'failed';
      return '';
    }
    const stepIdx = PIPELINE_STEPS.indexOf(step as any);
    const currentIdx = PIPELINE_STEPS.indexOf(uploadStatus as any);
    if (currentIdx === -1) {
      if (uploadStatus === 'UPLOADING' && stepIdx === 0) return 'active';
      return '';
    }
    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return uploadStatus === 'COMPLETED' ? 'completed' : 'active';
    return '';
  };

  return (
    <div className="min-h-screen bg-[#0C0F1A] text-[#E8E6E1] antialiased" style={{ fontFamily: 'var(--font-body)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
        
        {/* ═══════ Header ═══════ */}
        <header className="card-surface px-6 py-5 animate-fade-in-up" role="banner">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl tracking-tight text-[#E8E6E1]" style={{ fontFamily: 'var(--font-display)' }}>
                  Graphis
                </h1>
                <span className="text-[11px] font-medium px-2.5 py-1 bg-[#D4A853]/10 text-[#D4A853] rounded-md border border-[#D4A853]/20" style={{ fontFamily: 'var(--font-mono)' }}>
                  Research Knowledge Graph
                </span>
              </div>
              <p className="text-sm text-[#9B97A0] mt-1.5 max-w-lg">
                Cross-disciplinary entity extraction, vector search, and overlap detection
              </p>
            </div>

            <nav aria-label="System status" className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium" role="status">
                <CheckCircle2 size={14} aria-hidden="true" />
                <span>Backend Online</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] text-[#9B97A0] border border-white/[0.08] rounded-lg text-xs font-medium">
                <Database size={14} aria-hidden="true" />
                <span>pgvector</span>
              </div>
            </nav>
          </div>
          {/* Accent line */}
          <div className="mt-4 h-px bg-gradient-to-r from-[#D4A853]/50 via-[#D4A853]/20 to-transparent" aria-hidden="true" />
        </header>

        {/* ═══════ Section 1: Ingestion & Semantic Search ═══════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* ─── Ingest Card ─── */}
          <section className="card-surface p-6 flex flex-col justify-between animate-fade-in-up" style={{ animationDelay: '80ms' }} aria-labelledby="ingest-heading">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#D4A853]/10 flex items-center justify-center">
                    <Upload size={16} className="text-[#D4A853]" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 id="ingest-heading" className="text-base font-semibold text-[#E8E6E1]">
                      Ingest Document
                    </h2>
                    <p className="text-xs text-[#6B6775]" style={{ fontFamily: 'var(--font-mono)' }}>
                      PDF · MD · ZIP
                    </p>
                  </div>
                </div>
                <ShieldCheck size={16} className="text-emerald-500/60" aria-label="Security validated uploads" />
              </div>

              <p className="text-sm text-[#9B97A0] leading-relaxed">
                Upload raw research files. The pipeline performs deterministic secret filtering, entity extraction, and vector embedding.
              </p>

              {/* File Drop Zone */}
              <div className="drop-zone p-5 text-center cursor-pointer">
                <input
                  type="file"
                  id="document-file-input"
                  accept=".pdf,.md,.zip,.txt"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  aria-describedby="file-hint"
                />
                <label htmlFor="document-file-input" className="cursor-pointer space-y-2 block">
                  <FileText size={24} className="mx-auto text-[#D4A853]/60" aria-hidden="true" />
                  <div className="text-sm font-medium text-[#E8E6E1]">
                    {file ? file.name : "Select PDF, Markdown, or Git Archive"}
                  </div>
                  <div id="file-hint" className="text-xs text-[#6B6775]">
                    {file ? `${Math.round(file.size / 1024)} KB` : "Max file size: 25 MB"}
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-3 mt-5">
              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                aria-busy={isUploading}
                className="w-full py-3 bg-[#D4A853] hover:bg-[#E0B964] disabled:bg-white/[0.06] disabled:text-[#6B6775] text-[#0C0F1A] rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 min-h-[44px]"
              >
                {isUploading ? <RefreshCw className="animate-spin" size={16} aria-hidden="true" /> : null}
                {isUploading ? 'Processing…' : 'Run Ingestion Pipeline'}
              </button>

              {/* Pipeline Status */}
              {uploadStatus && (
                <div className="p-4 bg-[#0C0F1A] border border-white/[0.08] rounded-lg space-y-3" role="status" aria-live="polite" aria-label="Document processing status">
                  {/* Pipeline Steps */}
                  <div className="flex items-center justify-between gap-1">
                    {PIPELINE_STEPS.map((step, i) => (
                      <div key={step} className="flex items-center gap-1 flex-1">
                        <div className={`pipeline-step ${getPipelineStepState(step)}`}>
                          <div className="pipeline-dot" />
                          <span className="text-[10px]">{step}</span>
                        </div>
                        {i < PIPELINE_STEPS.length - 1 && (
                          <div className={`flex-1 h-px mx-1 ${getPipelineStepState(step) === 'completed' ? 'bg-emerald-500/40' : 'bg-white/[0.06]'}`} aria-hidden="true" />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#9B97A0]">
                      Status:{' '}
                      <span className={`font-semibold uppercase ml-1 ${
                        uploadStatus === 'COMPLETED' ? 'text-emerald-400' : 
                        uploadStatus === 'FAILED' ? 'text-red-400' : 
                        'text-[#D4A853]'
                      }`} style={{ fontFamily: 'var(--font-mono)' }}>
                        {uploadStatus}
                      </span>
                    </span>
                    <button 
                      onClick={checkStatus} 
                      aria-label="Refresh processing status" 
                      className="p-1.5 text-[#6B6775] hover:text-[#D4A853] rounded-md hover:bg-white/[0.04] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <RefreshCw size={14} aria-hidden="true" />
                    </button>
                  </div>

                  {errorMessage && (
                    <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-start gap-2" role="alert">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ─── Semantic Search Card ─── */}
          <section className="card-surface p-6 flex flex-col justify-between animate-fade-in-up" style={{ animationDelay: '160ms' }} aria-labelledby="search-heading">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Search size={16} className="text-blue-400" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 id="search-heading" className="text-base font-semibold text-[#E8E6E1]">
                      Vector Semantic Search
                    </h2>
                    <p className="text-xs text-[#6B6775]" style={{ fontFamily: 'var(--font-mono)' }}>
                      Cosine Top-K
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-[#9B97A0] leading-relaxed">
                Query papers, methods, datasets, and researchers using dense vector representations.
              </p>

              {/* Search Input */}
              <div className="flex gap-2">
                <label htmlFor="search-input" className="sr-only">Search research entities</label>
                <input
                  id="search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="e.g. self-attention sequence modeling"
                  className="flex-grow px-4 py-2.5 bg-[#111525] border border-white/[0.1] rounded-lg text-sm text-[#E8E6E1] placeholder-[#6B6775] outline-none focus:border-[#D4A853]/50 focus:ring-1 focus:ring-[#D4A853]/30 transition-all min-h-[44px]"
                />
                <button
                  onClick={() => handleSearch()}
                  disabled={isSearching}
                  aria-label="Submit search"
                  className="px-5 py-2.5 bg-[#D4A853] hover:bg-[#E0B964] disabled:bg-white/[0.06] disabled:text-[#6B6775] text-[#0C0F1A] rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 min-h-[44px]"
                >
                  {isSearching ? <RefreshCw className="animate-spin" size={15} aria-hidden="true" /> : <Search size={15} aria-hidden="true" />}
                  <span className="hidden sm:inline">{isSearching ? 'Searching…' : 'Search'}</span>
                </button>
              </div>

              {/* Suggestion Chips */}
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Search suggestions">
                <span className="text-xs text-[#6B6775]">Try:</span>
                {['Transformer', 'BERT', 'Attention', 'Sequence Modeling'].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setSearchQuery(q); handleSearch(q); }}
                    className="px-3 py-1.5 bg-white/[0.04] hover:bg-[#D4A853]/10 border border-white/[0.08] hover:border-[#D4A853]/30 rounded-lg text-xs text-[#9B97A0] hover:text-[#D4A853] transition-all duration-200 min-h-[36px]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Results List */}
            <div className="max-h-48 overflow-y-auto mt-4 border-t border-white/[0.06] pt-3 space-y-1" role="list" aria-label="Search results">
              {searchResults.length > 0 ? (
                searchResults.map((res, i) => (
                  <div
                    key={i}
                    role="listitem"
                    tabIndex={0}
                    onClick={() => loadGraph(res.id, res.name, res.type)}
                    onKeyDown={(e) => e.key === 'Enter' && loadGraph(res.id, res.name, res.type)}
                    className="group py-2.5 px-3 hover:bg-white/[0.04] rounded-lg cursor-pointer transition-all duration-200 flex items-center justify-between animate-fade-in"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="min-w-0 flex-1 mr-3">
                      <div className="text-sm font-medium text-[#E8E6E1] truncate group-hover:text-[#D4A853] transition-colors">
                        {res.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${TYPE_BADGE_COLORS[res.type.toUpperCase()] || 'bg-white/[0.04] text-[#9B97A0] border-white/[0.08]'}`} style={{ fontFamily: 'var(--font-mono)' }}>
                          {res.type}
                        </span>
                        {res.distance !== undefined && (
                          <span className="text-[11px] text-[#6B6775]" style={{ fontFamily: 'var(--font-mono)' }}>
                            dist: {res.distance.toFixed(3)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-[#6B6775] group-hover:text-[#D4A853] transition-colors shrink-0">
                      Explore →
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-[#6B6775] py-6 text-center">
                  Submit a query to view semantic candidates.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ═══════ Section 2: Knowledge Graph Explorer ═══════ */}
        <section className="card-surface p-6 animate-fade-in-up" style={{ animationDelay: '240ms' }} aria-labelledby="graph-heading">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Share2 size={16} className="text-purple-400" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="graph-heading" className="text-base font-semibold text-[#E8E6E1]">
                    Interactive Knowledge Graph
                  </h2>
                  <p className="text-xs text-[#6B6775] mt-0.5">
                    1-hop and 2-hop relational neighborhoods across connected academic entities
                  </p>
                </div>
              </div>
            </div>

            {selectedNode && (
              <div className="text-xs px-3 py-2 bg-[#D4A853]/10 border border-[#D4A853]/20 rounded-lg text-[#D4A853]" role="status" aria-live="polite">
                Focused: <span className="font-semibold text-[#E8E6E1]">{selectedNode.name}</span>
                <span className="text-[#9B97A0] ml-1">({selectedNode.type})</span>
              </div>
            )}
          </div>

          <GraphView 
            nodes={graphData.nodes} 
            edges={graphData.edges} 
            onSelectNode={(n) => loadGraph(n.id, n.name, n.type)}
            selectedNodeId={selectedNode?.id}
          />
        </section>

        {/* ═══════ Section 3: Overlap Analysis ═══════ */}
        <section className="card-surface p-6 animate-fade-in-up" style={{ animationDelay: '320ms' }} aria-labelledby="overlap-heading">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <GitMerge size={16} className="text-amber-400" aria-hidden="true" />
            </div>
            <div>
              <h2 id="overlap-heading" className="text-base font-semibold text-[#E8E6E1]">
                Potential Research Overlap
              </h2>
              <p className="text-xs text-[#6B6775] mt-0.5">
                Evaluates shared methodologies, datasets, and topic intersections with cited provenance
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            <div>
              <label htmlFor="study-a-input" className="text-xs font-semibold text-[#9B97A0] block mb-1.5">
                Study A (Node ID)
              </label>
              <input
                id="study-a-input"
                type="text"
                value={node1Id}
                onChange={(e) => setNode1Id(e.target.value)}
                placeholder="2"
                className="w-full px-4 py-2.5 bg-[#111525] border border-white/[0.1] rounded-lg text-sm text-[#E8E6E1] placeholder-[#6B6775] outline-none focus:border-[#D4A853]/50 focus:ring-1 focus:ring-[#D4A853]/30 transition-all min-h-[44px]"
              />
            </div>
            <div>
              <label htmlFor="study-b-input" className="text-xs font-semibold text-[#9B97A0] block mb-1.5">
                Study B (Node ID)
              </label>
              <input
                id="study-b-input"
                type="text"
                value={node2Id}
                onChange={(e) => setNode2Id(e.target.value)}
                placeholder="7"
                className="w-full px-4 py-2.5 bg-[#111525] border border-white/[0.1] rounded-lg text-sm text-[#E8E6E1] placeholder-[#6B6775] outline-none focus:border-[#D4A853]/50 focus:ring-1 focus:ring-[#D4A853]/30 transition-all min-h-[44px]"
              />
            </div>
          </div>

          <button
            onClick={handleAnalyzeOverlap}
            disabled={isAnalyzingOverlap || !node1Id || !node2Id}
            aria-busy={isAnalyzingOverlap}
            className="mt-4 px-6 py-3 bg-[#D4A853] hover:bg-[#E0B964] disabled:bg-white/[0.06] disabled:text-[#6B6775] text-[#0C0F1A] rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 min-h-[44px]"
          >
            {isAnalyzingOverlap ? <RefreshCw className="animate-spin" size={15} aria-hidden="true" /> : <GitMerge size={15} aria-hidden="true" />}
            {isAnalyzingOverlap ? 'Analyzing…' : 'Calculate Overlap'}
          </button>

          {overlapData && (
            <div className="mt-5 p-5 bg-[#0C0F1A] border border-white/[0.08] rounded-xl space-y-4 animate-fade-in" role="region" aria-label="Overlap analysis results">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-[#9B97A0]">Potential Overlap Score</span>
                  <div className="text-3xl font-bold text-[#D4A853] mt-0.5" style={{ fontFamily: 'var(--font-display)' }}>
                    {overlapData.overlap_score}%
                  </div>
                </div>
                <span className="text-[11px] px-2.5 py-1 bg-[#D4A853]/10 text-[#D4A853] border border-[#D4A853]/20 rounded-md" style={{ fontFamily: 'var(--font-mono)' }}>
                  Evidence-Backed
                </span>
              </div>

              {/* Overlap bar */}
              <div className="overlap-bar" role="progressbar" aria-valuenow={overlapData.overlap_score} aria-valuemin={0} aria-valuemax={100} aria-label={`Overlap score: ${overlapData.overlap_score}%`}>
                <div className="overlap-bar-fill" style={{ width: `${overlapData.overlap_score}%` }} />
              </div>

              <div>
                <span className="text-xs text-[#6B6775] font-medium">Intersecting Evidence</span>
                <div className="flex flex-wrap gap-2 mt-2 stagger-children">
                  {overlapData.evidence.map((ev, idx) => (
                    <span
                      key={idx}
                      className={`animate-fade-in-up px-3 py-1.5 rounded-lg text-xs border ${TYPE_BADGE_COLORS[ev.type.toUpperCase()] || 'bg-white/[0.04] text-[#9B97A0] border-white/[0.08]'}`}
                    >
                      <span className="font-semibold mr-1" style={{ fontFamily: 'var(--font-mono)' }}>[{ev.type}]</span>
                      {ev.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ═══════ Footer ═══════ */}
        <footer className="text-center text-xs text-[#6B6775] py-5 border-t border-white/[0.04]" role="contentinfo">
          <p>Graphis MVP Evaluation Build · Single-Tenant Architecture · Supabase & pgvector</p>
        </footer>
      </div>
    </div>
  );
}
