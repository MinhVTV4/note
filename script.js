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

// Parse comma-separated tags into an array
const parseTags = (tagString) => {
    if (!tagString) return [];
    return tagString.split(',')
                  .map(tag => tag.trim().toLowerCase())
                  .filter(tag => tag !== '');
};

// Debounce function execution
const debounce = (func, delay) => {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
};

// Escape special characters for RegExp
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Format timestamp for display
const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString('vi-VN');
}

// =====================================================================
//  Theme Management
// =====================================================================

const applyTheme = (theme) => {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
};

const toggleTheme = () => {
    const currentThemeIsDark = document.body.classList.contains('dark-mode');
    const newTheme = currentThemeIsDark ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
};

// =====================================================================
//  Note Data Management
// =====================================================================

// Save notes array to localStorage
const saveNotes = () => {
    try {
        const notesToSave = notes.map(note => ({
            id: note.id,
            title: note.title || '',
            text: note.text,
            tags: note.tags || [],
            pinned: note.pinned || false,
            lastModified: note.lastModified || note.id,
            archived: note.archived || false
        }));
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notesToSave));
    } catch (e) {
        console.error("Lỗi lưu ghi chú vào localStorage:", e);
        if (e.name === 'QuotaExceededError') { alert("Lỗi: Dung lượng lưu trữ cục bộ đã đầy..."); }
        else { alert("Đã xảy ra lỗi khi cố gắng lưu ghi chú."); }
    }
};

// Load notes from localStorage
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
                 archived: note.archived || false
             }));
         } catch (e) { console.error("Lỗi đọc dữ liệu ghi chú từ localStorage:", e); notes = []; }
     } else { notes = []; }
};

// Add a new note
const addNote = () => {
    const noteTitle = newNoteTitle.value.trim();
    const noteText = newNoteText.value;
    const tagString = newNoteTags.value;

    if (noteText.trim() || noteTitle) {
        const tags = parseTags(tagString);
        const now = Date.now();
        const newNote = {
            id: now, title: noteTitle, text: noteText, tags: tags,
            pinned: false, lastModified: now, archived: false
        };
        notes.unshift(newNote);
        saveNotes();
        if (isViewingArchived) { // Switch back to main view after adding
            isViewingArchived = false;
        }
        displayNotes(searchInput.value);
        hideAddPanel();
    } else {
        alert("Vui lòng nhập Tiêu đề hoặc Nội dung cho ghi chú!");
    }
};

// =====================================================================
//  Note Action Handlers (Called by Event Listener)
// =====================================================================

// Toggle note pinned state
const handleNotePin = (noteId, noteIndex) => {
    notes[noteIndex].pinned = !notes[noteIndex].pinned;
    notes[noteIndex].lastModified = Date.now();
    saveNotes();
    displayNotes(searchInput.value);
};

// Delete a note
const handleNoteDelete = (noteId, noteIndex) => {
    hideTagSuggestions(); // Hide suggestions if open
    const noteIdentifier = notes[noteIndex].title || `ghi chú #${noteId}`;
    const confirmMessage = `Bạn chắc chắn muốn xóa vĩnh viễn ${isViewingArchived ? 'ghi chú lưu trữ' : 'ghi chú'} "${noteIdentifier}"?`;
    if (confirm(confirmMessage)) {
        notes.splice(noteIndex, 1);
        saveNotes();
        displayNotes(searchInput.value);
        // Ensure FAB is visible if add panel isn't
        if (!addNotePanel.classList.contains('hidden')) { hideAddPanel(); }
        else { showAddPanelBtn.classList.remove('hidden'); }
    }
};

// Archive a note
const handleNoteArchive = (noteId, noteIndex) => {
    notes[noteIndex].archived = true;
    notes[noteIndex].pinned = false; // Unpin when archiving
    notes[noteIndex].lastModified = Date.now();
    saveNotes();
    displayNotes(searchInput.value);
};

// Unarchive a note
const handleNoteUnarchive = (noteId, noteIndex) => {
    notes[noteIndex].archived = false;
    notes[noteIndex].lastModified = Date.now();
    saveNotes();
    displayNotes(searchInput.value);
};

// Switch note to edit mode
const handleNoteEdit = (noteElement, noteId, noteIndex) => {
    hideTagSuggestions();
    if (sortableInstance) sortableInstance.option('disabled', true);
    showAddPanelBtn.classList.add('hidden');
    const noteData = notes[noteIndex];

    // Create edit fields
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

    const saveBtn = document.createElement('button');
    saveBtn.classList.add('save-edit-btn');
    saveBtn.textContent = 'Lưu';

    // Prepare UI update
    const actionsElement = noteElement.querySelector('.note-actions');
    const contentElement = noteElement.querySelector('.note-content');
    const titleElement = noteElement.querySelector('.note-title');
    const tagsElement = noteElement.querySelector('.note-tags');
    const timestampElement = noteElement.querySelector('.note-timestamp');
    const bookmarkIcon = noteElement.querySelector('.pinned-bookmark-icon');

    // Preserve appropriate buttons depending on view
    let buttonsToKeepHTML = '';
    if (!isViewingArchived && actionsElement) {
         buttonsToKeepHTML = actionsElement.querySelector('.pin-btn')?.outerHTML || '';
    }

    // Clear display elements
    if(bookmarkIcon) bookmarkIcon.remove();
    if(titleElement) titleElement.remove();
    if(contentElement) contentElement.innerHTML = '';
    if(tagsElement) tagsElement.remove();
    if(timestampElement) timestampElement.remove();

    // Add edit fields
    if(contentElement) {
        contentElement.appendChild(editTitleInput);
        contentElement.appendChild(editInput);
        contentElement.appendChild(editTagsInput);
    } else { /* Fallback */
        noteElement.insertBefore(editTagsInput, actionsElement);
        noteElement.insertBefore(editInput, editTagsInput);
        noteElement.insertBefore(editTitleInput, editInput);
    }
    if(actionsElement) {
        actionsElement.innerHTML = buttonsToKeepHTML;
        actionsElement.appendChild(saveBtn);
    }
    editTitleInput.focus();
};

// Save edits made to a note
const handleNoteSaveEdit = (noteElement, noteId, noteIndex) => {
    const editTitleInput = noteElement.querySelector('input.edit-title-input');
    const editInput = noteElement.querySelector('textarea.edit-input');
    const editTagsInput = noteElement.querySelector('input.edit-tags-input');

    const newTitle = editTitleInput ? editTitleInput.value.trim() : '';
    const newText = editInput ? editInput.value : '';
    const newTagString = editTagsInput ? editTagsInput.value : '';

    let changed = false;
    if (notes[noteIndex].title !== newTitle) changed = true;
    if (notes[noteIndex].text !== newText) changed = true;
    const newTags = parseTags(newTagString);
    if (JSON.stringify(notes[noteIndex].tags || []) !== JSON.stringify(newTags)) changed = true;

    if (newTitle || newText.trim()) {
        notes[noteIndex].title = newTitle;
        notes[noteIndex].text = newText;
        notes[noteIndex].tags = newTags;
        if (changed) { notes[noteIndex].lastModified = Date.now(); }
        saveNotes();
        displayNotes(searchInput.value);
        showAddPanelBtn.classList.remove('hidden');
    } else {
        alert("Tiêu đề hoặc Nội dung không được để trống hoàn toàn!");
        displayNotes(searchInput.value); // Revert UI
        showAddPanelBtn.classList.remove('hidden');
    }
    hideTagSuggestions(); // Hide suggestions after save attempt
    if(sortableInstance) sortableInstance.option('disabled', false);
    else initSortable();
};

// Toggle checklist item state
const handleChecklistToggle = (noteId, clickedCheckbox) => {
    const noteIndex = notes.findIndex(note => note.id === noteId); if (noteIndex === -1) return;
    const noteData = notes[noteIndex];
    const noteElement = notesContainer.querySelector(`.note[data-id="${noteId}"] .note-content`); if (!noteElement) return;
    const allCheckboxesInNote = noteElement.querySelectorAll('input[type="checkbox"].task-list-item-checkbox');
    const checkboxIndex = Array.from(allCheckboxesInNote).indexOf(clickedCheckbox); if (checkboxIndex === -1) { console.error("Không thể xác định vị trí checkbox."); clickedCheckbox.checked = !clickedCheckbox.checked; return; }
    try {
        const taskRegex = /^- \[( |x|X)\]/gm; let currentMatchIndex = 0; let updated = false;
        const updatedText = noteData.text.replace(taskRegex, (match, currentState) => { if (currentMatchIndex === checkboxIndex) { const newState = (currentState === ' ' ? 'x' : ' '); updated = true; currentMatchIndex++; return `- [${newState}]`; } else { currentMatchIndex++; return match; } });
        if (updated) { notes[noteIndex].text = updatedText; notes[noteIndex].lastModified = Date.now(); saveNotes(); displayNotes(searchInput.value); }
        else { console.error("Không tìm thấy mục checklist tương ứng trong Markdown tại index:", checkboxIndex); clickedCheckbox.checked = !clickedCheckbox.checked; }
    } catch (error) { console.error("Lỗi khi cập nhật Markdown cho checklist:", error); clickedCheckbox.checked = !clickedCheckbox.checked; alert("Đã xảy ra lỗi khi cập nhật checklist."); }
};


// =====================================================================
//  UI Rendering & Interaction
// =====================================================================

// Renders a single note card element
const renderNoteElement = (note) => {
    const noteElement = document.createElement('div');
    noteElement.classList.add('note');
    noteElement.dataset.id = note.id;

    // Add bookmark ONLY if pinned AND in main view
    if (note.pinned && !isViewingArchived) {
        noteElement.classList.add('pinned-note');
        const bookmarkIcon = document.createElement('span');
        bookmarkIcon.classList.add('pinned-bookmark-icon');
        bookmarkIcon.innerHTML = '&#128278;';
        noteElement.appendChild(bookmarkIcon);
    }

    // Render Title and Highlight
    if (note.title) {
        const titleElement = document.createElement('h3');
        titleElement.classList.add('note-title');
        let titleHTML = note.title;
        // Apply highlight if searching
        const filter = searchInput.value.toLowerCase().trim();
        const isTagSearch = filter.startsWith('#');
        if (!isTagSearch && filter && typeof escapeRegExp === 'function') { // Check if escapeRegExp exists
             try {
                 const highlightRegex = new RegExp(`(${escapeRegExp(filter)})`, 'gi');
                 titleHTML = titleHTML.replace(highlightRegex, '<mark>$1</mark>');
             } catch(e) { console.error("Regex error in title highlight", e); }
        }
        titleElement.innerHTML = titleHTML;
        noteElement.appendChild(titleElement);
    }

    // Render Content and Highlight
    const contentElement = document.createElement('div');
    contentElement.classList.add('note-content');
    let contentHTML = '';
    if (typeof marked === 'function') {
        try { contentHTML = marked.parse(note.text || ''); } catch (err) { console.error("Lỗi khi parse Markdown:", err); contentHTML = note.text || ''; }
    } else {
        console.warn("Thư viện marked.js chưa được tải!"); contentHTML = note.text || '';
    }
    // Apply highlight if searching
     const filter = searchInput.value.toLowerCase().trim();
     const isTagSearch = filter.startsWith('#');
    if (!isTagSearch && filter && typeof escapeRegExp === 'function') {
        try {
            const highlightRegex = new RegExp(`(${escapeRegExp(filter)})`, 'gi');
            contentHTML = contentHTML.replace(highlightRegex, '<mark>$1</mark>');
        } catch (e) { console.error("Regex error in content highlight", e); }
    }
    contentElement.innerHTML = contentHTML;
    const checkboxes = contentElement.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => { checkbox.disabled = false; checkbox.classList.add('task-list-item-checkbox'); const parentLi = checkbox.closest('li'); if (parentLi) { parentLi.classList.add('task-list-item'); } });
    noteElement.appendChild(contentElement);

    // Tags
    const tagsElement = document.createElement('div');
    tagsElement.classList.add('note-tags');
    if (note.tags && note.tags.length > 0) { note.tags.forEach(tag => { const tagBadge = document.createElement('button'); tagBadge.classList.add('tag-badge'); tagBadge.textContent = `#${tag}`; tagBadge.dataset.tag = tag; tagsElement.appendChild(tagBadge); }); }
    noteElement.appendChild(tagsElement);

    // Timestamp
    const timestampElement = document.createElement('small');
    timestampElement.classList.add('note-timestamp');
    const creationDate = formatTimestamp(note.id);
    let timestampText = `Tạo: ${creationDate}`;
    if (note.lastModified && note.lastModified > note.id + 60000) { const modifiedDate = formatTimestamp(note.lastModified); timestampText += ` (Sửa: ${modifiedDate})`; }
    timestampElement.textContent = timestampText;
    noteElement.appendChild(timestampElement);

    // Actions (Conditional Buttons)
    const actionsElement = document.createElement('div'); actionsElement.classList.add('note-actions');
    if (!isViewingArchived) { // Only show pin in main view
        const pinBtn = document.createElement('button'); pinBtn.classList.add('pin-btn'); pinBtn.innerHTML = '&#128204;'; pinBtn.title = note.pinned ? "Bỏ ghim" : "Ghim ghi chú"; if (note.pinned) { pinBtn.classList.add('pinned'); } actionsElement.appendChild(pinBtn);
    }
    const editBtn = document.createElement('button'); editBtn.classList.add('edit-btn'); editBtn.textContent = 'Sửa'; actionsElement.appendChild(editBtn);
    if (isViewingArchived) {
        const unarchiveBtn = document.createElement('button'); unarchiveBtn.classList.add('unarchive-btn'); unarchiveBtn.innerHTML = '&#x1F5C4;&#xFE0F;'; unarchiveBtn.title = 'Khôi phục ghi chú'; actionsElement.appendChild(unarchiveBtn);
    } else {
         const archiveBtn = document.createElement('button'); archiveBtn.classList.add('archive-btn'); archiveBtn.innerHTML = '&#128451;'; archiveBtn.title = 'Lưu trữ ghi chú'; actionsElement.appendChild(archiveBtn);
    }
    const deleteBtn = document.createElement('button'); deleteBtn.classList.add('delete-btn'); deleteBtn.textContent = 'Xóa'; actionsElement.appendChild(deleteBtn);
    noteElement.appendChild(actionsElement);

    return noteElement;
};

// Display notes based on current filters and view mode
const displayNotes = (filter = '') => {
    hideTagSuggestions();
    notesContainer.innerHTML = '';
    const lowerCaseFilter = filter.toLowerCase().trim();
    const isTagSearch = lowerCaseFilter.startsWith('#');
    const actualFilterTerm = isTagSearch ? '' : lowerCaseFilter;

    // 1. Filter by Archive Status
    let notesToDisplay = notes.filter(note => note.archived === isViewingArchived);

    // 2. Filter by Search Term
    if (filter) {
        notesToDisplay = notesToDisplay.filter(note => {
            const noteTitleLower = (note.title || '').toLowerCase();
            const noteTextLower = (note.text || '').toLowerCase();
            const titleMatch = noteTitleLower.includes(lowerCaseFilter);
            const textMatch = noteTextLower.includes(lowerCaseFilter);
            const tagMatch = note.tags && note.tags.some(tag => tag.toLowerCase().includes(lowerCaseFilter));
            const specificTagMatch = isTagSearch && note.tags.some(tag => tag.toLowerCase() === lowerCaseFilter.substring(1));
            if (specificTagMatch) return true;
            if (isTagSearch) return false;
            return titleMatch || textMatch || tagMatch;
        });
    }

    // 3. Sort (Pinned first only in main view)
    if (!isViewingArchived) {
        notesToDisplay.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    }

    // 4. Update UI Indicators
    if (isViewingArchived) {
        archiveStatusIndicator.classList.remove('hidden');
        viewArchiveBtn.textContent = 'Xem Ghi chú Chính';
        viewArchiveBtn.classList.add('viewing-archive');
    } else {
         archiveStatusIndicator.classList.add('hidden');
         viewArchiveBtn.textContent = 'Xem Lưu trữ';
         viewArchiveBtn.classList.remove('viewing-archive');
    }

    // 5. Handle Empty State
    if (notesToDisplay.length === 0) {
         let emptyMessage = isViewingArchived
            ? (filter ? 'Không tìm thấy ghi chú lưu trữ...' : 'Chưa có ghi chú nào được lưu trữ.')
            : (filter ? 'Không tìm thấy ghi chú...' : 'Chưa có ghi chú nào. Dùng nút + để thêm!');
         notesContainer.innerHTML = `<p class="empty-state">${emptyMessage}</p>`;
         if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null; }
         return;
    }

    // 6. Render Notes using the helper function
    notesToDisplay.forEach(note => {
        const noteElement = renderNoteElement(note); // Use the rendering function
        notesContainer.appendChild(noteElement);
    });

    // 7. Initialize SortableJS (conditionally)
    if (!isViewingArchived) {
        initSortable();
    } else if (sortableInstance) {
         sortableInstance.destroy();
         sortableInstance = null;
    }
};


// Show/Hide Add Note Panel
const showAddPanel = () => { hideTagSuggestions(); addNotePanel.classList.remove('hidden'); showAddPanelBtn.classList.add('hidden'); newNoteTitle.focus(); };
const hideAddPanel = () => { hideTagSuggestions(); addNotePanel.classList.add('hidden'); showAddPanelBtn.classList.remove('hidden'); newNoteTitle.value = ''; newNoteText.value = ''; newNoteTags.value = ''; };

// Initialize SortableJS
const initSortable = () => { if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null; } if (typeof Sortable === 'function' && notesContainer && notesContainer.children.length > 0 && !notesContainer.querySelector('.empty-state') && !isViewingArchived ) { sortableInstance = new Sortable(notesContainer, { animation: 150, handle: '.note', filter: '.note-content input, .note-content textarea, .note-actions button, .tag-badge, .note-content a, .task-list-item-checkbox, .suggestion-item', preventOnFilter: true, ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen', dragClass: 'sortable-drag', onEnd: handleDragEnd, delay: 200, delayOnTouchOnly: true }); } else if (typeof Sortable !== 'function' && notes.length > 0 && !isViewingArchived) { console.warn("Sortable.js not loaded. Drag-and-drop disabled."); } };

// Handle drag end for SortableJS
const handleDragEnd = (evt) => { const itemIds = Array.from(notesContainer.children).map(el => el.classList.contains('note') ? parseInt(el.dataset.id) : null).filter(id => id !== null); notes.sort((a, b) => { const indexA = itemIds.indexOf(a.id); const indexB = itemIds.indexOf(b.id); if (indexA === -1) return 1; if (indexB === -1) return -1; return indexA - indexB; }); saveNotes(); };


// =====================================================================
//  Tag Autocomplete
// =====================================================================
const getAllUniqueTags = () => { const allTags = notes.reduce((acc, note) => { if (note.tags && note.tags.length > 0) { acc.push(...note.tags); } return acc; }, []); return [...new Set(allTags)].sort(); };
const hideTagSuggestions = () => { const suggestionBox = document.getElementById(SUGGESTION_BOX_ID); if (suggestionBox) { suggestionBox.remove(); } activeTagInputElement = null; document.removeEventListener('mousedown', handleClickOutsideSuggestions); };
const handleClickOutsideSuggestions = (event) => { const suggestionBox = document.getElementById(SUGGESTION_BOX_ID); if (activeTagInputElement && suggestionBox && !activeTagInputElement.contains(event.target) && !suggestionBox.contains(event.target)) { hideTagSuggestions(); } };
const showTagSuggestions = (inputElement, currentTagFragment, suggestions) => { hideTagSuggestions(); if (suggestions.length === 0) { return; } activeTagInputElement = inputElement; const suggestionBox = document.createElement('div'); suggestionBox.id = SUGGESTION_BOX_ID; suggestionBox.classList.add('tag-suggestions'); suggestions.forEach(tag => { const item = document.createElement('div'); item.classList.add('suggestion-item'); item.textContent = tag; item.addEventListener('mousedown', (e) => { e.preventDefault(); const currentValue = inputElement.value; const lastCommaIndex = currentValue.lastIndexOf(','); let baseValue = ''; if (lastCommaIndex !== -1) { baseValue = currentValue.substring(0, lastCommaIndex + 1).trimStart() + ' '; } inputElement.value = baseValue + tag + ', '; hideTagSuggestions(); inputElement.focus(); inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length); }); suggestionBox.appendChild(item); }); const inputRect = inputElement.getBoundingClientRect(); document.body.appendChild(suggestionBox); let top = inputRect.bottom + window.scrollY; let left = inputRect.left + window.scrollX; suggestionBox.style.position = 'absolute'; suggestionBox.style.top = `${top}px`; suggestionBox.style.left = `${left}px`; suggestionBox.style.width = `${inputRect.width}px`; setTimeout(() => { document.addEventListener('mousedown', handleClickOutsideSuggestions); }, 0); };
const handleTagInput = (event) => { const inputElement = event.target; const value = inputElement.value; const lastCommaIndex = value.lastIndexOf(','); const currentTagFragment = value.substring(lastCommaIndex + 1).trim().toLowerCase(); if (currentTagFragment.length >= 1) { const allTags = getAllUniqueTags(); const filteredSuggestions = allTags.filter(tag => tag.toLowerCase().startsWith(currentTagFragment) && !parseTags(value).includes(tag) ); showTagSuggestions(inputElement, currentTagFragment, filteredSuggestions); } else { hideTagSuggestions(); } };
const handleTagInputBlur = (event) => { setTimeout(() => { const suggestionBox = document.getElementById(SUGGESTION_BOX_ID); if (suggestionBox && !suggestionBox.contains(document.activeElement)) { hideTagSuggestions(); } }, 150); };
const handleTagInputKeydown = (event) => { const suggestionBox = document.getElementById(SUGGESTION_BOX_ID); if (event.key === 'Escape' && suggestionBox) { hideTagSuggestions(); } };

// =====================================================================
//  Export / Import
// =====================================================================
const exportNotes = () => { if (notes.length === 0) { alert("Không có ghi chú nào để xuất."); return; } try { const jsonData = JSON.stringify(notes, null, 2); const blob = new Blob([jsonData], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-'); a.download = `start-notes-backup-${timestamp}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); console.log("Xuất ghi chú thành công."); } catch (error) { console.error("Lỗi khi xuất ghi chú:", error); alert("Đã xảy ra lỗi khi cố gắng xuất ghi chú."); } };
const importNotes = (file) => { if (!file) { alert("Vui lòng chọn một file để nhập."); return; } if (!confirm("CẢNH BÁO:\n\nThao tác này sẽ THAY THẾ TOÀN BỘ ghi chú hiện tại bằng nội dung từ file đã chọn.\n\nBạn có chắc chắn muốn tiếp tục?")) { return; } const reader = new FileReader(); reader.onload = (event) => { try { const importedData = JSON.parse(event.target.result); if (!Array.isArray(importedData)) { throw new Error("Dữ liệu nhập vào không phải là một danh sách (mảng) hợp lệ."); } if (importedData.length > 0 && (typeof importedData[0].text === 'undefined' || typeof importedData[0].id === 'undefined')) { console.warn("Dữ liệu nhập vào có vẻ không đúng định dạng ghi chú mong đợi."); } const validatedNotes = importedData.map(note => ({ id: note.id || Date.now() + Math.random(), title: note.title || '', text: note.text || '', tags: Array.isArray(note.tags) ? note.tags : [], pinned: note.pinned || false, lastModified: note.lastModified || note.id || Date.now(), archived: note.archived || false })); notes = validatedNotes; saveNotes(); isViewingArchived = false; displayNotes(); alert(`Đã nhập thành công ${notes.length} ghi chú!`); } catch (error) { console.error("Lỗi khi phân tích hoặc xử lý file nhập:", error); alert(`Lỗi nhập file: ${error.message}\nVui lòng kiểm tra lại file JSON.`); } finally { importFileInput.value = null; } }; reader.onerror = (event) => { console.error("Lỗi đọc file:", event.target.error); alert("Đã xảy ra lỗi khi đọc file."); importFileInput.value = null; }; reader.readAsText(file); };

// =====================================================================
//  Event Listeners Setup
// =====================================================================

// Theme Toggle
themeToggleBtn.addEventListener('click', toggleTheme);

// Add Note Panel Buttons
addNoteBtn.addEventListener('click', addNote);
closeAddPanelBtn.addEventListener('click', hideAddPanel);
showAddPanelBtn.addEventListener('click', showAddPanel);

// Submit on Enter in Title Field (Add Note Panel)
newNoteTitle.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addNoteBtn.click();
    }
});
// Allow Shift+Enter in Textarea (Add Note Panel) - No specific listener needed now

// Search Input (Debounced)
const debouncedDisplayNotes = debounce((filterValue) => { displayNotes(filterValue); }, 300);
searchInput.addEventListener('input', (event) => { debouncedDisplayNotes(event.target.value); });

// Export/Import Buttons
exportNotesBtn.addEventListener('click', exportNotes);
importNotesBtn.addEventListener('click', () => { importFileInput.click(); });
importFileInput.addEventListener('change', (event) => { const file = event.target.files[0]; if(file) importNotes(file); });

// Tag Autocomplete Listeners (Add Note Panel)
newNoteTags.addEventListener('input', handleTagInput);
newNoteTags.addEventListener('blur', handleTagInputBlur);
newNoteTags.addEventListener('keydown', handleTagInputKeydown);

// Archive View Toggle
viewArchiveBtn.addEventListener('click', () => {
    isViewingArchived = !isViewingArchived;
    searchInput.value = ''; // Clear search when switching views
    displayNotes();
});

// Delegated Event Listeners for Notes Container
notesContainer.addEventListener('click', (event) => {
    const target = event.target;
    const noteElement = target.closest('.note');
    
    // --- Checklist Toggle ---
    if (target.matches('.task-list-item-checkbox')) {
        if (noteElement) {
            const noteId = parseInt(noteElement.dataset.id);
            handleChecklistToggle(noteId, target);
        }
        return; // Stop processing
    }

    // --- Tag Badge Click ---
    const tagButton = target.closest('.tag-badge');
    if (tagButton && tagButton.dataset.tag) {
        searchInput.value = `#${tagButton.dataset.tag}`;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.focus();
        return; // Stop processing
    }

    // --- Actions within a note ---
    if (!noteElement) return; // Needs a note element for other actions

    const noteId = parseInt(noteElement.dataset.id);
    const noteIndex = notes.findIndex(note => note.id === noteId);
    if (noteIndex === -1) return; // Note not found in data array

    // Pin Button
    const pinButton = target.closest('.pin-btn');
    if (pinButton && !isViewingArchived) { // Pin only available in main view
        handleNotePin(noteId, noteIndex);
        return;
    }

    // Delete Button
    const deleteButton = target.closest('.delete-btn');
    if (deleteButton) {
        handleNoteDelete(noteId, noteIndex);
        return;
    }

    // Archive Button
    const archiveButton = target.closest('.archive-btn');
    if (archiveButton) {
        handleNoteArchive(noteId, noteIndex);
        return;
    }

    // Unarchive Button
    const unarchiveButton = target.closest('.unarchive-btn');
    if (unarchiveButton) {
        handleNoteUnarchive(noteId, noteIndex);
        return;
    }

    // Edit Button
    const editButton = target.closest('.edit-btn');
    if (editButton) {
        handleNoteEdit(noteElement, noteId, noteIndex);
        return;
    }

    // Save Edit Button
    const saveEditButton = target.closest('.save-edit-btn');
    if (saveEditButton) {
        handleNoteSaveEdit(noteElement, noteId, noteIndex);
        return;
    }
});

// Delegated Listeners for Tag Autocomplete in Edit Mode
notesContainer.addEventListener('input', (event) => { if (event.target.matches('.edit-tags-input')) { handleTagInput(event); } });
notesContainer.addEventListener('blur', (event) => { if (event.target.matches('.edit-tags-input')) { handleTagInputBlur(event); } }, true);
notesContainer.addEventListener('keydown', (event) => { if (event.target.matches('.edit-tags-input')) { handleTagInputKeydown(event); } });

// =====================================================================
//  Initial Load
// =====================================================================
loadNotes(); // Load data first
applyTheme(localStorage.getItem(THEME_STORAGE_KEY) || 'light'); // Apply theme
displayNotes(); // Then display notes
