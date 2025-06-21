document.addEventListener('DOMContentLoaded', function() {
    setupChatSessionClickHandler();

    marked.setOptions({
        breaks: true, // Render GFM-style line breaks (requires two spaces at the end of a line)
        gfm: true, // Enable GitHub Flavored Markdown
    });

    // Check if user is authenticated
    const token = localStorage.getItem('access_token');
    if (!token && window.location.pathname !== '/' && window.location.pathname !== '/register') {
        window.location.href = '/';
        return;
    }

    // Initialize elements
    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const voiceInputBtn = document.getElementById('voiceInputBtn');
    const newChatBtn = document.getElementById('newChatBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const speechToggle = document.getElementById('speechToggle');
    const chatSessions = document.getElementById('chatSessions');
    const chatTitle = document.getElementById('chatTitle');
    const stopSpeechBtn = document.getElementById('stopSpeechBtn');
    const loggedInUserElement = document.getElementById('loggedInUser'); // NEW: Get reference to the element for logged-in user

   // --- NEW GLOBAL DOM ELEMENTS FOR MODAL ---
    const chatInput = document.getElementById('messageInput'); // Make sure your chat input has id="messageInput"
    const imageUploadModal = document.getElementById('imageUploadModal');
    const imageFileInput = document.getElementById('imageFileInput');
    const imagePreview = document.getElementById('imagePreview');
    const uploadImageConfirmButton = document.getElementById('uploadImageConfirmButton');
    const cancelImageUploadButton = document.getElementById('cancelImageUploadButton');
    const modalCloseButton = imageUploadModal.querySelector('.close-button');

    // dom elements for facebook modal
    const facebookImageUploadModal = document.getElementById('facebookImageUploadModal');
    const facebookImageFileInput = document.getElementById('facebookImageFileInput');
    const facebookImagePreview = document.getElementById('facebookImagePreview');
    const uploadFacebookImageConfirmButton = document.getElementById('uploadFacebookImageConfirmButton');
    const cancelFacebookImageUploadButton = document.getElementById('cancelFacebookImageUploadButton');
    const facebookModalCloseButton = document.getElementById('facebookModalCloseButton');


    let currentSessionId = null;
    let recognition = null;
    let synth = window.speechSynthesis;
    let speechEnabled = false;
    let pendingMessages = {};


        function updateStopSpeechButtonVisibility() {
        if (stopSpeechBtn) {
            if (synth.speaking) {
                stopSpeechBtn.style.display = 'inline-block'; // Or 'block', depending on your layout
            } else {
                stopSpeechBtn.style.display = 'none';
            }
        }
    }
    synth.onvoiceschanged = updateStopSpeechButtonVisibility; // This often fires on load
    synth.onstart = updateStopSpeechButtonVisibility;
    synth.onend = updateStopSpeechButtonVisibility;
    synth.onerror = updateStopSpeechButtonVisibility;

    // Check if browser supports speech recognition
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            messageInput.value = transcript;
        };
        // NEW: Automatically send message when speech recognition ends
        recognition.onend = function() {
            if (messageInput.value.trim() !== '') { // Only send if there's actual input
                sendMessage();
            }
        };

        recognition.onerror = function(event) {
            console.error('Speech recognition error', event.error);
        };
    } else {
        voiceInputBtn.style.display = 'none';
        console.warn('Speech recognition not supported');
    }

    // Check if browser supports speech synthesis
    if (!synth) {
        speechToggle.disabled = true;
        console.warn('Speech synthesis not supported');
    }

    // Load chat sessions
    async function loadChatSessions() {
        try {
            const response = await fetch('/chat/sessions', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (response.ok) {
                const sessions = await response.json();
                renderChatSessions(sessions);
            } else {
                console.error('Failed to load chat sessions');
            }
        } catch (error) {
            console.error('Error loading chat sessions:', error);
        }
    }


    async function displayLoggedInUser() {
        const token = localStorage.getItem('access_token');
        if (!token) {
            loggedInUserElement.textContent = 'Guest'; // Or hide, or redirect
            return;
        }

        try {
            // This is the new endpoint we just created in FastAPI
            const response = await fetch('/user/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                // Your FastAPI endpoint returns 'name', so we use that here.
                if (userData.name) {
                    loggedInUserElement.textContent = `Welcome ${userData.name}`;
                } else {
                    loggedInUserElement.textContent = 'User (Name Not Found)';
                }
            } else {
                console.error('Failed to fetch user data:', response.statusText);
                loggedInUserElement.textContent = 'Failed to load user';
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('access_token');
                    window.location.href = '/';
                }
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            loggedInUserElement.textContent = 'Error loading user';
        }
    }



    // Render chat sessions
    function renderChatSessions(sessions) {
        chatSessions.innerHTML = '';

        sessions.forEach(session => {
            const sessionElement = document.createElement('div');
            sessionElement.className = `chat-session ${session.id === currentSessionId ? 'active' : ''}`;
            sessionElement.innerHTML = `
                <div class="session-title">${session.title}</div>
                <button class="chat-session-delete" data-id="${session.id}">
                    <i class="fas fa-trash"></i>
                </button>
            `;

            sessionElement.addEventListener('click', () => loadChatSession(session.id));

            const deleteBtn = sessionElement.querySelector('.chat-session-delete');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteChatSession(session.id);
            });

            chatSessions.appendChild(sessionElement);
        });
    }

    function showTypingIndicator() {
    const typingElement = document.createElement('div');
    typingElement.className = 'message message-agent';
    typingElement.innerHTML = `
        <img src="/static/images/bot-avatar.png" class="message-avatar" alt="Agent Avatar">
        <div class="message-content">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    chatMessages.appendChild(typingElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return typingElement;
}

    // Load a chat session
    // Update the loadChatSession function
    async function loadChatSession(sessionId) {
    try {
        // Clear any pending messages for this session
        if (pendingMessages[sessionId]) {
            delete pendingMessages[sessionId];
        }

        currentSessionId = sessionId;
        chatMessages.innerHTML = '';

        const response = await fetch(`/chat/sessions/${sessionId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });

        if (response.ok) {
            const messages = await response.json();

            // Update chat title
            const sessions = await fetchChatSessions();
            const session = sessions.find(s => s.id === sessionId);
            if (session) {
                chatTitle.textContent = session.title;
            }

            renderMessages(messages);
            updateActiveSessionInSidebar(sessionId);
        } else {
            throw new Error('Failed to load chat session');
        }
    } catch (error) {
        console.error('Error loading chat session:', error);
        showError('Failed to load chat. Please try again.');
    }
}

    // New helper function
    function updateActiveSessionInSidebar(sessionId) {
        document.querySelectorAll('.chat-session').forEach(el => {
            el.classList.remove('active');
            if (el.querySelector('.chat-session-delete')?.dataset.id === String(sessionId)) {
                el.classList.add('active');
            }
        });
    }

    // Delete a chat session
    async function deleteChatSession(sessionId) {
        if (!confirm('Are you sure you want to delete this chat session?')) return;

        try {
            const response = await fetch(`/chat/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (response.ok) {
                if (currentSessionId === sessionId) {
                    currentSessionId = null;
                    chatTitle.textContent = 'New Chat';
                    chatMessages.innerHTML = '';
                }
                loadChatSessions();
            } else {
                console.error('Failed to delete chat session');
            }
        } catch (error) {
            console.error('Error deleting chat session:', error);
        }
    }

    // Create a new chat session
    async function createNewChatSession() {
    try {
        const response = await fetch('/chat/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: "New Chat" })
        });

        if (response.ok) {
            const session = await response.json();
            currentSessionId = session.id;
            chatMessages.innerHTML = '';
            loadChatSessions();
            return session;
        } else {
            console.error('Failed to create new chat session');
            return null;
        }
    } catch (error) {
        console.error('Error creating new chat session:', error);
        return null;
    }
}

// ... (rest of your existing code) ...

    function renderMessages(messages) {
        if (messages.length > 0) {
            chatMessages.innerHTML = '';
        }

        messages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.className = `message ${message.sender === 'user' ? 'message-user' : 'message-agent'}`;

            let renderedContent = DOMPurify.sanitize(marked.parse(message.content));
            let uploadButtonHtml = '';
            const UPLOAD_PLACEHOLDER = '[[AD_UPLOAD_IMAGE]]';
            const FACEBOOK_UPLOAD_PLACEHOLDER = '[[CREATIVE_UPLOAD_IMAGE]]';


            if (message.sender === 'agent') {
                if (renderedContent.includes(UPLOAD_PLACEHOLDER)) {
                    renderedContent = renderedContent.replace(UPLOAD_PLACEHOLDER, '');
                    uploadButtonHtml = `<button class="upload-image-button" style="border-radius: 15px; background-color: #007bff; color: white">Upload Product Image</button>`;
                }
                if (renderedContent.includes(FACEBOOK_UPLOAD_PLACEHOLDER)) {
                renderedContent = renderedContent.replace(FACEBOOK_UPLOAD_PLACEHOLDER, ''); // Remove placeholder
                // Add button for Facebook upload
                uploadButtonHtml += `<button class="upload-facebook-image-button" style="border-radius: 15px; background-color: #007bff; color: white">Upload Creative Image (Facebook)</button>`;
            }

                messageElement.innerHTML = `
                    <img src="/static/images/bot-avatar.png" class="message-avatar" alt="Agent Avatar">
                    <div class="message-content" style="max-width: 1000px;">
                        <div class="message-bubble agent-bubble">
                            ${renderedContent}
                            ${uploadButtonHtml} </div>
                        <div class="message-info">
                            ${new Date(message.created_at).toLocaleString()}
                            <span class="speak-message-icon" data-text="${message.content}" title="Speak message" style="cursor: pointer">🔊</span>
                        </div>
                    </div>
                `;
            } else {
                messageElement.innerHTML = `
                    <div class="message-content">
                        <div class="message-bubble user-bubble">${renderedContent}</div>
                        <div class="message-info">${new Date(message.created_at).toLocaleString()}</div>
                    </div>
                    <img src="/static/images/user-avatar.png" class="message-avatar" alt="User Avatar">
                `;
            }

            chatMessages.appendChild(messageElement);
        });

        // Add event listeners for the speak-message-icons
        document.querySelectorAll('.speak-message-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                const textToSpeak = e.target.dataset.text;
                if (textToSpeak) {
                   const cleanedTextForManualSpeech = cleanTextForSpeech(textToSpeak);
                    if (synth.speaking) {
                        synth.cancel();
                    }
                    const utterance = new SpeechSynthesisUtterance(cleanedTextForManualSpeech);
                    utterance.onend = () => updateStopSpeechButtonVisibility();
                    utterance.onerror = () => updateStopSpeechButtonVisibility();
                    synth.speak(utterance);
                    updateStopSpeechButtonVisibility();
                }
            });
        });

        // NEW: Add event listeners for the upload image buttons (MODIFIED PART)
        // This button now only calls the modal open function
        document.querySelectorAll('.upload-image-button').forEach(button => {
            button.addEventListener('click', () => {
                openImageUploadModal();
            });
        });
        document.querySelectorAll('.upload-facebook-image-button').forEach(button => {
        button.addEventListener('click', () => {
            openFacebookImageUploadModal(); // Calls the function to open the Facebook modal
        });
    });

        if (messages.length > 0) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }
    // --- END MODIFIED renderMessages function ---


    // --- NEW FUNCTIONS AND EVENT HANDLERS FOR IMAGE UPLOAD MODAL ---

    // Function to open the image upload modal
        function openImageUploadModal() {
            imageUploadModal.classList.add('active');
            imageFileInput.value = ''; // Clear any previously selected file
            imagePreview.style.display = 'none'; // Hide preview
            imagePreview.src = '#'; // Clear preview source
        }

        // Function to close the image upload modal
        function closeImageUploadModal() {
            imageUploadModal.classList.remove('active');
        }

    // Event listener for file input change (to show preview)
    imageFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            imagePreview.style.display = 'none';
            imagePreview.src = '#';
        }
    });

    // Event listener for the "Upload" button inside the modal
    uploadImageConfirmButton.addEventListener('click', async () => {
        const file = imageFileInput.files[0];
        if (!file) {
            alert('Please select an image to upload.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file); // 'file' must match the backend endpoint parameter name

        try {
            const response = await fetch('/upload-product-image', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to upload image.');
            }

            const data = await response.json();
            const imageUrl = data.image_url;

            if (imageUrl) {
                // Insert the Markdown image link into the chat input box
                const markdownImageLink = `![Uploaded Image](${imageUrl})`;

                // Append to existing content or set new content
                if (chatInput.value.trim() !== '') {
                    chatInput.value += ' ' + markdownImageLink;
                } else {
                    chatInput.value = markdownImageLink;
                }
            } else {
                alert('Image URL not received from server.');
            }
            closeImageUploadModal(); // Close modal on success
        } catch (error) {
            console.error('Image upload error:', error);
            alert(`Error uploading image: ${error.message}`);
        }
    });

    // Event listener for the "Cancel" button inside the modal
    cancelImageUploadButton.addEventListener('click', closeImageUploadModal);

    // Event listener for clicking outside the modal content or the close button
    modalCloseButton.addEventListener('click', closeImageUploadModal);
    window.addEventListener('click', (event) => {
        if (event.target === imageUploadModal) {
            closeImageUploadModal();
        }
    });


    // Function to open the Facebook image upload modal
    function openFacebookImageUploadModal() {
        facebookImageUploadModal.classList.add('active');
        facebookImageFileInput.value = ''; // Clear previous file
        facebookImagePreview.style.display = 'none'; // Hide preview
        facebookImagePreview.src = '#'; // Clear preview source
    }

    // Function to close the Facebook image upload modal
    function closeFacebookImageUploadModal() {
        facebookImageUploadModal.classList.remove('active');
    }

    // Event listener for Facebook file input change (to show preview)
    facebookImageFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                facebookImagePreview.src = e.target.result;
                facebookImagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            facebookImagePreview.style.display = 'none';
            facebookImagePreview.src = '#';
        }
    });

    // Event listener for the "Upload to Facebook" button inside the modal
    uploadFacebookImageConfirmButton.addEventListener('click', async () => {
        const file = facebookImageFileInput.files[0];

        if (!file) {
            alert('Please select an image to upload.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/upload-creative-image', { // NEW FACEBOOK ENDPOINT
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}` // Correct key
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to upload image to Facebook.');
            }

            const data = await response.json();
            // The image_url returned here will be the placeholder URL containing the hash
            // const imageUrl = data.image_url;
            let imageUrl = data.image_hash;

            if (imageUrl) {
                const markdownImageLink = `Uploaded Facebook Image Hash: (${imageUrl})`;
                if (chatInput.value.trim() !== '') {
                    chatInput.value += ' ' + markdownImageLink;
                } else {
                    chatInput.value = markdownImageLink;
                }
            } else {
                alert('Image URL (hash) not received from Facebook server.');
            }
            closeFacebookImageUploadModal(); // Close modal on success
        } catch (error) {
            console.error('Facebook image upload error:', error);
            alert(`Error uploading image to Facebook: ${error.message}`);
        }
    });

    // Event listener for "Cancel" button and close button for Facebook modal
    cancelFacebookImageUploadButton.addEventListener('click', closeFacebookImageUploadModal);
    facebookModalCloseButton.addEventListener('click', closeFacebookImageUploadModal);
    window.addEventListener('click', (event) => {
        if (event.target === facebookImageUploadModal) {
            closeFacebookImageUploadModal();
        }
    });

// Render messages
//         function renderMessages(messages) {
//         if (messages.length > 0) {
//             chatMessages.innerHTML = '';
//         }
//
//         messages.forEach(message => {
//             const messageElement = document.createElement('div');
//             messageElement.className = `message ${message.sender === 'user' ? 'message-user' : 'message-agent'}`;
//
//             let renderedContent = DOMPurify.sanitize(marked.parse(message.content));
//
//             let uploadButtonHtml = '';
//             uploadButtonHtml = `
//                     <button class="upload-image-button" data-message-id="${message.id}">Upload Image</button>
//                 `;
//             const UPLOAD_PLACEHOLDER = '[[AD_UPLOAD_IMAGE]]';
//
//             if (message.sender === 'agent') {
//
//                 if (renderedContent.includes(UPLOAD_PLACEHOLDER)) {
//                 // Remove the placeholder from the displayed content
//                 renderedContent = renderedContent.replace(UPLOAD_PLACEHOLDER, uploadButtonHtml);
//                 // Add the button HTML
//
//             }
//
//                 messageElement.innerHTML = `
//                     <img src="/static/images/bot-avatar.png" class="message-avatar" alt="Agent Avatar">
// <!--                    can be changed   -->
//                     <div class="message-content" style="max-width: 1000px;">
//                         <div class="message-bubble agent-bubble">${renderedContent}</div>
//                         <div class="message-info">
//                             ${new Date(message.created_at).toLocaleString()}
//                             <span class="speak-message-icon" data-text="${message.content}" title="Speak message" style="cursor: pointer">🔊</span>
//                         </div>
//                     </div>
//                 `;
//             } else {
//                 messageElement.innerHTML = `
//                     <div class="message-content">
//                         <div class="message-bubble user-bubble">${renderedContent}</div>
//                         <div class="message-info">${new Date(message.created_at).toLocaleString()}</div>
//                     </div>
//                     <img src="/static/images/user-avatar.png" class="message-avatar" alt="User Avatar">
//                 `;
//             }
//
//             chatMessages.appendChild(messageElement);
//         });
//
//         // NEW: Add event listeners for the speak-message-icons after rendering
//         document.querySelectorAll('.speak-message-icon').forEach(icon => {
//             icon.addEventListener('click', (e) => {
//                 const textToSpeak = e.target.dataset.text;
//                 if (textToSpeak) {
//                    const cleanedTextForManualSpeech = cleanTextForSpeech(textToSpeak);
//                     if (synth.speaking) { // Cancel current speech if any
//                         synth.cancel();
//                     }
//                     const utterance = new SpeechSynthesisUtterance(cleanedTextForManualSpeech);
//                     utterance.onend = () => updateStopSpeechButtonVisibility();
//                     utterance.onerror = () => updateStopSpeechButtonVisibility();
//                     synth.speak(utterance);
//                     updateStopSpeechButtonVisibility(); // Show stop button immediately
//                 }
//             });
//         });
//
//         document.querySelectorAll('.upload-image-button').forEach(button => {
//         button.addEventListener('click', (e) => {
//             const messageId = e.target.dataset.messageId;
//             // Place your image upload logic here.
//             // For example, trigger a hidden file input click:
//             // document.getElementById('yourHiddenFileInputId').click();
//             alert(`Upload image for message ID: ${messageId}. Implement your upload logic here!`);
//         });
//     });
//
//         if (messages.length > 0) {
//             chatMessages.scrollTop = chatMessages.scrollHeight;
//         }
//     }

// ... (rest of your existing code) ...

    // Send a message
    // Update the sendMessage function
    // Modify the sendMessage function
    // Send a message
    let creatingSession = false;

    async function sendMessage() {
    const content = messageInput.value.trim();
    if (!content || creatingSession) return;

    // Disable input while processing
    messageInput.disabled = true;
    sendMessageBtn.disabled = true;

    try {
        if (!currentSessionId) {
            creatingSession = true;
            const session = await createNewChatSession();
            creatingSession = false;

            if (!session) {
                showError('Failed to start a new chat session.');
                return;
            }
            currentSessionId = session.id;
            chatTitle.textContent = session.title;
        }

        const messageId = Date.now();
        pendingMessages[currentSessionId] = messageId;

        const userMessage = {
            sender: 'user',
            content,
            created_at: new Date().toISOString()
        };

        renderMessages([userMessage]);
        messageInput.value = '';

        const typingElement = showTypingIndicator();

        const response = await fetch(`/chat/messages/${currentSessionId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });

        chatMessages.removeChild(typingElement);

        if (!response.ok) throw new Error('Server error');

        const agentMessage = await response.json();

        if (pendingMessages[currentSessionId] === messageId) {
            await loadChatSession(currentSessionId);

            if (speechEnabled && window.speechSynthesis) {
            const cleanedSpeechText = cleanTextForSpeech(agentMessage.content);
            const utterance = new SpeechSynthesisUtterance(cleanedSpeechText);
                // utterance.onend = () => updateStopSpeechButtonVisibility(); // Crucial: update when this specific utterance ends
                 utterance.onend = () => {
                    updateStopSpeechButtonVisibility();
                    // NEW: Start listening again after speech ends, if speech is enabled
                    if (speechEnabled && recognition) {
                        recognition.start();
                    }
                };
                utterance.onerror = () => updateStopSpeechButtonVisibility(); // Also on error
                window.speechSynthesis.speak(utterance);
                updateStopSpeechButtonVisibility(); // Show button immediately after speaking starts
            }
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showError('Sorry, there was an error processing your message.');
    } finally {
        messageInput.disabled = false;
        sendMessageBtn.disabled = false;
        messageInput.focus();
        creatingSession = false;
    }
}


    // New helper function
    function showError(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'alert alert-danger';
        errorElement.textContent = message;
        chatMessages.appendChild(errorElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    // Add this helper function
    async function fetchChatSessions() {
    const response = await fetch('/chat/sessions', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
    });
    return response.ok ? await response.json() : [];
    }


    // Update how chat sessions are loaded when clicked
    function setupChatSessionClickHandler() {
        document.getElementById('chatSessions').addEventListener('click', async (e) => {
            const sessionElement = e.target.closest('.chat-session');
            if (sessionElement) {
                const sessionId = parseInt(sessionElement.querySelector('.chat-session-delete').dataset.id);

                // Clear any pending messages for the previous session
                if (currentSessionId && pendingMessages[currentSessionId]) {
                    delete pendingMessages[currentSessionId];
                }

                await loadChatSession(sessionId);
            }
        });
    }

    // --- ADD THIS NEW FUNCTION ---
    function cleanTextForSpeech(text) {

        let safeText = text.replace(/[^\x20-\x7E]+/g, " ").trim();

          // Remove numbers with 6 or more digits
        let safeTextWithoutNumbers = safeText.replace(/\b\d{6,}\b/g, "");

          // Remove URLs
        const urlPattern = /(?:https?:\/\/|www\.)\S+|(?:(?:[a-zA-Z0-9-]+\.)+[a-z]{2,})\/\S*/g;
        let safeTextWithoutUrls = safeTextWithoutNumbers.replace(urlPattern, "");

          // Convert to JSON string (for JavaScript safety)
        // 1. Decode potential HTML entities (if your text might come from HTML)
        // This isn't strictly necessary if your backend already gives you plain text,
        // but it's good for robustness if any HTML entities like &amp; sneak in.
        // const tempDiv = document.createElement('div');
        // tempDiv.innerHTML = text;
        // text = tempDiv.textContent || tempDiv.innerText || '';

        // 2. Normalize whitespace: Replace multiple whitespace characters with a single space.
        // text = text.replace(/\s+/g, ' ').trim();
        // // 3. Remove non-printable ASCII characters (like your original \x20-\x7E)
        // // We'll use a regex that matches characters outside the common printable ASCII range.
        // text = text.replace(/[^\x20-\x7E]+/g, ' ');
        // // 4. Remove URLs: Improved regex for URLs.
        // // This regex attempts to be more robust, including various TLDs and paths.
        // const urlPattern = /(?:https?:\/\/|www\.)[^\s/$.?#].[^\s]*|(?:ftp:\/\/|file:\/\/)[^\s]*|\b\S+\.(com|org|net|gov|edu|io|co|uk|pk|info|biz|dev|app|ai|me)\b(?:\/\S*)?/gi;
        // text = text.replace(urlPattern, ' ');
        // // 5. Remove long sequences of numbers (6 or more digits)
        // const longNumberPattern = /\b\d{6,}\b/g;
        // text = text.replace(longNumberPattern, ' ');
        // // 6. Remove email addresses
        // const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        // text = text.replace(emailPattern, ' ');
        // text = text.replace(/[<>/\\\[\]{}|`~@#$%^&*+=_:;"]/g, ' '); // Removed single quote from here, as it might be part of contractions
        // text = text.replace(/Dr\./g, 'Doctor ');
        // text = text.replace(/Mr\./g, 'Mister ');
        // text = text.replace(/Mrs\./g, 'Misses ');
        // text = text.replace(/Ms\./g, 'Miz ');
        // text = text.replace(/e\.g\./g, 'for example ');
        // text = text.replace(/i\.e\./g, 'that is ');

        // text = text.replace(/\s+/g, ' ').trim();

        return JSON.stringify(safeTextWithoutUrls);
    }
    // --- END OF NEW FUNCTION ---


    // Event listeners

    sendMessageBtn.addEventListener('click', () => {
        if (sendMessageBtn.disabled) return;
        sendMessageBtn.disabled = true;
        sendMessage();
        });


    if (voiceInputBtn) {
        voiceInputBtn.addEventListener('click', () => {
            if (recognition) {
                recognition.start();
            }
        });
    }
        if (stopSpeechBtn) {
        stopSpeechBtn.addEventListener('click', () => {
            if (synth && synth.speaking) {
                synth.cancel();
                console.log('Speech stopped.');
                updateStopSpeechButtonVisibility(); // Update visibility after stopping
            }
        });
    }

    // newChatBtn.addEventListener('click', createNewChatSession);
    console.log('DOMContentLoaded fired, setting up event listeners');
    newChatBtn.addEventListener('click', function() {
        console.log('New Chat Button Clicked - Event Listener Fired!');
        createNewChatSession();
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('access_token');
        window.location.href = '/';
    });

    speechToggle.addEventListener('change', (e) => {
        speechEnabled = e.target.checked;
        if (!e.target.checked && synth && synth.speaking) {
            synth.cancel();
            console.log('Speech stopped because toggle was turned off.');
        }
        updateStopSpeechButtonVisibility(); // Update visibility immediately

    });

    document.getElementById('messageInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();

            // Disable to prevent double Enter press
            if (sendMessageBtn.disabled) return;
            sendMessageBtn.disabled = true;
            sendMessage();
        }
    });

    // Initialize
    if (window.location.pathname === '/chat') {
        loadChatSessions();
        displayLoggedInUser();
    }
});