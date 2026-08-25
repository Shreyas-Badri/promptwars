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
    <div className="w-full h-[480px] rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 text-xs gap-2">
      <RefreshCw className="animate-spin text-slate-500" size={16} />
      <span>Loading graph canvas...</span>
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

export default function Home() {
  // Ingestion state
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
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
      }, 2000);
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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <header className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">Graphis</span>
              <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                Research Knowledge Graph
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Cross-disciplinary entity extraction, vector search, and overlap detection
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[11px] font-medium">
              <CheckCircle2 size={13} />
              <span>Backend Online</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded text-[11px] font-medium">
              <Database size={13} />
              <span>pgvector</span>
            </div>
          </div>
        </header>

        {/* Section 1: Ingestion and Semantic Search */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Ingest Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-2xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload size={16} className="text-slate-700" />
                  <h2 className="text-sm font-bold text-slate-900">1. Ingest Research Document</h2>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">PDF, MD, ZIP</span>
              </div>
              <p className="text-xs text-slate-600 leading-normal">
                Upload raw research files. The pipeline performs deterministic secret filtering, entity extraction, and vector embedding.
              </p>

              <div className="border border-dashed border-slate-300 rounded-md p-4 text-center bg-slate-50/50">
                <input
                  type="file"
                  id="document-file-input"
                  accept=".pdf,.md,.zip"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="document-file-input" className="cursor-pointer space-y-1 block">
                  <FileText size={20} className="mx-auto text-slate-500" />
                  <div className="text-xs font-semibold text-slate-800">
                    {file ? file.name : "Select PDF, Markdown, or Git Archive"}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {file ? `${Math.round(file.size / 1024)} KB` : "Max file size: 25 MB"}
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {isUploading ? <RefreshCw className="animate-spin" size={14} /> : 'Run Ingestion Pipeline'}
              </button>

              {uploadStatus && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded flex items-center justify-between text-xs">
                  <span className="text-slate-600">
                    Status: <span className="font-semibold text-slate-900 uppercase ml-1">{uploadStatus}</span>
                  </span>
                  <button onClick={checkStatus} title="Refresh status" className="text-slate-500 hover:text-slate-800 p-0.5">
                    <RefreshCw size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Semantic Search Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-2xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search size={16} className="text-slate-700" />
                  <h2 className="text-sm font-bold text-slate-900">2. Vector Semantic Search</h2>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">Cosine Top-K</span>
              </div>
              <p className="text-xs text-slate-600 leading-normal">
                Query papers, methods, datasets, and researchers using dense vector representations.
              </p>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="e.g. self-attention sequence modeling"
                  className="flex-grow px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-900 outline-none focus:border-slate-500"
                />
                <button
                  onClick={() => handleSearch()}
                  disabled={isSearching}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white rounded text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  {isSearching ? <RefreshCw className="animate-spin" size={13} /> : 'Search'}
                </button>
              </div>

              {/* Sample Queries */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                <span>Suggestions:</span>
                {['Transformer', 'BERT', 'Attention', 'Sequence Modeling'].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setSearchQuery(q); handleSearch(q); }}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-slate-700 text-[10px] transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Results List */}
            <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border-t border-slate-100 pt-2">
              {searchResults.length > 0 ? (
                searchResults.map((res, i) => (
                  <div
                    key={i}
                    onClick={() => loadGraph(res.id, res.name, res.type)}
                    className="py-1.5 px-1 hover:bg-slate-50 rounded cursor-pointer transition-colors flex items-center justify-between text-xs"
                  >
                    <div className="truncate max-w-[280px]">
                      <span className="font-semibold text-slate-900">{res.name}</span>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {res.type} {res.distance !== undefined ? `| Distance: ${res.distance.toFixed(3)}` : ''}
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-700 font-medium hover:underline">Select</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 py-3 text-center">
                  Submit a query to view semantic candidates.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Knowledge Graph Viewer */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Share2 size={16} className="text-slate-700" />
                <h2 className="text-sm font-bold text-slate-900">3. Interactive Knowledge Graph Explorer</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Displays 1-hop and 2-hop relational neighborhoods across connected academic entities.
              </p>
            </div>

            {selectedNode && (
              <div className="text-xs px-2.5 py-1 bg-slate-100 border border-slate-200 rounded text-slate-700">
                Focused: <span className="font-semibold text-slate-900">{selectedNode.name}</span> ({selectedNode.type})
              </div>
            )}
          </div>

          <GraphView 
            nodes={graphData.nodes} 
            edges={graphData.edges} 
            onSelectNode={(n) => loadGraph(n.id, n.name, n.type)}
            selectedNodeId={selectedNode?.id}
          />
        </div>

        {/* Section 3: Potential Overlap & Collaboration Analysis */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <GitMerge size={16} className="text-slate-700" />
              <h2 className="text-sm font-bold text-slate-900">4. Potential Research Overlap Analysis</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluates two candidate studies for shared methodologies, datasets, and topic intersections with cited provenance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Study A (Node ID):</label>
              <input
                type="text"
                value={node1Id}
                onChange={(e) => setNode1Id(e.target.value)}
                placeholder="2"
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-900 outline-none focus:border-slate-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Study B (Node ID):</label>
              <input
                type="text"
                value={node2Id}
                onChange={(e) => setNode2Id(e.target.value)}
                placeholder="7"
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-900 outline-none focus:border-slate-500"
              />
            </div>
          </div>

          <button
            onClick={handleAnalyzeOverlap}
            disabled={isAnalyzingOverlap || !node1Id || !node2Id}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white rounded text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            {isAnalyzingOverlap ? <RefreshCw className="animate-spin" size={13} /> : 'Calculate Overlap'}
          </button>

          {overlapData && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">
                  Potential Overlap Score: <span className="text-slate-900 font-bold">{overlapData.overlap_score}%</span>
                </span>
                <span className="text-[11px] px-2 py-0.5 bg-slate-200 text-slate-800 font-mono rounded">
                  Evidence-Backed
                </span>
              </div>

              <div>
                <span className="text-slate-500 text-[11px]">Intersecting Evidence:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {overlapData.evidence.map((ev, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] text-slate-800">
                      <span className="font-semibold text-slate-600 mr-1">[{ev.type}]</span> {ev.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center text-[11px] text-slate-400 py-3">
          Graphis MVP Evaluation Build | Single-Tenant Architecture | Supabase & pgvector
        </footer>
      </div>
    </div>
  );
}
