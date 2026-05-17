const express = require("express");
const router = express.Router();

const {
    registrarUsuario,
    loginUsuario,
    solicitarCambioPassword,
    restablecerPassword,
    obtenerUsuarios,
    obtenerUsuario,
    actualizarUsuario,
    eliminarUsuario,
    comprarLibros,
    obtenerMisLibros,
    agregarComentario,
    obtenerComentarios,
    editarComentario
} = require("../controllers/usuarioController");

router.post("/register",registrarUsuario);
router.post("/login",loginUsuario);
router.post("/forgot-password",solicitarCambioPassword);
router.post("/reset-password/:token",restablecerPassword);
router.get("/", obtenerUsuarios);
router.get("/mis-libros/:usuarioId", obtenerMisLibros);
router.get("/:id", obtenerUsuario);
router.put("/:id", actualizarUsuario);
router.delete("/:id", eliminarUsuario);
router.post("/comprar", comprarLibros);
router.post("/comentarios", agregarComentario);
router.get("/comentarios/:libroId", obtenerComentarios);
router.put("/comentarios/:id", editarComentario);

module.exports = router;
