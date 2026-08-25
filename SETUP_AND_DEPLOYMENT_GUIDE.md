# Graphis Architecture Setup & Deployment Guide

This guide reflects the refactored architecture utilizing Supabase, Vercel, and Render/Railway, prioritizing the intelligent Fallback system for Embeddings and AI Extraction.

## 1. Supabase Database & Storage Setup
1. Create a project on [Supabase](https://supabase.com).
2. Go to **SQL Editor** and run the contents of `backend/schema.sql` to generate the `pgvector` extension and tables.
3. Go to **Storage**, create a new public bucket called `documents`.
4. Go to **Project Settings -> API** and copy:
   - `Project URL` (SUPABASE_URL)
   - `service_role` secret (SUPABASE_SERVICE_ROLE_KEY) - **DO NOT expose this to the frontend**.
5. Go to **Project Settings -> Database** and copy the Connection String (URI). Ensure you replace `[YOUR-PASSWORD]`. This is your `DATABASE_URL`.

## 2. API Keys & Environment Variables
You will need API keys for the fallback systems:
- [Gemini API Key](https://aistudio.google.com/app/apikey) (`GEMINI_API_KEY`)
- [Groq API Key](https://console.groq.com/keys) (`GROQ_API_KEY`)
- [HuggingFace Token](https://huggingface.co/settings/tokens) (`HUGGINGFACE_API_KEY`)

---

## 3. Backend Deployment (Render or Railway)
Because FastAPI requires long-running background tasks for PDF processing, do **NOT** deploy it to Vercel. 
Use **Render** (free tier supports background tasks) or **Railway**.

### Deploying to Render
1. Go to [Render](https://render.com) and create a **New Web Service**.
2. Connect your GitHub repository.
3. Configure the service:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add the following Environment Variables:
   - `DATABASE_URL` (Supabase connection string, append `?sslmode=require`)
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `GROQ_API_KEY`
   - `HUGGINGFACE_API_KEY`
5. Click **Deploy**. Render will provide a URL like `https://graphis-backend.onrender.com`.

---

## 4. Frontend Deployment (Vercel)
The Next.js frontend should be deployed to Vercel for Edge caching and performance.

### Deploying to Vercel
1. Go to [Vercel](https://vercel.com) and click **Add New Project**.
2. Connect your GitHub repository.
3. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
4. Before deploying, you need to point the frontend to the deployed Render backend! 
   - Open `frontend/src/app/page.tsx`.
   - Search for `http://localhost:8000` and replace it with your Render URL (e.g., `https://graphis-backend.onrender.com`).
   - Push this change to GitHub.
5. In Vercel, click **Deploy**.

---

## 5. Submitting Your Project
Once both are deployed, you have your 3 links for the hackathon submission!
1. **GitHub Repository**: (Make sure it's public)
2. **Deployed Web App**: (Your Vercel URL)
3. **LinkedIn Post**: (Tag Hack2Skill and GDG)

Good luck!
