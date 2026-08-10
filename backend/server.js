const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

// Rutas de los archivos JSON
const comentariosFile = path.join(__dirname, "comentarios.json");
const ratingFile = path.join(__dirname, "rating.json");

// Ruta principal para verificar que el servidor está vivo
app.get("/", (req, res) => {
  res.json({
    mensaje: "Backend Solvify funcionando correctamente"
  });
});

// =====================
// COMENTARIOS
// =====================

// Obtener comentarios
app.get("/comentarios", (req, res) => {
  try {
    const data = fs.readFileSync(comentariosFile, "utf8");
    res.json(JSON.parse(data));
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al leer comentarios"
    });
  }
});

// Guardar comentario
app.post("/comentarios", (req, res) => {
  try {
    const data = fs.readFileSync(comentariosFile, "utf8");
    const comentarios = JSON.parse(data);

    const nuevoComentario = {
      nombre: req.body.nombre,
      texto: req.body.texto,
      fecha: new Date().toLocaleString()
    };

    comentarios.push(nuevoComentario);

    fs.writeFileSync(
      comentariosFile,
      JSON.stringify(comentarios, null, 2)
    );

    console.log("Comentario guardado:", nuevoComentario);

    res.json({
      mensaje: "Comentario guardado",
      comentario: nuevoComentario
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al guardar comentario"
    });
  }
});

// =====================
// RATING
// =====================

// Obtener rating
app.get("/rating", (req, res) => {
  try {
    const data = fs.readFileSync(ratingFile, "utf8");
    res.json(JSON.parse(data));

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al leer rating"
    });
  }
});

// Guardar rating
app.post("/rating", (req, res) => {
  try {
    const nuevoRating = {
      valor: req.body.valor,
      fecha: new Date().toLocaleString()
    };

    fs.writeFileSync(
      ratingFile,
      JSON.stringify(nuevoRating, null, 2)
    );

    console.log("Rating guardado:", nuevoRating);

    res.json({
      mensaje: "Rating guardado",
      rating: nuevoRating
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al guardar rating"
    });
  }
});

// =====================
// INICIAR SERVIDOR
// =====================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en puerto ${PORT}`);
});

const tecnicosFile = path.join(__dirname, "tecnicos.json");

app.get("/tecnicos", (req, res) => {
  const data = fs.readFileSync(tecnicosFile, "utf8");
  res.json(JSON.parse(data));
});

app.get("/tecnicos/:id", (req, res) => {
  const data = fs.readFileSync(tecnicosFile, "utf8");
  const tecnicos = JSON.parse(data);

  const tecnico = tecnicos.find(
    t => t.id == req.params.id
  );

  if (!tecnico) {
    return res.status(404).json({
      error: "Técnico no encontrado"
    });
  }

  res.json(tecnico);
});
