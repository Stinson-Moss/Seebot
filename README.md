# SEEBOT: Object Identifier for the Visually Impaired

What is SEEBOT?
SEEBOT is an AI-powered object detection web application designed to assist individuals who are visually impaired. Using YOLOv5 model, SEEBOT identifies common objects in real-time through the webcam and displays their names on the screen, offering users auditory or visual assistance in navigating their environment safely and independently.

📂 Project Structure
index.html – Main webpage that loads the AI model and webcam.

style.css – Stylesheet for responsive and accessible UI.

script.js – JavaScript logic to initialize camera, load the ML model, and handle predictions.

README.md – Project overview and usage instructions.

🔍 How It Works
Loads the COCO-SSD model via TensorFlow.js.

Activates the webcam and continuously analyzes video frames.

Detects up to 80 common object types and displays them with labels.

Future improvements may include audio output for detected objects.

🛠️ Technologies Used
HTML/CSS/JavaScript

TensorFlow.js

COCO-SSD pre-trained model

Font Awesome for accessible icons

Google Fonts (Roboto) for modern readability

👥 Authors
Project Group 9, CS321 - Spring 2025, George Mason University
Nasrin Ali
Stinson Moss 
Aansa Virk
Kamillah Ismail

📜 License
This project is for academic use. For external or commercial use, please contact the project owners.
