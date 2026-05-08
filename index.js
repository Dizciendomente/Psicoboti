const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const token = process.env.WHATSAPP_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;

app.get("/", (req, res) => res.send("Bot alive"));

/* Verificación webhook */
app.get("/webhook", (req, res) => {
  const verify_token = "psicoboti123";

  const mode = req.query["hub.mode"];
  const challenge = req.query["hub.challenge"];
  const token_sent = req.query["hub.verify_token"];

  if (mode === "subscribe" && token_sent === verify_token) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

/* Webhook mensajes */
app.post("/webhook", async (req, res) => {
  try {
    console.log("Webhook recibido");

    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) return res.sendStatus(200);

    /* Numero del usuario */
    let from = message.from;
    if (from.startsWith("549")) from = "+54" + from.slice(3);
    else from = "+" + from;

    /* Detectar texto recibido */
    const text = message.text?.body?.toLowerCase() || "";

    /* FUNCION PARA ENVIAR MENSAJES */
    const sendMessage = async (data) => {
      await axios.post(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );
    };

    /* 👉 Si escriben hola → enviar BOTONES */
    if (text.includes("hola")) {
      await sendMessage({
        messaging_product: "whatsapp",
        to: from,
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: "Hola 👋 Soy el asistente automático de Psicobiti.\nElegí una opción:"
          },
          action: {
            buttons: [
              { type: "reply", reply: { id: "turnos", title: "Turnos" } },
              { type: "reply", reply: { id: "precios", title: "Precios" } },
              { type: "reply", reply: { id: "ubicacion", title: "Ubicación" } }
            ]
          }
        }
      });
    }

    res.sendStatus(200);
  } catch (err) {
    console.log("ERROR:", err.response?.data || err.message);
    res.sendStatus(200);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
