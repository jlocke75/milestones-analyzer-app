# Milestones EOG Analyzer

**Integrated Method Diagnostic Tool**

A web-based tool that analyzes Georgia Milestones EOG practice assessment data and generates AI-powered diagnostic reports for individual students using the Integrated Method framework.

## Setup

### 1. Create a new GitHub repository

Create a new repo (e.g., `milestones-analyzer-app`) and push this code to it.

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up with your GitHub account
2. Click **"Add New Project"**
3. Select your `milestones-analyzer-app` repository
4. Before deploying, add your environment variable:
   - Click **"Environment Variables"**
   - Name: `ANTHROPIC_API_KEY`
   - Value: Your Anthropic API key (starts with `sk-ant-...`)
   - Click **"Add"**
5. Click **"Deploy"**

That's it. Vercel will give you a URL like `https://milestones-analyzer-app.vercel.app`.

### 3. Share with colleagues

Send them the Vercel URL. No API key needed on their end — the server handles authentication.

## How It Works

```
Browser (teacher) → Vercel proxy server → Anthropic API
                  ← diagnostic report  ←
```

The proxy server (`/api/generate.js`) holds your API key securely and forwards requests to Anthropic. The browser never sees the API key.

## Security

- Your API key is stored as a Vercel environment variable (encrypted, never exposed to browsers)
- The proxy only accepts requests from allowed origins
- Requests are restricted to approved Claude models
- Max tokens are capped at 4,000 per request

## Cost

Each diagnostic report costs approximately $0.01–0.02 in API usage (Claude Sonnet). At 270 students, a full class run would cost roughly $3–5.

## Files

```
├── api/
│   └── generate.js          # Serverless proxy function
├── public/
│   └── index.html            # The analyzer (single HTML file)
├── vercel.json               # Vercel routing configuration
├── package.json
└── README.md
```

## Privacy & FERPA

- Student data is sent to Anthropic's API for report generation
- Anthropic does not train on API inputs and deletes data per their retention policy
- Consider using de-identified data for FERPA compliance
- No student data is stored on the server

---

*The Integrated Method: Building Writers, Not Better Drafts*

Fannin County Middle School
