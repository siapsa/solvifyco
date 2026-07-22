const express = require("express");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Ruta para obtener comentarios
app.get("/comentarios", (req, res) => {
  const data = fs.readFileSync("comentarios.json", "utf8");
  res.json(JSON.parse(data));
});

// Ruta para agregar un comentario
app.post("/comentarios", (req, res) => {
  const data = fs.readFileSync("comentarios.json", "utf8");
  const comentarios = JSON.parse(data);

  const nuevoComentario = {
    nombre: req.body.nombre,
    texto: req.body.texto,
    fecha: new Date().toLocaleString()
  };

  comentarios.push(nuevoComentario);

  fs.writeFileSync("comentarios.json", JSON.stringify(comentarios, null, 2));

  res.json({ mensaje: "Comentario guardado", comentario: nuevoComentario });
});

// === Obtener rating ===
app.get("/rating", (req, res) => {
  const data = fs.readFileSync("rating.json", "utf8");
  res.json(JSON.parse(data));
});

// === Guardar rating ===
app.post("/rating", (req, res) => {
  const nuevoRating = {
    valor: req.body.valor,
    fecha: new Date().toLocaleString()
  };

  fs.writeFileSync("rating.json", JSON.stringify(nuevoRating, null, 2));

  res.json({ mensaje: "Rating guardado", rating: nuevoRating });
});

// Iniciar servidor
app.listen(3000, () => {
  console.log("Servidor backend corriendo en http://localhost:3000");
});
