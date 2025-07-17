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

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
