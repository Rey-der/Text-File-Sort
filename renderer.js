const { ipcRenderer } = require('electron');
const path = require('path');
const { clipboard } = require('electron');

// Constants
const CLIPBOARD_CHECK_INTERVAL = 1000;

// State Management
const AppState = {
  isDarkMode: false,
  isResizing: false,
  selectedElement: null,
  clipboard: {
    interval: null,
    isMonitoring: false,
    lastContent: null
  }
};

// UI Elements
const UI = {
  init() {
    this.clipboardHistory = document.getElementById('clipboard-history');
    this.reloadButton = document.getElementById('reload-button');
    this.tabButtons = document.querySelectorAll('.tab-button');
    this.tabContents = document.querySelectorAll('#tab-content > .tab-content');
    this.fileContentDisplay = document.getElementById('file-content-display');
    this.modeToggleButton = document.getElementById('mode-toggle-button');
    this.splitter = document.getElementById('splitter');
    this.folderSidebar = document.getElementById('folder-sidebar');
    this.mainContainer = document.getElementById('main-container');
    this.refreshButton = document.getElementById('refresh-clipboard');
    this.searchInput = document.getElementById('folder-search-input');
    
    // Initialize dark mode from system preference
    this.initializeDarkMode();
    
    // Initialize file system
    this.initializeFileSystem();
  },

  initializeDarkMode() {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    AppState.isDarkMode = prefersDark.matches;
    this.updateDarkMode();

    // Listen for system changes
    prefersDark.addEventListener('change', (e) => {
      AppState.isDarkMode = e.matches;
      this.updateDarkMode();
    });

    // Add toggle button listener
    if (this.modeToggleButton) {
      this.modeToggleButton.addEventListener('click', () => {
        AppState.isDarkMode = !AppState.isDarkMode;
        this.updateDarkMode();
      });
    }
  },

  updateDarkMode() {
    document.body.classList.toggle('dark-mode', AppState.isDarkMode);
    // Update toggle button text/icon if needed
    if (this.modeToggleButton) {
      this.modeToggleButton.textContent = AppState.isDarkMode ? '☀️' : '🌙';
    }
  },

  async initializeFileSystem() {
    try {
      console.log('Initializing file system...');
      const fileSystem = await ipcRenderer.invoke('get-file-system');
      console.log('Received file system data:', fileSystem);
      
      const folderDisplay = document.getElementById('folder-display');
      if (!folderDisplay) {
        console.error('Folder display element not found');
        return;
      }
      
      if (fileSystem) {
        folderDisplay.innerHTML = ''; // Clear existing content
        fileSystem.forEach(item => {
          const element = this.createDropdownElement(item);
          folderDisplay.appendChild(element);
        });
      } else {
        console.error('No file system data received');
      }
    } catch (error) {
      console.error('Failed to initialize file system:', error);
    }
  },

  createDropdownElement(item) {
    const container = document.createElement('div');
    container.classList.add('dropdown-container');

    if (item.type === 'folder') {
      const button = document.createElement('button');
      button.classList.add('dropdown-btn');
      button.textContent = item.name;
      button.setAttribute('data-path', item.path);
      container.appendChild(button);

      const content = document.createElement('div');
      content.classList.add('dropdown-content');
      container.appendChild(content);
      content.style.display = 'none';

      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const isVisible = content.style.display === 'block';
        content.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible && content.children.length === 0) {
          try {
            const folderContent = await ipcRenderer.invoke('get-folder-content', item.path);
            if (folderContent) {
              folderContent.forEach(child => {
                const childElement = this.createDropdownElement(child);
                content.appendChild(childElement);
              });
            }
          } catch (error) {
            console.error('Failed to load folder content:', error);
          }
        }
      });
    } else if (item.type === 'file') {
      const link = document.createElement('a');
      link.textContent = item.name;
      link.setAttribute('data-path', item.path);
      link.addEventListener('click', (event) => {
        event.preventDefault();
        ipcRenderer.send('open-file', item.path);
      });
      container.appendChild(link);
    }

    return container;
  }
};

// Clipboard Management

ipcRenderer.on('folder-content', (event, { path: folderPath, data }) => {
  const folderDisplay = document.getElementById('folder-display');
  if (folderDisplay) {
    folderDisplay.innerHTML = ''; // Clear previous images

    data.forEach(item => {
      if (item.type === 'file' && /\.(jpg|jpeg|png|gif)$/i.test(item.name)) {
        // Construct the full path correctly using path.join
        const imagePath = path.join(folderPath, item.name);
        // Use file:// protocol and encode the path for safety
        const encodedImagePath = encodeURI(`file:///${imagePath}`); // Encode for safety
        const img = document.createElement('img');
        img.src = encodedImagePath;
        console.log('Image src set (folder-content):', encodedImagePath);
        img.alt = item.name;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '200px';
        img.onerror = (error) => {
          console.error(`Error loading image ${imagePath}:`, error);
          // Optionally display an error message
          const errorMessage = document.createElement('div');
          errorMessage.textContent = `Error loading ${item.name}`;
          folderDisplay.appendChild(errorMessage);
        };
        folderDisplay.appendChild(img);
      }
    });
  }
});


const ClipboardManager = {
  async hashContent(content) {
    const msgUint8 = new TextEncoder().encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },
  async handleImage(imageType, blob) {
    const base64 = await this.blobToBase64(blob);
    if (await this.isDuplicate(base64, 'image')) return;

    const { container, content: img } = this.createContainer('image');
    img.onerror = (e) => {
      console.error('Image load error:', e);
      // Add error handling to display a message or remove the broken image container.
      const errorMessage = document.createElement('div');
      errorMessage.textContent = 'Error loading image.';
      container.appendChild(errorMessage);
    };
    img.src = base64;

    this.addImageInfo(container, img, imageType, base64);
    this.addControls(container, 'image', { data: base64, type: imageType });
    this.addToHistory(container);
  },

  addImageInfo(container, img, imageType, base64) {
    const imageInfo = document.createElement('div');
    imageInfo.className = 'image-info';
    container.appendChild(imageInfo);

    img.onload = () => {
      const dimensions = `${img.naturalWidth}x${img.naturalHeight}px`;
      const sizeInBytes = base64.length * 0.75; // Approximate size, base64 is ~33% larger
      const sizeInKB = (sizeInBytes / 1024).toFixed(2);
      imageInfo.textContent = `${imageType.split('/')[1].toUpperCase()} - ${sizeInKB} KB - ${dimensions}`;
    };
    // Handle the case where the image fails to load.
    img.onerror = () => {
      imageInfo.textContent = 'Error loading image';
    }
  },

  async isDuplicate(content, type) {
    if (!UI.clipboardHistory) return false;
    const contentHash = await this.hashContent(content);
    const existingContainers = UI.clipboardHistory.querySelectorAll('.clipboard-container');
    
    for (const container of existingContainers) {
      const existingContent = type === 'text' ? 
        container.querySelector('.clipboard-text')?.value :
        container.querySelector('.clipboard-image')?.src;
        
      if (existingContent) {
        const existingHash = await this.hashContent(existingContent);
        if (existingHash === contentHash) return true;
      }
    }
    return false;
  },

  createContainer(type) {
    const container = document.createElement('div');
    container.className = 'clipboard-container';
    
    let content;
    if (type === 'text') {
      content = document.createElement('textarea');
      content.className = 'clipboard-text';
      content.readOnly = true;
    } else if (type === 'image') {
      content = document.createElement('img');
      content.className = 'clipboard-image';
    }
    
    container.appendChild(content);
    return { container, content };
  },

  addToHistory(container) {
    if (UI.clipboardHistory) {
      UI.clipboardHistory.insertBefore(container, UI.clipboardHistory.firstChild);
    }
  },

  async handleImage(imageType, blob) {
    console.log('handleImage called:', imageType, blob); // 1. Entry point
    const base64 = await this.blobToBase64(blob);
    console.log('Base64 data generated:', base64); // 2. Base64 conversion
    if (await this.isDuplicate(base64, 'image')) {
      console.log('Image is a duplicate; skipping.'); // 3. Duplicate check
      return;
    }

    const { container, content: img } = this.createContainer('image');
    console.log('Image element created:', img); // 4. Image element creation
    img.onerror = (e) => {
      console.error('Image load error:', e); // 5. Error handling
      const errorMessage = document.createElement('div');
      errorMessage.textContent = 'Error loading image.';
      container.appendChild(errorMessage);
    };
    img.onload = () => {
      console.log('Image loaded successfully.'); // 6. Load success
    };
    img.src = base64;
    console.log('Image src set:', base64); // 7. src attribute set
    this.addImageInfo(container, img, imageType, base64);
    this.addControls(container, 'image', { data: base64, type: imageType });
    this.addToHistory(container);
    console.log('Image added to history.'); // 8. Added to history
  },

  async handleText(text) {
    if (!text?.trim() || await this.isDuplicate(text, 'text')) return;

    const { container, content: textarea } = this.createContainer('text');
    textarea.value = text;
    
    this.addControls(container, 'text', text);
    this.addToHistory(container);
  },

  ddImageInfo(container, img, imageType, base64) {
    console.log('addImageInfo called:', container, img, imageType, base64); //9. Add image info
    const imageInfo = document.createElement('div');
    imageInfo.className = 'image-info';
    container.appendChild(imageInfo);

    img.onload = () => {
      const dimensions = `${img.naturalWidth}x${img.naturalHeight}px`;
      const sizeInBytes = base64.length * 0.75;
      const sizeInKB = (sizeInBytes / 1024).toFixed(2);
      imageInfo.textContent = `${imageType.split('/')[1].toUpperCase()} - ${sizeInKB} KB - ${dimensions}`;
      console.log('Image info added:', imageInfo.textContent); //10. Image info added
    };
    img.onerror = () => {
      imageInfo.textContent = 'Error loading image';
      console.error('Error adding image info.'); // 11. Image info error
    };
  },

  addControls(container, type, data) {
    const saveButton = document.createElement('button');
    saveButton.textContent = `Save ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    saveButton.onclick = () => {
      ipcRenderer.send(`save-${type}`, data);
    };
    container.appendChild(saveButton);

    const timestamp = document.createElement('div');
    timestamp.className = 'clipboard-timestamp';
    timestamp.textContent = new Date().toLocaleTimeString();
    container.appendChild(timestamp);
  },

  async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },

  startMonitoring() {
    if (!AppState.clipboard.isMonitoring) {
      console.log('Starting clipboard monitoring');
      AppState.clipboard.isMonitoring = true;
      this.monitor();
      AppState.clipboard.interval = setInterval(() => this.monitor(), CLIPBOARD_CHECK_INTERVAL);
    }
  },

  stopMonitoring() {
    if (AppState.clipboard.isMonitoring) {
      console.log('Stopping clipboard monitoring');
      AppState.clipboard.isMonitoring = false;
      if (AppState.clipboard.interval) {
        clearInterval(AppState.clipboard.interval);
        AppState.clipboard.interval = null;
      }
    }
  },

  async monitor() {
    if (!document.hasFocus()) return;

    try {
      await this.checkImageContent();
      await this.checkTextContent();
    } catch (err) {
      console.error('Error monitoring clipboard:', err);
    }
  },

  async checkImageContent() {
    console.log('checkImageContent started');
    try {
        if (!document.hasFocus()) {
            console.log('Document not focused; skipping clipboard check.');
            return;
        }

        const items = await navigator.clipboard.read();
        console.log('Clipboard items read:', items);

        if (!items || items.length === 0) {
            console.log('Clipboard is empty.');
            return;
        }

        for (const item of items) {
            if (item.types.some(type => type.startsWith('image/'))) {
                const imageType = item.types.find(type => type.startsWith('image/'));
                console.log('Image type detected:', imageType);

                try {
                    const blob = await item.getType(imageType);
                    console.log('Image blob obtained:', blob);
                    if (blob) {
                        ClipboardManager.handleImage(imageType, blob);
                    } else {
                        console.warn('Blob is null or undefined.');
                    }
                } catch (blobError) {
                    console.error(`Error getting image blob: ${blobError}`);
                }
            }
        }
    } catch (readError) {
        console.error(`Error reading clipboard: ${readError}`);
    }
  },

  async checkTextContent() {
    try {
      const text = await navigator.clipboard.readText();
      await this.handleText(text);
    } catch (error) {
      console.log('No text in clipboard');
    }
  }
};

// Event Handlers
const EventHandlers = {
  setupWindowEvents() {
    window.addEventListener('focus', () => {
      if (!AppState.clipboard.isMonitoring) {
        ClipboardManager.startMonitoring();
      }
    });

    window.addEventListener('blur', () => {
      ClipboardManager.stopMonitoring();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        ClipboardManager.stopMonitoring();
      } else if (document.hasFocus()) {
        ClipboardManager.startMonitoring();
      }
    });
  },

  setupUIEvents() {
    if (UI.refreshButton) {
      UI.refreshButton.addEventListener('click', () => ClipboardManager.monitor());
    }

    if (UI.reloadButton) {
      UI.reloadButton.addEventListener('click', () => location.reload());
    }

    UI.tabButtons?.forEach(button => {
      button.addEventListener('click', () => {
        UI.tabButtons.forEach(btn => btn.classList.remove('active'));
        UI.tabContents.forEach(content => content.style.display = 'none');
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(tabId).style.display = 'block';
      });
    });
  }
};

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
  UI.init();
  EventHandlers.setupWindowEvents();
  EventHandlers.setupUIEvents();

  // Initialize first tab
  if (UI.tabButtons?.length > 0) {
    UI.tabButtons[0].click();
  }

  // Start monitoring if window is focused
  if (document.hasFocus()) {
    ClipboardManager.startMonitoring();
  }
});