document.addEventListener('DOMContentLoaded', function() {
    // Setup event delegation for chat session clicks and deletes ONLY ONCE
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
    const loggedInUserElement = document.getElementById('loggedInUser');
    const loggedInUserMailElement = document.getElementById('loggedInUserMail');
    const userWelcomeElement = document.getElementById('userWelcome');


    // --- GLOBAL DOM ELEMENTS FOR MODAL ---
    const chatInput = document.getElementById('messageInput');
    const imageUploadModal = document.getElementById('imageUploadModal');
    const imageFileInput = document.getElementById('imageFileInput');
    const imagePreview = document.getElementById('imagePreview');
    const uploadImageConfirmButton = document.getElementById('uploadImageConfirmButton');
    const cancelImageUploadButton = document.getElementById('cancelImageUploadButton');
    const modalCloseButton = imageUploadModal.querySelector('.close-button');

    // DOM elements for facebook modal
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


    function updateStopSpeechButtonVisibility() {
        if (stopSpeechBtn) {
            if (synth.speaking) {
                stopSpeechBtn.style.display = 'inline-block';
            } else {
                stopSpeechBtn.style.display = 'none';
            }
        }
    }
    synth.onvoiceschanged = updateStopSpeechButtonVisibility;
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
        recognition.onend = function() {
            if (messageInput.value.trim() !== '') {
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

    // Load chat sessions for the sidebar
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
            loggedInUserElement.textContent = 'Guest';
            return;
        }

        try {
            const response = await fetch('/user/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                if (userData.name) {
                    loggedInUserElement.textContent = `Welcome ${userData.name}`;
                    loggedInUserMailElement.textContent= userData.email;
                    userWelcomeElement.textContent = `Hey, ${userData.name}`
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

    // Render chat sessions in the sidebar
    // This function only builds the sidebar elements, it does NOT add individual click listeners
    function renderChatSessions(sessions) {
        chatSessions.innerHTML = ''; // Clear existing session list

        sessions.forEach(session => {
            const sessionElement = document.createElement('div');
            sessionElement.className = `chat-session ${session.id === currentSessionId ? 'active' : ''}`;
            // Store session ID using a data-attribute for event delegation
            sessionElement.dataset.sessionId = session.id;

            sessionElement.innerHTML = `
                <div class="session-title">${session.title}</div>
                <button class="chat-session-delete" data-id="${session.id}">
                    <i class="fas fa-trash"></i>
                </button>
            `;
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

    // Load a chat session by ID (clears existing messages and loads specific session)
    async function loadChatSession(sessionId) {
        try {
            currentSessionId = sessionId;
            console.log('Clearing chat messages for session:', sessionId); // Debugging line
            chatMessages.innerHTML = ''; // Crucial for clearing previous chat history

            const response = await fetch(`/chat/sessions/${sessionId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (response.ok) {
                const messages = await response.json();

                // Update chat title
                const sessions = await fetchChatSessions(); // Re-fetch sessions to find the title
                const session = sessions.find(s => s.id === sessionId);
                if (session) {
                    chatTitle.textContent = session.title;
                }

                // Render all messages for the loaded session
                messages.forEach(message => appendMessageToChat(message));
                updateActiveSessionInSidebar(sessionId);
                chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom
            } else {
                throw new Error('Failed to load chat session');
            }
        } catch (error) {
            console.error('Error loading chat session:', error);
            showError('Failed to load chat. Please try again.');
        }
    }

    // Helper function to update active session in sidebar
    function updateActiveSessionInSidebar(sessionId) {
        document.querySelectorAll('.chat-session').forEach(el => {
            el.classList.remove('active');
            // Check the data-sessionId attribute, not the delete button's data-id
            if (el.dataset.sessionId === String(sessionId)) {
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
                    chatTitle.textContent = 'New Chat'; // Set title to New Chat
                    chatMessages.innerHTML = ''; // Clear chat when current session is deleted
                }
                loadChatSessions(); // Reload sidebar sessions
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
                body: JSON.stringify({
                    title: "New Chat"
                })
            });

            if (response.ok) {
                const session = await response.json();
                currentSessionId = session.id;
                chatMessages.innerHTML = ''; // Clear existing messages for a new chat
                chatTitle.textContent = 'New Chat'; // Set initial title for a new chat
                loadChatSessions(); // Reload sidebar to show new chat
                updateActiveSessionInSidebar(currentSessionId); // Highlight the new chat in sidebar
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

    // Helper function to append a single message to the chat interface
    function appendMessageToChat(message) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.sender === 'user' ? 'message-user' : 'message-agent'}`;

        let renderedContent = DOMPurify.sanitize(marked.parse(message.content));
        let uploadButtonHtml = '';
        const UPLOAD_PLACEHOLDER = '[[AD_UPLOAD_IMAGE]]';
        const FACEBOOK_UPLOAD_PLACEHOLDER = '[[CREATIVE_UPLOAD_IMAGE]]';

        let formattedDate = ''; // Initialize formattedDate

        if (message.created_at) {
            const date = new Date(message.created_at);
            if (!isNaN(date)) { // Check if the date is valid
                formattedDate = date.toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    second: 'numeric',
                    hour12: true // This sets it to 12-hour format with AM/PM
                });
            } else {
                formattedDate = 'Invalid Date';
            }
        } else {
            formattedDate = 'No Date Available'; // Or some other default text
        }

        if (message.sender === 'agent') {
            if (renderedContent.includes(UPLOAD_PLACEHOLDER)) {
                renderedContent = renderedContent.replace(UPLOAD_PLACEHOLDER, '');
                uploadButtonHtml = `<button class="upload-image-button" style="border-radius: 15px; background-color: #007bff; color: white">Upload Product Image</button>`;
            }
            if (renderedContent.includes(FACEBOOK_UPLOAD_PLACEHOLDER)) {
                renderedContent = renderedContent.replace(FACEBOOK_UPLOAD_PLACEHOLDER, '');
                uploadButtonHtml += `<button class="upload-facebook-image-button" style="border-radius: 15px; background-color: #007bff; color: white">Upload Creative Image (Facebook)</button>`;
            }

            messageElement.innerHTML = `
                <img src="/static/images/bot-avatar.png" class="message-avatar" alt="Agent Avatar">
                <div class="message-content" style="max-width: 1000px;">
                    <div class="message-bubble agent-bubble">
                        ${renderedContent}
                        ${uploadButtonHtml}
                    </div>
                    <div class="message-info">
                        ${formattedDate}
                        <span class="speak-message-icon" data-text="${message.content}" title="Speak message" style="cursor: pointer">🔊</span>
                    </div>
                </div>
            `;
        } else {
            messageElement.innerHTML = `
                <div class="message-content">
                    <div class="message-bubble user-bubble">${renderedContent}</div>
                    <div class="message-info">${formattedDate}</div>
                </div>
                <img src="/static/images/user-avatar.png" class="message-avatar" alt="User Avatar">
            `;
        }

        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        const speakIcon = messageElement.querySelector('.speak-message-icon');
        if (speakIcon) {
            speakIcon.addEventListener('click', (e) => {
                const textToSpeak = e.target.dataset.text;
                if (textToSpeak) {
                    const cleanedTextForManualSpeech = cleanTextForSpeech(textToSpeak);
                    if (synth.speaking) {
                        synth.cancel();
                    }
                    const utterance = new SpeechSynthesisUtterance(cleanedTextForManualSpeech);
                    const voices = synth.getVoices();
                     const siriVoice = voices.find(voice =>
                            voice.name === "Samantha (English (United States))" && voice.lang === "en-US" && voice.localService === true
                        );
                     utterance.voice = siriVoice;
                    utterance.onend = () => updateStopSpeechButtonVisibility();
                    utterance.onerror = () => updateStopSpeechButtonVisibility();
                    synth.speak(utterance);
                    updateStopSpeechButtonVisibility();
                }
            });
        }

        const uploadProductButton = messageElement.querySelector('.upload-image-button');
        if (uploadProductButton) {
            uploadProductButton.addEventListener('click', openImageUploadModal);
        }

        const uploadFacebookButton = messageElement.querySelector('.upload-facebook-image-button');
        if (uploadFacebookButton) {
            uploadFacebookButton.addEventListener('click', openFacebookImageUploadModal);
        }
    }

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
            const response = await fetch('/upload-creative-image', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to upload image to Facebook.');
            }

            const data = await response.json();
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

            const userMessage = {
                sender: 'user',
                content,
                created_at: new Date().toISOString()
            };

            // RENDER USER MESSAGE IMMEDIATELY
            appendMessageToChat(userMessage);
            messageInput.value = '';

            const typingElement = showTypingIndicator();

            const response = await fetch(`/chat/messages/${currentSessionId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content
                })
            });

            // REMOVE TYPING INDICATOR BEFORE RENDERING AGENT MESSAGE
            if (typingElement && chatMessages.contains(typingElement)) {
                chatMessages.removeChild(typingElement);
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Server error processing message.');
            }

            const agentMessage = await response.json();

            // Ensure agentMessage has a created_at timestamp
            if (!agentMessage.created_at) {
                agentMessage.created_at = new Date().toISOString(); // Assign current time if missing
            }

            // Append the agent's message directly
            appendMessageToChat(agentMessage);

            if (speechEnabled && window.speechSynthesis) {
                const cleanedSpeechText = cleanTextForSpeech(agentMessage.content);
                const utterance = new SpeechSynthesisUtterance(cleanedSpeechText);
                                    const voices = synth.getVoices();
                     const siriVoice = voices.find(voice =>
                            voice.name === "Samantha (English (United States))" && voice.lang === "en-US" && voice.localService === true
                        );
                     utterance.voice = siriVoice;
                utterance.onend = () => {
                    updateStopSpeechButtonVisibility();
                    if (speechEnabled && recognition) {
                        recognition.start();
                    }
                };
                utterance.onerror = () => updateStopSpeechButtonVisibility();
                window.speechSynthesis.speak(utterance);
                updateStopSpeechButtonVisibility();
            }

        } catch (error) {
            console.error('Error sending message:', error);
            // Ensure typing indicator is removed even on error
            const existingTypingIndicator = chatMessages.querySelector('.typing-indicator')?.closest('.message');
            if (existingTypingIndicator && chatMessages.contains(existingTypingIndicator)) {
                chatMessages.removeChild(existingTypingIndicator);
            }
            showError('Sorry, there was an error processing your message. ' + error.message);
        } finally {
            messageInput.disabled = false;
            sendMessageBtn.disabled = false;
            messageInput.focus();
            creatingSession = false;
            chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom in finally block
        }
    }


    // Helper function to display errors in the chat area
    function showError(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'alert alert-danger';
        errorElement.textContent = message;
        chatMessages.appendChild(errorElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Helper function to fetch chat sessions (used by loadChatSession and displayLoggedInUser)
    async function fetchChatSessions() {
        const response = await fetch('/chat/sessions', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        return response.ok ? await response.json() : [];
    }


    // Use event delegation for handling clicks on chat sessions and delete buttons
    // This function is called ONCE at DOMContentLoaded
    function setupChatSessionClickHandler() {
        document.getElementById('chatSessions').addEventListener('click', async (e) => {
            const sessionElement = e.target.closest('.chat-session');
            if (sessionElement) {
                // Check if the click was specifically on the delete button
                const deleteButton = e.target.closest('.chat-session-delete');
                if (deleteButton) {
                    e.stopPropagation(); // Prevent loading session if delete button was clicked
                    const sessionId = parseInt(deleteButton.dataset.id);
                    deleteChatSession(sessionId);
                } else {
                    // It was a click on the session div itself (but not the delete button)
                    const sessionId = parseInt(sessionElement.dataset.sessionId);
                    await loadChatSession(sessionId);
                }
            }
        });
    }

    // Function to clean text for speech synthesis
    function cleanTextForSpeech(text) {
        let safeText = text.replace(/[^\x20-\x7E]+/g, " ").trim();

        // Remove numbers with 6 or more digits
        let safeTextWithoutNumbers = safeText.replace(/\b\d{6,}\b/g, "");

        // Remove URLs
        const urlPattern = /(?:https?:\/\/|www\.)\S+|(?:(?:[a-zA-Z0-9-]+\.)+[a-z]{2,})\/\S*/g;
        let safeTextWithoutUrls = safeTextWithoutNumbers.replace(urlPattern, "");

        return safeTextWithoutUrls; // Return the cleaned text directly
    }


    // Event listeners for UI interactions

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
                updateStopSpeechButtonVisibility();
            }
        });
    }

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
        updateStopSpeechButtonVisibility();
    });

    document.getElementById('messageInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (sendMessageBtn.disabled) return;
            sendMessageBtn.disabled = true;
            sendMessage();
        }
    });

    // Initialize on page load
    if (window.location.pathname === '/chat') {
        loadChatSessions(); // This will load the sidebar sessions
        displayLoggedInUser();
        // REMOVED: The block that automatically loads the most recent chat session.
        // Now, the chat area will be empty upon refresh until a user interacts.

        // Ensure the chat title reflects "New Chat" and the area is clear
        // chatTitle.textContent = 'New Chat';
        // chatMessages.innerHTML = '';
        // currentSessionId = null; // Ensure no session is actively selected
    }
});