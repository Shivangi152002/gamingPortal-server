# Game Admin Server

A secure backend server for managing game uploads, assets, and game-data.json with authentication.

## Features

✅ **Authentication System** - JWT-based login/logout  
✅ **File Upload** - Support for GIFs, logos, thumbnails, HTML, and ZIP files  
✅ **Game Data Management** - CRUD operations on game-data.json  
✅ **Auto-Update JSON** - Automatically updates game-data.json on every upload/edit  
✅ **Secure** - Protected endpoints with JWT authentication  

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment Variables

Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` and update:
- `JWT_SECRET` - Change to a secure random string
- `ADMIN_USERNAME` - Your admin username
- `ADMIN_PASSWORD` - Your admin password
- `UPLOAD_DIR` - Path to gamingPortal/public folder
- `GAME_DATA_PATH` - Path to game-data.json

**Example `.env`:**
```
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
UPLOAD_DIR=../../gamingPortal/public
GAME_DATA_PATH=../../gamingPortal/public/game-data.json
```

### 3. Start the Server

```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

Server will run on: `http://localhost:3000`

## API Endpoints

### Authentication

- **POST** `/api/auth/login` - Login with username/password
- **GET** `/api/auth/verify` - Verify JWT token

### Games Management

- **GET** `/api/games` - Get all games (public)
- **GET** `/api/games/:gameId` - Get single game (public)
- **POST** `/api/games` - Create new game (protected)
- **PUT** `/api/games/:gameId` - Update game (protected)
- **DELETE** `/api/games/:gameId` - Delete game (protected)
- **PUT** `/api/games/data/full-update` - Update entire game-data.json (protected)

### File Upload

- **POST** `/api/upload/files` - Upload multiple files (protected)
- **POST** `/api/upload/file` - Upload single file (protected)
- **DELETE** `/api/upload/file` - Delete file (protected)

## File Structure

```
server/
├── server.js              # Main server file
├── package.json           # Dependencies
├── .env                   # Environment variables (create this)
├── middleware/
│   ├── auth.js           # JWT authentication middleware
│   └── errorHandler.js   # Error handling middleware
└── routes/
    ├── auth.js           # Authentication routes
    ├── games.js          # Game CRUD routes
    └── upload.js         # File upload routes
```

## Upload File Types

| Field Name | File Type | Destination Folder |
|------------|-----------|-------------------|
| `gif` | GIF images | `/public/gif/` |
| `logo` | Images (PNG/JPG) | `/public/thumbnail/` |
| `thumbnail` | Images | `/public/thumbnail/` |
| `gameHtml` | HTML files | `/public/games/` |
| `gameZip` | ZIP files | `/public/games/` |

## Security Notes

⚠️ **Important:**
1. Change `JWT_SECRET` to a secure random string in production
2. Change default admin credentials
3. Use HTTPS in production
4. Never commit `.env` file to version control
5. Add rate limiting for production use

## Testing the API

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Upload Files (with token)
```bash
curl -X POST http://localhost:3000/api/upload/files \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "gif=@game.gif" \
  -F "logo=@logo.png" \
  -F "thumbnail=@thumbnail.jpg"
```

### Get All Games
```bash
curl http://localhost:3000/api/games
```

## Troubleshooting

### Port already in use
Change the `PORT` in `.env` file to a different port (e.g., 3001)

### File upload fails
- Check `UPLOAD_DIR` path is correct and writable
- Ensure directories exist: `public/gif/`, `public/thumbnail/`, `public/games/`

### Authentication fails
- Verify `JWT_SECRET` is set in `.env`
- Check username/password match `.env` settings

## License

MIT
