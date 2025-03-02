🗂️ Text-File-Sort App

Electron App that saves clipboard data, saves files, and sorts them in a unique way
⚠️ Important Security Warning

This application handles clipboard data, file storage, and text sorting. While functional, it currently lacks comprehensive security measures, which may expose users to potential risks, including:

🔹 Unfiltered Clipboard Input → Data captured from the clipboard is not sanitized, creating potential vulnerabilities (e.g., XSS attacks).
🔹 File Access Risks → The app interacts with local file storage but does not fully validate file paths or permissions, which could lead to unintended access issues.
🔹 InnerHTML Usage → The application may use innerHTML in some cases, increasing the risk of cross-site scripting (XSS) attacks if malicious input is processed.
🔹 IPC Communication Security → Electron’s IPC mechanisms (ipcMain.on) must be carefully implemented to prevent unauthorized access or data exposure.
📌 Overview

The Text-File-Sort App is an Electron-based desktop application designed to:
✅ Capture selected text (e.g., from the clipboard)
✅ Store it locally
✅ Organize it in a unique way

With a responsive UI divided into different tabs, the app offers:

    📝 Text Capture: Capture and edit text in its own tab.
    📂 Folder Management: Organize saved files into folders, search for specific folders, and sort them in various ways.
    🧠 Mindmap Integration: Visually organize your saved data through an interactive mindmap with drag-and-drop functionality.

⚙️ Features

✅ Clipboard/Text Capture – Capture selected text via a browser extension or copy-paste.
✅ Local Storage – Save the captured data in files or databases (e.g., JSON, SQLite, IndexedDB).
✅ Unique Sorting – Manage your files using a flexible folder system with sorting options.
✅ Mindmap Visualization – Arrange your data visually in a mindmap with interactive controls.
✅ Responsive Design – The UI dynamically adjusts to different window sizes.
✅ In-App Reload – A dedicated button allows you to restart the app without reopening the terminal.
🛠️ Project Structure

my-electron-app/
├── package.json       # Project configuration and dependencies
├── main.js            # Main Electron process
├── index.html         # Main HTML file for the UI
├── renderer.js        # Handles UI interactions (tab switching, reload, etc.)
├── style.css          # App styles
└── assets/            # Optional: Images, icons, and static files

⚠️ Usage Disclaimer

🔴 Use this application at your own discretion.
🔴 Until security measures are fully implemented, avoid handling sensitive or untrusted clipboard data within the app.