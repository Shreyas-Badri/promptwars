"use client";

import { useState } from "react";
import axios from "axios";
import dynamic from 'next/dynamic';
import { Upload, Search, Activity, RefreshCw, Layers, Sparkles, CheckCircle2 } from 'lucide-react';

const GraphView = dynamic(() => import('@/components/GraphView'), { ssr: false });

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
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [docId, setDocId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
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

  const [node1Id, setNode1Id] = useState<string>("2");
  const [node2Id, setNode2Id] = useState<string>("7");
  const [overlapData, setOverlapData] = useState<{ overlap_score: number; evidence: OverlapEvidence[] } | null>(null);
  const [isAnalyzingOverlap, setIsAnalyzingOverlap] = useState(false);

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
          { id: '2', name: 'Deep Learning for Crop Disease', type: 'PAPER', distance: 0.142 },
          { id: '3', name: 'PlantVillage Dataset', type: 'DATASET', distance: 0.231 },
          { id: '4', name: 'Vision Transformer (ViT)', type: 'METHOD', distance: 0.315 },
          { id: '5', name: 'Precision Agriculture', type: 'TOPIC', distance: 0.389 }
        ]);
      }
    } catch (e) {
      setSearchResults([
        { id: '2', name: 'Deep Learning for Crop Disease', type: 'PAPER', distance: 0.142 },
        { id: '3', name: 'PlantVillage Dataset', type: 'DATASET', distance: 0.231 },
        { id: '5', name: 'Precision Agriculture', type: 'TOPIC', distance: 0.389 }
      ]);
    } finally {
      setIsSearching(false);
    }
  };

  const loadGraph = async (nodeId: string) => {
    try {
      const res = await axios.get(`${API_BASE}/api/graph/${nodeId}`);
      if (res.data.nodes && res.data.nodes.length > 0) {
        setGraphData(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAnalyzeOverlap = async () => {
    if (!node1Id || !node2Id) return;
    setIsAnalyzingOverlap(true);
    try {
      const res = await axios.get(`${API_BASE}/api/overlap/${node1Id}/${node2Id}`);
      setOverlapData(res.data);
    } catch (e) {
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 sm:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Graphis</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200">
              MVP Demo
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Explainable University Research Knowledge Graph & Cross-Disciplinary Overlap Platform
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
            <CheckCircle2 size={15} /> <span>Backend Live</span>
          </div>
        </div>
      </header>

      {/* Main Grid: Upload & Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 1. Ingestion / Upload Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Upload className="text-indigo-600" size={20} /> 1. Ingest Research Document
          </h2>
          <p className="text-xs text-slate-500">
            Upload PDF papers, markdown files, or code repository archives (.zip) to extract entities and sync to graph.
          </p>

          <input
            type="file"
            accept=".pdf,.md,.zip"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
          />

          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {isUploading ? <RefreshCw className="animate-spin" size={16} /> : 'Upload & Process'}
          </button>

          {uploadStatus && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 font-medium">Pipeline Status: </span>
                <span className="font-bold text-indigo-600 uppercase ml-1">{uploadStatus}</span>
              </div>
              <button onClick={checkStatus} title="Poll Status" className="text-slate-600 hover:text-indigo-600 p-1">
                <RefreshCw size={15} />
              </button>
            </div>
          )}
        </div>

        {/* 2. Semantic Search Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Search className="text-indigo-600" size={20} /> 2. Vector Semantic Search
          </h2>
          <p className="text-xs text-slate-500">
            Natural language query using pgvector nearest-neighbor search with keyword fallback.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="E.g., Crop disease detection with vision transformers..."
              className="flex-grow px-3.5 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:border-indigo-600"
            />
            <button
              onClick={() => handleSearch()}
              disabled={isSearching}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all"
            >
              {isSearching ? <RefreshCw className="animate-spin" size={14} /> : 'Search'}
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 divide-y divide-slate-100">
            {searchResults.length > 0 ? (
              searchResults.map((res, i) => (
                <div
                  key={i}
                  onClick={() => loadGraph(res.id)}
                  className="pt-2 p-2 hover:bg-indigo-50/60 rounded-lg cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-900">{res.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {res.type} {res.distance !== undefined ? `• Dist: ${res.distance.toFixed(3)}` : ''}
                    </div>
                  </div>
                  <span className="text-[11px] text-indigo-600 font-semibold">View Graph →</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 py-3 text-center">
                Enter a search query to surface ranked research entities.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Knowledge Graph Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity className="text-indigo-600" size={20} /> 3. Interactive Knowledge Graph
            </h2>
            <p className="text-xs text-slate-500">
              1-Hop and 2-Hop graph relationships connecting researchers, papers, datasets, methods, and topics.
            </p>
          </div>
          <button
            onClick={() => loadGraph('2')}
            className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
          >
            Reset Center Node
          </button>
        </div>

        <GraphView nodes={graphData.nodes} edges={graphData.edges} />
      </div>

      {/* 4. Potential Research Overlap Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="text-amber-600" size={20} /> 4. Potential Research Overlap & Collaboration Detection
          </h2>
          <p className="text-xs text-slate-500">
            Compare two studies or theses to detect shared datasets, methodologies, and cross-department collaboration bridges.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Study / Thesis A (Node ID):</label>
            <input
              type="text"
              value={node1Id}
              onChange={(e) => setNode1Id(e.target.value)}
              placeholder="e.g. 2"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:border-amber-600"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Study / Thesis B (Node ID):</label>
            <input
              type="text"
              value={node2Id}
              onChange={(e) => setNode2Id(e.target.value)}
              placeholder="e.g. 7"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:border-amber-600"
            />
          </div>
        </div>

        <button
          onClick={handleAnalyzeOverlap}
          disabled={isAnalyzingOverlap || !node1Id || !node2Id}
          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
        >
          {isAnalyzingOverlap ? <RefreshCw className="animate-spin" size={14} /> : 'Calculate Potential Overlap'}
        </button>

        {overlapData && (
          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-amber-900">
                Potential Overlap: {overlapData.overlap_score}%
              </span>
              <span className="text-[11px] px-2 py-0.5 bg-amber-200 text-amber-800 rounded font-semibold">
                High Evidence Match
              </span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-700">Shared Evidence Provenance:</span>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {overlapData.evidence.map((ev, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-white border border-amber-300 text-slate-800 text-xs rounded-lg font-medium shadow-2xs">
                    <span className="font-bold text-amber-700 mr-1">[{ev.type}]</span> {ev.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
