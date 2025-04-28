// =====================================================================
//  Constants & State Variables
// =====================================================================
const NOTES_STORAGE_KEY = 'startNotesData';
const THEME_STORAGE_KEY = 'themePref';
const SUGGESTION_BOX_ID = 'tag-suggestion-box';
const DEBOUNCE_DELAY = 1500; // Delay for auto-save in milliseconds

let notes = [];
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

// =====================================================================
//  DOM References
// =====================================================================
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const searchInput = document.getElementById('search-input');
const notesContainer = document.getElementById('notes-container');
const addNotePanel = document.getElementById('add-note-panel');
const newNoteTitle = document.getElementById('new-note-title');
const newNoteText = document.getElementById('new-note-text');
const newNoteTags = document.getElementById('new-note-tags');
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

// =====================================================================
//  Utility Functions
// =====================================================================
const parseTags = (tagString) => { if (!tagString) return []; return tagString.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag !== ''); };
const debounce = (func, delay) => { let timeoutId; return function(...args) { clearTimeout(timeoutId); timeoutId = setTimeout(() => { func.apply(this, args); }, delay); }; };
const escapeRegExp = (string) => { return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
const formatTimestamp = (timestamp) => { if (!timestamp) return ''; return new Date(timestamp).toLocaleString('vi-VN'); }
const escapeHTML = (str) => {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}

// =====================================================================
//  Theme Management
// =====================================================================
const applyTheme = (theme) => { if (theme === 'dark') { document.body.classList.add('dark-mode'); } else { document.body.classList.remove('dark-mode'); } };
const toggleTheme = () => { const currentThemeIsDark = document.body.classList.contains('dark-mode'); const newTheme = currentThemeIsDark ? 'light' : 'dark'; applyTheme(newTheme); localStorage.setItem(THEME_STORAGE_KEY, newTheme); };

// =====================================================================
//  Note Data Management
// =====================================================================
const saveNotes = () => {
    try {
        const notesToSave = notes.map(note => ({
            id: note.id,
            title: note.title || '',
            text: note.text,
            tags: note.tags || [],
            pinned: note.pinned || false,
            lastModified: note.lastModified || note.id,
            archived: note.archived || false,
            color: note.color || null,
            deleted: note.deleted || false,
            deletedTimestamp: note.deletedTimestamp || null
        }));
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notesToSave));
    } catch (e) {
        console.error("Lỗi lưu ghi chú vào localStorage:", e);
        if (e.name === 'QuotaExceededError') {
            alert("Lỗi: Dung lượng lưu trữ cục bộ đã đầy...");
        } else {
            alert("Đã xảy ra lỗi khi cố gắng lưu ghi chú.");
        }
    }
};

const loadNotes = () => {
    const storedNotes = localStorage.getItem(NOTES_STORAGE_KEY);
    if (storedNotes) {
        try {
            notes = JSON.parse(storedNotes).map(note => ({
                ...note,
                title: note.title || '',
                tags: note.tags || [],
                pinned: note.pinned || false,
                lastModified: note.lastModified || note.id,
                archived: note.archived || false,
                color: note.color || null,
                deleted: note.deleted || false,
                deletedTimestamp: note.deletedTimestamp || null
            }));
        } catch (e) {
            console.error("Lỗi đọc dữ liệu ghi chú từ localStorage:", e);
            notes = [];
        }
    } else {
        notes = [];
    }
};

const addNote = () => {
    const noteTitle = newNoteTitle.value.trim();
    const noteText = newNoteText.value;
    const tagString = newNoteTags.value;

    if (noteText.trim() || noteTitle) {
        const tags = parseTags(tagString);
        const now = Date.now();
        const newNote = {
            id: now,
            title: noteTitle,
            text: noteText,
            tags: tags,
            pinned: false,
            lastModified: now,
            archived: false,
            color: null,
            deleted: false
        };
        notes.unshift(newNote);
        saveNotes();
        if (isViewingArchived || isViewingTrash) {
            isViewingArchived = false;
            isViewingTrash = false;
        }
        displayNotes(searchInput.value);
        hideAddPanel();
    } else {
        alert("Vui lòng nhập Tiêu đề hoặc Nội dung cho ghi chú!");
    }
};


// =====================================================================
//  Helper Functions & Event Handlers
// =====================================================================

const hideTagSuggestions = () => {
    const suggestionBox = document.getElementById(SUGGESTION_BOX_ID);
    if (suggestionBox) {
        suggestionBox.remove();
    }
    activeTagInputElement = null;
    document.removeEventListener('mousedown', handleClickOutsideSuggestions);
};

const handleClickOutsideSuggestions = (event) => {
    const suggestionBox = document.getElementById(SUGGESTION_BOX_ID);
    if (activeTagInputElement && suggestionBox &&
        !activeTagInputElement.contains(event.target) &&
        !suggestionBox.contains(event.target))
    {
        hideTagSuggestions();
    }
};

// --- Note Action Handlers ---
const handleNotePin = (noteId, noteIndex) => {
    notes[noteIndex].pinned = !notes[noteIndex].pinned;
    saveNotes();
    displayNotes(searchInput.value);
};

const handleNoteDelete = (noteId, noteIndex) => {
    hideTagSuggestions();
    notes[noteIndex].deleted = true;
    notes[noteIndex].deletedTimestamp = Date.now();
    notes[noteIndex].pinned = false;
    notes[noteIndex].archived = false;
    notes[noteIndex].lastModified = Date.now();
    saveNotes();
    displayNotes(searchInput.value);
    if (!addNotePanel.classList.contains('hidden')) hideAddPanel();
    else showAddPanelBtn.classList.remove('hidden');
};

const handleNoteRestore = (noteId, noteIndex) => {
    notes[noteIndex].deleted = false;
    delete notes[noteIndex].deletedTimestamp;
    notes[noteIndex].lastModified = Date.now();
    saveNotes();
    displayNotes(searchInput.value);
};

const handleNoteDeletePermanent = (noteId, noteIndex) => {
    const noteIdentifier = notes[noteIndex].title || `ghi chú #${noteId}`;
    const confirmMessage = `Bạn chắc chắn muốn xóa vĩnh viễn ghi chú "${noteIdentifier}"? Hành động này không thể hoàn tác.`;
    if (confirm(confirmMessage)) {
        notes.splice(noteIndex, 1);
        saveNotes();
        displayNotes(searchInput.value);
    }
};

const handleEmptyTrash = () => {
    const notesInTrash = notes.filter(note => note.deleted);
    if (notesInTrash.length === 0) {
        alert("Thùng rác trống.");
        return;
    }
    const confirmMessage = `Bạn chắc chắn muốn xóa vĩnh viễn tất cả ${notesInTrash.length} ghi chú trong thùng rác? Hành động này không thể hoàn tác.`;
    if (confirm(confirmMessage)) {
        notes = notes.filter(note => !note.deleted);
        saveNotes();
        displayNotes(searchInput.value);
    }
};

const handleNoteArchive = (noteId, noteIndex) => {
    notes[noteIndex].archived = true;
    notes[noteIndex].pinned = false;
    notes[noteIndex].deleted = false;
    notes[noteIndex].lastModified = Date.now();
    saveNotes();
    displayNotes(searchInput.value);
};

const handleNoteUnarchive = (noteId, noteIndex) => {
    notes[noteIndex].archived = false;
    notes[noteIndex].lastModified = Date.now();
    const noteToUnarchive = notes.splice(noteIndex, 1)[0];
    notes.unshift(noteToUnarchive);
    saveNotes();
    displayNotes(searchInput.value);
};

// --- Note Editing & Saving Logic ---

/**
 * Updates the data for a specific note and saves the notes array.
 * @param {number} noteIndex - The index of the note in the notes array.
 * @param {object} newData - An object containing the new data { title, text, tags, color }.
 * @returns {boolean} - True if any data was actually changed and saved, false otherwise.
 */
const updateNoteData = (noteIndex, newData) => {
    if (noteIndex < 0 || noteIndex >= notes.length) return false; // Index out of bounds check
    const note = notes[noteIndex];
    if (!note) return false;

    const { title, text, tags, color } = newData;

    const titleChanged = note.title !== title;
    const textChanged = note.text !== text;
    // Robust check for tags array change
    const currentTags = note.tags || [];
    const newTags = tags || [];
    const tagsChanged = !(currentTags.length === newTags.length && currentTags.sort().every((value, index) => value === newTags.sort()[index]));
    const colorChanged = note.color !== color;

    const contentChanged = titleChanged || textChanged || tagsChanged;
    const anyPropertyChanged = contentChanged || colorChanged;

    if (anyPropertyChanged) {
        note.title = title;
        note.text = text;
        note.tags = newTags;
        note.color = color;

        if (contentChanged) {
            note.lastModified = Date.now();
        }

        saveNotes();
        // console.log(`Note ${note.id} data updated`); // Optional log
        return true;
    }
    return false;
};


const debouncedAutoSave = debounce((noteElement, noteIndex) => {
    // Check if the edit elements still exist for this specific note
    const editTitleInputCheck = noteElement.querySelector('input.edit-title-input');
    const editInputCheck = noteElement.querySelector('textarea.edit-input');

    if (!editInputCheck && !editTitleInputCheck) {
        // console.log(`Auto-save for note ${noteIndex} aborted: Edit elements removed.`);
        return; // Stop if edit mode was closed before debounce fired
    }

    console.log(`Attempting auto-save for note index: ${noteIndex}`);

    // Get current values from the inputs within the specific noteElement
    const newTitle = editTitleInputCheck ? editTitleInputCheck.value.trim() : notes[noteIndex]?.title;
    const newText = editInputCheck ? editInputCheck.value : notes[noteIndex]?.text;
    const editTagsInputCheck = noteElement.querySelector('input.edit-tags-input');
    const newTagString = editTagsInputCheck ? editTagsInputCheck.value : (notes[noteIndex]?.tags || []).join(', ');
    const newTags = parseTags(newTagString);
    // Get color from temporary dataset attribute or fallback to current note color
    const selectedColorValue = noteElement.dataset.selectedColor ?? notes[noteIndex]?.color;
    // Ensure null is used for default/empty color, not empty string
    const newColor = selectedColorValue === '' || selectedColorValue === null ? null : selectedColorValue;

    // Prevent saving empty note automatically
     if (!newTitle && !newText.trim()) {
         console.log("Auto-save skipped: Title and Text are empty.");
         return;
     }

    // Update data and provide feedback
    const saved = updateNoteData(noteIndex, {
        title: newTitle,
        text: newText,
        tags: newTags,
        color: newColor
    });

    if (saved) {
        noteElement.classList.add('note-autosaved');
        setTimeout(() => {
            // Check if class still exists before removing (element might have been re-rendered)
             noteElement?.classList.remove('note-autosaved');
        }, 600);
    }

}, DEBOUNCE_DELAY);


const handleNoteEdit = (noteElement, noteId, noteIndex) => {
    if (isViewingTrash || isViewingArchived) return; // Prevent editing in trash/archive

    hideTagSuggestions();
    if (sortableInstance) sortableInstance.option('disabled', true);
    showAddPanelBtn.classList.add('hidden');

    const noteData = notes[noteIndex];

    // --- Create Edit Inputs ---
    const editTitleInput = document.createElement('input');
    editTitleInput.type = 'text';
    editTitleInput.classList.add('edit-title-input');
    editTitleInput.placeholder = 'Tiêu đề...';
    editTitleInput.value = noteData.title || '';

    const editInput = document.createElement('textarea');
    editInput.classList.add('edit-input');
    editInput.value = noteData.text;

    const editTagsInput = document.createElement('input');
    editTagsInput.type = 'text';
    editTagsInput.classList.add('edit-tags-input');
    editTagsInput.placeholder = 'Tags (cách nhau bằng dấu phẩy)...';
    editTagsInput.value = (noteData.tags || []).join(', ');
    editTagsInput.autocomplete = 'off';

    // --- Create Color Selector ---
    const colorSelectorContainer = document.createElement('div');
    colorSelectorContainer.classList.add('color-selector-container');
    colorSelectorContainer.setAttribute('role', 'radiogroup');
    colorSelectorContainer.setAttribute('aria-label', 'Chọn màu ghi chú');
    // Temporarily store current/selected color on the main note element
    noteElement.dataset.selectedColor = noteData.color || '';

    NOTE_COLORS.forEach(color => {
        const swatchBtn = document.createElement('button');
        swatchBtn.type = 'button';
        swatchBtn.classList.add('color-swatch-btn');
        swatchBtn.dataset.colorValue = color.value || '';
        swatchBtn.title = color.name;
        swatchBtn.setAttribute('role', 'radio');
        const isCurrentColor = (noteData.color === color.value) || (!noteData.color && !color.value);
        swatchBtn.setAttribute('aria-checked', isCurrentColor ? 'true' : 'false');
        if (isCurrentColor) swatchBtn.classList.add('selected');

        if (color.value) swatchBtn.style.backgroundColor = color.hex;
        else {
            swatchBtn.classList.add('default-color-swatch');
            swatchBtn.innerHTML = '&#x2715;';
        }

        // --- Attach Listener for Color Change & AutoSave ---
        swatchBtn.addEventListener('click', () => {
            const selectedValue = swatchBtn.dataset.colorValue;
            noteElement.dataset.selectedColor = selectedValue; // Update temp storage

            colorSelectorContainer.querySelectorAll('.color-swatch-btn').forEach(btn => {
                const isSelected = btn === swatchBtn;
                btn.classList.toggle('selected', isSelected);
                btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
            });
            // Update note visual style immediately
            NOTE_COLORS.forEach(c => { if (c.value) noteElement.classList.remove(c.value); });
            if (selectedValue) noteElement.classList.add(selectedValue);

            // Trigger auto-save
            debouncedAutoSave(noteElement, noteIndex);
        });
        colorSelectorContainer.appendChild(swatchBtn);
    });

    // --- Create Save Button ---
    const saveBtn = document.createElement('button');
    saveBtn.classList.add('save-edit-btn');
    saveBtn.textContent = 'Lưu';

    // --- Hide Original Elements & Insert Edit Elements ---
    const actionsElement = noteElement.querySelector('.note-actions');
    const contentElement = noteElement.querySelector('.note-content');
    const titleElement = noteElement.querySelector('.note-title');
    const tagsElement = noteElement.querySelector('.note-tags');
    const timestampElement = noteElement.querySelector('.note-timestamp');
    const bookmarkIcon = noteElement.querySelector('.pinned-bookmark-icon');

    let buttonsToKeepHTML = actionsElement?.querySelector('.pin-btn')?.outerHTML || ''; // Keep pin button

    if(bookmarkIcon) bookmarkIcon.style.display = 'none';
    if(titleElement) titleElement.style.display = 'none';
    if(contentElement) contentElement.style.display = 'none';
    if(tagsElement) tagsElement.style.display = 'none';
    if(timestampElement) timestampElement.style.display = 'none';

    const insertBeforeElement = contentElement || tagsElement || timestampElement || actionsElement; // Find first available element to insert before
    if (insertBeforeElement) {
        noteElement.insertBefore(editTitleInput, insertBeforeElement);
        noteElement.insertBefore(editInput, insertBeforeElement);
        noteElement.insertBefore(editTagsInput, insertBeforeElement);
        noteElement.insertBefore(colorSelectorContainer, insertBeforeElement);
    } else { // Fallback if note structure is unexpected
        noteElement.appendChild(editTitleInput);
        noteElement.appendChild(editInput);
        noteElement.appendChild(editTagsInput);
        noteElement.appendChild(colorSelectorContainer);
    }


    if(actionsElement) {
        actionsElement.innerHTML = buttonsToKeepHTML; // Clear old buttons, keep pin
        actionsElement.appendChild(saveBtn); // Add save button
    }

    // --- Attach Input Listeners for AutoSave & Suggestions ---
    editTitleInput.addEventListener('input', () => debouncedAutoSave(noteElement, noteIndex));
    editInput.addEventListener('input', () => debouncedAutoSave(noteElement, noteIndex));
    editTagsInput.addEventListener('input', (event) => {
        handleTagInput(event); // Update suggestions
        debouncedAutoSave(noteElement, noteIndex); // Trigger auto-save
    });
    // Add blur/keydown for tag suggestions specifically
    editTagsInput.addEventListener('blur', handleTagInputBlur);
    editTagsInput.addEventListener('keydown', handleTagInputKeydown);

    editTitleInput.focus(); // Focus title first
};


const handleNoteSaveEdit = (noteElement, noteId, noteIndex) => {
    // No need to cancel debounce here if updateNoteData handles changes correctly

    const editTitleInput = noteElement.querySelector('input.edit-title-input');
    const editInput = noteElement.querySelector('textarea.edit-input');
    const editTagsInput = noteElement.querySelector('input.edit-tags-input');

    // Get final values
    const newTitle = editTitleInput ? editTitleInput.value.trim() : notes[noteIndex]?.title;
    const newText = editInput ? editInput.value : notes[noteIndex]?.text;
    const newTagString = editTagsInput ? editTagsInput.value : (notes[noteIndex]?.tags || []).join(', ');
    const newTags = parseTags(newTagString);
    const selectedColorValue = noteElement.dataset.selectedColor ?? notes[noteIndex]?.color;
    const newColor = selectedColorValue === '' || selectedColorValue === null ? null : selectedColorValue;

    // Final validation before manual save
    if (!newTitle && !newText.trim()) {
        alert("Tiêu đề hoặc Nội dung không được để trống hoàn toàn khi lưu!");
        return; // Keep edit mode open
    }

    // Update data using the reusable function
    updateNoteData(noteIndex, {
        title: newTitle,
        text: newText,
        tags: newTags,
        color: newColor
    });

    // Clean up temporary data
    delete noteElement.dataset.selectedColor;

    // Close edit mode and refresh display
    hideTagSuggestions();
    displayNotes(searchInput.value);
    showAddPanelBtn.classList.remove('hidden');
    if(sortableInstance) sortableInstance.option('disabled', false);
};

// --- Other Helper Functions (Checklist, Modal, Render, Drag, Tags, AddPanel, Import/Export) ---
// (Keep the existing versions of these functions from the previous update,
//  ensuring renderNoteElement correctly disables checklists in trash view, etc.)

const handleChecklistToggle = (noteId, clickedCheckbox) => {
    if (isViewingTrash) return; // Prevent toggle in trash
    const noteElementDOM = notesContainer.querySelector(`.note[data-id="${noteId}"]`);
    if (noteElementDOM && noteElementDOM.querySelector('.edit-input')) {
        clickedCheckbox.checked = !clickedCheckbox.checked; // Revert visual state
        return; // Prevent toggle while editing
    }

    const noteIndex = notes.findIndex(note => note.id === noteId);
    if (noteIndex === -1) return;
    const noteData = notes[noteIndex];
    const noteText = noteData.text;
    const noteContentElement = noteElementDOM?.querySelector('.note-content');
    if (!noteContentElement) return;

    const allCheckboxesInNote = Array.from(noteContentElement.querySelectorAll('input[type="checkbox"].task-list-item-checkbox'));
    const checkboxIndex = allCheckboxesInNote.indexOf(clickedCheckbox);
    if (checkboxIndex === -1) {
        clickedCheckbox.checked = !clickedCheckbox.checked; return;
    }

    try {
        const taskRegex = /^- \[( |x|X)\]/gm;
        let currentMatchIndex = 0; let updated = false;
        const updatedText = noteText.replace(taskRegex, (match, currentState) => {
            if (currentMatchIndex === checkboxIndex) {
                const newState = (currentState === ' ' ? 'x' : ' ');
                updated = true; currentMatchIndex++; return `- [${newState}]`;
            } else { currentMatchIndex++; return match; }
        });
        if (updated) {
            notes[noteIndex].text = updatedText;
            notes[noteIndex].lastModified = Date.now(); saveNotes();
            displayNotes(searchInput.value); // Re-render needed to show text change/strikethrough
        } else { clickedCheckbox.checked = !clickedCheckbox.checked; }
    } catch (error) { console.error("Error updating checklist:", error); clickedCheckbox.checked = !clickedCheckbox.checked; alert("Lỗi cập nhật checklist."); }
};

const showFullNoteModal = (title, noteText) => {
    const existingModal = document.querySelector('.note-modal');
    if (existingModal) { existingModal.remove(); }
    const modal = document.createElement('div');
    modal.classList.add('note-modal');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'note-modal-title');
    const modalContent = document.createElement('div');
    modalContent.classList.add('modal-content');
    const modalHeader = document.createElement('div');
    modalHeader.classList.add('modal-header');
    const modalTitle = document.createElement('h2');
    modalTitle.id = 'note-modal-title';
    modalTitle.textContent = title || 'Ghi chú';
    const closeModalBtn = document.createElement('button');
    closeModalBtn.classList.add('close-modal-btn');
    closeModalBtn.innerHTML = '&times;';
    closeModalBtn.title = 'Đóng';
    closeModalBtn.setAttribute('aria-label', 'Đóng cửa sổ xem ghi chú');
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeModalBtn);
    const modalBody = document.createElement('div');
    modalBody.classList.add('modal-body');
    if (typeof marked === 'function') {
        try {
            modalBody.innerHTML = marked.parse(noteText || '');
            modalBody.querySelectorAll('input[type="checkbox"]').forEach(checkbox => { checkbox.disabled = true; checkbox.style.cursor = 'not-allowed'; });
        } catch (e) { modalBody.textContent = escapeHTML(noteText || ''); }
    } else { modalBody.textContent = escapeHTML(noteText || ''); }
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    requestAnimationFrame(() => { modal.classList.add('visible'); });
    closeModalBtn.focus();
    const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstElement = focusableElements[0]; const lastElement = focusableElements[focusableElements.length - 1];
    const closeFunc = () => { modal.classList.remove('visible'); modal.addEventListener('transitionend', () => { if (modal.parentNode) modal.remove(); document.removeEventListener('keydown', handleModalKeyDown); }, { once: true }); };
    const handleModalKeyDown = (event) => { if (event.key === 'Escape') closeFunc(); if (event.key === 'Tab') { if (event.shiftKey) { if (document.activeElement === firstElement) { lastElement.focus(); event.preventDefault(); } } else { if (document.activeElement === lastElement) { firstElement.focus(); event.preventDefault(); } } } };
    closeModalBtn.addEventListener('click', closeFunc);
    modal.addEventListener('click', (event) => { if (event.target === modal) closeFunc(); });
    document.addEventListener('keydown', handleModalKeyDown);
};

const renderNoteElement = (note) => { // Keep the version from previous update (Trash feature)
    const noteElement = document.createElement('div'); noteElement.classList.add('note'); noteElement.dataset.id = note.id;
    NOTE_COLORS.forEach(color => { if (color.value) noteElement.classList.remove(color.value); }); if (note.color) noteElement.classList.add(note.color);
    if (note.pinned && !isViewingArchived && !isViewingTrash) { noteElement.classList.add('pinned-note'); const bookmarkIcon = document.createElement('span'); bookmarkIcon.classList.add('pinned-bookmark-icon'); bookmarkIcon.innerHTML = '&#128278;'; bookmarkIcon.setAttribute('aria-hidden', 'true'); noteElement.appendChild(bookmarkIcon); }
    if (note.title) { const titleElement = document.createElement('h3'); titleElement.classList.add('note-title'); let titleHTML = escapeHTML(note.title); const filter = searchInput.value.toLowerCase().trim(); const isTagSearch = filter.startsWith('#'); if (!isTagSearch && filter) { try { const highlightRegex = new RegExp(`(${escapeRegExp(filter)})`, 'gi'); titleHTML = titleHTML.replace(highlightRegex, '<mark>$1</mark>'); } catch(e) {} } titleElement.innerHTML = titleHTML; noteElement.appendChild(titleElement); }
    const contentElement = document.createElement('div'); contentElement.classList.add('note-content'); let originalParsedContentHTML = ''; if (typeof marked === 'function') { try { originalParsedContentHTML = marked.parse(note.text || ''); } catch(e) { originalParsedContentHTML = escapeHTML(note.text || '').replace(/\n/g, '<br>'); } } else { originalParsedContentHTML = escapeHTML(note.text || '').replace(/\n/g, '<br>'); } let displayContentHTML = originalParsedContentHTML; const filterContent = searchInput.value.toLowerCase().trim(); const isTagSearchContent = filterContent.startsWith('#'); if (!isTagSearchContent && filterContent) { try { const tempDiv = document.createElement('div'); tempDiv.innerHTML = originalParsedContentHTML; const textNodes = []; const walk = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false); let node; while(node = walk.nextNode()) { if (node.parentElement && !['SCRIPT', 'STYLE', 'PRE', 'CODE', 'MARK', 'A'].includes(node.parentElement.tagName.toUpperCase())) textNodes.push(node); } const highlightRegex = new RegExp(`(${escapeRegExp(filterContent)})`, 'gi'); textNodes.forEach(textNode => { const text = textNode.nodeValue; if(text && text.toLowerCase().includes(filterContent)) { const span = document.createElement('span'); span.innerHTML = text.replace(highlightRegex, '<mark>$1</mark>'); textNode.parentNode.replaceChild(span, textNode); } }); displayContentHTML = tempDiv.innerHTML; } catch (e) { try { if (!originalParsedContentHTML.match(/<[^>]+>/)) { const highlightRegexSimple = new RegExp(`(${escapeRegExp(filterContent)})`, 'gi'); displayContentHTML = originalParsedContentHTML.replace(highlightRegexSimple, '<mark>$1</mark>'); } } catch (re) {} } } contentElement.innerHTML = displayContentHTML;
    const checkboxes = contentElement.querySelectorAll('input[type="checkbox"]'); checkboxes.forEach(checkbox => { checkbox.disabled = isViewingTrash; checkbox.classList.add('task-list-item-checkbox'); if(isViewingTrash) checkbox.style.cursor = 'not-allowed'; const parentLi = checkbox.closest('li'); if (parentLi) parentLi.classList.add('task-list-item'); }); noteElement.appendChild(contentElement);
    requestAnimationFrame(() => { if (contentElement.scrollHeight > contentElement.clientHeight + 2) { contentElement.classList.add('has-overflow'); const readMoreBtn = document.createElement('button'); readMoreBtn.textContent = 'Xem thêm'; readMoreBtn.classList.add('read-more-btn'); readMoreBtn.type = 'button'; readMoreBtn.addEventListener('click', (e) => { e.stopPropagation(); showFullNoteModal(note.title, note.text); }); if (!noteElement.querySelector('.read-more-btn')) noteElement.appendChild(readMoreBtn); } else { contentElement.classList.remove('has-overflow'); const existingBtn = noteElement.querySelector('.read-more-btn'); if(existingBtn) existingBtn.remove(); } });
    const tagsElement = document.createElement('div'); tagsElement.classList.add('note-tags'); if (note.tags && note.tags.length > 0) { note.tags.forEach(tag => { const tagBadge = document.createElement('button'); tagBadge.classList.add('tag-badge'); tagBadge.textContent = `#${tag}`; tagBadge.dataset.tag = tag; tagBadge.type = 'button'; tagsElement.appendChild(tagBadge); }); } noteElement.appendChild(tagsElement);
    const timestampElement = document.createElement('small'); timestampElement.classList.add('note-timestamp'); const creationDate = formatTimestamp(note.id); let timestampText = `Tạo: ${creationDate}`; if (note.lastModified && note.lastModified > note.id + 60000) { const modifiedDate = formatTimestamp(note.lastModified); timestampText += ` (Sửa: ${modifiedDate})`; } if (isViewingTrash && note.deletedTimestamp) { const deletedDate = formatTimestamp(note.deletedTimestamp); timestampText += ` (Xóa: ${deletedDate})`; } timestampElement.textContent = timestampText; noteElement.appendChild(timestampElement);
    const actionsElement = document.createElement('div'); actionsElement.classList.add('note-actions');
    if (isViewingTrash) { const restoreBtn = document.createElement('button'); restoreBtn.classList.add('restore-btn'); restoreBtn.innerHTML = '&#x21A9;&#xFE0F;'; restoreBtn.title = 'Khôi phục ghi chú'; actionsElement.appendChild(restoreBtn); const deletePermanentBtn = document.createElement('button'); deletePermanentBtn.classList.add('delete-permanent-btn'); deletePermanentBtn.textContent = 'Xóa VV'; deletePermanentBtn.title = 'Xóa ghi chú vĩnh viễn'; actionsElement.appendChild(deletePermanentBtn); }
    else if (isViewingArchived) { const unarchiveBtn = document.createElement('button'); unarchiveBtn.classList.add('unarchive-btn'); unarchiveBtn.innerHTML = '&#x1F5C4;&#xFE0F;'; unarchiveBtn.title = 'Khôi phục từ Lưu trữ'; actionsElement.appendChild(unarchiveBtn); const deleteBtn = document.createElement('button'); deleteBtn.classList.add('delete-btn'); deleteBtn.textContent = 'Xóa'; deleteBtn.title = 'Chuyển vào thùng rác'; actionsElement.appendChild(deleteBtn); }
     else { const pinBtn = document.createElement('button'); pinBtn.classList.add('pin-btn'); pinBtn.innerHTML = '&#128204;'; pinBtn.title = note.pinned ? "Bỏ ghim" : "Ghim ghi chú"; pinBtn.setAttribute('aria-label', note.pinned ? "Bỏ ghim ghi chú" : "Ghim ghi chú"); pinBtn.setAttribute('aria-pressed', note.pinned ? 'true' : 'false'); if (note.pinned) pinBtn.classList.add('pinned'); actionsElement.appendChild(pinBtn); const editBtn = document.createElement('button'); editBtn.classList.add('edit-btn'); editBtn.textContent = 'Sửa'; editBtn.title = 'Sửa ghi chú'; actionsElement.appendChild(editBtn); const archiveBtn = document.createElement('button'); archiveBtn.classList.add('archive-btn'); archiveBtn.innerHTML = '&#128451;'; archiveBtn.title = 'Lưu trữ ghi chú'; actionsElement.appendChild(archiveBtn); const deleteBtn = document.createElement('button'); deleteBtn.classList.add('delete-btn'); deleteBtn.textContent = 'Xóa'; deleteBtn.title = 'Chuyển vào thùng rác'; actionsElement.appendChild(deleteBtn); }
    noteElement.appendChild(actionsElement);
    return noteElement;
};

const handleDragEnd = (evt) => { const itemIds = Array.from(notesContainer.children).map(el => el.classList.contains('note') ? parseInt(el.dataset.id) : null).filter(id => id !== null); const noteMap = new Map(notes.map(note => [note.id, note])); const reorderedVisibleNotes = []; const otherNotes = []; notes.forEach(note => { if (note.archived || note.deleted) otherNotes.push(note); }); itemIds.forEach(id => { const note = noteMap.get(id); if (note && !note.archived && !note.deleted) reorderedVisibleNotes.push(note); }); notes = [...reorderedVisibleNotes, ...otherNotes]; saveNotes(); };
const initSortable = () => { if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null; } if (typeof Sortable === 'function' && notesContainer && notesContainer.children.length > 0 && !notesContainer.querySelector('.empty-state') && !isViewingArchived && !isViewingTrash ) { sortableInstance = new Sortable(notesContainer, { animation: 150, handle: '.note', filter: '.note-content input, .note-content textarea, .note-content button, .note-actions button, .tag-badge, .note-content a, .task-list-item-checkbox, .suggestion-item, .read-more-btn, .color-swatch-btn, .edit-title-input, .edit-input, .edit-tags-input', preventOnFilter: true, ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen', dragClass: 'sortable-drag', onEnd: handleDragEnd, delay: 100, delayOnTouchOnly: true }); } else if (typeof Sortable !== 'function' && notes.some(n => !n.archived && !n.deleted) && !isViewingArchived && !isViewingTrash) { console.warn("Sortable.js not loaded."); } };
const getAllUniqueTags = () => { const allTags = notes.reduce((acc, note) => { if (!note.deleted && note.tags && note.tags.length > 0) acc.push(...note.tags); return acc; }, []); return [...new Set(allTags)].sort(); }; // Suggest tags from non-deleted notes only
const showTagSuggestions = (inputElement, currentTagFragment, suggestions) => { hideTagSuggestions(); if (suggestions.length === 0) return; activeTagInputElement = inputElement; const suggestionBox = document.createElement('div'); suggestionBox.id = SUGGESTION_BOX_ID; suggestionBox.classList.add('tag-suggestions'); suggestionBox.setAttribute('role', 'listbox'); suggestions.forEach(tag => { const item = document.createElement('div'); item.classList.add('suggestion-item'); item.textContent = tag; item.setAttribute('role', 'option'); item.addEventListener('mousedown', (e) => { e.preventDefault(); const currentValue = inputElement.value; const lastCommaIndex = currentValue.lastIndexOf(','); let baseValue = ''; if (lastCommaIndex !== -1) baseValue = currentValue.substring(0, lastCommaIndex + 1).trimStart() + ' '; inputElement.value = baseValue + tag + ', '; hideTagSuggestions(); inputElement.focus(); inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length); }); suggestionBox.appendChild(item); }); const inputRect = inputElement.getBoundingClientRect(); document.body.appendChild(suggestionBox); suggestionBox.style.position = 'absolute'; suggestionBox.style.top = `${inputRect.bottom + window.scrollY}px`; suggestionBox.style.left = `${inputRect.left + window.scrollX}px`; suggestionBox.style.minWidth = `${inputRect.width}px`; suggestionBox.style.width = 'auto'; setTimeout(() => { document.addEventListener('mousedown', handleClickOutsideSuggestions); }, 0); };
const handleTagInput = (event) => { const inputElement = event.target; const value = inputElement.value; const cursorPosition = inputElement.selectionStart; const lastCommaIndexBeforeCursor = value.substring(0, cursorPosition).lastIndexOf(','); const currentTagFragment = value.substring(lastCommaIndexBeforeCursor + 1, cursorPosition).trim().toLowerCase(); if (currentTagFragment.length >= 1) { const allTags = getAllUniqueTags(); const precedingTagsString = value.substring(0, lastCommaIndexBeforeCursor + 1); const currentEnteredTags = parseTags(precedingTagsString); const filteredSuggestions = allTags.filter(tag => tag.toLowerCase().startsWith(currentTagFragment) && !currentEnteredTags.includes(tag)); showTagSuggestions(inputElement, currentTagFragment, filteredSuggestions); } else hideTagSuggestions(); };
const handleTagInputBlur = (event) => { setTimeout(() => { const suggestionBox = document.getElementById(SUGGESTION_BOX_ID); if (event.relatedTarget && suggestionBox && suggestionBox.contains(event.relatedTarget)) return; hideTagSuggestions(); }, 150); };
const handleTagInputKeydown = (event) => { const suggestionBox = document.getElementById(SUGGESTION_BOX_ID); if (event.key === 'Escape' && suggestionBox) { hideTagSuggestions(); event.stopPropagation(); } };
const showAddPanel = () => { hideTagSuggestions(); addNotePanel.classList.remove('hidden'); showAddPanelBtn.classList.add('hidden'); newNoteTitle.focus(); };
const hideAddPanel = () => { hideTagSuggestions(); addNotePanel.classList.add('hidden'); showAddPanelBtn.classList.remove('hidden'); newNoteTitle.value = ''; newNoteText.value = ''; newNoteTags.value = ''; };
const exportNotes = () => { if (notes.length === 0) { alert("Không có ghi chú nào để xuất."); return; } try { const notesToExport = notes.map(note => ({ id: note.id, title: note.title || '', text: note.text, tags: note.tags || [], pinned: note.pinned || false, lastModified: note.lastModified || note.id, archived: note.archived || false, color: note.color || null, deleted: note.deleted || false, deletedTimestamp: note.deletedTimestamp || null })); const jsonData = JSON.stringify(notesToExport, null, 2); const blob = new Blob([jsonData], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-'); a.download = `start-notes-backup-${timestamp}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); } catch (error) { console.error("Lỗi xuất ghi chú:", error); alert("Lỗi khi xuất ghi chú."); } };
const importNotes = (file) => { if (!file) { alert("Vui lòng chọn file."); return; } if (!confirm("CẢNH BÁO:\nThao tác này sẽ THAY THẾ TOÀN BỘ ghi chú hiện tại.\nBạn chắc chắn muốn tiếp tục?")) { importFileInput.value = null; return; } const reader = new FileReader(); reader.onload = (event) => { try { const importedData = JSON.parse(event.target.result); if (!Array.isArray(importedData)) throw new Error("Dữ liệu không phải là một danh sách (mảng)."); const validatedNotes = importedData.map((note, index) => { if (typeof note !== 'object' || note === null) return null; return { id: typeof note.id === 'number' ? note.id : Date.now() + index, title: typeof note.title === 'string' ? note.title : '', text: typeof note.text === 'string' ? note.text : '', tags: Array.isArray(note.tags) ? note.tags.map(String).filter(t => t.trim() !== '') : [], pinned: typeof note.pinned === 'boolean' ? note.pinned : false, lastModified: typeof note.lastModified === 'number' ? note.lastModified : (typeof note.id === 'number' ? note.id : Date.now() + index), archived: typeof note.archived === 'boolean' ? note.archived : false, color: typeof note.color === 'string' ? note.color : null, deleted: typeof note.deleted === 'boolean' ? note.deleted : false, deletedTimestamp: typeof note.deletedTimestamp === 'number' ? note.deletedTimestamp : null }; }).filter(Boolean); notes = validatedNotes; saveNotes(); isViewingArchived = false; isViewingTrash = false; displayNotes(); alert(`Đã nhập thành công ${notes.length} ghi chú!`); } catch (error) { console.error("Lỗi nhập file:", error); alert(`Lỗi nhập file: ${error.message}`); } finally { importFileInput.value = null; } }; reader.onerror = (event) => { console.error("Lỗi đọc file:", event.target.error); alert("Lỗi đọc file."); importFileInput.value = null; }; reader.readAsText(file); };


// =====================================================================
//  Core Display Function
// =====================================================================
const displayNotes = (filter = '') => {
    hideTagSuggestions();
    notesContainer.innerHTML = '';
    const lowerCaseFilter = filter.toLowerCase().trim();

    let notesToDisplay = notes.filter(note => {
        if (isViewingTrash) { if (!note.deleted) return false; }
        else if (isViewingArchived) { if (note.deleted || !note.archived) return false; }
        else { if (note.deleted || note.archived) return false; }
        if (filter) { const noteTitleLower = (note.title || '').toLowerCase(); const noteTextLower = (note.text || '').toLowerCase(); const isTagSearch = lowerCaseFilter.startsWith('#'); const tagSearchTerm = isTagSearch ? lowerCaseFilter.substring(1) : null; if (isTagSearch) { if (!tagSearchTerm) return true; return note.tags && note.tags.some(tag => tag.toLowerCase() === tagSearchTerm); } else { const titleMatch = noteTitleLower.includes(lowerCaseFilter); const textMatch = noteTextLower.includes(lowerCaseFilter); const tagMatch = note.tags && note.tags.some(tag => tag.toLowerCase().includes(lowerCaseFilter)); return titleMatch || textMatch || tagMatch; } }
        return true;
    });

    if (isViewingTrash) notesToDisplay.sort((a, b) => (b.deletedTimestamp || b.lastModified) - (a.deletedTimestamp || a.lastModified));
    else if (isViewingArchived) notesToDisplay.sort((a, b) => (b.lastModified || b.id) - (a.lastModified || a.id));
    else notesToDisplay.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    archiveStatusIndicator.classList.add('hidden'); trashStatusIndicator.classList.add('hidden');
    viewArchiveBtn.classList.remove('viewing-archive'); viewTrashBtn.classList.remove('viewing-trash');
    emptyTrashBtn.classList.add('hidden');
    if (isViewingTrash) { trashStatusIndicator.classList.remove('hidden'); viewTrashBtn.textContent = 'Xem Ghi chú Chính'; viewTrashBtn.classList.add('viewing-trash'); viewArchiveBtn.textContent = 'Xem Lưu trữ'; if(notesToDisplay.length > 0) emptyTrashBtn.classList.remove('hidden'); }
    else if (isViewingArchived) { archiveStatusIndicator.classList.remove('hidden'); viewArchiveBtn.textContent = 'Xem Ghi chú Chính'; viewArchiveBtn.classList.add('viewing-archive'); viewTrashBtn.textContent = 'Xem Thùng rác'; }
    else { viewArchiveBtn.textContent = 'Xem Lưu trữ'; viewTrashBtn.textContent = 'Xem Thùng rác'; }

    if (notesToDisplay.length === 0) { let emptyMessage = ''; if (isViewingTrash) emptyMessage = filter ? 'Không tìm thấy ghi chú rác khớp...' : 'Thùng rác trống.'; else if (isViewingArchived) emptyMessage = filter ? 'Không tìm thấy ghi chú lưu trữ khớp...' : 'Lưu trữ trống.'; else emptyMessage = filter ? 'Không tìm thấy ghi chú khớp...' : 'Chưa có ghi chú nào.'; notesContainer.innerHTML = `<p class="empty-state">${emptyMessage}</p>`; if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null; } return; }

    notesToDisplay.forEach(note => { const noteElement = renderNoteElement(note); notesContainer.appendChild(noteElement); });

    if (!isViewingArchived && !isViewingTrash) initSortable();
    else if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null; }
};


// =====================================================================
//  Event Listeners Setup Function
// =====================================================================
const setupEventListeners = () => {
    themeToggleBtn.addEventListener('click', toggleTheme);
    addNoteBtn.addEventListener('click', addNote);
    showAddPanelBtn.addEventListener('click', showAddPanel);
    closeAddPanelBtn.addEventListener('click', hideAddPanel);
    newNoteTitle.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNoteBtn.click(); } });
    const debouncedDisplayNotes = debounce((filterVal) => displayNotes(filterVal), 300);
    searchInput.addEventListener('input', (e) => debouncedDisplayNotes(e.target.value));
    exportNotesBtn.addEventListener('click', exportNotes);
    importNotesBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', (e) => { if(e.target.files[0]) importNotes(e.target.files[0]); });

    viewArchiveBtn.addEventListener('click', () => { if (isViewingArchived) isViewingArchived = false; else { isViewingArchived = true; isViewingTrash = false; } searchInput.value = ''; displayNotes(); });
    viewTrashBtn.addEventListener('click', () => { if (isViewingTrash) isViewingTrash = false; else { isViewingTrash = true; isViewingArchived = false; } searchInput.value = ''; displayNotes(); });
    emptyTrashBtn.addEventListener('click', handleEmptyTrash);

    newNoteTags.addEventListener('input', handleTagInput); newNoteTags.addEventListener('blur', handleTagInputBlur); newNoteTags.addEventListener('keydown', handleTagInputKeydown);
    notesContainer.addEventListener('input', (e) => { if (e.target.matches('.edit-tags-input')) handleTagInput(e); });
    notesContainer.addEventListener('blur', (e) => { if (e.target.matches('.edit-tags-input')) handleTagInputBlur(e); }, true);
    notesContainer.addEventListener('keydown', (e) => { if (e.target.matches('.edit-tags-input')) handleTagInputKeydown(e); });

    notesContainer.addEventListener('click', (event) => {
        const target = event.target; const noteElement = target.closest('.note');
        if (noteElement && noteElement.querySelector('.edit-input') && !target.closest('.save-edit-btn') && !target.closest('.pin-btn') && !target.closest('.color-swatch-btn')) return;
        if (target.matches('.task-list-item-checkbox')) { if (noteElement) handleChecklistToggle(parseInt(noteElement.dataset.id), target); return; }
        const tagButton = target.closest('.tag-badge'); if (tagButton?.dataset.tag) { event.preventDefault(); searchInput.value = `#${tagButton.dataset.tag}`; searchInput.dispatchEvent(new Event('input', { bubbles: true })); searchInput.focus(); return; }
        if (!noteElement) return; const noteId = parseInt(noteElement.dataset.id); const noteIndex = notes.findIndex(note => note.id === noteId); if (noteIndex === -1) return;
        if (target.closest('.pin-btn') && !isViewingArchived && !isViewingTrash) handleNotePin(noteId, noteIndex);
        else if (target.closest('.delete-btn') && !isViewingTrash) handleNoteDelete(noteId, noteIndex);
        else if (target.closest('.archive-btn') && !isViewingTrash && !isViewingArchived) handleNoteArchive(noteId, noteIndex);
        else if (target.closest('.unarchive-btn') && isViewingArchived) handleNoteUnarchive(noteId, noteIndex);
        else if (target.closest('.edit-btn') && !isViewingArchived && !isViewingTrash) { const currentlyEditing = notesContainer.querySelector('.edit-input'); if (currentlyEditing && currentlyEditing.closest('.note') !== noteElement) { alert("Vui lòng lưu hoặc hủy thay đổi ở ghi chú đang sửa trước."); return; } handleNoteEdit(noteElement, noteId, noteIndex); }
        else if (target.closest('.save-edit-btn')) handleNoteSaveEdit(noteElement, noteId, noteIndex);
        else if (target.closest('.restore-btn') && isViewingTrash) handleNoteRestore(noteId, noteIndex);
        else if (target.closest('.delete-permanent-btn') && isViewingTrash) handleNoteDeletePermanent(noteId, noteIndex);
    });

    document.addEventListener('keydown', (event) => {
        const activeElement = document.activeElement; const isTyping = ['INPUT', 'TEXTAREA'].includes(activeElement.tagName) || activeElement.isContentEditable; const isModalOpen = !!document.querySelector('.note-modal.visible'); const isSuggestionBoxOpen = !!document.getElementById(SUGGESTION_BOX_ID);
        if (event.key === 'Escape') { if (isModalOpen) document.querySelector('.note-modal.visible .close-modal-btn')?.click(); else if (isSuggestionBoxOpen) hideTagSuggestions(); else if (!addNotePanel.classList.contains('hidden')) hideAddPanel(); else { const editingNoteElement = notesContainer.querySelector('.note .edit-input')?.closest('.note'); if (editingNoteElement) { if (confirm("Hủy bỏ các thay đổi và đóng chỉnh sửa?")) { displayNotes(searchInput.value); showAddPanelBtn.classList.remove('hidden'); if(sortableInstance) sortableInstance.option('disabled', false); } } } return; }
        if (isModalOpen) return; const isEditingNote = activeElement.matches('.edit-input, .edit-title-input, .edit-tags-input'); if (isTyping && !isEditingNote && !((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f')) return;
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') { event.preventDefault(); if (addNotePanel.classList.contains('hidden') && !notesContainer.querySelector('.edit-input')) showAddPanel(); }
        else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { const activeNoteElement = activeElement.closest('.note'); if (activeNoteElement && activeNoteElement.querySelector('.edit-input')) { const noteId = parseInt(activeNoteElement.dataset.id); const noteIndex = notes.findIndex(n => n.id === noteId); if (noteIndex !== -1) { event.preventDefault(); handleNoteSaveEdit(activeNoteElement, noteId, noteIndex); } } }
        else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') { event.preventDefault(); searchInput.focus(); searchInput.select(); }
    });
}

// =====================================================================
//  Initial Load Function
// =====================================================================
const loadNotesAndInit = () => {
     loadNotes();
     applyTheme(localStorage.getItem(THEME_STORAGE_KEY) || 'light');
     isViewingArchived = false; isViewingTrash = false;
     displayNotes();
     setupEventListeners();
};

// =====================================================================
//  Start the application
// =====================================================================
loadNotesAndInit();
