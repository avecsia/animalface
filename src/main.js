const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

import { ANIMAL_TYPES } from './animalTypes.js';

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

let base64Image = "";
let uploadedFile = null;

function initialize() {
    setupEventListeners();
    renderAnimalIcons();
    lucide.createIcons(); // Added this line
}

function setupEventListeners() {
    if (dropZone) {
        dropZone.addEventListener('click', () => fileInput.click());
    }
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
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
        };
        reader.readAsDataURL(uploadedFile);
    }
}

async function analyzeFace() {
    if (!apiKey) {
        errorMessage.innerText = "API 키가 설정되지 않았습니다. .env 파일에 VITE_GEMINI_API_KEY를 설정해주세요.";
        errorBox.classList.remove('hidden');
        return;
    }
    if (!base64Image || !uploadedFile) return;

    startAnalyzeBtn.disabled = true;
    startAnalyzeBtn.classList.add('opacity-50', 'cursor-not-allowed');

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
        generationConfig: { responseMimeType: "application/json" }
    };

    try {
        const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
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
        resultSection.classList.add('hidden');
        if (err.isRateLimit) {
            errorMessage.innerText = "요청 횟수가 너무 많습니다. 잠시 후 다시 시도해 주세요.";
        } else {
            errorMessage.innerText = "분석 중 오류가 발생했습니다. 다시 시도해 주세요.";
        }
        errorBox.classList.remove('hidden');
    } finally {
        startAnalyzeBtn.disabled = false;
        startAnalyzeBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        loadingOverlay.classList.add('hidden');
    }
}

async function fetchWithRetry(url, options, retries = 5, backoff = 1000) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error('API Error');
        return await response.json();
    } catch (err) {
        if (retries > 0) {
            await new Promise(r => setTimeout(r, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw err;
    }
}

function displayResult(data) {
    const type = ANIMAL_TYPES[data.animalKey];
    if (!type) {
        console.error("Invalid animalKey from API:", data.animalKey);
        errorMessage.innerText = "알 수 없는 동물 유형입니다.";
        errorBox.classList.remove('hidden');
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
    retestBtn.classList.add('hidden');

    const resultCard = document.getElementById('resultCard');
    const resultBgIcon = document.getElementById('resultBgIcon');
    const progressBar = document.getElementById('progressBar');
    const animalDescription = document.getElementById('animalDescription');
    const celebrityList = document.getElementById('celebrityList');
    const keywordsContainer = document.getElementById('keywords'); // Keywords element

    resultCard.className = `p-8 rounded-3xl border-2 shadow-lg relative overflow-hidden ${type.color}`;
    resultBgIcon.querySelector('span').innerText = type.icon;

    document.getElementById('resultTitle').innerHTML = `${data.matchPercentage}% <span class="text-2xl font-bold">${type.name}</span>`;
    document.getElementById('resultReason').innerText = `"${data.reason}"`;
    document.getElementById('positiveFeedback').innerText = data.positiveFeedback;

    // Update animal description
    animalDescription.innerText = type.description;

    // Update celebrity list
    celebrityList.innerHTML = ''; // Clear existing celebrities
    type.celebrities.forEach(name => {
        const item = document.createElement('div');
        item.className = "bg-slate-50 p-3 rounded-xl text-center font-bold text-slate-700 border border-slate-100";
        item.innerText = name;
        celebrityList.appendChild(item);
    });

    // Handle keywords (if type.keywords exists in ANIMAL_TYPES, otherwise clear)
    keywordsContainer.innerHTML = ''; // Clear existing keywords
    if (type.keywords && type.keywords.length > 0) {
        type.keywords.forEach(kw => {
            const tag = document.createElement('span');
            tag.className = "px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold";
            tag.innerText = kw;
            keywordsContainer.appendChild(tag);
        });
    }

    // Show the results
    resultSection.classList.remove('hidden');

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
