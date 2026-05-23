const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

require("dns").setDefaultResultOrder("ipv4first");

const app = express();

const conectarDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {});
        console.log("✅ Conexión exitosa a MongoDB Atlas");
    } catch (error) {
        console.error("❌ Error al conectar a MongoDB:", error.message);
        process.exit(1);
    }
};

// Ejecutamos la función para que se conecte al arrancar el servidor
conectarDB();


app.use(cors({
    origin: "https://librosencasa.vercel.app",
    credentials: true
}));
app.use(express.json());
app.use("/img", express.static("public/img"));
app.use("/pdf", express.static("public/pdf"));

console.log(process.env.MONGO_URI);

//mongoose.connect(process.env.MONGO_URI)
//.then(()=> console.log("MongoDB conectado"))
//.catch(err => console.log(err));

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
