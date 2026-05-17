const Pedido = require("../models/pedido");

const crearPedido = async (req, res) => {
    try {
        const nuevoPedido = new Pedido(req.body);
        await nuevoPedido.save();
        res.status(201).json(nuevoPedido);
    } catch (error) {
        res.status(500).json({ msg: "Error al crear el pedido", error });
    }
};

const obtenerPedidos = async (req, res) => {
    try {
        const pedidos = await Pedido.find();
        res.json(pedidos);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener los pedidos", error });
    }
};

const obtenerPedido = async (req, res) => {
    try {
        const pedido = await Pedido.findById(req.params.id);
        if (!pedido) return res.status(404).json({ msg: "Pedido no encontrado" });
        res.json(pedido);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener el pedido", error });
    }
};

const actualizarPedido = async (req, res) => {
    try {
        const pedidoActualizado = await Pedido.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!pedidoActualizado) return res.status(404).json({ msg: "Pedido no encontrado" });
        res.json(pedidoActualizado);
    } catch (error) {
        res.status(500).json({ msg: "Error al actualizar el pedido", error });
    }
};

const eliminarPedido = async (req, res) => {
    try {
        const pedidoEliminado = await Pedido.findByIdAndDelete(req.params.id);
        if (!pedidoEliminado) return res.status(404).json({ msg: "Pedido no encontrado" });
        res.json({ msg: "Pedido eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ msg: "Error al eliminar el pedido", error });
    }
};

module.exports = {
    crearPedido, obtenerPedidos, obtenerPedido, actualizarPedido, eliminarPedido
};