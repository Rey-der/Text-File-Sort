# Text-File-Sort
# Text-File-Sort App

**Electron App that saves clipboard data, saves files, and sorts them in a unique way**

## Overview

The Text-File-Sort-App is an Electron-based desktop application designed to capture selected text (e.g., from the clipboard), store it locally, and organize it in a unique way. With a responsive user interface divided into different tabs, the app offers the following main areas:

- **Text Capture:** Capture and edit text in its own tab.
- **Folder Management:** Organize saved files into folders, search for specific folders, and sort them in various ways.
- **Mindmap Integration:** Visually organize your saved data through an interactive mindmap with drag-and-drop functionality and additional control buttons.

## Features

- **Clipboard/Text Capture:** Capture selected text via a browser extension or directly through copy-paste.
- **Local Storage:** Save the captured data in files or databases (e.g., JSON, SQLite, IndexedDB).
- **Unique Sorting:** Manage your files using a folder system with flexible views (list, icons) and sorting options.
- **Mindmap Visualization:** Arrange your data visually in a mindmap, complete with control buttons on each side.
- **Responsive Design:** The UI dynamically adjusts to different window sizes.
- **In-App Reload:** A dedicated button allows you to restart the app without needing to reopen the terminal.

## Project Structure

```plaintext
my-electron-app/
├── package.json       # Project configuration and dependencies
├── main.js            # Main process (Electron Main Process)
├── index.html         # Main HTML file for the user interface
├── renderer.js        # Renderer script for UI interactions (tab switching, reload, etc.)
├── style.css          # CSS styles for the app
└── assets/            # Optional: Images, icons, and other static files

##Prototype with Risk issues! Open ipcMain.on, XSS attack, innerHTML! Use on own digression!
