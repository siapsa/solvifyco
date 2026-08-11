const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(express.json());
app.use(cors());

// =========================================================
// CONEXIÓN POSTGRESQL
// =========================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// =========================================================
// DATOS INICIALES DE TÉCNICOS
// Solo se utilizan si la tabla está vacía.
// =========================================================

const tecnicosIniciales = [
  {
    id: 1,
    nombre: "Roberto Jiménez",
    servicio: "electricista",
    descripcion: "Electricista certificado",
    precio: 100,
    zona: "panama",
    ciudad: "Ciudad de Panamá",
    telefono: "+507 62804587",
    correo: "roberto.jimenez@gmail.com",
    imagen: "",
    premium: true
  },
  {
    id: 2,
    nombre: "Raimundo Atencio",
    servicio: "mantenimiento",
    descripcion: "Mantenimiento Certificado",
    precio: 250,
    zona: "panama",
    ciudad: "Ciudad de Panamá",
    telefono: "+507 62804587",
    correo: "raimundo.atencio@gmail.com",
    imagen: "",
    premium: true
  },
  {
    id: 3,
    nombre: "Rigoberto Rodríguez",
    servicio: "ebanista",
    descripcion: "Ebanista Certificado",
    precio: 500,
    zona: "cocle",
    ciudad: "Coclé",
    telefono: "+507 6600000",
    correo: "rigoberto.rodriguez@gmail.com",
    imagen: "",
    premium: false
  },
  {
    id: 4,
    nombre: "Rigoberto Rodríguez",
    servicio: "albanil",
    descripcion: "Albañil Certificado",
    precio: 400,
    zona: "colon",
    ciudad: "Colón",
    telefono: "+507 6700000",
    correo: "rigoberto.rodriguez@gmail.com",
    imagen: "",
    premium: false
  }
];

// =========================================================
// INICIALIZAR BASE DE DATOS
// =========================================================

async function inicializarBaseDatos() {

  try {

    console.log("Inicializando base de datos...");

    // =====================================================
    // TABLA TÉCNICOS
    // =====================================================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tecnicos (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        servicio TEXT NOT NULL,
        descripcion TEXT,
        precio NUMERIC,
        zona TEXT,
        ciudad TEXT,
        telefono TEXT,
        correo TEXT,
        imagen TEXT,
        premium BOOLEAN DEFAULT FALSE
      )
    `);

    // =====================================================
    // TABLA COMENTARIOS
    // =====================================================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS comentarios (
        id SERIAL PRIMARY KEY,
        tecnico_id INTEGER NOT NULL,
        nombre TEXT,
        texto TEXT,
        fecha TEXT,
        CONSTRAINT fk_comentario_tecnico
          FOREIGN KEY (tecnico_id)
          REFERENCES tecnicos(id)
          ON DELETE CASCADE
      )
    `);

    // =====================================================
    // TABLA RATINGS
    // =====================================================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        tecnico_id INTEGER NOT NULL,
        valor INTEGER,
        fecha TEXT,
        CONSTRAINT fk_rating_tecnico
          FOREIGN KEY (tecnico_id)
          REFERENCES tecnicos(id)
          ON DELETE CASCADE
      )
    `);

    console.log("Tablas verificadas correctamente.");

    // =====================================================
    // MIGRACIÓN INICIAL
    // Solo si no existen técnicos.
    // =====================================================

    const resultado =
      await pool.query(
        "SELECT COUNT(*) FROM tecnicos"
      );

    const cantidad =
      parseInt(resultado.rows[0].count);

    if (cantidad === 0) {

      console.log(
        "No existen técnicos. Cargando datos iniciales..."
      );

      for (const tecnico of tecnicosIniciales) {

        await pool.query(
          `
          INSERT INTO tecnicos
          (
            id,
            nombre,
            servicio,
            descripcion,
            precio,
            zona,
            ciudad,
            telefono,
            correo,
            imagen,
            premium
          )
          VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          `,
          [
            tecnico.id,
            tecnico.nombre,
            tecnico.servicio,
            tecnico.descripcion,
            tecnico.precio,
            tecnico.zona,
            tecnico.ciudad,
            tecnico.telefono,
            tecnico.correo,
            tecnico.imagen,
            tecnico.premium
          ]
        );

      }

      // Ajustar el contador del SERIAL
      await pool.query(`
        SELECT setval(
          pg_get_serial_sequence('tecnicos', 'id'),
          COALESCE((SELECT MAX(id) FROM tecnicos), 1)
        )
      `);

      console.log(
        "Técnicos iniciales migrados correctamente."
      );

    } else {

      console.log(
        `Base de datos ya contiene ${cantidad} técnicos.`
      );

    }

    console.log(
      "Base de datos Solvify lista."
    );

  } catch (error) {

    console.error(
      "ERROR inicializando PostgreSQL:",
      error
    );

  }

}

inicializarBaseDatos();

// =========================================================
// RUTA PRINCIPAL
// =========================================================

app.get("/", (req, res) => {

  res.json({
    mensaje: "Backend Solvify funcionando correctamente",
    baseDatos: "PostgreSQL"
  });

});

// =========================================================
// COMENTARIOS
// =========================================================

// Obtener TODOS los comentarios

app.get("/comentarios", async (req, res) => {

  try {

    const resultado = await pool.query(`
      SELECT
        id,
        tecnico_id AS "tecnicoId",
        nombre,
        texto,
        fecha
      FROM comentarios
      ORDER BY id ASC
    `);

    res.json(resultado.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Error al leer comentarios"
    });

  }

});

// Obtener comentarios de un técnico

app.get("/comentarios/:tecnicoId", async (req, res) => {

  try {

    const tecnicoId =
      parseInt(req.params.tecnicoId);

    const resultado =
      await pool.query(
        `
        SELECT
          id,
          tecnico_id AS "tecnicoId",
          nombre,
          texto,
          fecha
        FROM comentarios
        WHERE tecnico_id = $1
        ORDER BY id ASC
        `,
        [tecnicoId]
      );

    res.json(resultado.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error:
        "Error al obtener comentarios del técnico"
    });

  }

});

// Guardar comentario

app.post("/comentarios", async (req, res) => {

  try {

    const tecnicoId =
      parseInt(req.body.tecnicoId);

    const nombre =
      req.body.nombre;

    const texto =
      req.body.texto;

    const fecha =
      new Date().toLocaleString();

    const resultado =
      await pool.query(
        `
        INSERT INTO comentarios
        (
          tecnico_id,
          nombre,
          texto,
          fecha
        )
        VALUES
        ($1,$2,$3,$4)
        RETURNING
          id,
          tecnico_id AS "tecnicoId",
          nombre,
          texto,
          fecha
        `,
        [
          tecnicoId,
          nombre,
          texto,
          fecha
        ]
      );

    console.log(
      "Comentario guardado:",
      resultado.rows[0]
    );

    res.json({
      mensaje: "Comentario guardado",
      comentario: resultado.rows[0]
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Error al guardar comentario"
    });

  }

});

// =========================================================
// RATING
// =========================================================

// Obtener TODOS los ratings

app.get("/rating", async (req, res) => {

  try {

    const resultado =
      await pool.query(`
        SELECT
          id,
          tecnico_id AS "tecnicoId",
          valor,
          fecha
        FROM ratings
        ORDER BY id ASC
      `);

    res.json(resultado.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Error al leer rating"
    });

  }

});

// Obtener ratings de un técnico

app.get("/rating/:tecnicoId", async (req, res) => {

  try {

    const tecnicoId =
      parseInt(req.params.tecnicoId);

    const resultado =
      await pool.query(
        `
        SELECT
          id,
          tecnico_id AS "tecnicoId",
          valor,
          fecha
        FROM ratings
        WHERE tecnico_id = $1
        ORDER BY id ASC
        `,
        [tecnicoId]
      );

    res.json(resultado.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error:
        "Error al obtener ratings del técnico"
    });

  }

});

// Guardar rating

app.post("/rating", async (req, res) => {

  try {

    const tecnicoId =
      parseInt(req.body.tecnicoId);

    const valor =
      parseInt(req.body.valor);

    const fecha =
      new Date().toLocaleString();

    const resultado =
      await pool.query(
        `
        INSERT INTO ratings
        (
          tecnico_id,
          valor,
          fecha
        )
        VALUES
        ($1,$2,$3)
        RETURNING
          id,
          tecnico_id AS "tecnicoId",
          valor,
          fecha
        `,
        [
          tecnicoId,
          valor,
          fecha
        ]
      );

    console.log(
      "Rating guardado:",
      resultado.rows[0]
    );

    res.json({
      mensaje: "Rating guardado",
      rating: resultado.rows[0]
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Error al guardar rating"
    });

  }

});

// =========================================================
// TÉCNICOS
// =========================================================

// Obtener TODOS los técnicos

app.get("/tecnicos", async (req, res) => {

  try {

    const resultado =
      await pool.query(`
        SELECT
          id,
          nombre,
          servicio,
          descripcion,
          precio,
          zona,
          ciudad,
          telefono,
          correo,
          imagen,
          premium
        FROM tecnicos
        ORDER BY id ASC
      `);

    res.json(resultado.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Error al leer técnicos"
    });

  }

});

// Obtener técnico por ID

app.get("/tecnicos/:id", async (req, res) => {

  try {

    const id =
      parseInt(req.params.id);

    const resultado =
      await pool.query(
        `
        SELECT
          id,
          nombre,
          servicio,
          descripcion,
          precio,
          zona,
          ciudad,
          telefono,
          correo,
          imagen,
          premium
        FROM tecnicos
        WHERE id = $1
        `,
        [id]
      );

    if (resultado.rows.length === 0) {

      return res.status(404).json({
        error: "Técnico no encontrado"
      });

    }

    res.json(
      resultado.rows[0]
    );

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error:
        "Error al obtener técnico"
    });

  }

});

// =========================================================
// REGISTRAR NUEVO TÉCNICO
// =========================================================

app.post("/tecnicos", async (req, res) => {

  try {

    const {
      nombre,
      servicio,
      descripcion,
      precio,
      zona,
      ciudad,
      telefono,
      correo,
      imagen,
      premium
    } = req.body;

    // Validaciones básicas

    if (
      !nombre ||
      !servicio ||
      !descripcion ||
      !precio ||
      !zona ||
      !ciudad ||
      !telefono ||
      !correo
    ) {

      return res.status(400).json({
        error:
          "Faltan datos obligatorios"
      });

    }

    const resultado =
      await pool.query(
        `
        INSERT INTO tecnicos
        (
          nombre,
          servicio,
          descripcion,
          precio,
          zona,
          ciudad,
          telefono,
          correo,
          imagen,
          premium
        )
        VALUES
        (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
        )
        RETURNING
          id,
          nombre,
          servicio,
          descripcion,
          precio,
          zona,
          ciudad,
          telefono,
          correo,
          imagen,
          premium
        `,
        [
          nombre,
          servicio,
          descripcion,
          precio,
          zona,
          ciudad,
          telefono,
          correo,
          imagen || "",
          premium === true
        ]
      );

    const nuevoTecnico =
      resultado.rows[0];

    console.log(
      "Nuevo técnico registrado:",
      nuevoTecnico
    );

    res.status(201).json({
      mensaje:
        "Técnico registrado correctamente",
      tecnico:
        nuevoTecnico
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error:
        "Error al registrar técnico"
    });

  }

});

// =========================================================
// ELIMINAR TÉCNICO
// También elimina automáticamente sus comentarios
// y ratings por ON DELETE CASCADE.
// =========================================================

app.delete("/tecnicos/:id", async (req, res) => {

  try {

    const id =
      parseInt(req.params.id);

    const resultado =
      await pool.query(
        `
        DELETE FROM tecnicos
        WHERE id = $1
        RETURNING *
        `,
        [id]
      );

    if (resultado.rows.length === 0) {

      return res.status(404).json({
        error:
          "Técnico no encontrado"
      });

    }

    console.log(
      "Técnico eliminado:",
      resultado.rows[0]
    );

    res.json({
      mensaje:
        "Técnico eliminado correctamente",
      tecnico:
        resultado.rows[0]
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error:
        "Error al eliminar técnico"
    });

  }

});

// =========================================================
// INICIAR SERVIDOR
// =========================================================

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(
    `Servidor backend corriendo en puerto ${PORT}`
  );

});
