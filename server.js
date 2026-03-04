const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function buildRow(data) {
  const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const join = (val) => Array.isArray(val) ? val.join(', ') : (val || '');

  return [
    timestamp,
    data.faixaEtaria       || '',
    data.territorio        || '',
    data.genero            || '',
    data.sexualidade       || '',
    data.raca              || '',       // NOVO
    data.pcd               || '',       // NOVO
    join(data.tiposDeficiencia),        // NOVO
    data.linkedin          || '',
    data.whatsapp          || '',
    data.nivelEducacional  || '',
    data.transicaoCarreira || '',
    join(data.areasAtuacao),
    data.outraArea         || '',
    join(data.areasTech),
    data.outraAreaTech     || '',
    data.nivelAtual        || '',
    data.voluntario        || '',
    join(data.areasVoluntariado),
    join(data.nivelVagas),
  ];
}

app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Virada no Cafe backend ativo ☕' });
});

app.post('/submit', async (req, res) => {
  try {
    const data = req.body;
    if (!data.lgpdConsent) return res.status(400).json({ error: 'Consentimento LGPD obrigatorio.' });
    if (!data.whatsapp)    return res.status(400).json({ error: 'WhatsApp e obrigatorio.' });

    const auth   = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId:    process.env.SPREADSHEET_ID,
      range:            'Respostas!A:T',
      valueInputOption: 'USER_ENTERED',
      requestBody:      { values: [buildRow(data)] },
    });

    console.log(`[${new Date().toISOString()}] Nova resposta de ${data.whatsapp}`);
    res.json({ success: true, message: 'Resposta registrada com sucesso!' });

  } catch (err) {
    console.error('Erro ao salvar:', err.message);
    res.status(500).json({ error: 'Erro interno ao salvar dados. Tente novamente.' });
  }
});

app.get('/respostas', async (req, res) => {
  if (req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Nao autorizado.' });
  }
  try {
    const auth   = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range:         'Respostas!A:T',
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

app.listen(PORT, () => {
  console.log(`☕  Virada no Cafe backend rodando na porta ${PORT}`);
});
