// =====================================================================
//  Constants & State Variables
// =====================================================================
const NOTES_STORAGE_KEY = 'startNotesData';
const TEMPLATES_STORAGE_KEY = 'startNoteTemplates';
const THEME_STORAGE_KEY = 'themePref';
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
                text: note.text || '',
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
        notes.unshift(newNote); // Add to the beginning of the array
        saveNotes();
        if (isViewingArchived || isViewingTrash) {
            isViewingArchived = false;
            isViewingTrash = false;
        }
        displayNotes(searchInput.value); // Re-render whole list for new notes
        hideAddPanel();
    } else {
        alert("Vui lòng nhập Tiêu đề hoặc Nội dung cho ghi chú!");
    }
};

// =====================================================================
//  Template Data Management
// =====================================================================
const saveTemplates = () => {
    try {
        localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    } catch (e) {
        console.error("Lỗi lưu mẫu vào localStorage:", e);
        alert("Đã xảy ra lỗi khi cố gắng lưu các mẫu ghi chú.");
    }
};

const loadTemplates = () => {
    const storedTemplates = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (storedTemplates) {
        try {
            templates = JSON.parse(storedTemplates).map(t => ({ // Basic validation
                id: t.id || Date.now(),
                name: t.name || `Mẫu ${t.id}`,
                title: t.title || '',
                text: t.text || '',
                tags: Array.isArray(t.tags) ? t.tags : [],
            }));
        } catch (e) {
            console.error("Lỗi đọc dữ liệu mẫu từ localStorage:", e);
            templates = [];
        }
    } else {
        templates = [];
    }
};

const addOrUpdateTemplate = () => {
    const name = templateEditName.value.trim();
    const title = templateEditTitleInput.value.trim();
    const text = templateEditText.value;
    const tags = parseTags(templateEditTags.value);
    const id = templateEditId.value ? parseInt(templateEditId.value) : null;

    if (!name) {
        alert("Vui lòng nhập Tên Mẫu!");
        templateEditName.focus();
        return;
    }

    if (id) { // Update existing
        const index = templates.findIndex(t => t.id === id);
        if (index !== -1) {
            templates[index] = { ...templates[index], name, title, text, tags };
        } else {
            console.error("Không tìm thấy mẫu để cập nhật với ID:", id);
            return;
        }
    } else { // Add new
        const newTemplate = {
            id: Date.now(),
            name,
            title,
            text,
            tags
        };
        templates.push(newTemplate);
    }

    saveTemplates();
    renderTemplateList();
    populateTemplateDropdown();
    hideTemplateEditPanel();
};


const deleteTemplate = (id) => {
    const index = templates.findIndex(t => t.id === id);
    if (index !== -1) {
        const templateName = templates[index].name;
        if (confirm(`Bạn chắc chắn muốn xóa mẫu "${templateName}"?`)) {
            templates.splice(index, 1);
            saveTemplates();
            renderTemplateList();
            populateTemplateDropdown();
            if (!templateEditPanel.classList.contains('hidden') && parseInt(templateEditId.value) === id) {
                 hideTemplateEditPanel();
            }
        }
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
    // ... (giữ nguyên)
};

// --- Note Action Handlers ---
const handleNotePin = (noteId, noteIndex) => {
    notes[noteIndex].pinned = !notes[noteIndex].pinned;
    notes[noteIndex].lastModified = Date.now(); // Update lastModified for pin change
    saveNotes();
    displayNotes(searchInput.value); // Re-render needed for pinning/unpinning sort
};

const handleNoteDelete = (noteId, noteIndex) => {
    // ... (giữ nguyên) - Calls displayNotes which is correct
};

const handleNoteRestore = (noteId, noteIndex) => {
    // ... (giữ nguyên) - Calls displayNotes which is correct
};

const handleNoteDeletePermanent = (noteId, noteIndex) => {
    // ... (giữ nguyên) - Calls displayNotes which is correct
};

const handleEmptyTrash = () => {
    // ... (giữ nguyên) - Calls displayNotes which is correct
};

const handleNoteArchive = (noteId, noteIndex) => {
    // ... (giữ nguyên) - Calls displayNotes which is correct
};

const handleNoteUnarchive = (noteId, noteIndex) => {
    // ... (giữ nguyên) - Calls displayNotes which is correct
};

// --- Note Editing & Saving Logic ---

const updateNoteData = (noteIndex, newData) => {
    if (noteIndex < 0 || noteIndex >= notes.length) return false;
    const note = notes[noteIndex];
    if (!note) return false;

    const { title, text, tags, color } = newData;
    let changed = false;

    if (note.title !== title) { note.title = title; changed = true; }
    if (note.text !== text) { note.text = text; changed = true; }
    if (note.color !== color) { note.color = color; changed = true; } // Color change should also trigger save

    const currentTags = note.tags || [];
    const newTags = tags || [];
    const tagsChanged = !(currentTags.length === newTags.length && currentTags.sort().every((value, index) => value === newTags.sort()[index]));
    if (tagsChanged) { note.tags = newTags; changed = true; }

    if (changed) {
        note.lastModified = Date.now(); // Update timestamp if anything changed
        saveNotes();
        return true;
    }
    return false;
};


const debouncedAutoSave = debounce((noteElement, noteIndex) => {
    const editTitleInputCheck = noteElement.querySelector('input.edit-title-input');
    const editInputCheck = noteElement.querySelector('textarea.edit-input');
    // Ensure elements still exist before trying to save
    if (!editInputCheck || !editTitleInputCheck || !noteElement.contains(editInputCheck)) {
        console.log(`Auto-save for note index ${noteIndex} aborted: Edit elements removed or note context lost.`);
        return;
    }
    console.log(`Attempting auto-save for note index: ${noteIndex}`);

    const newTitle = editTitleInputCheck.value.trim();
    const newText = editInputCheck.value;
    const editTagsInputCheck = noteElement.querySelector('input.edit-tags-input');
    const newTagString = editTagsInputCheck ? editTagsInputCheck.value : (notes[noteIndex]?.tags || []).join(', ');
    const newTags = parseTags(newTagString);
    const selectedColorValue = noteElement.dataset.selectedColor ?? notes[noteIndex]?.color; // Use dataset if available
    const newColor = selectedColorValue === '' || selectedColorValue === null ? null : selectedColorValue;

    // Check if note became empty (and wasn't empty before) - prevent auto-saving empty notes unless they were initially empty
    const wasPreviouslyEmpty = !notes[noteIndex]?.title && !notes[noteIndex]?.text.trim();
    if (!wasPreviouslyEmpty && !newTitle && !newText.trim()) {
        console.log("Auto-save skipped: Existing note became empty.");
        return;
    }

    const saved = updateNoteData(noteIndex, {
        title: newTitle,
        text: newText,
        tags: newTags,
        color: newColor
    });

    if (saved) {
        // Update timestamp display in edit mode via auto-save? Maybe not necessary, only on manual save.
        // However, add visual feedback
        noteElement.classList.add('note-autosaved');
        setTimeout(() => {
            // Check if element still exists before removing class
            noteElement?.classList.remove('note-autosaved');
        }, 600);

        // Update the underlying note data used by edit mode (important if user cancels later)
        // This is handled by updateNoteData already modifying the `notes` array.
    }
}, DEBOUNCE_DELAY);


const handleNoteEdit = (noteElement, noteId, noteIndex) => {
    // ... (Giữ nguyên logic hiển thị form sửa trong noteElement)
    if (isViewingTrash || isViewingArchived) return;
    const currentlyEditing = notesContainer.querySelector('.edit-input');
    if (currentlyEditing && currentlyEditing.closest('.note') !== noteElement) {
        alert("Vui lòng lưu hoặc hủy thay đổi ở ghi chú đang sửa trước.");
        return;
    }

    hideTagSuggestions();
    if (sortableInstance) sortableInstance.option('disabled', true); // Disable drag while editing
    showAddPanelBtn.classList.add('hidden'); // Hide FAB

    const noteData = notes[noteIndex];

    // --- Create Edit Inputs ---
    const editTitleInput = document.createElement('input');
    editTitleInput.type = 'text';
    editTitleInput.classList.add('edit-title-input');
    editTitleInput.placeholder = 'Tiêu đề...';
    editTitleInput.value = noteData.title || '';

    const editInput = document.createElement('textarea');
    editInput.classList.add('edit-input');
    editInput.value = noteData.text; // Edit raw text

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
    noteElement.dataset.selectedColor = noteData.color || ''; // Store initial color state

    NOTE_COLORS.forEach(color => {
        const swatchBtn = document.createElement('button');
        // ... (setup swatch button - same as before)
         swatchBtn.type = 'button';
        swatchBtn.classList.add('color-swatch-btn');
        swatchBtn.dataset.colorValue = color.value || '';
        swatchBtn.title = color.name;
        swatchBtn.setAttribute('role', 'radio');
        const isCurrentColor = (noteData.color === color.value) || (!noteData.color && !color.value);
        swatchBtn.setAttribute('aria-checked', isCurrentColor ? 'true' : 'false');
        if (isCurrentColor) swatchBtn.classList.add('selected');
        if (color.value) swatchBtn.style.backgroundColor = color.hex;
        else { swatchBtn.classList.add('default-color-swatch'); swatchBtn.innerHTML = '&#x2715;'; }

        swatchBtn.addEventListener('click', () => {
            const selectedValue = swatchBtn.dataset.colorValue;
            noteElement.dataset.selectedColor = selectedValue; // Update dataset
            colorSelectorContainer.querySelectorAll('.color-swatch-btn').forEach(btn => {
                const isSelected = btn === swatchBtn;
                btn.classList.toggle('selected', isSelected);
                btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
            });
             // Apply color class immediately for visual feedback, handled by dataset on save
             NOTE_COLORS.forEach(c => { if (c.value) noteElement.classList.remove(c.value); });
             if (selectedValue) noteElement.classList.add(selectedValue);
            debouncedAutoSave(noteElement, noteIndex); // Trigger autosave on color change
        });
        colorSelectorContainer.appendChild(swatchBtn);
    });

    // --- Create Save Button ---
    const saveBtn = document.createElement('button');
    saveBtn.classList.add('save-edit-btn', 'modal-button', 'primary'); // Reuse modal button styles
    saveBtn.textContent = 'Lưu';
    saveBtn.title = 'Lưu thay đổi (Ctrl+S)';

    // --- Hide Original Elements & Insert Edit Elements ---
    const actionsElement = noteElement.querySelector('.note-actions');
    const contentElement = noteElement.querySelector('.note-content');
    const titleElement = noteElement.querySelector('.note-title');
    const tagsElement = noteElement.querySelector('.note-tags');
    const timestampElement = noteElement.querySelector('.note-timestamp');
    const bookmarkIcon = noteElement.querySelector('.pinned-bookmark-icon');
    const readMoreBtn = noteElement.querySelector('.read-more-btn');

    // Store original action buttons HTML (excluding save button itself if re-editing)
    let originalActionsHTML = '';
    if (actionsElement) {
         originalActionsHTML = Array.from(actionsElement.children)
            .filter(btn => !btn.classList.contains('save-edit-btn')) // Exclude previous save btn
            .map(btn => btn.outerHTML).join('');
     }

    // Clear note content except for main container and potentially bookmark
     if (bookmarkIcon) bookmarkIcon.style.display = 'inline-block'; // Ensure bookmark stays visible if pinned
     noteElement.innerHTML = ''; // Clear everything else
     if (bookmarkIcon) noteElement.appendChild(bookmarkIcon); // Re-add bookmark if it existed

    // Append edit elements
    noteElement.appendChild(editTitleInput);
    noteElement.appendChild(editInput);
    noteElement.appendChild(editTagsInput);
    noteElement.appendChild(colorSelectorContainer);

    // Recreate actions container and add save button + original buttons (like pin)
    const editActionsContainer = document.createElement('div');
    editActionsContainer.classList.add('note-actions');
    editActionsContainer.innerHTML = originalActionsHTML; // Add back pin button etc.
    editActionsContainer.appendChild(saveBtn);
    noteElement.appendChild(editActionsContainer);

    // Attach Input Listeners
    editTitleInput.addEventListener('input', () => debouncedAutoSave(noteElement, noteIndex));
    editInput.addEventListener('input', () => debouncedAutoSave(noteElement, noteIndex));
    editTagsInput.addEventListener('input', (event) => { handleTagInput(event); debouncedAutoSave(noteElement, noteIndex); });
    editTagsInput.addEventListener('blur', handleTagInputBlur);
    editTagsInput.addEventListener('keydown', handleTagInputKeydown);

    editTitleInput.focus();
    // Move cursor to end of title
    editTitleInput.setSelectionRange(editTitleInput.value.length, editTitleInput.value.length);

};


// ***** MODIFIED: handleNoteSaveEdit *****
const handleNoteSaveEdit = (noteElement, noteId, noteIndex) => {
    const editTitleInput = noteElement.querySelector('input.edit-title-input');
    const editInput = noteElement.querySelector('textarea.edit-input');
    const editTagsInput = noteElement.querySelector('input.edit-tags-input');

    // Should always exist if this function is called correctly
    if (!editTitleInput || !editInput || !editTagsInput) {
         console.error("Error saving: Edit elements not found.");
         // Optionally force a full redraw as fallback
         // displayNotes(searchInput.value);
         return;
     }

    const newTitle = editTitleInput.value.trim();
    const newText = editInput.value; // Get raw text
    const newTagString = editTagsInput.value;
    const newTags = parseTags(newTagString);
    // Get color from dataset attribute, fallback to original note data if needed
    const selectedColorValue = noteElement.dataset.selectedColor ?? notes[noteIndex]?.color;
    const newColor = selectedColorValue === '' || selectedColorValue === null ? null : selectedColorValue;

    // Prevent saving if note became empty (unless it was initially empty)
    const wasInitiallyEmpty = !notes[noteIndex]?.title && !notes[noteIndex]?.text.trim();
    if (!wasInitiallyEmpty && !newTitle && !newText.trim()) {
        alert("Tiêu đề hoặc Nội dung không được để trống hoàn toàn khi lưu!");
        return;
    }

    // Save data to the 'notes' array and localStorage
    const dataChanged = updateNoteData(noteIndex, {
        title: newTitle,
        text: newText,
        tags: newTags,
        color: newColor
    });

    // --- Update the note element in place ---
    const updatedNoteData = notes[noteIndex]; // Get the potentially updated data

    // Clear the note element's content
    const bookmarkIcon = noteElement.querySelector('.pinned-bookmark-icon'); // Preserve bookmark if exists
    noteElement.innerHTML = '';
    if (bookmarkIcon) noteElement.appendChild(bookmarkIcon);

    // Re-apply color and pinned status (pinned status doesn't change here, just re-apply visual)
    applyNoteColor(noteElement, updatedNoteData);
    applyPinnedStatus(noteElement, updatedNoteData, false, false); // Apply visual based on data

    // Re-render content elements using helper functions
    const titleEl = createNoteTitleElement(updatedNoteData, searchInput.value);
    if(titleEl) noteElement.appendChild(titleEl);

    const contentEl = createNoteContentElement(updatedNoteData, searchInput.value, noteElement); // Pass noteElement for overflow check
    if(contentEl) noteElement.appendChild(contentEl);

    const tagsEl = createNoteTagsElement(updatedNoteData);
    if(tagsEl) noteElement.appendChild(tagsEl);

    const timestampEl = createNoteTimestampElement(updatedNoteData);
    if(timestampEl) noteElement.appendChild(timestampEl);

    const actionsEl = createNoteActionsElement(updatedNoteData, false, false); // Render standard actions
    if(actionsEl) noteElement.appendChild(actionsEl);


    // --- Cleanup ---
    delete noteElement.dataset.selectedColor; // Remove temporary color state
    hideTagSuggestions(); // Hide any tag suggestions
    if (sortableInstance) sortableInstance.option('disabled', false); // Re-enable drag
    showAddPanelBtn.classList.remove('hidden'); // Show FAB

    // Optional: Add visual feedback for successful save
    noteElement.classList.add('note-saved-flash');
     setTimeout(() => {
         noteElement?.classList.remove('note-saved-flash');
     }, 600);
};

// --- Other Helper Functions ---

const showFullNoteModal = (title, noteText) => {
    // ... (Giữ nguyên logic hiển thị modal xem ghi chú)
    const existingModal = document.querySelector('.note-modal');
    if (existingModal) { existingModal.remove(); }
    const modal = document.createElement('div');
    modal.classList.add('note-modal'); // Distinguish from template modal if needed
    modal.classList.add('modal'); // Reuse generic modal style
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'note-modal-title');
    const modalContent = document.createElement('div');
    modalContent.classList.add('modal-content'); // Reuse generic style
    const modalHeader = document.createElement('div');
    modalHeader.classList.add('modal-header');
    const modalTitle = document.createElement('h2');
    modalTitle.id = 'note-modal-title';
    modalTitle.textContent = title || 'Ghi chú';
    const closeModalBtn = document.createElement('button');
    closeModalBtn.classList.add('close-modal-btn');
    closeModalBtn.innerHTML = '&times;';
    closeModalBtn.title = 'Đóng (Esc)';
    closeModalBtn.setAttribute('aria-label', 'Đóng cửa sổ xem ghi chú');
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeModalBtn);
    const modalBody = document.createElement('div');
    modalBody.classList.add('modal-body');

    modalBody.textContent = noteText || '';

    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    requestAnimationFrame(() => {
        modal.classList.add('visible');
        modal.classList.remove('hidden');
    });
    closeModalBtn.focus();

    // --- Event Listeners for Note Modal ---
    const closeFunc = () => {
        modal.classList.remove('visible');
        modal.addEventListener('transitionend', () => {
             if (modal.parentNode) modal.remove();
             document.removeEventListener('keydown', handleThisModalKeyDown); // Clean up specific listener
        }, { once: true });
    };

    const handleThisModalKeyDown = (event) => {
        const modalStillVisible = document.querySelector('.note-modal.visible');
        if (!modalStillVisible || event.target.closest('.modal') !== modal) { // Ensure listener acts only on its modal
            document.removeEventListener('keydown', handleThisModalKeyDown);
            return;
        }

        if (event.key === 'Escape') {
            closeFunc();
        }
        if (event.key === 'Tab') {
            const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
             if (focusableElements.length === 0) return; // No focusable elements
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            if (event.shiftKey) {
                if (document.activeElement === firstElement) { lastElement.focus(); event.preventDefault(); }
            } else {
                if (document.activeElement === lastElement) { firstElement.focus(); event.preventDefault(); }
            }
        }
    };

    closeModalBtn.addEventListener('click', closeFunc);
    modal.addEventListener('click', (event) => { if (event.target === modal) closeFunc(); });
    document.addEventListener('keydown', handleThisModalKeyDown); // Add the specific listener
};

// =====================================================================
//  NEW: Note Element Rendering Helper Functions
// =====================================================================

function applyNoteColor(noteElement, note) {
    // Remove existing color classes first
    NOTE_COLORS.forEach(color => {
        if (color.value && noteElement.classList.contains(color.value)) {
            noteElement.classList.remove(color.value);
        }
    });
    // Add the new color class if it exists
    if (note.color) {
        noteElement.classList.add(note.color);
    }
     // Update border style based on color presence (optional refinement)
     noteElement.style.borderLeftColor = note.color ? (NOTE_COLORS.find(c=>c.value === note.color)?.hex || 'transparent') : 'transparent';
     // Reset general border color unless a specific color class handles it in CSS
     const colorData = NOTE_COLORS.find(c => c.value === note.color);
     if (!colorData || !colorData.value?.includes('note-color-')) { // If default or color class doesn't handle border
         noteElement.style.borderColor = 'var(--border-color)'; // Use default border
     } else {
        noteElement.style.borderColor = ''; // Let CSS class handle border color
     }
}

function applyPinnedStatus(noteElement, note, isViewingArchived, isViewingTrash) {
     const existingBookmark = noteElement.querySelector('.pinned-bookmark-icon');
    if (note.pinned && !isViewingArchived && !isViewingTrash) {
        noteElement.classList.add('pinned-note');
        if (!existingBookmark) {
             const bookmarkIcon = document.createElement('span');
             bookmarkIcon.classList.add('pinned-bookmark-icon');
             bookmarkIcon.innerHTML = '&#128278;'; // Pin icon
             bookmarkIcon.setAttribute('aria-hidden', 'true');
             // Prepend or append? Prepend might be safer if content cleared later
             noteElement.insertBefore(bookmarkIcon, noteElement.firstChild);
         } else {
             existingBookmark.style.display = 'inline-block'; // Ensure visible
         }
    } else {
         noteElement.classList.remove('pinned-note');
         if (existingBookmark) {
             existingBookmark.style.display = 'none'; // Hide if not pinned or in archive/trash
         }
     }
}

function createNoteTitleElement(note, filter) {
    if (!note.title) return null;

    const titleElement = document.createElement('h3');
    titleElement.classList.add('note-title');
    let titleHTML = escapeHTML(note.title); // Escape first
    const lowerCaseFilter = (filter || '').toLowerCase().trim();
    const isTagSearch = lowerCaseFilter.startsWith('#');

    if (!isTagSearch && lowerCaseFilter) {
        try {
            const highlightRegex = new RegExp(`(${escapeRegExp(lowerCaseFilter)})`, 'gi');
            titleHTML = titleHTML.replace(highlightRegex, '<mark>$1</mark>');
        } catch(e) { console.warn("Error highlighting title:", e); }
    }
    titleElement.innerHTML = titleHTML; // Set potentially highlighted HTML
    return titleElement;
}

function createNoteContentElement(note, filter, noteElementForOverflowCheck) {
    const contentElement = document.createElement('div');
    contentElement.classList.add('note-content');

    let textContent = note.text || '';
    let displayHTML = escapeHTML(textContent); // Start with escaped text

    const lowerCaseFilter = (filter || '').toLowerCase().trim();
    const isTagSearchContent = lowerCaseFilter.startsWith('#');
    if (!isTagSearchContent && lowerCaseFilter) {
        try {
            const highlightRegexContent = new RegExp(`(${escapeRegExp(lowerCaseFilter)})`, 'gi');
            displayHTML = displayHTML.replace(highlightRegexContent, '<mark>$1</mark>');
        } catch (e) { console.warn("Error highlighting content:", e); }
    }

    displayHTML = displayHTML.replace(/\n/g, '<br>');
    contentElement.innerHTML = displayHTML;

    // Check for overflow and add "Read More" button AFTER element is in DOM or sized
    // We need the actual note element for this check. Defer the check.
     requestAnimationFrame(() => {
         // Ensure the note element passed is still valid and attached
         if (!noteElementForOverflowCheck || !noteElementForOverflowCheck.isConnected) return;

         // Find the content element *within* the note element again, as it might have been re-rendered
         const currentContentEl = noteElementForOverflowCheck.querySelector('.note-content');
         if (!currentContentEl) return;

         const existingBtn = noteElementForOverflowCheck.querySelector('.read-more-btn');
         if (existingBtn) existingBtn.remove(); // Remove previous button first

         // Check scrollHeight vs clientHeight
         if (currentContentEl.scrollHeight > currentContentEl.clientHeight + 2) { // +2 for tolerance
             currentContentEl.classList.add('has-overflow');
             const readMoreBtn = document.createElement('button');
             readMoreBtn.textContent = 'Xem thêm';
             readMoreBtn.classList.add('read-more-btn');
             readMoreBtn.type = 'button';
             readMoreBtn.addEventListener('click', (e) => {
                 e.stopPropagation();
                 showFullNoteModal(note.title, note.text); // Show modal with original RAW text
             });
             // Append button *after* the content element within the note card
             noteElementForOverflowCheck.insertBefore(readMoreBtn, currentContentEl.nextSibling);
         } else {
             currentContentEl.classList.remove('has-overflow');
         }
    });


    return contentElement;
}


function createNoteTagsElement(note) {
    if (!note.tags || note.tags.length === 0) return null;

    const tagsElement = document.createElement('div');
    tagsElement.classList.add('note-tags');
    note.tags.forEach(tag => {
        const tagBadge = document.createElement('button');
        tagBadge.classList.add('tag-badge');
        tagBadge.textContent = `#${tag}`;
        tagBadge.dataset.tag = tag;
        tagBadge.type = 'button';
        tagBadge.title = `Lọc theo tag: ${tag}`;
        tagsElement.appendChild(tagBadge);
    });
    return tagsElement;
}


function createNoteTimestampElement(note) {
    const timestampElement = document.createElement('small');
    timestampElement.classList.add('note-timestamp');
    const creationDate = formatTimestamp(note.id);
    let timestampText = `Tạo: ${creationDate}`;
    // Check lastModified carefully - only show if significantly different from creation
    if (note.lastModified && note.lastModified > note.id + 60000) { // 1 minute threshold
        const modifiedDate = formatTimestamp(note.lastModified);
        timestampText += ` (Sửa: ${modifiedDate})`;
    }
    if (isViewingTrash && note.deletedTimestamp) { // Global state still needed here
        const deletedDate = formatTimestamp(note.deletedTimestamp);
        timestampText += ` (Xóa: ${deletedDate})`;
    }
    timestampElement.textContent = timestampText;
    return timestampElement;
}

function createNoteActionsElement(note, isViewingTrash, isViewingArchived) {
    const actionsElement = document.createElement('div');
    actionsElement.classList.add('note-actions');

    if (isViewingTrash) {
        const restoreBtn = document.createElement('button'); restoreBtn.classList.add('restore-btn'); restoreBtn.innerHTML = '&#x21A9;&#xFE0F;'; restoreBtn.title = 'Khôi phục ghi chú'; actionsElement.appendChild(restoreBtn);
        const deletePermanentBtn = document.createElement('button'); deletePermanentBtn.classList.add('delete-permanent-btn'); deletePermanentBtn.textContent = 'Xóa VV'; deletePermanentBtn.title = 'Xóa ghi chú vĩnh viễn'; actionsElement.appendChild(deletePermanentBtn);
    } else if (isViewingArchived) {
        const unarchiveBtn = document.createElement('button'); unarchiveBtn.classList.add('unarchive-btn'); unarchiveBtn.innerHTML = '&#x1F5C4;&#xFE0F;'; unarchiveBtn.title = 'Khôi phục từ Lưu trữ'; actionsElement.appendChild(unarchiveBtn);
        const deleteBtn = document.createElement('button'); deleteBtn.classList.add('delete-btn'); deleteBtn.textContent = 'Xóa'; deleteBtn.title = 'Chuyển vào thùng rác'; actionsElement.appendChild(deleteBtn);
    } else {
        // Pin Button
        const pinBtn = document.createElement('button');
        pinBtn.classList.add('pin-btn');
        pinBtn.innerHTML = '&#128204;'; // Pushpin icon
        pinBtn.title = note.pinned ? "Bỏ ghim" : "Ghim ghi chú";
        pinBtn.setAttribute('aria-label', note.pinned ? "Bỏ ghim ghi chú" : "Ghim ghi chú");
        pinBtn.setAttribute('aria-pressed', note.pinned ? 'true' : 'false');
        if (note.pinned) pinBtn.classList.add('pinned');
        actionsElement.appendChild(pinBtn);

        // Edit Button
        const editBtn = document.createElement('button');
        editBtn.classList.add('edit-btn');
        editBtn.textContent = 'Sửa';
        editBtn.title = 'Sửa ghi chú';
        actionsElement.appendChild(editBtn);

        // Archive Button
        const archiveBtn = document.createElement('button');
        archiveBtn.classList.add('archive-btn');
        archiveBtn.innerHTML = '&#128451;'; // Archive box icon
        archiveBtn.title = 'Lưu trữ ghi chú';
        actionsElement.appendChild(archiveBtn);

        // Delete Button
        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('delete-btn');
        deleteBtn.textContent = 'Xóa';
        deleteBtn.title = 'Chuyển vào thùng rác';
        actionsElement.appendChild(deleteBtn);
    }
    return actionsElement;
}

// =====================================================================
//  Core Note Rendering Function (Uses Helpers)
// =====================================================================
const renderNoteElement = (note) => {
    const noteElement = document.createElement('div');
    noteElement.classList.add('note');
    noteElement.dataset.id = note.id;

    // Apply color and pinned status using helpers
    applyNoteColor(noteElement, note);
    applyPinnedStatus(noteElement, note, isViewingArchived, isViewingTrash); // Pass current view status

    // Create and append content elements using helpers
    const titleEl = createNoteTitleElement(note, searchInput.value);
    if(titleEl) noteElement.appendChild(titleEl);

    // Pass noteElement itself for overflow check inside the helper
    const contentEl = createNoteContentElement(note, searchInput.value, noteElement);
    if(contentEl) noteElement.appendChild(contentEl);

    const tagsEl = createNoteTagsElement(note);
    if(tagsEl) noteElement.appendChild(tagsEl);

    const timestampEl = createNoteTimestampElement(note);
    if(timestampEl) noteElement.appendChild(timestampEl);

    const actionsEl = createNoteActionsElement(note, isViewingTrash, isViewingArchived);
    if(actionsEl) noteElement.appendChild(actionsEl);

    return noteElement;
};


// --- Drag & Drop ---
const handleDragEnd = (evt) => {
    // ... (Giữ nguyên logic xử lý kéo thả)
     const itemIds = Array.from(notesContainer.children)
        .map(el => el.classList.contains('note') ? parseInt(el.dataset.id) : null)
        .filter(id => id !== null);

    // Create a map for quick lookup
    const noteMap = new Map(notes.map(note => [note.id, note]));

    const reorderedVisibleNotes = [];
    const otherNotes = []; // Archived, deleted notes

    // Get the reordered visible notes based on DOM order
    itemIds.forEach(id => {
        const note = noteMap.get(id);
        // Only consider notes currently visible in the sortable list
        if (note && !note.archived && !note.deleted) {
            reorderedVisibleNotes.push(note);
            noteMap.delete(id); // Remove from map to track remaining
        }
    });

     // Add back the notes that were not part of the drag operation (archived/deleted)
     // Maintain their relative order if needed, though usually not critical
     notes.forEach(note => {
         if (noteMap.has(note.id)) { // If note wasn't in the reorderedVisibleNotes
             otherNotes.push(note);
         }
     });

    // Combine the arrays: reordered visible notes first, then others
    notes = [...reorderedVisibleNotes, ...otherNotes];
    saveNotes();
    // No need to call displayNotes here, Sortable handles visual update
};

const initSortable = () => {
    if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
    }
    // Only initialize if Sortable exists, container exists, has notes, and not in archive/trash
    if (typeof Sortable === 'function' && notesContainer && notesContainer.children.length > 0 && !notesContainer.querySelector('.empty-state') && !isViewingArchived && !isViewingTrash ) {
        sortableInstance = new Sortable(notesContainer, {
            animation: 150,
            handle: '.note', // Allow dragging the whole note card
            filter: '.note-content input, .note-content textarea, .note-content button, .note-actions button, .tag-badge, .note-content a, .task-list-item-checkbox, .suggestion-item, .read-more-btn, .color-swatch-btn, .edit-title-input, .edit-input, .edit-tags-input', // Prevent dragging these elements
            preventOnFilter: true, // Required for filter
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            onEnd: handleDragEnd,
            delay: 100, // Slight delay to prevent accidental drags
            delayOnTouchOnly: true // Apply delay only for touch devices
        });
    } else if (typeof Sortable !== 'function' && notes.some(n => !n.archived && !n.deleted) && !isViewingArchived && !isViewingTrash) {
        console.warn("Thư viện Sortable.js chưa được tải.");
    }
};

// --- Tag Handling ---
const getAllUniqueTags = () => {
    // ... (Giữ nguyên)
     const allTags = notes.reduce((acc, note) => {
        if (!note.deleted && !note.archived && note.tags && note.tags.length > 0) {
            acc.push(...note.tags);
        }
        return acc;
    }, []);
    return [...new Set(allTags)].sort();
};

const showTagSuggestions = (inputElement, currentTagFragment, suggestions) => {
    // ... (Giữ nguyên)
     hideTagSuggestions(); // Close existing first
    if (suggestions.length === 0 || !currentTagFragment) return;

    activeTagInputElement = inputElement; // Track active input
    const suggestionBox = document.createElement('div');
    suggestionBox.id = SUGGESTION_BOX_ID;
    suggestionBox.classList.add('tag-suggestions');
    suggestionBox.setAttribute('role', 'listbox');

    suggestions.forEach(tag => {
        const item = document.createElement('div');
        item.classList.add('suggestion-item');
        item.textContent = tag;
        item.setAttribute('role', 'option');
        item.tabIndex = -1; // Make it focusable but not via sequential Tab navigation

        item.addEventListener('mousedown', (e) => { // Use mousedown to trigger before blur
            e.preventDefault(); // Prevent input blur
            const currentValue = inputElement.value;
            const lastCommaIndex = currentValue.lastIndexOf(',');
            let baseValue = '';
            if (lastCommaIndex !== -1) {
                // Include space after comma if exists
                baseValue = currentValue.substring(0, lastCommaIndex + 1).trimStart() + ' ';
            }
            inputElement.value = baseValue + tag + ', '; // Add selected tag and trailing comma+space
            hideTagSuggestions();
            inputElement.focus();
            // Move cursor to end
            inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length);
            // Trigger input event for potential listeners (like autosave)
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        });
        suggestionBox.appendChild(item);
    });

    const inputRect = inputElement.getBoundingClientRect();
    document.body.appendChild(suggestionBox); // Append to body for positioning freedom
    suggestionBox.style.position = 'absolute';
    suggestionBox.style.top = `${inputRect.bottom + window.scrollY}px`;
    suggestionBox.style.left = `${inputRect.left + window.scrollX}px`;
    suggestionBox.style.minWidth = `${inputRect.width}px`;
    suggestionBox.style.width = 'auto'; // Adjust width based on content

    // Add listener to close suggestions when clicking outside
    // Use timeout to avoid immediate closing due to the click that opened it
    setTimeout(() => { document.addEventListener('mousedown', handleClickOutsideSuggestions); }, 0);
};

const handleTagInput = (event) => {
    // ... (Giữ nguyên)
     const inputElement = event.target;
    const value = inputElement.value;
    const cursorPosition = inputElement.selectionStart;

    // Find the start of the current tag fragment being typed
    const lastCommaIndexBeforeCursor = value.substring(0, cursorPosition).lastIndexOf(',');
    const currentTagFragment = value.substring(lastCommaIndexBeforeCursor + 1, cursorPosition).trim().toLowerCase();

    if (currentTagFragment.length >= 1) {
        const allTags = getAllUniqueTags();
        // Get tags already entered in the current input *before* the fragment
        const precedingTagsString = value.substring(0, lastCommaIndexBeforeCursor + 1);
        const currentEnteredTags = parseTags(precedingTagsString);

        // Filter suggestions: starts with fragment and not already entered
        const filteredSuggestions = allTags.filter(tag =>
            tag.toLowerCase().startsWith(currentTagFragment) &&
            !currentEnteredTags.includes(tag)
        );
        showTagSuggestions(inputElement, currentTagFragment, filteredSuggestions);
    } else {
        hideTagSuggestions(); // Hide if fragment is empty
    }
};

const handleTagInputBlur = (event) => {
    // ... (Giữ nguyên) - Use timeout to allow clicking on suggestion item
     // Use timeout because blur triggers before mousedown on suggestion item
    setTimeout(() => {
        const suggestionBox = document.getElementById(SUGGESTION_BOX_ID);
        // Don't hide if the related target (element receiving focus) is inside the suggestion box
        if (event.relatedTarget && suggestionBox && suggestionBox.contains(event.relatedTarget)) {
            return;
        }
        hideTagSuggestions();
    }, 150); // Delay ms
};

const handleTagInputKeydown = (event) => {
    // ... (Giữ nguyên) - Handle Escape key
    const suggestionBox = document.getElementById(SUGGESTION_BOX_ID);
    if (event.key === 'Escape' && suggestionBox) {
        hideTagSuggestions();
        event.stopPropagation(); // Prevent other Escape handlers (like closing modal)
    }
    // Add Up/Down arrow key navigation for suggestions later if needed
};

// --- Template UI Handlers ---

const renderTemplateList = () => {
    // ... (Giữ nguyên)
     templateListContainer.innerHTML = ''; // Clear previous list
    if (templates.length === 0) {
        templateListContainer.innerHTML = `<p class="empty-state">Chưa có mẫu nào.</p>`;
        return;
    }

    templates.sort((a, b) => a.name.localeCompare(b.name)).forEach(template => {
        const item = document.createElement('div');
        item.classList.add('template-list-item');
        item.innerHTML = `
            <span>${escapeHTML(template.name)}</span>
            <div class="template-item-actions">
                <button class="edit-template-btn modal-button secondary" data-id="${template.id}" title="Sửa mẫu">Sửa</button>
                <button class="delete-template-btn modal-button danger" data-id="${template.id}" title="Xóa mẫu">Xóa</button>
            </div>
        `;
        // Add event listeners directly here
        item.querySelector('.edit-template-btn').addEventListener('click', () => {
            showTemplateEditPanel(template.id);
        });
        item.querySelector('.delete-template-btn').addEventListener('click', () => {
            deleteTemplate(template.id);
        });
        templateListContainer.appendChild(item);
    });
     // Apply dynamic styles for hover effects if not handled purely by CSS classes
     templateListContainer.querySelectorAll('.delete-template-btn').forEach(btn => {
        // Rely on CSS classes :hover pseudo-class instead of JS if possible
    });
    templateListContainer.querySelectorAll('.edit-template-btn').forEach(btn => {
         // Rely on CSS classes :hover pseudo-class instead of JS if possible
     });
};


const showTemplateEditPanel = (templateId = null) => {
    // ... (Giữ nguyên)
     templateListSection.classList.add('hidden');
    templateEditPanel.classList.remove('hidden');

    if (templateId) { // Editing existing template
        const template = templates.find(t => t.id === templateId);
        if (template) {
            templateEditTitle.textContent = "Sửa Mẫu";
            templateEditId.value = template.id;
            templateEditName.value = template.name;
            templateEditTitleInput.value = template.title;
            templateEditText.value = template.text;
            templateEditTags.value = (template.tags || []).join(', ');
        } else {
             console.error("Không tìm thấy mẫu để sửa ID:", templateId);
             hideTemplateEditPanel(); // Hide if template not found
             return;
        }
    } else { // Creating new template
        templateEditTitle.textContent = "Tạo Mẫu Mới";
        templateEditId.value = ''; // Clear ID
        templateEditName.value = '';
        templateEditTitleInput.value = '';
        templateEditText.value = '';
        templateEditTags.value = '';
    }
    templateEditName.focus();
};

const hideTemplateEditPanel = () => {
    // ... (Giữ nguyên)
     templateEditPanel.classList.add('hidden');
    templateListSection.classList.remove('hidden');
    // Clear form fields after hiding
    templateEditId.value = '';
    templateEditName.value = '';
    templateEditTitleInput.value = '';
    templateEditText.value = '';
    templateEditTags.value = '';
};

const showTemplateModal = () => {
    // ... (Giữ nguyên)
     renderTemplateList();
    hideTemplateEditPanel(); // Ensure edit panel is hidden initially
    templateModal.classList.add('visible');
    templateModal.classList.remove('hidden');
    closeTemplateModalBtn.focus();
};

const hideTemplateModal = () => {
    // ... (Giữ nguyên)
     templateModal.classList.remove('visible');
    templateModal.addEventListener('transitionend', (e) => {
         if (e.target === templateModal) {
            templateModal.classList.add('hidden');
         }
    }, { once: true });
};

const populateTemplateDropdown = () => {
    // ... (Giữ nguyên)
     const currentSelection = templateSelect.value;
    templateSelect.innerHTML = '<option value="">-- Không dùng mẫu --</option>'; // Reset
    templates.sort((a, b) => a.name.localeCompare(b.name)).forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = escapeHTML(template.name);
        templateSelect.appendChild(option);
    });
     if (templates.some(t => t.id === parseInt(currentSelection))) {
        templateSelect.value = currentSelection;
    } else {
        templateSelect.value = "";
    }
};

const applyTemplate = () => {
    // ... (Giữ nguyên)
     const selectedId = templateSelect.value ? parseInt(templateSelect.value) : null;
    if (selectedId) {
        const template = templates.find(t => t.id === selectedId);
        if (template) {
            newNoteTitle.value = template.title;
            newNoteText.value = template.text;
            newNoteTags.value = (template.tags || []).join(', ');
        }
    } // No else needed, keeps current input if "-- Không dùng mẫu --" selected
};


// --- Other Panel/Import/Export ---

const showAddPanel = () => {
    // ... (Giữ nguyên)
     hideTagSuggestions();
    addNotePanel.classList.remove('hidden');
    showAddPanelBtn.classList.add('hidden');
    templateSelect.value = ""; // Reset template selection
    newNoteTitle.focus();
};

const hideAddPanel = () => {
    // ... (Giữ nguyên)
     hideTagSuggestions();
    addNotePanel.classList.add('hidden');
    if (!notesContainer.querySelector('.edit-input')) { // Check if editing note before showing FAB
        showAddPanelBtn.classList.remove('hidden');
    }
    newNoteTitle.value = '';
    newNoteText.value = '';
    newNoteTags.value = '';
    templateSelect.value = ""; // Reset template selection
};

const exportNotes = () => {
    // ... (Giữ nguyên - Exports both notes and templates)
     if (notes.length === 0 && templates.length === 0) {
         alert("Không có ghi chú hoặc mẫu nào để xuất.");
         return;
     }
    try {
        const dataToExport = {
            notes: notes.map(note => ({ /* ... note properties ... */
                 id: note.id, title: note.title || '', text: note.text || '', tags: note.tags || [], pinned: note.pinned || false, lastModified: note.lastModified || note.id, archived: note.archived || false, color: note.color || null, deleted: note.deleted || false, deletedTimestamp: note.deletedTimestamp || null
            })),
            templates: templates.map(template => ({ /* ... template properties ... */
                 id: template.id, name: template.name, title: template.title || '', text: template.text || '', tags: template.tags || []
            }))
         };
        // ... rest of export logic (stringify, blob, download) ...
         const jsonData = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        a.download = `start-notes-backup-${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (error) { console.error("Lỗi xuất dữ liệu:", error); alert("Lỗi khi xuất dữ liệu."); }
};

const importNotes = (file) => {
    // ... (Giữ nguyên - Imports both notes and templates)
     if (!file) { alert("Vui lòng chọn file JSON hợp lệ."); return; }
    if (!confirm("CẢNH BÁO:\nThao tác này sẽ THAY THẾ TOÀN BỘ ghi chú và mẫu hiện tại bằng nội dung từ file đã chọn.\n\nBạn chắc chắn muốn tiếp tục?")) { importFileInput.value = null; return; }
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedData = JSON.parse(event.target.result);
             if (typeof importedData !== 'object' || importedData === null) { throw new Error("Dữ liệu trong file không phải là một đối tượng JSON."); }
             let importedNotesCount = 0;
             let importedTemplatesCount = 0;
            // Import Notes
            if (importedData.notes && Array.isArray(importedData.notes)) {
                // ... validation logic ...
                 notes = importedData.notes.map((note, index) => { /* ... validation ... */
                     if (typeof note !== 'object' || note === null) return null;
                     const validId = typeof note.id === 'number' ? note.id : Date.now() + index;
                     const validLastModified = typeof note.lastModified === 'number' ? note.lastModified : validId;
                     return { id: validId, title: typeof note.title === 'string' ? note.title : '', text: typeof note.text === 'string' ? note.text : '', tags: Array.isArray(note.tags) ? note.tags.map(String).map(t => t.trim().toLowerCase()).filter(t => t !== '') : [], pinned: typeof note.pinned === 'boolean' ? note.pinned : false, lastModified: validLastModified, archived: typeof note.archived === 'boolean' ? note.archived : false, color: typeof note.color === 'string' ? note.color : null, deleted: typeof note.deleted === 'boolean' ? note.deleted : false, deletedTimestamp: typeof note.deletedTimestamp === 'number' ? note.deletedTimestamp : null };
                 }).filter(Boolean);
                 importedNotesCount = notes.length;
             } else { notes = []; }
            // Import Templates
            if (importedData.templates && Array.isArray(importedData.templates)) {
                 // ... validation logic ...
                 templates = importedData.templates.map((template, index) => { /* ... validation ... */
                      if (typeof template !== 'object' || template === null) return null;
                      const validId = typeof template.id === 'number' ? template.id : Date.now() + index + 1000;
                      return { id: validId, name: typeof template.name === 'string' && template.name.trim() ? template.name.trim() : `Mẫu ${validId}`, title: typeof template.title === 'string' ? template.title : '', text: typeof template.text === 'string' ? template.text : '', tags: Array.isArray(template.tags) ? template.tags.map(String).map(t => t.trim().toLowerCase()).filter(t => t !== '') : [] };
                  }).filter(Boolean);
                 importedTemplatesCount = templates.length;
             } else { templates = []; }
            // Handle old format (array of notes) or invalid structure
            if (importedNotesCount === 0 && importedTemplatesCount === 0 && !importedData.notes && !importedData.templates) {
                 if (Array.isArray(importedData)) { // Old format
                     notes = importedData.map((note, index) => { /* ... validation ... */
                          if (typeof note !== 'object' || note === null) return null;
                          const validId = typeof note.id === 'number' ? note.id : Date.now() + index;
                          const validLastModified = typeof note.lastModified === 'number' ? note.lastModified : validId;
                          return { id: validId, title: typeof note.title === 'string' ? note.title : '', text: typeof note.text === 'string' ? note.text : '', tags: Array.isArray(note.tags) ? note.tags.map(String).map(t => t.trim().toLowerCase()).filter(t => t !== '') : [], pinned: typeof note.pinned === 'boolean' ? note.pinned : false, lastModified: validLastModified, archived: typeof note.archived === 'boolean' ? note.archived : false, color: typeof note.color === 'string' ? note.color : null, deleted: typeof note.deleted === 'boolean' ? note.deleted : false, deletedTimestamp: typeof note.deletedTimestamp === 'number' ? note.deletedTimestamp : null };
                      }).filter(Boolean);
                     templates = [];
                     importedNotesCount = notes.length;
                     if (importedNotesCount === 0) { throw new Error("File JSON hợp lệ nhưng không chứa dữ liệu ghi chú."); }
                 } else { throw new Error("File JSON không chứa key 'notes' hoặc 'templates' hợp lệ."); }
            }
            // Save and refresh
            saveNotes(); saveTemplates();
            isViewingArchived = false; isViewingTrash = false;
            displayNotes(); populateTemplateDropdown();
            alert(`Đã nhập thành công ${importedNotesCount} ghi chú và ${importedTemplatesCount} mẫu!`);
        } catch (error) { /* ... error handling ... */
             console.error("Lỗi nhập file:", error);
            alert(`Lỗi nhập file: ${error.message}\n\nVui lòng kiểm tra xem file có đúng định dạng JSON và cấu trúc dữ liệu hợp lệ không.`);
         } finally { importFileInput.value = null; }
    };
    reader.onerror = (event) => { /* ... error handling ... */ console.error("Lỗi đọc file:", event.target.error); alert("Lỗi đọc file."); importFileInput.value = null; };
    reader.readAsText(file);
};

// =====================================================================
//  Core Display Function
// =====================================================================
const displayNotes = (filter = '') => {
    hideTagSuggestions();
    const scrollY = window.scrollY; // Save scroll position
    notesContainer.innerHTML = ''; // Clear current notes
    const lowerCaseFilter = filter.toLowerCase().trim();

    // 1. Filter notes based on current view (main, archive, trash)
    let notesToDisplay = notes.filter(note => {
        if (isViewingTrash) { return note.deleted; }
        else if (isViewingArchived) { return note.archived && !note.deleted; }
        else { return !note.deleted && !note.archived; } // Main view
    });

    // 2. Apply search filter if applicable
    if (filter) {
        notesToDisplay = notesToDisplay.filter(note => {
            const noteTitleLower = (note.title || '').toLowerCase();
            const noteTextLower = (note.text || '').toLowerCase();
            const isTagSearch = lowerCaseFilter.startsWith('#');
            const tagSearchTerm = isTagSearch ? lowerCaseFilter.substring(1) : null;

            if (isTagSearch) {
                if (!tagSearchTerm) return true; // Show all if only '#' is typed
                return note.tags && note.tags.some(tag => tag.toLowerCase() === tagSearchTerm);
            } else {
                // Normal search (title, text, tags)
                const titleMatch = noteTitleLower.includes(lowerCaseFilter);
                const textMatch = noteTextLower.includes(lowerCaseFilter);
                const tagMatch = note.tags && note.tags.some(tag => tag.toLowerCase().includes(lowerCaseFilter));
                return titleMatch || textMatch || tagMatch;
            }
        });
    }

    // 3. Sort notes based on view
    if (isViewingTrash) {
        notesToDisplay.sort((a, b) => (b.deletedTimestamp || b.lastModified) - (a.deletedTimestamp || a.lastModified)); // Newest deleted first
    } else if (isViewingArchived) {
        notesToDisplay.sort((a, b) => (b.lastModified || b.id) - (a.lastModified || a.id)); // Newest modified first
    } else { // Main view: Pinned first, then by lastModified
        notesToDisplay.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1; // a (pinned) comes first
            if (!a.pinned && b.pinned) return 1;  // b (pinned) comes first
            // If both pinned or both not pinned, sort by modification time (newest first)
            return (b.lastModified || b.id) - (a.lastModified || a.id);
        });
    }

    // Update header indicators and buttons
    archiveStatusIndicator.classList.add('hidden');
    trashStatusIndicator.classList.add('hidden');
    viewArchiveBtn.classList.remove('viewing-archive');
    viewTrashBtn.classList.remove('viewing-trash');
    emptyTrashBtn.classList.add('hidden'); // Hide by default
    if (isViewingTrash) {
        trashStatusIndicator.classList.remove('hidden');
        viewTrashBtn.textContent = 'Xem Ghi chú Chính'; viewTrashBtn.classList.add('viewing-trash');
        viewArchiveBtn.textContent = 'Xem Lưu trữ'; // Reset archive button text
        if(notesToDisplay.length > 0) emptyTrashBtn.classList.remove('hidden'); // Show if trash not empty
    } else if (isViewingArchived) {
        archiveStatusIndicator.classList.remove('hidden');
        viewArchiveBtn.textContent = 'Xem Ghi chú Chính'; viewArchiveBtn.classList.add('viewing-archive');
        viewTrashBtn.textContent = 'Xem Thùng rác'; // Reset trash button text
    } else { // Main view
        viewArchiveBtn.textContent = 'Xem Lưu trữ';
        viewTrashBtn.textContent = 'Xem Thùng rác';
    }

    // 4. Render notes or empty state message
    if (notesToDisplay.length === 0) {
        let emptyMessage = '';
        if (isViewingTrash) { emptyMessage = filter ? 'Không tìm thấy ghi chú rác khớp...' : 'Thùng rác trống.'; }
        else if (isViewingArchived) { emptyMessage = filter ? 'Không tìm thấy ghi chú lưu trữ khớp...' : 'Lưu trữ trống.'; }
        else { emptyMessage = filter ? 'Không tìm thấy ghi chú khớp...' : 'Chưa có ghi chú nào. Nhấn "+" để thêm.'; }
        notesContainer.innerHTML = `<p class="empty-state">${emptyMessage}</p>`;
        // Destroy Sortable instance if list is empty
        if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null; }
    } else {
        notesToDisplay.forEach(note => {
            const noteElement = renderNoteElement(note); // Use the function that uses helpers
            notesContainer.appendChild(noteElement);
        });
        // Initialize or re-initialize SortableJS only for the main view
        if (!isViewingArchived && !isViewingTrash) {
            initSortable();
        } else {
            if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null; }
        }
    }

    // Restore scroll position
    window.scrollTo(0, scrollY);
};

// =====================================================================
//  Event Listeners Setup Function
// =====================================================================
const setupEventListeners = () => {
    themeToggleBtn.addEventListener('click', toggleTheme);
    addNoteBtn.addEventListener('click', addNote);
    showAddPanelBtn.addEventListener('click', showAddPanel);
    closeAddPanelBtn.addEventListener('click', hideAddPanel);
    // Submit note on Enter in title (if text is empty) or text area (always)
    newNoteTitle.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
             e.preventDefault();
             if (newNoteText.value.trim() === '') { // Submit if title has content and text is empty
                 addNoteBtn.click();
             } else {
                 newNoteText.focus(); // Move focus to text area if it has content
             }
         }
     });
     // newNoteText already handles submit via global Ctrl+S

    const debouncedDisplayNotes = debounce((filterVal) => displayNotes(filterVal), 300);
    searchInput.addEventListener('input', (e) => debouncedDisplayNotes(e.target.value));
    exportNotesBtn.addEventListener('click', exportNotes);
    importNotesBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', (e) => { if(e.target.files && e.target.files[0]) { importNotes(e.target.files[0]); } });
    viewArchiveBtn.addEventListener('click', () => { const wasViewingArchive = isViewingArchived; isViewingArchived = !wasViewingArchive; if (isViewingArchived) isViewingTrash = false; searchInput.value = ''; displayNotes(); });
    viewTrashBtn.addEventListener('click', () => { const wasViewingTrash = isViewingTrash; isViewingTrash = !wasViewingTrash; if (isViewingTrash) isViewingArchived = false; searchInput.value = ''; displayNotes(); });
    emptyTrashBtn.addEventListener('click', handleEmptyTrash);

    // Tag input listeners (delegated and direct)
    newNoteTags.addEventListener('input', handleTagInput);
    newNoteTags.addEventListener('blur', handleTagInputBlur);
    newNoteTags.addEventListener('keydown', handleTagInputKeydown);
    // Delegate listeners for tag inputs within edited notes
    notesContainer.addEventListener('input', (e) => { if (e.target.matches('.edit-tags-input')) handleTagInput(e); });
    notesContainer.addEventListener('blur', (e) => { if (e.target.matches('.edit-tags-input')) handleTagInputBlur(e); }, true); // Use capture phase for blur
    notesContainer.addEventListener('keydown', (e) => { if (e.target.matches('.edit-tags-input')) handleTagInputKeydown(e); });

    // --- Main Note Actions Listener (Event Delegation) ---
    notesContainer.addEventListener('click', (event) => {
        const target = event.target;
        const noteElement = target.closest('.note');

        // Ignore clicks if editing this note, unless it's a specific allowed action inside edit mode
        if (noteElement && noteElement.querySelector('textarea.edit-input')) {
             const isAllowedEditAction = target.closest('.save-edit-btn, .pin-btn, .color-swatch-btn, .edit-tags-input, .edit-title-input, .edit-input');
             if (!isAllowedEditAction) {
                 return; // Clicked elsewhere inside an editing note, do nothing
             }
         }

        // Handle tag badge clicks separately first
        const tagButton = target.closest('.tag-badge');
        if (tagButton?.dataset.tag) {
            event.preventDefault();
            event.stopPropagation(); // Prevent triggering other note actions
            searchInput.value = `#${tagButton.dataset.tag}`;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // Handle read more button click
        const readMoreButton = target.closest('.read-more-btn');
         if (readMoreButton && noteElement) {
             event.stopPropagation(); // Prevent other actions
             const noteId = parseInt(noteElement.dataset.id);
             const note = notes.find(n => n.id === noteId);
             if (note) {
                 showFullNoteModal(note.title, note.text);
             }
             return;
         }


        // Process actions only if a note element was clicked
        if (!noteElement) return;
        const noteId = parseInt(noteElement.dataset.id);
        const noteIndex = notes.findIndex(note => note.id === noteId);
        if (noteIndex === -1) return; // Should not happen

        // Handle specific action button clicks
        if (target.closest('.pin-btn') && !isViewingArchived && !isViewingTrash) { handleNotePin(noteId, noteIndex); }
        else if (target.closest('.delete-btn')) { handleNoteDelete(noteId, noteIndex); }
        else if (target.closest('.archive-btn') && !isViewingTrash && !isViewingArchived) { handleNoteArchive(noteId, noteIndex); }
        else if (target.closest('.unarchive-btn') && isViewingArchived) { handleNoteUnarchive(noteId, noteIndex); }
        else if (target.closest('.edit-btn') && !isViewingArchived && !isViewingTrash) { handleNoteEdit(noteElement, noteId, noteIndex); }
        else if (target.closest('.save-edit-btn')) { handleNoteSaveEdit(noteElement, noteId, noteIndex); }
        else if (target.closest('.restore-btn') && isViewingTrash) { handleNoteRestore(noteId, noteIndex); }
        else if (target.closest('.delete-permanent-btn') && isViewingTrash) { handleNoteDeletePermanent(noteId, noteIndex); }
        // Add default click-to-edit behavior if desired (uncomment below)
        // else if (!target.closest('.note-actions button, .note-tags button, input, textarea, .color-selector-container') && !noteElement.querySelector('textarea.edit-input') && !isViewingArchived && !isViewingTrash) {
             // Clicked on the note body itself (not buttons/inputs), initiate edit
             // handleNoteEdit(noteElement, noteId, noteIndex);
        // }
    });

    // --- Template Feature Listeners ---
    manageTemplatesBtn.addEventListener('click', showTemplateModal);
    closeTemplateModalBtn.addEventListener('click', hideTemplateModal);
    templateModal.addEventListener('click', (event) => { // Close on backdrop click
        if (event.target === templateModal) {
            if (templateEditPanel.classList.contains('hidden')) { // Only close if edit panel not shown
                 hideTemplateModal();
            }
        }
    });
    showAddTemplatePanelBtn.addEventListener('click', () => showTemplateEditPanel());
    cancelEditTemplateBtn.addEventListener('click', hideTemplateEditPanel);
    saveTemplateBtn.addEventListener('click', addOrUpdateTemplate);
    templateSelect.addEventListener('change', applyTemplate);


    // --- Global Keydown Listener ---
    // We remove the separate noteModalKeydownListener as the global one now handles modal checks
    document.addEventListener('keydown', (event) => {
        const activeElement = document.activeElement;
        const isTyping = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable);
        const isTemplateModalOpen = templateModal.classList.contains('visible');
        const isNoteModalOpen = !!document.querySelector('.note-modal.visible'); // Check if note view modal is open
        const isSuggestionBoxOpen = !!document.getElementById(SUGGESTION_BOX_ID);
        const isEditingNote = activeElement && activeElement.closest('.note') && (activeElement.matches('.edit-input, .edit-title-input, .edit-tags-input'));
        const isEditingTemplate = templateEditPanel.contains(activeElement);

        // Escape Key Logic (Prioritized)
        if (event.key === 'Escape') {
            if (isNoteModalOpen) {
                // Find the specific visible note modal and trigger its close button
                const visibleNoteModal = document.querySelector('.note-modal.visible');
                visibleNoteModal?.querySelector('.close-modal-btn')?.click();
            } else if (isTemplateModalOpen) {
                 if (!templateEditPanel.classList.contains('hidden')) {
                     hideTemplateEditPanel(); // Close edit panel first
                 } else {
                     hideTemplateModal(); // Then close modal
                 }
            } else if (isSuggestionBoxOpen) {
                hideTagSuggestions();
            } else if (!addNotePanel.classList.contains('hidden')) {
                hideAddPanel();
            } else { // Handle cancelling note edit
                const editingNoteElement = notesContainer.querySelector('.note .edit-input')?.closest('.note');
                if (editingNoteElement) {
                    // Use debouncedAutoSave's timer? No, safer to ask.
                    // Check if data actually changed before confirming? Could be complex.
                     if (confirm("Bạn có muốn hủy bỏ các thay đổi và đóng chỉnh sửa ghi chú không?")) {
                         // Find index and re-render that specific note from original data, or just redraw all
                         // Redrawing all is simpler for now to ensure consistency
                        displayNotes(searchInput.value);
                        // Ensure FAB is visible and sortable enabled if needed
                        showAddPanelBtn.classList.remove('hidden');
                        if (sortableInstance) sortableInstance.option('disabled', false);
                    }
                 } else if (searchInput === activeElement && searchInput.value !== '') {
                    searchInput.value = ''; displayNotes(); // Clear search on Esc if focused
                }
            }
             event.stopPropagation(); // Prevent potential default browser actions for Esc
            return; // Stop further processing for Escape
        }

        // If any modal is open (except for template save shortcut), block other global shortcuts
        if (isNoteModalOpen || isTemplateModalOpen) {
             if (!((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's' && isEditingTemplate)) {
                 return; // Block Ctrl+N, Ctrl+F etc. when a modal is open
             }
         }

        // Prevent shortcuts while typing generally, unless editing note/template or searching
        if (isTyping && !isEditingNote && !isEditingTemplate && activeElement !== searchInput ) return;

        // --- Shortcuts ---
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') { // Ctrl+N / Cmd+N
             event.preventDefault();
             if (addNotePanel.classList.contains('hidden') && !notesContainer.querySelector('.edit-input')) {
                showAddPanel(); // Open Add Note panel if not already open/editing
            }
         }
        else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { // Ctrl+S / Cmd+S
            if (isEditingNote) {
                event.preventDefault();
                activeElement.closest('.note')?.querySelector('.save-edit-btn')?.click(); // Simulate save click
            } else if (addNotePanel.contains(activeElement)) {
                event.preventDefault();
                addNoteBtn.click(); // Save from Add Note panel
            } else if (isEditingTemplate) {
                event.preventDefault();
                saveTemplateBtn.click(); // Save from Template Edit panel
            }
        }
        else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') { // Ctrl+F / Cmd+F
            event.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
    });

}; // End setupEventListeners


// =====================================================================
//  Initial Load Function
// =====================================================================
const loadNotesAndInit = () => {
     loadNotes();
     loadTemplates();
     applyTheme(localStorage.getItem(THEME_STORAGE_KEY) || 'light');
     isViewingArchived = false; isViewingTrash = false;
     displayNotes(); // Initial display
     populateTemplateDropdown();
     setupEventListeners();
};

// =====================================================================
//  Start the application
// =====================================================================
loadNotesAndInit();
