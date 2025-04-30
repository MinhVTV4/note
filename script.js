// =====================================================================
//  Constants & State Variables
// =====================================================================
const NOTES_STORAGE_KEY = 'startNotesData';
const TEMPLATES_STORAGE_KEY = 'startNoteTemplates';
const THEME_NAME_KEY = 'startNotesThemeName'; // Lưu tên theme (light, dark, sepia...)
const ACCENT_COLOR_KEY = 'startNotesAccentColor';
const FONT_FAMILY_KEY = 'startNotesFontFamily';
const FONT_SIZE_SCALE_KEY = 'startNotesFontSizeScale';
const LAST_CUSTOM_THEME_KEY = 'startNotesLastCustomTheme'; // Key để nhớ theme tùy chỉnh cuối cùng
const SUGGESTION_BOX_ID = 'tag-suggestion-box';
const DEBOUNCE_DELAY = 1500; // Delay for auto-save in milliseconds

let notes = [];
let templates = [];
let isViewingArchived = false;
let isViewingTrash = false;
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
const quickThemeToggleBtn = document.getElementById('theme-toggle-btn'); // Nút Sáng/Tối mới
const settingsBtn = document.getElementById('settings-btn'); // Nút mở modal cài đặt
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
const viewArchiveBtn = document.getElementById('view-archive-btn');
const archiveStatusIndicator = document.getElementById('archive-status-indicator');
const viewTrashBtn = document.getElementById('view-trash-btn');
const trashStatusIndicator = document.getElementById('trash-status-indicator');
const emptyTrashBtn = document.getElementById('empty-trash-btn');

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
    const root = document.documentElement;
    VALID_THEMES.forEach(theme => document.body.classList.remove(`theme-${theme}`));
    document.body.classList.remove('dark-mode', 'light-mode');

    if (themeName && themeName !== 'light') {
       document.body.classList.add(`theme-${themeName}`);
    }
    const isDark = DARK_THEME_NAMES.includes(themeName);
    document.body.classList.add(isDark ? 'dark-mode' : 'light-mode');

    if (quickThemeToggleBtn) {
        if (isDark) {
            quickThemeToggleBtn.innerHTML = '☀️&nbsp;Sáng'; // Thêm khoảng trắng không ngắt dòng
            quickThemeToggleBtn.title = 'Chuyển sang chế độ Sáng';
        } else {
            quickThemeToggleBtn.innerHTML = '🌙&nbsp;Tối';
            quickThemeToggleBtn.title = 'Chuyển sang chế độ Tối';
        }
    }

    updateThemeSelectionUI(themeName);
    const currentAccent = getStoredPreference(ACCENT_COLOR_KEY, DEFAULT_ACCENT_COLOR);
    applyAccentColor(currentAccent); // Luôn cập nhật màu nhấn sau khi đổi theme
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
    const lightDefaultAccent = '#007bff';
    const darkDefaultAccent = '#0d6efd';
    const currentTheme = getStoredPreference(THEME_NAME_KEY, DEFAULT_THEME);
    const isDarkThemeActive = DARK_THEME_NAMES.includes(currentTheme);
    const actualDefaultColor = isDarkThemeActive ? darkDefaultAccent : lightDefaultAccent;
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
        // Cập nhật màu cho swatch mặc định dựa trên theme
        if(swatch.dataset.color === 'default'){
             const lightDefaultAccent = '#007bff';
             const darkDefaultAccent = '#0d6efd';
             const currentTheme = getStoredPreference(THEME_NAME_KEY, DEFAULT_THEME);
             const isDarkThemeActive = DARK_THEME_NAMES.includes(currentTheme);
             swatch.style.backgroundColor = isDarkThemeActive ? darkDefaultAccent : lightDefaultAccent;
             swatch.style.borderColor = isDarkThemeActive ? darkDefaultAccent : lightDefaultAccent; // Đồng bộ border
             swatch.style.color = '#fff'; // Luôn là chữ trắng trên nền màu
             swatch.innerHTML = ''; // Xóa dấu X
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
    const lastCustomTheme = getStoredPreference(LAST_CUSTOM_THEME_KEY, null);
    let targetTheme = DEFAULT_THEME;
    const isCurrentDark = DARK_THEME_NAMES.includes(currentTheme);
    const isCurrentLight = !isCurrentDark;

    if (isCurrentLight) {
        targetTheme = 'dark';
    } else { // Currently dark
        if (lastCustomTheme && !DARK_THEME_NAMES.includes(lastCustomTheme)) {
            targetTheme = lastCustomTheme;
        } else {
            targetTheme = 'light';
        }
    }
    applyTheme(targetTheme);
    localStorage.setItem(THEME_NAME_KEY, targetTheme);
};


// =====================================================================
//  Note Data Management
// =====================================================================
const saveNotes = () => {
    try {
        const notesToSave = notes.map(note => ({ id: note.id, title: note.title || '', text: note.text, tags: note.tags || [], pinned: note.pinned || false, lastModified: note.lastModified || note.id, archived: note.archived || false, color: note.color || null, deleted: note.deleted || false, deletedTimestamp: note.deletedTimestamp || null }));
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notesToSave));
    } catch (e) { console.error("Lỗi lưu ghi chú vào localStorage:", e); if (e.name === 'QuotaExceededError') { alert("Lỗi: Dung lượng lưu trữ cục bộ đã đầy. Không thể lưu ghi chú."); } else { alert("Đã xảy ra lỗi khi cố gắng lưu ghi chú."); } }
};

const loadNotes = () => {
    const storedNotes = localStorage.getItem(NOTES_STORAGE_KEY);
    if (storedNotes) {
        try { notes = JSON.parse(storedNotes).map(note => ({ id: note.id, title: note.title || '', text: note.text || '', tags: note.tags || [], pinned: note.pinned || false, lastModified: note.lastModified || note.id, archived: note.archived || false, color: note.color || null, deleted: note.deleted || false, deletedTimestamp: note.deletedTimestamp || null })); }
        catch (e) { console.error("Lỗi đọc dữ liệu ghi chú từ localStorage:", e); alert("Lỗi khi đọc dữ liệu ghi chú đã lưu. Dữ liệu có thể bị lỗi. Sử dụng dữ liệu mặc định."); notes = []; }
    } else { notes = []; }
};

const addNote = () => {
    const noteTitle = newNoteTitle.value.trim(); const noteText = newNoteText.value; const tagString = newNoteTags.value;
    if (noteText.trim() || noteTitle) { const tags = parseTags(tagString); const now = Date.now(); const newNote = { id: now, title: noteTitle, text: noteText, tags: tags, pinned: false, lastModified: now, archived: false, color: null, deleted: false, deletedTimestamp: null }; notes.unshift(newNote); saveNotes(); if (isViewingArchived || isViewingTrash) { isViewingArchived = false; isViewingTrash = false; searchInput.value = ''; } displayNotes(searchInput.value); hideAddPanel(); }
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
const updateNoteData = (noteIndex, newData) => { if (noteIndex < 0 || noteIndex >= notes.length) return false; const note = notes[noteIndex]; if (!note) return false; const { title, text, tags, color } = newData; let changed = false; const cleanTitle = title?.trim() ?? ''; const cleanText = text ?? ''; const cleanColor = (color === '' || color === null || color === 'null' || color === 'default') ? null : color; const cleanTags = Array.isArray(tags) ? tags.map(t => t.trim().toLowerCase()).filter(t => t) : []; if (note.title !== cleanTitle) { note.title = cleanTitle; changed = true; } if (note.text !== cleanText) { note.text = cleanText; changed = true; } if (note.color !== cleanColor) { note.color = cleanColor; changed = true; } const currentTags = note.tags || []; const tagsChanged = !(currentTags.length === cleanTags.length && currentTags.slice().sort().every((value, index) => value === cleanTags.slice().sort()[index])); if (tagsChanged) { note.tags = cleanTags; changed = true; } if (changed) { note.lastModified = Date.now(); saveNotes(); return true; } return false; };
const debouncedAutoSave = debounce((noteElement, noteIndex) => { const editTitleInputCheck = noteElement.querySelector('input.edit-title-input'); const editInputCheck = noteElement.querySelector('textarea.edit-input'); const editTagsInputCheck = noteElement.querySelector('input.edit-tags-input'); if (!editTitleInputCheck || !editInputCheck || !editTagsInputCheck || !noteElement.isConnected) { return; } const newTitle = editTitleInputCheck.value; const newText = editInputCheck.value; const newTagString = editTagsInputCheck.value; const newTags = parseTags(newTagString); const selectedColorValue = noteElement.dataset.selectedColor ?? notes[noteIndex]?.color; const newColor = selectedColorValue; const wasPreviouslyEmpty = !notes[noteIndex]?.title?.trim() && !notes[noteIndex]?.text?.trim(); const isNowEmpty = !newTitle.trim() && !newText.trim(); if (!wasPreviouslyEmpty && isNowEmpty) { return; } const saved = updateNoteData(noteIndex, { title: newTitle, text: newText, tags: newTags, color: newColor }); if (saved) { noteElement.classList.add('note-autosaved'); setTimeout(() => { noteElement?.classList.remove('note-autosaved'); }, 600); } }, DEBOUNCE_DELAY);
const handleNoteEdit = (noteElement, noteId, noteIndex) => { if (isViewingArchived || isViewingTrash) return; const currentlyEditing = notesContainer.querySelector('.note .edit-input'); if (currentlyEditing && currentlyEditing.closest('.note') !== noteElement) { alert("Vui lòng Lưu hoặc Hủy thay đổi ở ghi chú đang sửa trước khi sửa ghi chú khác."); currentlyEditing.closest('.note').querySelector('textarea.edit-input')?.focus(); return; } hideTagSuggestions(); if (sortableInstance) sortableInstance.option('disabled', true); showAddPanelBtn.classList.add('hidden'); const noteData = notes[noteIndex]; if (!noteData) return; const actionsElementOriginal = noteElement.querySelector('.note-actions'); let originalActionsHTML = ''; if (actionsElementOriginal) { originalActionsHTML = Array.from(actionsElementOriginal.children).filter(btn => !btn.classList.contains('save-edit-btn')).map(btn => btn.outerHTML).join(''); } const editTitleInput = document.createElement('input'); editTitleInput.type = 'text'; editTitleInput.classList.add('edit-title-input'); editTitleInput.placeholder = 'Tiêu đề...'; editTitleInput.value = noteData.title || ''; const editInput = document.createElement('textarea'); editInput.classList.add('edit-input'); editInput.value = noteData.text; editInput.rows = 5; const editTagsInput = document.createElement('input'); editTagsInput.type = 'text'; editTagsInput.classList.add('edit-tags-input'); editTagsInput.placeholder = 'Tags (cách nhau bằng dấu phẩy)...'; editTagsInput.value = (noteData.tags || []).join(', '); editTagsInput.autocomplete = 'off'; const colorSelectorContainer = document.createElement('div'); colorSelectorContainer.classList.add('color-selector-container'); colorSelectorContainer.setAttribute('role', 'radiogroup'); colorSelectorContainer.setAttribute('aria-label', 'Chọn màu ghi chú'); noteElement.dataset.selectedColor = noteData.color || ''; NOTE_COLORS.forEach(color => { const swatchBtn = document.createElement('button'); swatchBtn.type = 'button'; swatchBtn.classList.add('color-swatch-btn'); swatchBtn.dataset.colorValue = color.value || ''; swatchBtn.title = color.name; swatchBtn.setAttribute('role', 'radio'); const isCurrentColor = (noteData.color === color.value) || (!noteData.color && !color.value); swatchBtn.setAttribute('aria-checked', isCurrentColor ? 'true' : 'false'); if (isCurrentColor) swatchBtn.classList.add('selected'); if (color.value) { swatchBtn.style.backgroundColor = color.hex; } else { swatchBtn.classList.add('default-color-swatch'); swatchBtn.innerHTML = '&#x2715;'; swatchBtn.setAttribute('aria-label', 'Màu mặc định'); } swatchBtn.addEventListener('click', () => { const selectedValue = swatchBtn.dataset.colorValue; noteElement.dataset.selectedColor = selectedValue; colorSelectorContainer.querySelectorAll('.color-swatch-btn').forEach(btn => { const isSelected = btn === swatchBtn; btn.classList.toggle('selected', isSelected); btn.setAttribute('aria-checked', isSelected ? 'true' : 'false'); }); applyNoteColor(noteElement, { ...noteData, color: selectedValue }); debouncedAutoSave(noteElement, noteIndex); }); colorSelectorContainer.appendChild(swatchBtn); }); const saveBtn = document.createElement('button'); saveBtn.classList.add('save-edit-btn', 'modal-button', 'primary'); saveBtn.textContent = 'Lưu'; saveBtn.title = 'Lưu thay đổi (Ctrl+S)'; const bookmarkIcon = noteElement.querySelector('.pinned-bookmark-icon'); noteElement.innerHTML = ''; if (bookmarkIcon) { noteElement.appendChild(bookmarkIcon); bookmarkIcon.style.display = 'inline-block'; } noteElement.appendChild(editTitleInput); noteElement.appendChild(editInput); noteElement.appendChild(editTagsInput); noteElement.appendChild(colorSelectorContainer); const editActionsContainer = document.createElement('div'); editActionsContainer.classList.add('note-actions'); editActionsContainer.innerHTML = originalActionsHTML; editActionsContainer.appendChild(saveBtn); noteElement.appendChild(editActionsContainer); const triggerAutoSave = () => debouncedAutoSave(noteElement, noteIndex); editTitleInput.addEventListener('input', triggerAutoSave); editInput.addEventListener('input', triggerAutoSave); editTagsInput.addEventListener('input', (event) => { handleTagInput(event); triggerAutoSave(); }); editTagsInput.addEventListener('blur', handleTagInputBlur, true); editTagsInput.addEventListener('keydown', handleTagInputKeydown); editTitleInput.focus(); editTitleInput.setSelectionRange(editTitleInput.value.length, editTitleInput.value.length); };
const handleNoteSaveEdit = (noteElement, noteId, noteIndex) => { const editTitleInput = noteElement.querySelector('input.edit-title-input'); const editInput = noteElement.querySelector('textarea.edit-input'); const editTagsInput = noteElement.querySelector('input.edit-tags-input'); if (!editTitleInput || !editInput || !editTagsInput) { console.error("Lỗi lưu: Không tìm thấy các thành phần sửa ghi chú."); displayNotes(searchInput.value); return; } const newTitle = editTitleInput.value; const newText = editInput.value; const newTagString = editTagsInput.value; const newTags = parseTags(newTagString); const selectedColorValue = noteElement.dataset.selectedColor ?? notes[noteIndex]?.color; const newColor = selectedColorValue; const wasInitiallyEmpty = !notes[noteIndex]?.title?.trim() && !notes[noteIndex]?.text?.trim(); const isNowEmpty = !newTitle.trim() && !newText.trim(); if (!wasInitiallyEmpty && isNowEmpty) { if (!confirm("Ghi chú gần như trống. Bạn vẫn muốn lưu?")) { return; } } updateNoteData(noteIndex, { title: newTitle, text: newText, tags: newTags, color: newColor }); const updatedNoteData = notes[noteIndex]; const bookmarkIcon = noteElement.querySelector('.pinned-bookmark-icon'); noteElement.innerHTML = ''; if (bookmarkIcon) noteElement.appendChild(bookmarkIcon); applyNoteColor(noteElement, updatedNoteData); applyPinnedStatus(noteElement, updatedNoteData, isViewingArchived, isViewingTrash); const titleEl = createNoteTitleElement(updatedNoteData, searchInput.value); if(titleEl) noteElement.appendChild(titleEl); const contentEl = createNoteContentElement(updatedNoteData, searchInput.value, noteElement); if(contentEl) noteElement.appendChild(contentEl); const tagsEl = createNoteTagsElement(updatedNoteData); if(tagsEl) noteElement.appendChild(tagsEl); const timestampEl = createNoteTimestampElement(updatedNoteData); if(timestampEl) noteElement.appendChild(timestampEl); const actionsEl = createNoteActionsElement(updatedNoteData, isViewingTrash, isViewingArchived); if(actionsEl) noteElement.appendChild(actionsEl); delete noteElement.dataset.selectedColor; hideTagSuggestions(); if (sortableInstance) sortableInstance.option('disabled', false); if (addNotePanel.classList.contains('hidden')) showAddPanelBtn.classList.remove('hidden'); noteElement.classList.add('note-saved-flash'); setTimeout(() => { noteElement?.classList.remove('note-saved-flash'); }, 600); };
const showFullNoteModal = (title, noteText) => { const existingModal = document.querySelector('.note-modal'); if (existingModal) { existingModal.remove(); } const modal = document.createElement('div'); modal.classList.add('note-modal', 'modal', 'hidden'); modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'note-modal-title'); const modalContent = document.createElement('div'); modalContent.classList.add('modal-content'); const modalHeader = document.createElement('div'); modalHeader.classList.add('modal-header'); const modalTitle = document.createElement('h2'); modalTitle.id = 'note-modal-title'; modalTitle.textContent = title || 'Ghi chú'; const closeModalBtn = document.createElement('button'); closeModalBtn.classList.add('close-modal-btn'); closeModalBtn.innerHTML = '&times;'; closeModalBtn.title = 'Đóng (Esc)'; closeModalBtn.setAttribute('aria-label', 'Đóng cửa sổ xem ghi chú'); modalHeader.appendChild(modalTitle); modalHeader.appendChild(closeModalBtn); const modalBody = document.createElement('div'); modalBody.classList.add('modal-body'); modalBody.textContent = noteText || ''; modalContent.appendChild(modalHeader); modalContent.appendChild(modalBody); modal.appendChild(modalContent); document.body.appendChild(modal); requestAnimationFrame(() => { modal.classList.add('visible'); modal.classList.remove('hidden'); }); closeModalBtn.focus(); const closeFunc = () => { modal.classList.remove('visible'); modal.addEventListener('transitionend', () => { modal.remove(); document.removeEventListener('keydown', handleThisModalKeyDown); }, { once: true }); }; const handleThisModalKeyDown = (event) => { if (!modal.classList.contains('visible')) { document.removeEventListener('keydown', handleThisModalKeyDown); return; } if (event.key === 'Escape') { closeFunc(); } if (event.key === 'Tab') { const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'); if (focusableElements.length === 0) return; const firstElement = focusableElements[0]; const lastElement = focusableElements[focusableElements.length - 1]; if (event.shiftKey) { if (document.activeElement === firstElement) { lastElement.focus(); event.preventDefault(); } } else { if (document.activeElement === lastElement) { firstElement.focus(); event.preventDefault(); } } } }; closeModalBtn.addEventListener('click', closeFunc); modal.addEventListener('click', (event) => { if (event.target === modal) closeFunc(); }); document.addEventListener('keydown', handleThisModalKeyDown); };

// =====================================================================
//  Note Element Rendering Helper Functions
// =====================================================================
function applyNoteColor(noteElement, note) { NOTE_COLORS.forEach(color => { if (color.value) noteElement.classList.remove(color.value); }); const noteColor = note?.color; if (noteColor && NOTE_COLORS.some(c => c.value === noteColor)) { noteElement.classList.add(noteColor); } const colorData = NOTE_COLORS.find(c => c.value === noteColor); noteElement.style.borderLeftColor = colorData?.hex && colorData.value ? colorData.hex : 'transparent'; noteElement.style.borderColor = ''; }
function applyPinnedStatus(noteElement, note, isViewingArchived, isViewingTrash) { const isPinned = note?.pinned ?? false; const shouldShowPin = isPinned && !isViewingArchived && !isViewingTrash; const existingBookmark = noteElement.querySelector('.pinned-bookmark-icon'); noteElement.classList.toggle('pinned-note', shouldShowPin); if (shouldShowPin) { if (!existingBookmark) { const bookmarkIcon = document.createElement('span'); bookmarkIcon.classList.add('pinned-bookmark-icon'); bookmarkIcon.innerHTML = '&#128278;'; bookmarkIcon.setAttribute('aria-hidden', 'true'); noteElement.insertBefore(bookmarkIcon, noteElement.firstChild); } else { existingBookmark.style.display = 'inline-block'; } } else { if (existingBookmark) { existingBookmark.style.display = 'none'; } } }
function createNoteTitleElement(note, filter) { const title = note?.title?.trim(); if (!title) return null; const titleElement = document.createElement('h3'); titleElement.classList.add('note-title'); let titleHTML = escapeHTML(title); const lowerCaseFilter = (filter || '').toLowerCase().trim(); const isTagSearch = lowerCaseFilter.startsWith('#'); if (!isTagSearch && lowerCaseFilter) { try { const highlightRegex = new RegExp(`(${escapeRegExp(lowerCaseFilter)})`, 'gi'); titleHTML = titleHTML.replace(highlightRegex, '<mark>$1</mark>'); } catch(e) { console.warn("Lỗi highlight tiêu đề:", e); } } titleElement.innerHTML = titleHTML; return titleElement; }
function createNoteContentElement(note, filter, noteElementForOverflowCheck) { const textContent = note?.text ?? ''; const contentElement = document.createElement('div'); contentElement.classList.add('note-content'); let displayHTML = escapeHTML(textContent); const lowerCaseFilter = (filter || '').toLowerCase().trim(); const isTagSearchContent = lowerCaseFilter.startsWith('#'); if (!isTagSearchContent && lowerCaseFilter) { try { const highlightRegexContent = new RegExp(`(${escapeRegExp(lowerCaseFilter)})`, 'gi'); displayHTML = displayHTML.replace(highlightRegexContent, '<mark>$1</mark>'); } catch (e) { console.warn("Lỗi highlight nội dung:", e); } } displayHTML = displayHTML.replace(/\n/g, '<br>'); contentElement.innerHTML = displayHTML; requestAnimationFrame(() => { if (!noteElementForOverflowCheck || !noteElementForOverflowCheck.isConnected) return; const currentContentEl = noteElementForOverflowCheck.querySelector('.note-content'); if (!currentContentEl) return; const existingBtn = noteElementForOverflowCheck.querySelector('.read-more-btn'); if (existingBtn) existingBtn.remove(); const hasOverflow = currentContentEl.scrollHeight > currentContentEl.clientHeight + 2; currentContentEl.classList.toggle('has-overflow', hasOverflow); if (hasOverflow) { const readMoreBtn = document.createElement('button'); readMoreBtn.textContent = 'Xem thêm'; readMoreBtn.classList.add('read-more-btn'); readMoreBtn.type = 'button'; readMoreBtn.title = 'Xem toàn bộ nội dung ghi chú'; readMoreBtn.addEventListener('click', (e) => { e.stopPropagation(); showFullNoteModal(note.title, note.text); }); noteElementForOverflowCheck.insertBefore(readMoreBtn, currentContentEl.nextSibling); } }); return contentElement; }
function createNoteTagsElement(note) { const tags = note?.tags; if (!tags || tags.length === 0) return null; const tagsElement = document.createElement('div'); tagsElement.classList.add('note-tags'); tags.forEach(tag => { const tagBadge = document.createElement('button'); tagBadge.classList.add('tag-badge'); tagBadge.textContent = `#${tag}`; tagBadge.dataset.tag = tag; tagBadge.type = 'button'; tagBadge.title = `Lọc theo tag: ${tag}`; tagsElement.appendChild(tagBadge); }); return tagsElement; }
function createNoteTimestampElement(note) { const timestampElement = document.createElement('small'); timestampElement.classList.add('note-timestamp'); const creationDate = formatTimestamp(note.id); let timestampText = `Tạo: ${creationDate}`; if (note.lastModified && note.lastModified > note.id + 60000) { const modifiedDate = formatTimestamp(note.lastModified); timestampText += ` (Sửa: ${modifiedDate})`; } if (isViewingTrash && note.deletedTimestamp) { const deletedDate = formatTimestamp(note.deletedTimestamp); timestampText += ` (Xóa: ${deletedDate})`; } timestampElement.textContent = timestampText; return timestampElement; }
function createNoteActionsElement(note, isViewingTrash, isViewingArchived) { const actionsElement = document.createElement('div'); actionsElement.classList.add('note-actions'); if (isViewingTrash) { const restoreBtn = document.createElement('button'); restoreBtn.classList.add('restore-btn'); restoreBtn.innerHTML = '&#x21A9;&#xFE0F;'; restoreBtn.title = 'Khôi phục ghi chú'; restoreBtn.setAttribute('aria-label', 'Khôi phục ghi chú'); actionsElement.appendChild(restoreBtn); const deletePermanentBtn = document.createElement('button'); deletePermanentBtn.classList.add('delete-permanent-btn'); deletePermanentBtn.textContent = 'Xóa VV'; deletePermanentBtn.title = 'Xóa ghi chú vĩnh viễn'; deletePermanentBtn.setAttribute('aria-label', 'Xóa ghi chú vĩnh viễn'); actionsElement.appendChild(deletePermanentBtn); } else if (isViewingArchived) { const unarchiveBtn = document.createElement('button'); unarchiveBtn.classList.add('unarchive-btn'); unarchiveBtn.innerHTML = '&#x1F5C4;&#xFE0F;'; unarchiveBtn.title = 'Khôi phục từ Lưu trữ'; unarchiveBtn.setAttribute('aria-label', 'Khôi phục từ Lưu trữ'); actionsElement.appendChild(unarchiveBtn); const deleteBtn = document.createElement('button'); deleteBtn.classList.add('delete-btn'); deleteBtn.textContent = 'Xóa'; deleteBtn.title = 'Chuyển vào thùng rác'; deleteBtn.setAttribute('aria-label', 'Chuyển vào thùng rác'); actionsElement.appendChild(deleteBtn); } else { const pinBtn = document.createElement('button'); pinBtn.classList.add('pin-btn'); pinBtn.innerHTML = '&#128204;'; pinBtn.title = note.pinned ? "Bỏ ghim" : "Ghim ghi chú"; pinBtn.setAttribute('aria-label', note.pinned ? "Bỏ ghim ghi chú" : "Ghim ghi chú"); pinBtn.setAttribute('aria-pressed', note.pinned ? 'true' : 'false'); if (note.pinned) pinBtn.classList.add('pinned'); actionsElement.appendChild(pinBtn); const editBtn = document.createElement('button'); editBtn.classList.add('edit-btn'); editBtn.textContent = 'Sửa'; editBtn.title = 'Sửa ghi chú'; editBtn.setAttribute('aria-label', 'Sửa ghi chú'); actionsElement.appendChild(editBtn); const archiveBtn = document.createElement('button'); archiveBtn.classList.add('archive-btn'); archiveBtn.innerHTML = '&#128451;'; archiveBtn.title = 'Lưu trữ ghi chú'; archiveBtn.setAttribute('aria-label', 'Lưu trữ ghi chú'); actionsElement.appendChild(archiveBtn); const deleteBtn = document.createElement('button'); deleteBtn.classList.add('delete-btn'); deleteBtn.textContent = 'Xóa'; deleteBtn.title = 'Chuyển vào thùng rác'; deleteBtn.setAttribute('aria-label', 'Chuyển vào thùng rác'); actionsElement.appendChild(deleteBtn); } return actionsElement; }

// =====================================================================
//  Core Note Rendering Function (Uses Helpers)
// =====================================================================
const renderNoteElement = (note) => { const noteElement = document.createElement('div'); noteElement.classList.add('note'); noteElement.dataset.id = note.id; applyNoteColor(noteElement, note); applyPinnedStatus(noteElement, note, isViewingArchived, isViewingTrash); const titleEl = createNoteTitleElement(note, searchInput.value); if(titleEl) noteElement.appendChild(titleEl); const contentEl = createNoteContentElement(note, searchInput.value, noteElement); if(contentEl) noteElement.appendChild(contentEl); const tagsEl = createNoteTagsElement(note); if(tagsEl) noteElement.appendChild(tagsEl); const timestampEl = createNoteTimestampElement(note); if(timestampEl) noteElement.appendChild(timestampEl); const actionsEl = createNoteActionsElement(note, isViewingTrash, isViewingArchived); if(actionsEl) noteElement.appendChild(actionsEl); return noteElement; };

// =====================================================================
//  Drag & Drop
// =====================================================================
const handleDragEnd = (evt) => { const newOrderIds = Array.from(notesContainer.children).map(el => el.classList.contains('note') ? parseInt(el.dataset.id) : null).filter(id => id !== null); const noteMap = new Map(notes.map(note => [note.id, note])); const reorderedVisibleNotes = []; const otherNotes = []; newOrderIds.forEach(id => { const note = noteMap.get(id); if (note && !note.archived && !note.deleted) { reorderedVisibleNotes.push(note); noteMap.delete(id); } }); noteMap.forEach(note => otherNotes.push(note)); notes = [...reorderedVisibleNotes, ...otherNotes]; saveNotes(); };
const initSortable = () => { if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null; } const canInitSortable = typeof Sortable === 'function' && notesContainer && notesContainer.children.length > 0 && !notesContainer.querySelector('.empty-state') && !isViewingArchived && !isViewingTrash; if (canInitSortable) { sortableInstance = new Sortable(notesContainer, { animation: 150, handle: '.note', filter: 'input, textarea, button, .tag-badge, .note-content a, .read-more-btn, .color-swatch-btn', preventOnFilter: true, ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen', dragClass: 'sortable-drag', onEnd: handleDragEnd, delay: 50, delayOnTouchOnly: true }); } else if (typeof Sortable !== 'function' && !isViewingArchived && !isViewingTrash && notes.some(n => !n.archived && !n.deleted)) { console.warn("Thư viện Sortable.js chưa được tải."); } };

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
//  Other Panel/Import/Export
// =====================================================================
const showAddPanel = () => { const currentlyEditing = notesContainer.querySelector('.note .edit-input'); if (currentlyEditing) { alert("Vui lòng Lưu hoặc Hủy thay đổi ở ghi chú đang sửa trước khi thêm ghi chú mới."); currentlyEditing.closest('.note').querySelector('textarea.edit-input')?.focus(); return; } hideTagSuggestions(); addNotePanel.classList.remove('hidden'); showAddPanelBtn.classList.add('hidden'); templateSelect.value = ""; newNoteTitle.focus(); };
const hideAddPanel = () => { hideTagSuggestions(); addNotePanel.classList.add('hidden'); if (!notesContainer.querySelector('.note .edit-input')) showAddPanelBtn.classList.remove('hidden'); newNoteTitle.value = ''; newNoteText.value = ''; newNoteTags.value = ''; templateSelect.value = ""; };
const exportNotes = () => { if (notes.length === 0 && templates.length === 0) { alert("Không có ghi chú hoặc mẫu nào để xuất."); return; } try { const dataToExport = { notes: notes.map(note => ({ id: note.id, title: note.title || '', text: note.text || '', tags: note.tags || [], pinned: note.pinned || false, lastModified: note.lastModified || note.id, archived: note.archived || false, color: note.color || null, deleted: note.deleted || false, deletedTimestamp: note.deletedTimestamp || null })), templates: templates.map(template => ({ id: template.id, name: template.name, title: template.title || '', text: template.text || '', tags: template.tags || [] })) }; const jsonData = JSON.stringify(dataToExport, null, 2); const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_'); a.download = `start-notes-backup-${timestamp}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); } catch (error) { console.error("Lỗi xuất dữ liệu:", error); alert("Đã xảy ra lỗi khi xuất dữ liệu."); } };
const importNotes = (file) => { if (!file) { alert("Vui lòng chọn một file JSON hợp lệ."); return; } if (!confirm("CẢNH BÁO:\nThao tác này sẽ THAY THẾ TOÀN BỘ ghi chú và mẫu hiện tại bằng nội dung từ file đã chọn.\nDữ liệu cũ sẽ bị mất.\n\nBạn chắc chắn muốn tiếp tục?")) { importFileInput.value = null; return; } const reader = new FileReader(); reader.onload = (event) => { let importedNotesCount = 0; let importedTemplatesCount = 0; try { const importedData = JSON.parse(event.target.result); if (typeof importedData !== 'object' || importedData === null) throw new Error("Dữ liệu trong file không phải là một đối tượng JSON."); let tempNotes = []; let tempTemplates = []; if (importedData.notes && Array.isArray(importedData.notes)) { tempNotes = importedData.notes.map((note, index) => { if (typeof note !== 'object' || note === null) return null; const validId = typeof note.id === 'number' ? note.id : Date.now() + index; const validLastModified = typeof note.lastModified === 'number' ? note.lastModified : validId; return { id: validId, title: typeof note.title === 'string' ? note.title : '', text: typeof note.text === 'string' ? note.text : '', tags: Array.isArray(note.tags) ? note.tags.map(String).map(t => t.trim().toLowerCase()).filter(t => t) : [], pinned: typeof note.pinned === 'boolean' ? note.pinned : false, lastModified: validLastModified, archived: typeof note.archived === 'boolean' ? note.archived : false, color: typeof note.color === 'string' && NOTE_COLORS.some(c => c.value === note.color) ? note.color : null, deleted: typeof note.deleted === 'boolean' ? note.deleted : false, deletedTimestamp: typeof note.deletedTimestamp === 'number' ? note.deletedTimestamp : null }; }).filter(Boolean); importedNotesCount = tempNotes.length; } if (importedData.templates && Array.isArray(importedData.templates)) { tempTemplates = importedData.templates.map((template, index) => { if (typeof template !== 'object' || template === null) return null; const validId = typeof template.id === 'number' ? template.id : Date.now() + index + 1000; const validName = typeof template.name === 'string' && template.name.trim() ? template.name.trim() : `Mẫu import ${validId}`; return { id: validId, name: validName, title: typeof template.title === 'string' ? template.title : '', text: typeof template.text === 'string' ? template.text : '', tags: Array.isArray(template.tags) ? template.tags.map(String).map(t => t.trim().toLowerCase()).filter(t => t) : [] }; }).filter(Boolean); importedTemplatesCount = tempTemplates.length; } if (importedNotesCount === 0 && importedTemplatesCount === 0 && Array.isArray(importedData)) { console.log("Attempting to import old format (array of notes)..."); tempNotes = importedData.map((note, index) => { if (typeof note !== 'object' || note === null) return null; const validId = typeof note.id === 'number' ? note.id : Date.now() + index; const validLastModified = typeof note.lastModified === 'number' ? note.lastModified : validId; return { id: validId, title: typeof note.title === 'string' ? note.title : '', text: typeof note.text === 'string' ? note.text : '', tags: Array.isArray(note.tags) ? note.tags.map(String).map(t => t.trim().toLowerCase()).filter(t => t) : [], pinned: typeof note.pinned === 'boolean' ? note.pinned : false, lastModified: validLastModified, archived: typeof note.archived === 'boolean' ? note.archived : false, color: typeof note.color === 'string' && NOTE_COLORS.some(c => c.value === note.color) ? note.color : null, deleted: typeof note.deleted === 'boolean' ? note.deleted : false, deletedTimestamp: typeof note.deletedTimestamp === 'number' ? note.deletedTimestamp : null }; }).filter(Boolean); tempTemplates = []; importedNotesCount = tempNotes.length; if (importedNotesCount === 0) throw new Error("File JSON là một mảng nhưng không chứa dữ liệu ghi chú hợp lệ."); } else if (importedNotesCount === 0 && importedTemplatesCount === 0) { throw new Error("File JSON không chứa key 'notes' hoặc 'templates' hợp lệ, hoặc không phải là mảng dữ liệu cũ."); } notes = tempNotes; templates = tempTemplates; saveNotes(); saveTemplates(); isViewingArchived = false; isViewingTrash = false; searchInput.value = ''; displayNotes(); populateTemplateDropdown(); alert(`Đã nhập thành công ${importedNotesCount} ghi chú và ${importedTemplatesCount} mẫu!`); } catch (error) { console.error("Lỗi nhập file:", error); alert(`Lỗi nhập file: ${error.message}\n\nVui lòng kiểm tra xem file có đúng định dạng JSON và cấu trúc dữ liệu hợp lệ không.`); } finally { importFileInput.value = null; } }; reader.onerror = (event) => { console.error("Lỗi đọc file:", event.target.error); alert("Không thể đọc được file đã chọn."); importFileInput.value = null; }; reader.readAsText(file); };

// =====================================================================
//  Core Display Function
// =====================================================================
const displayNotes = (filter = '') => { hideTagSuggestions(); const scrollY = window.scrollY; notesContainer.innerHTML = ''; const lowerCaseFilter = filter.toLowerCase().trim(); let notesToDisplay = notes.filter(note => { if (isViewingTrash) { return note.deleted; } else if (isViewingArchived) { return note.archived && !note.deleted; } else { return !note.deleted && !note.archived; } }); if (filter) { notesToDisplay = notesToDisplay.filter(note => { const noteTitleLower = (note.title || '').toLowerCase(); const noteTextLower = (note.text || '').toLowerCase(); const isTagSearch = lowerCaseFilter.startsWith('#'); const tagSearchTerm = isTagSearch ? lowerCaseFilter.substring(1) : null; if (isTagSearch) { if (!tagSearchTerm) return true; return note.tags && note.tags.some(tag => tag.toLowerCase() === tagSearchTerm); } else { const titleMatch = noteTitleLower.includes(lowerCaseFilter); const textMatch = noteTextLower.includes(lowerCaseFilter); const tagMatch = note.tags && note.tags.some(tag => tag.toLowerCase().includes(lowerCaseFilter)); return titleMatch || textMatch || tagMatch; } }); } if (isViewingTrash) { notesToDisplay.sort((a, b) => (b.deletedTimestamp || b.lastModified) - (a.deletedTimestamp || a.lastModified)); } else if (isViewingArchived) { notesToDisplay.sort((a, b) => (b.lastModified || b.id) - (a.lastModified || a.id)); } else { notesToDisplay.sort((a, b) => { if (a.pinned !== b.pinned) { return b.pinned - a.pinned; } return (b.lastModified || b.id) - (a.lastModified || a.id); }); } archiveStatusIndicator.classList.add('hidden'); trashStatusIndicator.classList.add('hidden'); viewArchiveBtn.classList.remove('viewing-archive'); viewTrashBtn.classList.remove('viewing-trash'); emptyTrashBtn.classList.add('hidden'); if (isViewingTrash) { trashStatusIndicator.classList.remove('hidden'); viewTrashBtn.textContent = 'Xem Ghi chú Chính'; viewTrashBtn.classList.add('viewing-trash'); viewArchiveBtn.textContent = 'Xem Lưu trữ'; if(notesToDisplay.length > 0) emptyTrashBtn.classList.remove('hidden'); } else if (isViewingArchived) { archiveStatusIndicator.classList.remove('hidden'); viewArchiveBtn.textContent = 'Xem Ghi chú Chính'; viewArchiveBtn.classList.add('viewing-archive'); viewTrashBtn.textContent = 'Xem Thùng rác'; } else { viewArchiveBtn.textContent = 'Xem Lưu trữ'; viewTrashBtn.textContent = 'Xem Thùng rác'; } if (notesToDisplay.length === 0) { let emptyMessage = ''; if (isViewingTrash) { emptyMessage = filter ? 'Không tìm thấy ghi chú rác nào khớp.' : 'Thùng rác trống.'; } else if (isViewingArchived) { emptyMessage = filter ? 'Không tìm thấy ghi chú lưu trữ nào khớp.' : 'Lưu trữ trống.'; } else { emptyMessage = filter ? 'Không tìm thấy ghi chú nào khớp.' : 'Chưa có ghi chú nào. Nhấn "+" để thêm.'; } notesContainer.innerHTML = `<p class="empty-state">${emptyMessage}</p>`; if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null; } } else { notesToDisplay.forEach(note => { const noteElement = renderNoteElement(note); notesContainer.appendChild(noteElement); }); initSortable(); } window.scrollTo({ top: scrollY, behavior: 'instant' }); };

// =====================================================================
//  Modal Handling Functions (Định nghĩa TRƯỚC setupEventListeners)
// =====================================================================
const showSettingsModal = () => { const currentTheme = getStoredPreference(THEME_NAME_KEY, DEFAULT_THEME); const currentAccent = getStoredPreference(ACCENT_COLOR_KEY, DEFAULT_ACCENT_COLOR); const currentFont = getStoredPreference(FONT_FAMILY_KEY, DEFAULT_FONT_FAMILY); const currentSizeScale = parseFloat(getStoredPreference(FONT_SIZE_SCALE_KEY, DEFAULT_FONT_SIZE_SCALE.toString())); updateThemeSelectionUI(currentTheme); updateAccentColorSelectionUI(currentAccent); updateFontFamilySelectionUI(currentFont); updateFontSizeUI(isNaN(currentSizeScale) ? DEFAULT_FONT_SIZE_SCALE : currentSizeScale); settingsModal.classList.add('visible'); settingsModal.classList.remove('hidden'); closeSettingsModalBtn.focus(); };
const hideSettingsModal = () => { settingsModal.classList.remove('visible'); settingsModal.addEventListener('transitionend', (e) => { if (e.target === settingsModal) settingsModal.classList.add('hidden'); }, { once: true }); };
// showTemplateModal, hideTemplateModal đã được định nghĩa ở trên trong phần Template UI Handlers

// =====================================================================
//  Event Listeners Setup Function
// =====================================================================
const setupEventListeners = () => {
    // --- CÀI ĐẶT GIAO DIỆN ---
    quickThemeToggleBtn.addEventListener('click', quickToggleTheme);
    settingsBtn.addEventListener('click', showSettingsModal);
    closeSettingsModalBtn.addEventListener('click', hideSettingsModal);
    settingsModal.addEventListener('click', (event) => { if (event.target === settingsModal) hideSettingsModal(); });
    if (themeOptionsContainer) {
        themeOptionsContainer.addEventListener('click', (event) => {
            const targetButton = event.target.closest('.theme-option-btn');
            if (targetButton && targetButton.dataset.theme) { const selectedTheme = targetButton.dataset.theme; if (VALID_THEMES.includes(selectedTheme)) { applyTheme(selectedTheme); localStorage.setItem(THEME_NAME_KEY, selectedTheme); if (selectedTheme !== 'light' && selectedTheme !== 'dark') { localStorage.setItem(LAST_CUSTOM_THEME_KEY, selectedTheme); } } }
        });
    }
    if (accentColorOptionsContainer) {
         accentColorOptionsContainer.addEventListener('click', (event) => {
             const targetSwatch = event.target.closest('.accent-swatch');
             if (targetSwatch && targetSwatch.dataset.color) { const selectedColor = targetSwatch.dataset.color; applyAccentColor(selectedColor); localStorage.setItem(ACCENT_COLOR_KEY, selectedColor); }
         });
     }
    if (fontFamilySelect) {
         fontFamilySelect.addEventListener('change', (event) => {
             const selectedFont = event.target.value; applyFontFamily(selectedFont); localStorage.setItem(FONT_FAMILY_KEY, selectedFont);
         });
     }
    const debouncedSaveFontSize = debounce((scale) => { localStorage.setItem(FONT_SIZE_SCALE_KEY, scale.toString()); }, 500);
    if (fontSizeSlider) {
         fontSizeSlider.addEventListener('input', (event) => {
             const scale = parseFloat(event.target.value); if (!isNaN(scale)) { applyFontSize(scale); debouncedSaveFontSize(scale); }
         });
     }
     if (resetFontSizeBtn) {
         resetFontSizeBtn.addEventListener('click', () => {
             const defaultScale = DEFAULT_FONT_SIZE_SCALE; applyFontSize(defaultScale); localStorage.setItem(FONT_SIZE_SCALE_KEY, defaultScale.toString()); if (fontSizeSlider) fontSizeSlider.value = defaultScale;
         });
     }

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

    // --- CHUYỂN VIEW ARCHIVE/TRASH ---
    viewArchiveBtn.addEventListener('click', () => { const wasViewingArchive = isViewingArchived; isViewingArchived = !wasViewingArchive; if (isViewingArchived) isViewingTrash = false; searchInput.value = ''; displayNotes(); });
    viewTrashBtn.addEventListener('click', () => { const wasViewingTrash = isViewingTrash; isViewingTrash = !wasViewingTrash; if (isViewingTrash) isViewingArchived = false; searchInput.value = ''; displayNotes(); });
    emptyTrashBtn.addEventListener('click', handleEmptyTrash);

    // --- TAG INPUTS ---
    newNoteTags.addEventListener('input', handleTagInput); newNoteTags.addEventListener('blur', handleTagInputBlur, true); newNoteTags.addEventListener('keydown', handleTagInputKeydown);
    notesContainer.addEventListener('input', (e) => { if (e.target.matches('.edit-tags-input')) handleTagInput(e); }); notesContainer.addEventListener('blur', (e) => { if (e.target.matches('.edit-tags-input')) handleTagInputBlur(e); }, true); notesContainer.addEventListener('keydown', (e) => { if (e.target.matches('.edit-tags-input')) handleTagInputKeydown(e); });

    // --- TEMPLATE FEATURES ---
    manageTemplatesBtn.addEventListener('click', showTemplateModal); closeTemplateModalBtn.addEventListener('click', hideTemplateModal); templateModal.addEventListener('click', (event) => { if (event.target === templateModal) { if (templateEditPanel.classList.contains('hidden')) hideTemplateModal(); } }); showAddTemplatePanelBtn.addEventListener('click', () => showTemplateEditPanel()); cancelEditTemplateBtn.addEventListener('click', hideTemplateEditPanel); saveTemplateBtn.addEventListener('click', addOrUpdateTemplate); templateSelect.addEventListener('change', applyTemplate);

    // --- NOTE ACTIONS (EVENT DELEGATION) ---
    notesContainer.addEventListener('click', (event) => {
        const target = event.target; const noteElement = target.closest('.note'); if (!noteElement) return;
        const tagButton = target.closest('.tag-badge'); if (tagButton?.dataset.tag) { event.preventDefault(); event.stopPropagation(); searchInput.value = `#${tagButton.dataset.tag}`; searchInput.dispatchEvent(new Event('input', { bubbles: true })); searchInput.focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
        const readMoreButton = target.closest('.read-more-btn'); if (readMoreButton) { event.stopPropagation(); const noteId = parseInt(noteElement.dataset.id); const note = notes.find(n => n.id === noteId); if (note) showFullNoteModal(note.title, note.text); return; }
        const noteId = parseInt(noteElement.dataset.id); const noteIndex = notes.findIndex(note => note.id === noteId); if (noteIndex === -1) { console.error("Không tìm thấy data cho note ID:", noteId); return; }
        const isEditingThisNote = noteElement.querySelector('textarea.edit-input');
        if (isEditingThisNote) { if (target.closest('.save-edit-btn')) handleNoteSaveEdit(noteElement, noteId, noteIndex); else if (target.closest('.pin-btn')) handleNotePin(noteId, noteIndex); return; }
        if (target.closest('.pin-btn') && !isViewingArchived && !isViewingTrash) handleNotePin(noteId, noteIndex);
        else if (target.closest('.delete-btn')) handleNoteDelete(noteId, noteIndex);
        else if (target.closest('.archive-btn') && !isViewingTrash && !isViewingArchived) handleNoteArchive(noteId, noteIndex);
        else if (target.closest('.unarchive-btn') && isViewingArchived) handleNoteUnarchive(noteId, noteIndex);
        else if (target.closest('.restore-btn') && isViewingTrash) handleNoteRestore(noteId, noteIndex);
        else if (target.closest('.delete-permanent-btn') && isViewingTrash) handleNoteDeletePermanent(noteId, noteIndex);
        else if (target.closest('.edit-btn') && !isViewingArchived && !isViewingTrash) handleNoteEdit(noteElement, noteId, noteIndex);
    });

    // --- GLOBAL KEYDOWN LISTENER ---
    document.addEventListener('keydown', (event) => {
        const activeElement = document.activeElement;
        const isTyping = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') && activeElement !== searchInput;
        const isTemplateModalOpen = templateModal.classList.contains('visible');
        const isNoteModalOpen = !!document.querySelector('.note-modal.visible');
        const isSettingsModalOpen = settingsModal.classList.contains('visible');
        const isSuggestionBoxOpen = !!document.getElementById(SUGGESTION_BOX_ID);
        const isEditingNote = activeElement?.closest('.note')?.querySelector('.edit-input') === activeElement || activeElement?.closest('.note')?.querySelector('.edit-title-input') === activeElement || activeElement?.closest('.note')?.querySelector('.edit-tags-input') === activeElement;
        const isEditingTemplate = templateEditPanel.contains(activeElement);

        if (event.key === 'Escape') {
             if (isSuggestionBoxOpen) hideTagSuggestions();
             else if (isSettingsModalOpen) hideSettingsModal();
             else if (isNoteModalOpen) document.querySelector('.note-modal.visible .close-modal-btn')?.click();
             else if (isTemplateModalOpen) { if (!templateEditPanel.classList.contains('hidden')) hideTemplateEditPanel(); else hideTemplateModal(); }
             else if (!addNotePanel.classList.contains('hidden')) hideAddPanel();
             else if (isEditingNote) { const editingNoteElement = activeElement.closest('.note'); if (editingNoteElement && confirm("Bạn có muốn hủy bỏ các thay đổi và đóng chỉnh sửa ghi chú không?")) { displayNotes(searchInput.value); if (addNotePanel.classList.contains('hidden')) showAddPanelBtn.classList.remove('hidden'); if (sortableInstance) sortableInstance.option('disabled', false); } }
             else if (activeElement === searchInput && searchInput.value !== '') { searchInput.value = ''; displayNotes(); }
             event.preventDefault(); event.stopPropagation(); return;
        }

        if (isNoteModalOpen || isTemplateModalOpen || isSettingsModalOpen) { if (!((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's' && isEditingTemplate)) return; }
        if (isTyping && !isEditingNote && !isEditingTemplate) return;

        const isCtrlOrCmd = event.metaKey || event.ctrlKey;
        if (isCtrlOrCmd && event.key.toLowerCase() === 'n') { event.preventDefault(); if (addNotePanel.classList.contains('hidden') && !notesContainer.querySelector('.note .edit-input')) showAddPanel(); }
        else if (isCtrlOrCmd && event.key.toLowerCase() === 's') { if (isEditingNote) { event.preventDefault(); activeElement.closest('.note')?.querySelector('.save-edit-btn')?.click(); } else if (addNotePanel.contains(activeElement)) { event.preventDefault(); addNoteBtn.click(); } else if (isEditingTemplate) { event.preventDefault(); saveTemplateBtn.click(); } }
        else if (isCtrlOrCmd && event.key.toLowerCase() === 'f') { event.preventDefault(); searchInput.focus(); searchInput.select(); }
    });

}; // End setupEventListeners


// =====================================================================
//  Initial Load Function
// =====================================================================
const loadNotesAndInit = () => {
     loadNotes();
     loadTemplates();
     applyAllAppearanceSettings();
     isViewingArchived = false;
     isViewingTrash = false;
     displayNotes();
     populateTemplateDropdown();
     setupEventListeners();
};

// =====================================================================
//  Start the application
// =====================================================================
loadNotesAndInit();
