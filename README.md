# CivicMap Mumbai — Frontend + Demo Backend

This package keeps the existing CivicMap frontend and adds a small FastAPI + SQLite backend suitable for a student project demonstration.

## Features added
- Backend health endpoint: `GET /api/health`
- Database stats: `GET /api/stats`
- Save and list complaints: `POST /api/complaints`, `GET /api/complaints`
- Update a complaint status: `PATCH /api/complaints/{complaint_id}/status`
- Save and list community posts: `POST /api/community`, `GET /api/community`
- SQLite database is created automatically as `civicmap.db` after the server starts.
- A backend status card on the website shows whether the API is reachable and the number of records saved in the backend database.
- When a complaint is submitted in the existing frontend, the app attempts to save its details to the backend while keeping the existing browser-side demo behavior. Photos are not uploaded to the backend in this starter version.

## Run on Windows
1. Install Python 3.10 or newer.
2. Extract this ZIP to a folder.
3. Open the extracted folder in File Explorer.
4. Double-click `run.bat`, or open PowerShell in the folder and run:

   ```powershell
   py -m pip install -r requirements.txt
   py -m uvicorn backend:app --host 127.0.0.1 --port 8000
   ```
5. Open `http://127.0.0.1:8000`.
6. Backend status: `http://127.0.0.1:8000/api/health`
7. Interactive API documentation: `http://127.0.0.1:8000/docs`

Keep the terminal open while using the website. Press Ctrl+C to stop the server.

## Example API requests

Health:
```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
```

Stats:
```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/stats
```

Create a sample complaint:
```powershell
$body = @{
  complaint_id = 'MUM-DEMO-001'
  title = 'Pothole near local road'
  description = 'A pothole needs inspection.'
  category = 'Pothole'
  location = 'Andheri, Mumbai'
  latitude = 19.1197
  longitude = 72.8468
  authority = 'BMC'
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/complaints -ContentType 'application/json' -Body $body
```

## Notes
- This is an academic prototype, not a production public-service system.
- The current frontend still uses localStorage for its original citizen/officer demo screens. The new API provides real persistent backend endpoints and saves new complaint metadata to SQLite as well.
- Do not put passwords, private tokens, or API keys in frontend JavaScript.
