
export async function onRequest(context) {
    try {
        // Cloudflare Pages 설정에서 비밀 변수의 이름이 'KAKAO_JAVASCRIPT_KEY'인지 확인해주세요.
        const kakaoKey = context.env.KAKAO_JAVASCRIPT_KEY;

        if (!kakaoKey) {
            console.error("KAKAO_JAVASCRIPT_KEY secret is not set in Cloudflare environment.");
            // 클라이언트에는 키가 없다는 사실만 알리고, 구체적인 오류는 서버 로그에 남깁니다.
            return new Response(JSON.stringify({ error: "Configuration not available." }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 키를 JSON 형태로 클라이언트에 전달합니다.
        return new Response(JSON.stringify({ kakaoKey }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Config fetch error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch configuration.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
