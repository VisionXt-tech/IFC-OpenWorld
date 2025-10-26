// POC-3: Simple Express upload server
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Enable CORS
app.use(cors());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `${timestamp}_${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  console.log(`✅ File uploaded: ${req.file.filename} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);

  res.json({
    success: true,
    filename: req.file.filename,
    size: req.file.size,
    path: req.file.path
  });
});

// Redirect root to client.html
app.get('/', (req, res) => {
  res.redirect('/client.html');
});

// Serve static HTML
app.use(express.static('.'));

app.listen(PORT, () => {
  console.log(`🚀 POC-3 Server running at http://localhost:${PORT}`);
  console.log(`📂 Open client.html in browser to test upload`);
});
