const mongoose = require("mongoose");

const comentarioSchema = new mongoose.Schema({
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
    libroId: { type: String, required: true },
    nombreUsuario: { type: String, required: true },
    valoracion: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, required: true },
    fecha: { type: Date, default: Date.now }
}, { collection: 'usuarios_comentarios' });

module.exports = mongoose.model("Comentario", comentarioSchema);