# Train Platform

Monorepo que reúne a API REST construída com Express/Firebase e uma interface web Next.js para visualizar as aulas, treinos e sessões carregadas pelo backend.

## Estrutura

```
.
├── backend/                # API Express conectada ao Firebase Firestore
└── frontend/               # Aplicação Next.js que consome a API
```

Cada módulo mantém seu próprio `package.json`, scripts e arquivos de ambiente de exemplo.

---

## Backend (Express + Firebase)

A API original foi movida para `./backend`. Todos os comandos devem ser executados dentro dessa pasta.

### Como executar

1. Instale as dependências:
   ```bash
   cd backend
   npm install
   ```
2. Configure as variáveis de ambiente copiando [`backend/.env`](backend/.env) e ajustando os valores.
3. Certifique-se de que o arquivo JSON da Service Account do Firebase esteja disponível no caminho indicado por `GOOGLE_APPLICATION_CREDENTIALS`.
4. Inicie a API:
   ```bash
   npm start
   ```

A API é inicializada em `http://localhost:<PORT>`, onde `PORT` é definido na variável de ambiente (por padrão 4000).

### Variáveis de ambiente

| Variável | Descrição | Valor padrão |
| --- | --- | --- |
| `PORT` | Porta HTTP usada pelo servidor Express. | `4000` |
| `API_KEY` | Chave comparada com o cabeçalho `X-API-Key`. Se estiver vazia, nenhum bloqueio é aplicado. | `super-secret-api-key` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Caminho para o arquivo JSON da Service Account que autentica o Firebase Admin SDK. | `./credentials/serviceAccount.json` |
| `FIREBASE_SERVICE_ACCOUNT` | (Opcional) JSON completo da Service Account, útil em plataformas que armazenam segredos como string. | *vazio* |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | (Opcional) Mesmo JSON acima, porém codificado em Base64. | *vazio* |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | (Opcional) Campos individuais da Service Account. `FIREBASE_PRIVATE_KEY` aceita `\n` para quebras de linha. | *vazio* |
| `DEFAULT_USER_ID` | ID usado quando o cabeçalho `X-User-Id` não é enviado. | `default-user` |

### Cabeçalhos esperados

- `X-API-Key`: obrigatório quando `API_KEY` estiver configurada. Requisições sem essa chave válida retornam `401 Unauthorized`.
- `X-User-Id`: identifica o usuário dono dos registros. Caso ausente, a API usa `DEFAULT_USER_ID`.

### Endpoints

#### Health check

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/health` | Verifica se a API está online. |
| `GET` | `/_debug/project` | Exibe o `projectId` carregado pelo Firebase Admin. |

#### Exercise classes `/exercise-classes`

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/` | Cria uma nova classe de exercício. |
| `GET` | `/` | Lista as classes do usuário autenticado, ordenadas por `createdAt` (desc). |
| `PATCH` | `/:id` | Atualiza campos de uma classe específica. |
| `DELETE` | `/:id` | Remove uma classe. |

**Payload `POST /exercise-classes`**
```json
{
  "name": "Inferiores",
  "description": "Exercícios de pernas"
}
```

#### Exercises `/exercises`

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/` | Cria um exercício associado a uma classe (`classId`). |
| `GET` | `/` | Lista os exercícios do usuário. Aceita `?expand=class` para anexar a classe relacionada. |
| `PATCH` | `/:id` | Atualiza campos do exercício. Valida `classId` quando informado. |
| `DELETE` | `/:id` | Remove um exercício. |

**Payload `POST /exercises`**
```json
{
  "name": "Agachamento livre",
  "description": "3 séries de 12 repetições",
  "classId": "<exerciseClassId>"
}
```

#### Workouts `/workouts`

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/` | Cria um treino com um plano de exercícios. Verifica se todos os `exerciseId` existem. |
| `GET` | `/` | Lista treinos do usuário. |
| `GET` | `/:id` | Busca um treino específico. Aceita `?expand=exercises` para anexar detalhes dos exercícios. |
| `PATCH` | `/:id` | Atualiza campos do treino. Valida `exerciseId` ao alterar o plano. |
| `DELETE` | `/:id` | Remove um treino. |

**Payload `POST /workouts`**
```json
{
  "name": "Treino A",
  "description": "Foco em superiores",
  "plan": [
    {
      "exerciseId": "<exerciseId>",
      "order": 1,
      "sets": 3,
      "reps": 12,
      "restSeconds": 60
    }
  ]
}
```

#### Sessions `/sessions`

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/` | Registra a execução de um treino em uma data. |
| `GET` | `/` | Lista sessões do usuário. Aceita filtros `?from=YYYY-MM-DD` e `?to=YYYY-MM-DD`. |
| `PATCH` | `/:id` | Atualiza campos da sessão. Normaliza `date` para ISO 8601. |
| `DELETE` | `/:id` | Remove uma sessão. |

**Payload `POST /sessions`**
```json
{
  "workoutId": "<workoutId>",
  "durationMinutes": 55,
  "notes": "Treino fluindo bem",
  "date": "2024-06-01T10:00:00Z"
}
```

#### Respostas de erro

- `400 Bad Request`: corpo inválido ou referências inexistentes (por exemplo, `classId` inexistente).
- `401 Unauthorized`: cabeçalho `X-API-Key` ausente ou inválido quando a variável `API_KEY` está definida.
- `404 Not Found`: recurso não encontrado para o ID informado.
- `500 Internal Server Error`: falha inesperada do servidor ou do Firestore.

### Estrutura da pasta `backend`

```
backend/
├── package.json
├── src/
│   ├── app.js                  # Instancia o Express e monta middlewares/rotas
│   ├── config/firebase.js      # Inicializa Firebase Admin e exporta utilidades
│   ├── middlewares/apiKey.js   # Middleware de autenticação por API Key
│   ├── routes/                 # Rotas moduladas por recurso
│   ├── schemas/                # Validações Zod
│   └── utils/                  # Funções auxiliares compartilhadas
└── .env                        # Exemplo de configuração
```

---

## Frontend (Next.js)

A interface web baseada em React está localizada em `./frontend` e consome a API Express através de requisições HTTP. Dessa forma, toda a lógica de autenticação com o Firebase continua centralizada no backend, utilizando a Service Account configurada anteriormente.

### Como executar

1. Instale as dependências:
   ```bash
   cd frontend
   npm install
   ```
2. Copie [`frontend/.env.local.example`](frontend/.env.local.example) para `.env.local` e ajuste as variáveis:
   - `NEXT_PUBLIC_API_BASE_URL`: URL base do backend (por exemplo, `http://localhost:4000`).
   - `NEXT_PUBLIC_API_KEY`: mesma chave configurada no backend para o cabeçalho `X-API-Key`.
   - `NEXT_PUBLIC_DEFAULT_USER_ID`: usuário cujos registros serão carregados quando nenhum outro ID for informado.
3. Execute o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Acesse `http://localhost:3000` no navegador.

### Telas disponíveis

- **Painel** (`/`): visão geral com atalhos para as demais telas.
- **Aulas** (`/exercise-classes`): lista as classes retornadas pela rota `/exercise-classes` da API.
- **Treinos** (`/workouts`): mostra nome, foco, dificuldade e métricas dos treinos obtidos via `/workouts`.
- **Exercícios** (`/exercises`): apresenta detalhes de execução, grupos musculares e repetições fornecidos pelo endpoint `/exercises`.
- **Sessões** (`/sessions`): exibe as sessões agendadas com status, data e aula relacionada a partir da rota `/sessions`.

Todas as telas aplicam estilos consistentes e exibem mensagens de erro amigáveis quando a API retorna falha.
