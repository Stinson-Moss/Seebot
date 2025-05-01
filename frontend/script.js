// API endpoint for YOLOv5 detection
const API_URL = 'http://127.0.0.1:5000/api/detect';

// API endpoint for saving detections
const SAVE_DETECTION_URL = 'http://127.0.0.1:5000/api/save_detection';

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
    
    // Login elements
    const loginWidget = document.getElementById('login-widget');
    const userEmailInput = document.getElementById('user-email');
    const confirmLoginBtn = document.getElementById('confirm-login');
    const closeLoginBtn = document.getElementById('close-login');

    let stream = null;
    let detecting = false;
    let speechSynthesis = window.speechSynthesis;
    let lastSpokenObjects = [];
    
    // Array to store detection history
    let detectionHistory = [];
    let user = null;

    // Get stored user from localStorage if available
    const storedUser = localStorage.getItem('seebot_user');
    if (storedUser) {
        user = storedUser;
    }

    // Setup login widget listeners
    confirmLoginBtn.addEventListener('click', () => {
        const email = userEmailInput.value.trim();
        if (email) {
            user = email;
            localStorage.setItem('seebot_user', user);
            hideLoginWidget();
        }
    });

    closeLoginBtn.addEventListener('click', hideLoginWidget);

    function showLoginWidget(item) {
        const loginOverlay = document.createElement('div');
        loginOverlay.className = 'overlay';
        loginOverlay.id = 'login-overlay';
        document.body.appendChild(loginOverlay);
        
        loginOverlay.style.display = 'block';
        loginWidget.style.display = 'block';
        
        // Pre-fill with stored user
        if (user) {
            userEmailInput.value = user;
        }
        
        userEmailInput.focus();
        
        // Handle overlay click
        loginOverlay.addEventListener('click', hideLoginWidget);
    }
    
    function hideLoginWidget() {
        loginWidget.style.display = 'none';
        const loginOverlay = document.getElementById('login-overlay');
        if (loginOverlay) {
            loginOverlay.remove();
        }
    }

    async function saveItemToDatabase(item, user) { 
        try {
            console.log(`Saving detection for ${user}: ${item.name}`);

            if (!user) {
                showLoginWidget();
            }

            let data = JSON.stringify({
                user: user,
                detection: {
                    name: item.name,
                    links: item.links
                }
            });
            
            // Here you would typically make an API call:
            const response = await axios.post(SAVE_DETECTION_URL, data, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            // Show success message
            const successMsg = document.createElement('div');
            successMsg.className = 'success-message';
            successMsg.innerHTML = '<i class="fas fa-check-circle"></i> Saved successfully!';
            document.body.appendChild(successMsg);
            
            // Remove after 3 seconds
            setTimeout(() => {
                successMsg.remove();
            }, 3000);
            
        } catch (error) {
            console.error("Error saving detection:", error);
            
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.innerHTML = '<i class="fas fa-exclamation-circle"></i> Failed to save';
            document.body.appendChild(errorMsg);
            
            setTimeout(() => {
                errorMsg.remove();
            }, 3000);
        }
    }

    async function startCamera() {
        try {
            console.log("Requesting camera access...");
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            videoElement.srcObject = stream;
            videoElement.onloadedmetadata = () => {
                canvas.width = videoElement.videoWidth;
                canvas.height = videoElement.videoHeight;
            };
            
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
        
        // Wait for the video to be properly loaded
        if (videoElement.readyState < 2) {
            await new Promise(resolve => {
                videoElement.onloadeddata = () => {
                    resolve();
                };
            });
        }
        
        // Create a hidden canvas to capture frames
        const captureCanvas = document.createElement('canvas');
        captureCanvas.width = videoElement.videoWidth;
        captureCanvas.height = videoElement.videoHeight;
        const captureCtx = captureCanvas.getContext('2d');

        while (detecting) {
            try {
                // Draw current video frame to the hidden canvas
                captureCtx.drawImage(videoElement, 0, 0, captureCanvas.width, captureCanvas.height);
                
                // Convert canvas to blob
                const blob = await new Promise(resolve => {
                    captureCanvas.toBlob(resolve, 'image/jpeg', 0.9);
                });
                
                // Create form data for API request
                const formData = new FormData();
                formData.append('image', blob, 'frame.jpg');
                
                // Send frame to YOLOv5 backend for detection
                const response = await axios.post(API_URL, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                
                // Process the response
                const data = response.data;
                const predictions = data.detections || [];
                
                // Draw the current frame on the visible canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                
                // Display predictions with icons
                if (predictions.length > 0) {
                    predictionText.innerHTML = `<i class="fas fa-check-circle"></i> Detected: ${predictions.map(p => `<strong>${p.name}</strong> (${Math.round(p.confidence * 100)}%)`).join(", ")}`;
                    
                    // Speak detected objects
                    speakDetectedObjects(predictions);
                    
                    // Add to detection history
                    addToHistory(predictions);
                    
                    // Draw bounding boxes
                    predictions.forEach(prediction => {
                        const xmin = prediction.xmin;
                        const ymin = prediction.ymin;
                        const width = prediction.xmax - prediction.xmin;
                        const height = prediction.ymax - prediction.ymin;
                        
                        // Draw rectangle
                        ctx.strokeStyle = '#e74c3c';
                        ctx.lineWidth = 4;
                        ctx.strokeRect(xmin, ymin, width, height);
                        
                        // Draw label background
                        ctx.fillStyle = 'rgba(231, 76, 60, 0.8)';
                        const textWidth = ctx.measureText(prediction.name).width;
                        ctx.fillRect(xmin, ymin - 30, textWidth + 20, 30);
                        
                        // Draw text
                        ctx.fillStyle = '#ffffff';
                        ctx.font = '18px Roboto';
                        ctx.fillText(prediction.name, xmin + 10, ymin - 10);
                    });
                } else {
                    predictionText.innerHTML = '<i class="fas fa-search"></i> No objects detected';
                }
            } catch (error) {
                console.error("Error during detection:", error);
                predictionText.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Detection error';
            }
            
            // Limit frame rate for performance
            await new Promise(resolve => setTimeout(resolve, 16));
        }
    }
    
    function speakDetectedObjects(predictions) {
        // Don't speak if speech is disabled
        if (!speechEnabled) {
            return;
        }
        
        // Get current object classes
        const currentObjects = predictions.map(p => p.name);
        
        // Filter for objects with confidence over 50%
        const highConfidenceObjects = predictions
            .filter(p => p.confidence > 0.5)
            .map(p => p.name);
            
        // Check if we have new objects to announce
        const newObjects = highConfidenceObjects.filter(obj => !lastSpokenObjects.includes(obj));
        
        if (newObjects.length > 0) {
            // Cancel any ongoing speech
            speechSynthesis.cancel();
            
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
            
            lastSpokenObjects = highConfidenceObjects;
        }
    }
    
    // Add detected objects to history
    async function addToHistory(predictions) {
        if (!predictions || predictions.length === 0) return;
        
        const timestamp = new Date();
        
        predictions.forEach(prediction => {
            const links = getObjectLinks(prediction.name);
            
            // Does it exist?
            const existingIndex = detectionHistory.findIndex(item => item.name === prediction.name);
            if (existingIndex !== -1) {
                detectionHistory.splice(existingIndex, 1);
            }
            
            detectionHistory.unshift({
                name: prediction.name,
                confidence: prediction.confidence,
                timestamp: timestamp,
                links: links,

                icon: getObjectIcon(prediction.name)
            });
        });
        
        if (detectionHistory.length > 50) {
            detectionHistory = detectionHistory.slice(0, 50);
        }
        
        updateHistoryDisplay();
    }
    
    function getObjectIcon(objectName) {
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
       
        saveButton.onclick = (e) => {
            e.stopPropagation(); // Prevent closing the details panel
            console.log(`Saving details for ${item.name}`);

            // save the item to the database
            saveItemToDatabase(item, user);

        }
        
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        overlay.id = 'details-overlay';
        document.body.appendChild(overlay);
        
        overlay.style.display = 'block';
        detailsPanel.style.display = 'block';
        
        overlay.addEventListener('click', closeDetailsPanel);
    }

    function closeDetailsPanel() {
        detailsPanel.style.display = 'none';
        const overlay = document.getElementById('details-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    startButton.addEventListener('click', startCamera);
    stopButton.addEventListener('click', stopCamera);
    closeDetails.addEventListener('click', closeDetailsPanel);
    
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
