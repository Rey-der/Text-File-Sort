// renderer.js
const { ipcRenderer } = require('electron');
const path = require('path');

document.addEventListener('DOMContentLoaded', async () => {
  // Reload Button Functionality
  const reloadButton = document.getElementById('reload-button');
  if (reloadButton) {
    reloadButton.addEventListener('click', () => {
      location.reload();
    });
  }

  // Tab Navigation 
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('#tab-content > .tab-content');
  const fileContentDisplay = document.getElementById('file-content-display');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.style.display = 'none');
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(tabId).style.display = 'block';
    });
  });

  if (tabButtons.length > 0) {
    tabButtons[0].click();
  }

  // Set initial dark mode
  let isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }

  // Dark/Light Mode
  const modeToggleButton = document.getElementById('mode-toggle-button');
  modeToggleButton.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  });

  // Draggable Splitter Functionality
  const splitter = document.getElementById('splitter');
  const folderSidebar = document.getElementById('folder-sidebar');
  const mainContainer = document.getElementById('main-container');
  const logo = document.getElementById('logo');
  const folderSearch = document.getElementById('folder-search');
  let isResizing = false;
  const minWidth = 80;
  const maxWidth = 500;

  splitter.addEventListener('mousedown', () => {
    isResizing = true;
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    let newWidth = e.clientX;
    if (newWidth < minWidth) newWidth = minWidth;
    if (newWidth > maxWidth) newWidth = maxWidth;
    folderSidebar.style.width = newWidth + 'px';
    splitter.style.left = newWidth + 'px';
    mainContainer.style.marginLeft = (newWidth + splitter.offsetWidth) + 'px';
    logo.style.left = (newWidth + splitter.offsetWidth) + 'px';
    folderSearch.style.width = `calc(100% - 20px)`;
  });

  document.addEventListener('mouseup', () => {
    isResizing = false;
  });

  // Logo position
  const adjustLogoPosition = () => {
    const sidebarWidth = folderSidebar.offsetWidth;
    const splitterWidth = splitter.offsetWidth;
    const logo = document.getElementById("logo");
    if (window.innerWidth <= 768) {
      logo.style.left = `0px`;
    } else {
      logo.style.left = `${sidebarWidth + splitterWidth}px`;
    }
  };
  adjustLogoPosition();
  window.addEventListener('resize', adjustLogoPosition);

  // Dropdown element for folders
  function createDropdownElement(item) {
    const container = document.createElement('div');
    container.classList.add('dropdown-container');

    if (item.type === 'folder') {
      // Folder button
      const button = document.createElement('button');
      button.classList.add('dropdown-btn');
      button.textContent = item.name;
      button.setAttribute('data-path', item.path);
      container.appendChild(button);

      // Container for children.
      const content = document.createElement('div');
      content.classList.add('dropdown-content');
      container.appendChild(content);
        content.style.display = 'none'

      // Toggle dropdown
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const isVisible = content.style.display === 'block';
        content.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible && content.children.length === 0) { //only open if has no content
          ipcRenderer.send('open-file', button.getAttribute('data-path'));
        }
      });

      // add any child items of folders
      if (item.children && item.children.length > 0) {
        item.children.forEach(child => {
          const childElement = createDropdownElement(child);
          content.appendChild(childElement);
        });
      }
    } else if (item.type === 'file') {
      // Create a clickable file link.
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

  // Request the file system tree
  const fileSystem = await ipcRenderer.invoke('get-file-system');
  const folderDisplay = document.getElementById('folder-display');

  // create tree view contents.
  fileSystem.forEach(item => {
    const element = createDropdownElement(item);
    folderDisplay.appendChild(element);
  });

  // Display file content.
  ipcRenderer.on('file-content', (event, data) => {
    fileContentDisplay.textContent = data.data;
  });
    
  // Receive folder content from main.js
    ipcRenderer.on('folder-content', (event, data) => {
        if (data) {
            const parentFolderButton = document.querySelector(`.dropdown-btn[data-path="${data.path}"]`);
            const content = parentFolderButton.nextElementSibling;
            content.innerHTML = '';
            data.data.forEach(item => {
                const childElement = createDropdownElement(item);
                content.appendChild(childElement);
            });
        }
    });
});
