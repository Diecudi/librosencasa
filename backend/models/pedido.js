const mongoose = require("mongoose");

const pedidoSchema = new mongoose.Schema({

    usuario:{
        type:String
    },

    productos:[
        {
            libro: String,
            titulo:String,
            cantidad:Number,
            precio:Number
        }
    ],

    total:Number,

    fecha:{
        type:Date,
        default:Date.now
    }

});

module.exports = mongoose.model(
    "Pedido",
    pedidoSchema
);