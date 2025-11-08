// server.js
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const session = require("express-session");
const nodemailer = require("nodemailer");

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Session admin
app.use(session({
    secret: "mon_secret_admin", 
    resave: false,
    saveUninitialized: true
}));

// SQLite DB
const db = new sqlite3.Database(path.join(__dirname, "data/database.db"), (err) => {
    if (err) return console.error(err.message);
    console.log("Connexion à SQLite réussie !");
});

// Création table messages
db.run(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT,
    email TEXT,
    message TEXT,
    date_sent DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Nodemailer transporteur (Ethereal pour tests)
const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  secure: false,
  auth: {
    user: "fkrdl37ffr7vwg2d@ethereal.email",
    pass: "x4XsvPzGg7JYAbnm78"
  }
});

// ------------------ ROUTES ------------------

// Login admin
app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  const ADMIN_USER = "larbi";
  const ADMIN_PASS = "larab56789";

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.admin = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
});

// Middleware protection routes admin
function checkAdmin(req, res, next) {
  if (req.session.admin) next();
  else res.status(403).json({ error: "Accès interdit" });
}

// Vérifier session admin
app.get("/admin/check-session", (req, res) => {
  res.json({ loggedIn: !!req.session.admin });
});

// Recevoir un message
app.post("/contact", (req, res) => {
  const { nom, email, message } = req.body;
  db.run(
    "INSERT INTO messages(nom,email,message) VALUES(?,?,?)",
    [nom, email, message],
    function(err){
      if(err) return res.status(500).json({ error: "Erreur serveur" });
      console.log("Nouveau message reçu :", { nom, email, message });
      res.json({ success: true });
    }
  );
});

// Récupérer messages admin
app.get("/admin/messages", checkAdmin, (req, res) => {
  db.all("SELECT * FROM messages ORDER BY date_sent DESC", [], (err, rows) => {
    if(err) return res.status(500).json({ error: "Erreur serveur" });
    res.json(rows);
  });
});

// Supprimer message
app.delete("/admin/messages/:id", checkAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  db.run("DELETE FROM messages WHERE id=?", [id], function(err){
    if(err) return res.status(500).json({ error: "Erreur serveur" });
    res.json({ success: true });
  });
});

// Répondre par email
app.post("/admin/reply", checkAdmin, async (req,res)=>{
  const { email, replyMessage } = req.body;
  try {
    const info = await transporter.sendMail({
      from: '"Admin Portfolio" <fkrdl37ffr7vwg2d@ethereal.email>',
      to: email,
      subject: "Réponse à votre message",
      text: replyMessage
    });
    console.log("Mail envoyé ! Voir sur Ethereal :", nodemailer.getTestMessageUrl(info));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur envoi email" });
  }
});

// Démarrage serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
