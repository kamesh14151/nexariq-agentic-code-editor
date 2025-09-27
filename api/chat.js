// Add this to your HTML file's script section

// API Configuration
const API_CONFIG = {
  endpoint: '/api/chat', // For Vercel deployment
  // For local testing, use: 'http://localhost:3000/api/chat'
  headers: {
    'Content-Type': 'application/json'
  }
};

// Update the sendMessage function to use the real API
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || state.chat.pendingMessages.length > 0) return;
    
    // Check quota
    if (state.quota.messagesLeft <= 0) {
        showToast('Message quota exceeded. Please upgrade your plan.', 'error');
        return;
    }
    
    // Check API status
    if (state.api.status !== 'online') {
        showToast('AI is currently offline. Please try again later.', 'error');
        return;
    }
    
    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendBtn.disabled = true;
    
    // Hide empty state
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    
    // Add user message
    addMessage('user', message);
    
    // Show typing indicator
    showTypingIndicator();
    
    // Enable two-column layout after first message
    if (!state.chat.hasMessages) {
        state.chat.hasMessages = true;
        sidebarRight.classList.add('active');
    }
    
    // Add to pending messages
    state.chat.pendingMessages.push(message);
    
    // Prepare API request
    const messages = [
        ...state.chat.messages.map(msg => ({
            role: msg.type,
            content: msg.content
        })),
        { role: 'user', content: message }
    ];
    
    const options = {
        length: 1024,
        creativity: 70,
        system: "You are a helpful AI assistant. Be concise and helpful."
    };
    
    try {
        // Make API request
        const response = await fetch(API_CONFIG.endpoint, {
            method: 'POST',
            headers: API_CONFIG.headers,
            body: JSON.stringify({
                messages,
                options
            })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        const aiResponse = data.choices[0].message.content;
        
        // Remove typing indicator
        removeTypingIndicator();
        
        // Add AI response to chat
        addMessage('ai', aiResponse);
        
        // Extract code from response if available
        extractCodeFromResponse(aiResponse);
        
        // Update quota
        state.quota.used += 1;
        state.quota.messagesLeft -= 1;
        updateQuotaBar();
        
        // Remove from pending messages
        state.chat.pendingMessages = state.chat.pendingMessages.filter(msg => msg !== message);
        
        // Add to chat history
        addToChatHistory(message);
        
        showToast('Response generated successfully!', 'success');
        
    } catch (error) {
        console.error('Error sending message:', error);
        
        // Remove typing indicator
        removeTypingIndicator();
        
        // Show error message
        addMessage('ai', 'I apologize, but I encountered an error while processing your request. Please try again.');
        showToast('Failed to generate response: ' + error.message, 'error');
        
        // Remove from pending messages
        state.chat.pendingMessages = state.chat.pendingMessages.filter(msg => msg !== message);
    }
}

// Update checkApiStatus function to use the real API
async function checkApiStatus() {
    try {
        // Send a ping message to check if the API is working
        const response = await fetch(API_CONFIG.endpoint, {
            method: 'POST',
            headers: API_CONFIG.headers,
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'ping' }],
                options: { length: 10 }
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.choices && data.choices[0].message.content === 'pong') {
                state.api.status = 'online';
                statusDot.className = 'status-dot online';
                statusText.textContent = 'Online';
            } else {
                throw new Error('Invalid ping response');
            }
        } else {
            throw new Error(`API returned status ${response.status}`);
        }
        
        state.api.lastCheck = new Date();
    } catch (error) {
        console.error('Error checking API status:', error);
        state.api.status = 'offline';
        statusDot.className = 'status-dot offline';
        statusText.textContent = 'Offline';
    }
}
