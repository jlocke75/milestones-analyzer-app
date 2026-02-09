export default async function handler(req, res) {
  // CORS headers — allow your GitHub Pages site and localhost
  const allowedOrigins = [
    'https://jlocke75.github.io',
    'https://milestones-analyzer-app-nb4q.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Get API key from environment variable
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }
  
  try {
    const { model, max_tokens, messages, system } = req.body;
    
    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }
    
    // Restrict to allowed models
    const allowedModels = ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001'];
    const requestModel = model || 'claude-sonnet-4-20250514';
    if (!allowedModels.includes(requestModel)) {
      return res.status(400).json({ error: `Model not allowed. Use: ${allowedModels.join(', ')}` });
    }
    
    // Cap max_tokens
    const requestMaxTokens = Math.min(max_tokens || 2500, 4000);
    
    // Build Anthropic request
    const anthropicBody = {
      model: requestModel,
      max_tokens: requestMaxTokens,
      messages: messages,
    };
    if (system) {
      anthropicBody.system = system;
    }
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(anthropicBody),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || 'Anthropic API error',
        type: data.error?.type || 'unknown',
      });
    }
    
    return res.status(200).json(data);
    
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Internal proxy error: ' + err.message });
  }
}
