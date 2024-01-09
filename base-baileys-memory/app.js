const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot')
const pool = require('./db')
const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require('@bot-whatsapp/database/mock')
const { EVENTS } = require('@bot-whatsapp/bot')
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

const getServicios = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT s.nombre, ps.precio FROM servicios s LEFT JOIN precio_servicios ps ON s.id= ps.id_servicios WHERE s.estado =1 and ps.estado =1 ');
    client.release();
    return result.rows;
  }
  catch (error) {
    console.log('Error:', error.message)
    throw error;
  }
}

const getServiciosDescripcion = async (filtro) => {
  try {
    const client = await pool.connect();
    let query = 'SELECT s.nombre,s.descripcion,ps.precio FROM servicios s LEFT JOIN precio_servicios ps ON s.id= ps.id_servicios WHERE s.estado =1 and ps.estado =1 ';
    if (filtro) {
      query += ` AND LOWER(s.nombre) LIKE LOWER('%${filtro}%') LIMIT 1`;
    }

    const result = await client.query(query);
    client.release();
    return result.rows;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
};

/***Metodo de registro */
const generarCodigoCliente = (nombre, idPersona, telefono) => {
  const nombreNormalizado = nombre.toLowerCase();
  const nombreSinEspacios = nombreNormalizado.replace(/\s/g, '_'); // o '-' si prefieres guiones
  const codigo = `CL_${nombreSinEspacios}_${idPersona}_${telefono}`;
  return codigo;
};

const axios = require('axios');
const { Events } = require('pg')

const insertarCliente = async (nombre, apellidos, correo, telefono, tipo) => {
  try {
    let data = {
      nombre: nombre,
      correo: correo,
      apellidos: apellidos,
      celular: telefono,
      tipo: tipo
    };

    let res = await axios.post('https://27hqppfl-5000.use.devtunnels.ms/api/InsertarCliente', data);

    console.log(`Estado: ${res.status}`);
    console.log('Cuerpo: ', res.data);

    // Aquí está tu código de cliente
    let codigoCliente = res.data;

    return codigoCliente;

  } catch (err) {
    console.error(err);
  }
};


const validarNumeroCelularExistente = async (numeroCelular) => {
  try {
    const client = await pool.connect();
    const query = 'SELECT * FROM persona WHERE celular = $1';
    const result = await client.query(query, [numeroCelular]);
    client.release();
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error al validar número de celular:', error);
    return false;
  }
};

/***Metodos de horarios disponibles para el dia de hoy*/
const obtenerHorasDisponiblesHoy = async () => {
  try {
    const client = await pool.connect();

    // Obtén las horas de apertura y cierre para el día de hoy
    const horariosHoy = await client.query(`
      SELECT hora_apertura, hora_cierre
      FROM horarios
      WHERE dia = $1 AND estado = 1
    `, [getNombreDia(new Date())]); // Utiliza una función para obtener el nombre del día actual

    if (horariosHoy.rows.length === 0) {
      console.log('No hay horarios configurados para el día de hoy.');
      return [];
    }

    const horaApertura = horariosHoy.rows[0].hora_apertura;
    const horaCierre = horariosHoy.rows[0].hora_cierre;

    // Obtén las reservaciones para el día de hoy
    const reservacionesHoy = await client.query(`
      SELECT hora
      FROM reservacion
      WHERE fecha = CURRENT_DATE
    `);

    // Filtra las horas disponibles
    const horasReservadas = reservacionesHoy.rows.map(row => row.hora);
    const horasDisponibles = obtenerHorasDisponibles(horaApertura, horaCierre, horasReservadas);

    client.release();
    return horasDisponibles;
  } catch (error) {
    console.error('Error al obtener horas disponibles del día:', error.message);
    throw error;
  }
};

const obtenerHorasDisponibles = (horaApertura, horaCierre, horasReservadas) => {
  // Genera un rango de horas entre la apertura y el cierre
  const horasEnRango = generarHorasEnRango(horaApertura, horaCierre);

  // Filtra las horas que no están reservadas
  const horasDisponibles = horasEnRango.filter(hora => !horasReservadas.includes(hora));

  return horasDisponibles;
};

const generarHorasEnRango = (horaInicio, horaFin) => {
  const horasEnRango = [];
  let horaActual = new Date(`2000-01-01T${horaInicio}:00Z`);

  while (horaActual <= new Date(`2000-01-01T${horaFin}:00Z`)) {
    const horaFormateada = horaActual.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    horasEnRango.push(horaFormateada);
    horaActual.setMinutes(horaActual.getMinutes() + 30); // Incrementa 30 minutos
  }

  return horasEnRango;
};

// Función para obtener el nombre del día actual
const getNombreDia = (fecha) => {
  const opciones = { weekday: 'long' };
  return new Intl.DateTimeFormat('es-ES', opciones).format(fecha);
};

/////////////////////////////////////////////////////////
/** Flow de despedida */

////////////////////////////////////////////////////////
/**Flow de reservacion */

////////////////////////////////////////////////////////
/**Flow de disponibilidad de horarios */

////////////////////////////////////////////////////////
/**Flow de registro de usuario */
let nombre;
let apellidos;
let correo;
let tipo;
let telefono;

const flowFormulario = addKeyword(EVENTS.ACTION)
  .addAnswer(
    ['✍️ Para continuar con la agenda de su cita en nuestro autolavado tendremos que pedirle algunos datos personales\n', '✏️ Primero, escriba sus *dos nombres*: '])
  .addAnswer(
    ['❌ *Si desea cancelar esta solicitud escriba "Cancelar"*'],
    { capture: true },

    async (ctx, { flowDynamic, gotoFlow }) => {
      if (ctx.body.toLowerCase() === 'cancelar') {
        await flowDynamic('❌Se ha cancelando su proceso❌');
        return gotoFlow(flowPrincipal);
      }
      nombre = ctx.body;
      return await flowDynamic(`Encantado *${nombre}*, continuamos...`); // Add 'await' here
    }
  )
  .addAnswer(
    ['Ahora necesito sus dos apellidos: '],
    { capture: true },

    async (ctx, { flowDynamic, gotoFlow }) => {
      if (ctx.body.toLowerCase() === 'x') {
        await flowDynamic('❌Se ha cancelando su proceso❌');
        return gotoFlow(FlowAdios);
      }
      apellidos = ctx.body;
      return await flowDynamic(`Perfecto *${nombre} ${apellidos}*, por último...`); // Add 'await' here
    }
  )
  .addAnswer(
    'Ingresa tu correo electronico',
    { capture: true },

    async (ctx, { flowDynamic, gotoFlow }) => {
      if (ctx.body.toLowerCase() === 'x') {
        await flowDynamic('❌Se ha cancelando su proceso❌');
        return gotoFlow(FlowAdios);
      }

      correo = ctx.body;

    }

  )
  .addAnswer(
    ['Si usted es una persona juridica escriba *J* de lo contrario escriba *N*'],
    { capture: true },

    async (ctx, { flowDynamic, gotoFlow }) => {
      if (ctx.body.toLowerCase() === 'x') {
        await flowDynamic('❌Se ha cancelando su proceso❌');
        return gotoFlow(FlowAdios);
      }
      tipos = ctx.body
      if (tipos.toLowerCase() === "j") {
        tipo = "Persona Jurídica";
      } else if (tipos.toLowerCase() === "n") {
        tipo = "Persona Natural";
        telefono = ctx.from;
      }
      try {
        const codigoCliente = await insertarCliente(nombre, apellidos, correo, telefono, tipo);
        return await flowDynamic(`Estupendo *${nombre} ${apellidos}*! Te dejo el resumen de tu formulario\n- Nombre y apellidos: *${nombre} ${apellidos}*\n- Correo: *${correo}*\n- Teléfono: *${telefono}*\n- Tipo de persona: *${tipo}*\n- Código de Cliente: *${codigoCliente}*`);
      } catch (error) {
        console.error('Error:', error.message);
        return await flowDynamic('Hubo un error al procesar tu formulario. Por favor, inténtalo de nuevo.');
      }
    }

  );

/////////////////////////////////////////////////////////////////////////////////
/*** Flow de horarios */
const FlowHorarios = addKeyword(EVENTS.ACTION).addAnswer(
  ['Nuestros horarios de atencion'],
  null,
  async (_, { flowDynamic }) => {
    try {
      const horarios = await getHorarios();
      if (Array.isArray(horarios)) {

        const formattedHorarios = horarios.map(({ dia, hora_apertura, hora_cierre, estado }) => {
          return `${dia}: ${hora_apertura} - ${hora_cierre} (${estado === 1 ? 'Abierto' : 'Cerrado'})`;
        }).join('\n');
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



const FlowServicios = addKeyword(EVENTS.ACTION).addAnswer(
  ['Nuestros servicios que brinadamos\n si quieres saber sobre alguno escribe *Ver servicios*'],
  null,
  async (_, { flowDynamic }) => {
    try {
      const servicios = await getServicios();
      if (Array.isArray(servicios)) {
        const formattedServicios = servicios.map(({ nombre, precio }) => {
          return `${nombre}, Coste del servicios: ${precio} `;
        }).join('\n');
        console.log(formattedServicios);
        await flowDynamic(`Nuestros servicios:\n${formattedServicios}`);
      } else {
        console.error('Error: No se obtuvieron servicios válidos desde la base de datos.');
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
);

const FlowServiciosDescripcion = addKeyword('Ver servicios')
  .addAnswer(
    ['Hola!', 'Escriba el *Nombre* del servicio\n'],
    { capture: true },
    async (ctx, { flowDynamic }) => {
      try {
        const servicios = await getServiciosDescripcion(ctx.body);
        if (Array.isArray(servicios)) {
          const formattedServicios = servicios.map(({ nombre, descripcion, precio }) => {
            return `${nombre},${descripcion}, Costo del servicio: ${precio} `;
          }).join('\n');
          console.log('Servicios obtenidos', formattedServicios)
          return await flowDynamic(`Nuestros servicios:\n ${formattedServicios}`);
        } else {
          console.error('Error: No se obtuvieron servicios válidos desde la base de datos.');
        }

      } catch (error) {
        console.error('Error:', error.message);
      }
    }
  );
//////////////////////////////////////////////////////////////////////////////////////
/** Flow de gestion */
const flowBienvenida = addKeyword(EVENTS.ACTION)
  .addAnswer('Hola!, antes de agendar su cita necesitamos saber la disponibilidad de horarios, por favor digite el número del horario que desea consultar la disponibilidad.')
  .addAnswer('📅 Los hoarios disponibles son los siguientes: ')
  .addAnswer('', { capture: true }, async () => {
    const diasdisponbiles = await consultadiadisponibilidad();
    return diasdisponbiles;
  })





  .addAnswer('Hola! 😎', null, async (ctx, { gotoFlow }) => {
    const numero = ctx.from;
    try {
      const existeNumeroCelular = await validarNumeroCelularExistente(numero);

      if (existeNumeroCelular) {
        console.log('El número de celular ya existe en la tabla de personas.');
        return gotoFlow(flowAgenda);
      } else {
        console.log('El número de celular no existe en la tabla de personas.');
        return gotoFlow(flowFormulario);
      }
    } catch (error) {
      console.error(error);
    } finally {
      pool.end(); // Cierra la conexión de la piscina después de que todo esté completo
    }
  });




const consultadiadisponibilidad = async () => {
  try {


    let res = await axios.post('https://27hqppfl-5000.use.devtunnels.ms/api/pruebita', data);

    console.log(`Estado: ${res.status}`);
    console.log('Cuerpo: ', res.data);

    // Aquí está tu código de cliente
    let codigoCliente = res.data;

    return codigoCliente;

  } catch (err) {
    console.error(err);
  }
};


///////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////
/** Flow de productos y servicios */
const flowFormularioServiciosYProductos = addKeyword(EVENTS.ACTION)
  .addAnswer(
    '🫡 ¿Qué información necesitas?')
  .addAnswer(
    [
      'Te ofrecemos nuestros servicios de autolavado 🚗:',
      '👉 *1. Productos*',
      '👉 *2. Servicios*',
      '✍️*Digita el número o la oración de la acción que necesitas*'
    ],
  )
  .addAnswer('❌ *Si desea ir al menú principal digite *0* o *Cancelar*"*', null, (ctx, { fallBack }) => {
    if (!ctx.body.includes('0') && !ctx.body.includes('Cancelar') && !ctx.body.includes('1') && !ctx.body.includes('2')) {
      return fallBack()
    } else {
      // Lógica para procesar el correo electrónico del usuario
    }
  })
  .addAnswer(
    '❌ *Si desea ir al menú principal digite *0* o *Cancelar*"*',
    { capture: true },

    async (ctx, { flowDynamic, gotoFlow }) => {
      if (ctx.body.toLowerCase() === 'cancelar' || ctx.body.toLowerCase() === '0') {
        await flowDynamic('❌Se ha cancelando su proceso❌');
        return gotoFlow(flowPrincipal);
      }
      else if (ctx.body.toLowerCase() === '1') {
        return gotoFlow(FlowProductos);
      }
      else if (ctx.body.toLowerCase() === '2') {
        return gotoFlow(FlowServicios);
      }
    }
  )


const flowRegistrarse = addKeyword('Registrarse', 'incribirme', 'registrar', 'registro')
  .addAnswer("¡Bienvenido! Si eres nuevo por aquí, necesitas registrarte para disfrutar de nuestros servicios. Por favor, escribe 'Soy nuevo' para comenzar el proceso de registro.");
///////////////////////////////////////////////////////////////////////////////////////
const flowAgenda = addKeyword('Agendar')
  .addAnswer('Hora de agendar la cita!')
  .addAnswer('Deseas ver los horarios disponibles para el dia de hoy? enviar quiero *ver horarios*,*Ver horarios de la proxima semana*')

const flowVerHorarioshoy = addKeyword('Ver horarios')
  .addAnswer(
    ['*Nuestros horarios disponibles es:*'],
    null,
    async (_, { flowDynamic }) => {
      try {
        const horarios = await obtenerHorasDisponiblesHoy();
        if (Array.isArray(horarios)) {

          const formattedHorasDisponiblesHoy = horasDisponiblesHoy.join(', ');
          console.log('Horarios de hoy:', formattedHorasDisponiblesHoy)
          await flowDynamic(`Horarios:\n${formattedHorasDisponiblesHoy}`);
        } else {
          console.error('Error: No se obtuvieron horarios válidos desde la base de datos.');
        }
      } catch (error) {
        console.error('Error:', error.message);
      }
    }
  );

const flowVerHorariosgeneral = addKeyword('Ver horarios de la proxima semana')
  .addAnswer('Hora de agendar la cita!')
  .addAnswer('Deseas ver los horarios disponibles para el dia de hoy? enviar quiero *ver horarios*,*Ver horarios de la proxima semana*')


//////////////////////////////////////////////////////////////////////////////////////





const flowPrincipal = addKeyword('Hola') // Aceptar cualquier palabra como activador
  .addAnswer('🚗 ¡Hola! Bienvenido al Autolavado Express. 🌟 ¿Cómo puedo ayudarte hoy?')
  .addAnswer(
    [
      'Te ofrecemos nuestros servicios de autolavado 🚗:',
      '👉 *1. Agendar cita*',
      '👉 *2. Cancelar cita*',
      '👉 *3. Horarios*',
      '👉 *4. Productos y servicios*',
      '*Ingresa un numero para continuar*'
    ],
    { capture: true }, // Habilita la captura de la respuesta del usuario
    async (ctx, { flowDynamic, gotoFlow }) => {
      const opcionElegida = ctx.body.toLowerCase();

      // Utilizar un switch para redirigir según la opción elegida
      switch (opcionElegida) {
        case '1':
          // Redirige al flujo correspondiente para agendar cita
          return gotoFlow(flowBienvenida);
          break;
        case '2':
          // Redirige al flujo correspondiente para cancelar cita
          // return gotoFlow(FlowCancelarCita);
          break;
        case '3':
          // Redirige al flujo correspondiente para ver horarios
          // return gotoFlow(FlowHorarios);
          break;
        case '4':
          // Redirige al flujo correspondiente para productos y servicios
           return gotoFlow(flowFormularioServiciosYProductos);
          break;
        default:
          // Si la opción no es válida, envía un mensaje solicitando una opción válida
          return await flowDynamic('Por favor, ingresa una opción válida. 👀');
      }
    },
    [/* Aquí puedes añadir los flujos correspondientes a cada opción si lo deseas */]
  );



const main = async () => {
  const adapterDB = new MockAdapter()
  const adapterFlow = createFlow([flowPrincipal, flowFormulario, FlowServiciosDescripcion, flowVerHorarioshoy, flowVerHorariosgeneral, flowFormularioServiciosYProductos])
  const adapterProvider = createProvider(BaileysProvider)

  createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  })

  QRPortalWeb()
}

main()