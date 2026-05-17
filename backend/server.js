const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config({ path: "./backend/.env" });

const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true
}));
app.use(express.json());
app.use("/img", express.static("public/img"));
app.use("/pdf", express.static("public/pdf"));

console.log(process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI)
.then(()=> console.log("MongoDB conectado"))
.catch(err => console.log(err));

app.get("/", (req,res)=>{
    res.send("Servidor funcionando");
});

const PORT = process.env.PORT || 5000;

const libroRoutes = require("./routes/libroRoutes");
app.use("/api/libros", libroRoutes);

const usuarioRoutes = require("./routes/usuarioRoutes");
app.use("/api/usuarios", usuarioRoutes);

const pedidoRoutes = require("./routes/pedidoRoutes");
app.use("/api/pedidos", pedidoRoutes);

app.listen(PORT, ()=>{
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
