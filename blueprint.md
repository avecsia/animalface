# AI Animal Face Test App Blueprint

## Overview

This document outlines the plan to convert the existing React-based application into a single-file, pure HTML/CSS/JavaScript application and deploy it to Firebase Hosting. The application, "AI 동물상 테스트" (AI Animal Face Test), allows users to upload a photo of their face to determine which animal they resemble.

## Implemented Features

*   **UI/UX:**
    *   A modern, clean, and responsive user interface built with Tailwind CSS.
    *   Interactive file upload (drag-and-drop or click).
    *   Image preview before analysis.
    *   Loading animation during the analysis process.
    *   Visually appealing result display with percentages, descriptions, and icons.
    *   Smooth animations and transitions for a better user experience.
*   **Functionality:**
    *   **File Handling:** Users can select a local image file. The image is displayed in the browser.
    *   **Mock Analysis:** Since a live API key for the Gemini API is not available, the analysis is simulated. The application will return a pre-defined "Puppy" result after a short delay to demonstrate the full user flow.
    *   **State Management:** The UI transitions between different states: upload, preview, loading, and result.
    *   **Reset:** Users can reset the application to start over with a new image.

## Plan

1.  **Replace `index.html`:** The current `index.html` file, which is a template for the React app, will be replaced with the complete HTML structure provided by the user. This new file will contain all the necessary HTML, CSS (via CDN), and JavaScript code.

2.  **Simulate API Call:** The JavaScript code within the new `index.html` will be modified. The function `analyzeFace` that calls the Google Gemini API will be altered to return a hardcoded mock result. This ensures the application is fully interactive and its UI flow can be tested without requiring a valid API key.

3.  **Project Cleanup:** To transition from a React project to a simple static web page, the following files and directories will be removed:
    *   `src/`
    *   `public/`
    *   `vite.config.js`
    *   `postcss.config.js`
    *   `tailwind.config.js`
    *   `eslint.config.js`

4.  **Update `package.json`:** The `package.json` file will be modified to remove all dependencies (like React and ReactDOM) and scripts (like `dev`, `build`) that are no longer needed.

5.  **Deployment:** The application will be deployed as a static site using Firebase Hosting. The root directory containing the final `index.html` will be used for deployment.
