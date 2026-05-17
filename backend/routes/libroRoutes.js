const express = require("express");
const router = express.Router();

const {
    obtenerLibros,
    crearLibro,
    obtenerLibro,
    actualizarLibro,
    eliminarLibro
} = require("../controllers/libroController");

router.get("/", obtenerLibros);
router.post("/", crearLibro);
router.get("/:id", obtenerLibro);
router.put("/:id", actualizarLibro);
router.delete("/:id", eliminarLibro);

module.exports = router;