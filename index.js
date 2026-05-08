const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const token = process.env.WHATSAPP_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;

app.get("/", (req, res) => res.send("Bot alive"));

/* VERIFICACION WEBHOOK */
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

/* FUNCION PARA ENVIAR MENSAJES */
async function sendMessage(body) {
  return axios.post(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    body,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  );
}

/* MENU PRINCIPAL */
async function sendMainMenu(to) {
  await sendMessage({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: "Hola 👋 Soy el asistente de Psicoboti.\n¿En qué puedo ayudarte?"
      },
      action: {
        buttons: [
          { type: "reply", reply: { id: "turno", title: "Sacar turno" } },
          { type: "reply", reply: { id: "honorarios", title: "Honorarios" } },
          { type: "reply", reply: { id: "modalidad", title: "Modalidad" } }
        ]
      }
    }
  });
}

/* RECEPCION DE MENSAJES */
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) return res.sendStatus(200);

    let from = message.from;
    if (from.startsWith("549")) from = "+54" + from.slice(3);
    else from = "+" + from;

    const btn = message?.interactive?.button_reply?.id;
    const text = message?.text?.body;

    /* PRIMER MENSAJE */
    if (text) {
      await sendMainMenu(from);
      return res.sendStatus(200);
    }

    /* MENU -> SACAR TURNO */
    if (btn === "turno") {
      await sendMessage({
        messaging_product: "whatsapp",
        to: from,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: "Las sesiones duran 40-45 min.\nElegí modalidad:" },
          action: {
            buttons: [
              { type: "reply", reply: { id: "virtual", title: "Virtual" } },
              { type: "reply", reply: { id: "presencial", title: "Presencial" } }
            ]
          }
        }
      });
    }

    /* VIRTUAL */
    if (btn === "virtual") {
      await sendMessage({
        messaging_product: "whatsapp",
        to: from,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: "Turnos virtuales disponibles:" },
          action: {
            buttons: [
              { type: "reply", reply: { id: "v10", title: "Martes 10:00" } },
              { type: "reply", reply: { id: "v14", title: "Martes 14:00" } },
              { type: "reply", reply: { id: "v15", title: "Martes 15:00" } }
            ]
          }
        }
      });
    }

    /* PRESENCIAL -> SEDES */
    if (btn === "presencial") {
      await sendMessage({
        messaging_product: "whatsapp",
        to: from,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: "Elegí consultorio:" },
          action: {
            buttons: [
              { type: "reply", reply: { id: "mg", title: "Monte Grande" } },
              { type: "reply", reply: { id: "abril", title: "9 de Abril" } }
            ]
          }
        }
      });
    }

    /* MONTE GRANDE */
    if (btn === "mg") {
      await sendMessage({
        messaging_product: "whatsapp",
        to: from,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: "Monte Grande – Las Heras 557" },
          action: {
            buttons: [
              { type: "reply", reply: { id: "l16", title: "Lunes 16:00" } },
              { type: "reply", reply: { id: "m17", title: "Miércoles 17:00" } }
            ]
          }
        }
      });
    }

    /* 9 DE ABRIL */
    if (btn === "abril") {
      await sendMessage({
        messaging_product: "whatsapp",
        to: from,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: "9 de Abril – Restelli 1159 B" },
          action: {
            buttons: [
              { type: "reply", reply: { id: "j16", title: "Jueves 16:00" } },
              { type: "reply", reply: { id: "j17", title: "Jueves 17:00" } }
            ]
          }
        }
      });
    }

    /* MENSAJE FINAL RESERVA */
    const horarios = ["v10","v14","v15","l16","m17","j16","j17"];
    if (horarios.includes(btn)) {
      await sendMessage({
        messaging_product: "whatsapp",
        to: from,
        text: {
          body:
`Perfecto 😊

El turno queda reservado enviando la seña del 50% ($18.500) al alias:
*dizciendomente.psi*

Respondé con:
• Nombre y apellido
• Edad
• Motivo de consulta
• Comprobante de transferencia

Una vez enviado, el turno queda confirmado.`
        }
      });
    }

    /* HONORARIOS */
    if (btn === "honorarios") {
      await sendMessage({
        messaging_product: "whatsapp",
        to: from,
        text: {
          body:
`Valor de sesión: $37.000
Duración: 40-45 minutos
Reserva con 50% de seña.`
        }
      });
    }

    /* MODALIDAD */
    if (btn === "modalidad") {
      await sendMessage({
        messaging_product: "whatsapp",
        to: from,
        text: {
          body:
`Atención a adolescentes (15+) y adultos.

Virtual: martes
Presencial:
• Monte Grande (Lun/Mié)
• 9 de Abril (Jue)`
        }
      });
    }

    res.sendStatus(200);

  } catch (err) {
    console.log(err.response?.data || err.message);
    res.sendStatus(200);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
