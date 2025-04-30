from flask import Flask, request, jsonify
import torch
from PIL import Image
import os
from db import add_detections
from db import get_history
from scraper import get_google_search_links

app = Flask(__name__)

# Load YOLOv5 model
model = torch.hub.load('ultralytics/yolov5', 'yolov5s', trust_repo=True)

@app.route('/api/detect', methods=['POST'])
async def detect():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    
    image_file = request.files['image']
    image = Image.open(image_file)

    # Perform object detection
    results = model(image)

    # Process detections
    detections = results.pandas().xyxy[0].to_dict(orient="records")

    # Get user id from request 
    email = request.args.get('email')

    #Filtered detections
    filtered_detections = [
        {
            "xmin": detection["xmin"],
            "ymin": detection["ymin"],
            "name": detection["name"],
            "confidence": detection["confidence"],
            "links": get_google_search_links(detection["name"])
        }

        for detection in detections
        if detection["confidence"] > 0.5
    ]

    # Format response
    response = {
        "detections": filtered_detections
    }

    return jsonify(response), 200

@app.route('api/history', methods=['GET'])
async def history():
    user_history = await get_history()
    return jsonify(user_history), 200

if __name__ == '__main__':
    app.run(debug=True)
