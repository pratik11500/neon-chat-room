// DOM Elements
const authContainer = document.getElementById('authContainer');
const chatContainer = document.getElementById('chatContainer');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const currentUser = document.getElementById('currentUser');
const logoutButton = document.getElementById('logoutButton');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const userCount = document.getElementById('userCount');

let ws;
let authToken;

// Tab switching
const authTabs = document.querySelectorAll('.auth-tab');
const authForms = document.querySelectorAll('.auth-form');

authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetForm = tab.dataset.tab;
        
        authTabs.forEach(t => t.classList.remove('active'));
        authForms.forEach(f => f.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(`${targetForm}Form`).classList.add('active');
    });
});

// Authentication functions
async function register(username, password) {
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }
        
        return data.token;
    } catch (error) {
        throw error;
    }
}

async function login(username, password) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }
        
        return data.token;
    } catch (error) {
        throw error;
    }
}

// WebSocket connection
function connectWebSocket(token) {
    ws = new WebSocket(`ws://${window.location.hostname}:3000`);

    ws.onopen = () => {
        console.log('Connected to chat server');
        ws.send(JSON.stringify({
            type: 'auth',
            token: token
        }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
            case 'chat':
                appendMessage(data);
                break;
            case 'system':
                appendSystemMessage(data);
                break;
            case 'userCount':
                updateUserCount(data.count);
                break;
        }
    };

    ws.onclose = () => {
        console.log('Disconnected from chat server');
        setTimeout(() => {
            if (authToken) {
                connectWebSocket(authToken);
            }
        }, 5000);
    };
}

// Message handling
async function loadRecentMessages() {
    try {
        const response = await fetch('/api/messages', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load messages');
        }
        
        const messages = await response.json();
        messages.forEach(msg => {
            appendMessage({
                username: msg.username,
                content: msg.message,
                timestamp: new Date(msg.timestamp)
            });
        });
        
        scrollToBottom();
    } catch (error) {
        console.error('Error loading messages:', error);
        appendSystemMessage({
            content: 'Failed to load recent messages',
            timestamp: new Date()
        });
    }
}

function appendMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${data.username === currentUser.textContent ? 'sent' : 'received'}`;
    
    const usernameSpan = document.createElement('div');
    usernameSpan.className = 'username';
    usernameSpan.textContent = data.username;
    
    const contentDiv = document.createElement('div');
    contentDiv.textContent = data.content;
    
    const timestampDiv = document.createElement('div');
    timestampDiv.className = 'timestamp';
    timestampDiv.textContent = new Date(data.timestamp).toLocaleTimeString();
    
    messageDiv.appendChild(usernameSpan);
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timestampDiv);
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function appendSystemMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message system';
    
    const contentDiv = document.createElement('div');
    contentDiv.textContent = data.content;
    
    const timestampDiv = document.createElement('div');
    timestampDiv.className = 'timestamp';
    timestampDiv.textContent = new Date(data.timestamp).toLocaleTimeString();
    
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timestampDiv);
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function updateUserCount(count) {
    userCount.textContent = count;
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendMessage() {
    const content = messageInput.value.trim();
    if (content && ws) {
        ws.send(JSON.stringify({
            type: 'message',
            content: content
        }));
        messageInput.value = '';
    }
}

// Event Listeners
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    registerError.textContent = '';
    
    if (password !== confirmPassword) {
        registerError.textContent = 'Passwords do not match';
        return;
    }
    
    try {
        authToken = await register(username, password);
        currentUser.textContent = username;
        authContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
        connectWebSocket(authToken);
        loadRecentMessages();
    } catch (error) {
        registerError.textContent = error.message;
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    loginError.textContent = '';
    
    try {
        authToken = await login(username, password);
        currentUser.textContent = username;
        authContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
        connectWebSocket(authToken);
        loadRecentMessages();
    } catch (error) {
        loginError.textContent = error.message;
    }
});

logoutButton.addEventListener('click', () => {
    authToken = null;
    if (ws) {
        ws.close();
    }
    chatContainer.classList.add('hidden');
    authContainer.classList.remove('hidden');
    chatMessages.innerHTML = '';
    messageInput.value = '';
    currentUser.textContent = '';
});

sendButton.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
}); 
