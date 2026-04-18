export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const apiKey = process.env.GEMINI_API_KEY;
    // 모델명을 확실하게 지정합니다.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // 안전 필터 해제 (타로 리딩 중 차단 방지)
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
        generationConfig: { 
          maxOutputTokens: 1000,
          temperature: 0.7 // 타로 리딩이 더 풍성해지도록 설정
        }
      }),
    });

    const data = await response.json();

    // 에러 발생 시 로그 확인용
    if (data.error) {
      console.error("Gemini API Error:", data.error);
      return res.status(500).json({ error: data.error.message });
    }

    // 데이터 추출 (여러 파트가 있을 경우를 대비해 합칩니다)
    const candidate = data?.candidates?.[0];
    
    // 만약 안전 필터에 의해 차단되었다면 사유가 여기에 찍힙니다.
    if (candidate?.finishReason === "SAFETY") {
      return res.status(200).json({
        content: [{ type: 'text', text: '{"cards":[], "overall":"상담 내용이 민감하여 카드를 읽기 어려워요. 조금 더 부드러운 질문을 해주세요! 🌸"}' }]
      });
    }

    const text = candidate?.content?.parts?.map(p => p.text).join('') || '';

    return res.status(200).json({
      content: [{ type: 'text', text }]
    });

  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
