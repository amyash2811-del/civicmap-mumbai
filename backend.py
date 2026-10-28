"""Small FastAPI + SQLite backend for the CivicMap Mumbai academic prototype."""
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
import sqlite3
import time
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "civicmap.db"
STARTED_AT = time.time()


def connect_db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    with connect_db() as db:
        db.execute("""CREATE TABLE IF NOT EXISTS complaints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            complaint_id TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            location TEXT NOT NULL,
            latitude REAL,
            longitude REAL,
            authority TEXT NOT NULL DEFAULT 'BMC',
            status TEXT NOT NULL DEFAULT 'Reported',
            created_at TEXT NOT NULL
        )""")
        db.execute("""CREATE TABLE IF NOT EXISTS community_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            location TEXT NOT NULL DEFAULT 'Mumbai',
            category TEXT NOT NULL DEFAULT 'General',
            created_at TEXT NOT NULL
        )""")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="CivicMap Mumbai API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ComplaintIn(BaseModel):
    complaint_id: str = Field(min_length=3, max_length=60)
    title: str = Field(min_length=3, max_length=180)
    description: str = Field(min_length=3, max_length=3000)
    category: str = Field(default="Other", max_length=80)
    location: str = Field(min_length=2, max_length=300)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    authority: str = Field(default="BMC", max_length=120)


class StatusUpdate(BaseModel):
    status: str = Field(min_length=2, max_length=60)


class CommunityPostIn(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    message: str = Field(min_length=3, max_length=2000)
    location: str = Field(default="Mumbai", max_length=300)
    category: str = Field(default="General", max_length=80)


@app.get("/api/health")
def health():
    return {"status": "online", "service": "CivicMap Mumbai API", "uptime_seconds": int(time.time() - STARTED_AT)}


@app.get("/api/stats")
def stats():
    with connect_db() as db:
        total = db.execute("SELECT COUNT(*) FROM complaints").fetchone()[0]
        open_count = db.execute("SELECT COUNT(*) FROM complaints WHERE status NOT IN ('Resolved', 'Work Completed')").fetchone()[0]
        resolved = db.execute("SELECT COUNT(*) FROM complaints WHERE status IN ('Resolved', 'Work Completed')").fetchone()[0]
        posts = db.execute("SELECT COUNT(*) FROM community_posts").fetchone()[0]
    return {"total_complaints": total, "open_complaints": open_count, "resolved_complaints": resolved, "community_posts": posts}


@app.get("/api/complaints")
def list_complaints():
    with connect_db() as db:
        rows = db.execute("SELECT * FROM complaints ORDER BY id DESC LIMIT 200").fetchall()
    return [dict(row) for row in rows]


@app.post("/api/complaints", status_code=201)
def create_complaint(item: ComplaintIn):
    created_at = datetime.now(timezone.utc).isoformat()
    try:
        with connect_db() as db:
            db.execute("""INSERT INTO complaints
                (complaint_id, title, description, category, location, latitude, longitude, authority, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Reported', ?)""",
                (item.complaint_id, item.title, item.description, item.category, item.location,
                 item.latitude, item.longitude, item.authority, created_at))
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="This complaint ID already exists.")
    return {"message": "Complaint saved to the backend database.", "complaint_id": item.complaint_id, "status": "Reported", "created_at": created_at}


@app.patch("/api/complaints/{complaint_id}/status")
def update_complaint_status(complaint_id: str, item: StatusUpdate):
    with connect_db() as db:
        cur = db.execute("UPDATE complaints SET status = ? WHERE complaint_id = ?", (item.status, complaint_id))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Complaint not found in the backend database.")
    return {"complaint_id": complaint_id, "status": item.status}


@app.get("/api/community")
def list_community_posts():
    with connect_db() as db:
        rows = db.execute("SELECT * FROM community_posts ORDER BY id DESC LIMIT 100").fetchall()
    return [dict(row) for row in rows]


@app.post("/api/community", status_code=201)
def create_community_post(item: CommunityPostIn):
    created_at = datetime.now(timezone.utc).isoformat()
    with connect_db() as db:
        cur = db.execute("INSERT INTO community_posts (title, message, location, category, created_at) VALUES (?, ?, ?, ?, ?)",
                          (item.title, item.message, item.location, item.category, created_at))
        post_id = cur.lastrowid
    return {"id": post_id, "title": item.title, "message": item.message, "location": item.location,
            "category": item.category, "created_at": created_at}


# Serve the existing frontend from the same origin, so API calls work without CORS setup.
app.mount("/", StaticFiles(directory=str(BASE_DIR), html=True), name="frontend")
