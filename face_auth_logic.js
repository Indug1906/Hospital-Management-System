
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
let activeStream = null;
let activeInterval = null;

async function loadModels() {
    try {
        await faceapi.loadSsdMobilenetv1Model(MODEL_URL);
        await faceapi.loadFaceLandmarkModel(MODEL_URL);
        await faceapi.loadFaceRecognitionModel(MODEL_URL);
    } catch (error) {
        console.error("Error loading models:", error);
        alert("Error loading face detection models. Please check your internet connection.");
        throw error;
    }
}

async function startCamera(videoElementId) {
    const video = document.getElementById(videoElementId);
    if (!video) {
        alert("Video element not found!");
        return;
    }
    // alert("Requesting camera access... Please allow permissions.");
    try {
        if (activeStream) {
            activeStream.getTracks().forEach(track => track.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        activeStream = stream;
        video.srcObject = stream;
    } catch (err) {
        console.error("Error starting camera:", err);
        alert("Could not start camera. Please ensure you have given permission.");
        throw err;
    }
}

function stopFaceAuth() {
    // alert("Stopping face auth..."); // Debugging
    if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
        activeStream = null;
    }
    if (activeInterval) {
        clearInterval(activeInterval);
        activeInterval = null;
    }
    
    const containers = ['register-video-container', 'login-video-container'];
    containers.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.style.display = 'none';
            const canvas = container.querySelector('canvas');
            if (canvas) canvas.remove();
        }
    });
}

async function startFaceRegistration() {
    stopFaceAuth(); // Ensure clean start
    try {
        const videoContainer = document.getElementById('register-video-container');
        if (!videoContainer) {
            alert("Video container not found!");
            return;
        }
        videoContainer.style.display = 'block';
        
        await loadModels();
        await startCamera('register-video');
        
        const video = document.getElementById('register-video');
        
        video.onloadedmetadata = () => {
             detectFaceLoop(video, videoContainer, 'register');
        };
    } catch (error) {
        console.error("Error in startFaceRegistration:", error);
        alert("An error occurred while starting face registration: " + error.message);
    }
}

async function startFaceLogin() {
    stopFaceAuth(); // Ensure clean start
    try {
        const videoContainer = document.getElementById('login-video-container');
        if (!videoContainer) {
            alert("Video container not found!");
            return;
        }
        videoContainer.style.display = 'block';
        
        await loadModels();
        await startCamera('login-video');

        const video = document.getElementById('login-video');
        
        video.onloadedmetadata = () => {
             detectFaceLoop(video, videoContainer, 'login');
        };
    } catch (error) {
        console.error("Error in startFaceLogin:", error);
        alert("An error occurred while starting face login: " + error.message);
    }
}

async function detectFaceLoop(video, container, mode) {
    const canvas = faceapi.createCanvasFromMedia(video);
    container.append(canvas);
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    let isProcessed = false;

    activeInterval = setInterval(async () => {
        if (isProcessed) return;

        try {
            const detections = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
            
            if (detections) {
                // Draw detection
                const resizedDetections = faceapi.resizeResults(detections, displaySize);
                faceapi.draw.drawDetections(canvas, resizedDetections);

                const descriptorArray = Array.from(detections.descriptor);

                if (mode === 'register') {
                    isProcessed = true;
                    stopFaceAuth(); // Cleanup immediately on success
                    
                    const descriptorField = document.getElementById('face_descriptor');
                    if (descriptorField) {
                        descriptorField.value = JSON.stringify(descriptorArray);
                        alert("Face captured successfully! You can now register.");
                    } else {
                        alert("Error: Face descriptor field not found.");
                    }

                } else if (mode === 'login') {
                    isProcessed = true;
                    stopFaceAuth(); // Cleanup immediately on success

                    const descriptor = JSON.stringify(descriptorArray);
                    
                    const formData = new FormData();
                    formData.append('face_descriptor', descriptor);

                    fetch('face_login.php', {
                        method: 'POST',
                        body: formData
                    })
                    .then(response => response.text())
                    .then(data => {
                        if (data.trim() === 'success') {
                            window.location.href = 'admin-panel.php';
                        } else {
                            alert("Face not recognized. Server response: " + data);
                        }
                    })
                    .catch(err => {
                        console.error("Error sending face data:", err);
                        alert("Error communicating with server.");
                    });
                }
            }
        } catch (error) {
            console.error("Error in detection loop:", error);
            if (activeInterval) clearInterval(activeInterval);
        }
    }, 500);
}
