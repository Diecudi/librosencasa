const mongoose = require("mongoose");

const libroSchema = new mongoose.Schema({
    titulo:String,
    autor:String,
    genero:String,
    precio:Number,
    descripcion:String,
    imagen:String,
    stock:Number,
    valoracion: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 }
});

module.exports = mongoose.model("Libro", libroSchema);