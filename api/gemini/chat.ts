import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';

type Req = IncomingMessage & {
  method?: string;
  body?: any;
};

async function readRawBody(req: Req): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer | string) => {
      data += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      if (data.length > 2 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', (err) => reject(err));
  });
}

function sendJson(res: ServerResponse, statusCode: number, body: Record<string, any>) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(body));
}

export default async function handler(req: Req, res: ServerResponse) {
  const method = (req.method || 'POST').toUpperCase();

  if (method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true });
  }

  if (method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (!body) {
      const raw = await readRawBody(req);
      body = raw ? JSON.parse(raw) : {};
    } else if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    const { query = '', activeSymbol = 'US100', currentPrice = 20892.4 } = body || {};
    const cleanQuery = typeof query === 'string' ? query.trim() : '';

    if (!cleanQuery) {
      return sendJson(res, 400, { error: 'Query message is required.' });
    }

    const serverKey = process.env.GEMINI_API_KEY;
    if (!serverKey) {
      return sendJson(res, 503, { error: 'Gemini API key is not configured on the server.' });
    }

    const client = new GoogleGenAI({ apiKey: serverKey });
    const systemInstruction = `You are the MBK Trading Assistant. Answer the user's specific questions conversationally, naturally, and concisely in the language they speak. Do not force market analysis unless explicitly asked. Do not provide personalized financial advice. Context if relevant: Active chart symbol is ${activeSymbol} at price ${currentPrice}.`;

    const response = await client.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: cleanQuery,
      config: { systemInstruction }
    });

    const text = (response.text || '').trim();
    if (!text) {
      return sendJson(res, 502, { error: 'Empty response received from Gemini model.' });
    }

    return sendJson(res, 200, {
      reply: text,
      sources: [],
      modelUsed: 'gemini-4-hydrogen',
      activeSymbol,
      currentPrice,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    });
  } catch (err: any) {
    console.error('[Vercel /api/gemini/chat ERROR]:', err?.message || err);
    return sendJson(res, 502, { error: err?.message || 'Failed to generate AI response.' });
  }
}
