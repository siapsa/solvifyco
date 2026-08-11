const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

// =====================
// ARCHIVOS JSON
// =====================

const comentariosFile = path.join(__dirname, "comentarios.json");
const ratingFile = path.join(__dirname, "rating.json");
const tecnicosFile = path.join(__dirname, "tecnicos.json");

// =====================
// RUTA PRINCIPAL
// =====================

app.get("/", (req, res) => {
  res.json({
    mensaje: "Backend Solvify funcionando correctamente"
  });
});

// =====================
// COMENTARIOS
// =====================

// Obtener TODOS los comentarios
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

// Obtener comentarios de un técnico específico
app.get("/comentarios/:tecnicoId", (req, res) => {
  try {
    const tecnicoId = parseInt(req.params.tecnicoId);

    const data = fs.readFileSync(comentariosFile, "utf8");
    const comentarios = JSON.parse(data);

    const comentariosTecnico = comentarios.filter(
      comentario => comentario.tecnicoId === tecnicoId
    );

    res.json(comentariosTecnico);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al obtener comentarios del técnico"
    });
  }
});

// Guardar comentario
app.post("/comentarios", (req, res) => {
  try {

    const data = fs.readFileSync(comentariosFile, "utf8");
    const comentarios = JSON.parse(data);

    const nuevoComentario = {
      tecnicoId: parseInt(req.body.tecnicoId),
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

// Obtener TODOS los ratings
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

// Obtener ratings de un técnico específico
app.get("/rating/:tecnicoId", (req, res) => {
  try {

    const tecnicoId = parseInt(req.params.tecnicoId);

    const data = fs.readFileSync(ratingFile, "utf8");
    const ratings = JSON.parse(data);

    const ratingsTecnico = ratings.filter(
      rating => rating.tecnicoId === tecnicoId
    );

    res.json(ratingsTecnico);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Error al obtener ratings del técnico"
    });
  }
});

// Guardar rating
app.post("/rating", (req, res) => {
  try {

    const data = fs.readFileSync(ratingFile, "utf8");
    const ratings = JSON.parse(data);

    const nuevoRating = {
      tecnicoId: parseInt(req.body.tecnicoId),
      valor: parseInt(req.body.valor),
      fecha: new Date().toLocaleString()
    };

    ratings.push(nuevoRating);

    fs.writeFileSync(
      ratingFile,
      JSON.stringify(ratings, null, 2)
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
// TÉCNICOS
// =====================

// Obtener todos los técnicos
app.get("/tecnicos", (req, res) => {

  try {

    const data = fs.readFileSync(tecnicosFile, "utf8");

    res.json(JSON.parse(data));

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Error al leer técnicos"
    });
  }

});

// Obtener técnico por ID
app.get("/tecnicos/:id", (req, res) => {

  try {

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

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Error al obtener técnico"
    });
  }

});

// =========================================================
// ELIMINAR TÉCNICO
// =========================================================

app.delete("/tecnicos/:id", (req, res) => {

  try {

    const tecnicoId = parseInt(req.params.id);

    const data = fs.readFileSync(
      tecnicosFile,
      "utf8"
    );

    const tecnicos = JSON.parse(data);

    const tecnicoExiste = tecnicos.some(
      tecnico => tecnico.id === tecnicoId
    );

    if (!tecnicoExiste) {

      return res.status(404).json({
        error: "Técnico no encontrado"
      });

    }

    const tecnicosActualizados =
      tecnicos.filter(
        tecnico => tecnico.id !== tecnicoId
      );

    fs.writeFileSync(
      tecnicosFile,
      JSON.stringify(
        tecnicosActualizados,
        null,
        2
      )
    );

    console.log(
      `Técnico ${tecnicoId} eliminado correctamente`
    );

    res.json({
      mensaje: "Técnico eliminado correctamente",
      id: tecnicoId
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Error al eliminar técnico"
    });

  }

});

// =====================
// REGISTRAR NUEVO TÉCNICO
// =====================

app.post("/tecnicos", (req, res) => {

  try {

    const data = fs.readFileSync(tecnicosFile, "utf8");
    const tecnicos = JSON.parse(data);

    // Obtener nuevo ID
    const nuevoId =
      tecnicos.length > 0
        ? Math.max(...tecnicos.map(t => Number(t.id))) + 1
        : 1;

    const nuevoTecnico = {

      id: nuevoId,

      nombre: req.body.nombre,

      servicio: req.body.servicio,

      descripcion: req.body.descripcion,

      precio: Number(req.body.precio),

      zona: req.body.zona,

      ciudad: req.body.ciudad,

      telefono: req.body.telefono,

      correo: req.body.correo,

      imagen: "",

      premium: req.body.plan === "premium"

    };

    tecnicos.push(nuevoTecnico);

    fs.writeFileSync(
      tecnicosFile,
      JSON.stringify(tecnicos, null, 2)
    );

    console.log(
      "Nuevo técnico registrado:",
      nuevoTecnico
    );

    res.status(201).json({

      mensaje: "Técnico registrado correctamente",

      tecnico: nuevoTecnico

    });

  } catch (error) {

    console.error(
      "Error registrando técnico:",
      error
    );

    res.status(500).json({
      error: "Error al registrar técnico"
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
