# ☕ Virada no Café — Backend

Backend para o formulário de mapeamento da comunidade.  
Recebe os dados do formulário HTML e salva automaticamente em uma planilha Google Sheets.

---

## Como funciona

```
Formulário HTML  →  POST /submit  →  Backend Node.js  →  Google Sheets
```

---

## Passo a passo completo para publicar

### 1. Criar a planilha no Google Sheets

1. Acesse sheets.google.com e crie uma planilha nova
2. Renomeie a aba para **Respostas** (clique duas vezes na aba "Página1")
3. Na linha 1, cole esses cabeçalhos exatamente assim (uma coluna cada):

```
Timestamp | Faixa Etária | Território | Gênero | Sexualidade | LinkedIn | WhatsApp | Nível Educacional | Transição de Carreira | Áreas de Atuação | Outra Área | Áreas Tech | Outra Área Tech | Nível Atual | Voluntário | Áreas Voluntariado | Nível Vagas
```

4. Copie o ID da planilha da URL:
   - URL: `https://docs.google.com/spreadsheets/d/`**`ABC123XYZ`**`/edit`
   - O ID é a parte em negrito: `ABC123XYZ`

---

### 2. Criar credenciais no Google Cloud

1. Acesse console.cloud.google.com
2. Crie um projeto novo (ex: "virada-no-cafe")
3. No menu lateral, vá em **APIs e Serviços > Biblioteca**
4. Busque e ative a **Google Sheets API**
5. Vá em **APIs e Serviços > Credenciais**
6. Clique em **Criar Credenciais > Conta de Serviço**
   - Nome: `virada-sheets`
   - Clique em Concluir
7. Clique na conta de serviço criada > aba **Chaves**
8. Clique em **Adicionar Chave > Criar nova chave > JSON**
9. O arquivo JSON será baixado automaticamente — guarde-o com segurança

10. Copie o `client_email` do JSON (algo como `virada-sheets@projeto.iam.gserviceaccount.com`)
11. Volte à sua planilha Google Sheets
12. Clique em **Compartilhar** e adicione esse e-mail com permissão de **Editor**

---

### 3. Configurar o projeto localmente

```bash
# Clone ou baixe os arquivos do backend
cd virada-backend

# Instale as dependências
npm install

# Crie o arquivo de variáveis de ambiente
cp env.example.txt .env
```

Edite o arquivo `.env`:

```
SPREADSHEET_ID=cole_aqui_o_id_da_planilha

GOOGLE_CREDENTIALS={"type":"service_account","project_id":"..."}
# Cole aqui o conteúdo COMPLETO do JSON baixado, em UMA ÚNICA LINHA

ADMIN_TOKEN=crie_uma_senha_forte_aqui
```

Para colocar o JSON em uma linha, no terminal:
```bash
cat sua-chave.json | tr -d '\n'
```

Teste localmente:
```bash
npm run dev
# Acesse http://localhost:3000 — deve retornar {"status":"ok"}
```

---

### 4. Fazer deploy gratuito no Render

1. Crie uma conta em render.com (gratuito)
2. Clique em **New > Web Service**
3. Conecte seu repositório GitHub com os arquivos do backend
   - (ou use "Deploy from existing code" e faça upload manual)
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment:** Node
5. Na aba **Environment**, adicione as variáveis:
   - `SPREADSHEET_ID` → seu ID
   - `GOOGLE_CREDENTIALS` → o JSON em uma linha
   - `ADMIN_TOKEN` → sua senha
6. Clique em **Deploy** — em 2 minutos seu backend estará no ar
7. Copie a URL gerada (ex: `https://virada-no-cafe.onrender.com`)

---

### 5. Conectar o formulário HTML ao backend

No arquivo `virada-no-cafe-form.html`, localize a função `handleSubmit` e substitua por:

```javascript
async function handleSubmit(e) {
  e.preventDefault();

  const BACKEND_URL = 'https://virada-no-cafe.onrender.com'; // sua URL do Render

  const payload = {
    lgpdConsent:        document.getElementById('lgpdConsent').checked,
    faixaEtaria:        document.querySelector('[name="faixaEtaria"]')?.value || '',
    territorio:         document.querySelector('[name="territorio"]')?.value || '',
    genero:             document.querySelector('[name="genero"]:checked')?.value || '',
    sexualidade:        document.querySelector('[name="sex"]:checked')?.value || '',
    linkedin:           document.querySelector('[name="linkedin"]')?.value || '',
    whatsapp:           document.querySelector('[name="whatsapp"]')?.value || '',
    nivelEducacional:   document.querySelector('[name="edu"]:checked')?.value || '',
    transicaoCarreira:  document.querySelector('[name="transicao"]:checked')?.value || '',
    areasAtuacao:       [...document.querySelectorAll('[name="area"]:checked')].map(el => el.value),
    areasTech:          [...document.querySelectorAll('[name="tech"]:checked')].map(el => el.value),
    nivelAtual:         document.querySelector('[name="nivel"]:checked')?.value || '',
    voluntario:         document.querySelector('[name="voluntario"]:checked')?.value || '',
    areasVoluntariado:  [...document.querySelectorAll('[name="vol"]:checked')].map(el => el.value),
    nivelVagas:         [...document.querySelectorAll('[name="vaga"]:checked')].map(el => el.value),
  };

  try {
    const btn = document.querySelector('.submit-btn');
    btn.textContent = 'Enviando...';
    btn.disabled = true;

    const res = await fetch(`${BACKEND_URL}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro desconhecido');

    document.getElementById('progressBar').style.width = '100%';
    document.getElementById('mainForm').style.display = 'none';
    document.getElementById('successScreen').classList.add('visible');
    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (err) {
    alert('Erro ao enviar: ' + err.message + '\nTente novamente.');
    const btn = document.querySelector('.submit-btn');
    btn.textContent = '☕ Enviar mapeamento';
    btn.disabled = false;
  }
}
```

---

## Rotas disponíveis

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Health check |
| POST | `/submit` | Recebe e salva uma resposta |
| GET | `/respostas` | Lista todas as respostas (requer header `x-admin-token`) |

### Exemplo de chamada admin:
```bash
curl -H "x-admin-token: sua_senha" https://virada-no-cafe.onrender.com/respostas
```

---

## Estrutura de arquivos

```
virada-backend/
├── server.js          # Servidor principal
├── package.json       # Dependências
├── env.example.txt    # Modelo de variáveis de ambiente
└── README.md          # Este guia
```

---

## Suporte

Em caso de dúvidas, verifique:
- Se a planilha está compartilhada com o e-mail da Service Account
- Se o JSON de credenciais está em uma única linha no .env
- Os logs do servidor no painel do Render
