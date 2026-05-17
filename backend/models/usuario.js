const mongoose = require("mongoose");

const usuarioSchema = new mongoose.Schema({

    nombre:{
        type:String,
        required:true
    },

    email:{
        type:String,
        required:true,
        unique:true
    },

    password:{
        type:String,
        required:true
    },

    rol:{
        type:String,
        default:"usuario"
    },

    passwordTemporal:{
        type:Boolean,
        default:true
    },

    resetPasswordToken:{
        type:String
    },

    resetPasswordExpira:{
        type:Date
    }

});

module.exports = mongoose.model(
    "Usuario",
    usuarioSchema
);
