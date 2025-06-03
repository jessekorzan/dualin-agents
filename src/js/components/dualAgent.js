import { getSessionID } from '../core/session.js';

let agentConfig = {
    left: { name: '', webhook: '', webhookVariable: 'chatInput' },
    right: { name: '', webhook: '', webhookVariable: 'chatInput' },
    starterPrompt: '',
    startingAgent: 'left'
};

let battleState = {
    isRunning: false,
    isPaused: false,
    turnCount: 0,
    currentAgent: 'left',
    lastMessage: ''
};

export function setupDualAgentApp() {
    setupSetupScreen();
    setupBattleControls();
    loadSavedConfig();
}

function setupSetupScreen() {
    const startButton = document.getElementById('start-battle');

    startButton.addEventListener('click', () => {
        if (validateConfig()) {
            saveConfig();
            startBattle();
        } else {
            alert('Please fill in all required fields!');
        }
    });

    // Add auto-save on input changes for better UX
    const inputs = [
        'left-name', 'left-webhook', 'left-webhook-variable',
        'right-name', 'right-webhook', 'right-webhook-variable',
        'starter-prompt', 'starting-agent'
    ];

    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', () => {
                // Auto-save config when user types
                setTimeout(saveCurrentFormState, 500);
            });
        }
    });
}

function saveCurrentFormState() {
    const currentConfig = {
        left: {
            name: document.getElementById('left-name').value,
            webhook: document.getElementById('left-webhook').value,
            webhookVariable: document.getElementById('left-webhook-variable').value || 'chatInput'
        },
        right: {
            name: document.getElementById('right-name').value,
            webhook: document.getElementById('right-webhook').value,
            webhookVariable: document.getElementById('right-webhook-variable').value || 'chatInput'
        },
        starterPrompt: document.getElementById('starter-prompt').value,
        startingAgent: document.getElementById('starting-agent').value
    };

    localStorage.setItem('duelAgentsConfig', JSON.stringify(currentConfig));
}

function validateConfig() {
    const leftWebhook = document.getElementById('left-webhook').value;
    const rightWebhook = document.getElementById('right-webhook').value;
    const starterPrompt = document.getElementById('starter-prompt').value;

    return leftWebhook && rightWebhook && starterPrompt;
}

function saveConfig() {
    agentConfig = {
        left: {
            name: document.getElementById('left-name').value || 'Agent Left',
            webhook: document.getElementById('left-webhook').value,
            webhookVariable: document.getElementById('left-webhook-variable').value || 'chatInput'
        },
        right: {
            name: document.getElementById('right-name').value || 'Agent Right',
            webhook: document.getElementById('right-webhook').value,
            webhookVariable: document.getElementById('right-webhook-variable').value || 'chatInput'
        },
        starterPrompt: document.getElementById('starter-prompt').value,
        startingAgent: document.getElementById('starting-agent').value
    };

    // Save to localStorage
    localStorage.setItem('duelAgentsConfig', JSON.stringify(agentConfig));
}



function startBattle() {
    // Hide setup screen, show chat interface
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('chat-interface').style.display = 'flex';

    // Initialize battle state
    battleState.isRunning = true;
    battleState.isPaused = false;
    battleState.turnCount = 1;
    battleState.currentAgent = agentConfig.startingAgent;
    battleState.lastMessage = agentConfig.starterPrompt;

    // Update agent names in headers
    updateAgentNames();

    // Clear any existing messages from both chat outputs
    document.getElementById('left-output').innerHTML = '';
    document.getElementById('right-output').innerHTML = '';

    // Show the starter prompt - it should appear as outgoing on the starting agent's side
    // and incoming on the other agent's side.
    if (agentConfig.startingAgent === 'left') {
        addMessageToChat('left', agentConfig.starterPrompt);
        addIncomingMessageToChat('right', agentConfig.starterPrompt, 'left');
    } else {
        addMessageToChat('right', agentConfig.starterPrompt);
        addIncomingMessageToChat('left', agentConfig.starterPrompt, 'right');
    }

    updateTurnDisplay();

    // Start the conversation by sending to the OTHER agent (they respond to the starter)
    const respondingAgent = agentConfig.startingAgent === 'left' ? 'right' : 'left';
    battleState.currentAgent = respondingAgent;

    setTimeout(() => {
        sendMessageToAgent(respondingAgent, agentConfig.starterPrompt);
    }, 1000);
}

function loadSavedConfig() {
    const saved = localStorage.getItem('duelAgentsConfig');
    if (saved) {
        try {
            const config = JSON.parse(saved);

            // Load agent configs
            document.getElementById('left-name').value = config.left?.name || '';
            document.getElementById('left-webhook').value = config.left?.webhook || '';
            document.getElementById('left-webhook-variable').value = config.left?.webhookVariable || 'chatInput';
            document.getElementById('right-name').value = config.right?.name || '';
            document.getElementById('right-webhook').value = config.right?.webhook || '';
            document.getElementById('right-webhook-variable').value = config.right?.webhookVariable || 'chatInput';

            // Load other settings
            document.getElementById('starter-prompt').value = config.starterPrompt || '';
            document.getElementById('starting-agent').value = config.startingAgent || 'left';

        } catch (error) {
            console.error('Error loading saved config:', error);
        }
    }
}

function setupBattleControls() {
    const pauseButton = document.getElementById('pause-battle');
    const resetButton = document.getElementById('reset-battle');

    pauseButton.addEventListener('click', () => {
        battleState.isPaused = !battleState.isPaused;
        pauseButton.textContent = battleState.isPaused ? '▶️ Resume' : '⏸️ Pause';
        updateAgentStatus();
    });

    resetButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset the battle?')) {
            resetBattle();
        }
    });

    // Setup agent toggle controls
    setupAgentToggle();
}

function setupAgentToggle() {
    const toggleBoth = document.getElementById('toggle-both');
    const toggleLeft = document.getElementById('toggle-left');
    const toggleRight = document.getElementById('toggle-right');
    const chatContainer = document.querySelector('.chat-container');
    const leftAgent = document.querySelector('.left-agent');
    const rightAgent = document.querySelector('.right-agent');

    function setActiveToggle(activeButton) {
        [toggleBoth, toggleLeft, toggleRight].forEach(btn => btn.classList.remove('active'));
        activeButton.classList.add('active');
    }

    toggleBoth.addEventListener('click', () => {
        chatContainer.classList.remove('single-agent');
        leftAgent.classList.remove('visible');
        rightAgent.classList.remove('visible');
        setActiveToggle(toggleBoth);
    });

    toggleLeft.addEventListener('click', () => {
        chatContainer.classList.add('single-agent');
        leftAgent.classList.add('visible');
        rightAgent.classList.remove('visible');
        setActiveToggle(toggleLeft);
    });

    toggleRight.addEventListener('click', () => {
        chatContainer.classList.add('single-agent');
        rightAgent.classList.add('visible');
        leftAgent.classList.remove('visible');
        setActiveToggle(toggleRight);
    });
}

function resetBattle() {
    battleState.isRunning = false;
    battleState.isPaused = false;
    battleState.turnCount = 0;

    // Clear chat outputs
    document.getElementById('left-output').innerHTML = '';
    document.getElementById('right-output').innerHTML = '';

    // Hide chat interface, show setup screen
    document.getElementById('chat-interface').style.display = 'none';
    document.getElementById('setup-screen').style.display = 'flex';

    // Reset pause button
    document.getElementById('pause-battle').textContent = '⏸️ Pause';
}

async function sendMessageToAgent(agent, message) {
    if (!battleState.isRunning || battleState.isPaused) return;

    const config = agentConfig[agent];
    const outputElement = document.getElementById(`${agent}-output`);
    const spinnerElement = document.querySelector(`.${agent}-spinner`);
    const statusElement = document.getElementById(`${agent}-status`);

    // Debug logging
    console.log(`Sending message to ${agent} agent using webhook:`, config.webhook);
    console.log(`Message being sent:`, message.substring(0, 100) + '...');

    // Update status to show thinking indicator
    statusElement.textContent = 'Thinking...';
    statusElement.className = 'agent-status thinking';
    statusElement.style.animation = 'thinking 0.75s forwards ease-in-out infinite';

    try {
        const requestBody = {
            action: "sendMessage",
            sessionId: getSessionID() + `-${agent}`
        };
        requestBody[agentConfig[agent].webhookVariable] = message;

        const response = await fetch(config.webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const reader = response.body.getReader();
        let responseText = '';

        await readAgentStream(reader, (chunk) => {
            responseText += chunk;
            // Update the message in real-time
            updateAgentMessage(agent, responseText);
        });

        // Reset status and remove thinking animation
        statusElement.textContent = 'Ready';
        statusElement.className = 'agent-status ready';
        statusElement.style.animation = '';

        // Switch to the other agent
        switchTurn(responseText);

    } catch (error) {
        console.error(`Error with ${agent} agent:`, error);
        statusElement.textContent = 'Error';
        statusElement.className = 'agent-status error';
        statusElement.style.animation = '';

        // Add error message to chat
        addMessageToChat(agent, `❌ Error: ${error.message}`);
    }
}

function readAgentStream(reader, onChunk) {
    const decoder = new TextDecoder();

    return new Promise((resolve, reject) => {
        function processStream() {
            reader.read().then(({ done, value }) => {
                if (done) {
                    resolve();
                    return;
                }

                const chunk = decoder.decode(value);
                try {
                    const payload = JSON.parse(chunk);
                    onChunk(payload.data || chunk);
                } catch (error) {
                    onChunk(chunk);
                }

                processStream();
            }).catch(reject);
        }

        processStream();
    });
}

function updateAgentMessage(agent, message) {
    const outputElement = document.getElementById(`${agent}-output`);

    // Remove the last message container if it exists
    const lastContainer = outputElement.querySelector('.message-container:last-child');
    if (lastContainer && lastContainer.querySelector('.agent-message[data-temp="true"]')) {
        lastContainer.remove();
    }

    // Create message container with label
    const messageContainer = document.createElement('div');
    messageContainer.className = 'message-container outgoing';

    // Add agent label
    const labelElement = document.createElement('div');
    labelElement.className = 'message-label';
    const agentName = agentConfig[agent].name || (agent === 'left' ? 'Agent Left' : 'Agent Right');
    labelElement.textContent = `${agentName}:`;

    // Add the updated message
    const messageElement = document.createElement('div');
    messageElement.className = 'agent-message outgoing';
    messageElement.dataset.temp = 'true';
    messageElement.innerHTML = convertMarkdownToHTML(message);

    // Add webhook URL for debugging
    const webhookElement = document.createElement('div');
    webhookElement.className = 'webhook-debug';
    webhookElement.style.fontSize = '0.7rem';
    webhookElement.style.color = '#666';
    webhookElement.style.marginTop = '0.25rem';
    webhookElement.style.fontFamily = 'monospace';
    webhookElement.textContent = `🔗 ${agentConfig[agent].webhook}`;

    messageContainer.appendChild(labelElement);
    messageContainer.appendChild(messageElement);
    messageContainer.appendChild(webhookElement);
    outputElement.appendChild(messageContainer);

    // Auto-scroll to newest message
    scrollToBottom(outputElement);
}

function addMessageToChat(agent, message) {
    const outputElement = document.getElementById(`${agent}-output`);

    // Create message container with label
    const messageContainer = document.createElement('div');
    messageContainer.className = 'message-container outgoing';

    // Add agent label
    const labelElement = document.createElement('div');
    labelElement.className = 'message-label';
    const agentName = agentConfig[agent].name || (agent === 'left' ? 'Agent Left' : 'Agent Right');
    labelElement.textContent = `${agentName}:`;

    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = 'agent-message outgoing';
    messageElement.innerHTML = convertMarkdownToHTML(message);

    messageContainer.appendChild(labelElement);
    messageContainer.appendChild(messageElement);
    outputElement.appendChild(messageContainer);

    // Auto-scroll to newest message
    scrollToBottom(outputElement);
}

function addIncomingMessageToChat(agent, message, fromAgent = null) {
    const outputElement = document.getElementById(`${agent}-output`);

    // Create message container with label
    const messageContainer = document.createElement('div');
    messageContainer.className = 'message-container incoming';

    // Add agent label - determine who sent this message
    const labelElement = document.createElement('div');
    labelElement.className = 'message-label';
    // Use the provided fromAgent or fall back to currentAgent
    const sendingAgent = fromAgent || battleState.currentAgent;
    const agentName = agentConfig[sendingAgent].name || (sendingAgent === 'left' ? 'Agent Left' : 'Agent Right');
    labelElement.textContent = `${agentName}:`;

    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = 'agent-message incoming';
    messageElement.innerHTML = convertMarkdownToHTML(message);

    // Add webhook URL for debugging (only if we have a valid sending agent)
    if (agentConfig[sendingAgent]?.webhook) {
        const webhookElement = document.createElement('div');
        webhookElement.className = 'webhook-debug';
        webhookElement.style.fontSize = '0.7rem';
        webhookElement.style.color = '#666';
        webhookElement.style.marginTop = '0.25rem';
        webhookElement.style.fontFamily = 'monospace';
        webhookElement.textContent = `🔗 ${agentConfig[sendingAgent].webhook}`;

        messageContainer.appendChild(labelElement);
        messageContainer.appendChild(messageElement);
        messageContainer.appendChild(webhookElement);
    } else {
        messageContainer.appendChild(labelElement);
        messageContainer.appendChild(messageElement);
    }

    outputElement.appendChild(messageContainer);

    // Auto-scroll to newest message
    scrollToBottom(outputElement);
}

function scrollToBottom(element) {
    setTimeout(() => {
        element.scrollTop = element.scrollHeight;
    }, 100);
}

function switchTurn(lastResponse) {
    if (!battleState.isRunning || battleState.isPaused) return;

    // Make the last message permanent
    const currentOutput = document.getElementById(`${battleState.currentAgent}-output`);
    const lastMessage = currentOutput.querySelector('.agent-message:last-child');
    if (lastMessage) {
        lastMessage.dataset.temp = 'false';
    }

    // Mirror the response on both sides - show as incoming message on the other side
    const otherAgent = battleState.currentAgent === 'left' ? 'right' : 'left';
    addIncomingMessageToChat(otherAgent, lastResponse, battleState.currentAgent);

    // Switch to the other agent for the next turn
    battleState.currentAgent = otherAgent;
    battleState.turnCount++;
    battleState.lastMessage = lastResponse;

    updateTurnDisplay();
    updateAgentStatus();

    // Add a small delay before the next agent responds
    setTimeout(() => {
        if (battleState.isRunning && !battleState.isPaused) {
            // Send the message to the agent that should respond next
            sendMessageToAgent(battleState.currentAgent, lastResponse);
        }
    }, 2000);
}

function updateTurnDisplay() {
    document.getElementById('turn-count').textContent = battleState.turnCount;
}

function updateAgentStatus() {
    const leftStatus = document.getElementById('left-status');
    const rightStatus = document.getElementById('right-status');

    if (battleState.isPaused) {
        leftStatus.textContent = 'Paused';
        leftStatus.className = 'agent-status paused';
        rightStatus.textContent = 'Paused';
        rightStatus.className = 'agent-status paused';
    } else if (!battleState.isRunning) {
        leftStatus.textContent = 'Ready';
        leftStatus.className = 'agent-status ready';
        rightStatus.textContent = 'Ready';
        rightStatus.className = 'agent-status ready';
    } else {
        if (battleState.currentAgent === 'left') {
            leftStatus.textContent = 'Active';
            leftStatus.className = 'agent-status active';
            rightStatus.textContent = 'Waiting';
            rightStatus.className = 'agent-status waiting';
        } else {
            leftStatus.textContent = 'Waiting';
            leftStatus.className = 'agent-status waiting';
            rightStatus.textContent = 'Active';
            rightStatus.className = 'agent-status active';
        }
    }
}

function updateAgentNames() {
    const leftNameElement = document.getElementById('left-agent-name');
    const rightNameElement = document.getElementById('right-agent-name');

    const leftName = agentConfig.left.name || 'Agent Left';
    const rightName = agentConfig.right.name || 'Agent Right';

    leftNameElement.textContent = `🤖 ${leftName}`;
    rightNameElement.textContent = `🤖 ${rightName}`;
}

function convertMarkdownToHTML(text) {
    // Handle HTML input - if it's already HTML, return as-is
    if (text.includes('<') && text.includes('>')) {
        return text;
    }

    // Convert markdown to HTML
    let html = text;

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Inline code
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Line breaks - convert double line breaks to paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // Single line breaks within paragraphs
    html = html.replace(/\n/g, '<br>');

    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>\s*<\/p>/g, '');

    // Lists
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Numbered lists
    html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');

    return html;
}

// Expose functions for dev tools
window.duelAgents = {
    agentConfig,
    battleState,
    sendMessageToAgent,
    resetBattle
};