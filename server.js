require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const jwt = require("jsonwebtoken");
const jsonServer = require("json-server");

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, "db.json"));
const middlewares = jsonServer.defaults();

const JWT_SECRET = process.env.JWT_SECRET || "changeme";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

server.use(middlewares);
server.use(express.json());

function loadDb() {
  // Load the JSON file fresh each request
  const dbPath = path.join(__dirname, "db.json");
  delete require.cache[require.resolve(dbPath)];
  return require(dbPath);
}

function saveDb(data) {
  const dbPath = path.join(__dirname, "db.json");
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
}

function recalculateBalance(accounts) {
  if (!accounts || !Array.isArray(accounts.transactions)) {
    return 0;
  }

  return accounts.transactions.reduce((sum, tx) => {
    const amount = Number(tx.value) || 0;
    if (String(tx.type).toUpperCase() === "DEPOSIT") {
      return sum + amount;
    }
    if (String(tx.type).toUpperCase() === "TRANSFER") {
      return sum - amount;
    }
    return sum;
  }, 0);
}

server.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ message: "Email e senha são obrigatórios" });

  const db = loadDb();
  const users = Array.isArray(db.users) ? db.users : [];
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(401).json({ message: "Usuário não encontrado" });
  if (user.password !== password)
    return res.status(401).json({ message: "Senha incorreta" });

  const payload = { userId: user.userId, email: user.email };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return res.status(200).json({ token });
});

server.use((req, res, next) => {
  const isPublicRoute =
    req.method === "POST" && (req.path === "/login" || req.path === "/users");

  if (isPublicRoute) {
    return next();
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Token não fornecido ou inválido" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Token inválido ou expirado" });
    }

    req.user = decoded;
    next();
  });
});

server.get("/users/:id/account", (req, res) => {
  const userId = Number(req.params.id);
  const db = loadDb();
  const users = Array.isArray(db.users) ? db.users : [];
  const user = users.find((u) => u.id === userId);

  if (!user) {
    return res.status(404).json({ message: "Usuário não encontrado" });
  }

  return res.status(200).json(user.accounts || {});
});

server.post("/users/:id/account/transactions", (req, res) => {
  const userId = Number(req.params.id);
  const transaction = req.body;

  if (!transaction || typeof transaction !== "object") {
    return res.status(400).json({ message: "Objeto de transação inválido" });
  }

  const { id, type, date, value } = transaction;
  if (id == null || !type || !date || value == null) {
    return res
      .status(400)
      .json({ message: "Os campos id, type, date e value são obrigatórios" });
  }

  const db = loadDb();
  const users = Array.isArray(db.users) ? db.users : [];
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex === -1) {
    return res.status(404).json({ message: "Usuário não encontrado" });
  }

  const user = users[userIndex];
  if (!user.accounts) {
    user.accounts = { balance: 0, transactions: [] };
  }

  if (!Array.isArray(user.accounts.transactions)) {
    user.accounts.transactions = [];
  }

  user.accounts.transactions.push(transaction);
  user.accounts.balance = recalculateBalance(user.accounts);

  saveDb(db);

  return res.status(201).json(transaction);
});

server.put("/users/:id/account/transactions/:transactionId", (req, res) => {
  const userId = Number(req.params.id);
  const transactionId = Number(req.params.transactionId);
  const updatedTransaction = req.body;

  if (!updatedTransaction || typeof updatedTransaction !== "object") {
    return res.status(400).json({ message: "Objeto de transação inválido" });
  }

  const { id, type, date, value } = updatedTransaction;
  if (id == null || !type || !date || value == null) {
    return res
      .status(400)
      .json({ message: "Os campos id, type, date e value são obrigatórios" });
  }

  const db = loadDb();
  const users = Array.isArray(db.users) ? db.users : [];
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex === -1) {
    return res.status(404).json({ message: "Usuário não encontrado" });
  }

  const user = users[userIndex];
  if (!user.accounts || !Array.isArray(user.accounts.transactions)) {
    return res.status(404).json({ message: "Transação não encontrada" });
  }

  const transactionIndex = user.accounts.transactions.findIndex(
    (tx) => Number(tx.id) === transactionId,
  );

  if (transactionIndex === -1) {
    return res.status(404).json({ message: "Transação não encontrada" });
  }

  user.accounts.transactions[transactionIndex] = updatedTransaction;
  user.accounts.balance = recalculateBalance(user.accounts);
  saveDb(db);

  return res.status(200).json(updatedTransaction);
});

server.delete("/users/:id/account/transactions/:transactionId", (req, res) => {
  const userId = Number(req.params.id);
  const transactionId = Number(req.params.transactionId);

  const db = loadDb();
  const users = Array.isArray(db.users) ? db.users : [];
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex === -1) {
    return res.status(404).json({ message: "Usuário não encontrado" });
  }

  const user = users[userIndex];
  if (!user.accounts || !Array.isArray(user.accounts.transactions)) {
    return res.status(404).json({ message: "Transação não encontrada" });
  }

  const transactionIndex = user.accounts.transactions.findIndex(
    (tx) => Number(tx.id) === transactionId,
  );

  if (transactionIndex === -1) {
    return res.status(404).json({ message: "Transação não encontrada" });
  }

  const [deletedTransaction] = user.accounts.transactions.splice(transactionIndex, 1);
  user.accounts.balance = recalculateBalance(user.accounts);
  saveDb(db);

  return res.status(200).json(deletedTransaction);
});

// Mount json-server router after custom routes
server.use(router);

const port = process.env.PORT || 3333;
server.listen(port, () =>
  console.log(`Server (json-server + auth) listening on port ${port}`),
);
