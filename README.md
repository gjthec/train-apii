# Train API

API REST construída com Express e Firebase Firestore para gerenciar classes de exercícios, exercícios, treinos e sessões de treino.

## Como executar

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Configure as variáveis de ambiente conforme descrito em [`.env`](./.env).
3. Certifique-se de que o arquivo JSON da Service Account do Firebase esteja disponível no caminho indicado por `GOOGLE_APPLICATION_CREDENTIALS`.
4. Inicie a API:
   ```bash
   npm start
   ```

A API é inicializada em `http://localhost:<PORT>`, onde `PORT` é definido na variável de ambiente (por padrão 4000).

## Variáveis de ambiente

| Variável | Descrição | Valor padrão |
| --- | --- | --- |
| `PORT` | Porta HTTP usada pelo servidor Express. | `4000` |
| `API_KEY` | Chave comparada com o cabeçalho `X-API-Key`. Se estiver vazia, nenhum bloqueio é aplicado. | `super-secret-api-key` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Caminho para o arquivo JSON da Service Account que autentica o Firebase Admin SDK. | `./credentials/serviceAccount.json` |
| `DEFAULT_USER_ID` | ID usado quando o cabeçalho `X-User-Id` não é enviado. | `default-user` |

## Cabeçalhos esperados

- `X-API-Key`: obrigatório quando `API_KEY` estiver configurada. Requisições sem essa chave válida retornam `401 Unauthorized`.
- `X-User-Id`: identifica o usuário dono dos registros. Caso ausente, a API usa `DEFAULT_USER_ID`.

## Endpoints

### Health check

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/health` | Verifica se a API está online. |
| `GET` | `/_debug/project` | Exibe o `projectId` carregado pelo Firebase Admin. |

### Exercise classes `/exercise-classes`

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

### Exercises `/exercises`

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

### Workouts `/workouts`

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

### Sessions `/sessions`

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

### Respostas de erro

- `400 Bad Request`: corpo inválido ou referências inexistentes (por exemplo, `classId` inexistente).
- `401 Unauthorized`: cabeçalho `X-API-Key` ausente ou inválido quando a variável `API_KEY` está definida.
- `404 Not Found`: recurso não encontrado para o ID informado.
- `500 Internal Server Error`: falha inesperada do servidor ou do Firestore.

## Estrutura do projeto

```
src/
├── app.js                  # Instancia o Express e monta middlewares/rotas
├── config/firebase.js      # Inicializa Firebase Admin e exporta utilidades
├── middlewares/apiKey.js   # Middleware de autenticação por API Key
├── routes/                 # Rotas moduladas por recurso
├── schemas/                # Validações Zod
└── utils/                  # Funções auxiliares compartilhadas
```
