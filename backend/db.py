import sqlite3
import os
from werkzeug.security import generate_password_hash

DB_NAME = "ecosmart.db"

def get_db():
    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()

    # Create users table
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL
        )
    ''')

    # Create pickup requests table
    c.execute('''
        CREATE TABLE IF NOT EXISTS pickup_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pending',
            waste_type TEXT NOT NULL DEFAULT 'mixed',
            fill_level INTEGER NOT NULL DEFAULT 100,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    # Inject default admin if not exists
    c.execute("SELECT id FROM users WHERE email = 'admin@gmail.com'")
    admin = c.fetchone()
    if not admin:
        hashed_pw = generate_password_hash("admin@123")
        c.execute("INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
                  ("admin@gmail.com", hashed_pw, "admin"))

    conn.commit()
    conn.close()
