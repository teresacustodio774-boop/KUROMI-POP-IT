document.addEventListener('DOMContentLoaded', () => {
    const popitContainer = document.getElementById('popit');
    const resetButton = document.getElementById('reset-btn');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatHistory = document.getElementById('chat-history');
    const micButton = document.getElementById('mic-btn');
    const bossFightButton = document.getElementById('boss-fight-btn');
    
    // Boss Fight UI
    const bossFightUI = document.getElementById('boss-fight-ui');
    const kuromiHealthFill = document.getElementById('kuromi-health-fill');
    const playerHealthFill = document.getElementById('player-health-fill');
    const kuromiHealthText = document.getElementById('kuromi-health-text');
    const playerHealthText = document.getElementById('player-health-text');
    const gameOverScreen = document.getElementById('game-over-screen');
    const gameOverMessage = document.getElementById('game-over-message');
    const playAgainButton = document.getElementById('play-again-btn');

    // --- Sound Setup ---
    let audioContext;
    let popSoundBuffer;
    let ttsAudio; // For AI voice

    function initAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    async function loadSound() {
        if (!audioContext) return;
        if (popSoundBuffer) return;
        try {
            const response = await fetch('pop.mp3');
            const arrayBuffer = await response.arrayBuffer();
            popSoundBuffer = await audioContext.decodeAudioData(arrayBuffer);
        } catch (error) {
            console.error('Error loading sound:', error);
        }
    }

    function playPopSound() {
        if (!audioContext || !popSoundBuffer) {
            console.log('Audio not ready');
            return;
        }
        const source = audioContext.createBufferSource();
        source.buffer = popSoundBuffer;
        
        // Add a bit of pitch variation for more satisfying pops
        const randomPitch = 1.0 + (Math.random() - 0.5) * 0.2;
        source.playbackRate.setValueAtTime(randomPitch, audioContext.currentTime);

        source.connect(audioContext.destination);
        source.start(0);
    }
    
    // Initialize audio on first user interaction
    document.body.addEventListener('touchstart', initAudio, { once: true });
    document.body.addEventListener('mousedown', initAudio, { once: true });
    
    // Preload sound on hover/touch over the game area
    popitContainer.addEventListener('mouseover', loadSound, { once: true });
    popitContainer.addEventListener('touchstart', loadSound, { once: true });

    const bubblePositions = [
        // Left Ear
        { top: 12, left: 16, size: 8 },
        { top: 21, left: 22, size: 8 },
        { top: 30, left: 17, size: 8 },
        { top: 19, left: 12, size: 7 },
        { top: 35, left: 24, size: 7 },
        { top: 28, left: 10, size: 6 },
        
        // Right Ear
        { top: 12, left: 76, size: 8 },
        { top: 21, left: 70, size: 8 },
        { top: 30, left: 75, size: 8 },
        { top: 19, left: 81, size: 7 },
        { top: 35, left: 69, size: 7 },
        { top: 28, left: 84, size: 6 },

        // Face
        { top: 32, left: 46, size: 9 }, // Center forehead
        { top: 43, left: 38, size: 9 },
        { top: 43, left: 54, size: 9 },
        { top: 55, left: 46, size: 9 },
        { top: 54, left: 32, size: 8 },
        { top: 54, left: 60, size: 8 },
        { top: 65, left: 39, size: 9 },
        { top: 65, left: 53, size: 9 },
        { top: 76, left: 46, size: 9 },

        // Cheek areas
        { top: 68, left: 28, size: 7 },
        { top: 68, left: 65, size: 7 },
        { top: 45, left: 28, size: 7 },
        { top: 45, left: 65, size: 7 },
        { top: 78, left: 35, size: 7 },
        { top: 78, left: 57, size: 7 },
    ];

    function createBubbles() {
        popitContainer.innerHTML = '';
        bubblePositions.forEach((pos, index) => {
            const bubble = document.createElement('div');
            bubble.classList.add('bubble');
            bubble.style.top = `${pos.top}%`;
            bubble.style.left = `${pos.left}%`;
            bubble.style.width = `${pos.size}%`;
            bubble.style.height = `${pos.size}%`;
            bubble.dataset.index = index;
            popitContainer.appendChild(bubble);
        });
    }

    function handlePop(event) {
        if (event.target.classList.contains('bubble')) {
            initAudio(); // Ensure audio is ready
            loadSound(); // Ensure sound is loaded

            if (bossFightActive) {
                if (!event.target.classList.contains('popped')) {
                    event.target.classList.add('popped');
                    playPopSound();
                    kuromiHealth = Math.max(0, kuromiHealth - 5);
                    updateHealthBars();
                    checkWinLoss();
                }
            } else {
                 event.target.classList.toggle('popped');
                 playPopSound();
            }
        }
    }

    function resetAllBubbles() {
        const bubbles = document.querySelectorAll('.bubble');
        bubbles.forEach(bubble => {
            bubble.classList.remove('popped');
        });
    }

    popitContainer.addEventListener('click', handlePop);
    resetButton.addEventListener('click', () => {
        if(bossFightActive) {
            endBossFight();
        } else {
            resetAllBubbles();
        }
    });

    // --- AI Chat Logic ---
    let conversationHistory = [];

    const kuromiSystemPrompt = `You are Kuromi from Sanrio. You have a mischievous, punk-rock, but also girly personality who loves romance. You have a crush on Keiichi Hiiragi. You are sassy and a bit of a troublemaker. You often use phrases like "Nyehehe!" when you're feeling cheeky. Keep your responses short, cute, and perfectly in character. Do not break character.`;

    async function sendChatMessage(userInput) {
        if (!userInput) return;

        addMessageToHistory(userInput, 'user');

        const loadingMessage = addMessageToHistory('...', 'ai');

        try {
            const userMessage = { role: 'user', content: userInput };
            conversationHistory.push(userMessage);
            conversationHistory = conversationHistory.slice(-10);

            const completion = await websim.chat.completions.create({
                messages: [
                    { role: 'system', content: kuromiSystemPrompt },
                    ...conversationHistory,
                ],
            });

            const aiResponse = completion.content;
            conversationHistory.push(completion);
            loadingMessage.textContent = aiResponse;

            speakText(aiResponse);

        } catch (error) {
            console.error('Error with AI chat:', error);
            loadingMessage.textContent = 'Grr, I don\'t feel like talking.';
        }
    }

    async function handleChatSubmit(e) {
        e.preventDefault();
        const userInput = chatInput.value.trim();
        chatInput.value = '';
        sendChatMessage(userInput);
    }

    function addMessageToHistory(text, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', `${sender}-message`);
        messageElement.textContent = text;
        chatHistory.appendChild(messageElement);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        return messageElement;
    }

    async function speakText(text) {
        initAudio(); // Ensure audio context is active
        try {
            if (ttsAudio && !ttsAudio.paused) {
                ttsAudio.pause();
            }
            const result = await websim.textToSpeech({
                text: text,
                voice: "jBpfuIE2acCO8z3wKNLl", // Using ElevenLabs' Gigi voice for a more animated character feel
            });
            ttsAudio = new Audio(result.url);
            ttsAudio.play();
        } catch (error) {
            console.error('Error with text to speech:', error);
        }
    }
    
    chatForm.addEventListener('submit', handleChatSubmit);

    // --- Voice Input Logic ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    let isListening = false;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            isListening = true;
            micButton.classList.add('listening');
            chatInput.placeholder = 'Listening...';
        };

        recognition.onend = () => {
            isListening = false;
            micButton.classList.remove('listening');
            chatInput.placeholder = 'Talk to Kuromi...';
        };
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            chatInput.placeholder = 'Oops, couldn\'t hear you!';
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            sendChatMessage(transcript);
        };

    } else {
        micButton.style.display = 'none';
        console.log("Speech Recognition not supported in this browser.");
    }

    function toggleListening() {
        if (!SpeechRecognition) return;
        initAudio(); // Ensure audio context is ready for TTS response

        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    }

    micButton.addEventListener('click', toggleListening);

    // --- Boss Fight Logic ---
    let bossFightActive = false;
    let kuromiHealth = 100;
    let playerHealth = 100;
    let kuromiAttackInterval;

    function startBossFight() {
        bossFightActive = true;
        document.body.classList.add('boss-fight-active');
        resetAllBubbles();

        kuromiHealth = 100;
        playerHealth = 100;
        updateHealthBars();
        
        // Initial mock
        sendChatMessage("Nyehehe! You think you can beat ME?!");

        kuromiAttackInterval = setInterval(kuromiAttack, 3500);
    }

    function endBossFight() {
        bossFightActive = false;
        clearInterval(kuromiAttackInterval);
        document.body.classList.remove('boss-fight-active');
        gameOverScreen.style.display = 'none';
        resetAllBubbles();
    }

    function updateHealthBars() {
        kuromiHealthFill.style.width = `${kuromiHealth}%`;
        playerHealthFill.style.width = `${playerHealth}%`;
        kuromiHealthText.textContent = `${kuromiHealth}/100`;
        playerHealthText.textContent = `${playerHealth}/100`;
    }
    
    async function getKuromiMockery() {
        try {
            const completion = await websim.chat.completions.create({
                messages: [
                    { role: 'system', content: 'You are Kuromi in a boss fight. Say a short, sassy, mocking phrase to your opponent (under 10 words). Use phrases like "Nyehehe!".' },
                    { role: 'user', content: 'Mock me!' },
                ],
            });
            return completion.content;
        } catch (error) {
            console.error('Error getting mockery:', error);
            return "Is that all you've got?";
        }
    }

    async function kuromiAttack() {
        if (!bossFightActive) return;
        
        playerHealth = Math.max(0, playerHealth - 10);
        updateHealthBars();

        const mock = await getKuromiMockery();
        addMessageToHistory(mock, 'ai');
        speakText(mock);

        checkWinLoss();
    }

    function checkWinLoss() {
        if (kuromiHealth <= 0) {
            gameOver("You... beat me? Hmph!");
        } else if (playerHealth <= 0) {
            gameOver("Nyehehe! I win! You're no match for me!");
        }
    }

    function gameOver(message) {
        if (!bossFightActive) return; // Prevent multiple triggers
        bossFightActive = false; // Stop the fight logic
        clearInterval(kuromiAttackInterval);
        gameOverMessage.textContent = message;
        speakText(message);
        gameOverScreen.style.display = 'flex';
    }
    
    bossFightButton.addEventListener('click', startBossFight);
    playAgainButton.addEventListener('click', () => {
        gameOverScreen.style.display = 'none';
        startBossFight();
    });

    createBubbles();
});