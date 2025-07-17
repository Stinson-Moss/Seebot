# Seebot - AI-Powered Object Detection System

Seebot is a full-stack web application that leverages computer vision and machine learning to perform real-time object detection. The system uses YOLOv5, an object detection model, to identify objects in images and provides relevant information about detected objects.

## 🚀 Key Features

- [x] **Real-time Object Detection**: Utilizes YOLOv5 for accurate and fast object detection
- [x] **User History Tracking**: Maintains a history of detections for each user
- [ ] **Secure Database Integration**: MySQL database with SSL encryption for secure data storage (database created; SSL encryption in-progress)
- [x] **RESTful API Architecture**: Clean and well-documented API endpoints
- [ ] **Cross-Origin Resource Sharing (CORS)**: Secure cross-origin requests handling (in-progress)
- [ ] **Cloud Deployment**: Ready for deployment on cloud platforms (Render; in-progress)

## 🛠️ Technical Stack

### Backend
- **Python**: Core programming language
- **Flask**: Web framework for building the REST API
- **YOLOv5**: Object detection model
- **MySQL**: Database for storing detection history
- **SSL/TLS**: Secure database connections
- **Environment Variables**: Secure configuration management

### API Endpoints
- `/api/detect`: POST endpoint for object detection
- `/api/history`: GET endpoint for retrieving user detection history
- `/api/save_detection`: POST endpoint for saving detection results

## 🔒 Security Features

- [ ] SSL/TLS encryption for database connections
- [x] Environment variable management for sensitive data
- [ ] Input validation and error handling
- [ ] Secure CORS configuration

## 🚀 Deployment

The application is configured for deployment on Render, with proper port configuration and environment variable handling. The system is designed to be scalable and maintainable in a production environment.

## 💡 Technical Highlights

- Asynchronous API endpoints for better performance
- Comprehensive error handling and logging
- Efficient database operations with connection pooling
- Support for both file uploads and URL-based image processing
- Confidence threshold filtering for accurate detections

## 🔧 Setup and Configuration

1. Clone the repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set up environment variables:
   - DB_HOST
   - DB_PORT
   - DB_USER
   - DB_PASSWORD
   - DB_NAME
4. Run the application:
   ```bash
   python backend/app.py
   ```
   ```bash
   cd frontend
   npm run dev
   ```

## 📝 License

MIT License

Copyright (c) 2025 SeeBot Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
