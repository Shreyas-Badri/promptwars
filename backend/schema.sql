CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    upload_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'UPLOADED', -- UPLOADED, EXTRACTING, EMBEDDING, STORED, COMPLETED, FAILED
    error_message TEXT,
    content TEXT,
    file_path TEXT
);

CREATE TABLE IF NOT EXISTS nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- RESEARCHER, PAPER, DATASET, METHOD, TOPIC
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, type)
);

CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    embedding vector(384) -- Using 384 for sentence-transformers all-MiniLM-L6-v2, 768 for Vertex AI gecko
);

CREATE TABLE IF NOT EXISTS relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    target_node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    source_document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    page_section TEXT,
    confidence FLOAT,
    extraction_method TEXT
);
