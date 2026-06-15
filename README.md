# fiap-challeng-02-api

API simples com `json-server` e autenticação JWT.

## Instalação

```bash
npm install
```

## Configuração de ambiente

Crie um arquivo `.env` na raiz do projeto com as variáveis abaixo. Você pode usar `.env.example` como modelo.

```env
JWT_SECRET=change_this_secret
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
