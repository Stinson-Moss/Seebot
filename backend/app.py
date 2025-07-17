"""
app.py

Flask backend for SeeBot: provides API endpoints for object detection (using YOLOv5),
saving detection results, and retrieving user detection history. Handles CORS and
integrates with a MySQL database for persistent storage.
"""

from flask import Flask, request, jsonify
from yolov5 import YOLOv5
from PIL import Image
from db import save_detection_db
from db import get_history_db
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

model = YOLOv5('yolov5s.pt', device='cpu', load_on_init=True)

@app.route('/api/detect', methods=['POST'])
async def detect():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
            
    image_file = request.files['image']
    image = Image.open(image_file)

    results = model.predict(image)

    detections = results.pandas().xyxy[0].to_dict(orient="records")
    
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

    response = {
        "detections": filtered_detections
    }

    return jsonify(response), 200

@app.route('/api/history', methods=['GET'])
async def history():
    try:
        user = request.args.get('user')
        
        if not user:
            return jsonify({"error": "No user provided in query parameters"}), 400

        user_history = await get_history_db(user)

        return jsonify(user_history), 200
    except Exception as e:
        return jsonify({"error": f"Failed to get history: {str(e)}"}), 500

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
    port = int(os.environ.get("SERVER_PORT", 5000))
    app.run(port=port, debug=False)
