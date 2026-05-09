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

/* FUNCION ENVIAR */
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

/* NUEVO: DESCARGAR MEDIA (imagen o pdf) */
async function getMediaUrl(mediaId){
  const res = await axios.get(
    `https://graph.facebook.com/v18.0/${mediaId}`,
    { headers:{ Authorization:`Bearer ${token}` } }
  );
  return res.data.url;
}

async function downloadMedia(url){
  return axios.get(url,{
    headers:{ Authorization:`Bearer ${token}` },
    responseType:"arraybuffer"
  });
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
        text:
`Hola 😊 Soy el asistente de Psicoboti.
Puedo ayudarte con información o con la reserva de tu primera sesión.`
      },
      action: {
        buttons: [
          { type: "reply", reply: { id: "turno", title: "Reservar turno" } },
          { type: "reply", reply: { id: "honorarios", title: "Honorarios" } },
          { type: "reply", reply: { id: "modalidad", title: "Modalidades" } }
        ]
      }
    }
  });
}

/* BOTON VOLVER */
async function volverMenu(to){
  await sendMessage({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive:{
      type:"button",
      body:{ text:"¿Querés volver al menú principal?" },
      action:{ buttons:[
        { type:"reply", reply:{ id:"menu", title:"Menú principal"}}
      ]}
    }
  })
}

/* WEBHOOK */
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

    /* ⭐ NUEVO: DETECTAR COMPROBANTE (imagen o PDF) */
    const image = message?.image;
    const documentFile = message?.document;

    if (image || documentFile) {
      const mediaId = image?.id || documentFile?.id;

      try {
        const url = await getMediaUrl(mediaId);
        await downloadMedia(url);

        await sendMessage({
          messaging_product:"whatsapp",
          to:from,
          text:{ body:
`Comprobante recibido ✅

En breve reviso el pago y te confirmo el turno por este medio. Gracias 😊`}
        });

      } catch(err){
        console.log("Error descargando media", err.message);
      }

      return res.sendStatus(200);
    }

    if (text) {
      await sendMainMenu(from);
      return res.sendStatus(200);
    }

    if (btn === "menu") {
      await sendMainMenu(from);
    }

    /* RESERVAR TURNO */
    if (btn === "turno") {
      await sendMessage({
        messaging_product:"whatsapp",
        to:from,
        type:"interactive",
        interactive:{
          type:"button",
          body:{ text:
`Las sesiones tienen una duración aproximada de 40 a 45 minutos.
Trabajamos con un espacio cuidado y personalizado para cada proceso.

Elegí la modalidad:`},
          action:{buttons:[
            { type:"reply", reply:{ id:"virtual", title:"Sesión virtual"} },
            { type:"reply", reply:{ id:"presencial", title:"Sesión presencial"} }
          ]}
        }
      });
    }

    if (btn === "virtual") {
      await sendMessage({
        messaging_product:"whatsapp",
        to:from,
        type:"interactive",
        interactive:{
          type:"button",
          body:{ text:"Turnos virtuales disponibles (martes):" },
          action:{buttons:[
            { type:"reply", reply:{ id:"v10", title:"10:00"} },
            { type:"reply", reply:{ id:"v14", title:"14:00"} },
            { type:"reply", reply:{ id:"v15", title:"15:00"} }
          ]}
        }
      });
    }

    if (btn === "presencial") {
      await sendMessage({
        messaging_product:"whatsapp",
        to:from,
        type:"interactive",
        interactive:{
          type:"button",
          body:{ text:"Elegí el consultorio:" },
          action:{buttons:[
            { type:"reply", reply:{ id:"mg", title:"Monte Grande"} },
            { type:"reply", reply:{ id:"abril", title:"9 de Abril"} }
          ]}
        }
      });
    }

    if (btn === "mg") {
      await sendMessage({
        messaging_product:"whatsapp",
        to:from,
        type:"interactive",
        interactive:{
          type:"button",
          body:{ text:"Consultorio Monte Grande – Las Heras 557" },
          action:{buttons:[
            { type:"reply", reply:{ id:"l16", title:"Lunes 16:00"} },
            { type:"reply", reply:{ id:"m17", title:"Miércoles 17:00"} }
          ]}
        }
      });
    }

    if (btn === "abril") {
      await sendMessage({
        messaging_product:"whatsapp",
        to:from,
        type:"interactive",
        interactive:{
          type:"button",
          body:{ text:"Consultorio 9 de Abril – Restelli 1159 B" },
          action:{buttons:[
            { type:"reply", reply:{ id:"j16", title:"Jueves 16:00"} },
            { type:"reply", reply:{ id:"j17", title:"Jueves 17:00"} }
          ]}
        }
      });
    }

    const horarios = ["v10","v14","v15","l16","m17","j16","j17"];
    if (horarios.includes(btn)) {
      await sendMessage({
        messaging_product:"whatsapp",
        to:from,
        text:{ body:
`✨ Para confirmar el turno se solicita una seña del 50% ($18.500).

Alias: dizciendomente.psi

Luego enviá:
• Nombre y apellido  
• Edad  
• Motivo de consulta  
• Comprobante de transferencia  

Una vez recibido, el turno queda confirmado.`}
      });
      await volverMenu(from);
    }

    if (btn === "honorarios") {
      await sendMessage({
        messaging_product:"whatsapp",
        to:from,
        text:{ body:
`El valor de la sesión es de $37.000.

Se trata de un espacio individual, confidencial y personalizado, orientado a generar cambios reales y sostenibles en el tiempo.

La reserva del turno se realiza con una seña del 50%.`}
      });
      await volverMenu(from);
    }

    if (btn === "modalidad") {
      await sendMessage({
        messaging_product:"whatsapp",
        to:from,
        text:{ body:
`Se brinda atención psicológica a adolescentes (15+) y adultos.

Modalidad virtual: martes.
Modalidad presencial:
• Monte Grande (lunes y miércoles)
• 9 de Abril (jueves)`}
      });
      await volverMenu(from);
    }

    res.sendStatus(200);
  } catch (err) {
    console.log(err.response?.data || err.message);
    res.sendStatus(200);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
