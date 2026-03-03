const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Google Sheets Auth ───────────────────────────────────────────────────────
function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

// ─── Flatten form data into a spreadsheet row ─────────────────────────────────
function buildRow(data) {
  const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  return [
    timestamp,
    data.faixaEtaria       || '',
    data.territorio        || '',
    data.genero            || '',
    data.sexualidade       || '',
    data.linkedin          || '',
    data.whatsapp          || '',
    data.nivelEducacional  || '',
    data.transicaoCarreira || '',
    Array.isArray(data.areasAtuacao)     ? data.areasAtuacao.join(', ')     : (data.areasAtuacao     || ''),
    data.outraArea         || '',
    Array.isArray(data.areasTech)        ? data.areasTech.join(', ')        : (data.areasTech        || ''),
    data.outraAreaTech     || '',
    data.nivelAtual        || '',
    data.voluntario        || '',
    Array.isArray(data.areasVoluntariado)? data.areasVoluntariado.join(', '): (data.areasVoluntariado|| ''),
    Array.isArray(data.nivelVagas)       ? data.nivelVagas.join(', ')       : (data.nivelVagas       || ''),
  ];
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Virada no Café — Backend ativo ☕' });
});

// POST /submit — receives form data and appends to Google Sheets
app.post('/submit', async (req, res) => {
  try {
    const data = req.body;

    if (!data.lgpdConsent) {
      return res.status(400).json({ error: 'Consentimento LGPD obrigatório.' });
    }
    if (!data.whatsapp) {
      return res.status(400).json({ error: 'WhatsApp é obrigatório.' });
    }

    const auth   = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId:   process.env.SPREADSHEET_ID,
      range:           'Respostas!A:Q',
      valueInputOption:'USER_ENTERED',
      requestBody:     { values: [buildRow(data)] },
    });

    console.log(`[${new Date().toISOString()}] ✅ Nova resposta de ${data.whatsapp}`);
    res.json({ success: true, message: 'Resposta registrada com sucesso!' });

  } catch (err) {
    console.error('Erro ao salvar resposta:', err.message);
    res.status(500).json({ error: 'Erro interno ao salvar dados. Tente novamente.' });
  }
});

// GET /respostas — returns all responses (admin only, requires token header)
app.get('/respostas', async (req, res) => {
  if (req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }
  try {
    const auth   = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range:         'Respostas!A:Q',
    });

    const [headers, ...rows] = result.data.values || [[]];
    const respostas = rows.map(row =>
      Object.fromEntries((headers || []).map((h, i) => [h, row[i] || '']))
    );
    res.json({ total: respostas.length, respostas });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erro ao buscar dados.' });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`☕  Virada no Café backend rodando na porta ${PORT}`);
});
