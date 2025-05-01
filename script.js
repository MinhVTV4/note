// =====================================================================
//  Constants & State Variables
// =====================================================================
const NOTES_STORAGE_KEY = 'startNotesData_v2'; // Changed key for new structure
const TEMPLATES_STORAGE_KEY = 'startNoteTemplates';
const NOTEBOOKS_STORAGE_KEY = 'startNoteNotebooks'; // NEW: Key for notebooks
const THEME_NAME_KEY = 'startNotesThemeName';
const ACCENT_COLOR_KEY = 'startNotesAccentColor';
const FONT_FAMILY_KEY = 'startNotesFontFamily';
const FONT_SIZE_SCALE_KEY = 'startNotesFontSizeScale';
const LAST_CUSTOM_THEME_KEY = 'startNotesLastCustomTheme';
const SUGGESTION_BOX_ID = 'tag-suggestion-box';
const DEBOUNCE_DELAY = 1500;

let notes = [];
let templates = [];
let notebooks = []; // NEW: Array for notebooks
let isViewingArchived = false;
let isViewingTrash = false;
let currentNotebookId = 'all'; // NEW: Track active notebook tab ('all', or notebook ID)
let sortableInstance = null;
let activeTagInputElement = null;

const DEFAULT_NOTEBOOK_ID = 'all'; // NEW: Represents the "All Notes" view

const NOTE_COLORS = [
    { name: 'Default', value: null, hex: 'transparent' },
    { name: 'Yellow', value: 'note-color-yellow', hex: '#fff9c4' },
    { name: 'Blue', value: 'note-color-blue', hex: '#bbdefb' },
    { name: 'Green', value: 'note-color-green', hex: '#c8e6c9' },
    { name: 'Red', value: 'note-color-red', hex: '#ffcdd2' },
    { name: 'Purple', value: 'note-color-purple', hex: '#e1bee7' },
    { name: 'Grey', value: 'note-color-grey', hex: '#e0e0e0' },
];

// === UPDATED: Add new theme names ===
const VALID_THEMES = [
    'light', 'dark', 'sepia',
    'solarized-light', 'solarized-dark',
    'nord', 'gruvbox-dark', 'gruvbox-light', 'dracula', 'monochrome' // New themes added
];
const DEFAULT_THEME = 'light';
const DEFAULT_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const DEFAULT_FONT_SIZE_SCALE = 1;
const DEFAULT_ACCENT_COLOR = 'default';
// === UPDATED: Add new dark theme names ===
const DARK_THEME_NAMES = [
    'dark', 'solarized-dark',
    'nord', 'gruvbox-dark', 'dracula' // New dark themes added
];
// ====================================

// =====================================================================
//  DOM References
// =====================================================================
// Header & Controls
const quickThemeToggleBtn = document.getElementById('theme-toggle-btn');
const settingsBtn = document.getElementById('settings-btn');
const searchInput = document.getElementById('search-input');
const exportNotesBtn = document.getElementById('export-notes-btn');
const importNotesBtn = document.getElementById('import-notes-btn');
const importFileInput = document.getElementById('import-file-input');
const viewArchiveBtn = document.getElementById('view-archive-btn');
const archiveStatusIndicator = document.getElementById('archive-status-indicator');
const viewTrashBtn = document.getElementById('view-trash-btn');
const trashStatusIndicator = document.getElementById('trash-status-indicator');
const emptyTrashBtn = document.getElementById('empty-trash-btn');

// Notebook Tabs
const notebookTabsContainer = document.getElementById('notebook-tabs-container');
const addNotebookTabBtn = document.getElementById('add-notebook-tab-btn');

// Add Note Panel
const addNotePanel = document.getElementById('add-note-panel');
const newNoteTitle = document.getElementById('new-note-title');
const newNoteText = document.getElementById('new-note-text');
const newNoteTags = document.getElementById('new-note-tags');
const templateSelect = document.getElementById('template-select');
const addNoteBtn = document.getElementById('add-note-btn');
const closeAddPanelBtn = document.getElementById('close-add-panel-btn');
const showAddPanelBtn = document.getElementById('show-add-panel-btn');

// Notes Container
const notesContainer = document.getElementById('notes-container');

// Template Modal
const manageTemplatesBtn = document.getElementById('manage-templates-btn');
const templateModal = document.getElementById('template-modal');
const closeTemplateModalBtn = document.getElementById('close-template-modal-btn');
const templateListContainer = document.getElementById('template-list-container');
const templateListSection = document.getElementById('template-list-section');
const showAddTemplatePanelBtn = document.getElementById('show-add-template-panel-btn');
const templateEditPanel = document.getElementById('template-edit-panel');
const templateEditTitle = document.getElementById('template-edit-title');
const templateEditId = document.getElementById('template-edit-id');
const templateEditName = document.getElementById('template-edit-name');
const templateEditTitleInput = document.getElementById('template-edit-title-input');
const templateEditText = document.getElementById('template-edit-text');
const templateEditTags = document.getElementById('template-edit-tags');
const saveTemplateBtn = document.getElementById('save-template-btn');
const cancelEditTemplateBtn = document.getElementById('cancel-edit-template-btn');

// Notebook Management Modal
const manageNotebooksBtn = document.getElementById('manage-notebooks-btn');
const notebookModal = document.getElementById('notebook-modal');
const closeNotebookModalBtn = document.getElementById('close-notebook-modal-btn');
const notebookListContainer = document.getElementById('notebook-list-container');
const notebookListSection = document.getElementById('notebook-list-section');
const showAddNotebookPanelBtn = document.getElementById('show-add-notebook-panel-btn');
const notebookEditPanel = document.getElementById('notebook-edit-panel');
const notebookEditTitle = document.getElementById('notebook-edit-title');
const notebookEditId = document.getElementById('notebook-edit-id');
const notebookEditName = document.getElementById('notebook-edit-name');
const saveNotebookBtn = document.getElementById('save-notebook-btn');
const cancelEditNotebookBtn = document.getElementById('cancel-edit-notebook-btn');

// Settings Modal
const settingsModal = document.getElementById('settings-modal');
const closeSettingsModalBtn = document.getElementById('close-settings-modal-btn');
const themeOptionsContainer = settingsModal.querySelector('.theme-options');
const accentColorOptionsContainer = settingsModal.querySelector('.accent-color-options');
const fontFamilySelect = document.getElementById('font-family-select');
const fontSizeSlider = document.getElementById('font-size-slider');
const fontSizeValueSpan = document.getElementById('font-size-value');
const resetFontSizeBtn = document.getElementById('reset-font-size-btn');


// =====================================================================
//  Utility Functions
// =====================================================================
const parseTags = (tagString) => { if (!tagString) return []; return tagString.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag !== ''); };
const debounce = (func, delay) => { let timeoutId; return function(...args) { clearTimeout(timeoutId); timeoutId = setTimeout(() => { func.apply(this, args); }, delay); }; };
const escapeRegExp = (string) => { return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
const formatTimestamp = (timestamp) => { if (!timestamp) return ''; return new Date(timestamp).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }); }
const escapeHTML = (str) => {
    if (!str) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return str.replace(/[&<>"']/g, m => map[m]);
}

// =====================================================================
//  Theme & Appearance Management
// =====================================================================

const getStoredPreference = (key, defaultValue) => {
    return localStorage.getItem(key) ?? defaultValue;
};

// --- Áp dụng cài đặt tổng thể ---
const applyAllAppearanceSettings = () => {
    const savedTheme = getStoredPreference(THEME_NAME_KEY, DEFAULT_THEME);
    // Ensure saved theme is valid before applying
    applyTheme(VALID_THEMES.includes(savedTheme) ? savedTheme : DEFAULT_THEME);
    const savedAccentColor = getStoredPreference(ACCENT_COLOR_KEY, DEFAULT_ACCENT_COLOR);
    applyAccentColor(savedAccentColor);
    const savedFontFamily = getStoredPreference(FONT_FAMILY_KEY, DEFAULT_FONT_FAMILY);
    applyFontFamily(savedFontFamily);
    const savedFontSizeScale = parseFloat(getStoredPreference(FONT_SIZE_SCALE_KEY, DEFAULT_FONT_SIZE_SCALE.toString()));
    applyFontSize(isNaN(savedFontSizeScale) ? DEFAULT_FONT_SIZE_SCALE : savedFontSizeScale);
};

// --- Theme ---
const applyTheme = (themeName) => {
    // Ensure the theme name is valid before proceeding
    if (!VALID_THEMES.includes(themeName)) {
        console.warn(`Invalid theme name "${themeName}". Falling back to default.`);
        themeName = DEFAULT_THEME;
    }

    const root = document.documentElement;
    // Remove all potential theme classes first
    VALID_THEMES.forEach(theme => document.body.classList.remove(`theme-${theme}`));
    // Remove general light/dark mode classes
    document.body.classList.remove('dark-mode', 'light-mode');

    // Add the specific theme class (if not default light)
    if (themeName !== 'light') {
       document.body.classList.add(`theme-${themeName}`);
    }

    // Add the general dark/light mode class based on the theme name
    const isDark = DARK_THEME_NAMES.includes(themeName);
    document.body.classList.add(isDark ? 'dark-mode' : 'light-mode');

    // Update the quick toggle button text and title
    if (quickThemeToggleBtn) {
        if (isDark) {
            quickThemeToggleBtn.innerHTML = '☀️&nbsp;Sáng';
            quickThemeToggleBtn.title = 'Chuyển sang chế độ Sáng';
        } else {
            quickThemeToggleBtn.innerHTML = '🌙&nbsp;Tối';
            quickThemeToggleBtn.title = 'Chuyển sang chế độ Tối';
        }
    }

    // Update the selection UI in the settings modal
    updateThemeSelectionUI(themeName);
    // Re-apply accent color as its default might change based on the theme
    const currentAccent = getStoredPreference(ACCENT_COLOR_KEY, DEFAULT_ACCENT_COLOR);
    applyAccentColor(currentAccent);
};

const updateThemeSelectionUI = (selectedTheme) => {
    if (!themeOptionsContainer) return;
    themeOptionsContainer.querySelectorAll('.theme-option-btn').forEach(btn => {
        const isActive = btn.dataset.theme === selectedTheme;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });
};

// --- Accent Color ---
const applyAccentColor = (colorValue) => {
    const lightDefaultAccent = '#007bff'; // Default for light themes
    const darkDefaultAccent = '#0d6efd'; // Default for dark themes (can be overridden by specific dark themes if needed)
    const currentTheme = getStoredPreference(THEME_NAME_KEY, DEFAULT_THEME);
    const isDarkThemeActive = DARK_THEME_NAMES.includes(currentTheme);

    // Determine the actual default color based on the current theme mode
    const actualDefaultColor = isDarkThemeActive ? darkDefaultAccent : lightDefaultAccent;

    // Use the selected color if it's a valid hex, otherwise use the theme's default
    const actualColor = (colorValue === DEFAULT_ACCENT_COLOR || !colorValue.startsWith('#'))
                       ? actualDefaultColor
                       : colorValue;

    document.documentElement.style.setProperty('--primary-color', actualColor);
    updateAccentColorSelectionUI(colorValue);
};

const updateAccentColorSelectionUI = (selectedColorValue) => {
    if (!accentColorOptionsContainer) return;
    accentColorOptionsContainer.querySelectorAll('.accent-swatch').forEach(swatch => {
        const isSelected = swatch.dataset.color === selectedColorValue;
        swatch.classList.toggle('selected', isSelected);
        swatch.setAttribute('aria-checked', isSelected ? 'true' : 'false');
        // Update the appearance of the 'default' swatch based on the current theme
        if(swatch.dataset.color === 'default'){
             const lightDefaultAccent = '#007bff';
             const darkDefaultAccent = '#0d6efd';
             const currentTheme = getStoredPreference(THEME_NAME_KEY, DEFAULT_THEME);
             const isDarkThemeActive = DARK_THEME_NAMES.includes(currentTheme);
             swatch.style.backgroundColor = isDarkThemeActive ? darkDefaultAccent : lightDefaultAccent;
             swatch.style.borderColor = isDarkThemeActive ? darkDefaultAccent : lightDefaultAccent;
             swatch.style.color = '#fff';
             swatch.innerHTML = ''; // Remove 'X' mark
        }
    });
};

// --- Font Family ---
const applyFontFamily = (fontFamilyString) => {
    document.documentElement.style.setProperty('--content-font-family', fontFamilyString);
    updateFontFamilySelectionUI(fontFamilyString);
};

const updateFontFamilySelectionUI = (selectedFontFamily) => {
    if (fontFamilySelect) { fontFamilySelect.value = selectedFontFamily; }
};

// --- Font Size ---
const applyFontSize = (scale) => {
    const clampedScale = Math.max(0.8, Math.min(1.5, scale));
    document.documentElement.style.setProperty('--font-size-scale', clampedScale);
    updateFontSizeUI(clampedScale);
};

const updateFontSizeUI = (scale) => {
    if (fontSizeSlider) { fontSizeSlider.value = scale; }
    if (fontSizeValueSpan) { fontSizeValueSpan.textContent = `${Math.round(scale * 100)}%`; }
};

// --- Quick Toggle Theme Logic ---
const quickToggleTheme = () => {
    const currentTheme = getStoredPreference(THEME_NAME_KEY, DEFAULT_THEME);
    const lastCustomTheme = getStoredPreference(LAST_CUSTOM_THEME_KEY, null); // Get the last non-light/dark theme used
    let targetTheme;

    const isCurrentDark = DARK_THEME_NAMES.includes(currentTheme);

    if (isCurrentDark) {
        // If currently dark, try to switch back to the last custom light theme, or default light
        if (lastCustomTheme && !DARK_THEME_NAMES.includes(lastCustomTheme)) {
            targetTheme = lastCustomTheme;
        } else {
            targetTheme = 'light'; // Default light if no custom light theme was saved
        }
    } else {
        // If currently light (or a custom light theme), switch to default dark
        targetTheme = 'dark';
    }

    applyTheme(targetTheme);
    localStorage.setItem(THEME_NAME_KEY, targetTheme);
    // Don't update LAST_CUSTOM_THEME_KEY here, only when selecting from settings
};


// =====================================================================
//  Notebook Data Management
// =====================================================================
const saveNotebooks = () => {
    try {
        localStorage.setItem(NOTEBOOKS_STORAGE_KEY, JSON.stringify(notebooks));
    } catch (e) {
        console.error("Lỗi lưu sổ tay vào localStorage:", e);
        alert("Đã xảy ra lỗi khi cố gắng lưu danh sách sổ tay.");
    }
};

const loadNotebooks = () => {
    const storedNotebooks = localStorage.getItem(NOTEBOOKS_STORAGE_KEY);
    if (storedNotebooks) {
        try {
            notebooks = JSON.parse(storedNotebooks).map(nb => ({
                id: nb.id || Date.now(),
                name: nb.name || `Sổ tay ${nb.id || Date.now()}`
            }));
        } catch (e) {
            console.error("Lỗi đọc dữ liệu sổ tay từ localStorage:", e);
            alert("Lỗi khi đọc dữ liệu Sổ tay đã lưu. Dữ liệu có thể bị lỗi.");
            notebooks = [];
        }
    } else {
        notebooks = [];
    }
};

const addOrUpdateNotebook = () => {
    const name = notebookEditName.value.trim();
    const id = notebookEditId.value ? parseInt(notebookEditId.value) : null;

    if (!name) {
        alert("Vui lòng nhập Tên Sổ tay!");
        notebookEditName.focus();
        return;
    }

    const existingNotebook = notebooks.find(nb => nb.name.toLowerCase() === name.toLowerCase() && nb.id !== id);
    if (existingNotebook) {
        alert(`Sổ tay với tên "${name}" đã tồn tại. Vui lòng chọn tên khác.`);
        notebookEditName.focus();
        return;
    }


    if (id) {
        const index = notebooks.findIndex(nb => nb.id === id);
        if (index !== -1) {
            notebooks[index].name = name;
        } else {
            console.error("Không tìm thấy sổ tay để cập nhật với ID:", id);
            alert("Lỗi: Không tìm thấy sổ tay để cập nhật.");
            return;
        }
    } else {
        const newNotebook = {
            id: Date.now(),
            name: name
        };
        notebooks.push(newNotebook);
    }

    saveNotebooks();
    renderNotebookList();
    renderNotebookTabs();
    hideNotebookEditPanel();
};

const deleteNotebook = (id) => {
    const index = notebooks.findIndex(nb => nb.id === id);
    if (index !== -1) {
        const notebookName = notebooks[index].name;
        const notesInNotebook = notes.filter(note => note.notebookId === id && !note.deleted && !note.archived).length;
        let confirmMessage = `Bạn chắc chắn muốn xóa sổ tay "${escapeHTML(notebookName)}"?`;
        if (notesInNotebook > 0) {
            confirmMessage += `\n\nCẢNH BÁO: Có ${notesInNotebook} ghi chú trong sổ tay này. Việc xóa sổ tay sẽ chuyển các ghi chú này về "Tất cả Ghi chú" (không thuộc sổ tay nào).`;
        }

        if (confirm(confirmMessage)) {
            notebooks.splice(index, 1);
            saveNotebooks();

            let notesUpdated = false;
            notes.forEach(note => {
                if (note.notebookId === id) {
                    note.notebookId = null;
                    notesUpdated = true;
                }
            });
            if (notesUpdated) {
                saveNotes();
            }

            renderNotebookList();
            renderNotebookTabs();

            if (currentNotebookId === id) {
                currentNotebookId = DEFAULT_NOTEBOOK_ID;
                displayNotes();
            }

            if (!notebookEditPanel.classList.contains('hidden') && parseInt(notebookEditId.value) === id) {
                hideNotebookEditPanel();
            }
        }
    } else {
        console.error("Không tìm thấy sổ tay để xóa với ID:", id);
        alert("Lỗi: Không tìm thấy sổ tay để xóa.");
    }
};


// =====================================================================
//  Note Data Management
// =====================================================================
const saveNotes = () => {
    try {
        const notesToSave = notes.map(note => ({
            id: note.id, title: note.title || '', text: note.text || '', tags: note.tags || [], pinned: note.pinned || false, lastModified: note.lastModified || note.id, archived: note.archived || false, color: note.color || null, deleted: note.deleted || false, deletedTimestamp: note.deletedTimestamp || null, notebookId: note.notebookId || null
        }));
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notesToSave));
    } catch (e) { console.error("Lỗi lưu ghi chú vào localStorage:", e); if (e.name === 'QuotaExceededError') { alert("Lỗi: Dung lượng lưu trữ cục bộ đã đầy. Không thể lưu ghi chú."); } else { alert("Đã xảy ra lỗi khi cố gắng lưu ghi chú."); } }
};

const loadNotes = () => {
    const storedNotes = localStorage.getItem(NOTES_STORAGE_KEY);
    if (storedNotes) {
        try {
             notes = JSON.parse(storedNotes).map(note => ({
                id: note.id, title: note.title || '', text: note.text || '', tags: note.tags || [], pinned: note.pinned || false, lastModified: note.lastModified || note.id, archived: note.archived || false, color: note.color || null, deleted: note.deleted || false, deletedTimestamp: note.deletedTimestamp || null, notebookId: note.notebookId || null
             }));
         }
        catch (e) { console.error("Lỗi đọc dữ liệu ghi chú từ localStorage:", e); alert("Lỗi khi đọc dữ liệu ghi chú đã lưu. Dữ liệu có thể bị lỗi. Sử dụng dữ liệu mặc định."); notes = []; }
    } else {
        const oldStoredNotes = localStorage.getItem('startNotesData');
        if (oldStoredNotes) {
            console.log("Đang chuyển đổi dữ liệu ghi chú cũ...");
            try {
                notes = JSON.parse(oldStoredNotes).map(note => ({
                    id: note.id, title: note.title || '', text: note.text || '', tags: note.tags || [], pinned: note.pinned || false, lastModified: note.lastModified || note.id, archived: note.archived || false, color: note.color || null, deleted: note.deleted || false, deletedTimestamp: note.deletedTimestamp || null, notebookId: null
                 }));
                 saveNotes();
                 localStorage.removeItem('startNotesData');
                 console.log("Chuyển đổi dữ liệu cũ thành công.");
            } catch(e) {
                console.error("Lỗi chuyển đổi dữ liệu ghi chú cũ:", e);
                notes = [];
            }
        } else {
            notes = [];
        }
    }
};


const addNote = () => {
    const noteTitle = newNoteTitle.value.trim();
    const noteText = newNoteText.value;
    const tagString = newNoteTags.value;

    if (noteText.trim() || noteTitle) {
        const tags = parseTags(tagString);
        const now = Date.now();
        const assignedNotebookId = (currentNotebookId !== 'all' && !isViewingArchived && !isViewingTrash)
                                    ? parseInt(currentNotebookId)
                                    : null;

        const newNote = {
            id: now, title: noteTitle, text: noteText, tags: tags, pinned: false, lastModified: now, archived: false, color: null, deleted: false, deletedTimestamp: null, notebookId: assignedNotebookId
        };
        notes.unshift(newNote);
        saveNotes();

        if (isViewingArchived || isViewingTrash) {
            isViewingArchived = false;
            isViewingTrash = false;
            searchInput.value = '';
        }
        renderNotebookTabs();
        displayNotes(searchInput.value);
        hideAddPanel();
    }
    else { alert("Vui lòng nhập Tiêu đề hoặc Nội dung cho ghi chú!"); newNoteText.focus(); }
};

// =====================================================================
//  Template Data Management
// =====================================================================
const saveTemplates = () => { try { localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates)); } catch (e) { console.error("Lỗi lưu mẫu vào localStorage:", e); alert("Đã xảy ra lỗi khi cố gắng lưu các mẫu ghi chú."); } };
const loadTemplates = () => { const storedTemplates = localStorage.getItem(TEMPLATES_STORAGE_KEY); if (storedTemplates) { try { templates = JSON.parse(storedTemplates).map(t => ({ id: t.id || Date.now(), name: t.name || `Mẫu ${t.id || Date.now()}`, title: t.title || '', text: t.text || '', tags: Array.isArray(t.tags) ? t.tags.map(String).filter(tag => tag.trim() !== '') : [], })); } catch (e) { console.error("Lỗi đọc dữ liệu mẫu từ localStorage:", e); alert("Lỗi khi đọc dữ liệu Mẫu đã lưu. Dữ liệu có thể bị lỗi."); templates = []; } } else { templates = []; } };
const addOrUpdateTemplate = () => { const name = templateEditName.value.trim(); const title = templateEditTitleInput.value.trim(); const text = templateEditText.value; const tags = parseTags(templateEditTags.value); const id = templateEditId.value ? parseInt(templateEditId.value) : null; if (!name) { alert("Vui lòng nhập Tên Mẫu!"); templateEditName.focus(); return; } if (id) { const index = templates.findIndex(t => t.id === id); if (index !== -1) { templates[index] = { ...templates[index], name, title, text, tags }; } else { console.error("Không tìm thấy mẫu để cập nhật với ID:", id); alert("Lỗi: Không tìm thấy mẫu để cập nhật."); return; } } else { const newTemplate = { id: Date.now(), name, title, text, tags }; templates.push(newTemplate); } saveTemplates(); renderTemplateList(); populateTemplateDropdown(); hideTemplateEditPanel(); };
const deleteTemplate = (id) => { const index = templates.findIndex(t => t.id === id); if (index !== -1) { const templateName = templates[index].name; if (confirm(`Bạn chắc chắn muốn xóa mẫu "${escapeHTML(templateName)}"?`)) { templates.splice(index, 1); saveTemplates(); renderTemplateList(); populateTemplateDropdown(); if (!templateEditPanel.classList.contains('hidden') && parseInt(templateEditId.value) === id) { hideTemplateEditPanel(); } } } else { console.error("Không tìm thấy mẫu để xóa với ID:", id); alert("Lỗi: Không tìm thấy mẫu để xóa."); } };


// =====================================================================
//  Helper Functions & Event Handlers
// =====================================================================
const hideTagSuggestions = () => { const suggestionBox = document.getElementById(SUGGESTION_BOX_ID); if (suggestionBox) { suggestionBox.remove(); } if(activeTagInputElement) { activeTagInputElement.removeAttribute('aria-activedescendant'); activeTagInputElement.removeAttribute('aria-controls'); } activeTagInputElement = null; document.removeEventListener('mousedown', handleClickOutsideSuggestions); };
const handleClickOutsideSuggestions = (event) => { const suggestionBox = document.getElementById(SUGGESTION_BOX_ID); if (suggestionBox && !suggestionBox.contains(event.target) && activeTagInputElement && !activeTagInputElement.contains(event.target)) { hideTagSuggestions(); } };
const handleNotePin = (noteId, noteIndex) => { if (notes[noteIndex]) { notes[noteIndex].pinned = !notes[noteIndex].pinned; notes[noteIndex].lastModified = Date.now(); saveNotes(); displayNotes(searchInput.value); } };
const handleNoteDelete = (noteId, noteIndex) => { if (notes[noteIndex]) { if (confirm('Bạn chắc chắn muốn chuyển ghi chú này vào thùng rác?')) { notes[noteIndex].deleted = true; notes[noteIndex].deletedTimestamp = Date.now(); notes[noteIndex].pinned = false; notes[noteIndex].archived = false; saveNotes(); displayNotes(searchInput.value); } } };
const handleNoteRestore = (noteId, noteIndex) => { if (notes[noteIndex]) { notes[noteIndex].deleted = false; notes[noteIndex].deletedTimestamp = null; notes[noteIndex].lastModified = Date.now(); saveNotes(); displayNotes(searchInput.value); } };
const handleNoteDeletePermanent = (noteId, noteIndex) => { if (notes[noteIndex]) { const noteTitle = notes[noteIndex].title || 'Ghi chú không tiêu đề'; if (confirm(`Bạn chắc chắn muốn xóa vĩnh viễn "${escapeHTML(noteTitle)}"? Hành động này không thể hoàn tác.`)) { notes.splice(noteIndex, 1); saveNotes(); displayNotes(searchInput.value); } } };
const handleEmptyTrash = () => { const trashNotesCount = notes.filter(note => note.deleted).length; if (trashNotesCount === 0) { alert("Thùng rác đang trống."); return; } if (confirm(`Bạn chắc chắn muốn xóa vĩnh viễn ${trashNotesCount} ghi chú trong thùng rác? Hành động này không thể hoàn tác.`)) { notes = notes.filter(note => !note.deleted); saveNotes(); displayNotes(searchInput.value); } };
const handleNoteArchive = (noteId, noteIndex) => { if (notes[noteIndex]) { notes[noteIndex].archived = true; notes[noteIndex].pinned = false; notes[noteIndex].lastModified = Date.now(); saveNotes(); displayNotes(searchInput.value); } };
const handleNoteUnarchive = (noteId, noteIndex) => { if (notes[noteIndex]) { notes[noteIndex].archived = false; notes[noteIndex].lastModified = Date.now(); saveNotes(); displayNotes(searchInput.value); } };
const updateNoteData = (noteIndex, newData) => {
    if (noteIndex < 0 || noteIndex >= notes.length) return false;
    const note = notes[noteIndex];
    if (!note) return false;
    const { title, text, tags, color /*, notebookId */ } = newData;
    let changed = false;

    const cleanTitle = title?.trim() ?? '';
    const cleanText = text ?? '';
    const cleanColor = (color === '' || color === null || color === 'null' || color === 'default') ? null : color;
    const cleanTags = Array.isArray(tags) ? tags.map(t => t.trim().toLowerCase()).filter(t => t) : [];

    if (note.title !== cleanTitle) { note.title = cleanTitle; changed = true; }
    if (note.text !== cleanText) { note.text = cleanText; changed = true; }
    if (note.color !== cleanColor) { note.color = cleanColor; changed = true; }

    const currentTags = note.tags || [];
    const tagsChanged = !(currentTags.length === cleanTags.length && currentTags.slice().sort().every((value, index) => value === cleanTags.slice().sort()[index]));
    if (tagsChanged) { note.tags = cleanTags; changed = true; }

    if (changed) {
        note.lastModified = Date.now();
        saveNotes();
        return true;
    }
    return false;
};
const debouncedAutoSave = debounce((noteElement, noteIndex) => { const editTitleInputCheck = noteElement.querySelector('input.edit-title-input'); const editInputCheck = noteElement.querySelector('textarea.edit-input'); const editTagsInputCheck = noteElement.querySelector('input.edit-tags-input'); if (!editTitleInputCheck || !editInputCheck || !editTagsInputCheck || !noteElement.isConnected) { return; } const newTitle = editTitleInputCheck.value; const newText = editInputCheck.value; const newTagString = editTagsInputCheck.value; const newTags = parseTags(newTagString); const selectedColorValue = noteElement.dataset.selectedColor ?? notes[noteIndex]?.color; const newColor = selectedColorValue; const wasPreviouslyEmpty = !notes[noteIndex]?.title?.trim() && !notes[noteIndex]?.text?.trim(); const isNowEmpty = !newTitle.trim() && !newText.trim(); if (!wasPreviouslyEmpty && isNowEmpty) { return; } const saved = updateNoteData(noteIndex, { title: newTitle, text: newText, tags: newTags, color: newColor }); if (saved) { noteElement.classList.add('note-autosaved'); setTimeout(() => { noteElement?.classList.remove('note-autosaved'); }, 600); } }, DEBOUNCE_DELAY);
const handleNoteEdit = (noteElement, noteId, noteIndex) => { if (isViewingArchived || isViewingTrash) return; const currentlyEditing = notesContainer.querySelector('.note .edit-input'); if (currentlyEditing && currentlyEditing.closest('.note') !== noteElement) { alert("Vui lòng Lưu hoặc Hủy thay đổi ở ghi chú đang sửa trước khi sửa ghi chú khác."); currentlyEditing.closest('.note').querySelector('textarea.edit-input')?.focus(); return; } hideTagSuggestions(); if (sortableInstance) sortableInstance.option('disabled', true); showAddPanelBtn.classList.add('hidden'); const noteData = notes[noteIndex]; if (!noteData) return; const actionsElementOriginal = noteElement.querySelector('.note-actions'); let originalActionsHTML = ''; if (actionsElementOriginal) { originalActionsHTML = Array.from(actionsElementOriginal.children).filter(btn => !btn.classList.contains('save-edit-btn')).map(btn => btn.outerHTML).join(''); } const editTitleInput = document.createElement('input'); editTitleInput.type = 'text'; editTitleInput.classList.add('edit-title-input'); editTitleInput.placeholder = 'Tiêu đề...'; editTitleInput.value = noteData.title || ''; const editInput = document.createElement('textarea'); editInput.classList.add('edit-input'); editInput.value = noteData.text; editInput.rows = 5; const editTagsInput = document.createElement('input'); editTagsInput.type = 'text'; editTagsInput.classList.add('edit-tags-input'); editTagsInput.placeholder = 'Tags (cách nhau bằng dấu phẩy)...'; editTagsInput.value = (noteData.tags || []).join(', '); editTagsInput.autocomplete = 'off'; const colorSelectorContainer = document.createElement('div'); colorSelectorContainer.classList.add('color-selector-container'); colorSelectorContainer.setAttribute('role', 'radiogroup'); colorSelectorContainer.setAttribute('aria-label', 'Chọn màu ghi chú'); noteElement.dataset.selectedColor = noteData.color || ''; NOTE_COLORS.forEach(color => { const swatchBtn = document.createElement('button'); swatchBtn.type = 'button'; swatchBtn.classList.add('color-swatch-btn'); swatchBtn.dataset.colorValue = color.value || ''; swatchBtn.title = color.name; swatchBtn.setAttribute('role', 'radio'); const isCurrentColor = (noteData.color === color.value) || (!noteData.color && !color.value); swatchBtn.setAttribute('aria-checked', isCurrentColor ? 'true' : 'false'); if (isCurrentColor) swatchBtn.classList.add('selected'); if (color.value) { swatchBtn.style.backgroundColor = color.hex; } else { swatchBtn.classList.add('default-color-swatch'); swatchBtn.innerHTML = '&#x2715;'; swatchBtn.setAttribute('aria-label', 'Màu mặc định'); } swatchBtn.addEventListener('click', () => { const selectedValue = swatchBtn.dataset.colorValue; noteElement.dataset.selectedColor = selectedValue; colorSelectorContainer.querySelectorAll('.color-swatch-btn').forEach(btn => { const isSelected = btn === swatchBtn; btn.classList.toggle('selected', isSelected); btn.setAttribute('aria-checked', isSelected ? 'true' : 'false'); }); applyNoteColor(noteElement, { ...noteData, color: selectedValue }); debouncedAutoSave(noteElement, noteIndex); }); colorSelectorContainer.appendChild(swatchBtn); }); const saveBtn = document.createElement('button'); saveBtn.classList.add('save-edit-btn', 'modal-button', 'primary'); saveBtn.textContent = 'Lưu'; saveBtn.title = 'Lưu thay đổi (Ctrl+S)'; const bookmarkIcon = noteElement.querySelector('.pinned-bookmark-icon'); noteElement.innerHTML = ''; if (bookmarkIcon) { noteElement.appendChild(bookmarkIcon); bookmarkIcon.style.display = 'inline-block'; } noteElement.appendChild(editTitleInput); noteElement.appendChild(editInput); noteElement.appendChild(editTagsInput); noteElement.appendChild(colorSelectorContainer); const editActionsContainer = document.createElement('div'); editActionsContainer.classList.add('note-actions'); editActionsContainer.innerHTML = originalActionsHTML; editActionsContainer.appendChild(saveBtn); noteElement.appendChild(editActionsContainer); const triggerAutoSave = () => debouncedAutoSave(noteElement, noteIndex); editTitleInput.addEventListener('input', triggerAutoSave); editInput.addEventListener('input', triggerAutoSave); editTagsInput.addEventListener('input', (event) => { handleTagInput(event); triggerAutoSave(); }); editTagsInput.addEventListener('blur', handleTagInputBlur, true); editTagsInput.addEventListener('keydown', handleTagInputKeydown); editTitleInput.focus(); editTitleInput.setSelectionRange(editTitleInput.value.length, editTitleInput.value.length); };
const handleNoteSaveEdit = (noteElement, noteId, noteIndex) => { const editTitleInput = noteElement.querySelector('input.edit-title-input'); const editInput = noteElement.querySelector('textarea.edit-input'); const editTagsInput = noteElement.querySelector('input.edit-tags-input'); if (!editTitleInput || !editInput || !editTagsInput) { console.error("Lỗi lưu: Không tìm thấy các thành phần sửa ghi chú."); displayNotes(searchInput.value); return; } const newTitle = editTitleInput.value; const newText = editInput.value; const newTagString = editTagsInput.value; const newTags = parseTags(newTagString); const selectedColorValue = noteElement.dataset.selectedColor ?? notes[noteIndex]?.color; const newColor = selectedColorValue; const wasInitiallyEmpty = !notes[noteIndex]?.title?.trim() && !notes[noteIndex]?.text?.trim(); const isNowEmpty = !newTitle.trim() && !newText.trim(); if (!wasInitiallyEmpty && isNowEmpty) { if (!confirm("Ghi chú gần như trống. Bạn vẫn muốn lưu?")) { return; } } updateNoteData(noteIndex, { title: newTitle, text: newText, tags: newTags, color: newColor }); const updatedNoteData = notes[noteIndex]; const bookmarkIcon = noteElement.querySelector('.pinned-bookmark-icon'); noteElement.innerHTML = ''; if (bookmarkIcon) noteElement.appendChild(bookmarkIcon); applyNoteColor(noteElement, updatedNoteData); applyPinnedStatus(noteElement, updatedNoteData, isViewingArchived, isViewingTrash); const titleEl = createNoteTitleElement(updatedNoteData, searchInput.value); if(titleEl) noteElement.appendChild(titleEl); const contentEl = createNoteContentElement(updatedNoteData, searchInput.value, noteElement); if(contentEl) noteElement.appendChild(contentEl); const tagsEl = createNoteTagsElement(updatedNoteData); if(tagsEl) noteElement.appendChild(tagsEl); const timestampEl = createNoteTimestampElement(updatedNoteData); if(timestampEl) noteElement.appendChild(timestampEl); const actionsEl = createNoteActionsElement(updatedNoteData); if(actionsEl) noteElement.appendChild(actionsEl); delete noteElement.dataset.selectedColor; hideTagSuggestions(); if (sortableInstance) sortableInstance.option('disabled', false); if (addNotePanel.classList.contains('hidden')) showAddPanelBtn.classList.remove('hidden'); noteElement.classList.add('note-saved-flash'); setTimeout(() => { noteElement?.classList.remove('note-saved-flash'); }, 600); };
const showFullNoteModal = (title, noteText) => { const existingModal = document.querySelector('.note-modal'); if (existingModal) { existingModal.remove(); } const modal = document.createElement('div'); modal.classList.add('note-modal', 'modal', 'hidden'); modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'note-modal-title'); const modalContent = document.createElement('div'); modalContent.classList.add('modal-content'); const modalHeader = document.createElement('div'); modalHeader.classList.add('modal-header'); const modalTitle = document.createElement('h2'); modalTitle.id = 'note-modal-title'; modalTitle.textContent = title || 'Ghi chú'; const closeModalBtn = document.createElement('button'); closeModalBtn.classList.add('close-modal-btn'); closeModalBtn.innerHTML = '&times;'; closeModalBtn.title = 'Đóng (Esc)'; closeModalBtn.setAttribute('aria-label', 'Đóng cửa sổ xem ghi chú'); modalHeader.appendChild(modalTitle); modalHeader.appendChild(closeModalBtn); const modalBody = document.createElement('div'); modalBody.classList.add('modal-body'); modalBody.textContent = noteText || ''; modalContent.appendChild(modalHeader); modalContent.appendChild(modalBody); modal.appendChild(modalContent); document.body.appendChild(modal); requestAnimationFrame(() => { modal.classList.add('visible'); modal.classList.remove('hidden'); }); closeModalBtn.focus(); const closeFunc = () => { modal.classList.remove('visible'); modal.addEventListener('transitionend', () => { modal.remove(); document.removeEventListener('keydown', handleThisModalKeyDown); }, { once: true }); }; const handleThisModalKeyDown = (event) => { if (!modal.classList.contains('visible')) { document.removeEventListener('keydown', handleThisModalKeyDown); return; } if (event.key === 'Escape') { closeFunc(); } if (event.key === 'Tab') { const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'); if (focusableElements.length === 0) return; const firstElement = focusableElements[0]; const lastElement = focusableElements[focusableElements.length - 1]; if (event.shiftKey) { if (document.activeElement === firstElement) { lastElement.focus(); event.preventDefault(); } } else { if (document.activeElement === lastElement) { firstElement.focus(); event.preventDefault(); } } } }; closeModalBtn.addEventListener('click', closeFunc); modal.addEventListener('click', (event) => { if (event.target === modal) closeFunc(); }); document.addEventListener('keydown', handleThisModalKeyDown); };


// =====================================================================
//  Note Element Rendering Helper Functions
// =====================================================================
function applyNoteColor(noteElement, note) { NOTE_COLORS.forEach(color => { if (color.value) noteElement.classList.remove(color.value); }); const noteColor = note?.color; if (noteColor && NOTE_COLORS.some(c => c.value === noteColor)) { noteElement.classList.add(noteColor); } const colorData = NOTE_COLORS.find(c => c.value === noteColor); noteElement.style.borderLeftColor = colorData?.hex && colorData.value ? colorData.hex : 'transparent'; noteElement.style.borderColor = ''; }
function applyPinnedStatus(noteElement, note, isViewingArchived, isViewingTrash) { const isPinned = note?.pinned ?? false; const shouldShowPin = isPinned && !isViewingArchived && !isViewingTrash && currentNotebookId === 'all'; const existingBookmark = noteElement.querySelector('.pinned-bookmark-icon'); noteElement.classList.toggle('pinned-note', shouldShowPin); if (shouldShowPin) { if (!existingBookmark) { const bookmarkIcon = document.createElement('span'); bookmarkIcon.classList.add('pinned-bookmark-icon'); bookmarkIcon.innerHTML = '&#128278;'; bookmarkIcon.setAttribute('aria-hidden', 'true'); noteElement.insertBefore(bookmarkIcon, noteElement.firstChild); } else { existingBookmark.style.display = 'inline-block'; } } else { if (existingBookmark) { existingBookmark.style.display = 'none'; } } }
function createNoteTitleElement(note, filter) { const title = note?.title?.trim(); if (!title) return null; const titleElement = document.createElement('h3'); titleElement.classList.add('note-title'); let titleHTML = escapeHTML(title); const lowerCaseFilter = (filter || '').toLowerCase().trim(); const isTagSearch = lowerCaseFilter.startsWith('#'); if (!isTagSearch && lowerCaseFilter) { try { const highlightRegex = new RegExp(`(${escapeRegExp(lowerCaseFilter)})`, 'gi'); titleHTML = titleHTML.replace(highlightRegex, '<mark>$1</mark>'); } catch(e) { console.warn("Lỗi highlight tiêu đề:", e); } } titleElement.innerHTML = titleHTML; return titleElement; }
function createNoteContentElement(note, filter, noteElementForOverflowCheck) { const textContent = note?.text ?? ''; const contentElement = document.createElement('div'); contentElement.classList.add('note-content'); let displayHTML = escapeHTML(textContent); const lowerCaseFilter = (filter || '').toLowerCase().trim(); const isTagSearchContent = lowerCaseFilter.startsWith('#'); if (!isTagSearchContent && lowerCaseFilter) { try { const highlightRegexContent = new RegExp(`(${escapeRegExp(lowerCaseFilter)})`, 'gi'); displayHTML = displayHTML.replace(highlightRegexContent, '<mark>$1</mark>'); } catch (e) { console.warn("Lỗi highlight nội dung:", e); } } displayHTML = displayHTML.replace(/\n/g, '<br>'); contentElement.innerHTML = displayHTML; requestAnimationFrame(() => { if (!noteElementForOverflowCheck || !noteElementForOverflowCheck.isConnected) return; const currentContentEl = noteElementForOverflowCheck.querySelector('.note-content'); if (!currentContentEl) return; const existingBtn = noteElementForOverflowCheck.querySelector('.read-more-btn'); if (existingBtn) existingBtn.remove(); const hasOverflow = currentContentEl.scrollHeight > currentContentEl.clientHeight + 2; currentContentEl.classList.toggle('has-overflow', hasOverflow); if (hasOverflow) { const readMoreBtn = document.createElement('button'); readMoreBtn.textContent = 'Xem thêm'; readMoreBtn.classList.add('read-more-btn'); readMoreBtn.type = 'button'; readMoreBtn.title = 'Xem toàn bộ nội dung ghi chú'; readMoreBtn.addEventListener('click', (e) => { e.stopPropagation(); showFullNoteModal(note.title, note.text); }); noteElementForOverflowCheck.insertBefore(readMoreBtn, currentContentEl.nextSibling); } }); return contentElement; }
function createNoteTagsElement(note) { const tags = note?.tags; if (!tags || tags.length === 0) return null; const tagsElement = document.createElement('div'); tagsElement.classList.add('note-tags'); tags.forEach(tag => { const tagBadge = document.createElement('button'); tagBadge.classList.add('tag-badge'); tagBadge.textContent = `#${tag}`; tagBadge.dataset.tag = tag; tagBadge.type = 'button'; tagBadge.title = `Lọc theo tag: ${tag}`; tagsElement.appendChild(tagBadge); }); return tagsElement; }
function createNoteTimestampElement(note) { const timestampElement = document.createElement('small'); timestampElement.classList.add('note-timestamp'); const creationDate = formatTimestamp(note.id); let timestampText = `Tạo: ${creationDate}`; if (note.lastModified && note.lastModified > note.id + 60000) { const modifiedDate = formatTimestamp(note.lastModified); timestampText += ` (Sửa: ${modifiedDate})`; } if (isViewingTrash && note.deletedTimestamp) { const deletedDate = formatTimestamp(note.deletedTimestamp); timestampText += ` (Xóa: ${deletedDate})`; } timestampElement.textContent = timestampText; return timestampElement; }
function createMainViewNoteActions(note) { const fragment = document.createDocumentFragment(); const pinBtn = document.createElement('button'); pinBtn.classList.add('pin-btn'); pinBtn.innerHTML = '&#128204;'; pinBtn.title = note.pinned ? "Bỏ ghim" : "Ghim ghi chú"; pinBtn.setAttribute('aria-label', note.pinned ? "Bỏ ghim ghi chú" : "Ghim ghi chú"); pinBtn.setAttribute('aria-pressed', note.pinned ? 'true' : 'false'); if (note.pinned) pinBtn.classList.add('pinned'); if(currentNotebookId !== 'all') pinBtn.style.display = 'none'; fragment.appendChild(pinBtn); const editBtn = document.createElement('button'); editBtn.classList.add('edit-btn'); editBtn.textContent = 'Sửa'; editBtn.title = 'Sửa ghi chú'; editBtn.setAttribute('aria-label', 'Sửa ghi chú'); fragment.appendChild(editBtn); const archiveBtn = document.createElement('button'); archiveBtn.classList.add('archive-btn'); archiveBtn.innerHTML = '&#128451;'; archiveBtn.title = 'Lưu trữ ghi chú'; archiveBtn.setAttribute('aria-label', 'Lưu trữ ghi chú'); fragment.appendChild(archiveBtn); const deleteBtn = document.createElement('button'); deleteBtn.classList.add('delete-btn'); deleteBtn.textContent = 'Xóa'; deleteBtn.title = 'Chuyển vào thùng rác'; deleteBtn.setAttribute('aria-label', 'Chuyển vào thùng rác'); fragment.appendChild(deleteBtn); return fragment; }
function createArchiveViewNoteActions(note) { const fragment = document.createDocumentFragment(); const unarchiveBtn = document.createElement('button'); unarchiveBtn.classList.add('unarchive-btn'); unarchiveBtn.innerHTML = '&#x1F5C4;&#xFE0F;'; unarchiveBtn.title = 'Khôi phục từ Lưu trữ'; unarchiveBtn.setAttribute('aria-label', 'Khôi phục từ Lưu trữ'); fragment.appendChild(unarchiveBtn); const deleteBtn = document.createElement('button'); deleteBtn.classList.add('delete-btn'); deleteBtn.textContent = 'Xóa'; deleteBtn.title = 'Chuyển vào thùng rác'; deleteBtn.setAttribute('aria-label', 'Chuyển vào thùng rác'); fragment.appendChild(deleteBtn); return fragment; }
function createTrashViewNoteActions(note) { const fragment = document.createDocumentFragment(); const restoreBtn = document.createElement('button'); restoreBtn.classList.add('restore-btn'); restoreBtn.innerHTML = '&#x21A9;&#xFE0F;'; restoreBtn.title = 'Khôi phục ghi chú'; restoreBtn.setAttribute('aria-label', 'Khôi phục ghi chú'); fragment.appendChild(restoreBtn); const deletePermanentBtn = document.createElement('button'); deletePermanentBtn.classList.add('delete-permanent-btn'); deletePermanentBtn.textContent = 'Xóa VV'; deletePermanentBtn.title = 'Xóa ghi chú vĩnh viễn'; deletePermanentBtn.setAttribute('aria-label', 'Xóa ghi chú vĩnh viễn'); fragment.appendChild(deletePermanentBtn); return fragment; }
function createNoteActionsElement(note) { const actionsElement = document.createElement('div'); actionsElement.classList.add('note-actions'); let actionButtonsFragment; if (isViewingTrash) { actionButtonsFragment = createTrashViewNoteActions(note); } else if (isViewingArchived) { actionButtonsFragment = createArchiveViewNoteActions(note); } else { actionButtonsFragment = createMainViewNoteActions(note); } actionsElement.appendChild(actionButtonsFragment); return actionsElement; }


// =====================================================================
//  Core Note Rendering Function
// =====================================================================
const renderNoteElement = (note) => {
    const noteElement = document.createElement('div');
    noteElement.classList.add('note');
    noteElement.dataset.id = note.id;

    applyNoteColor(noteElement, note);
    applyPinnedStatus(noteElement, note, isViewingArchived, isViewingTrash);

    const titleEl = createNoteTitleElement(note, searchInput.value);
    if(titleEl) noteElement.appendChild(titleEl);

    const contentEl = createNoteContentElement(note, searchInput.value, noteElement);
    if(contentEl) noteElement.appendChild(contentEl);

    const tagsEl = createNoteTagsElement(note);
    if(tagsEl) noteElement.appendChild(tagsEl);

    const timestampEl = createNoteTimestampElement(note);
    if(timestampEl) noteElement.appendChild(timestampEl);

    const actionsEl = createNoteActionsElement(note);
    if(actionsEl) noteElement.appendChild(actionsEl);

    return noteElement;
};

// =====================================================================
//  Drag & Drop
// =====================================================================
const handleDragEnd = (evt) => {
    if (isViewingArchived || isViewingTrash) return;

    const newOrderIds = Array.from(notesContainer.children)
        .map(el => el.classList.contains('note') ? parseInt(el.dataset.id) : null)
        .filter(id => id !== null);

    const currentViewNotes = notes.filter(note =>
        !note.deleted && !note.archived &&
        (currentNotebookId === 'all' || note.notebookId === parseInt(currentNotebookId))
    );

    const currentViewNoteMap = new Map(currentViewNotes.map(note => [note.id, note]));

    const reorderedCurrentViewNotes = newOrderIds
        .map(id => currentViewNoteMap.get(id))
        .filter(Boolean);

    const otherNotes = notes.filter(note =>
        note.deleted || note.archived ||
        (currentNotebookId !== 'all' && note.notebookId !== parseInt(currentNotebookId))
    );

    notes = [...reorderedCurrentViewNotes, ...otherNotes];
    saveNotes();
};

const initSortable = () => {
    if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
    }
    const canInitSortable = typeof Sortable === 'function' &&
                            notesContainer &&
                            notesContainer.children.length > 0 &&
                            !notesContainer.querySelector('.empty-state') &&
                            !isViewingArchived && !isViewingTrash;

    if (canInitSortable) {
        sortableInstance = new Sortable(notesContainer, {
            animation: 150, handle: '.note', filter: 'input, textarea, button, .tag-badge, .note-content a, .read-more-btn, .color-swatch-btn', preventOnFilter: true, ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen', dragClass: 'sortable-drag', onEnd: handleDragEnd, delay: 50, delayOnTouchOnly: true
        });
    } else if (typeof Sortable !== 'function' && !isViewingArchived && !isViewingTrash && notes.some(n => !n.archived && !n.deleted)) {
        console.warn("Thư viện Sortable.js chưa được tải.");
    }
};


// =====================================================================
//  Tag Handling
// =====================================================================
const getAllUniqueTags = () => { const allTags = notes.reduce((acc, note) => { if (!note.deleted && !note.archived && note.tags && note.tags.length > 0) { const validTags = note.tags.map(t => t.trim()).filter(t => t); acc.push(...validTags); } return acc; }, []); return [...new Set(allTags)].sort((a, b) => a.localeCompare(b)); };
const showTagSuggestions = (inputElement, currentTagFragment, suggestions) => { hideTagSuggestions(); if (suggestions.length === 0 || !currentTagFragment) return; activeTagInputElement = inputElement; const suggestionBox = document.createElement('div'); suggestionBox.id = SUGGESTION_BOX_ID; suggestionBox.classList.add('tag-suggestions'); suggestionBox.setAttribute('role', 'listbox'); inputElement.setAttribute('aria-controls', SUGGESTION_BOX_ID); suggestions.forEach((tag, index) => { const item = document.createElement('div'); item.classList.add('suggestion-item'); item.textContent = tag; item.setAttribute('role', 'option'); item.id = `suggestion-${index}`; item.tabIndex = -1; item.addEventListener('mousedown', (e) => { e.preventDefault(); const currentValue = inputElement.value; const lastCommaIndex = currentValue.lastIndexOf(','); let baseValue = ''; if (lastCommaIndex !== -1) { baseValue = currentValue.substring(0, lastCommaIndex + 1).trimStart() + (currentValue[lastCommaIndex+1] === ' ' ? '' : ' '); } inputElement.value = baseValue + tag + ', '; hideTagSuggestions(); inputElement.focus(); inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length); inputElement.dispatchEvent(new Event('input', { bubbles: true })); }); suggestionBox.appendChild(item); }); const inputRect = inputElement.getBoundingClientRect(); document.body.appendChild(suggestionBox); suggestionBox.style.position = 'absolute'; suggestionBox.style.top = `${inputRect.bottom + window.scrollY}px`; suggestionBox.style.left = `${inputRect.left + window.scrollX}px`; suggestionBox.style.minWidth = `${inputRect.width}px`; suggestionBox.style.width = 'auto'; setTimeout(() => { document.addEventListener('mousedown', handleClickOutsideSuggestions); }, 0); };
const handleTagInput = (event) => { const inputElement = event.target; const value = inputElement.value; const cursorPosition = inputElement.selectionStart; const lastCommaIndexBeforeCursor = value.substring(0, cursorPosition).lastIndexOf(','); const currentTagFragment = value.substring(lastCommaIndexBeforeCursor + 1, cursorPosition).trim().toLowerCase(); if (currentTagFragment.length >= 1) { const allTags = getAllUniqueTags(); const precedingTagsString = value.substring(0, lastCommaIndexBeforeCursor + 1); const currentEnteredTags = parseTags(precedingTagsString); const filteredSuggestions = allTags.filter(tag => tag.toLowerCase().startsWith(currentTagFragment) && !currentEnteredTags.includes(tag) ); showTagSuggestions(inputElement, currentTagFragment, filteredSuggestions); } else { hideTagSuggestions(); } };
const handleTagInputBlur = (event) => { setTimeout(() => { const suggestionBox = document.getElementById(SUGGESTION_BOX_ID); if (event.relatedTarget && suggestionBox && suggestionBox.contains(event.relatedTarget)) { return; } hideTagSuggestions(); }, 150); };
const handleTagInputKeydown = (event) => { const suggestionBox = document.getElementById(SUGGESTION_BOX_ID); const inputElement = event.target; if (suggestionBox && suggestionBox.children.length > 0) { const items = Array.from(suggestionBox.children); let currentFocusIndex = items.findIndex(item => item === document.activeElement); switch (event.key) { case 'ArrowDown': event.preventDefault(); currentFocusIndex = (currentFocusIndex + 1) % items.length; items[currentFocusIndex].focus(); inputElement.setAttribute('aria-activedescendant', items[currentFocusIndex].id); break; case 'ArrowUp': event.preventDefault(); currentFocusIndex = (currentFocusIndex - 1 + items.length) % items.length; items[currentFocusIndex].focus(); inputElement.setAttribute('aria-activedescendant', items[currentFocusIndex].id); break; case 'Enter': if (document.activeElement?.classList.contains('suggestion-item')) { event.preventDefault(); document.activeElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); } else { hideTagSuggestions(); } break; case 'Escape': event.preventDefault(); hideTagSuggestions(); break; case 'Tab': if (document.activeElement?.classList.contains('suggestion-item')) { event.preventDefault(); document.activeElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); } else { hideTagSuggestions(); } break; } } };


// =====================================================================
//  Template UI Handlers
// =====================================================================
const renderTemplateList = () => { templateListContainer.innerHTML = ''; if (templates.length === 0) { templateListContainer.innerHTML = `<p class="empty-state">Chưa có mẫu nào.</p>`; return; } templates.sort((a, b) => a.name.localeCompare(b.name)).forEach(template => { const item = document.createElement('div'); item.classList.add('template-list-item'); item.innerHTML = `<span>${escapeHTML(template.name)}</span><div class="template-item-actions"><button class="edit-template-btn modal-button secondary small-button" data-id="${template.id}" title="Sửa mẫu ${escapeHTML(template.name)}">Sửa</button><button class="delete-template-btn modal-button danger small-button" data-id="${template.id}" title="Xóa mẫu ${escapeHTML(template.name)}">Xóa</button></div>`; item.querySelector('.edit-template-btn').addEventListener('click', () => showTemplateEditPanel(template.id)); item.querySelector('.delete-template-btn').addEventListener('click', () => deleteTemplate(template.id)); templateListContainer.appendChild(item); }); };
const showTemplateEditPanel = (templateId = null) => { templateListSection.classList.add('hidden'); templateEditPanel.classList.remove('hidden'); if (templateId !== null) { const template = templates.find(t => t.id === templateId); if (template) { templateEditTitle.textContent = "Sửa Mẫu"; templateEditId.value = template.id; templateEditName.value = template.name; templateEditTitleInput.value = template.title; templateEditText.value = template.text; templateEditTags.value = (template.tags || []).join(', '); } else { console.error("Không tìm thấy mẫu để sửa ID:", templateId); hideTemplateEditPanel(); return; } } else { templateEditTitle.textContent = "Tạo Mẫu Mới"; templateEditId.value = ''; templateEditName.value = ''; templateEditTitleInput.value = ''; templateEditText.value = ''; templateEditTags.value = ''; } templateEditName.focus(); };
const hideTemplateEditPanel = () => { templateEditPanel.classList.add('hidden'); templateListSection.classList.remove('hidden'); templateEditId.value = ''; templateEditName.value = ''; templateEditTitleInput.value = ''; templateEditText.value = ''; templateEditTags.value = ''; };
const showTemplateModal = () => { renderTemplateList(); hideTemplateEditPanel(); templateModal.classList.add('visible'); templateModal.classList.remove('hidden'); showAddTemplatePanelBtn.focus(); };
const hideTemplateModal = () => { templateModal.classList.remove('visible'); templateModal.addEventListener('transitionend', (e) => { if (e.target === templateModal) templateModal.classList.add('hidden'); }, { once: true }); };
const populateTemplateDropdown = () => { const currentSelection = templateSelect.value; templateSelect.innerHTML = '<option value="">-- Không dùng mẫu --</option>'; templates.sort((a, b) => a.name.localeCompare(b.name)).forEach(template => { const option = document.createElement('option'); option.value = template.id; option.textContent = escapeHTML(template.name); templateSelect.appendChild(option); }); if (templates.some(t => t.id === parseInt(currentSelection))) templateSelect.value = currentSelection; else templateSelect.value = ""; };
const applyTemplate = () => { const selectedId = templateSelect.value ? parseInt(templateSelect.value) : null; if (selectedId) { const template = templates.find(t => t.id === selectedId); if (template) { newNoteTitle.value = template.title; newNoteText.value = template.text; newNoteTags.value = (template.tags || []).join(', '); newNoteText.focus(); } } };


// =====================================================================
//  Notebook UI Handlers
// =====================================================================
const renderNotebookList = () => {
    notebookListContainer.innerHTML = '';
    if (notebooks.length === 0) {
        notebookListContainer.innerHTML = `<p class="empty-state">Chưa có sổ tay nào.</p>`;
        return;
    }
    notebooks.sort((a, b) => a.name.localeCompare(b.name)).forEach(notebook => {
        const item = document.createElement('div');
        item.classList.add('notebook-list-item');
        item.innerHTML = `
            <span>${escapeHTML(notebook.name)}</span>
            <div class="notebook-item-actions">
                <button class="edit-notebook-btn modal-button secondary small-button" data-id="${notebook.id}" title="Sửa sổ tay ${escapeHTML(notebook.name)}">Sửa</button>
                <button class="delete-notebook-btn modal-button danger small-button" data-id="${notebook.id}" title="Xóa sổ tay ${escapeHTML(notebook.name)}">Xóa</button>
            </div>
        `;
        item.querySelector('.edit-notebook-btn').addEventListener('click', () => showNotebookEditPanel(notebook.id));
        item.querySelector('.delete-notebook-btn').addEventListener('click', () => deleteNotebook(notebook.id));
        notebookListContainer.appendChild(item);
    });
};

const showNotebookEditPanel = (notebookId = null) => {
    notebookListSection.classList.add('hidden');
    notebookEditPanel.classList.remove('hidden');
    if (notebookId !== null) {
        const notebook = notebooks.find(nb => nb.id === notebookId);
        if (notebook) {
            notebookEditTitle.textContent = "Sửa Sổ tay";
            notebookEditId.value = notebook.id;
            notebookEditName.value = notebook.name;
        } else {
            console.error("Không tìm thấy sổ tay để sửa ID:", notebookId);
            hideNotebookEditPanel();
            return;
        }
    } else {
        notebookEditTitle.textContent = "Tạo Sổ tay Mới";
        notebookEditId.value = '';
        notebookEditName.value = '';
    }
    notebookEditName.focus();
};

const hideNotebookEditPanel = () => {
    notebookEditPanel.classList.add('hidden');
    notebookListSection.classList.remove('hidden');
    notebookEditId.value = '';
    notebookEditName.value = '';
};

const showNotebookModal = () => {
    renderNotebookList();
    hideNotebookEditPanel();
    notebookModal.classList.add('visible');
    notebookModal.classList.remove('hidden');
    showAddNotebookPanelBtn.focus();
};

const hideNotebookModal = () => {
    notebookModal.classList.remove('visible');
    notebookModal.addEventListener('transitionend', (e) => {
        if (e.target === notebookModal) notebookModal.classList.add('hidden');
    }, { once: true });
};

// =====================================================================
//  Notebook Tab Rendering
// =====================================================================
const renderNotebookTabs = () => {
    if (!notebookTabsContainer) return;

    const addButton = notebookTabsContainer.querySelector('#add-notebook-tab-btn');
    notebookTabsContainer.innerHTML = '';

    const allNotesTab = document.createElement('button');
    allNotesTab.classList.add('tab-button');
    allNotesTab.dataset.notebookId = 'all';
    allNotesTab.textContent = 'Tất cả Ghi chú';
    // Active state depends on currentNotebookId AND not being in archive/trash
    if (currentNotebookId === 'all' && !isViewingArchived && !isViewingTrash) {
        allNotesTab.classList.add('active');
    }
    notebookTabsContainer.appendChild(allNotesTab);

    notebooks.sort((a, b) => a.name.localeCompare(b.name)).forEach(notebook => {
        const tab = document.createElement('button');
        tab.classList.add('tab-button');
        tab.dataset.notebookId = notebook.id;
        tab.textContent = escapeHTML(notebook.name);
        // Active state depends on currentNotebookId AND not being in archive/trash
        if (currentNotebookId === notebook.id && !isViewingArchived && !isViewingTrash) {
            tab.classList.add('active');
        }
        notebookTabsContainer.appendChild(tab);
    });

    // Re-add or create the "+" button
    const finalAddButton = addButton || document.createElement('button');
    if (!addButton) { // If creating new
        finalAddButton.id = 'add-notebook-tab-btn';
        finalAddButton.classList.add('add-tab-button');
        finalAddButton.title = 'Thêm Sổ tay mới';
        finalAddButton.textContent = '+';
        finalAddButton.addEventListener('click', () => {
            showNotebookModal();
            showNotebookEditPanel();
        });
    }
    notebookTabsContainer.appendChild(finalAddButton);
};


// =====================================================================
//  Other Panel/Import/Export
// =====================================================================
const showAddPanel = () => { const currentlyEditing = notesContainer.querySelector('.note .edit-input'); if (currentlyEditing) { alert("Vui lòng Lưu hoặc Hủy thay đổi ở ghi chú đang sửa trước khi thêm ghi chú mới."); currentlyEditing.closest('.note').querySelector('textarea.edit-input')?.focus(); return; } hideTagSuggestions(); addNotePanel.classList.remove('hidden'); showAddPanelBtn.classList.add('hidden'); templateSelect.value = ""; newNoteTitle.focus(); };
const hideAddPanel = () => { hideTagSuggestions(); addNotePanel.classList.add('hidden'); if (!notesContainer.querySelector('.note .edit-input')) showAddPanelBtn.classList.remove('hidden'); newNoteTitle.value = ''; newNoteText.value = ''; newNoteTags.value = ''; templateSelect.value = ""; };

const exportNotes = () => {
    if (notes.length === 0 && templates.length === 0 && notebooks.length === 0) {
        alert("Không có ghi chú, mẫu, hoặc sổ tay nào để xuất.");
        return;
    }
    try {
        const dataToExport = {
            notes: notes.map(note => ({
                id: note.id, title: note.title || '', text: note.text || '', tags: note.tags || [], pinned: note.pinned || false, lastModified: note.lastModified || note.id, archived: note.archived || false, color: note.color || null, deleted: note.deleted || false, deletedTimestamp: note.deletedTimestamp || null, notebookId: note.notebookId || null
            })),
            templates: templates.map(template => ({
                id: template.id, name: template.name, title: template.title || '', text: template.text || '', tags: template.tags || []
            })),
            notebooks: notebooks.map(notebook => ({
                id: notebook.id, name: notebook.name
            }))
        };
        const jsonData = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
        a.download = `start-notes-backup-${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Lỗi xuất dữ liệu:", error);
        alert("Đã xảy ra lỗi khi xuất dữ liệu.");
    }
};

const importNotes = (file) => {
    if (!file) { alert("Vui lòng chọn một file JSON hợp lệ."); return; }
    if (!confirm("CẢNH BÁO:\nThao tác này sẽ THAY THẾ TOÀN BỘ ghi chú, mẫu và sổ tay hiện tại bằng nội dung từ file đã chọn.\nDữ liệu cũ sẽ bị mất.\n\nBạn chắc chắn muốn tiếp tục?")) { importFileInput.value = null; return; }
    const reader = new FileReader();
    reader.onload = (event) => {
        let importedNotesCount = 0;
        let importedTemplatesCount = 0;
        let importedNotebooksCount = 0;
        try {
            const importedData = JSON.parse(event.target.result);
            if (typeof importedData !== 'object' || importedData === null) throw new Error("Dữ liệu trong file không phải là một đối tượng JSON.");

            let tempNotes = [];
            let tempTemplates = [];
            let tempNotebooks = [];

            if (importedData.notebooks && Array.isArray(importedData.notebooks)) {
                tempNotebooks = importedData.notebooks.map((nb, index) => {
                    if (typeof nb !== 'object' || nb === null) return null;
                    const validId = typeof nb.id === 'number' ? nb.id : Date.now() + index + 2000;
                    const validName = typeof nb.name === 'string' && nb.name.trim() ? nb.name.trim() : `Sổ tay import ${validId}`;
                    return { id: validId, name: validName };
                }).filter(Boolean);
                importedNotebooksCount = tempNotebooks.length;
            }

            const validNotebookIds = new Set(tempNotebooks.map(nb => nb.id));

            if (importedData.notes && Array.isArray(importedData.notes)) {
                tempNotes = importedData.notes.map((note, index) => {
                    if (typeof note !== 'object' || note === null) return null;
                    const validId = typeof note.id === 'number' ? note.id : Date.now() + index;
                    const validLastModified = typeof note.lastModified === 'number' ? note.lastModified : validId;
                    const validNotebookId = typeof note.notebookId === 'number' && validNotebookIds.has(note.notebookId) ? note.notebookId : null;
                    return {
                        id: validId, title: typeof note.title === 'string' ? note.title : '', text: typeof note.text === 'string' ? note.text : '', tags: Array.isArray(note.tags) ? note.tags.map(String).map(t => t.trim().toLowerCase()).filter(t => t) : [], pinned: typeof note.pinned === 'boolean' ? note.pinned : false, lastModified: validLastModified, archived: typeof note.archived === 'boolean' ? note.archived : false, color: typeof note.color === 'string' && NOTE_COLORS.some(c => c.value === note.color) ? note.color : null, deleted: typeof note.deleted === 'boolean' ? note.deleted : false, deletedTimestamp: typeof note.deletedTimestamp === 'number' ? note.deletedTimestamp : null, notebookId: validNotebookId
                    };
                }).filter(Boolean);
                importedNotesCount = tempNotes.length;
            }

            if (importedData.templates && Array.isArray(importedData.templates)) {
                tempTemplates = importedData.templates.map((template, index) => {
                    if (typeof template !== 'object' || template === null) return null;
                    const validId = typeof template.id === 'number' ? template.id : Date.now() + index + 1000;
                    const validName = typeof template.name === 'string' && template.name.trim() ? template.name.trim() : `Mẫu import ${validId}`;
                    return { id: validId, name: validName, title: typeof template.title === 'string' ? template.title : '', text: typeof template.text === 'string' ? template.text : '', tags: Array.isArray(template.tags) ? template.tags.map(String).map(t => t.trim().toLowerCase()).filter(t => t) : [] };
                }).filter(Boolean);
                importedTemplatesCount = tempTemplates.length;
            }

            if (importedNotesCount === 0 && importedTemplatesCount === 0 && importedNotebooksCount === 0 && Array.isArray(importedData)) {
                console.log("Attempting to import old format (array of notes)...");
                tempNotes = importedData.map((note, index) => {
                     if (typeof note !== 'object' || note === null) return null;
                     const validId = typeof note.id === 'number' ? note.id : Date.now() + index;
                     const validLastModified = typeof note.lastModified === 'number' ? note.lastModified : validId;
                     return { id: validId, title: typeof note.title === 'string' ? note.title : '', text: typeof note.text === 'string' ? note.text : '', tags: Array.isArray(note.tags) ? note.tags.map(String).map(t => t.trim().toLowerCase()).filter(t => t) : [], pinned: typeof note.pinned === 'boolean' ? note.pinned : false, lastModified: validLastModified, archived: typeof note.archived === 'boolean' ? note.archived : false, color: typeof note.color === 'string' && NOTE_COLORS.some(c => c.value === note.color) ? note.color : null, deleted: typeof note.deleted === 'boolean' ? note.deleted : false, deletedTimestamp: typeof note.deletedTimestamp === 'number' ? note.deletedTimestamp : null, notebookId: null };
                }).filter(Boolean);
                tempTemplates = [];
                tempNotebooks = [];
                importedNotesCount = tempNotes.length;
                if (importedNotesCount === 0) throw new Error("File JSON là một mảng nhưng không chứa dữ liệu ghi chú hợp lệ.");
            } else if (importedNotesCount === 0 && importedTemplatesCount === 0 && importedNotebooksCount === 0) {
                throw new Error("File JSON không chứa key 'notes', 'templates', hoặc 'notebooks' hợp lệ, hoặc không phải là mảng dữ liệu cũ.");
            }

            notes = tempNotes;
            templates = tempTemplates;
            notebooks = tempNotebooks;

            saveNotes();
            saveTemplates();
            saveNotebooks();

            isViewingArchived = false;
            isViewingTrash = false;
            currentNotebookId = DEFAULT_NOTEBOOK_ID;
            searchInput.value = '';

            renderNotebookTabs();
            displayNotes();
            populateTemplateDropdown();

            alert(`Đã nhập thành công ${importedNotesCount} ghi chú, ${importedTemplatesCount} mẫu, và ${importedNotebooksCount} sổ tay!`);

        } catch (error) {
            console.error("Lỗi nhập file:", error);
            alert(`Lỗi nhập file: ${error.message}\n\nVui lòng kiểm tra xem file có đúng định dạng JSON và cấu trúc dữ liệu hợp lệ không.`);
        } finally {
            importFileInput.value = null;
        }
    };
    reader.onerror = (event) => {
        console.error("Lỗi đọc file:", event.target.error);
        alert("Không thể đọc được file đã chọn.");
        importFileInput.value = null;
    };
    reader.readAsText(file);
};


// =====================================================================
//  Note Filtering and Sorting Logic
// =====================================================================
const getFilteredNotes = (allNotes, filter) => {
    let viewFilteredNotes = allNotes.filter(note => {
        if (isViewingTrash) {
            return note.deleted;
        } else if (isViewingArchived) {
            return note.archived && !note.deleted;
        } else {
            return !note.deleted && !note.archived &&
                   (currentNotebookId === 'all' || note.notebookId === parseInt(currentNotebookId));
        }
    });

    if (filter) {
        const lowerCaseFilter = filter.toLowerCase().trim();
        const isTagSearch = lowerCaseFilter.startsWith('#');
        const tagSearchTerm = isTagSearch ? lowerCaseFilter.substring(1) : null;

        viewFilteredNotes = viewFilteredNotes.filter(note => {
            if (isTagSearch) {
                if (!tagSearchTerm) return true;
                return note.tags && note.tags.some(tag => tag.toLowerCase() === tagSearchTerm);
            } else {
                const noteTitleLower = (note.title || '').toLowerCase();
                const noteTextLower = (note.text || '').toLowerCase();
                const titleMatch = noteTitleLower.includes(lowerCaseFilter);
                const textMatch = noteTextLower.includes(lowerCaseFilter);
                const tagMatch = note.tags && note.tags.some(tag => tag.toLowerCase().includes(lowerCaseFilter));
                return titleMatch || textMatch || tagMatch;
            }
        });
    }

    return viewFilteredNotes;
};

const sortNotes = (filteredNotes) => {
    if (isViewingTrash) {
        return filteredNotes.sort((a, b) => (b.deletedTimestamp || b.lastModified) - (a.deletedTimestamp || a.lastModified));
    } else if (isViewingArchived) {
        return filteredNotes.sort((a, b) => (b.lastModified || b.id) - (a.lastModified || a.id));
    } else {
        return filteredNotes.sort((a, b) => {
            if (currentNotebookId === 'all' && a.pinned !== b.pinned) {
                return b.pinned - a.pinned;
            }
            return (b.lastModified || b.id) - (a.lastModified || a.id);
        });
    }
};

// =====================================================================
//  Core Display Function
// =====================================================================
const displayNotes = (filter = '') => {
    hideTagSuggestions();
    const scrollY = window.scrollY;
    notesContainer.innerHTML = '';

    const filteredNotes = getFilteredNotes(notes, filter.toLowerCase().trim());
    const notesToDisplay = sortNotes(filteredNotes);

    viewArchiveBtn.classList.remove('viewing-archive');
    viewTrashBtn.classList.remove('viewing-trash');
    viewArchiveBtn.textContent = 'Xem Lưu trữ';
    viewTrashBtn.textContent = 'Xem Thùng rác';
    archiveStatusIndicator.classList.add('hidden');
    trashStatusIndicator.classList.add('hidden');
    emptyTrashBtn.classList.add('hidden');

    if (isViewingTrash) {
        trashStatusIndicator.classList.remove('hidden');
        viewTrashBtn.textContent = 'Xem Ghi chú';
        viewTrashBtn.classList.add('viewing-trash');
        if(notesToDisplay.length > 0) {
            emptyTrashBtn.classList.remove('hidden');
        }
        renderNotebookTabs(); // Update tabs to show none active
    } else if (isViewingArchived) {
        archiveStatusIndicator.classList.remove('hidden');
        viewArchiveBtn.textContent = 'Xem Ghi chú';
        viewArchiveBtn.classList.add('viewing-archive');
        renderNotebookTabs(); // Update tabs to show none active
    } else {
        renderNotebookTabs(); // Ensure correct tab is active
    }


    if (notesToDisplay.length === 0) {
        let emptyMessage = '';
        if (isViewingTrash) {
            emptyMessage = filter ? 'Không tìm thấy ghi chú rác nào khớp.' : 'Thùng rác trống.';
        } else if (isViewingArchived) {
            emptyMessage = filter ? 'Không tìm thấy ghi chú lưu trữ nào khớp.' : 'Lưu trữ trống.';
        } else if (currentNotebookId === 'all') {
             emptyMessage = filter ? 'Không tìm thấy ghi chú nào khớp.' : 'Chưa có ghi chú nào. Nhấn "+" để thêm.';
        } else {
            const currentNotebook = notebooks.find(nb => nb.id === parseInt(currentNotebookId));
            const notebookName = currentNotebook ? escapeHTML(currentNotebook.name) : 'sổ tay này';
             emptyMessage = filter ? `Không tìm thấy ghi chú nào khớp trong ${notebookName}.` : `Sổ tay "${notebookName}" trống. Nhấn "+" để thêm.`;
        }
        notesContainer.innerHTML = `<p class="empty-state">${emptyMessage}</p>`;
        if (sortableInstance) {
            sortableInstance.destroy();
            sortableInstance = null;
        }
    } else {
        notesToDisplay.forEach(note => {
            const noteElement = renderNoteElement(note);
            notesContainer.appendChild(noteElement);
        });
        initSortable();
    }

    window.scrollTo({ top: scrollY, behavior: 'instant' });
};


// =====================================================================
//  Modal Handling Functions
// =====================================================================
const showSettingsModal = () => { const currentTheme = getStoredPreference(THEME_NAME_KEY, DEFAULT_THEME); const currentAccent = getStoredPreference(ACCENT_COLOR_KEY, DEFAULT_ACCENT_COLOR); const currentFont = getStoredPreference(FONT_FAMILY_KEY, DEFAULT_FONT_FAMILY); const currentSizeScale = parseFloat(getStoredPreference(FONT_SIZE_SCALE_KEY, DEFAULT_FONT_SIZE_SCALE.toString())); updateThemeSelectionUI(currentTheme); updateAccentColorSelectionUI(currentAccent); updateFontFamilySelectionUI(currentFont); updateFontSizeUI(isNaN(currentSizeScale) ? DEFAULT_FONT_SIZE_SCALE : currentSizeScale); settingsModal.classList.add('visible'); settingsModal.classList.remove('hidden'); closeSettingsModalBtn.focus(); };
const hideSettingsModal = () => { settingsModal.classList.remove('visible'); settingsModal.addEventListener('transitionend', (e) => { if (e.target === settingsModal) settingsModal.classList.add('hidden'); }, { once: true }); };


// =====================================================================
//  Event Listener Setup Functions
// =====================================================================

const setupThemeAndAppearanceListeners = () => {
    quickThemeToggleBtn.addEventListener('click', quickToggleTheme);
    settingsBtn.addEventListener('click', showSettingsModal);
    closeSettingsModalBtn.addEventListener('click', hideSettingsModal);
    settingsModal.addEventListener('click', (event) => { if (event.target === settingsModal) hideSettingsModal(); });

    if (themeOptionsContainer) {
        themeOptionsContainer.addEventListener('click', (event) => {
            const targetButton = event.target.closest('.theme-option-btn');
            if (targetButton?.dataset.theme) {
                const selectedTheme = targetButton.dataset.theme;
                if (VALID_THEMES.includes(selectedTheme)) { // Check if theme is valid
                    applyTheme(selectedTheme);
                    localStorage.setItem(THEME_NAME_KEY, selectedTheme);
                    // Only update LAST_CUSTOM_THEME_KEY if it's not light or dark
                    if (selectedTheme !== 'light' && selectedTheme !== 'dark') {
                        localStorage.setItem(LAST_CUSTOM_THEME_KEY, selectedTheme);
                    }
                } else {
                    console.warn(`Attempted to apply invalid theme: ${selectedTheme}`);
                }
            }
        });
    }
    if (accentColorOptionsContainer) {
         accentColorOptionsContainer.addEventListener('click', (event) => {
             const targetSwatch = event.target.closest('.accent-swatch');
             if (targetSwatch?.dataset.color) {
                 const selectedColor = targetSwatch.dataset.color;
                 applyAccentColor(selectedColor);
                 localStorage.setItem(ACCENT_COLOR_KEY, selectedColor);
             }
         });
     }
    if (fontFamilySelect) {
         fontFamilySelect.addEventListener('change', (event) => {
             const selectedFont = event.target.value;
             applyFontFamily(selectedFont);
             localStorage.setItem(FONT_FAMILY_KEY, selectedFont);
         });
     }
    const debouncedSaveFontSize = debounce((scale) => {
        localStorage.setItem(FONT_SIZE_SCALE_KEY, scale.toString());
    }, 500);
    if (fontSizeSlider) {
         fontSizeSlider.addEventListener('input', (event) => {
             const scale = parseFloat(event.target.value);
             if (!isNaN(scale)) {
                 applyFontSize(scale);
                 debouncedSaveFontSize(scale);
             }
         });
     }
     if (resetFontSizeBtn) {
         resetFontSizeBtn.addEventListener('click', () => {
             const defaultScale = DEFAULT_FONT_SIZE_SCALE;
             applyFontSize(defaultScale);
             localStorage.setItem(FONT_SIZE_SCALE_KEY, defaultScale.toString());
             if (fontSizeSlider) fontSizeSlider.value = defaultScale;
         });
     }
};

const setupAddNotePanelListeners = () => {
    addNoteBtn.addEventListener('click', addNote);
    showAddPanelBtn.addEventListener('click', showAddPanel);
    closeAddPanelBtn.addEventListener('click', hideAddPanel);
    newNoteTitle.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (newNoteText.value.trim() === '' && newNoteTitle.value.trim() !== '') {
                addNoteBtn.click();
            } else {
                newNoteText.focus();
            }
        }
    });
};

const setupHeaderActionListeners = () => {
    exportNotesBtn.addEventListener('click', exportNotes);
    importNotesBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', (e) => {
        if(e.target.files && e.target.files[0]) {
            importNotes(e.target.files[0]);
        }
        e.target.value = null;
    });

    viewArchiveBtn.addEventListener('click', () => {
        isViewingArchived = true;
        isViewingTrash = false;
        currentNotebookId = 'archive'; // Use special ID for state, not a real notebook ID
        searchInput.value = '';
        displayNotes();
    });
    viewTrashBtn.addEventListener('click', () => {
        isViewingTrash = true;
        isViewingArchived = false;
        currentNotebookId = 'trash'; // Use special ID for state
        searchInput.value = '';
        displayNotes();
    });
    emptyTrashBtn.addEventListener('click', handleEmptyTrash);
};

const setupSearchListener = () => {
    const debouncedDisplayNotes = debounce((filterVal) => displayNotes(filterVal), 300);
    searchInput.addEventListener('input', (e) => debouncedDisplayNotes(e.target.value));
};

const setupNoteActionListeners = () => {
    notesContainer.addEventListener('click', (event) => {
        const target = event.target;
        const noteElement = target.closest('.note');
        if (!noteElement) return;

        const noteId = parseInt(noteElement.dataset.id);
        const noteIndex = notes.findIndex(note => note.id === noteId);
        if (noteIndex === -1) {
            console.error("Không tìm thấy data cho note ID:", noteId);
            return;
        }

        const tagButton = target.closest('.tag-badge');
        if (tagButton?.dataset.tag) {
            event.preventDefault();
            event.stopPropagation();
            searchInput.value = `#${tagButton.dataset.tag}`;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const readMoreButton = target.closest('.read-more-btn');
        if (readMoreButton) {
            event.stopPropagation();
            const note = notes[noteIndex];
            if (note) showFullNoteModal(note.title, note.text);
            return;
        }

        const isEditingThisNote = noteElement.querySelector('textarea.edit-input');

        if (isEditingThisNote) {
             if (target.closest('.save-edit-btn')) {
                 handleNoteSaveEdit(noteElement, noteId, noteIndex);
             } else if (target.closest('.pin-btn') && currentNotebookId === 'all') {
                 handleNotePin(noteId, noteIndex);
                 const pinBtn = target.closest('.pin-btn');
                 if (pinBtn) {
                     const isPinned = notes[noteIndex].pinned;
                     pinBtn.title = isPinned ? "Bỏ ghim" : "Ghim ghi chú";
                     pinBtn.setAttribute('aria-label', isPinned ? "Bỏ ghim ghi chú" : "Ghim ghi chú");
                     pinBtn.setAttribute('aria-pressed', isPinned ? 'true' : 'false');
                     pinBtn.classList.toggle('pinned', isPinned);
                 }
             }
             return;
        }

        if (target.closest('.pin-btn') && !isViewingArchived && !isViewingTrash && currentNotebookId === 'all') handleNotePin(noteId, noteIndex);
        else if (target.closest('.delete-btn')) handleNoteDelete(noteId, noteIndex);
        else if (target.closest('.archive-btn') && !isViewingTrash && !isViewingArchived) handleNoteArchive(noteId, noteIndex);
        else if (target.closest('.unarchive-btn') && isViewingArchived) handleNoteUnarchive(noteId, noteIndex);
        else if (target.closest('.restore-btn') && isViewingTrash) handleNoteRestore(noteId, noteIndex);
        else if (target.closest('.delete-permanent-btn') && isViewingTrash) handleNoteDeletePermanent(noteId, noteIndex);
        else if (target.closest('.edit-btn') && !isViewingArchived && !isViewingTrash) handleNoteEdit(noteElement, noteId, noteIndex);
    });
};

const setupTemplateModalListeners = () => {
    if(manageTemplatesBtn) manageTemplatesBtn.addEventListener('click', showTemplateModal);
    closeTemplateModalBtn.addEventListener('click', hideTemplateModal);
    templateModal.addEventListener('click', (event) => {
        if (event.target === templateModal && templateEditPanel.classList.contains('hidden')) {
            hideTemplateModal();
        }
    });
    showAddTemplatePanelBtn.addEventListener('click', () => showTemplateEditPanel());
    cancelEditTemplateBtn.addEventListener('click', hideTemplateEditPanel);
    saveTemplateBtn.addEventListener('click', addOrUpdateTemplate);
    templateSelect.addEventListener('change', applyTemplate);
};

const setupNotebookListeners = () => {
    if(manageNotebooksBtn) manageNotebooksBtn.addEventListener('click', showNotebookModal);

    closeNotebookModalBtn.addEventListener('click', hideNotebookModal);
    notebookModal.addEventListener('click', (event) => {
        if (event.target === notebookModal && notebookEditPanel.classList.contains('hidden')) {
            hideNotebookModal();
        }
    });
    showAddNotebookPanelBtn.addEventListener('click', () => showNotebookEditPanel());
    cancelEditNotebookBtn.addEventListener('click', hideNotebookEditPanel);
    saveNotebookBtn.addEventListener('click', addOrUpdateNotebook);

    if (notebookTabsContainer) {
        notebookTabsContainer.addEventListener('click', (event) => {
            const target = event.target;
            if (target.matches('.tab-button') && target.dataset.notebookId) {
                // Use string 'all' or number for IDs
                const selectedNotebookId = target.dataset.notebookId === 'all' ? 'all' : parseInt(target.dataset.notebookId);

                // Prevent re-rendering if already on the active tab (and not in archive/trash)
                if (selectedNotebookId === currentNotebookId && !isViewingArchived && !isViewingTrash) return;

                currentNotebookId = selectedNotebookId;
                isViewingArchived = false;
                isViewingTrash = false;
                searchInput.value = '';

                displayNotes(); // This will call renderNotebookTabs internally
            }
            // Button '+' on tab bar
            else if (target.matches('#add-notebook-tab-btn')) {
                showNotebookModal();
                showNotebookEditPanel();
            }
        });
    }
};


const setupTagInputListeners = () => {
    newNoteTags.addEventListener('input', handleTagInput);
    newNoteTags.addEventListener('blur', handleTagInputBlur, true);
    newNoteTags.addEventListener('keydown', handleTagInputKeydown);

    notesContainer.addEventListener('input', (e) => {
        if (e.target.matches('.edit-tags-input')) handleTagInput(e);
    });
    notesContainer.addEventListener('blur', (e) => {
        if (e.target.matches('.edit-tags-input')) handleTagInputBlur(e);
    }, true);
    notesContainer.addEventListener('keydown', (e) => {
        if (e.target.matches('.edit-tags-input')) handleTagInputKeydown(e);
    });
};

const setupGlobalKeydownListeners = () => {
    document.addEventListener('keydown', (event) => {
        const activeElement = document.activeElement;
        const isTyping = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') && activeElement !== searchInput;
        const isTemplateModalOpen = templateModal.classList.contains('visible');
        const isNoteModalOpen = !!document.querySelector('.note-modal.visible');
        const isSettingsModalOpen = settingsModal.classList.contains('visible');
        const isNotebookModalOpen = notebookModal.classList.contains('visible');
        const isSuggestionBoxOpen = !!document.getElementById(SUGGESTION_BOX_ID);
        const isEditingNote = activeElement?.closest('.note')?.querySelector('.edit-input, .edit-title-input, .edit-tags-input') === activeElement;
        const isEditingTemplate = templateEditPanel.contains(activeElement);
        const isEditingNotebook = notebookEditPanel.contains(activeElement);

        if (event.key === 'Escape') {
             if (isSuggestionBoxOpen) hideTagSuggestions();
             else if (isSettingsModalOpen) hideSettingsModal();
             else if (isNoteModalOpen) document.querySelector('.note-modal.visible .close-modal-btn')?.click();
             else if (isTemplateModalOpen) { if (!templateEditPanel.classList.contains('hidden')) hideTemplateEditPanel(); else hideTemplateModal(); }
             else if (isNotebookModalOpen) { if (!notebookEditPanel.classList.contains('hidden')) hideNotebookEditPanel(); else hideNotebookModal(); }
             else if (!addNotePanel.classList.contains('hidden')) hideAddPanel();
             else if (isEditingNote) { const editingNoteElement = activeElement.closest('.note'); if (editingNoteElement && confirm("Bạn có muốn hủy bỏ các thay đổi và đóng chỉnh sửa ghi chú không?")) { displayNotes(searchInput.value); if (addNotePanel.classList.contains('hidden')) showAddPanelBtn.classList.remove('hidden'); if (sortableInstance) sortableInstance.option('disabled', false); } }
             else if (activeElement === searchInput && searchInput.value !== '') { searchInput.value = ''; displayNotes(); }
             event.preventDefault(); event.stopPropagation(); return;
        }

        const isAnyModalOpen = isNoteModalOpen || isTemplateModalOpen || isSettingsModalOpen || isNotebookModalOpen;
        const allowSaveInModal = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's' && (isEditingTemplate || isEditingNotebook);

        if (isAnyModalOpen && !allowSaveInModal) return;
        if (isTyping && !isEditingNote && !isEditingTemplate && !isEditingNotebook) return;

        const isCtrlOrCmd = event.metaKey || event.ctrlKey;
        if (isCtrlOrCmd && event.key.toLowerCase() === 'n') {
            event.preventDefault();
            if (addNotePanel.classList.contains('hidden') && !notesContainer.querySelector('.note .edit-input')) {
                showAddPanel();
            }
        } else if (isCtrlOrCmd && event.key.toLowerCase() === 's') {
            if (isEditingNote) { event.preventDefault(); activeElement.closest('.note')?.querySelector('.save-edit-btn')?.click(); }
            else if (addNotePanel.contains(activeElement)) { event.preventDefault(); addNoteBtn.click(); }
            else if (isEditingTemplate) { event.preventDefault(); saveTemplateBtn.click(); }
            else if (isEditingNotebook) { event.preventDefault(); saveNotebookBtn.click(); }
        } else if (isCtrlOrCmd && event.key.toLowerCase() === 'f') {
            event.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
    });
};

// =====================================================================
//  Main Event Listener Setup Function
// =====================================================================
const setupEventListeners = () => {
    setupThemeAndAppearanceListeners();
    setupHeaderActionListeners();
    setupAddNotePanelListeners();
    setupSearchListener();
    setupNoteActionListeners();
    setupTemplateModalListeners();
    setupNotebookListeners();
    setupTagInputListeners();
    setupGlobalKeydownListeners();
};


// =====================================================================
//  Initial Load Function
// =====================================================================
const loadNotesAndInit = () => {
     loadNotes();
     loadTemplates();
     loadNotebooks();
     applyAllAppearanceSettings();
     isViewingArchived = false;
     isViewingTrash = false;
     currentNotebookId = DEFAULT_NOTEBOOK_ID;
     renderNotebookTabs();
     displayNotes();
     populateTemplateDropdown();
     setupEventListeners();
};

// =====================================================================
//  Start the application
// =====================================================================
loadNotesAndInit();
