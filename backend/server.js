
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const { Resend } = require("resend");
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

const resend = new Resend(
  process.env.RESEND_API_KEY
);




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
        imagen1 TEXT,
        imagen2 TEXT,
        imagen3 TEXT,
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
    // imagenes nuevas
    // =====================================================
await pool.query(`
  ALTER TABLE tecnicos
  ADD COLUMN IF NOT EXISTS imagen1 TEXT
`);

await pool.query(`
  ALTER TABLE tecnicos
  ADD COLUMN IF NOT EXISTS imagen2 TEXT
`);

await pool.query(`
  ALTER TABLE tecnicos
  ADD COLUMN IF NOT EXISTS imagen3 TEXT
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

    // =====================================================
    // TABLA SOLICITUDES PREMIUM
    // =====================================================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS solicitudes_premium (
        id SERIAL PRIMARY KEY,

        tecnico_id INTEGER NOT NULL,

        estado TEXT NOT NULL DEFAULT 'pendiente',

        fecha TEXT NOT NULL,

        CONSTRAINT fk_solicitud_tecnico
          FOREIGN KEY (tecnico_id)
          REFERENCES tecnicos(id)
          ON DELETE CASCADE
      )
    `);
    
 // =====================================================
// TABLA COTIZACIONES
// =====================================================

await pool.query(`
  CREATE TABLE IF NOT EXISTS cotizaciones (

    id SERIAL PRIMARY KEY,

    tecnico_id INTEGER NOT NULL,

    cliente_nombre TEXT NOT NULL,

    descripcion TEXT,

    direccion TEXT,

    telefono TEXT,

    correo TEXT,

    estado TEXT DEFAULT 'pendiente',

    fecha TEXT,

    CONSTRAINT fk_cotizacion_tecnico
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

      // Ajustar contador SERIAL

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
// ACC
// =========================================================

app.post("/login", (req, res) => {

  const { usuario, password } =
    req.body;

  if (
    usuario === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {

    return res.json({
      ok: true
    });

  }

  return res.status(401).json({
    ok: false
  });

});


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
          imagen1,
          imagen2,
          imagen3,
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
      imagen1,
      imagen2,
      imagen3,
      premium
    } = req.body;

    // =====================================================
    // VALIDACIONES
    // =====================================================

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

    // =====================================================
    // IMPORTANTE
    //
    // Aunque el frontend mande premium = true,
    // el técnico se crea inicialmente como FALSE.
    //
    // Después se crea una solicitud Premium pendiente.
    // =====================================================

    const quierePremium =
      premium === true ||
      premium === "true";

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
          imagen1,
          imagen2,
          imagen3,
          premium
        )
        VALUES
        (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
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
          imagen1 || "",
          imagen2 || "",
          imagen3 || "",
          false
        ]
      );

    const nuevoTecnico =
      resultado.rows[0];

    // =====================================================
    // SI QUIERE PREMIUM
    // CREAR SOLICITUD PENDIENTE
    // =====================================================

    if (quierePremium) {

      const fecha =
        new Date().toLocaleString();

      const solicitud =
        await pool.query(
          `
          INSERT INTO solicitudes_premium
          (
            tecnico_id,
            estado,
            fecha
          )
          VALUES
          ($1,'pendiente',$2)
          RETURNING
            id,
            tecnico_id AS "tecnicoId",
            estado,
            fecha
          `,
          [
            nuevoTecnico.id,
            fecha
          ]
        );

      console.log(
        "Solicitud Premium creada:",
        solicitud.rows[0]
      );

   try {

  const emailResultado =
    await resend.emails.send({

      from:
        "Notificaciones Solvify <notificaciones@solvifyapp.org>",

      to:
        process.env.ADMIN_EMAIL,

      subject:
        "⭐ Nueva solicitud Premium",

      html: `
        <h2>Nueva solicitud Premium</h2>

        <p>
          Un especialista solicitó activar
          el plan Premium.
        </p>

        <p>
          Ingresa al panel de administración
          para revisarla.
        </p>
      `

    });

  console.log(
    "Correo Premium enviado:",
    emailResultado
  );

} catch (emailError) {

  console.error(
    "Error enviando correo Premium:",
    emailError
  );

}

    }

    console.log(
      "Nuevo técnico registrado:",
      nuevoTecnico
    );

    res.status(201).json({

      mensaje:
        quierePremium
          ? "Técnico registrado y solicitud Premium enviada"
          : "Técnico registrado correctamente",

      tecnico:
        nuevoTecnico,

      premiumSolicitado:
        quierePremium

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
// También elimina automáticamente:
// - comentarios
// - ratings
// - solicitudes Premium
//
// Gracias a ON DELETE CASCADE.
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
// SOLICITUDES PREMIUM
// =========================================================

// =========================================================
// OBTENER TODAS LAS SOLICITUDES PREMIUM
//
// Incluye los datos del técnico.
// =========================================================

app.get("/solicitudes-premium", async (req, res) => {

  try {

    const resultado =
      await pool.query(`
        SELECT
          sp.id,
          sp.tecnico_id AS "tecnicoId",
          sp.estado,
          sp.fecha,

          t.nombre,
          t.servicio,
          t.descripcion,
          t.precio,
          t.zona,
          t.ciudad,
          t.telefono,
          t.correo,
          t.premium

        FROM solicitudes_premium sp

        INNER JOIN tecnicos t
          ON t.id = sp.tecnico_id

        ORDER BY sp.id DESC
      `);

    res.json(resultado.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error:
        "Error al obtener solicitudes Premium"
    });

  }

});

// =========================================================
// OBTENER SOLICITUD PREMIUM POR ID
// =========================================================

app.get("/solicitudes-premium/:id", async (req, res) => {

  try {

    const id =
      parseInt(req.params.id);

    const resultado =
      await pool.query(
        `
        SELECT
          sp.id,
          sp.tecnico_id AS "tecnicoId",
          sp.estado,
          sp.fecha,

          t.nombre,
          t.servicio,
          t.descripcion,
          t.precio,
          t.zona,
          t.ciudad,
          t.telefono,
          t.correo,
          t.premium

        FROM solicitudes_premium sp

        INNER JOIN tecnicos t
          ON t.id = sp.tecnico_id

        WHERE sp.id = $1
        `,
        [id]
      );

    if (resultado.rows.length === 0) {

      return res.status(404).json({
        error:
          "Solicitud Premium no encontrada"
      });

    }

    res.json(
      resultado.rows[0]
    );

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error:
        "Error al obtener solicitud Premium"
    });

  }

});

// =========================================================
// ACTIVAR PREMIUM
// =========================================================

app.put(
  "/solicitudes-premium/:id/aprobar",
  async (req, res) => {

    const client =
      await pool.connect();

    try {

      const solicitudId =
        parseInt(req.params.id);

      await client.query("BEGIN");

      // ===================================================
      // Buscar solicitud
      // ===================================================

      const solicitud =
        await client.query(
          `
          SELECT
            id,
            tecnico_id,
            estado
          FROM solicitudes_premium
          WHERE id = $1
          FOR UPDATE
          `,
          [solicitudId]
        );

      if (solicitud.rows.length === 0) {

        await client.query("ROLLBACK");

        return res.status(404).json({
          error:
            "Solicitud Premium no encontrada"
        });

      }

      const solicitudData =
        solicitud.rows[0];

      // ===================================================
      // Verificar estado
      // ===================================================

      if (
        solicitudData.estado === "aprobada"
      ) {

        await client.query("ROLLBACK");

        return res.status(400).json({
          error:
            "Esta solicitud ya fue aprobada"
        });

      }

      // ===================================================
      // Activar Premium
      // ===================================================

      const tecnico =
        await client.query(
          `
          UPDATE tecnicos

          SET premium = TRUE

          WHERE id = $1

          RETURNING
            id,
            nombre,
            servicio,
            premium
          `,
          [
            solicitudData.tecnico_id
          ]
        );

      if (tecnico.rows.length === 0) {

        await client.query("ROLLBACK");

        return res.status(404).json({
          error:
            "El técnico asociado no existe"
        });

      }

      // ===================================================
      // Cambiar solicitud a aprobada
      // ===================================================

      const solicitudActualizada =
        await client.query(
          `
          UPDATE solicitudes_premium

          SET estado = 'aprobada'

          WHERE id = $1

          RETURNING
            id,
            tecnico_id AS "tecnicoId",
            estado,
            fecha
          `,
          [
            solicitudId
          ]
        );

      await client.query("COMMIT");

      console.log(
        "Premium activado:",
        tecnico.rows[0]
      );

      res.json({

        mensaje:
          "Premium activado correctamente",

        tecnico:
          tecnico.rows[0],

        solicitud:
          solicitudActualizada.rows[0]

      });

    } catch (error) {

      await client.query("ROLLBACK");

      console.error(error);

      res.status(500).json({
        error:
          "Error al activar Premium"
      });

    } finally {

      client.release();

    }

  }
);

// =========================================================
// RECHAZAR SOLICITUD PREMIUM
// =========================================================

app.put(
  "/solicitudes-premium/:id/rechazar",
  async (req, res) => {

    try {

      const solicitudId =
        parseInt(req.params.id);

      const resultado =
        await pool.query(
          `
          UPDATE solicitudes_premium

          SET estado = 'rechazada'

          WHERE id = $1

          RETURNING
            id,
            tecnico_id AS "tecnicoId",
            estado,
            fecha
          `,
          [
            solicitudId
          ]
        );

      if (resultado.rows.length === 0) {

        return res.status(404).json({
          error:
            "Solicitud Premium no encontrada"
        });

      }

      console.log(
        "Solicitud Premium rechazada:",
        resultado.rows[0]
      );

      res.json({

        mensaje:
          "Solicitud Premium rechazada",

        solicitud:
          resultado.rows[0]

      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        error:
          "Error al rechazar solicitud Premium"
      });

    }

  }
);

// =========================================================
// CAMBIAR PREMIUM MANUALMENTE
//
// Esta ruta permite al administrador activar/desactivar
// Premium directamente desde el panel si algún día
// necesitamos hacerlo manualmente.
// =========================================================

app.put("/tecnicos/:id/premium", async (req, res) => {

  try {

    const id =
      parseInt(req.params.id);

    const premium =
      req.body.premium === true ||
      req.body.premium === "true";

    const resultado =
      await pool.query(
        `
        UPDATE tecnicos

        SET premium = $1

        WHERE id = $2

        RETURNING
          id,
          nombre,
          servicio,
          premium
        `,
        [
          premium,
          id
        ]
      );

    if (resultado.rows.length === 0) {

      return res.status(404).json({
        error:
          "Técnico no encontrado"
      });

    }

    console.log(
      "Estado Premium actualizado:",
      resultado.rows[0]
    );

    res.json({

      mensaje:
        "Estado Premium actualizado",

      tecnico:
        resultado.rows[0]

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error:
        "Error al actualizar Premium"
    });

  }

});

// =========================================================
// COTIZACIONES
// =========================================================

// Crear cotización

app.post("/cotizaciones", async (req, res) => {

  try {

    const {
      tecnicoId,
      clienteNombre,
      descripcion,
      direccion,
      telefono,
      correo
    } = req.body;

    const fecha =
      new Date().toLocaleString();

    const resultado =
      await pool.query(
        `
        INSERT INTO cotizaciones
        (
          tecnico_id,
          cliente_nombre,
          descripcion,
          direccion,
          telefono,
          correo,
          fecha
        )
        VALUES
        ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *
        `,
        [
          tecnicoId,
          clienteNombre,
          descripcion,
          direccion,
          telefono,
          correo,
          fecha
        ]
      );

   console.log(
  "Enviando correo de cotización..."
);

const emailResultado =
  await resend.emails.send({

    from:
      "Notificaciones Solvify <notificaciones@solvifyapp.org>",

    to:
      process.env.ADMIN_EMAIL,

    subject:
      "📋 Nueva cotización en Solvify",

    html: `
      <h2>Nueva cotización recibida</h2>

      <p>
        Se ha registrado una nueva cotización.
      </p>

      <p>
        Ingresa al panel de administración para revisarla.
      </p>
    `

  });

console.log(
  "Respuesta Resend:",
  emailResultado
);

    res.status(201).json({
      mensaje: "Cotización registrada",
      cotizacion: resultado.rows[0]
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "No se pudo registrar la cotización"
    });

  }

});

// Obtener todas las cotizaciones

app.get("/cotizaciones", async (req, res) => {

  try {

    const resultado =
      await pool.query(`
        SELECT
          c.*,

          t.nombre AS tecnico_nombre,
          t.servicio

        FROM cotizaciones c

        INNER JOIN tecnicos t
          ON t.id = c.tecnico_id

        ORDER BY c.id DESC
      `);

    res.json(resultado.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "No se pudieron obtener las cotizaciones"
    });

  }

});

// marcar atendidas las cotizaciones
app.put("/cotizaciones/:id/atendida", async (req, res) => {

  try {

    const resultado =
      await pool.query(
        `
        UPDATE cotizaciones

        SET estado = 'atendida'

        WHERE id = $1

        RETURNING *
        `,
        [req.params.id]
      );

    res.json({
      mensaje: "Cotización actualizada",
      cotizacion: resultado.rows[0]
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "No se pudo actualizar"
    });

  }

});

// eliminar cotizaciones

app.delete("/cotizaciones/:id", async (req, res) => {

  try {

    await pool.query(
      `
      DELETE FROM cotizaciones
      WHERE id = $1
      `,
      [req.params.id]
    );

    res.json({
      mensaje: "Cotización eliminada"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "No se pudo eliminar"
    });

  }

});

app.put("/tecnicos/:id", async (req, res) => {

  try {

    const id =
      parseInt(req.params.id);

    const {
      nombre,
      servicio,
      precio,
      ciudad,
      telefono,
      correo
    } = req.body;

    const resultado =
      await pool.query(
        `
        UPDATE tecnicos

        SET
          nombre = $1,
          servicio = $2,
          precio = $3,
          ciudad = $4,
          telefono = $5,
          correo = $6

        WHERE id = $7

        RETURNING *
        `,
        [
          nombre,
          servicio,
          precio,
          ciudad,
          telefono,
          correo,
          id
        ]
      );

    res.json(
      resultado.rows[0]
    );

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Error actualizando técnico"
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

