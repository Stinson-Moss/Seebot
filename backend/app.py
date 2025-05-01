from flask import Flask, request, jsonify
from torch import hub
from PIL import Image
from db import save_detection_db
from db import get_history_db
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Load YOLOv5 model
model = hub.load('ultralytics/yolov5', 'yolov5s', trust_repo=True)

@app.route('/api/detect', methods=['POST'])
async def detect():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    # Handle JSON data with image URL
    if request.is_json:
        data = request.get_json()
        if 'image' in data:
            try:
                import requests
                from io import BytesIO
                
                # Download the image from the URL
                response = requests.get(data['image_url'])
                image = Image.open(BytesIO(response.content))
                
                # Perform object detection
                results = model(image)
                
                # Process detections
                detections = results.pandas().xyxy[0].to_dict(orient="records")
                
                # Filter detections
                filtered_detections = [
                    {
                        "xmin": detection["xmin"],
                        "xmax": detection["xmax"],
                        "ymin": detection["ymin"],
                        "ymax": detection["ymax"],
                        "name": detection["name"],
                        "confidence": detection["confidence"],
                    }
                    for detection in detections
                    if detection["confidence"] > 0
                ]
                
                # Format response
                response = {
                    "detections": filtered_detections
                }
                
                return jsonify(response), 200
            except Exception as e:
                return jsonify({"error": f"Error processing image URL: {str(e)}"}), 500
            
    # If we reach here, we're expecting a file upload
    image_file = request.files['image']
    image = Image.open(image_file)

    print ('Opened image')
    # Perform object detection
    results = model(image)

    # Process detections
    detections = results.pandas().xyxy[0].to_dict(orient="records")

    #Filtered detections
    filtered_detections = [
        {
            "xmin": detection["xmin"],
            "xmax": detection["xmax"],
            "ymin": detection["ymin"],
            "ymax": detection["ymax"],
            "name": detection["name"],
            "confidence": detection["confidence"],
        }

        for detection in detections
        if detection["confidence"] > 0.5
    ]

    # Format response
    response = {
        "detections": filtered_detections
    }

    print ('Response: ', response)

    return jsonify(response), 200

@app.route('/api/history', methods=['GET'])
async def history():
    user_history = await get_history_db()
    return jsonify(user_history), 200

@app.route('/api/save_detection', methods=['POST'])
async def save_detection():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        if data["user"] == "":
            return jsonify({"error": "No user provided"}), 400
        
        if data["detection"]["name"] == "":
            return jsonify({"error": "No detection name provided"}), 400
        
        if data["detection"]["links"] == "":
            return jsonify({"error": "No links provided"}), 400
        

        await save_detection_db(data["user"], data["detection"])
        return jsonify({"message": "Detection saved successfully"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to save detection: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, use_reloader=False)
