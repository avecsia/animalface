
export async function onRequest(context) {
    // POST 요청만 허용합니다.
    if (context.request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        // Cloudflare 환경 변수(비밀)에서 API 키를 가져옵니다.
        // Cloudflare Pages 설정에서 비밀 변수의 이름이 'GEMINI_API_KEY'인지 확인해주세요.
        const geminiApiKey = context.env.VITE_GEMINI_API_KEY;
        if (!geminiApiKey) {
            return new Response(JSON.stringify({ error: "VITE_GEMINI_API_KEY 비밀이 Cloudflare 환경에 설정되지 않았습니다." }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 브라우저로부터 이미지 데이터와 성별 정보를 받습니다.
        const { base64Data, mimeType, selectedGender } = await context.request.json();

        // Gemini AI에 전달할 시스템 명령어
        const systemPrompt = `당신은 관상학 전문가이자 AI 안면 분석 전문가입니다. 
        사용자의 사진을 분석하여 '강아지상', '고양이상', '토끼상', '공룡상', '여우상' 중 어느 것과 가장 닮았는지 퍼센트로 결과를 내주세요.
        사용자가 선택한 성별은 '${selectedGender === 'male' ? '남성' : '여성'}'입니다. 이 성별적 특징을 고려하여 분석하세요.
        반드시 다음 JSON 형식으로만 응답하세요:
        {
            "scores": { "강아지상": 80, "고양이상": 10, "토끼상": 5, "공룡상": 3, "여우상": 2 },
            "summary": "안면의 특징에 기반한 2줄 정도의 요약 분석 내용"
        }
        각 점수의 합계는 100이 되어야 합니다.`;
        
        // 안정적인 최신 모델 'gemini-1.5-flash-latest'를 사용합니다.
        const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`;
        
        const payload = {
            contents: [{
                parts: [
                    { text: "이 얼굴 사진의 동물상 비율을 분석해줘." },
                    { inlineData: { mimeType: mimeType, data: base64Data } }
                ]
            }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { responseMimeType: "application/json" }
        };

        const googleResponse = await fetch(googleApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!googleResponse.ok) {
             const errorBody = await googleResponse.json();
             console.error('Google API Error:', errorBody);
             return new Response(JSON.stringify({ error: `Google API 오류: ${errorBody.error?.message}` }), {
                status: googleResponse.status,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const result = await googleResponse.json();
        const analysis = JSON.parse(result.candidates[0].content.parts[0].text);
        
        // 분석 결과를 브라우저에 JSON 형식으로 전달합니다.
        return new Response(JSON.stringify(analysis), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('서버 내부 오류:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
