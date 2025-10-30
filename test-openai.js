// api/test-openai.js
// Test OpenAI API connection independently

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const OpenAI = require('openai');
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({
        success: false,
        error: 'OpenAI API key not found in environment variables'
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Test with a simple request
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: "Say 'Hello from OpenAI!' if this connection test is successful."
        }
      ],
      max_tokens: 10
    });

    return res.status(200).json({
      success: true,
      message: 'OpenAI connection successful!',
      response: response.choices[0].message.content,
      model: response.model,
      usage: response.usage
    });

  } catch (error) {
    console.error('OpenAI test error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'OpenAI connection failed',
      details: error.message
    });
  }
}
