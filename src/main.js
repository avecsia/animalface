// DOM Elements
const uploadStep = document.getElementById('uploadStep');
const previewStep = document.getElementById('previewStep');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const previewImg = document.getElementById('previewImg');
const loadingOverlay = document.getElementById('loadingOverlay');
const analyzeAction = document.getElementById('analyzeAction');
const resultSection = document.getElementById('resultSection');
const resetBtn = document.getElementById('resetBtn');
const errorBox = document.getElementById('errorBox');
const errorMessage = document.getElementById('errorMessage');

const retestBtn = document.getElementById('retestBtn');
const rankingContainer = document.getElementById('rankingContainer');
const celebrityList = document.getElementById('celebrityList');
const keywordsContainer = document.getElementById('keywords');
const kakaoShareBtn = document.getElementById('kakaoShareBtn'); // New Kakao share button

// Gender Selection Elements
const maleBtn = document.getElementById('maleBtn');
const femaleBtn = document.getElementById('femaleBtn');
const selectedGenderText = document.getElementById('selectedGenderText'); // To update the text in result section

let selectedGender = "male"; // default
let base64Image = "";
let uploadedFile = null;

function initialize() {
    setupEventListeners();
    renderAnimalIcons();
    updateGenderSelectionUI(); // Set initial active state for gender buttons
    initializeKakaoSDK(); // Initialize Kakao SDK
}

// ... (rest of the file remains the same until analyzeFace, fetchWithRetry)

async function initializeKakaoSDK() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();

        if (response.ok && config.kakaoKey) {
            if (!Kakao.isInitialized()) { // Check if not already initialized
                Kakao.init(config.kakaoKey);
            }
            console.log("Kakao SDK initialized successfully.");
        } else {
            console.error("Failed to initialize Kakao SDK:", config.error || "Key not found in server response.");
        }
    } catch (error) {
        console.error("Error fetching app configuration for Kakao:", error);
    }
}

async function analyzeFace(base64Data) {
    if (!apiKey) {
        errorMessage.innerText = "API 키가 설정되지 않았습니다. .env 파일에 VITE_GEMINI_API_KEY를 설정해주세요.";
        errorBox.classList.remove('hidden');
        return;
    }
    
    loadingOverlay.classList.remove('hidden');
    window.scrollTo(0, 0); // Scroll to top after analysis starts

    const systemPrompt = `당신은 관상학 전문가이자 AI 안면 분석 전문가입니다. 
    사용자의 사진을 분석하여 '강아지상', '고양이상', '토끼상', '공룡상', '여우상' 중 어느 것과 가장 닮았는지 퍼센트로 결과를 내주세요.
    사용자가 선택한 성별은 '${selectedGender === 'male' ? '남성' : '여성'}'입니다. 이 성별적 특징을 고려하여 분석하세요.
    반드시 다음 JSON 형식으로만 응답하세요:
    {
        "scores": { "강아지상": 80, "고양이상": 10, "토끼상": 5, "공룡상": 3, "여우상": 2 },
        "summary": "안면의 특징에 기반한 2줄 정도의 요약 분석 내용"
    }
    각 점수의 합계는 100이 되어야 합니다.`;

    const payload = {
        contents: [{
            parts: [
                { text: "이 얼굴 사진의 동물상 비율을 분석해줘." },
                { inlineData: { mimeType: uploadedFile.type, data: base64Data } }
            ]
        }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { responseMimeType: "application/json" }
    };

    try {
        const response = await fetchWithRetry(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }
        );

        const analysis = JSON.parse(result.candidates[0].content.parts[0].text);
        displayResult(analysis); // Pass the entire analysis object
    } catch (error) {
        console.error("Analysis failed:", error);
        resultSection.classList.add('hidden');
        errorMessage.innerText = "분석 중 오류가 발생했습니다. 다시 시도해 주세요.";
        errorBox.classList.remove('hidden');
    } finally {
        loadingOverlay.classList.add('hidden');
    }
}

function displayResult(analysis) { // Now accepts the full analysis object
    const sortedTypes = Object.entries(analysis.scores)
        .sort(([, a], [, b]) => b - a);
    
    const topTypeKey = sortedTypes[0][0]; // e.g., '강아지상'
    const topPercent = sortedTypes[0][1];
    const type = ANIMAL_TYPES[topTypeKey];

    if (!type) {
        console.error("Invalid animalKey from API:", topTypeKey);
        errorMessage.innerText = "알 수 없는 동물 유형입니다.";
        errorBox.classList.add('hidden');
        resultSection.classList.add('hidden');
        return;
    }

    // Hide the container with the preview image and initial buttons
    const imageContainer = previewStep.firstElementChild;
    if (imageContainer) {
        imageContainer.classList.add('hidden');
    }
    
    // The user doesn't want the "type info" box at the bottom.
    const typeInfoBox = document.getElementById('typeInfoBox');
    if (typeInfoBox) {
        typeInfoBox.classList.add('hidden');
    }
    
    analyzeAction.classList.add('hidden');
    errorBox.classList.add('hidden');

    const resultMainCard = document.getElementById('resultMainCard');
    const mainAnimalEmoji = document.getElementById('mainAnimalEmoji');
    const mainAnimalName = document.getElementById('mainAnimalName');
    const mainPercent = document.getElementById('mainPercent');
    const resultLabel = document.getElementById('resultLabel');
    
    resultMainCard.className = `p-8 rounded-[2rem] text-center space-y-4 shadow-xl border-t-8 bg-white ${type.resultColor}`;
    mainAnimalEmoji.innerText = type.icon;
    mainAnimalName.innerText = type.name; // Use type.name
    mainPercent.innerText = `${topPercent}%`; // Use topPercent
    resultLabel.innerText = analysis.summary; // Use summary for resultLabel

    // Update animal description
    document.getElementById('animalDescription').innerText = type.description;

    // Update ranking chart
    rankingContainer.innerHTML = '';
    sortedTypes.forEach(([name, score]) => {
        const animal = ANIMAL_TYPES[name];
        const row = document.createElement('div');
        row.className = "space-y-1.5";
        row.innerHTML = `
            <div class="flex justify-between text-sm font-bold">
                <span>${animal.icon} ${animal.name}</span>
                <span class="text-blue-600">${score}%</span>
            </div>
            <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div class="h-full bg-blue-500 rounded-full transition-all duration-1000" style="width: 0%"></div>
            </div>
        `;
        rankingContainer.appendChild(row);
        setTimeout(() => {
            row.querySelector('.bg-blue-500').style.width = `${score}%`;
        }, 100);
    });

    // Update keywords
    keywordsContainer.innerHTML = '';
    type.keywords.forEach(kw => {
        const tag = document.createElement('span');
        tag.className = "px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold";
        tag.innerText = kw;
        keywordsContainer.appendChild(tag);
    });

    // Update celebrity list based on selected gender
    celebrityList.innerHTML = '';
    const celebsToShow = selectedGender === 'male' ? type.maleCelebs : type.femaleCelebs;
    if (celebsToShow && celebsToShow.length > 0) {
        celebsToShow.forEach(name => {
            const item = document.createElement('div');
            item.className = "bg-slate-50 p-3 rounded-xl text-center font-bold text-slate-700 border border-slate-100";
            item.innerText = name;
            celebrityList.appendChild(item);
        });
    }


    // Show the results
    resultSection.classList.remove('hidden');
    
    // Kakao Share Button Click Handler
    const kakaoShareBtn = document.getElementById('kakaoShareBtn');
    if (kakaoShareBtn) {
        kakaoShareBtn.onclick = () => {
            if (!Kakao.isInitialized()) { 
                alert("카카오 SDK가 초기화되지 않았습니다. Cloudflare 비밀값을 확인하거나 잠시 후 다시 시도해주세요."); 
                return; 
            }
            Kakao.Share.sendDefault({
                objectType: 'feed',
                content: { 
                    title: `AI 동물상 테스트 결과: ${topPercent}% ${topTypeKey}!`, 
                    description: analysis.summary, 
                    imageUrl: previewImg.src, 
                    link: { mobileWebUrl: window.location.href, webUrl: window.location.href } 
                },
                buttons: [{ title: '나도 테스트하기', link: { mobileWebUrl: window.location.href, webUrl: window.location.href } }]
            });
        };
    }
}

function reset() {
    base64Image = "";
    uploadedFile = null;
    previewImg.src = "";
    fileInput.value = ""; 
    
    uploadStep.classList.remove('hidden');
    previewStep.classList.add('hidden');
    resetBtn.classList.add('hidden');
    resultSection.classList.add('hidden');
    
    // Show the preview image container again for the next upload
    const imageContainer = previewStep.firstElementChild;
    if (imageContainer) {
        imageContainer.classList.remove('hidden');
    }

    analyzeAction.classList.remove('hidden');
    errorBox.classList.add('hidden');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
