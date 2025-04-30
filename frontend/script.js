async function onLoaded() {
    
}

// Generate mock links for detected objects
function getObjectLinks(objectName) {
    // In a real app, you would fetch these links from your backend API
    const linkTemplates = [
        { title: 'Wikipedia article', url: `https://en.wikipedia.org/wiki/${objectName}`, icon: 'fa-wikipedia-w' },
        { title: 'Google Images', url: `https://www.google.com/search?tbm=isch&q=${objectName}`, icon: 'fa-image' },
        { title: 'YouTube videos', url: `https://www.youtube.com/results?search_query=${objectName}`, icon: 'fa-youtube' },
        { title: 'Shopping results', url: `https://www.amazon.com/s?k=${objectName}`, icon: 'fa-shopping-cart' },
        { title: 'Dictionary definition', url: `https://www.merriam-webster.com/dictionary/${objectName}`, icon: 'fa-book' }
    ];
    
    // Return all link templates with the object name inserted
    return linkTemplates.map(template => ({
        title: template.title,
        url: template.url,
        icon: template.icon
    }));
}


document.addEventListener('DOMContentLoaded', async () => {
    const videoElement = document.getElementById('videoElement');
    const startButton = document.getElementById('startCamera');
    const stopButton = document.getElementById('stopCamera');
    const toggleSpeechBtn = document.getElementById('toggleSpeech');
    const predictionText = document.getElementById('prediction');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const languageSelector = document.getElementById('voiceLanguage');
    
    // History panel elements
    const historyList = document.getElementById('history-list');
    const detailsPanel = document.getElementById('details-panel');
    const detailTitle = document.getElementById('detail-title');
    const detailDate = document.getElementById('detail-date');
    const detailLinks = document.getElementById('detail-links');
    const closeDetails = document.getElementById('close-details');

    let stream = null;
    let model = null;
    let detecting = false;
    let speechSynthesis = window.speechSynthesis;
    let lastSpokenObjects = [];
    
    // Array to store detection history
    let detectionHistory = [];

    // User authentication state
    let user = null;

    // Function to show login widget
    function showLoginWidget(item) {
        // Get elements
        const loginWidget = document.getElementById('login-widget');
        const closeLoginBtn = document.getElementById('close-login');
        const confirmLoginBtn = document.getElementById('confirm-login');
        const userEmailInput = document.getElementById('user-email');
        
        // Create overlay (if it doesn't exist)
        let loginOverlay = document.getElementById('login-overlay');
        if (!loginOverlay) {
            loginOverlay = document.createElement('div');
            loginOverlay.className = 'overlay';
            loginOverlay.id = 'login-overlay';
            document.body.appendChild(loginOverlay);
        }
        
        // Show overlay and widget
        loginOverlay.style.display = 'block';
        loginWidget.style.display = 'block';
        
        // Focus on input
        userEmailInput.focus();
        
        // Handle close button
        closeLoginBtn.onclick = () => {
            loginWidget.style.display = 'none';
            loginOverlay.style.display = 'none';
        };
        
        // Handle click on overlay to close
        loginOverlay.onclick = () => {
            loginWidget.style.display = 'none';
            loginOverlay.style.display = 'none';
        };
        
        // Handle confirm button
        confirmLoginBtn.onclick = () => {
            const email = userEmailInput.value.trim();
            if (email && email.length > 0) {
                user = email;
                loginWidget.style.display = 'none';
                loginOverlay.style.display = 'none';
                
                // Save the detection
                saveItemToDatabase(item, user);
                
                // Store email in localStorage for future use
                localStorage.setItem('seebot_user', user);
            } else {
                // Shake effect for empty input
                userEmailInput.classList.add('shake');
                setTimeout(() => {
                    userEmailInput.classList.remove('shake');
                }, 500);
            }
        };
        
        // Handle Enter key in input
        userEmailInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                confirmLoginBtn.click();
            }
        };
        
        // Pre-fill with stored email if available
        const storedUser = localStorage.getItem('seebot_user');
        if (storedUser) {
            userEmailInput.value = storedUser;
        }
    }
    
    // Function to save detection to database
    async function saveItemToDatabase(item, user) {
        if (!user) {
            showLoginWidget(item);
            return;
        }
        
        try {
            console.log(`Saving detection for ${user}: ${item.name}`);
            
            // API
            await axios.post('/api/detections', {
                user: user,
                item: item
            });
            
            // Show success message
            const successMsg = document.createElement('div');
            successMsg.className = 'success-message';
            successMsg.innerHTML = '<i class="fas fa-check-circle"></i> Saved successfully!';
            document.body.appendChild(successMsg);
            
            setTimeout(() => {
                successMsg.remove();
            }, 3000);
            
        } catch (error) {
            console.error("Error saving detection:", error);
            
            // Show error message
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.innerHTML = '<i class="fas fa-exclamation-circle"></i> Failed to save';
            document.body.appendChild(errorMsg);
            
            
            setTimeout(() => {
                errorMsg.remove();
            }, 3000);
        }
    }

    async function loadModel() {
        try {
            predictionText.innerHTML = '<i class="fas fa-cog fa-spin"></i> Loading AI model...';
            model = await cocoSsd.load();
            console.log("COCO-SSD model loaded successfully!");
            predictionText.innerHTML = '<i class="fas fa-check"></i> Model loaded. Start camera to begin.';
        } catch (error) {
            console.error("Error loading model:", error);
            predictionText.innerText = "Error loading model.";
        }
    }

    async function startCamera() {
        try {
            console.log("Requesting camera access...");
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            videoElement.srcObject = stream;
            startButton.disabled = true;
            stopButton.disabled = false;
            predictionText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Camera started. Detecting objects...';
            detectObjects();
        } catch (error) {
            console.error("Error accessing camera:", error);
            alert("Unable to access camera. Check permissions and ensure it's not in use by another app.");
        }
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            videoElement.srcObject = null;
            startButton.disabled = false;
            stopButton.disabled = true;
            detecting = false;
            predictionText.innerHTML = '<i class="fas fa-camera-slash"></i> Camera stopped.';
            
            // Cancel any ongoing speech when camera stops
            speechSynthesis.cancel();
        }
    }

    async function detectObjects() {
        detecting = true;
        
        if (!model) {
            console.warn("Model not loaded yet. Waiting...");
            return;
        }
        
        // Wait for the video to be properly loaded
        if (videoElement.readyState < 2) {
            await new Promise(resolve => {
                videoElement.onloadeddata = () => {
                    resolve();
                };
            });
        }
        
        // Set canvas dimensions to match video
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;

        while (detecting) {
            const predictions = await axios.post('/api/detect', {
                image: videoElement.srcObject
            });
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

            // Display predictions with icons
            if (predictions.length > 0) {
                predictionText.innerHTML = `<i class="fas fa-check-circle"></i> Detected: ${predictions.map(p => `<strong>${p.class}</strong> (${Math.round(p.score * 100)}%)`).join(", ")}`;
                
                // Speak detected objects
                speakDetectedObjects(predictions);
                
                // Add to detection history (only high confidence predictions)
                addToHistory(predictions.filter(p => p.score > 0.5));
                
                // Draw bounding boxes
                predictions.forEach(prediction => {
                    const [x, y, width, height] = prediction.bbox;
                    
                    // Draw rectangle
                    ctx.strokeStyle = '#e74c3c';
                    ctx.lineWidth = 4;
                    ctx.strokeRect(x, y, width, height);
                    
                    // Draw label background
                    ctx.fillStyle = 'rgba(231, 76, 60, 0.8)';
                    const textWidth = ctx.measureText(prediction.class).width;
                    ctx.fillRect(x, y - 30, textWidth + 20, 30);
                    
                    // Draw text
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '18px Roboto';
                    ctx.fillText(prediction.class, x + 10, y - 10);
                });
            } else {
                predictionText.innerHTML = '<i class="fas fa-search"></i> No objects detected';
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    function speakDetectedObjects(predictions) {
        // Don't speak if speech is disabled
        if (!speechEnabled) {
            return;
        }
        
        // Get current object classes
        const currentObjects = predictions.map(p => p.class);
        
        // Filter for objects with confidence over 50%
        const highConfidenceObjects = predictions
            .filter(p => p.score > 0.5)
            .map(p => p.class);
            
        // Check if we have new objects to announce
        const newObjects = highConfidenceObjects.filter(obj => !lastSpokenObjects.includes(obj));
        
        if (newObjects.length > 0) {
            // Cancel any ongoing speech
            speechSynthesis.cancel();
            
            // Create message for new objects
            let message;
            if (newObjects.length === 1) {
                message = `I see a ${newObjects[0]}`;
            } else {
                const lastObject = newObjects.pop();
                message = `I see ${newObjects.join(', ')} and a ${lastObject}`;
            }
            
            // Create and speak utterance
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.lang = languageSelector.value; // Use selected language
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            // Try to find a voice that matches the selected language
            const voices = speechSynthesis.getVoices();
            const matchingVoice = voices.find(voice => voice.lang === languageSelector.value);
            if (matchingVoice) {
                utterance.voice = matchingVoice;
            }
            
            speechSynthesis.speak(utterance);
            
            // Update last spoken objects
            lastSpokenObjects = highConfidenceObjects;
        }
    }
    
    // Add detected objects to history
    async function addToHistory(predictions) {
        if (predictions.length === 0) return;
        
        const timestamp = new Date();
        
        // Process each prediction and add to history if it's new
        predictions.forEach(prediction => {
            // Generate mock links for the object (in real app, you'd fetch these from your backend)
            const links = getObjectLinks(prediction.class);
            
            // Add to history array (prepend to show newest first)
            // Check if this object already exists in the history
            const existingIndex = detectionHistory.findIndex(item => item.name === prediction.class);
            if (existingIndex !== -1) {
                // Remove the existing entry if found
                detectionHistory.splice(existingIndex, 1);
            }
            detectionHistory.unshift({
                name: prediction.class,
                confidence: prediction.score,
                timestamp: timestamp,
                links: links,
                // Assign an icon based on object class
                icon: getObjectIcon(prediction.class)
            });
        });
        
        // Limit history to most recent 50 items to prevent it from growing too large
        if (detectionHistory.length > 50) {
            detectionHistory = detectionHistory.slice(0, 50);
        }
        
        // Update the history display
        updateHistoryDisplay();
    }
    
    // Generate appropriate icon for object type
    function getObjectIcon(objectName) {
        // Map common object types to Font Awesome icons
        const iconMap = {
            person: 'fa-user',
            car: 'fa-car',
            truck: 'fa-truck',
            bus: 'fa-bus',
            bicycle: 'fa-bicycle',
            motorcycle: 'fa-motorcycle',
            dog: 'fa-dog',
            cat: 'fa-cat',
            bird: 'fa-dove',
            chair: 'fa-chair',
            bottle: 'fa-bottle-water',
            cup: 'fa-mug-hot',
            book: 'fa-book',
            clock: 'fa-clock',
            "cell phone": 'fa-mobile-alt',
            laptop: 'fa-laptop',
            keyboard: 'fa-keyboard',
            mouse: 'fa-mouse',
            remote: 'fa-remote',
            tv: 'fa-tv',
            refrigerator: 'fa-refrigerator',
            oven: 'fa-oven',
            microwave: 'fa-microwave',
            toaster: 'fa-bread-slice',
            sink: 'fa-sink',
            fork: 'fa-utensils',
            knife: 'fa-utensils',
            spoon: 'fa-utensils',
            bowl: 'fa-bowl-food',
            banana: 'fa-apple-whole',
            apple: 'fa-apple-whole',
            orange: 'fa-apple-whole',
            sandwich: 'fa-burger',
            broccoli: 'fa-carrot',
            carrot: 'fa-carrot',
            "hot dog": 'fa-hotdog',
            pizza: 'fa-pizza-slice',
            donut: 'fa-cookie',
            cake: 'fa-cake-candles'
        };
        
        // Return matching icon or default icon
        return iconMap[objectName.toLowerCase()] || 'fa-eye';
    }
    
    // Update the history display with current history items
    function updateHistoryDisplay() {
        // Clear current list
        historyList.innerHTML = '';
        
        if (detectionHistory.length === 0) {
            historyList.innerHTML = '<p class="empty-history"><i class="fas fa-history"></i> No detection history yet</p>';
            return;
        }
        
        // Add items to history list
        detectionHistory.forEach(item => {
            // Create history item element
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
            <div class="item-info">
                <h4><i class="fas ${item.icon}"></i> ${item.name}</h4>
                <p class="date">${formatTimestamp(item.timestamp)}</p>
            </div>
            `;
            
            // Add click event to show details
            historyItem.addEventListener('click', () => {
                showObjectDetails(item);
            });
            
            historyList.appendChild(historyItem);
        });
    }
    
    // Format timestamp for display
    function formatTimestamp(timestamp) {
        return timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
    
    // Show details panel for a history item
    function showObjectDetails(item) {
        // Update details panel content
        detailTitle.textContent = item.name;
        detailDate.textContent = `Detected at ${formatTimestamp(item.timestamp)}`;
        
        // Clear and populate links
        detailLinks.innerHTML = '';
        item.links.forEach(link => {
            const linkElement = document.createElement('a');
            linkElement.href = link.url;
            linkElement.className = 'link-item';
            linkElement.target = '_blank'; // Open in new tab
            linkElement.rel = 'noopener noreferrer'; // Security best practice
            
            linkElement.innerHTML = `
                <i class="fab ${link.icon}"></i>
                <span class="link-text">${link.title}</span>
                <i class="fas fa-external-link-alt"></i>
            `;
            
            detailLinks.appendChild(linkElement);
        });
        // Add save button
        let saveButton = document.getElementById('save-button');
        if (saveButton == null) {
            saveButton = document.createElement('button');
            saveButton.id = 'save-button';
            saveButton.className = 'save-button';
            saveButton.innerHTML = 'Save';
            detailsPanel.appendChild(saveButton);
        }
       
        // rebind onclick event to save button
        saveButton.onclick = (e) => {
            e.stopPropagation(); // Prevent closing the details panel
            // TODO: Implement save functionality
            console.log(`Saving details for ${item.name}`);

            // save the item to the database
            saveItemToDatabase(item, user);

        }
        
        
        // Create and show overlay
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        overlay.id = 'details-overlay';
        document.body.appendChild(overlay);
        
        // Show the overlay and details panel
        overlay.style.display = 'block';
        detailsPanel.style.display = 'block';
        
        // Handle click on overlay to close details
        overlay.addEventListener('click', closeDetailsPanel);
    }
    
    // Close the details panel
    function closeDetailsPanel() {
        detailsPanel.style.display = 'none';
        const overlay = document.getElementById('details-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    await loadModel();
    startButton.addEventListener('click', startCamera);
    stopButton.addEventListener('click', stopCamera);
    closeDetails.addEventListener('click', closeDetailsPanel);
    
    // Load voices when available
    function loadVoices() {
        return new Promise((resolve) => {
            let voices = speechSynthesis.getVoices();
            if (voices.length) {
                resolve(voices);
            } else {
                speechSynthesis.onvoiceschanged = () => {
                    voices = speechSynthesis.getVoices();
                    resolve(voices);
                };
            }
        });
    }
    
    // Initialize voices
    loadVoices().then(voices => {
        console.log(`Loaded ${voices.length} voices for speech synthesis`);
    });
    
    // Add speech toggle functionality
    let speechEnabled = true;
    toggleSpeechBtn.addEventListener('click', () => {
        speechEnabled = !speechEnabled;
        if (speechEnabled) {
            toggleSpeechBtn.innerHTML = '<i class="fas fa-volume-up"></i> Speech On';
            toggleSpeechBtn.classList.remove('off');
        } else {
            toggleSpeechBtn.innerHTML = '<i class="fas fa-volume-mute"></i> Speech Off';
            toggleSpeechBtn.classList.add('off');
            speechSynthesis.cancel(); // Cancel any ongoing speech
        }
    });
    
    // Add language change listener
    languageSelector.addEventListener('change', () => {
        // Announce language change if speech is enabled
        if (speechEnabled) {
            speechSynthesis.cancel(); // Cancel any ongoing speech
            const utterance = new SpeechSynthesisUtterance(`Voice language changed to ${languageSelector.options[languageSelector.selectedIndex].text}`);
            utterance.lang = languageSelector.value;
            speechSynthesis.speak(utterance);
        }
    });
});
