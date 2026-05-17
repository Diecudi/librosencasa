const express = require("express");
const router = express.Router();

const {
    crearPedido,
    obtenerPedidos,
    obtenerPedido,
    actualizarPedido,
    eliminarPedido
} = require("../controllers/pedidoController");

router.post("/", crearPedido);
router.get("/", obtenerPedidos);
router.get("/:id", obtenerPedido);
router.put("/:id", actualizarPedido);
router.delete("/:id", eliminarPedido);

module.exports = router;