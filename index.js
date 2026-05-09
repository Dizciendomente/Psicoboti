const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const token = process.env.WHATSAPP_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;

const userState = {};

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

/* ===== MENU PRINCIPAL ===== */
async function sendMainMenu(to){
  await sendMessage({
    messaging_product:"whatsapp",
    to,
    type:"interactive",
    interactive:{
      type:"button",
      body:{
        text:`Hola 😊 Soy el asistente de Psicoboti.

Puedo ayudarte con información o con la reserva de tu primera sesión.`
      },
      action:{
        buttons:[
          {type:"reply", reply:{id:"turno", title:"Reservar turno"}},
          {type:"reply", reply:{id:"honorarios", title:"Honorarios"}},
          {type:"reply", reply:{id:"modalidad", title:"Modalidades"}},
          {type:"reply", reply:{id:"menu", title:"Menú"}}
        ]
      }
    }
  });
}

/* ===== LISTA DE HORARIOS (BOTONES GRANDES) ===== */
async function sendHorarios(to){
  await sendMessage({
    messaging_product:"whatsapp",
    to,
    type:"interactive",
    interactive:{
      type:"list",
      body:{
        text:`Elegí el horario disponible que prefieras 😊

Duración de sesión: 40 a 45 min`
      },
      action:{
        button:"Ver horarios",
        sections:[
          {
            title:"Disponibles",
            rows:[
              {id:"lun16", title:"Lunes 16hs (Monte Grande)"},
              {id:"mie17", title:"Miércoles 17hs (Monte Grande)"},
              {id:"jue16", title:"Jueves 16hs (9 de Abril)"},
              {id:"jue17", title:"Jueves 17hs (9 de Abril)"},
              {id:"mar10", title:"Martes 10hs (Virtual)"},
              {id:"mar14", title:"Martes 14hs (Virtual)"},
              {id:"mar15", title:"Martes 15hs (Virtual)"}
            ]
          }
        ]
      }
    }
  });
}

app.get("/", (req,res)=> res.send("Bot alive"));

/* ===== VERIFICACION WEBHOOK ===== */
app.get("/webhook",(req,res)=>{
  const verify_token="psicoboti123";
  if(req.query["hub.verify_token"]===verify_token){
    return res.send(req.query["hub.challenge"]);
  }
  res.sendStatus(403);
});

/* ===== RECEPCION MENSAJES ===== */
app.post("/webhook", async(req,res)=>{
  try{
    const message=req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if(!message) return res.sendStatus(200);

    let from=message.from;
    if(from.startsWith("549")) from="+54"+from.slice(3);
    else from="+"+from;

    /* ===== SI ENVIA IMAGEN (COMPROBANTE) ===== */
    if(message.type==="image"){
      await sendMessage({
        messaging_product:"whatsapp",
        to:from,
        text:{
          body:`¡Comprobante recibido! 😊

Tu turno quedó reservado de forma provisoria.
En breve recibirás la confirmación final con los datos del encuentro.`
        }
      });

      await sendMainMenu(from);
      return res.sendStatus(200);
    }

    /* ===== RESPUESTA A BOTONES ===== */
    if(message.type==="interactive"){
      const buttonId = message.interactive.button_reply?.id || message.interactive.list_reply?.id;

      if(buttonId==="menu"){
        userState[from]=null;
        await sendMainMenu(from);
        return res.sendStatus(200);
      }

      if(buttonId==="modalidad"){
        await sendMessage({
          messaging_product:"whatsapp",
          to:from,
          text:{
            body:`Se brinda atención a adolescentes (15+) y adultos.

Modalidades disponibles:
• Virtual → Martes
• Presencial → Monte Grande y 9 de Abril`
          }
        });
        await sendMainMenu(from);
        return res.sendStatus(200);
      }

      if(buttonId==="honorarios"){
        await sendMessage({
          messaging_product:"whatsapp",
          to:from,
          text:{
            body:`El valor de la sesión es de $37.000.

La seña para reservar es del 50%.
Alias: dizciendomente.psi`
          }
        });
        await sendMainMenu(from);
        return res.sendStatus(200);
      }

      if(buttonId==="turno"){
        await sendHorarios(from);
        userState[from]="esperando_datos";
        return res.sendStatus(200);
      }

      /* ===== CUANDO ELIGE HORARIO ===== */
      if(userState[from]==="esperando_datos"){
        await sendMessage({
          messaging_product:"whatsapp",
          to:from,
          text:{
            body:`Perfecto 😊

Para confirmar el turno necesito:
• Nombre y apellido
• Edad
• Motivo de consulta`
          }
        });
        userState[from]="esperando_datos_personales";
        return res.sendStatus(200);
      }
    }

    /* ===== CUANDO ENVIA DATOS PERSONALES ===== */
    if(userState[from]==="esperando_datos_personales"){
      await sendMessage({
        messaging_product:"whatsapp",
        to:from,
        text:{
          body:`Gracias 😊

Para reservar el turno enviá la seña del 50% al alias:
dizciendomente.psi

Luego enviá el comprobante por aquí.`
        }
      });

      userState[from]="esperando_comprobante";
      return res.sendStatus(200);
    }

    /* ===== MENSAJE INICIAL ===== */
    await sendMainMenu(from);
    res.sendStatus(200);

  }catch(err){
    console.log(err.response?.data || err.message);
    res.sendStatus(200);
  }
});

app.listen(process.env.PORT || 3000);
