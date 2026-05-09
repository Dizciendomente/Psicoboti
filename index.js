const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const token = process.env.WHATSAPP_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;

const userState = {};

app.get("/", (req,res)=> res.send("Bot alive"));

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

async function sendMessage(data){
  await axios.post(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    data,
    {
      headers:{
        Authorization:`Bearer ${token}`,
        "Content-Type":"application/json"
      }
    }
  );
}

async function sendMainMenu(to){
  await sendMessage({
    messaging_product:"whatsapp",
    to,
    type:"interactive",
    interactive:{
      type:"button",
      body:{
        text:
`Hola 😊 Soy el asistente de Psicoboti.
Puedo ayudarte con información o con la reserva de tu primera sesión.`
      },
      action:{
        buttons:[
          {type:"reply", reply:{id:"turno", title:"Reservar turno"}},
          {type:"reply", reply:{id:"honorarios", title:"Honorarios"}},
          {type:"reply", reply:{id:"modalidad", title:"Modalidades"}}
        ]
      }
    }
  });
}

app.post("/webhook", async (req,res)=>{
  try{
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if(!message) return res.sendStatus(200);

    let from = message.from;
    if(from.startsWith("549")) from = "+54" + from.slice(3);
    else from = "+" + from;

    /* 🔴 NUEVO: DETECTAR IMAGEN (comprobante) */
    if(message.type === "image"){
      await sendMessage({
        messaging_product:"whatsapp",
        to:from,
        text:{
          body:
`¡Comprobante recibido! 😊

Tu turno quedó reservado de manera provisoria.
En breve recibirás la confirmación final con los datos del encuentro.

Gracias por confiar en Psicoboti 💛`
        }
      });
      return res.sendStatus(200);
    }

    /* BOTONES */
    if(message.type === "interactive"){
      const buttonId = message.interactive.button_reply.id;

      if(buttonId === "turno"){
        userState[from] = "turnos";
        await sendMessage({
          messaging_product:"whatsapp",
          to:from,
          text:{
            body:
`Las sesiones duran aproximadamente 40/45 minutos.

Horarios disponibles:
Lunes 16hs (Monte Grande)
Miércoles 17hs (Monte Grande)
Jueves 16 o 17hs (9 de Abril)
Martes 10, 14 o 15hs (Virtual)

Escribí el horario que querés reservar ✨`
          }
        });
      }

      if(buttonId === "honorarios"){
        await sendMessage({
          messaging_product:"whatsapp",
          to:from,
          text:{
            body:
`El valor de la sesión es $37.000.

Para reservar el turno se solicita una seña del 50%.
Alias: dizciendomente.psi

La seña asegura el espacio exclusivo para vos 💛`
          }
        });
      }

      if(buttonId === "modalidad"){
        await sendMessage({
          messaging_product:"whatsapp",
          to:from,
          text:{
            body:
`Se brinda atención a adolescentes (15+) y adultos.

Modalidad virtual: martes.
Presencial:
• Monte Grande (Las Heras 557)
• 9 de Abril (Restelli 1159 B)`
          }
        });
      }

      return res.sendStatus(200);
    }

    /* TEXTO NORMAL */
    if(message.type === "text"){
      if(userState[from] === "turnos"){
        userState[from] = "esperando_datos";
        await sendMessage({
          messaging_product:"whatsapp",
          to:from,
          text:{
            body:
`Perfecto 😊

Para continuar necesito:
• Nombre y apellido
• Edad
• Motivo de consulta

Luego podrás enviar el comprobante de la seña 💛`
          }
        });
        return res.sendStatus(200);
      }

      if(userState[from] === "esperando_datos"){
        userState[from] = "esperando_pago";
        await sendMessage({
          messaging_product:"whatsapp",
          to:from,
          text:{
            body:
`Gracias por la información ✨

Para confirmar el turno enviá la seña del 50%.
Alias: dizciendomente.psi

Cuando tengas el comprobante, envialo por acá 📩`
          }
        });
        return res.sendStatus(200);
      }

      await sendMainMenu(from);
    }

    res.sendStatus(200);
  }catch(err){
    console.log(err.response?.data || err.message);
    res.sendStatus(200);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log("Server running"));
