// ==================== FILE SCRIPT.JS HOÀN CHỈNH (Đã rà soát) ====================

// =====================================================================
//  Constants & State Variables
// =====================================================================
const NOTES_STORAGE_KEY = 'startNotesData';
const TEMPLATES_STORAGE_KEY = 'startNoteTemplates';
const NOTEBOOKS_STORAGE_KEY = 'startNotesNotebooks'; // Key cho sổ tay
const THEME_NAME_KEY = 'startNotesThemeName';
const ACCENT_COLOR_KEY = 'startNotesAccentColor';
const FONT_FAMILY_KEY = 'startNotesFontFamily';
const FONT_SIZE_SCALE_KEY = 'startNotesFontSizeScale';
const LAST_CUSTOM_THEME_KEY = 'startNotesLastCustomTheme'; // Key để nhớ theme tùy chỉnh cuối cùng
const SUGGESTION_BOX_ID = 'tag-suggestion-box';
const DEBOUNCE_DELAY = 1500; // Delay for auto-save in milliseconds

let notes = [];
let templates = [];
let notebooks = []; // Mảng chứa dữ liệu sổ tay
let currentView = 'all'; // Trạng thái view hiện tại ('all', notebookId, 'archive', 'trash')
let sortableInstance = null;
let activeTagInputElement = null;

const NOTE_COLORS = [
    { name: 'Default', value: null, hex: 'transparent' },
    { name: 'Yellow', value: 'note-color-yellow', hex: '#fff9c4' },
    { name: 'Blue', value: 'note-color-blue', hex: '#bbdefb' },
    { name: 'Green', value: 'note-color-green', hex: '#c8e6c9' },
    { name: 'Red', value: 'note-color-red', hex: '#ffcdd2' },
    { name: 'Purple', value: 'note-color-purple', hex: '#e1bee7' },
    { name: 'Grey', value: 'note-color-grey', hex: '#e0e0e0' },
];

const VALID_THEMES = ['light', 'dark', 'sepia', 'solarized-light', 'solarized-dark'];
const DEFAULT_THEME = 'light';
const DEFAULT_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const DEFAULT_FONT_SIZE_SCALE = 1;
const DEFAULT_ACCENT_COLOR = 'default'; // Represents the theme's default accent
const DARK_THEME_NAMES = ['dark', 'solarized-dark']; // Định nghĩa các theme nào được coi là "tối"

// =====================================================================
//  DOM References
// =====================================================================
const quickThemeToggleBtn = document.getElementById('theme-toggle-btn');
const settingsBtn = document.getElementById('settings-btn');
const searchInput = document.getElementById('search-input');
const notesContainer = document.getElementById('notes-container');
const addNotePanel = document.getElementById('add-note-panel');
const newNoteTitle = document.getElementById('new-note-title');
const newNoteText = document.getElementById('new-note-text');
const newNoteTags = document.getElementById('new-note-tags');
const templateSelect = document.getElementById('template-select');
const addNoteBtn = document.getElementById('add-note-btn');
const closeAddPanelBtn = document.getElementById('close-add-panel-btn');
const showAddPanelBtn = document.getElementById('show-add-panel-btn');
const exportNotesBtn = document.getElementById('export-notes-btn');
const importNotesBtn = document.getElementById('import-notes-btn');
const importFileInput = document.getElementById('import-file-input');
// --- Sidebar & Navigation ---
const sidebar = document.getElementById('sidebar');
const mainNavigation = document.getElementById('main-navigation');
const otherNavigation = document.getElementById('other-navigation');
const notebookListContainer = document.getElementById('notebook-list-container');
const addNotebookBtn = document.getElementById('add-notebook-btn');
const viewArchiveBtn = document.getElementById('view-archive-btn'); // Vẫn giữ ref để tiện dùng nếu cần
const viewTrashBtn = document.getElementById('view-trash-btn');     // Vẫn giữ ref
const emptyTrashBtn = document.getElementById('empty-trash-btn');
// --- Chỉ báo trạng thái ---
const archiveStatusIndicator = document.getElementById('archive-status-indicator');
const trashStatusIndicator = document.getElementById('trash-status-indicator');
// --- Dropdown chọn notebook trong Add Panel ---
const newNoteNotebookSelect = document.getElementById('new-note-notebook');

// Template Modal DOM References
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

// Settings Modal DOM References
const settingsModal = document.getElementById('settings-modal');
const closeSettingsModalBtn = document.getElementById('close-settings-modal-btn');
const themeOptionsContainer = settingsModal.querySelector('.theme-options');
const accentColorOptionsContainer = settingsModal.querySelector('.accent-color-options');
const fontFamilySelect = document.getElementById('font-family-select');
const fontSizeSlider = document.getElementById('font-size-slider');
const fontSizeValueSpan = document.getElementById('font-size-value');
const resetFontSizeBtn = document.getElementById('reset-font-size-btn');


// =====================================================================
//  Utility Functions (Định nghĩa sớm)
// =====================================================================
const parseTags = (tagString) => { if (!tagString) return []; return tagString.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag !== ''); };
const debounce = (func, delay) => { let timeoutId; return function(...args) { clearTimeout(timeoutId); timeoutId = setTimeout(() => { func.apply(this, args); }, delay); }; };
const escapeRegExp = (string) => { return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
const formatTimestamp = (timestamp) => { if (!timestamp) return ''; return new Date(timestamp).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }); }
const escapeHTML = (str) => { if (!str) return ''; const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }; return str.replace(/[&<>"']/g, m => map[m]); }

// =====================================================================
//  Theme & Appearance Management
// =====================================================================
const getStoredPreference = (key, defaultValue) => { return localStorage.getItem(key) ?? defaultValue; };
const applyAllAppearanceSettings = () => { const savedTheme = getStoredPreference(THEME_NAME_KEY, DEFAULT_THEME); applyTheme(VALID_THEMES.includes(savedTheme) ? savedTheme : DEFAULT_THEME); const savedAccentColor = getStoredPreference(ACCENT_COLOR_KEY, DEFAULT_ACCENT_COLOR); applyAccentColor(savedAccentColor); const savedFontFamily = getStoredPreference(FONT_FAMILY_KEY, DEFAULT_FONT_FAMILY); applyFontFamily(savedFontFamily); const savedFontSizeScale = parseFloat(getStoredPreference(FONT_SIZE_SCALE_KEY, DEFAULT_FONT_SIZE_SCALE.toString())); applyFontSize(isNaN(savedFontSizeScale) ? DEFAULT_FONT_SIZE_SCALE : savedFontSizeScale); };
const applyTheme = (themeName) => { const root = document.documentElement; VALID_THEMES.forEach(theme => document.body.classList.remove(`theme-${theme}`)); document.body.classList.remove('dark-mode', 'light-mode'); if (themeName && themeName !== 'light') { document.body.classList.add(`theme-${themeName}`); } const isDark = DARK_THEME_NAMES.includes(themeName); document.body.classList.add(isDark ? 'dark-mode' : 'light-mode'); if (quickThemeToggleBtn) { if (isDark) { quickThemeToggleBtn.innerHTML = '☀️&nbsp;Sáng'; quickThemeToggleBtn.title = 'Chuyển sang chế độ Sáng'; } else { quickThemeToggleBtn.innerHTML = '🌙&nbsp;Tối'; quickThemeToggleBtn.title = 'Chuyển sang chế độ Tối'; } } updateThemeSelectionUI(themeName); const currentAccent = getStoredPreference(ACCENT_COLOR_KEY, DEFAULT_ACCENT_COLOR); applyAccentColor(currentAccent); };
const updateThemeSelectionUI = (selectedTheme) => { if (!themeOptionsContainer) return; themeOptionsContainer.querySelectorAll('.theme-option-btn').forEach(btn => { const isActive = btn.dataset.theme === selectedTheme; btn.classList.toggle('active', isActive); btn.setAttribute('aria-checked', isActive ? 'true' : 'false'); }); };
const applyAccentColor = (colorValue) => { const lightDefaultAccent = '#007bff'; const darkDefaultAccent = '#0d6efd'; const currentTheme = getStoredPreference(THEME_NAME_KEY, DEFAULT_THEME); const isDarkThemeActive = DARK_THEME_NAMES.includes(currentTheme); const actualDefaultColor = isDarkThemeActive ? darkDefaultAccent : lightDefaultAccent; const actualColor = (colorValue === DEFAULT_ACCENT_COLOR || !colorValue.startsWith('#')) ? actualDefaultColor : colorValue; document.documentElement.style.setProperty('--primary-color', actualColor); updateAccentColorSelectionUI(colorValue); };
const updateAccentColorSelectionUI = (selectedColorValue) => { if (!accentColorOptionsContainer) return; accentColorOptionsContainer.querySelectorAll('.accent-swatch').forEach(swatch => { const isSelected = swatch.dataset.color === selectedColorValue; swatch.classList.toggle('selected', isSelected); swatch.setAttribute('aria-checked', isSelected ? 'true' : 'false'); if(swatch.dataset.color === 'default'){ const lightDefaultAccent = '#007bff'; const darkDefaultAccent = '#0d6efd'; const currentTheme = getStoredPreference(THEME_NAME_KEY, DEFAULT_THEME); const isDarkThemeActive = DARK_THEME_NAMES.includes(currentTheme); swatch.style.backgroundColor = isDarkThemeActive ? darkDefaultAccent : lightDefaultAccent; swatch.style.borderColor = 'transparent'; /* Bỏ border riêng cho nút default */ swatch.style.color = '#fff'; swatch.innerHTML = '✓'; } }); };
const applyFontFamily = (fontFamilyString) => { document.documentElement.style.setProperty('--content-font-family', fontFamilyString); updateFontFamilySelectionUI(fontFamilyString); };
const updateFontFamilySelectionUI = (selectedFontFamily) => { if (fontFamilySelect) { fontFamilySelect.value = selectedFontFamily; } };
const applyFontSize = (scale) => { const clampedScale = Math.max(0.8, Math.min(1.5, scale)); document.documentElement.style.setProperty('--font-size-scale', clampedScale); updateFontSizeUI(clampedScale); };
const updateFontSizeUI = (scale) => { if (fontSizeSlider) { fontSizeSlider.value = scale; } if (fontSizeValueSpan) { fontSizeValueSpan.textContent = `${Math.round(scale * 100)}%`; } };
const quickToggleTheme = () => { const currentTheme = getStoredPreference(THEME_NAME_KEY, DEFAULT_THEME); const lastCustomTheme = getStoredPreference(LAST_CUSTOM_THEME_KEY, null); let targetTheme = DEFAULT_THEME; const isCurrentDark = DARK_THEME_NAMES.includes(currentTheme); const isCurrentLight = !isCurrentDark && currentTheme === 'light'; if (isCurrentLight) { targetTheme = 'dark'; } else if (isCurrentDark) { if (lastCustomTheme && !DARK_THEME_NAMES.includes(lastCustomTheme)) { targetTheme = lastCustomTheme; } else { targetTheme = 'light'; } } else { targetTheme = 'dark'; } applyTheme(targetTheme); localStorage.setItem(THEME_NAME_KEY, targetTheme); };

// =====================================================================
//  Notebook Data Management
// =====================================================================
const saveNotebooks = () => { try { const notebooksToSave = notebooks.map(nb => ({ id: nb.id, name: nb.name })); localStorage.setItem(NOTEBOOKS_STORAGE_KEY, JSON.stringify(notebooksToSave)); } catch (e) { console.error("Lỗi lưu sổ tay:", e); alert("Lỗi lưu danh sách sổ tay."); } };
const loadNotebooks = () => { const storedNotebooks = localStorage.getItem(NOTEBOOKS_STORAGE_KEY); if (storedNotebooks) { try { notebooks = JSON.parse(storedNotebooks).map(nb => ({ id: nb.id, name: nb.name || `Sổ tay ${nb.id}` })); } catch (e) { console.error("Lỗi đọc sổ tay:", e); alert("Lỗi đọc dữ liệu Sổ tay."); notebooks = []; } } else { notebooks = []; } notebooks.sort((a, b) => a.name.localeCompare(b.name)); };
const addNotebook = (notebookName) => { const name = notebookName ? notebookName.trim() : prompt("Nhập tên Sổ tay mới:"); if (name) { if (notebooks.some(nb => nb.name.toLowerCase() === name.toLowerCase())) { alert(`Sổ tay "${escapeHTML(name)}" đã tồn tại.`); return; } const newNotebook = { id: Date.now(), name: name }; notebooks.push(newNotebook); notebooks.sort((a, b) => a.name.localeCompare(b.name)); saveNotebooks(); renderNotebookList(); populateNotebookDropdown(); } };

// =====================================================================
//  Note Data Management
// =====================================================================
const saveNotes = () => { try { const notesToSave = notes.map(note => ({ id: note.id, title: note.title || '', text: note.text, tags: note.tags || [], pinned: note.pinned || false, lastModified: note.lastModified || note.id, archived: note.archived || false, color: note.color || null, deleted: note.deleted || false, deletedTimestamp: note.deletedTimestamp || null, notebookId: note.notebookId === undefined ? null : note.notebookId })); localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notesToSave)); } catch (e) { console.error("Lỗi lưu ghi chú:", e); if (e.name === 'QuotaExceededError') { alert("Lỗi: Dung lượng lưu trữ cục bộ đã đầy."); } else { alert("Lỗi lưu ghi chú."); } } };
const loadNotes = () => { const storedNotes = localStorage.getItem(NOTES_STORAGE_KEY); if (storedNotes) { try { notes = JSON.parse(storedNotes).map(note => ({ id: note.id, title: note.title || '', text: note.text || '', tags: note.tags || [], pinned: note.pinned || false, lastModified: note.lastModified || note.id, archived: note.archived || false, color: note.color || null, deleted: note.deleted || false, deletedTimestamp: note.deletedTimestamp || null, notebookId: note.notebookId === undefined ? null : note.notebookId })); } catch (e) { console.error("Lỗi đọc ghi chú:", e); alert("Lỗi đọc dữ liệu ghi chú."); notes = []; } } else { notes = []; } };
const addNote = () => { const noteTitle = newNoteTitle.value.trim(); const noteText = newNoteText.value; const tagString = newNoteTags.value; const selectedNotebookId = newNoteNotebookSelect.value; const notebookId = selectedNotebookId === 'null' ? null : parseInt(selectedNotebookId); if (noteText.trim() || noteTitle) { const tags = parseTags(tagString); const now = Date.now(); const newNote = { id: now, title: noteTitle, text: noteText, tags: tags, pinned: false, lastModified: now, archived: false, color: null, deleted: false, deletedTimestamp: null, notebookId: notebookId }; notes.unshift(newNote); saveNotes(); currentView = notebookId !== null ? notebookId : 'all'; searchInput.value = ''; displayNotes(); hideAddPanel(); } else { alert("Vui lòng nhập Tiêu đề hoặc Nội dung."); newNoteText.focus(); } };

// =====================================================================
//  Template Data Management
// =====================================================================
const saveTemplates = () => { /* ... */ }; const loadTemplates = () => { /* ... */ }; const addOrUpdateTemplate = () => { /* ... */ }; const deleteTemplate = (id) => { /* ... */ };

// =====================================================================
//  Helper Functions & Event Handlers
// =====================================================================
const hideTagSuggestions = () => { /* ... */ }; const handleClickOutsideSuggestions = (event) => { /* ... */ };
const handleNotePin = (noteId, noteIndex) => { if (notes[noteIndex] && currentView !== 'archive' && currentView !== 'trash') { notes[noteIndex].pinned = !notes[noteIndex].pinned; notes[noteIndex].lastModified = Date.now(); saveNotes(); displayNotes(); } };
const handleNoteDelete = (noteId, noteIndex) => { if (notes[noteIndex]) { if (confirm('Chuyển vào thùng rác?')) { notes[noteIndex].deleted = true; notes[noteIndex].deletedTimestamp = Date.now(); notes[noteIndex].pinned = false; notes[noteIndex].archived = false; saveNotes(); displayNotes(); } } };
const handleNoteRestore = (noteId, noteIndex) => { if (notes[noteIndex] && currentView === 'trash') { notes[noteIndex].deleted = false; notes[noteIndex].deletedTimestamp = null; notes[noteIndex].lastModified = Date.now(); saveNotes(); displayNotes(); } };
const handleNoteDeletePermanent = (noteId, noteIndex) => { if (notes[noteIndex] && currentView === 'trash') { const noteTitle = notes[noteIndex].title || 'Ghi chú không tiêu đề'; if (confirm(`Xóa vĩnh viễn "${escapeHTML(noteTitle)}"?`)) { notes.splice(noteIndex, 1); saveNotes(); displayNotes(); } } };
const handleEmptyTrash = () => { if(currentView !== 'trash') return; const trashNotesCount = notes.filter(note => note.deleted).length; if (trashNotesCount === 0) { alert("Thùng rác trống."); return; } if (confirm(`Xóa vĩnh viễn ${trashNotesCount} ghi chú?`)) { notes = notes.filter(note => !note.deleted); saveNotes(); displayNotes(); } };
const handleNoteArchive = (noteId, noteIndex) => { if (notes[noteIndex] && currentView !== 'archive' && currentView !== 'trash') { notes[noteIndex].archived = true; notes[noteIndex].pinned = false; notes[noteIndex].lastModified = Date.now(); saveNotes(); displayNotes(); } };
const handleNoteUnarchive = (noteId, noteIndex) => { if (notes[noteIndex] && currentView === 'archive') { notes[noteIndex].archived = false; notes[noteIndex].lastModified = Date.now(); saveNotes(); displayNotes(); } };
const updateNoteData = (noteIndex, newData) => { /* ... giữ nguyên ... */ if (noteIndex < 0 || noteIndex >= notes.length) return false; const note = notes[noteIndex]; if (!note) return false; const { title, text, tags, color } = newData; let changed = false; const cleanTitle = title?.trim() ?? ''; const cleanText = text ?? ''; const cleanColor = (color === '' || color === null || color === 'null' || color === 'default') ? null : color; const cleanTags = Array.isArray(tags) ? tags.map(t => t.trim().toLowerCase()).filter(t => t) : []; if (note.title !== cleanTitle) { note.title = cleanTitle; changed = true; } if (note.text !== cleanText) { note.text = cleanText; changed = true; } if (note.color !== cleanColor) { note.color = cleanColor; changed = true; } const currentTags = note.tags || []; const tagsChanged = !(currentTags.length === cleanTags.length && currentTags.slice().sort().every((value, index) => value === cleanTags.slice().sort()[index])); if (tagsChanged) { note.tags = cleanTags; changed = true; } if (changed) { note.lastModified = Date.now(); saveNotes(); return true; } return false; };
const debouncedAutoSave = debounce((noteElement, noteIndex) => { /* ... giữ nguyên ... */ }, DEBOUNCE_DELAY);
const handleNoteEdit = (noteElement, noteId, noteIndex) => { if (currentView === 'archive' || currentView === 'trash') return; /* ... Phần còn lại giữ nguyên ... */ };
const handleNoteSaveEdit = (noteElement, noteId, noteIndex) => { /* ... Phần render lại cuối hàm cần đảm bảo đúng view ... */ updateNoteData(noteIndex, { /* ... data ... */ }); const updatedNoteData = notes[noteIndex]; const bookmarkIcon = noteElement.querySelector('.pinned-bookmark-icon'); noteElement.innerHTML = ''; if (bookmarkIcon) noteElement.appendChild(bookmarkIcon); applyNoteColor(noteElement, updatedNoteData); applyPinnedStatus(noteElement, updatedNoteData, currentView === 'archive', currentView === 'trash'); const titleEl = createNoteTitleElement(updatedNoteData, searchInput.value); if(titleEl) noteElement.appendChild(titleEl); const contentEl = createNoteContentElement(updatedNoteData, searchInput.value, noteElement); if(contentEl) noteElement.appendChild(contentEl); const tagsEl = createNoteTagsElement(updatedNoteData); if(tagsEl) noteElement.appendChild(tagsEl); const timestampEl = createNoteTimestampElement(updatedNoteData); if(timestampEl) noteElement.appendChild(timestampEl); const actionsEl = createNoteActionsElement(updatedNoteData, currentView === 'trash', currentView === 'archive'); if(actionsEl) noteElement.appendChild(actionsEl); delete noteElement.dataset.selectedColor; hideTagSuggestions(); if (sortableInstance) sortableInstance.option('disabled', false); if (addNotePanel.classList.contains('hidden')) showAddPanelBtn.classList.remove('hidden'); noteElement.classList.add('note-saved-flash'); setTimeout(() => { noteElement?.classList.remove('note-saved-flash'); }, 600); };
const showFullNoteModal = (title, noteText) => { /* ... giữ nguyên ... */ };

// =====================================================================
//  Note Element Rendering Helper Functions
// =====================================================================
function applyNoteColor(noteElement, note) { /* ... giữ nguyên ... */ }
function applyPinnedStatus(noteElement, note, isArchivedView, isTrashView) { /* ... giữ nguyên ... */ }
function createNoteTitleElement(note, filter) { /* ... giữ nguyên ... */ }
function createNoteContentElement(note, filter, noteElementForOverflowCheck) { /* ... giữ nguyên ... */ }
function createNoteTagsElement(note) { /* ... giữ nguyên ... */ }
function createNoteTimestampElement(note) { const isTrashView = (currentView === 'trash'); const timestampElement = document.createElement('small'); timestampElement.classList.add('note-timestamp'); const creationDate = formatTimestamp(note.id); let timestampText = `Tạo: ${creationDate}`; if (note.lastModified && note.lastModified > note.id + 60000) { const modifiedDate = formatTimestamp(note.lastModified); timestampText += ` (Sửa: ${modifiedDate})`; } if (isTrashView && note.deletedTimestamp) { const deletedDate = formatTimestamp(note.deletedTimestamp); timestampText += ` (Xóa: ${deletedDate})`; } timestampElement.textContent = timestampText; return timestampElement; }
function createNoteActionsElement(note, isTrashView, isArchivedView) { /* ... giữ nguyên ... */ }

// =====================================================================
//  Core Note Rendering Function (Uses Helpers)
// =====================================================================
const renderNoteElement = (note) => { const noteElement = document.createElement('div'); noteElement.classList.add('note'); noteElement.dataset.id = note.id; const isArchivedView = (currentView === 'archive'); const isTrashView = (currentView === 'trash'); applyNoteColor(noteElement, note); applyPinnedStatus(noteElement, note, isArchivedView, isTrashView); const titleEl = createNoteTitleElement(note, searchInput.value); if(titleEl) noteElement.appendChild(titleEl); const contentEl = createNoteContentElement(note, searchInput.value, noteElement); if(contentEl) noteElement.appendChild(contentEl); const tagsEl = createNoteTagsElement(note); if(tagsEl) noteElement.appendChild(tagsEl); const timestampEl = createNoteTimestampElement(note); if(timestampEl) noteElement.appendChild(timestampEl); const actionsEl = createNoteActionsElement(note, isTrashView, isArchivedView); if(actionsEl) noteElement.appendChild(actionsEl); return noteElement; };

// =====================================================================
//  Drag & Drop
// =====================================================================
const handleDragEnd = (evt) => { /* ... giữ nguyên ... */ };
const initSortable = () => { if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null; } const canInitSortable = typeof Sortable === 'function' && notesContainer && notesContainer.children.length > 0 && !notesContainer.querySelector('.empty-state') && currentView !== 'archive' && currentView !== 'trash'; if (canInitSortable) { sortableInstance = new Sortable(notesContainer, { animation: 150, handle: '.note', filter: 'input, textarea, button, .tag-badge, .note-content a, .read-more-btn, .color-swatch-btn', preventOnFilter: true, ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen', dragClass: 'sortable-drag', onEnd: handleDragEnd, delay: 50, delayOnTouchOnly: true }); } else if (typeof Sortable !== 'function' && currentView !== 'archive' && currentView !== 'trash' && notes.some(n => !n.archived && !n.deleted && (currentView === 'all' || n.notebookId === currentView) ) ) { console.warn("Thư viện Sortable.js chưa được tải."); } };

// =====================================================================
//  Tag Handling
// =====================================================================
const getAllUniqueTags = () => { /* ... giữ nguyên ... */ }; const showTagSuggestions = (inputElement, currentTagFragment, suggestions) => { /* ... giữ nguyên ... */ }; const handleTagInput = (event) => { /* ... giữ nguyên ... */ }; const handleTagInputBlur = (event) => { /* ... giữ nguyên ... */ }; const handleTagInputKeydown = (event) => { /* ... giữ nguyên ... */ };

// =====================================================================
//  Notebook UI Handlers
// =====================================================================
const renderNotebookList = () => { if (!notebookListContainer) return; notebookListContainer.innerHTML = ''; notebooks.forEach(nb => { const li = document.createElement('li'); const button = document.createElement('button'); button.classList.add('nav-button', 'notebook-button'); button.dataset.notebookId = nb.id; button.textContent = nb.name; button.title = `Xem sổ tay: ${escapeHTML(nb.name)}`; li.appendChild(button); notebookListContainer.appendChild(li); }); updateSidebarActiveState(); };
const populateNotebookDropdown = () => { if (!newNoteNotebookSelect) return; const currentVal = newNoteNotebookSelect.value; newNoteNotebookSelect.innerHTML = '<option value="null">-- Không chọn (Mặc định) --</option>'; notebooks.forEach(nb => { const option = document.createElement('option'); option.value = nb.id; option.textContent = escapeHTML(nb.name); newNoteNotebookSelect.appendChild(option); }); if (notebooks.some(nb => nb.id.toString() === currentVal)) { newNoteNotebookSelect.value = currentVal; } else { newNoteNotebookSelect.value = 'null'; } };
const updateSidebarActiveState = () => { if (!sidebar) return; sidebar.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active')); let selector; if (currentView === 'all') { selector = '#nav-all-notes'; } else if (currentView === 'archive') { selector = '#view-archive-btn'; } else if (currentView === 'trash') { selector = '#view-trash-btn'; } else { selector = `.notebook-button[data-notebook-id="${currentView}"]`; } const activeButton = sidebar.querySelector(selector); if (activeButton) { activeButton.classList.add('active'); } };

// =====================================================================
//  Template UI Handlers
// =====================================================================
const renderTemplateList = () => { /* ... giữ nguyên ... */ }; const showTemplateEditPanel = (templateId = null) => { /* ... giữ nguyên ... */ }; const hideTemplateEditPanel = () => { /* ... giữ nguyên ... */ }; const showTemplateModal = () => { /* ... giữ nguyên ... */ }; const hideTemplateModal = () => { /* ... giữ nguyên ... */ }; const populateTemplateDropdown = () => { /* ... giữ nguyên ... */ }; const applyTemplate = () => { /* ... giữ nguyên ... */ };

// =====================================================================
//  Other Panel/Import/Export
// =====================================================================
const showAddPanel = () => { /* ... giữ nguyên ... */ }; const hideAddPanel = () => { /* ... giữ nguyên ... */ }; const exportNotes = () => { /* ... giữ nguyên ... */ }; const importNotes = (file) => { /* ... giữ nguyên ... */ };

// =====================================================================
//  Core Display Function
// =====================================================================
const displayNotes = (filter = searchInput ? searchInput.value : '') => { hideTagSuggestions(); const scrollY = window.scrollY; notesContainer.innerHTML = ''; const lowerCaseFilter = filter.toLowerCase().trim(); let isArchivedView = (currentView === 'archive'); let isTrashView = (currentView === 'trash'); let notesToDisplay = notes.filter(note => { if (isTrashView) return note.deleted; if (isArchivedView) return note.archived && !note.deleted; if (currentView === 'all') return !note.deleted && !note.archived; if (typeof currentView === 'number') return !note.deleted && !note.archived && note.notebookId === currentView; return false; }); if (filter) { notesToDisplay = notesToDisplay.filter(note => { const noteTitleLower = (note.title || '').toLowerCase(); const noteTextLower = (note.text || '').toLowerCase(); const isTagSearch = lowerCaseFilter.startsWith('#'); const tagSearchTerm = isTagSearch ? lowerCaseFilter.substring(1) : null; if (isTagSearch) { if (!tagSearchTerm) return true; return note.tags && note.tags.some(tag => tag.toLowerCase() === tagSearchTerm); } else { const titleMatch = noteTitleLower.includes(lowerCaseFilter); const textMatch = noteTextLower.includes(lowerCaseFilter); const tagMatch = note.tags && note.tags.some(tag => tag.toLowerCase().includes(lowerCaseFilter)); return titleMatch || textMatch || tagMatch; } }); } if (isTrashView) { notesToDisplay.sort((a, b) => (b.deletedTimestamp || b.lastModified) - (a.deletedTimestamp || a.lastModified)); } else if (isArchivedView) { notesToDisplay.sort((a, b) => (b.lastModified || b.id) - (a.lastModified || a.id)); } else { notesToDisplay.sort((a, b) => { if (a.pinned !== b.pinned) return b.pinned - a.pinned; return (b.lastModified || b.id) - (a.lastModified || a.id); }); } archiveStatusIndicator.classList.toggle('hidden', !isArchivedView); trashStatusIndicator.classList.toggle('hidden', !isTrashView); emptyTrashBtn.classList.toggle('hidden', !(isTrashView && notesToDisplay.length > 0)); updateSidebarActiveState(); if (notesToDisplay.length === 0) { let emptyMessage = ''; const inSpecificNotebook = typeof currentView === 'number'; const notebookName = inSpecificNotebook ? notebooks.find(nb => nb.id === currentView)?.name : ''; if (isTrashView) { emptyMessage = filter ? 'Không tìm thấy ghi chú rác nào khớp.' : 'Thùng rác trống.'; } else if (isArchivedView) { emptyMessage = filter ? 'Không tìm thấy ghi chú lưu trữ nào khớp.' : 'Lưu trữ trống.'; } else if (inSpecificNotebook) { emptyMessage = filter ? `Không tìm thấy ghi chú nào khớp trong sổ tay "${escapeHTML(notebookName)}".` : `Sổ tay "${escapeHTML(notebookName)}" trống.`; } else { emptyMessage = filter ? 'Không tìm thấy ghi chú nào khớp.' : 'Chưa có ghi chú nào. Nhấn "+" để thêm.'; } notesContainer.innerHTML = `<p class="empty-state">${emptyMessage}</p>`; if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null; } } else { notesToDisplay.forEach(note => { const noteElement = renderNoteElement(note); notesContainer.appendChild(noteElement); }); initSortable(); } window.scrollTo({ top: scrollY, behavior: 'instant' }); };

// =====================================================================
//  Modal Handling Functions (Định nghĩa TRƯỚC setupEventListeners)
// =====================================================================
const showSettingsModal = () => { const currentTheme = getStoredPreference(THEME_NAME_KEY, DEFAULT_THEME); const currentAccent = getStoredPreference(ACCENT_COLOR_KEY, DEFAULT_ACCENT_COLOR); const currentFont = getStoredPreference(FONT_FAMILY_KEY, DEFAULT_FONT_FAMILY); const currentSizeScale = parseFloat(getStoredPreference(FONT_SIZE_SCALE_KEY, DEFAULT_FONT_SIZE_SCALE.toString())); updateThemeSelectionUI(currentTheme); updateAccentColorSelectionUI(currentAccent); updateFontFamilySelectionUI(currentFont); updateFontSizeUI(isNaN(currentSizeScale) ? DEFAULT_FONT_SIZE_SCALE : currentSizeScale); settingsModal.classList.add('visible'); settingsModal.classList.remove('hidden'); closeSettingsModalBtn.focus(); };
const hideSettingsModal = () => { settingsModal.classList.remove('visible'); settingsModal.addEventListener('transitionend', (e) => { if (e.target === settingsModal) settingsModal.classList.add('hidden'); }, { once: true }); };
// showTemplateModal, hideTemplateModal đã định nghĩa ở trên

// =====================================================================
//  Event Listeners Setup Function
// =====================================================================
const setupEventListeners = () => {
    // --- CÀI ĐẶT GIAO DIỆN ---
    quickThemeToggleBtn.addEventListener('click', quickToggleTheme);
    settingsBtn.addEventListener('click', showSettingsModal);
    closeSettingsModalBtn.addEventListener('click', hideSettingsModal);
    settingsModal.addEventListener('click', (event) => { if (event.target === settingsModal) hideSettingsModal(); });
    if (themeOptionsContainer) { themeOptionsContainer.addEventListener('click', (event) => { const targetButton = event.target.closest('.theme-option-btn'); if (targetButton?.dataset.theme) { const selectedTheme = targetButton.dataset.theme; if (VALID_THEMES.includes(selectedTheme)) { applyTheme(selectedTheme); localStorage.setItem(THEME_NAME_KEY, selectedTheme); if (selectedTheme !== 'light' && selectedTheme !== 'dark') localStorage.setItem(LAST_CUSTOM_THEME_KEY, selectedTheme); } } }); }
    if (accentColorOptionsContainer) { accentColorOptionsContainer.addEventListener('click', (event) => { const targetSwatch = event.target.closest('.accent-swatch'); if (targetSwatch?.dataset.color) { const selectedColor = targetSwatch.dataset.color; applyAccentColor(selectedColor); localStorage.setItem(ACCENT_COLOR_KEY, selectedColor); } }); }
    if (fontFamilySelect) { fontFamilySelect.addEventListener('change', (event) => { const selectedFont = event.target.value; applyFontFamily(selectedFont); localStorage.setItem(FONT_FAMILY_KEY, selectedFont); }); }
    const debouncedSaveFontSize = debounce((scale) => { localStorage.setItem(FONT_SIZE_SCALE_KEY, scale.toString()); }, 500);
    if (fontSizeSlider) { fontSizeSlider.addEventListener('input', (event) => { const scale = parseFloat(event.target.value); if (!isNaN(scale)) { applyFontSize(scale); debouncedSaveFontSize(scale); } }); }
    if (resetFontSizeBtn) { resetFontSizeBtn.addEventListener('click', () => { const defaultScale = DEFAULT_FONT_SIZE_SCALE; applyFontSize(defaultScale); localStorage.setItem(FONT_SIZE_SCALE_KEY, defaultScale.toString()); if (fontSizeSlider) fontSizeSlider.value = defaultScale; }); }

    // --- SIDEBAR NAVIGATION ---
    if (mainNavigation) { mainNavigation.addEventListener('click', (event) => { const targetButton = event.target.closest('.nav-button'); if (!targetButton || targetButton.id === 'add-notebook-btn') return; const filterType = targetButton.dataset.filter; const notebookId = targetButton.dataset.notebookId; if (filterType === 'all') { currentView = 'all'; searchInput.value = ''; displayNotes(); } else if (notebookId) { const id = parseInt(notebookId); if (!isNaN(id)) { currentView = id; searchInput.value = ''; displayNotes(); } } }); }
    if (otherNavigation) { otherNavigation.addEventListener('click', (event) => { const targetButton = event.target.closest('.nav-button'); if (!targetButton) return; const filterType = targetButton.dataset.filter; if (filterType === 'archive') { currentView = 'archive'; searchInput.value = ''; displayNotes(); } else if (filterType === 'trash') { currentView = 'trash'; searchInput.value = ''; displayNotes(); } else if (targetButton.id === 'empty-trash-btn') { handleEmptyTrash(); } }); }
    if (addNotebookBtn) { addNotebookBtn.addEventListener('click', () => { addNotebook(); }); }

    // --- THÊM/ĐÓNG PANEL ADD NOTE ---
    addNoteBtn.addEventListener('click', addNote);
    showAddPanelBtn.addEventListener('click', showAddPanel);
    closeAddPanelBtn.addEventListener('click', hideAddPanel);
    newNoteTitle.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (newNoteText.value.trim() === '' && newNoteTitle.value.trim() !== '') addNoteBtn.click(); else newNoteText.focus(); } });

    // --- TÌM KIẾM ---
    const debouncedDisplayNotes = debounce((filterVal) => displayNotes(filterVal), 300);
    searchInput.addEventListener('input', (e) => debouncedDisplayNotes(e.target.value));

    // --- IMPORT/EXPORT ---
    exportNotesBtn.addEventListener('click', exportNotes);
    importNotesBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', (e) => { if(e.target.files && e.target.files[0]) { importNotes(e.target.files[0]); } e.target.value = null; });

    // --- TAG INPUTS ---
    newNoteTags.addEventListener('input', handleTagInput); newNoteTags.addEventListener('blur', handleTagInputBlur, true); newNoteTags.addEventListener('keydown', handleTagInputKeydown);
    notesContainer.addEventListener('input', (e) => { if (e.target.matches('.edit-tags-input')) handleTagInput(e); }); notesContainer.addEventListener('blur', (e) => { if (e.target.matches('.edit-tags-input')) handleTagInputBlur(e); }, true); notesContainer.addEventListener('keydown', (e) => { if (e.target.matches('.edit-tags-input')) handleTagInputKeydown(e); });

    // --- TEMPLATE FEATURES ---
    manageTemplatesBtn.addEventListener('click', showTemplateModal); closeTemplateModalBtn.addEventListener('click', hideTemplateModal); templateModal.addEventListener('click', (event) => { if (event.target === templateModal) { if (templateEditPanel.classList.contains('hidden')) hideTemplateModal(); } }); showAddTemplatePanelBtn.addEventListener('click', () => showTemplateEditPanel()); cancelEditTemplateBtn.addEventListener('click', hideTemplateEditPanel); saveTemplateBtn.addEventListener('click', addOrUpdateTemplate); templateSelect.addEventListener('change', applyTemplate);

    // --- NOTE ACTIONS (EVENT DELEGATION) ---
    notesContainer.addEventListener('click', (event) => { const target = event.target; const noteElement = target.closest('.note'); if (!noteElement) return; const tagButton = target.closest('.tag-badge'); if (tagButton?.dataset.tag) { event.preventDefault(); event.stopPropagation(); searchInput.value = `#${tagButton.dataset.tag}`; searchInput.dispatchEvent(new Event('input', { bubbles: true })); searchInput.focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; } const readMoreButton = target.closest('.read-more-btn'); if (readMoreButton) { event.stopPropagation(); const noteId = parseInt(noteElement.dataset.id); const note = notes.find(n => n.id === noteId); if (note) showFullNoteModal(note.title, note.text); return; } const noteId = parseInt(noteElement.dataset.id); const noteIndex = notes.findIndex(note => note.id === noteId); if (noteIndex === -1) { console.error("Không tìm thấy data cho note ID:", noteId); return; } const isEditingThisNote = noteElement.querySelector('textarea.edit-input'); if (isEditingThisNote) { if (target.closest('.save-edit-btn')) handleNoteSaveEdit(noteElement, noteId, noteIndex); else if (target.closest('.pin-btn')) handleNotePin(noteId, noteIndex); return; } if (target.closest('.pin-btn') && currentView !== 'archive' && currentView !== 'trash') handleNotePin(noteId, noteIndex); else if (target.closest('.delete-btn')) handleNoteDelete(noteId, noteIndex); else if (target.closest('.archive-btn') && currentView !== 'archive' && currentView !== 'trash') handleNoteArchive(noteId, noteIndex); else if (target.closest('.unarchive-btn') && currentView === 'archive') handleNoteUnarchive(noteId, noteIndex); else if (target.closest('.restore-btn') && currentView === 'trash') handleNoteRestore(noteId, noteIndex); else if (target.closest('.delete-permanent-btn') && currentView === 'trash') handleNoteDeletePermanent(noteId, noteIndex); else if (target.closest('.edit-btn') && currentView !== 'archive' && currentView !== 'trash') handleNoteEdit(noteElement, noteId, noteIndex); });

    // --- GLOBAL KEYDOWN LISTENER ---
    document.addEventListener('keydown', (event) => { const activeElement = document.activeElement; const isTyping = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') && activeElement !== searchInput; const isTemplateModalOpen = templateModal.classList.contains('visible'); const isNoteModalOpen = !!document.querySelector('.note-modal.visible'); const isSettingsModalOpen = settingsModal.classList.contains('visible'); const isSuggestionBoxOpen = !!document.getElementById(SUGGESTION_BOX_ID); const isEditingNote = activeElement?.closest('.note')?.querySelector('.edit-input') === activeElement || activeElement?.closest('.note')?.querySelector('.edit-title-input') === activeElement || activeElement?.closest('.note')?.querySelector('.edit-tags-input') === activeElement; const isEditingTemplate = templateEditPanel.contains(activeElement); if (event.key === 'Escape') { if (isSuggestionBoxOpen) hideTagSuggestions(); else if (isSettingsModalOpen) hideSettingsModal(); else if (isNoteModalOpen) document.querySelector('.note-modal.visible .close-modal-btn')?.click(); else if (isTemplateModalOpen) { if (!templateEditPanel.classList.contains('hidden')) hideTemplateEditPanel(); else hideTemplateModal(); } else if (!addNotePanel.classList.contains('hidden')) hideAddPanel(); else if (isEditingNote) { const editingNoteElement = activeElement.closest('.note'); if (editingNoteElement && confirm("Hủy bỏ các thay đổi?")) { displayNotes(); if (addNotePanel.classList.contains('hidden')) showAddPanelBtn.classList.remove('hidden'); if (sortableInstance) sortableInstance.option('disabled', false); } } else if (activeElement === searchInput && searchInput.value !== '') { searchInput.value = ''; displayNotes(); } event.preventDefault(); event.stopPropagation(); return; } if (isNoteModalOpen || isTemplateModalOpen || isSettingsModalOpen) { if (!((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's' && isEditingTemplate)) return; } if (isTyping && !isEditingNote && !isEditingTemplate) return; const isCtrlOrCmd = event.metaKey || event.ctrlKey; if (isCtrlOrCmd && event.key.toLowerCase() === 'n') { event.preventDefault(); if (addNotePanel.classList.contains('hidden') && !notesContainer.querySelector('.note .edit-input')) showAddPanel(); } else if (isCtrlOrCmd && event.key.toLowerCase() === 's') { if (isEditingNote) { event.preventDefault(); activeElement.closest('.note')?.querySelector('.save-edit-btn')?.click(); } else if (addNotePanel.contains(activeElement)) { event.preventDefault(); addNoteBtn.click(); } else if (isEditingTemplate) { event.preventDefault(); saveTemplateBtn.click(); } } else if (isCtrlOrCmd && event.key.toLowerCase() === 'f') { event.preventDefault(); searchInput.focus(); searchInput.select(); } });

}; // End setupEventListeners


// =====================================================================
//  Initial Load Function
// =====================================================================
const loadNotesAndInit = () => {
     loadNotes();
     loadTemplates();
     loadNotebooks(); // Tải sổ tay
     applyAllAppearanceSettings(); // Áp dụng cài đặt giao diện
     currentView = 'all'; // Bắt đầu ở view 'all'
     renderNotebookList(); // Hiển thị list sổ tay
     populateNotebookDropdown(); // Điền dropdown sổ tay
     displayNotes(); // Hiển thị notes ban đầu
     setupEventListeners(); // Gắn listeners
};

// =====================================================================
//  Start the application
// =====================================================================
loadNotesAndInit(); // Chạy!

