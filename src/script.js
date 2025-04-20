let ws;
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const loginContainer = document.getElementById('loginContainer');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const loginButton = document.getElementById('loginButton');
const registerButton = document.getElementById('registerButton');
const logoutButton = document.getElementById('logoutButton');
const userCount = document.getElementById('userCount');

let authToken = localStorage.getItem('authToken');

// Connect to WebSocket server
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('Connected to server');
        // Send authentication token
        ws.send(JSON.stringify({
            type: 'auth',
            token: authToken
        }));
        
        // Load recent messages
        loadRecentMessages();
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
            case 'error':
                handleError(data.message);
                break;
        }
    };

    ws.onclose = () => {
        console.log('Disconnected from server');
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
            if (authToken) {
                connectWebSocket();
            }
        }, 5000);
    };
}

// Load recent messages from server
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
        chatMessages.innerHTML = ''; // Clear existing messages
        
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

// Handle login
async function login(username, password) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        authToken = data.token;
        localStorage.setItem('authToken', authToken);
        
        loginContainer.classList.add('hidden');
        document.getElementById('chatContainer').classList.remove('hidden');
        logoutButton.classList.remove('hidden');
        connectWebSocket();
    } catch (error) {
        console.error('Login error:', error);
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    }
}

// Handle registration
async function register(username, password) {
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        authToken = data.token;
        localStorage.setItem('authToken', authToken);
        
        loginContainer.classList.add('hidden');
        document.getElementById('chatContainer').classList.remove('hidden');
        logoutButton.classList.remove('hidden');
        connectWebSocket();
    } catch (error) {
        console.error('Registration error:', error);
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    }
}

// Handle logout
function logout() {
    authToken = null;
    localStorage.removeItem('authToken');
    if (ws) {
        ws.close();
    }
    chatMessages.innerHTML = '';
    loginContainer.classList.remove('hidden');
    logoutButton.classList.add('hidden');
    userCount.textContent = '0';
}

// Handle errors
function handleError(message) {
    console.error('Error:', message);
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    
    appendSystemMessage({
        content: `Error: ${message}`,
        timestamp: new Date()
    });
}

// Append a new message to the chat
function appendMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${data.username === usernameInput.value ? 'sent' : 'received'}`;
    
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

// Append a system message
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

// Update user count
function updateUserCount(count) {
    userCount.textContent = count;
}

// Scroll chat to bottom
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Send message
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

// Event listeners
sendButton.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

loginButton.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    if (username && password) {
        login(username, password);
    }
});

registerButton.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    if (username && password) {
        register(username, password);
    }
});

logoutButton.addEventListener('click', logout);

// Check if user is already logged in
if (authToken) {
    loginContainer.classList.add('hidden');
    logoutButton.classList.remove('hidden');
    connectWebSocket();
} 
