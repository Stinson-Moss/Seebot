import mysql.connector as mysql
import os
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.DEBUG)

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

async def get_history_db(user: str):
    conn = connect()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM detections WHERE email = %s ORDER BY created_at DESC", (user,))

    fetched_history = cursor.fetchall()
    conn.close()
    return fetched_history


async def save_detection_db(user, detection):
    try:
        logging.debug('Saving detection for user')
        conn = connect()
        logging.debug('Connected to database')
        cursor = conn.cursor()
        logging.debug('Cursor created')

        links = ','.join([
            detection["links"][0]["url"],
            detection["links"][1]["url"],
            detection["links"][2]["url"],
            detection["links"][3]["url"],
            detection["links"][4]["url"]
        ])

        logging.debug(f'Links: {links}')

        cursor.execute(
            "INSERT INTO detections (email, object_detected, links) VALUES (%s, %s, %s)",
            (user, detection["name"], links)
        )
        logging.debug('Executed query')

        conn.commit()
        logging.debug('Committed')
        conn.close()
        logging.debug('Closed connection')

    except Exception as e:
        logging.exception("Error occurred while saving detection")
        raise  # re-raise so Flask knows it's a 500

