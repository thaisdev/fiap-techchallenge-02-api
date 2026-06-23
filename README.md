# fiap-challeng-02-api

API simples com `json-server` e autenticação JWT.

## Índice

- [Instalação](#instalação)
- [Configuração de ambiente](#configuração-de-ambiente)
- [Execução](#execução)
- [Docker](#docker)
- [Autenticação](#autenticação)
- [Rota de login](#rota-de-login)
  - [POST /login](#post-login)
- [Rotas de usuário](#rotas-de-usuário)
  - [POST /users](#post-users)
  - [GET /users/:id/account](#get-usersidaccount)
  - [GET /users/:id/account/transactions](#get-usersidaccounttransactions)
  - [GET /users/:id/account/transactions/summary](#get-usersidaccounttransactionssummary)
  - [POST /users/:id/account/transactions](#post-usersidaccounttransactions)
  - [PUT /users/:id/account/transactions/:transactionId](#put-usersidaccounttransactionstransactionid)
  - [DELETE /users/:id/account/transactions/:transactionId](#delete-usersidaccounttransactionstransactionid)
- [Observações](#observações)

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

Retorna as transações do usuário ordenadas da mais recente para a mais antiga, com suporte a paginação.

#### Query params

| Parâmetro   | Tipo    | Padrão | Descrição                                           |
|-------------|---------|--------|-----------------------------------------------------|
| `page`      | inteiro | `1`    | Número da página (mínimo: `1`)                      |
| `limit`     | inteiro | `10`   | Quantidade de itens por página (mínimo: `1`)        |
| `startDate` | string  | —      | Data inicial no formato `YYYY-MM-DD`. Considera `00:00:00 UTC` do dia informado |
| `endDate`   | string  | —      | Data final no formato `YYYY-MM-DD`. Considera `23:59:59 UTC` do dia informado   |
| `type`      | string  | —      | Tipo da transação: `DEPOSIT` ou `TRANSFER` (case-insensitive) |

> `page` e `limit` devem ser inteiros positivos. Valores não numéricos, decimais ou menores que `1` resultam em `400`.  
> `startDate` e `endDate` devem ser datas válidas no formato `YYYY-MM-DD`; caso contrário retornam `400`.  
> Os filtros são cumulativos: é possível combinar `startDate`, `endDate` e `type` ao mesmo tempo.

#### Exemplos de filtros

**Filtrar por tipo:**

```http
GET /users/100/account/transactions?type=TRANSFER
Authorization: Bearer <token>
```

**Filtrar por data inicial:**

```http
GET /users/100/account/transactions?startDate=2026-06-19
Authorization: Bearer <token>
```

Retorna transações com `date >= 2026-06-19T00:00:00.000Z`.

**Filtrar por data final:**

```http
GET /users/100/account/transactions?endDate=2026-06-19
Authorization: Bearer <token>
```

Retorna transações com `date <= 2026-06-19T23:59:59.999Z`.

**Filtrar por intervalo de datas:**

```http
GET /users/100/account/transactions?startDate=2026-06-18&endDate=2026-06-19
Authorization: Bearer <token>
```

**Combinar todos os filtros com paginação:**

```http
GET /users/100/account/transactions?startDate=2026-06-18&endDate=2026-06-19&type=TRANSFER&page=1&limit=5
Authorization: Bearer <token>
```

Resposta:

```json
{
  "data": [
    {
      "id": 1782086300008,
      "type": "TRANSFER",
      "value": 750,
      "date": "2026-06-18T18:10:00.000Z"
    },
    {
      "id": 1782086300006,
      "type": "TRANSFER",
      "value": 2000,
      "date": "2026-06-18T15:20:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "totalItems": 5,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

#### Campos do objeto `pagination`

| Campo            | Tipo    | Descrição                                                          |
|------------------|---------|--------------------------------------------------------------------|
| `page`           | inteiro | Página atual                                                       |
| `limit`          | inteiro | Quantidade de itens por página solicitada                          |
| `totalItems`     | inteiro | Total de transações após aplicar os filtros                        |
| `totalPages`     | inteiro | Total de páginas disponíveis (`ceil(totalItems / limit)`)          |
| `hasNextPage`    | boolean | `true` se existe uma próxima página                                |
| `hasPreviousPage`| boolean | `true` se existe uma página anterior                               |

Respostas:

- `200`: lista paginada de transações
- `400`: `page` ou `limit` não numéricos, decimais ou menores que `1`
- `400`: `{ "message": "startDate inválido" }` ou `{ "message": "endDate inválido" }`
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
