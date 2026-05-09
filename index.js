const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const token = process.env.WHATSAPP_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;

const pacientesActivos = new Set();

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

/* DESCARGAR MEDIA */
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
`✨ ¡Bienvenido/a a Dizciendomente Psicología! Ψ 

Gracias por comunicarte 😊  

Estoy acá para ayudarte con información y/o para coordinar tu primera sesión.

Podés elegir una opción para continuar 👇🏼`
      },
      action: {
  buttons: [
    { type: "reply", reply: { id: "paciente", title: "👤 Soy paciente" } },
    { type: "reply", reply: { id: "nuevo", title: "✨ Soy nuevo/a" } }
  ]
}
    }
  });
}

/* NUEVO MENU */
async function sendMenuNuevo(to) {
  await sendMessage({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: "Podés elegir una opción para continuar 👇🏼"
      },
      action: {
        buttons: [
          { type: "reply", reply: { id: "turno", title: "📅 Reservar turno" } },
          { type: "reply", reply: { id: "modalidad", title: "✨ Modalidades" } },
          { type: "reply", reply: { id: "otros", title: "➕ Otros temas" } }
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
      body:{ text:"🔙 ¿Querés volver atrás?" },
      action:{ buttons:[
        { type:"reply", reply:{ id:"menu_nuevo", title:"↩️ Menú principal"}}
      ]}
    }
  })
}

/* NUEVO BOTON IR A TURNOS */
async function irATurnos(to){
  await sendMessage({
    messaging_product:"whatsapp",
    to,
    type:"interactive",
    interactive:{
      type:"button",
      body:{ text:"📅 ¿Querés reservar un turno?" },
      action:{ buttons:[
        { type:"reply", reply:{ id:"turno", title:"📅 Reservar turno"}}
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
`✅ Comprobante recibido 

Voy a chequear el pago y en breve te confirmo el turno por este medio.

¡Muchas gracias! 😊`}
        });

      } catch(err){
        console.log("Error descargando media", err.message);
      }

      return res.sendStatus(200);
    }

    if (text && !btn) {

  // 👉 si es paciente, no respondemos
  if (pacientesActivos.has(from)) {
    return res.sendStatus(200);
  }

  // 👉 si no es paciente, mostramos menú
  await sendMainMenu(from);
  return res.sendStatus(200);
}

    if (btn === "menu") {
      await sendMainMenu(from);
    }

    if (btn === "menu_nuevo") {
  await sendMenuNuevo(from);
}
    /* USUARIO NUEVO */
if (btn === "nuevo") {
  await sendMessage({
    messaging_product: "whatsapp",
    to: from,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: `Gracias por escribir 😊
        
        Podés elegir una opción para continuar 👇🏼`
      },
      action: {
        buttons: [
          { type: "reply", reply: { id: "turno", title: "📅 Reservar turno" } },
          { type: "reply", reply: { id: "modalidad", title: "✨ Modalidades" } },
          { type: "reply", reply: { id: "otros", title: "➕ Otros temas" } }
        ]
      }
    }
  });
}

    /* USUARIO PACIENTE */
if (btn === "paciente") {
  pacientesActivos.add(from);
  
  await sendMessage({
    messaging_product:"whatsapp",
    to:from,
    text:{ body:
`Perfecto 😊

Podés escribirme por acá lo que necesites y te respondo a la brevedad.`}
  });
}
    
/* OTROS TEMAS */
if (btn === "otros") {
  await sendMessage({
    messaging_product:"whatsapp",
    to:from,
    type:"interactive",
    interactive:{
      type:"button",
      body:{ text:"Podes elegir entre estas otras opciones 👇🏼" },
      action:{ buttons:[
        { type:"reply", reply:{ id:"honorarios", title:"💲 Precio"} },
        { type:"reply", reply:{ id:"asesor", title:"💬 Hablar con Flor"} },
        { type:"reply", reply:{ id:"menu", title:"🔙 Volver"} }
      ]}
    }
  });
}
    /* HABLAR CON ASESOR */
if (btn === "asesor") {
  await sendMessage({
    messaging_product:"whatsapp",
    to:from,
    text:{ body:
`Podés escribirme tu consulta por acá 😊

En breve te voy a estar respondiendo personalmente.`}
  });
}
    
    /* TURNOS */
    if (btn === "turno") {
      await sendMessage({
        messaging_product:"whatsapp",
        to:from,
        type:"interactive",
        interactive:{
          type:"button",
          body:{ text:
`⏳ Las sesiones tienen una duración aproximada de *40 a 45 minutos*. 

✔️ Es un espacio cuidado, pensado para acompañarte de forma personalizada en tu proceso

Podés elegir la modalidad 👇🏼`},
          action:{buttons:[
            { type:"reply", reply:{ id:"virtual", title:"👩🏼‍💻 Sesion Virtual"} },
            { type:"reply", reply:{ id:"presencial", title:"🙍🏼‍♀️ Sesion Presencial"} }
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
          body:{ text:`💻 *Turnos virtuales* - días Martes
          \nPodés elegir el horario que mejor te quede! 👇🏼`},
          action:{buttons:[
            { type:"reply", reply:{ id:"v10", title:"📅 10:00 hs"} },
            { type:"reply", reply:{ id:"v14", title:"📅 14:00 hs"} },
            { type:"reply", reply:{ id:"v15", title:"📅 15:00 hs"} }
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
          body:{ text:"Elegí el consultorio más cercano a vos! 👇🏼" },
          action:{buttons:[
            { type:"reply", reply:{ id:"mg", title:"📍 Monte Grande"} },
            { type:"reply", reply:{ id:"abril", title:"📍 9 de Abril"} }
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
          body:{ text:
            `🔹*Espacio Retravallier*
            Las Heras 557, Monte Grande
            \nElegí el día y horario disponible 👇🏼`},
          action:{buttons:[
            { type:"reply", reply:{ id:"l16", title:"📅 Lunes 16:00 hs"} },
            { type:"reply", reply:{ id:"m17", title:"📅 Miércoles 17:00hs"} }
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
          body:{ text:
            `🔹*Consultorio Restelli*
            Restelli 1159 "B", Barrio 9 de Abril
            
            \nElegí el día y horario disponible 👇🏼`},
          action:{buttons:[
            { type:"reply", reply:{ id:"j16", title:"📅 Jueves 16:00 hs"} },
            { type:"reply", reply:{ id:"j17", title:"📅 Jueves 17:00 hs"} }
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
`✨ Para confirmar el turno se realiza una seña del *50% del valor de la sesión ($18.500)*

Alias: *dizciendomente.psi*

Una vez realizado el pago, por favor enviá:
• Nombre y apellido del paciente
• Edad  
• Motivo de inicio de terapia
• Comprobante de transferencia

✔️ Con esto la reserva queda confirmada`}
      });
      await volverMenu(from);
    }

    /* HONORARIOS */
    if (btn === "honorarios") {
      await sendMessage({
        messaging_product:"whatsapp",
        to:from,
        text:{ body:
`💲 El valor de la sesión es de *$37.000*, que podés abonarlos por *transferencia* o en *efectivo*.

✔️ La reserva del turno se realiza con una *seña del 50%* mediante transferencia.

🫂 Es un espacio *individual, confidencial y personalizado*, orientado a generar cambios reales y sostenibles en el tiempo.`}
      });
      await irATurnos(from); // 👈 CAMBIO ACA
    }

    /* MODALIDADES */
    if (btn === "modalidad") {
      await sendMessage({
        messaging_product:"whatsapp",
        to:from,
        text:{ body:
`✨ *Modalidades de atención disponibles:*

• Virtual (Martes)
• Presencial en Monte Grande (Lunes y Miércoles)
• Presencial en 9 de Abril (Jueves)

✔️ Atención psicológica para adolescentes (15+) y adultos.`}
      });
      await irATurnos(from); // 👈 CAMBIO ACA
    }

    res.sendStatus(200);
  } catch (err) {
    console.log(err.response?.data || err.message);
    res.sendStatus(200);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
