"use client";

import { useState } from "react";
import axios from "axios";
import dynamic from 'next/dynamic';
import { Upload, Search, Activity, RefreshCw } from 'lucide-react';

const GraphView = dynamic(() => import('@/components/GraphView'), { ssr: false });

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [docId, setDocId] = useState<string>("");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const [graphData, setGraphData] = useState<{nodes: any[], edges: any[]}>({nodes: [], edges: []});

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      setUploadStatus("Uploading...");
      const res = await axios.post("http://localhost:8000/api/upload", formData);
      setDocId(res.data.document_id);
      setUploadStatus("UPLOADED");
    } catch (e) {
      setUploadStatus("Upload Failed");
    }
  };

  const checkStatus = async () => {
    if (!docId) return;
    try {
      const res = await axios.get(`http://localhost:8000/api/status/${docId}`);
      setUploadStatus(res.data.status);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    try {
      const res = await axios.get(`http://localhost:8000/api/search?query=${searchQuery}`);
      setSearchResults(res.data.results);
    } catch (e) {
      console.error(e);
    }
  };

  const loadGraph = async (nodeId: string) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/graph/${nodeId}`);
      setGraphData(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <h1 className="text-3xl font-bold mb-8">Graphis MVP Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Upload Card */}
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center"><Upload className="mr-2"/> Ingest Document</h2>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
          <button onClick={handleUpload} className="bg-blue-600 text-white px-4 py-2 rounded">Upload</button>
          
          {uploadStatus && (
            <div className="mt-4 p-4 bg-gray-100 rounded flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-500">Status: </span>
                <span className="font-medium">{uploadStatus}</span>
              </div>
              <button onClick={checkStatus} className="text-blue-600"><RefreshCw size={18} /></button>
            </div>
          )}
        </div>

        {/* Search Card */}
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center"><Search className="mr-2"/> Semantic Search</h2>
          <div className="flex mb-4">
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search for concepts, methods..." className="border p-2 rounded-l flex-grow outline-none"/>
            <button onClick={handleSearch} className="bg-blue-600 text-white px-4 py-2 rounded-r">Search</button>
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            {searchResults.map((res, i) => (
              <div key={i} className="p-2 border-b cursor-pointer hover:bg-gray-50" onClick={() => loadGraph(res.id)}>
                <div className="font-medium">{res.name}</div>
                <div className="text-xs text-gray-500">{res.type} {res.distance ? `(Dist: ${res.distance?.toFixed(3)})` : ''}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Graph Card */}
      <div className="bg-white p-6 rounded shadow mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center"><Activity className="mr-2"/> Knowledge Graph</h2>
        {graphData.nodes.length > 0 ? (
          <GraphView nodes={graphData.nodes} edges={graphData.edges} />
        ) : (
          <div className="h-[500px] border rounded bg-gray-50 flex items-center justify-center text-gray-500">
            Select a node from search to explore the graph
          </div>
        )}
      </div>
    </div>
  );
}
