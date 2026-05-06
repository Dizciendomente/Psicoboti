const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const token = process.env.WHATSAPP_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;

app.get("/", (req,res)=>{
  res.send("Bot funcionando");
});

app.post("/webhook", async (req, res) => {
  try {
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return res.sendStatus(200);

    const from = message.from;
    const text = message.text?.body?.toLowerCase();

    let reply = "Hola 😊 Soy el asistente automático.\n\nOpciones:\n1️⃣ Turnos\n2️⃣ Precios\n3️⃣ Ubicación";

    if (text?.includes("1")) reply = "Para turnos escribí: TURNOS";
    if (text?.includes("2")) reply = "Sesión: $XXXX";
    if (text?.includes("3")) reply = "Estamos en Buenos Aires.";

    await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        text: { body: reply }
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.sendStatus(200);
  } catch (e) {
    res.sendStatus(500);
  }
});

app.listen(3000, ()=> console.log("Server running"));
