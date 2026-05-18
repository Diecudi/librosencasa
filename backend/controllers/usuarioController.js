const Usuario = require("../models/usuario");

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const fs = require("fs");
const { Resend } = require("resend");
const path = require("path");
const { enviarCorreoRecuperacion } = require("../services/emailService");
const Comentario = require("../models/Comentario");
const Libro = require("../models/libro");
const Pedido = require("../models/pedido");

const registrarUsuario = async (req,res)=>{

    try{

        const nombre = req.body.nombre?.trim();
        const email = req.body.email?.trim().toLowerCase();
        const { password, rol } = req.body;

        if(!nombre || !email || !password){
            return res.status(400).json({
                msg:"Nombre, email y contraseña son obligatorios"
            });
        }

        if(password.length < 6){
            return res.status(400).json({
                msg:"La contraseña debe tener al menos 6 caracteres"
            });
        }

        const existe = await Usuario.findOne({
            email
        });

        if(existe){

            return res.status(400).json({
                msg:"El usuario ya existe"
            });

        }

        const passwordHash =
            await bcrypt.hash(password,10);

        const usuario = new Usuario({

            nombre,
            email,

            password: passwordHash,

            rol: rol || "usuario",

            passwordTemporal:false

        });

        await usuario.save();

        res.json({
            msg:"Usuario registrado",
            usuario:{
                id: usuario._id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol
            }
        });

    }catch(error){

        res.status(500).json(error);

    }

}

const loginUsuario = async (req,res)=>{
    try{
        const email = req.body.email?.trim().toLowerCase();
        const { password } = req.body;

        if(!email || !password){
            return res.status(400).json({
                msg:"Email y contraseña son obligatorios"
            });
        }

        const usuario = await Usuario.findOne({ email });

        if(!usuario){
            return res.status(401).json({
                msg:"Credenciales incorrectas"
            });
        }

        const passwordValido = await bcrypt.compare(password, usuario.password);

        if(!passwordValido){
            return res.status(401).json({
                msg:"Credenciales incorrectas"
            });
        }

        const token = jwt.sign(
            {
                id: usuario._id,
                email: usuario.email,
                rol: usuario.rol
            },
            process.env.JWT_SECRET || "clave_super_segura",
            {
                expiresIn:"8h"
            }
        );

        res.json({
            msg:"Sesion iniciada",
            token,
            usuario:{
                id: usuario._id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol
            }
        });
    }catch(error){
        res.status(500).json({
            msg:"Error al iniciar sesion",
            error
        });
    }
};

const solicitarCambioPassword = async (req,res)=>{
    try{
        const email = req.body.email?.trim().toLowerCase();

        if(!email){
            return res.status(400).json({
                msg:"El email es obligatorio"
            });
        }

        const usuario = await Usuario.findOne({ email });

        if(!usuario){
            return res.json({
                msg:"Si el correo existe, recibiras un enlace para cambiar tu contraseña"
            });
        }

        const tokenPlano = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(tokenPlano).digest("hex");
        const clienteUrl = process.env.CLIENT_URL || "http://localhost:3000";
        const resetLink = `${clienteUrl}/reset-password/${tokenPlano}`;

        usuario.resetPasswordToken = tokenHash;
        usuario.resetPasswordExpira = Date.now() + 60 * 60 * 1000;
        await usuario.save();

        const resultadoCorreo = await enviarCorreoRecuperacion({
            email: usuario.email,
            nombre: usuario.nombre,
            resetLink
        });

        res.json({
            msg:"Si el correo existe, recibiras un enlace para cambiar tu contraseña",
            correoEnviado: resultadoCorreo.enviado,
            resetLink: resultadoCorreo.enviado ? undefined : resetLink
        });
    }catch(error){
        res.status(500).json({
            msg:"Error al solicitar cambio de contraseña",
            error
        });
    }
};

const restablecerPassword = async (req,res)=>{
    try{
        const { token } = req.params;
        const { password } = req.body;

        if(!password || password.length < 6){
            return res.status(400).json({
                msg:"La nueva contraseña debe tener al menos 6 caracteres"
            });
        }

        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

        const usuario = await Usuario.findOne({
            resetPasswordToken: tokenHash,
            resetPasswordExpira: { $gt: Date.now() }
        });

        if(!usuario){
            return res.status(400).json({
                msg:"El enlace es invalido o ha expirado"
            });
        }

        usuario.password = await bcrypt.hash(password, 10);
        usuario.passwordTemporal = false;
        usuario.resetPasswordToken = undefined;
        usuario.resetPasswordExpira = undefined;
        await usuario.save();

        res.json({
            msg:"Contraseña actualizada correctamente"
        });
    }catch(error){
        res.status(500).json({
            msg:"Error al restablecer contraseña",
            error
        });
    }
};

const obtenerUsuarios = async (req, res) => {
    try {
        const usuarios = await Usuario.find().select("-password");
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener usuarios", error });
    }
};

const obtenerUsuario = async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.params.id).select("-password");
        if (!usuario) return res.status(404).json({ msg: "Usuario no encontrado" });
        res.json(usuario);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener usuario", error });
    }
};

const actualizarUsuario = async (req, res) => {
    try {
        const { password, ...datosActualizar } = req.body;
        const usuarioActualizado = await Usuario.findByIdAndUpdate(req.params.id, datosActualizar, { returnDocument: 'after' }).select("-password");
        if (!usuarioActualizado) return res.status(404).json({ msg: "Usuario no encontrado" });
        res.json(usuarioActualizado);
    } catch (error) {
        res.status(500).json({ msg: "Error al actualizar usuario", error });
    }
};

const eliminarUsuario = async (req, res) => {
    try {
        const usuarioEliminado = await Usuario.findByIdAndDelete(req.params.id);
        if (!usuarioEliminado) return res.status(404).json({ msg: "Usuario no encontrado" });
        res.json({ msg: "Usuario eliminado" });
    } catch (error) {
        res.status(500).json({ msg: "Error al eliminar usuario", error });
    }
};

const comprarLibros = async (req, res) => {
    try {
        const { email, items, usuarioId } = req.body;

        if (!email || !items || items.length === 0) {
            return res.status(400).json({ msg: "Email y los items son obligatorios" });
        }

        // 1. Verificamos que el usuario no haya comprado ninguno de estos libros antes
        if (usuarioId) {
            for (const item of items) {
                const existe = await Pedido.findOne({
                    usuario: usuarioId,
                    "productos.libro": item._id
                });
                if (existe) {
                    return res.status(400).json({ msg: `Ya tienes el libro "${item.titulo}" en tu biblioteca.` });
                }
            }
        }

        // Configuración de Resend
        const resend = new Resend(process.env.RESEND_API_KEY);

        // Mapear los archivos de la compra para adjuntarlos
        const frontendUrl = process.env.CLIENT_URL || "https://librosencasa.vercel.app";
        const attachments = items.map((item) => {
            // Como los PDFs están en Vercel, usamos la URL pública para que Resend los descargue y adjunte
            const pdfUrl = item.pdf.startsWith("http") ? item.pdf : `${frontendUrl}${item.pdf}`;
            return { filename: `${item.titulo}.pdf`, path: pdfUrl };
        });

        // 2. Guardamos la compra en la base de datos PRIMERO
        if (usuarioId) {
            const nuevoPedido = new Pedido({
                usuario: usuarioId,
                productos: items.map(item => ({ libro: item._id, cantidad: 1, precio: item.precio })),
                total: items.reduce((acc, curr) => acc + curr.precio, 0)
            });
            await nuevoPedido.save();
        }

        // 3. Intentamos enviar el correo
        const remitente = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

        try {
            const data = await resend.emails.send({
                from: `Libros en Casa <${remitente}>`,
                to: email,
                subject: "¡Aquí tienes tus libros digitales comprados! 📚",
                html: `<p>Hola,</p>
                       <p>¡Gracias por tu compra en Libros en Casa!</p>
                       <p>Adjuntamos a este correo los archivos PDF físicos de los libros que acabas de adquirir para que puedas descargarlos de inmediato.</p>
                       <p>¡Feliz lectura!</p>`,
                attachments
            });

            if (data.error) {
                console.error("Error de Resend:", data.error);
                return res.json({ msg: "¡Compra exitosa! Ya puedes leer el libro en 'Usuario > Tu Biblioteca'. (El correo no se pudo enviar)." });
            }

            res.json({ msg: "Compra exitosa, archivos enviados por correo." });
        } catch (emailError) {
            console.error("Error al enviar con Resend:", emailError.message);
            res.json({ msg: "¡Compra exitosa! Ya puedes leer el libro en 'Usuario > Tu Biblioteca'. (Nota: Hubo un fallo al enviar el correo)." });
        }
    } catch (error) {
        console.error("Error al enviar correos con PDFs:", error);
        res.status(500).json({ msg: "Error al procesar la compra", error });
    }
};

const obtenerMisLibros = async (req, res) => {
    try {
        const { usuarioId } = req.params;
        const pedidos = await Pedido.find({ usuario: usuarioId });
        
        const idsLibros = [];
        pedidos.forEach(pedido => {
            if (pedido.productos) {
                pedido.productos.forEach(prod => {
                    if (prod.libro) idsLibros.push(prod.libro);
                });
            }
        });
        
        const librosComprados = await Libro.find({ _id: { $in: idsLibros } });
        res.json(librosComprados);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener mis libros", error });
    }
};

const actualizarValoracionLibro = async (libroId) => {
    try {
        const comentarios = await Comentario.find({ libroId });
        const totalReviews = comentarios.length;
        
        let valoracionPromedio = 0;
        if (totalReviews > 0) {
            const sumaValoraciones = comentarios.reduce((acc, curr) => acc + curr.valoracion, 0);
            valoracionPromedio = sumaValoraciones / totalReviews;
        }

        await Libro.findByIdAndUpdate(libroId, {
            valoracion: valoracionPromedio,
            totalReviews
        });
    } catch (error) {
        console.error("Error al actualizar la valoración del libro:", error);
    }
};

const agregarComentario = async (req, res) => {
    try {
        const { usuarioId, libroId, valoracion, review, nombreUsuario } = req.body;
        if (!usuarioId || !libroId || !valoracion || !review) {
            return res.status(400).json({ msg: "Todos los campos son obligatorios" });
        }
        const nuevoComentario = new Comentario({ usuarioId, libroId, valoracion, review, nombreUsuario });
        await nuevoComentario.save();
        
        await actualizarValoracionLibro(libroId);
        
        res.json({ msg: "Comentario guardado correctamente", comentario: nuevoComentario });
    } catch (error) {
        res.status(500).json({ msg: "Error al guardar el comentario", error });
    }
};

const obtenerComentarios = async (req, res) => {
    try {
        const { libroId } = req.params;
        const comentarios = await Comentario.find({ libroId }).sort({ fecha: -1 }); // Los más recientes primero
        res.json(comentarios);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener comentarios", error });
    }
};

const editarComentario = async (req, res) => {
    try {
        const { id } = req.params;
        const { valoracion, review } = req.body;
        const comentarioActualizado = await Comentario.findByIdAndUpdate(
            id,
            { valoracion, review, fecha: Date.now() },
            { returnDocument: 'after' }
        );
        if (!comentarioActualizado) return res.status(404).json({ msg: "Comentario no encontrado" });
        
        await actualizarValoracionLibro(comentarioActualizado.libroId);
        
        res.json({ msg: "Comentario actualizado", comentario: comentarioActualizado });
    } catch (error) {
        res.status(500).json({ msg: "Error al actualizar comentario", error });
    }
};

module.exports = {
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
};
