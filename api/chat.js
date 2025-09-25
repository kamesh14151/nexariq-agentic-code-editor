export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Check if API key is available
    if (!process.env.CLAUDE_API_KEY) {
      console.error('Claude API key is not configured');
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Make direct fetch request to match your curl exactly
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {"role": "user", "content": message}
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Anthropic API error:', errorData);
      return res.status(response.status).json({ 
        error: 'Failed to process request',
        details: errorData.error?.message || 'Unknown error'
      });
    }

    const data = await response.json();
    const responseText = data.content[0].text;
    res.status(200).json({ response: responseText });
  } catch (error) {
    console.error('Error calling Claude API:', error);
    res.status(500).json({ 
      error: 'Failed to process request',
      details: error.message 
    });
  }
}
