
import { ANIMAL_TYPES } from './animalTypes.js';

// DOM Elements
const uploadStep = document.getElementById('uploadStep');
const previewStep = document.getElementById('previewStep');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const previewImg = document.getElementById('previewImg');
const loadingOverlay = document.getElementById('loadingOverlay');
const resultSection = document.getElementById('resultSection');
const resetBtn = document.getElementById('resetBtn');
const errorBox = document.getElementById('errorBox');
const errorMessage = document.getElementById('errorMessage');

const retestBtn = document.getElementById('retestBtn');
const rankingContainer = document.getElementById('rankingContainer');
const celebrityList = document.getElementById('celebrityList');
const keywordsContainer = document.getElementById('keywords');
const analyzeAction = document.getElementById('analyzeAction'); // This element might not be used in the new flow, but we keep the reference

// Gender Selection Elements
const maleBtn = document.getElementById('maleBtn');
const femaleBtn = document.getElementById('femaleBtn');
const selectedGenderText = document.getElementById('selectedGenderText');

let selectedGender = "male"; // default
let uploadedFile = null;

function initialize() {
    lucide.createIcons(); // Re-add the lucide icons initialization
    setupEventListeners();
    renderAnimalIcons();
    updateGenderSelectionUI();
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
    if (maleBtn) {
        maleBtn.addEventListener('click', () => {
            selectedGender = "male";
            updateGenderSelectionUI();
        });
    }
    if (femaleBtn) {
        femaleBtn.addEventListener('click', () => {
            selectedGender = "female";
            updateGenderSelectionUI();
        });
    }
}

function updateGenderSelectionUI() {
    if (maleBtn) {
        maleBtn.classList.toggle('active', selectedGender === 'male');
    }
    if (femaleBtn) {
        femaleBtn.classList.toggle('active', selectedGender === 'female');
    }
    if (selectedGenderText) {
        selectedGenderText.innerText = selectedGender === 'male' ? '남성' : '여성';
    }
}

function renderAnimalIcons() {
    const container = document.getElementById('animalTypeIcons');
    if (!container) return;
    container.innerHTML = '';
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
        reader.onload = (ev) => {
            const base64Image = ev.target.result.split(',')[1];
            previewImg.src = ev.target.result;
            
            uploadStep.classList.add('hidden');
            previewStep.classList.remove('hidden');
            resetBtn.classList.remove('hidden');
            
            // Call the new analyzeFace function that uses the backend
            analyzeFace(base64Image, uploadedFile.type);
        };
        reader.readAsDataURL(uploadedFile);
    }
}

async function analyzeFace(base64Data, mimeType) {
    loadingOverlay.classList.remove('hidden');
    resultSection.classList.add('hidden');
    errorBox.classList.add('hidden');
    window.scrollTo(0, 0);

    try {
        // Correctly call the backend function /analyze
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Data, mimeType, selectedGender })
        });

        const analysis = await response.json();

        if (!response.ok) {
            // Throw an error with the message from the backend
            throw new Error(analysis.error || '분석 서버에서 알 수 없는 오류가 발생했습니다.');
        }
        
        displayResult(analysis);

    } catch (error) {
        console.error("Analysis failed:", error);
        errorMessage.innerText = `분석 중 오류가 발생했습니다: ${error.message}`;
        errorBox.classList.remove('hidden');
        resultSection.classList.add('hidden'); // Ensure result is hidden on error
    } finally {
        loadingOverlay.classList.add('hidden');
    }
}

function displayResult(analysis) {
    const sortedTypes = Object.entries(analysis.scores).sort(([, a], [, b]) => b - a);
    const topTypeKey = sortedTypes[0][0];
    const topPercent = sortedTypes[0][1];
    const type = ANIMAL_TYPES[topTypeKey];

    if (!type) {
        console.error("Invalid animalKey from API:", topTypeKey);
        errorMessage.innerText = "알 수 없는 동물 유형의 결과가 반환되었습니다.";
        errorBox.classList.remove('hidden');
        return;
    }

    const imageContainer = previewStep.querySelector('.bg-white.rounded-\[2rem\]');
    if (imageContainer) {
        imageContainer.classList.add('hidden');
    }
    
    if (analyzeAction) {
       analyzeAction.classList.add('hidden');
    }
    errorBox.classList.add('hidden');

    const resultMainCard = document.getElementById('resultMainCard');
    const mainAnimalEmoji = document.getElementById('mainAnimalEmoji');
    const mainAnimalName = document.getElementById('mainAnimalName');
    const mainPercent = document.getElementById('mainPercent');
    const resultLabel = document.getElementById('resultLabel');
    
    resultMainCard.className = `p-8 rounded-[2rem] text-center space-y-4 shadow-xl border-t-8 bg-white ${type.resultColor}`;
    mainAnimalEmoji.innerText = type.icon;
    mainAnimalName.innerText = type.name;
    mainPercent.innerText = `${topPercent}%`;
    resultLabel.innerText = analysis.summary;

    document.getElementById('animalDescription').innerText = type.description;
    updateGenderSelectionUI(); // Update gender text in the result

    rankingContainer.innerHTML = '';
    sortedTypes.forEach(([name, score]) => {
        const animal = ANIMAL_TYPES[name];
        if (!animal) return;
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

    keywordsContainer.innerHTML = '';
    type.keywords.forEach(kw => {
        const tag = document.createElement('span');
        tag.className = "px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold";
        tag.innerText = kw;
        keywordsContainer.appendChild(tag);
    });

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

    resultSection.classList.remove('hidden');
}

function reset() {
    uploadedFile = null;
    fileInput.value = ""; 
    
    uploadStep.classList.remove('hidden');
    previewStep.classList.add('hidden');
    resetBtn.classList.add('hidden');
    resultSection.classList.add('hidden');
    
    const imageContainer = previewStep.querySelector('.bg-white.rounded-\[2rem\]');
    if (imageContainer) {
        imageContainer.classList.remove('hidden');
    }

    if(analyzeAction) {
      analyzeAction.classList.remove('hidden');
    }
    errorBox.classList.add('hidden');
}

// Initialize the application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
