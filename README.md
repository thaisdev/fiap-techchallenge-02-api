# fiap-challeng-02-api

API simples com `json-server` e autenticação JWT.

## Instalação

```bash
npm install
```

## Configuração de ambiente

Crie um arquivo `.env` na raiz do projeto com as variáveis abaixo. Você pode usar `.env.example` como modelo.

```env
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=1h
PORT=3333
```

- `JWT_SECRET`: segredo usado para assinar tokens JWT.
- `JWT_EXPIRES_IN`: tempo de expiração do token (ex: `1h`).
- `PORT`: porta em que o servidor será iniciado.

> **Não** faça commit do arquivo `.env` com valores sensíveis.

## Execução

```bash
npm start
```

O servidor ficará disponível em `http://localhost:3333`.

## Docker

### Build da imagem

```bash
docker build -t fiap-challenge-02-api .
```

### Executar o container

```bash
docker run -p 3333:3333 \
  -e JWT_SECRET=sua_chave_secreta \
  -e JWT_EXPIRES_IN=1h \
  fiap-challenge-02-api
```

O servidor ficará disponível em `http://localhost:3333`.


## Autenticação

As rotas são protegidas por JWT, exceto:

- `POST /login`
- `POST /users`

Para todas as demais requisições, envie o header:

```http
Authorization: Bearer <token>
```

## Rota de login

### POST `/login`

Request body JSON:

```json
{
  "email": "thais@email.com",
  "password": "thais123"
}
```

Respostas:

- `200`: `{ "token": "..." }`
- `401`: `{ "message": "Usuário não encontrado" }`
- `401`: `{ "message": "Senha incorreta" }`

## Rotas de usuário

### POST `/users`

Cadastra um novo usuário.

Request body exemplo:

```json
{
  "name": "Ana",
  "email": "ana@email.com",
  "password": "ana123"
}
```

Respostas:

- `201`: objeto do usuário criado
- `400`: campos obrigatórios ausentes

> Esta rota é pública e não requer token.

### GET `/users/:id/account`

Retorna apenas o resumo da conta do usuário, sem transações.

Resposta:

```json
{
  "balance": 7700
}
```

Respostas:

- `200`: `{ "balance": number }`
- `404`: `{ "message": "Usuário não encontrado" }`
- `401`: `{ "message": "Token inválido ou expirado" }` ou `{ "message": "Token não fornecido ou inválido" }`

### GET `/users/:id/account/transactions`

Retorna as transações do usuário com paginação.

Query params:

- `page`: número da página. Valor padrão: `1`.
- `limit`: quantidade de itens por página. Valor padrão: `10`.

Exemplo:

```http
GET /users/100/account/transactions?page=1&limit=2
Authorization: Bearer <token>
```

Resposta:

```json
{
  "data": [
    {
      "id": 789,
      "type": "DEPOSIT",
      "date": "2026-06-14T19:48:00Z",
      "value": 6000
    },
    {
      "id": 987,
      "type": "TRANSFER",
      "date": "2026-06-14T20:48:00Z",
      "value": 1000
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 2,
    "totalItems": 6,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

As transações são ordenadas da mais recente para a mais antiga antes da paginação.

Respostas:

- `200`: lista paginada de transações
- `400`: parâmetros de paginação inválidos
- `404`: `{ "message": "Usuário não encontrado" }`
- `401`: token ausente ou inválido

### GET `/users/:id/account/transactions/summary`

Retorna os totais agregados de depósitos, transferências e saldo para gráficos.

Exemplo:

```http
GET /users/100/account/transactions/summary
Authorization: Bearer <token>
```

Resposta:

```json
{
  "depositsTotal": 9700,
  "transfersTotal": 2000,
  "balance": 7700
}
```

Respostas:

- `200`: resumo financeiro agregado
- `404`: `{ "message": "Usuário não encontrado" }`
- `401`: token ausente ou inválido

### POST `/users/:id/account/transactions`

Adiciona uma nova transação ao usuário.

Request body JSON:

```json
{
  "id": 789,
  "type": "DEPOSIT",
  "date": "2026-06-14T19:48:00Z",
  "value": 6000
}
```

Respostas:

- `201`: objeto da transação adicionada
- `400`: objeto inválido ou campos obrigatórios ausentes
- `404`: `{ "message": "Usuário não encontrado" }`
- `401`: token ausente ou inválido

### PUT `/users/:id/account/transactions/:transactionId`

Atualiza uma transação existente do usuário.

Request body JSON:

```json
{
  "id": 789,
  "type": "DEPOSIT",
  "date": "2026-06-14T19:48:00Z",
  "value": 6000
}
```

Respostas:

- `200`: objeto da transação atualizada
- `400`: objeto inválido ou campos obrigatórios ausentes
- `404`: `{ "message": "Usuário não encontrado" }` ou `{ "message": "Transação não encontrada" }`
- `401`: token ausente ou inválido

### DELETE `/users/:id/account/transactions/:transactionId`

Remove uma transação específica do usuário.

Respostas:

- `200`: objeto da transação removida
- `404`: `{ "message": "Usuário não encontrado" }` ou `{ "message": "Transação não encontrada" }`
- `401`: token ausente ou inválido

## Observações

- As rotas de transação recalculam o `balance` do usuário após cada alteração.
- O `db.json` é atualizado em disco sempre que um registro é criado, editado ou removido.
