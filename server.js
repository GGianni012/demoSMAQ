require('dotenv').config();
const express = require('express');
const path = require('path');
const apiRouter = require('./api/index.js');

const app = express();
const PORT = process.env.PORT || 3001;

// Servir archivos estáticos desde public
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use(apiRouter);

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 Issuer ID: ${process.env.GOOGLE_ISSUER_ID}`);
});
