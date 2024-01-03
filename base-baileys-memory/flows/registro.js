const { addKeyword } = require("@bot-whatsapp/bot");
const FlowAdios = require('./despida')
let nombre;
let apellidos;
let telefono;
let tipo;
  const flowFormulario = addKeyword(['1', 'registro'])
  .addAnswer(
    ['Hola!', 'Para enviar el formulario necesito unos datos...', 'Escriba su *Nombre*\n', ' escribe ❌  para Cancelar solicitud'],
    { capture: true },

    async (ctx, { flowDynamic,gotoFlow}) => {
      if (ctx.body.toLowerCase() === 'x') {
         await flowDynamic('❌Se ha cancelando su proceso❌');
         return gotoFlow(FlowAdios);
      }
      nombre = ctx.body;
      return await flowDynamic(`Encantado *${nombre}*, continuamos...`); // Add 'await' here
    }
  )
  .addAnswer(
    ['También necesito tus dos apellidos'],
    { capture: true },

    async (ctx, { flowDynamic,gotoFlow }) => {
      if (ctx.body.toLowerCase() === 'x' ) {
        await flowDynamic('❌Se ha cancelando su proceso❌');
        return gotoFlow(FlowAdios);
      }
      apellidos = ctx.body;
      return await flowDynamic(`Perfecto *${nombre}*, por último...`); // Add 'await' here
    }
  )
  .addAnswer(
    'Ingresa tu correo electronico',
    { capture: true },

    async (ctx, { flowDynamic,gotoFlow}) => {
      if (ctx.body.toLowerCase() === 'x') {
        await flowDynamic('❌Se ha cancelando su proceso❌');
        return gotoFlow(FlowAdios);
      }

      telefono = ctx.body;
    
    }
    
  )
  .addAnswer(
    ['Si ere persona juridica envia J en caso contrario N'],
    { capture: true },

    async (ctx, { flowDynamic,gotoFlow}) => {
      if (ctx.body.toLowerCase() === 'x') {
        await flowDynamic('❌Se ha cancelando su proceso❌');
        return gotoFlow(FlowAdios);
      }
      tipos=ctx.body
      if (tipos.toLowerCase() === "j") {
        tipo = "Persona Jurídica";
      } else if (tipos === "n") { // Corrected syntax for "else if"
        tipo = "Persona Natural";
      }

      // The rest of your code
      return await flowDynamic(`Estupendo *${nombre}*! te dejo el resumen de tu formulario\n- Nombre y apellidos: *${nombre} ${apellidos}*\n- Teléfono: *${telefono}*\n- Tipo de persona: *${tipo}*`);
      // Add 'await' here
    }
    
  );


  module.exports={flowFormulario}
  