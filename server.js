require("dotenv").config();
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

// Mount json-server router after custom routes
server.use(router);

const port = process.env.PORT || 3333;
server.listen(port, () =>
  console.log(`Server (json-server + auth) listening on port ${port}`),
);
