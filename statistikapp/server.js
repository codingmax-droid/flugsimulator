const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const FLUGSIM_URL = process.env.FLUGSIM_URL || 'http://localhost:3000';

app.use(express.static(path.join(__dirname)));

// Proxy stats API to the Flugsim server
app.get('/api/stats', async (req, res) => {
  try {
    const response = await fetch(`${FLUGSIM_URL}/api/stats`);
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: 'Flugsim-Server nicht erreichbar', url: FLUGSIM_URL });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'stats.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Statistik-App läuft auf http://localhost:${PORT}`);
  console.log(`Verbunden mit Flugsim-Server: ${FLUGSIM_URL}`);
});
