// =====================================================================
//  Constants & State Variables
// =====================================================================
const NOTES_STORAGE_KEY = 'startNotesData';
const THEME_STORAGE_KEY = 'themePref';
const SUGGESTION_BOX_ID = 'tag-suggestion-box';

let notes = [];
let isViewingArchived = false;
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

// =====================================================================
//  Utility Functions
// =====================================================================
const parseTags = (tagString) => { if (!tagString) return []; return tagString.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag !== ''); };
const debounce = (func, delay) => { let timeoutId; return function(...args) { clearTimeout(timeoutId); timeoutId = setTimeout(() => { func.apply(this, args); }, delay); }; };
const escapeRegExp = (string) => { return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
const formatTimestamp = (timestamp) => { if (!timestamp) return ''; return new Date(timestamp).toLocaleString('vi-VN'); }
// Helper to escape HTML (basic version)
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
            color: note.color || null
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
                color: note.color || null
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
            color: null
        };
        notes.unshift(newNote); // Add to the beginning (respects manual order later)
        saveNotes();
        if (isViewingArchived) {
            isViewingArchived = false;
        }
        displayNotes(searchInput.value);
        hideAddPanel();
    } else {
        alert("Vui lòng nhập Tiêu đề hoặc Nội dung cho ghi chú!");
    }
};


// =====================================================================
//  Helper Functions & Event Handlers (Define before usage in displayNotes/setupListeners)
// =====================================================================

const hideTagSuggestions = () => {
    const suggestionBox = document.getElementById(SUGGESTION_BOX_ID);
    if (suggestionBox) {
        suggestionBox.remove();
    }
    activeTagInputElement = null;
    document.removeEventListener('mousedown', handleClickOutsideSuggestions);
};

// Defined here because hideTagSuggestions needs it.
const handleClickOutsideSuggestions = (event) => {
    const suggestionBox = document.getElementById(SUGGESTION_BOX_ID);
    if (activeTagInputElement && suggestionBox &&
        !activeTagInputElement.contains(event.target) &&
        !suggestionBox.contains(event.target))
    {
        hideTagSuggestions();
    }
};

const handleNotePin = (noteId, noteIndex) => {
    notes[noteIndex].pinned = !notes[noteIndex].pinned;
    // No need to update lastModified just for pinning if we want to preserve manual order
    // notes[noteIndex].lastModified = Date.now();
    saveNotes();
    displayNotes(searchInput.value); // displayNotes will handle putting pinned notes first
};

const handleNoteDelete = (noteId, noteIndex) => {
    hideTagSuggestions();
    const noteIdentifier = notes[noteIndex].title || `ghi chú #${noteId}`;
    const confirmMessage = `Bạn chắc chắn muốn xóa vĩnh viễn ${isViewingArchived ? 'ghi chú lưu trữ' : 'ghi chú'} "${noteIdentifier}"?`;
    if (confirm(confirmMessage)) {
        notes.splice(noteIndex, 1); // Remove from array, preserves order of others
        saveNotes();
        displayNotes(searchInput.value);
        if (!addNotePanel.classList.contains('hidden')) {
            hideAddPanel();
        } else {
            showAddPanelBtn.classList.remove('hidden');
        }
    }
};

const handleNoteArchive = (noteId, noteIndex) => {
    notes[noteIndex].archived = true;
    notes[noteIndex].pinned = false; // Unpin when archiving
    notes[noteIndex].lastModified = Date.now(); // Update modified time for archive action
    saveNotes();
    displayNotes(searchInput.value);
};

const handleNoteUnarchive = (noteId, noteIndex) => {
    notes[noteIndex].archived = false;
    notes[noteIndex].lastModified = Date.now(); // Update modified time for unarchive action
    // Decide where to put it? Add to top or bottom? Let's add to top for now.
    const noteToUnarchive = notes.splice(noteIndex, 1)[0];
    notes.unshift(noteToUnarchive);
    saveNotes();
    displayNotes(searchInput.value);
};

const handleNoteEdit = (noteElement, noteId, noteIndex) => {
    hideTagSuggestions();
    if (sortableInstance) sortableInstance.option('disabled', true);
    showAddPanelBtn.classList.add('hidden');

    const noteData = notes[noteIndex];

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

    const colorSelectorContainer = document.createElement('div');
    colorSelectorContainer.classList.add('color-selector-container');
    colorSelectorContainer.setAttribute('role', 'radiogroup');
    colorSelectorContainer.setAttribute('aria-label', 'Chọn màu ghi chú');

    NOTE_COLORS.forEach(color => {
        const swatchBtn = document.createElement('button');
        swatchBtn.type = 'button';
        swatchBtn.classList.add('color-swatch-btn');
        swatchBtn.dataset.colorValue = color.value || '';
        swatchBtn.title = color.name;
        swatchBtn.setAttribute('role', 'radio');
        swatchBtn.setAttribute('aria-checked', 'false');

        if (color.value) {
            swatchBtn.style.backgroundColor = color.hex;
        } else {
            swatchBtn.classList.add('default-color-swatch');
            swatchBtn.innerHTML = '&#x2715;';
        }

        if (noteData.color === color.value) {
            swatchBtn.classList.add('selected');
            swatchBtn.setAttribute('aria-checked', 'true');
            noteElement.dataset.selectedColor = color.value || '';
        }

        swatchBtn.addEventListener('click', () => {
            const selectedValue = swatchBtn.dataset.colorValue;
            noteElement.dataset.selectedColor = selectedValue;
            colorSelectorContainer.querySelectorAll('.color-swatch-btn').forEach(btn => {
                const isSelected = btn === swatchBtn;
                btn.classList.toggle('selected', isSelected);
                btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
            });
            NOTE_COLORS.forEach(c => {
                if (c.value) noteElement.classList.remove(c.value);
            });
            if (selectedValue) {
                noteElement.classList.add(selectedValue);
            }
        });
        colorSelectorContainer.appendChild(swatchBtn);
    });

    const saveBtn = document.createElement('button');
    saveBtn.classList.add('save-edit-btn');
    saveBtn.textContent = 'Lưu';

    const actionsElement = noteElement.querySelector('.note-actions');
    const contentElement = noteElement.querySelector('.note-content');
    const titleElement = noteElement.querySelector('.note-title');
    const tagsElement = noteElement.querySelector('.note-tags');
    const timestampElement = noteElement.querySelector('.note-timestamp');
    const bookmarkIcon = noteElement.querySelector('.pinned-bookmark-icon');

    let buttonsToKeepHTML = '';
    if (!isViewingArchived && actionsElement) {
        buttonsToKeepHTML = actionsElement.querySelector('.pin-btn')?.outerHTML || '';
    }

    if(bookmarkIcon) bookmarkIcon.style.display = 'none';
    if(titleElement) titleElement.style.display = 'none';
    if(contentElement) contentElement.style.display = 'none';
    if(tagsElement) tagsElement.style.display = 'none';
    if(timestampElement) timestampElement.style.display = 'none';

    const insertBeforeElement = contentElement || actionsElement;
    noteElement.insertBefore(editTitleInput, insertBeforeElement);
    noteElement.insertBefore(editInput, insertBeforeElement);
    noteElement.insertBefore(editTagsInput, insertBeforeElement);
    noteElement.insertBefore(colorSelectorContainer, insertBeforeElement);

    if(actionsElement) {
        actionsElement.innerHTML = buttonsToKeepHTML;
        actionsElement.appendChild(saveBtn);
    }

    editTitleInput.focus();
};

// Function remains the same as the last version (only updates lastModified if content changed)
const handleNoteSaveEdit = (noteElement, noteId, noteIndex) => {
    const editTitleInput = noteElement.querySelector('input.edit-title-input');
    const editInput = noteElement.querySelector('textarea.edit-input');
    const editTagsInput = noteElement.querySelector('input.edit-tags-input');

    // Lấy giá trị mới
    const newTitle = editTitleInput ? editTitleInput.value.trim() : '';
    const newText = editInput ? editInput.value : '';
    const newTagString = editTagsInput ? editTagsInput.value : '';
    const newTags = parseTags(newTagString); // Parse tags mới
    const selectedColorValue = noteElement.dataset.selectedColor;
    const newColor = selectedColorValue === '' ? null : selectedColorValue;

    // Lấy giá trị cũ để so sánh
    const oldTitle = notes[noteIndex].title;
    const oldText = notes[noteIndex].text;
    const oldTags = notes[noteIndex].tags || [];
    const oldColor = notes[noteIndex].color;

    // Kiểm tra xem các thuộc tính nào đã thực sự thay đổi
    const titleChanged = oldTitle !== newTitle;
    const textChanged = oldText !== newText;
    const tagsChanged = JSON.stringify(oldTags.sort()) !== JSON.stringify(newTags.sort());
    const colorChanged = oldColor !== newColor;

    const anyPropertyChanged = titleChanged || textChanged || tagsChanged || colorChanged;
    const contentChanged = titleChanged || textChanged || tagsChanged;

    if (newTitle || newText.trim()) {
        notes[noteIndex].title = newTitle;
        notes[noteIndex].text = newText;
        notes[noteIndex].tags = newTags;
        notes[noteIndex].color = newColor;

        if (contentChanged) {
            notes[noteIndex].lastModified = Date.now();
        }

        if (anyPropertyChanged) {
            saveNotes();
        }

        displayNotes(searchInput.value);
        showAddPanelBtn.classList.remove('hidden');
    } else {
        alert("Tiêu đề hoặc Nội dung không được để trống hoàn toàn!");
        displayNotes(searchInput.value);
        showAddPanelBtn.classList.remove('hidden');
    }

    delete noteElement.dataset.selectedColor;
    hideTagSuggestions();
    if(sortableInstance) sortableInstance.option('disabled', false);
};


const handleChecklistToggle = (noteId, clickedCheckbox) => {
    const noteIndex = notes.findIndex(note => note.id === noteId);
    if (noteIndex === -1) return;
    const noteData = notes[noteIndex];
    const noteText = noteData.text;
    const noteElement = notesContainer.querySelector(`.note[data-id="${noteId}"] .note-content`);
    if (!noteElement && !document.querySelector(`.note[data-id="${noteId}"] textarea.edit-input`)) {
         console.error("Cannot find note content or edit area to update checklist.");
         return;
    }
     const allCheckboxesInNote = noteElement
        ? Array.from(noteElement.querySelectorAll('input[type="checkbox"].task-list-item-checkbox'))
        : [];
    const checkboxIndex = allCheckboxesInNote.indexOf(clickedCheckbox);
    if (checkboxIndex === -1) {
        console.error("Could not determine checkbox index within the rendered list.");
         clickedCheckbox.checked = !clickedCheckbox.checked;
        return;
    }
    try {
        const taskRegex = /^- \[( |x|X)\]/gm;
        let currentMatchIndex = 0;
        let updated = false;
        const updatedText = noteText.replace(taskRegex, (match, currentState) => {
            if (currentMatchIndex === checkboxIndex) {
                const newState = (currentState === ' ' ? 'x' : ' ');
                updated = true;
                currentMatchIndex++;
                return `- [${newState}]`;
            } else {
                currentMatchIndex++;
                return match;
            }
        });
        if (updated) {
            notes[noteIndex].text = updatedText;
            notes[noteIndex].lastModified = Date.now(); // Checklist change should update lastModified
            saveNotes();
            // We need to redraw to reflect the change, which might re-sort if lastModified is used
            // Since we removed lastModified sorting from main view, this is okay.
            displayNotes(searchInput.value);
        } else {
            console.error("Failed to find corresponding checklist item in Markdown data at index:", checkboxIndex);
             clickedCheckbox.checked = !clickedCheckbox.checked;
        }
    } catch (error) {
        console.error("Error updating checklist Markdown:", error);
        clickedCheckbox.checked = !clickedCheckbox.checked;
        alert("Đã xảy ra lỗi khi cập nhật checklist.");
    }
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
            const modalCheckboxes = modalBody.querySelectorAll('input[type="checkbox"]');
            modalCheckboxes.forEach(checkbox => {
                checkbox.disabled = true;
                 checkbox.style.cursor = 'not-allowed';
            });
        } catch (e) {
            console.error("Lỗi parse markdown cho modal:", e);
            modalBody.textContent = noteText || '';
        }
    } else {
        modalBody.textContent = noteText || '';
    }
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    requestAnimationFrame(() => {
        modal.classList.add('visible');
    });
    closeModalBtn.focus();
    const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const closeFunc = () => {
        modal.classList.remove('visible');
        modal.addEventListener('transitionend', () => {
             if (modal.parentNode) {
                 modal.remove();
             }
             document.removeEventListener('keydown', handleModalKeyDown);
        }, { once: true });
    };
     const handleModalKeyDown = (event) => {
        if (event.key === 'Escape') {
            closeFunc();
        }
        if (event.key === 'Tab') {
             if (event.shiftKey) {
                 if (document.activeElement === firstElement) {
                     lastElement.focus();
                     event.preventDefault();
                 }
             } else {
                 if (document.activeElement === lastElement) {
                     firstElement.focus();
                     event.preventDefault();
                 }
             }
         }
    };
    closeModalBtn.addEventListener('click', closeFunc);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeFunc();
        }
    });
    document.addEventListener('keydown', handleModalKeyDown);
};

const renderNoteElement = (note) => {
    const noteElement = document.createElement('div');
    noteElement.classList.add('note');
    noteElement.dataset.id = note.id;

    NOTE_COLORS.forEach(color => {
        if (color.value) noteElement.classList.remove(color.value);
    });
    if (note.color) {
        noteElement.classList.add(note.color);
    }

    if (note.pinned && !isViewingArchived) {
        noteElement.classList.add('pinned-note');
        const bookmarkIcon = document.createElement('span');
        bookmarkIcon.classList.add('pinned-bookmark-icon');
        bookmarkIcon.innerHTML = '&#128278;';
        bookmarkIcon.setAttribute('aria-hidden', 'true');
        noteElement.appendChild(bookmarkIcon);
    }

    if (note.title) {
        const titleElement = document.createElement('h3');
        titleElement.classList.add('note-title');
        let titleHTML = note.title;
        const filter = searchInput.value.toLowerCase().trim();
        const isTagSearch = filter.startsWith('#');
        if (!isTagSearch && filter && typeof escapeRegExp === 'function') {
            try {
                const highlightRegex = new RegExp(`(${escapeRegExp(filter)})`, 'gi');
                titleHTML = titleHTML.replace(highlightRegex, '<mark>$1</mark>');
            } catch(e) { console.error("Regex error in title highlight", e); }
        }
        titleElement.innerHTML = titleHTML;
        noteElement.appendChild(titleElement);
    }

    const contentElement = document.createElement('div');
    contentElement.classList.add('note-content');

    let originalParsedContentHTML = '';
    if (typeof marked === 'function') {
        try {
            originalParsedContentHTML = marked.parse(note.text || '');
        } catch(e) {
            console.error(`Markdown parsing error for note ${note.id}:`, e);
            originalParsedContentHTML = escapeHTML(note.text || '');
        }
    } else {
         originalParsedContentHTML = escapeHTML(note.text || '');
    }

    let displayContentHTML = originalParsedContentHTML;
    const filterContent = searchInput.value.toLowerCase().trim();
    const isTagSearchContent = filterContent.startsWith('#');
    if (!isTagSearchContent && filterContent && typeof escapeRegExp === 'function') {
        try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = originalParsedContentHTML;
            const textNodes = [];
            const walk = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while(node = walk.nextNode()) {
                if (node.parentElement && !['SCRIPT', 'STYLE', 'PRE', 'CODE'].includes(node.parentElement.tagName)) {
                     textNodes.push(node);
                }
            }
             const highlightRegex = new RegExp(`(${escapeRegExp(filterContent)})`, 'gi');
             textNodes.forEach(textNode => {
                const text = textNode.nodeValue;
                const newNodeValue = text.replace(highlightRegex, '<mark>$1</mark>');
                if (newNodeValue !== text) {
                    const span = document.createElement('span');
                    span.innerHTML = newNodeValue;
                    textNode.parentNode.replaceChild(span, textNode);
                 }
             });
             displayContentHTML = tempDiv.innerHTML;

        } catch (e) {
            console.error("Regex error or DOM manipulation error in content highlight", e);
             try {
                const highlightRegexSimple = new RegExp(`(${escapeRegExp(filterContent)})`, 'gi');
                displayContentHTML = displayContentHTML.replace(highlightRegexSimple, '<mark>$1</mark>');
             } catch (re) {/* Ignore secondary error */}
        }
    }

    contentElement.innerHTML = displayContentHTML;

    const checkboxes = contentElement.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.disabled = false;
        checkbox.classList.add('task-list-item-checkbox');
        const parentLi = checkbox.closest('li');
        if (parentLi) {
            parentLi.classList.add('task-list-item');
        }
    });

    noteElement.appendChild(contentElement);

    requestAnimationFrame(() => {
         // Add slight delay or ensure styles are applied before checking scrollHeight
         // setTimeout(() => {
            if (contentElement.scrollHeight > contentElement.clientHeight + 2) {
                contentElement.classList.add('has-overflow');
                const readMoreBtn = document.createElement('button');
                readMoreBtn.textContent = 'Xem thêm';
                readMoreBtn.classList.add('read-more-btn');
                readMoreBtn.type = 'button';
                readMoreBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showFullNoteModal(note.title, note.text);
                });
                // Check if button already exists to prevent duplicates during potential re-renders
                if (!noteElement.querySelector('.read-more-btn')) {
                    noteElement.appendChild(readMoreBtn);
                }
            }
         // }, 0); // Optional delay
    });


    const tagsElement = document.createElement('div');
    tagsElement.classList.add('note-tags');
    if (note.tags && note.tags.length > 0) {
        note.tags.forEach(tag => {
            const tagBadge = document.createElement('button');
            tagBadge.classList.add('tag-badge');
            tagBadge.textContent = `#${tag}`;
            tagBadge.dataset.tag = tag;
            tagBadge.type = 'button';
            tagsElement.appendChild(tagBadge);
        });
    }
    noteElement.appendChild(tagsElement);

    const timestampElement = document.createElement('small');
    timestampElement.classList.add('note-timestamp');
    const creationDate = formatTimestamp(note.id);
    let timestampText = `Tạo: ${creationDate}`;
    if (note.lastModified && note.lastModified > note.id + 60000) {
        const modifiedDate = formatTimestamp(note.lastModified);
        timestampText += ` (Sửa: ${modifiedDate})`;
    }
    timestampElement.textContent = timestampText;
    noteElement.appendChild(timestampElement);

    const actionsElement = document.createElement('div');
    actionsElement.classList.add('note-actions');

    if (!isViewingArchived) {
        const pinBtn = document.createElement('button');
        pinBtn.classList.add('pin-btn');
        pinBtn.innerHTML = '&#128204;';
        pinBtn.title = note.pinned ? "Bỏ ghim" : "Ghim ghi chú";
        pinBtn.setAttribute('aria-label', note.pinned ? "Bỏ ghim ghi chú" : "Ghim ghi chú");
        pinBtn.setAttribute('aria-pressed', note.pinned ? 'true' : 'false');
        if (note.pinned) {
            pinBtn.classList.add('pinned');
        }
        actionsElement.appendChild(pinBtn);
    }

    const editBtn = document.createElement('button');
    editBtn.classList.add('edit-btn');
    editBtn.textContent = 'Sửa';
    editBtn.title = 'Sửa ghi chú';
    actionsElement.appendChild(editBtn);

    if (isViewingArchived) {
        const unarchiveBtn = document.createElement('button');
        unarchiveBtn.classList.add('unarchive-btn');
        unarchiveBtn.innerHTML = '&#x1F5C4;&#xFE0F;';
        unarchiveBtn.title = 'Khôi phục ghi chú';
        actionsElement.appendChild(unarchiveBtn);
    } else {
        const archiveBtn = document.createElement('button');
        archiveBtn.classList.add('archive-btn');
        archiveBtn.innerHTML = '&#128451;';
        archiveBtn.title = 'Lưu trữ ghi chú';
        actionsElement.appendChild(archiveBtn);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('delete-btn');
    deleteBtn.textContent = 'Xóa';
    deleteBtn.title = 'Xóa ghi chú vĩnh viễn';
    actionsElement.appendChild(deleteBtn);

    noteElement.appendChild(actionsElement);

    return noteElement;
};

const handleDragEnd = (evt) => {
    // Get the current visual order from the DOM
    const itemIds = Array.from(notesContainer.children)
                       .map(el => el.classList.contains('note') ? parseInt(el.dataset.id) : null)
                       .filter(id => id !== null);

    // Create a map of notes currently in the main `notes` array for quick lookup
    const noteMap = new Map(notes.map(note => [note.id, note]));

    // Rebuild the `notes` array based on the new visual order, keeping archived notes separate
    const reorderedNotes = [];
    const stillArchivedNotes = [];

    itemIds.forEach(id => {
        const note = noteMap.get(id);
        if (note && !note.archived) { // Ensure note exists and is not archived
            reorderedNotes.push(note);
        }
    });

    // Find notes that were originally archived and keep them
    notes.forEach(note => {
        if (note.archived) {
            stillArchivedNotes.push(note);
        }
    });

    // Combine the reordered visible notes and the archived notes
    notes = [...reorderedNotes, ...stillArchivedNotes];

    saveNotes();
    // No need to call displayNotes, the visual order is already correct.
};


const initSortable = () => {
    if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
    }
    if (typeof Sortable === 'function' &&
        notesContainer &&
        notesContainer.children.length > 0 &&
        !notesContainer.querySelector('.empty-state') &&
        !isViewingArchived )
    {
        sortableInstance = new Sortable(notesContainer, {
            animation: 150,
            handle: '.note', // Drag the whole note
            // Prevent drag start on interactive elements
            filter: '.note-content input, .note-content textarea, .note-content button, .note-actions button, .tag-badge, .note-content a, .task-list-item-checkbox, .suggestion-item, .read-more-btn, .color-swatch-btn',
            preventOnFilter: true,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            onEnd: handleDragEnd, // Function to save the new order
            delay: 100, // Slightly shorter delay
            delayOnTouchOnly: true
        });
    } else if (typeof Sortable !== 'function' && notes.some(n => !n.archived) && !isViewingArchived) {
        console.warn("Sortable.js not loaded. Drag-and-drop disabled.");
    }
};

const getAllUniqueTags = () => {
    const allTags = notes.reduce((acc, note) => {
        if (note.tags && note.tags.length > 0) {
            acc.push(...note.tags);
        }
        return acc;
    }, []);
    return [...new Set(allTags)].sort();
};

const showTagSuggestions = (inputElement, currentTagFragment, suggestions) => {
    hideTagSuggestions();
    if (suggestions.length === 0) {
        return;
    }
    activeTagInputElement = inputElement;
    const suggestionBox = document.createElement('div');
    suggestionBox.id = SUGGESTION_BOX_ID;
    suggestionBox.classList.add('tag-suggestions');
    suggestionBox.setAttribute('role', 'listbox');

    suggestions.forEach(tag => {
        const item = document.createElement('div');
        item.classList.add('suggestion-item');
        item.textContent = tag;
        item.setAttribute('role', 'option');
        item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const currentValue = inputElement.value;
            const lastCommaIndex = currentValue.lastIndexOf(',');
            let baseValue = '';
            if (lastCommaIndex !== -1) {
                baseValue = currentValue.substring(0, lastCommaIndex + 1).trimStart() + ' ';
            }
            inputElement.value = baseValue + tag + ', ';
            hideTagSuggestions();
            inputElement.focus();
            inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length);
        });
        suggestionBox.appendChild(item);
    });

    const inputRect = inputElement.getBoundingClientRect();
    document.body.appendChild(suggestionBox);
    let top = inputRect.bottom + window.scrollY;
    let left = inputRect.left + window.scrollX;
    suggestionBox.style.position = 'absolute';
    suggestionBox.style.top = `${top}px`;
    suggestionBox.style.left = `${left}px`;
    suggestionBox.style.minWidth = `${inputRect.width}px`;
    suggestionBox.style.width = 'auto';
     setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutsideSuggestions);
     }, 0);
};

const handleTagInput = (event) => {
    const inputElement = event.target;
    const value = inputElement.value;
    const lastCommaIndex = value.lastIndexOf(',');
    const currentTagFragment = value.substring(lastCommaIndex + 1).trim().toLowerCase();
    if (currentTagFragment.length >= 1) {
        const allTags = getAllUniqueTags();
        const currentEnteredTags = parseTags(value.substring(0, lastCommaIndex + 1));
        const filteredSuggestions = allTags.filter(tag =>
            tag.toLowerCase().startsWith(currentTagFragment) &&
            !currentEnteredTags.includes(tag)
        );
        showTagSuggestions(inputElement, currentTagFragment, filteredSuggestions);
    } else {
        hideTagSuggestions();
    }
};

const handleTagInputBlur = (event) => {
    setTimeout(() => {
        const suggestionBox = document.getElementById(SUGGESTION_BOX_ID);
        if (suggestionBox && !suggestionBox.contains(document.activeElement)) {
            hideTagSuggestions();
        }
         else if (!suggestionBox) {
              hideTagSuggestions();
         }
    }, 150);
};

const handleTagInputKeydown = (event) => {
    const suggestionBox = document.getElementById(SUGGESTION_BOX_ID);
    if (event.key === 'Escape' && suggestionBox) {
        hideTagSuggestions();
    }
};

const showAddPanel = () => {
    hideTagSuggestions();
    addNotePanel.classList.remove('hidden');
    showAddPanelBtn.classList.add('hidden');
    newNoteTitle.focus();
};

const hideAddPanel = () => {
    hideTagSuggestions();
    addNotePanel.classList.add('hidden');
    showAddPanelBtn.classList.remove('hidden');
    newNoteTitle.value = '';
    newNoteText.value = '';
    newNoteTags.value = '';
};

const exportNotes = () => {
    if (notes.length === 0) {
        alert("Không có ghi chú nào để xuất.");
        return;
    }
    try {
         const notesToExport = notes.map(note => ({
            id: note.id,
            title: note.title || '',
            text: note.text,
            tags: note.tags || [],
            pinned: note.pinned || false,
            lastModified: note.lastModified || note.id,
            archived: note.archived || false,
            color: note.color || null
        }));
        const jsonData = JSON.stringify(notesToExport, null, 2);
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
        console.log("Xuất ghi chú thành công.");
    } catch (error) {
        console.error("Lỗi khi xuất ghi chú:", error);
        alert("Đã xảy ra lỗi khi cố gắng xuất ghi chú.");
    }
};

const importNotes = (file) => {
    if (!file) {
        alert("Vui lòng chọn một file để nhập.");
        return;
    }
    if (!confirm("CẢNH BÁO:\n\nThao tác này sẽ THAY THẾ TOÀN BỘ ghi chú hiện tại bằng nội dung từ file đã chọn.\n\nBạn có chắc chắn muốn tiếp tục?")) {
        return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedData = JSON.parse(event.target.result);
            if (!Array.isArray(importedData)) {
                throw new Error("Dữ liệu nhập vào không phải là một danh sách (mảng) hợp lệ.");
            }
            const validatedNotes = importedData.map((note, index) => {
                 if (typeof note !== 'object' || note === null) {
                     console.warn(`Mục ${index} trong file không phải object, bỏ qua.`);
                     return null;
                 }
                // Ensure correct types and defaults on import
                return {
                    id: typeof note.id === 'number' ? note.id : Date.now() + index,
                    title: typeof note.title === 'string' ? note.title : '',
                    text: typeof note.text === 'string' ? note.text : '',
                    tags: Array.isArray(note.tags) ? note.tags.map(String).filter(t => t.trim() !== '') : [],
                    pinned: typeof note.pinned === 'boolean' ? note.pinned : false,
                    lastModified: typeof note.lastModified === 'number' ? note.lastModified : (typeof note.id === 'number' ? note.id : Date.now() + index),
                    archived: typeof note.archived === 'boolean' ? note.archived : false,
                    color: typeof note.color === 'string' ? note.color : null
                };
            }).filter(Boolean); // Remove nulls from invalid entries
            notes = validatedNotes;
            saveNotes();
            isViewingArchived = false;
            displayNotes();
            alert(`Đã nhập thành công ${notes.length} ghi chú!`);
        } catch (error) {
            console.error("Lỗi khi phân tích hoặc xử lý file nhập:", error);
            alert(`Lỗi nhập file: ${error.message}\nVui lòng kiểm tra lại file JSON.`);
        } finally {
            importFileInput.value = null;
        }
    };
    reader.onerror = (event) => {
        console.error("Lỗi đọc file:", event.target.error);
        alert("Đã xảy ra lỗi khi đọc file.");
        importFileInput.value = null;
    };
    reader.readAsText(file);
};

// =====================================================================
//  Core Display Function (Depends on functions defined above)
// =====================================================================
// *** MODIFIED FUNCTION ***
const displayNotes = (filter = '') => {
    hideTagSuggestions();
    notesContainer.innerHTML = '';
    const lowerCaseFilter = filter.toLowerCase().trim();

    // 1. Filter notes by archive status and search term
    let notesToDisplay = notes.filter(note => {
        // Filter by archive status first
        if (note.archived !== isViewingArchived) {
            return false;
        }
        // Then filter by search term if provided
        if (filter) {
            const noteTitleLower = (note.title || '').toLowerCase();
            const noteTextLower = (note.text || '').toLowerCase();
            const isTagSearch = lowerCaseFilter.startsWith('#');
            const tagSearchTerm = isTagSearch ? lowerCaseFilter.substring(1) : null;

            if (isTagSearch) {
                 if (!tagSearchTerm) return true; // Show all if only '#' is entered
                return note.tags && note.tags.some(tag => tag.toLowerCase() === tagSearchTerm);
            } else {
                 const titleMatch = noteTitleLower.includes(lowerCaseFilter);
                 const textMatch = noteTextLower.includes(lowerCaseFilter);
                 const tagMatch = note.tags && note.tags.some(tag => tag.toLowerCase().includes(lowerCaseFilter));
                 return titleMatch || textMatch || tagMatch;
             }
        }
        // If no filter, include all notes matching archive status
        return true;
    });

    // 2. Sort notes based on view
    if (!isViewingArchived) {
        // --- MODIFIED SORTING for Main View ---
        // Only sort to bring pinned notes to the top.
        // Preserve the relative order determined by drag-and-drop or addition order otherwise.
        notesToDisplay.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
        // --- END MODIFIED SORTING ---
    } else {
         // Keep sorting archived notes by last modified date (newest first)
         notesToDisplay.sort((a, b) => (b.lastModified || b.id) - (a.lastModified || a.id));
    }

    // Update Archive Status Indicator & Button Text
    if (isViewingArchived) {
        archiveStatusIndicator.classList.remove('hidden');
        viewArchiveBtn.textContent = 'Xem Ghi chú Chính';
        viewArchiveBtn.classList.add('viewing-archive');
    } else {
        archiveStatusIndicator.classList.add('hidden');
        viewArchiveBtn.textContent = 'Xem Lưu trữ';
        viewArchiveBtn.classList.remove('viewing-archive');
    }

    // Display Empty State Message or Notes
    if (notesToDisplay.length === 0) {
        let emptyMessage = '';
        if (isViewingArchived) {
            emptyMessage = filter ? 'Không tìm thấy ghi chú lưu trữ phù hợp...' : 'Chưa có ghi chú nào được lưu trữ.';
        } else {
            emptyMessage = filter ? 'Không tìm thấy ghi chú phù hợp...' : 'Chưa có ghi chú nào. Dùng nút + để thêm!';
        }
        notesContainer.innerHTML = `<p class="empty-state">${emptyMessage}</p>`;
        if (sortableInstance) {
            sortableInstance.destroy();
            sortableInstance = null;
        }
        return;
    }

    // Render and Append Note Elements
    notesToDisplay.forEach(note => {
        const noteElement = renderNoteElement(note);
        notesContainer.appendChild(noteElement);
    });

    // Initialize SortableJS (only for main view)
    if (!isViewingArchived) {
        initSortable(); // Ensures Sortable is active/updated for the main view
    } else if (sortableInstance) {
        sortableInstance.destroy(); // Destroy if switching to archive view
        sortableInstance = null;
    }
};
// *** END MODIFIED FUNCTION ***


// =====================================================================
//  Event Listeners Setup Function
// =====================================================================
const setupEventListeners = () => {
    themeToggleBtn.addEventListener('click', toggleTheme);
    addNoteBtn.addEventListener('click', addNote);
    showAddPanelBtn.addEventListener('click', showAddPanel);
    closeAddPanelBtn.addEventListener('click', hideAddPanel);

    newNoteTitle.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            addNoteBtn.click();
        }
    });

    const debouncedDisplayNotes = debounce((filterValue) => {
        displayNotes(filterValue);
    }, 300);
    searchInput.addEventListener('input', (event) => {
        debouncedDisplayNotes(event.target.value);
    });

    exportNotesBtn.addEventListener('click', exportNotes);
    importNotesBtn.addEventListener('click', () => {
        importFileInput.click();
    });
    importFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if(file) {
            importNotes(file);
        }
    });

    viewArchiveBtn.addEventListener('click', () => {
        isViewingArchived = !isViewingArchived;
        searchInput.value = '';
        displayNotes();
    });

    newNoteTags.addEventListener('input', handleTagInput);
    newNoteTags.addEventListener('blur', handleTagInputBlur);
    newNoteTags.addEventListener('keydown', handleTagInputKeydown);

    notesContainer.addEventListener('input', (event) => {
        if (event.target.matches('.edit-tags-input')) {
            handleTagInput(event);
        }
    });
    notesContainer.addEventListener('blur', (event) => {
        if (event.target.matches('.edit-tags-input')) {
            handleTagInputBlur(event);
        }
    }, true);
    notesContainer.addEventListener('keydown', (event) => {
        if (event.target.matches('.edit-tags-input')) {
            handleTagInputKeydown(event);
        }
    });

    notesContainer.addEventListener('click', (event) => {
        const target = event.target;
        const noteElement = target.closest('.note');

        // Prevent most actions if editing, except for specific buttons
        if (noteElement && noteElement.querySelector('.edit-input') && !target.closest('.save-edit-btn') && !target.closest('.pin-btn') && !target.closest('.color-swatch-btn')) {
            return;
        }

        if (target.matches('.task-list-item-checkbox')) {
            if (noteElement) {
                const noteId = parseInt(noteElement.dataset.id);
                if (!noteElement.querySelector('.edit-input')) {
                     handleChecklistToggle(noteId, target);
                } else {
                    console.warn("Checklist cannot be toggled while editing the note text.");
                    target.checked = !target.checked;
                }
            }
            return;
        }

        const tagButton = target.closest('.tag-badge');
        if (tagButton && tagButton.dataset.tag) {
             event.preventDefault();
             searchInput.value = `#${tagButton.dataset.tag}`;
             searchInput.dispatchEvent(new Event('input', { bubbles: true }));
             searchInput.focus();
            return;
        }

        if (!noteElement) return;

        const noteId = parseInt(noteElement.dataset.id);
        const noteIndex = notes.findIndex(note => note.id === noteId);
        if (noteIndex === -1) return;

        if (target.closest('.pin-btn') && !isViewingArchived) {
            handleNotePin(noteId, noteIndex);
        }
        else if (target.closest('.delete-btn')) {
            handleNoteDelete(noteId, noteIndex);
        }
        else if (target.closest('.archive-btn') && !isViewingArchived) {
            handleNoteArchive(noteId, noteIndex);
        }
        else if (target.closest('.unarchive-btn') && isViewingArchived) {
            handleNoteUnarchive(noteId, noteIndex);
        }
        else if (target.closest('.edit-btn')) {
             const currentlyEditing = notesContainer.querySelector('.edit-input');
             if (currentlyEditing && currentlyEditing.closest('.note') !== noteElement) {
                 alert("Vui lòng lưu hoặc hủy thay đổi ở ghi chú đang sửa trước.");
                 return;
             }
            handleNoteEdit(noteElement, noteId, noteIndex);
        }
        else if (target.closest('.save-edit-btn')) {
            handleNoteSaveEdit(noteElement, noteId, noteIndex);
        }
    });

    document.addEventListener('keydown', (event) => {
        const activeElement = document.activeElement;
        const isTyping = ['INPUT', 'TEXTAREA'].includes(activeElement.tagName) || activeElement.isContentEditable;
        const isModalOpen = !!document.querySelector('.note-modal.visible');
        const isSuggestionBoxOpen = !!document.getElementById(SUGGESTION_BOX_ID);

        if (event.key === 'Escape') {
            if (isModalOpen) {
                const modal = document.querySelector('.note-modal.visible');
                if(modal) {
                    const closeBtn = modal.querySelector('.close-modal-btn');
                    if (closeBtn) closeBtn.click();
                }
            } else if (isSuggestionBoxOpen) {
                hideTagSuggestions();
            } else if (!addNotePanel.classList.contains('hidden')) {
                hideAddPanel();
            } else {
                 const editingNote = notesContainer.querySelector('.edit-input');
                 if (editingNote) {
                     if (confirm("Hủy bỏ các thay đổi và đóng chỉnh sửa?")) {
                         displayNotes(searchInput.value);
                         showAddPanelBtn.classList.remove('hidden');
                     }
                 }
             }
            return;
        }

        if (isModalOpen) return;

        const isEditingNote = activeElement.matches('.edit-input, .edit-title-input, .edit-tags-input');
        if (isTyping && !isEditingNote && !((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f')) {
             return;
         }

        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
            event.preventDefault();
            if (addNotePanel.classList.contains('hidden') && !notesContainer.querySelector('.edit-input')) {
                showAddPanel();
            }
        }
        else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
            const activeNoteElement = activeElement.closest('.note');
             if (activeNoteElement) {
                 const activeSaveBtn = activeNoteElement.querySelector('.save-edit-btn');
                 if (activeSaveBtn) {
                     event.preventDefault();
                     activeSaveBtn.click();
                 }
             }
        }
        else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
            event.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
    });
}

// =====================================================================
//  Initial Load Function
// =====================================================================
const loadNotesAndInit = () => {
     loadNotes();
     applyTheme(localStorage.getItem(THEME_STORAGE_KEY) || 'light');
     isViewingArchived = false;
     displayNotes();
     setupEventListeners();
};

// =====================================================================
//  Start the application
// =====================================================================
loadNotesAndInit();
