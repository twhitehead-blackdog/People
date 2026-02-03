#!/usr/bin/env node
/**
 * Sirve el frontend (dist/people) en el puerto 8080.
 * Para uso sin Docker: nginx hace proxy a 127.0.0.1:8080.
 * Ejecutar después de: npm run build
 */

const express = require('express');
const path = require('path');

const PORT = Number(process.env.PORT) || 8080;
const DIST = path.join(__dirname, '..', 'dist', 'people');

const app = express();

app.get('/health', (req, res) => {
  res.status(200).set('Content-Type', 'text/plain').send('ok');
});

app.use(express.static(DIST, { index: false }));

app.get('*', (req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend sirviendo en http://0.0.0.0:${PORT} (dist/people)`);
  console.log('  /health → 200');
});
