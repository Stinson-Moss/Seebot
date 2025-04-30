import mysql.connector as mysql
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def connect():
    return mysql.connect(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT")),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        ssl_ca="ca.pem"
    )

async def get_history(user: str):
    conn = connect()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM detections WHERE email = %s ORDER BY created_at DESC", (user,))

    fetched_history = cursor.fetchall()
    conn.close()
    return fetched_history

async def save_detection(user: str, detection: dict):
    conn = connect()
    cursor = conn.cursor()

    cursor.execute("INSERT INTO detections (email, object_detected, links) VALUES (%s, %s, %s)", (user, detection["name"], detection["links"]))
    
    conn.commit()
    conn.close()
    

async def add_detections(user: str, detections: list):
    conn = connect()
    cursor = conn.cursor()
    
    for detection in detections:
        cursor.execute("INSERT INTO detections (email, object_detected, links) VALUES (%s, %s, %s)", (user, detection["name"], detection["links"]))
    
    conn.commit()
    conn.close()

