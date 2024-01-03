const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot')
const pool = require('./db')
const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require('@bot-whatsapp/database/mock')
/////////////////////////////////////////////////////////
/**Metodos para guardar en la bd*/
const getHorarios = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM horarios');
    client.release();
    return result.rows;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
};

/***Metodo de registro */
const generarCodigoCliente = (nombre, idPersona, telefono) => {
  const nombreSinEspacios = nombre.replace(/\s/g, ''); // Elimina espacios en blanco
  const codigo = `${nombreSinEspacios}_${idPersona}_${telefono}`;
  return codigo;
};

const insertarCliente = async (nombre, correo, direccion, celular) => {
  try {
    // Insertar en la tabla persona y obtener el ID
    const resultPersona = await pool.query(`
      INSERT INTO persona (nombre, correo, direccion, celular)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [nombre, correo, direccion, celular]);

    const idPersona = resultPersona.rows[0].id;

    // Generar el código del cliente
    const codigoCliente = generarCodigoCliente(nombre, idPersona, celular);

    // Insertar en la tabla clientes
    const resultClientes = await pool.query(`
      INSERT INTO clientes (id_persona, codigo, tipo_cliente, foto, estado)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [idPersona, codigoCliente, 'normal', null, 1]);

    const idClientes = resultClientes.rows[0].id;
    
    console.log(`Cliente insertado con éxito en la tabla clientes con ID: ${idClientes}.`);
    return codigoCliente; 
  } catch (error) {
    console.error('Error en insertarCliente:', error.message);
    throw error;
  }
};

/////////////////////////////////////////////////////////
/** Flow de despedida */

////////////////////////////////////////////////////////


////////////////////////////////////////////////////////
/**Flow de registro de usuario */
let nombre;
let apellidos;
let correo;
let tipo;
let telefono;
  const flowFormulario = addKeyword(['soy nuevo', 'nuevo','soy'])
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

      correo = ctx.body;
    
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
      } else if (tipos.toLowerCase() === "n") { // Corrected syntax for "else if"
        tipo = "Persona Natural";
      }
      try {
        const codigoCliente = await insertarCliente(nombre, correo, null, telefono, tipo);
        return await flowDynamic(`Estupendo *${nombre} ${apellidos}*! Te dejo el resumen de tu formulario\n- Nombre y apellidos: *${nombre} ${apellidos}*\n- Correo: *${correo}*\n- Teléfono: *${telefono}*\n- Tipo de persona: *${tipo}*\n- Código de Cliente: *${codigoCliente}*`);
      } catch (error) {
        console.error('Error:', error.message);
        return await flowDynamic('Hubo un error al procesar tu formulario. Por favor, inténtalo de nuevo.');
      }
    }
    
  );

/////////////////////////////////////////////////////////////////////////////////
/*** Flow de horarios */
const FlowHorarios = addKeyword('3').addAnswer(
  ['Nuestros horarios de atencion'],
  null,
  async (_, { flowDynamic }) => {
    try {
      // Obtén los horarios de la base de datos
      const horarios = await getHorarios();

      // Verifica si horarios es un array antes de usar map
      if (Array.isArray(horarios)) {
        // Formatea los horarios
        const formattedHorarios = horarios.map(({ dia, hora_apertura, hora_cierre, estado }) => {
          return `${dia}: ${hora_apertura} - ${hora_cierre} (${estado === 1 ? 'Abierto' : 'Cerrado'})`;
        }).join('\n'); // Une los elementos del array con saltos de línea

        // Imprime los horarios en la consola (opcional)
        console.log(formattedHorarios);

        // Usa flowDynamic para enviar un único mensaje con saltos de línea
        await flowDynamic(`Horarios:\n${formattedHorarios}`);
      } else {
        console.error('Error: No se obtuvieron horarios válidos desde la base de datos.');
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
);

//////////////////////////////////////////////////////////////////////////////////////
/** Flow de gestion */
const flowBienvenida = addKeyword('1')
  .addAnswer('Bievenido!', null, async (ctx, { gotoFlow }) => {
    const numero = ctx.from;
    if (numero) {
      // Si existe lo enviamos al flujo de regostrados..
      return gotoFlow(flowRegistrarse); // Use 'return' here
    } else {
      return gotoFlow(flowAgenda); // Use 'return' here
    }
  });
///////////////////////////////////////////////////////////////////////////////////////
const flowRegistrarse = addKeyword('Registrarse', 'incribirme', 'registrar', 'registro')
  .addAnswer("¡Bienvenido! Si eres nuevo por aquí, necesitas registrarte para disfrutar de nuestros servicios. Por favor, escribe 'Soy nuevo' para comenzar el proceso de registro."
  ,null,null,[flowFormulario]);
///////////////////////////////////////////////////////////////////////////////////////
const flowAgenda = addKeyword('Agendar')
.addAnswer('Hora de agendar la cita!'
);


//////////////////////////////////////////////////////////////////////////////////////

const flowPrincipal = addKeyword(['hola', 'ole', 'alo'])
  .addAnswer('🚗 ¡Hola! Bienvenido al Autolavado Express. 🌟 ¿Cómo puedo ayudarte hoy?')
  .addAnswer(
    [
      'Te ofrecemos nuestros servicios de autolavado 🚗:',
      '👉 *1. Agendar cita*',
      '👉 *2. Cancelar cita*',
      '👉 *3. Horarios*',
      '👉 *4. Servicios*',
      '*Ingresa un numero para continuar*'
    ],
    null,
    null,
    [flowBienvenida,FlowHorarios]
  );

const main = async () => {
  const adapterDB = new MockAdapter()
  const adapterFlow = createFlow([flowPrincipal])
  const adapterProvider = createProvider(BaileysProvider)

  createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  })

  QRPortalWeb()
}

main()
