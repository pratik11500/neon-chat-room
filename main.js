// DOM Elements
const authContainer = document.getElementById('authContainer');
const chatContainer = document.getElementById('chatContainer');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const logoutButton = document.getElementById('logoutButton');
const currentUser = document.getElementById('currentUser');
const userCount = document.getElementById('userCount');

// Auth tab switching
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.tab}Form`).classList.add('active');
    });
});

// WebSocket connection
let ws = null;

function connectWebSocket() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = '3000'; // Use the server port
    const wsUrl = `${protocol}//${host}:${port}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket connected');
        ws.send(JSON.stringify({ type: 'auth', token }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received message:', data);
        
        switch (data.type) {
            case 'chat':
            case 'system':
                appendMessage(data);
                break;
            case 'userCount':
                userCount.textContent = data.count;
                break;
        }
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        setTimeout(connectWebSocket, 1000);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

// Message handling
function appendMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${data.type}`;
    
    let content = '';
    if (data.type === 'chat') {
        content = `
            <div class="username">${data.username}</div>
            <div class="content">${data.content}</div>
            <div class="timestamp">${new Date(data.timestamp).toLocaleTimeString()}</div>
        `;
    } else {
        content = `
            <div class="content">${data.content}</div>
            <div class="timestamp">${new Date(data.timestamp).toLocaleTimeString()}</div>
        `;
    }
    
    messageDiv.innerHTML = content;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Form submissions
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            showChat(username);
            connectWebSocket();
        } else {
            loginError.textContent = data.error;
        }
    } catch (error) {
        loginError.textContent = 'Login failed. Please try again.';
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
        registerError.textContent = 'Passwords do not match';
        return;
    }
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            showChat(username);
            connectWebSocket();
        } else {
            registerError.textContent = data.error;
        }
    } catch (error) {
        registerError.textContent = 'Registration failed. Please try again.';
    }
});

// Chat functionality
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

function sendMessage() {
    const content = messageInput.value.trim();
    if (!content || !ws || ws.readyState !== WebSocket.OPEN) {
        console.log('Cannot send message:', { content, ws: ws?.readyState });
        return;
    }
    
    console.log('Sending message:', content);
    ws.send(JSON.stringify({
        type: 'message',
        content
    }));
    
    messageInput.value = '';
}

// Logout handling
logoutButton.addEventListener('click', () => {
    localStorage.removeItem('token');
    if (ws) ws.close();
    showAuth();
});

// UI state management
function showChat(username) {
    authContainer.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    currentUser.textContent = username;
    loadRecentMessages();
}

function showAuth() {
    authContainer.classList.remove('hidden');
    chatContainer.classList.add('hidden');
    chatMessages.innerHTML = '';
    userCount.textContent = '0';
}

// Load recent messages
async function loadRecentMessages() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/messages', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const messages = await response.json();
            chatMessages.innerHTML = '';
            messages.forEach(msg => {
                appendMessage({
                    type: 'chat',
                    username: msg.username,
                    content: msg.message,
                    timestamp: msg.timestamp
                });
            });
        }
    } catch (error) {
        console.error('Failed to load messages:', error);
    }
}

// Check authentication status on load
const token = localStorage.getItem('token');
if (token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        showChat(payload.username);
        connectWebSocket();
    } catch (error) {
        localStorage.removeItem('token');
        showAuth();
    }
} else {
    showAuth();
} 
