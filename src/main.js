
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

const ANIMAL_TYPES = {
    PUPPY: { name: '강아지상', description: '선한 눈매, 큰 눈동자, 동그란 콧망울, 동글동글한 얼굴형이 특징이며 순하고 친근한 인상을 줍니다.', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '🐶' },
    CAT: { name: '고양이상', description: '위로 올라간 눈꼬리, 날렵한 턱선, 뾰족한 눈 앞머리가 특징으로 도도하고 세련된 매력을 줍니다.', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: '🐱' },
    FOX: { name: '사막여우상', description: '갸름한 얼굴형, 긴 콧대, 가로로 긴 눈매로 도도하면서도 매혹적인 분위기를 자아냅니다.', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '🦊' },
    RABBIT: { name: '토끼상', description: '작고 동그란 코, 톡 튀어나온 앞니, 순하고 귀여운 이미지가 특징입니다.', color: 'bg-pink-100 text-pink-700 border-pink-200', icon: '🐰' },
    BEAR: { name: '곰상', description: '듬직하고 선한 인상, 둥글둥글한 이목구비로 편안함을 줍니다.', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: '🐻' },
    DINO: { name: '공룡/늑대상', description: '뚜렷한 이목구비, 강한 인상, 짙은 눈썹이 특징이며 카리스마 넘치는 매력을 줍니다.', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: '🦖' }
};

// DOM Elements
const uploadStep = document.getElementById('uploadStep');
const previewStep = document.getElementById('previewStep');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const previewImg = document.getElementById('previewImg');
const loadingOverlay = document.getElementById('loadingOverlay');
const analyzeAction = document.getElementById('analyzeAction');
const startAnalyzeBtn = document.getElementById('startAnalyzeBtn');
const resultSection = document.getElementById('resultSection');
const resetBtn = document.getElementById('resetBtn');
const errorBox = document.getElementById('errorBox');
const errorMessage = document.getElementById('errorMessage');
const retryBtn = document.getElementById('retryBtn');
const retestBtn = document.getElementById('retestBtn');

let base64Image = "";
let uploadedFile = null;

function initialize() {
    setupEventListeners();
    renderAnimalIcons();
    try {
        lucide.createIcons();
    } catch (e) {
        console.error("Lucide icon initialization failed:", e);
    }
}

function setupEventListeners() {
    if (dropZone) {
        dropZone.addEventListener('click', () => fileInput.click());
    }
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    if (startAnalyzeBtn) {
        startAnalyzeBtn.addEventListener('click', analyzeFace);
    }
    if (retryBtn) {
        retryBtn.addEventListener('click', analyzeFace);
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', reset);
    }
    if (retestBtn) {
        retestBtn.addEventListener('click', reset);
    }
}

function renderAnimalIcons() {
    const container = document.getElementById('animalTypeIcons');
    if (!container) return;
    container.innerHTML = ''; // Clear existing icons
    Object.values(ANIMAL_TYPES).forEach(type => {
        const div = document.createElement('div');
        div.className = "bg-white border border-slate-100 p-3 rounded-xl text-center shadow-sm";
        div.innerHTML = `<span class="text-2xl mb-1 block">${type.icon}</span><span class="text-xs font-medium text-slate-600">${type.name}</span>`;
        container.appendChild(div);
    });
}

function handleFileSelect(e) {
    uploadedFile = e.target.files[0];
    if (uploadedFile) {
        const reader = new FileReader();
        reader.onloadend = () => {
            base64Image = reader.result.split(',')[1];
            previewImg.src = reader.result;
            
            uploadStep.classList.add('hidden');
            previewStep.classList.remove('hidden');
            resetBtn.classList.remove('hidden');

            try {
                lucide.createIcons();
            } catch (err) {
                console.error("Lucide icon refresh failed:", err);
            }
        };
        reader.readAsDataURL(uploadedFile);
    }
}

async function analyzeFace() {
    if (!base64Image || !uploadedFile) return;

    loadingOverlay.classList.remove('hidden');
    analyzeAction.classList.add('hidden');
    errorBox.classList.add('hidden');
    resultSection.classList.add('hidden');

    const systemPrompt = `
        You are an expert in face analysis. Analyze the user's photo and classify it as one of the following 6 animal face types:
        1. Puppy, 2. Cat, 3. Fox, 4. Rabbit, 5. Bear, 6. Dinosaur/Wolf.
        Respond in JSON format:
        {
          "animalKey": "PUPPY" | "CAT" | "FOX" | "RABBIT" | "BEAR" | "DINO",
          "matchPercentage": 0-100,
          "reason": "Reason for classification (in Korean)",
          "positiveFeedback": "Positive compliment (in Korean)"
        }
    `;

    const payload = {
        contents: [{
            role: "user",
            parts: [
                { text: "What animal face type is this person? Tell me the analysis result and a compliment in JSON format." },
                { inlineData: { mimeType: uploadedFile.type, data: base64Image } }
            ]
        }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { responseMimeType: "application/json", temperature: 0 }
    };

    try {
        const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const resultText = response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (resultText) {
            displayResult(JSON.parse(resultText));
        } else {
            throw new Error('Could not get analysis result.');
        }
    } catch (err) {
        console.error("Analysis failed:", err);
        errorMessage.innerText = "An error occurred during analysis. Please try again.";
        errorBox.classList.remove('hidden');
        analyzeAction.classList.remove('hidden'); // Show original button to allow retry
    } finally {
        loadingOverlay.classList.add('hidden');
    }
}

async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`API Error: ${response.status} ${response.statusText}`, errorBody);
            throw new Error(`API call failed: ${response.status}`);
        }
        return await response.json();
    } catch (err) {
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, options, retries - 1, delay * 2);
        }
        throw err;
    }
}


function displayResult(data) {
    const type = ANIMAL_TYPES[data.animalKey];
    if (!type) {
        console.error("Invalid animalKey from API:", data.animalKey);
        errorMessage.innerText = "Unknown animal type received.";
        errorBox.classList.remove('hidden');
        analyzeAction.classList.remove('hidden');
        return;
    }

    const resultCard = document.getElementById('resultCard');
    const resultBgIcon = document.getElementById('resultBgIcon');
    const progressBar = document.getElementById('progressBar');

    resultCard.className = `p-8 rounded-3xl border-2 shadow-lg relative overflow-hidden ${type.color}`;
    resultBgIcon.querySelector('span').innerText = type.icon;

    document.getElementById('resultTitle').innerHTML = `${data.matchPercentage}% <span class="text-2xl font-bold">${type.name}</span>`;
    document.getElementById('resultReason').innerText = `"${data.reason}"`;
    document.getElementById('positiveFeedback').innerText = data.positiveFeedback;
    document.getElementById('typeDescription').innerText = type.description;

    resultSection.classList.remove('hidden');
    try {
        lucide.createIcons();
    } catch (e) {
        console.error("Lucide icon refresh failed:", e);
    }

    setTimeout(() => {
        progressBar.style.width = `${data.matchPercentage}%`;
    }, 100);
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
    analyzeAction.classList.remove('hidden');
    errorBox.classList.add('hidden');
}

// Run the initialization logic once the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
