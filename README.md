# Finlit App

Python remake of the meeting logging and realtime team chat app for a mutual funds distribution team.

## Stack
- Frontend: React + Vite + Firebase Web Auth
- Backend: FastAPI + Python Socket.IO
- Database: MongoDB
- Media storage: Cloudinary
- Authentication: Firebase Admin token verification

## Current features
- Username-style login for staff through Firebase email/password
- Owner vs staff permissions
- Meeting log create, list, update, delete
- Realtime group chat
- Direct Cloudinary upload for chat attachments

## Project layout
- `client/src`: React app
- `client/index.html`: Vite entry HTML
- `client/.env.example`: frontend environment template
- `server/app`: Python backend
- `server/main.py`: ASGI entrypoint
- `server/.env.example`: backend environment template

## 1. Firebase setup
1. Open Firebase Console and create a project.
2. Enable `Authentication -> Sign-in method -> Email/Password`.
3. Create users manually:
   - Owner: `dsingh@finlit.local`
   - Staff: fake internal emails such as `rahul@finlit.local`, `amit@finlit.local`
4. Login style:
   - Owner enters `dsingh` in the app and it becomes `dsingh@finlit.local`
   - Staff enter usernames like `rahul` and they become `rahul@finlit.local`
5. In `Project settings -> General -> Your apps -> Web app`, copy the Firebase web config.
6. Put those values into a new `client/.env` using [client/.env.example](<C:\Users\Dell\Desktop\Aditya PS\React_Angular_Next\Finlit App\client\.env.example>).
7. In `Project settings -> Service accounts`, generate a new private key JSON.
8. Use that JSON to fill these backend env values:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`

## 2. MongoDB setup
Choose one:

1. Local MongoDB
   - Install MongoDB Community Server
   - Keep default port `27017`
   - Use `MONGODB_URI=mongodb://127.0.0.1:27017/`
   - Use `MONGODB_DB_NAME=finlit_app`

2. MongoDB Atlas
   - Create a free cluster
   - Create a database user
   - Add your IP in `Network Access`
   - Copy the Node/Python driver URI and place it in `MONGODB_URI`
   - Keep the database name separate in `MONGODB_DB_NAME=finlit_app`

Important:
- If your MongoDB password contains special characters like `@`, `#`, `%`, `/`, `?`, encode them in the URI.
- Atlas DNS issues can happen on some networks. Local MongoDB is the fastest fallback for development.

## 3. Cloudinary setup
1. Create a free Cloudinary account.
2. From the dashboard, copy:
   - `Cloud name`
   - `API Key`
   - `API Secret`
3. Put them into backend env:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
4. Optional: change `CLOUDINARY_UPLOAD_FOLDER` from `finlit/chat` to your preferred folder path.

## 4. Backend env
Use [server/.env.example](<C:\Users\Dell\Desktop\Aditya PS\React_Angular_Next\Finlit App\server\.env.example>) as the reference. A valid backend `.env` looks like this:

```env
APP_ENV=development
PORT=8000
CLIENT_ORIGIN=http://127.0.0.1:5173

MONGODB_URI=mongodb://127.0.0.1:27017/
MONGODB_DB_NAME=finlit_app

OWNER_EMAIL=dsingh@finlit.local

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
CLOUDINARY_UPLOAD_FOLDER=finlit/chat
```

## 5. Run the backend
1. Open terminal in `server`
2. Create a virtual environment:
   - `py -3 -m venv .venv`
3. Activate it:
   - PowerShell: `.venv\Scripts\Activate.ps1`
4. Install dependencies:
   - `pip install -r requirements.txt`
5. Start the API:
   - `uvicorn main:app --reload --port 8000`
6. Health check:
   - Open `http://127.0.0.1:8000/health`

## 6. Run the frontend
1. Open terminal in `client`
2. Install dependencies:
   - `npm install`
3. Create `client/.env` from `client/.env.example`
4. Start the frontend:
   - `npm run dev`
5. Open `http://127.0.0.1:5173`
6. Make sure backend `CLIENT_ORIGIN` is also `http://127.0.0.1:5173`
7. Login as owner or staff.

## 7. API and socket contract
- `GET /health`
- `GET /api/auth/me`
- `GET /api/auth/client-config`
- `POST /api/logs`
- `GET /api/logs`
- `PUT /api/logs/{id}`
- `DELETE /api/logs/{id}`
- `GET /api/chat/history?limit=50`
- `POST /api/uploads/sign`

Socket.IO:
- Client to server: `chat:send`
- Server to client: `chat:new`

`chat:send` payload example:

```json
{
  "text": "Client asked about SIP step-up options",
  "attachmentUrl": "https://res.cloudinary.com/...",
  "attachmentType": "raw",
  "attachmentName": "meeting-notes.pdf"
}
```

## Security notes
- Rotate any Firebase private key or database password that has ever been pasted into chat.
- Keep Cloudinary `API Secret` only in the backend `.env`, never in frontend code.
- Staff permissions are enforced on the backend, not only in the UI.
