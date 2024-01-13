const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot')
const pool = require('./db')
const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require('@bot-whatsapp/database/mock')
/////////////////////////////////////////////////////////

const axios = require('axios');
const { Events } = require('pg')
const { delay } = require('@whiskeysockets/baileys')

const obtenerServicios = async () => {
  try {

    let res = await axios.get('http://127.0.0.1:5000/api/getservicios');

    console.log(`Estado: ${res.status}`);
    console.log('Cuerpo: ', res.data);

    // Aquí están los servicios
    let servicios = res.data;

    return servicios;

  } catch (err) {
    console.error(err);
  }
};

async function insertarClienteObligatorio(nombre, celular) {
  try {
    const apiUrl = 'http://127.0.0.1:5000'; // Reemplaza con la URL real de tu API

    const response = await axios.post(apiUrl + '/api/InsertarClienteObligatorio', {
      nombre: nombre,
      celular: celular,
    });

    // Puedes acceder a los datos de la respuesta
    console.log('Código del cliente:', response.data.codigo_cliente);

    return response.data;
  } catch (error) {
    console.error('Error al llamar a la API:', error.response ? error.response.data : error.message);
    throw error;
  }
}


const insertarCliente = async (nombre, correo, celular) => {
  try {
    const apiUrl = 'http://127.0.0.1:5000';
    const response = await axios.post(apiUrl + '/api/InsertarCliente', {
      nombre: nombre,
      correo: correo,
      celular: celular,
    });

    return response.data.codigo_cliente;
  } catch (error) {
    console.error('Error en insertarCliente:', error.message);
    throw error;
  }
};

const validarNumeroCelularExistente = async (numeroCelular) => {
  try {
    const apiUrl = 'http://127.0.0.1:5000'; // Reemplaza con la URL real de tu API

    const response = await axios.post(apiUrl + '/api/validarnumerocelular', {
      numero_celular: numeroCelular,
    });


    return response.data.existe;
  } catch (error) {
    console.error('Error al llamar a la API:', error.response ? error.response.data : error.message);
    throw error;
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







/** Flow de gestion */
const enviar_duracion_dia = async (servicioObj, fechaObj) => {
  try {
    const resultado = {
      fecha: fechaObj.fecha,
      nombre: servicioObj.servicio.nombre,
      realizacion: servicioObj.servicio.realizacion
    };

    const response = await axios.post('http://127.0.0.1:5000/api_duracionLavado_dia', resultado);

    console.log(response.data);

    return response.data;
  }
  catch (error) {
    console.log(error);
  }
}

const obtenerHorariosDisponiblesSemanal = async () => {
  try {

    let res = await axios.get('http://127.0.0.1:5000/api_obtener_dias_disponibles/');

    console.log(`Estado: ${res.status}`);
    console.log('Cuerpo: ', res.data);

    // Aquí están los servicios
    let HorariosDisponiblesSemanal = res.data;

    return HorariosDisponiblesSemanal;

  } catch (err) {
    console.error(err);
  }
};









let fechas; // Definir 'fechas' aquí
let servicios; // Definir 'servicios' aquí
let bloques; // Definir 'bloques' aquí
let servicioObj; // Definir 'servicioObj' aquí
let fechaObj; // Definir 'fechaObj' aquí
let bloqueObj; // Definir 'bloqueObj' aquí


const flowReserva = addKeyword('1', {
  sensitive: true
})
  .addAnswer(['👀 Primero, lo primero'])
  .addAnswer(['📅 Estos son nuestros horarios disponibles:'], null, async (ctx, { flowDynamic,endFlow }) => {


    const fechasOriginales = await obtenerHorariosDisponiblesSemanal();
    // Formatear la respuesta
    let formattedResponse = '';
    let index = 1;

    fechas = fechasOriginales.map(fecha => {
      formattedResponse += `*${index}. ${fecha}*\n\n`;
      return { index: index++, fecha };
    });
    
    return await flowDynamic(formattedResponse);


  })
  .addAnswer(['👀 *Escribe el número del día que deseas*'], { capture: true }, (ctx, { fallBack }) => {
    fechaObj = fechas.find(fechaObj => fechaObj.index === parseInt(ctx.body));
    console.log(fechaObj)
    if (!fechaObj) {
      return fallBack()
    }
    console.log('mensaje entrante: ', ctx.body)
  })

  .addAnswer(['Estos son nuestros servicios de lavados: '], null, async (ctx, { flowDynamic }) => {

    const serviciosOriginales = await obtenerServicios();

    // Formatear la respuesta
    let formattedResponse = '';
    let index = 1;

    servicios = serviciosOriginales.map(servicio => {
      formattedResponse += `*${index}. ${servicio.nombre}*\n`;
      formattedResponse += `😶‍🌫️ Descripción: *${servicio.descripcion}*\n`;
      formattedResponse += `💵 Precio: *${servicio.precio}*\n`;
      formattedResponse += `⏱️ Tiempo de realización: *${servicio.realizacion}*\n\n`;
      return { index: index++, servicio };
    });

    return await flowDynamic(formattedResponse);


  })
  .addAnswer(['👀 *Escribe el número del servicio que deseas*'], { capture: true }, (ctx, { fallBack }) => {
    // Encuentra el servicio correspondiente
    servicioObj = servicios.find(servicioObj => servicioObj.index === parseInt(ctx.body));
    console.log(servicioObj);
    if (!servicioObj) {
      return fallBack();
    }
    console.log('mensaje entrante: ', ctx.body);
  })
  .addAnswer(['Estos son los horarios disponibles: '], null, async (ctx, { flowDynamic }) => {

    const bloquesOriginales = await enviar_duracion_dia(servicioObj, fechaObj);
    console.log(bloquesOriginales)

    // Formatear la respuesta
    let formattedResponse = '';
    let index = 1;

    bloques = bloquesOriginales.map(bloque => {
      formattedResponse += `*${index}. ${bloque}*\n\n`;
      return { index: index++, bloque };
    });


    return await flowDynamic(formattedResponse);
  })

  .addAnswer(['👀 *Escribe el número del servicio que deseas*'], { capture: true }, (ctx, { fallBack, gotoFlow }) => {
    // Encuentra el servicio correspondiente
    bloqueObj = bloques.find(bloqueObj => bloqueObj.index === parseInt(ctx.body));
    console.log(bloqueObj);
    if (!bloqueObj) {
      return fallBack();
    }
    console.log('mensaje entrante: ', ctx.body);

    return gotoFlow(flowConsultaCliente);


  })


const flowBienvenida = addKeyword('1')
  .addAnswer('¡Hola! 😊¡Disfruta tu tiempo con nosotros!', null, async (ctx, { gotoFlow, flowDynamic }) => {
    const numero = ctx.from;
    try {
      const existeNumeroCelular = await validarNumeroCelularExistente(numero);
      if (existeNumeroCelular) {
        return await flowDynamic('✨ Los pasos para agenda tu servicios son:\n 1.Elige el día disponible para tu servicio escribiendo el número correspondiente.\n📋 2.Selecciona el servicio deseado de nuestra lista enumerada.\n🕒 3.Elige el bloque de tiempo disponible y estarás listo para confirmar tu reserva.\n Para continuar con el proceso, envía *1*');
      } else {
        return await flowDynamic('🌟 ¡Hola!\nParece que eres nuevo por aquí.\n Para brindarte la mejor experiencia, necesitamos un par de detalles: tu nombre y tu correo 📧. Te enviaremos confirmaciones de futuras citas.\n\n¡Para continuar, simplemente envía *11*! 😊');

      }
    } catch (error) {
      console.error(error);
    }
  });
/**Flow de registro de usuario */
let nombre;
let apellidos;
let correo;
let tipo;
let telefono;

const flowFormulario = addKeyword('11', { sensitive: true })
  .addAnswer(
    ['Hola!', 'Escriba su *Nombre*\n', 'Sino quieres registrarte escribe x  para Cancelar solicitud'],
    { capture: true },

    async (ctx, { flowDynamic, endFlow }) => {
      try {
        const existeNumeroCelular = await validarNumeroCelularExistente(numero);
        if (existeNumeroCelular) {
          return await flowDynamic('✨ Los pasos para agenda tu servicios son:\n 1.Elige el día disponible para tu servicio escribiendo el número correspondiente.\n📋 2.Selecciona el servicio deseado de nuestra lista enumerada.\n🕒 3.Elige el bloque de tiempo disponible y estarás listo para confirmar tu reserva.\n Para continuar con el proceso, envía *1*');
        }
      } catch (error) {
        console.error(error);
      }
      if (ctx.body.toLowerCase() === 'x') {
        const clientes = await insertarClienteObligatorio(ctx.pushName, ctx.from);
        console.log(clientes)
        return endFlow('❌ Has cancelado el proceso. Si deseas retomarlo en otro momento, estamos aquí para ayudarte. ¡Hasta pronto! 👋, para volver al menu envia *99*');

      }
      nombre = ctx.body;
      return await flowDynamic(`Encantado *${nombre}*, continuamos con el ultimo paso`); // Add 'await' here
    }
  )
  .addAnswer(
    'Ingresa tu correo electronico',
    { capture: true },

    async (ctx, { flowDynamic, gotoFlow }) => {
      correo = ctx.body;
      try {
        telefono = ctx.from;
        const codigoCliente = await insertarCliente(nombre, correo, telefono);
        await flowDynamic(`Estupendo *${nombre}*! Te dejo el resumen de tu formulario\n- Nombre *${nombre} *\n- Correo: *${correo}*\n- Teléfono: *${telefono}*\n`);
        return gotoFlow(flowReserva)

      } catch (error) {
        console.error('Error:', error.message);
        return await flowDynamic('Hubo un error al procesar tu formulario. Por favor, inténtalo de nuevo.');
      }
    }

  )
//////////////////////////////////////////////////////////////////////////////////////
/** Flow 3. Horarios y ubicaciones */

const obtenerHorariosSucursalesUbicaciones = async () => {
  try {
    let res = await axios.get('http://127.0.0.1:5000/api/obtener_sucursales_horarios');
    console.log(`Estado: ${res.status}`);
    console.log('Cuerpo: ', res.data);
    // Aquí están los servicios
    let horariosSucursalesUbicaciones = res.data;
    return horariosSucursalesUbicaciones;
  } catch (err) {
    console.error(err);
  }
};

const flowConsultaCliente = addKeyword(EVENTS.ACTION)
  .addAnswer('En efecto debería de hacer la consulta')
  .addAction(async (_, { flowDynamic }) => {
    return await flowDynamic('🫡 ¿Qué información necesitas sobre nuestros servicios de autolavado?\n1. 🛒 Consultar Productos \n2. 🚗 Solicitar Servicios\n✍️ Ingresa el número correspondiente a la acción que deseas realizar.\n❌ Para cancelar, simplemente escribe *3* o *0*.\n📌 Si necesitas regresar al menú principal, escribe *Menu* o *99*.')
  })
  .addAction(async (_, ctx, { gotoFlow, flowDynamic }) => {

    const numero = ctx.from;
    console.log(numero);
    try {
      const existeNumeroCelular = await validarNumeroCelularExistente(numero);

      if (existeNumeroCelular) {
        console.log('El número de celular ya existe en la tabla de personas.');
        return gotoFlow(flowAgenda);
      } else {
        console.log('El número de celular no existe en la tabla de personas.');
        return gotoFlow(confirmacionReserva);
      }
    } catch (error) {
      console.error(error);
    } finally {
      pool.end(); // Cierra la conexión de la piscina después de que todo esté completo
    }

    return await flowDynamic('Un último paso, para reservar!')

  })

const confirmacionReserva = addKeyword(EVENTS.ACTION)
  .addAnswer('👀 Antes de cualquier cosa, confirmemos los datos para reservar')


const flowHorariosYubicaciones = addKeyword('3', {
  sensitive: true
})
  .addAnswer('📅⏱️ El horario de nuestras sucursales son los siguientes:', null, async (ctx, { flowDynamic }) => {
    const data = await obtenerHorariosSucursalesUbicaciones();
    console.log('LA PRUEBA EMPIEZA AQUI PARA VARIABLES GLOABLES');
    console.log(fechaObj);
    console.log(servicioObj);
    console.log(bloqueObj);

    // Formatear la respuesta
    let formattedResponse = '';

    data.forEach(sucursal => {
      formattedResponse += `*${sucursal.nombre}*\n`;
      formattedResponse += `📞 Teléfono: *${sucursal.telefono}*\n`;
      formattedResponse += `📍 Ubicación: *${sucursal.ubicacion_escrita}*\n`;
      formattedResponse += `🗺️ Mapa: *${sucursal.ubicacion_googlemaps}*\n`;
      formattedResponse += '⏱️ Horarios:\n';

      sucursal.horarios.forEach(horario => {
        formattedResponse += `  - ${horario.dia}: ${horario.hora_apertura} - ${horario.hora_cierre}\n`;
      });

      formattedResponse += '\n';
      formattedResponse += '\n📌 Si necesitas regresar al menú principal, escribe *Menu* o *99*.';
    });

    await flowDynamic(formattedResponse);
  })





//////////////////////////////////////////////////////////////////////////////////////
/** Flow 4. Servicios y productos  */
const flowProductos = addKeyword('1', {
  sensitive: true
})
  .addAnswer('Está bien! 🫡 te enviaré un PDF con los productos que ofrecemos: 📄')
  .addAnswer('📄', {
    // URL para descargar el PDF de SERVICIOS
    media: 'http://127.0.0.1:5000/static/pdf/productos/Productos.pdf'
  })
  .addAnswer('Para volver al inicio 🏠 envia 99')

const flowServicios = addKeyword('2', {
  sensitive: true
})
  .addAnswer('🧽🚿Nuestros servicios son:', null, async (ctx, { flowDynamic }) => {
    const data = await obtenerServicios();
    console.log(data);
    console.log("Juan")
    // Formatear la respuesta
    let formattedResponse = '';
    data.forEach(servicio => {
      formattedResponse += `*${servicio.nombre}*\n`;
      formattedResponse += `😶‍🌫️ Descripción: *${servicio.descripcion}*\n`;
      formattedResponse += `💵 Precio: *${servicio.precio}*\n\n`;
      formattedResponse += `⏱️ Tiempo de realización: *${servicio.realizacion}*\n\n`;
    });
    await flowDynamic(formattedResponse);
  })
  .addAnswer('Te dejó un PDF con más información de los servicios 👀📄:')
  .addAnswer('📄', {
    // URL para descargar el PDF de SERVICIOS
    media: 'http://127.0.0.1:5000/static/pdf/servicios/Servicios.pdf'
  })
  .addAnswer('Para volver al inicio 🏠 envia 99')

const flowFormularioServiciosYProductos = addKeyword('4', {
  sensitive: true
})
  .addAction(async (_, { flowDynamic }) => {
    return await flowDynamic('🫡 ¿Qué información necesitas sobre nuestros servicios de autolavado?\n1. 🛒 Consultar Productos \n2. 🚗 Solicitar Servicios\n✍️ Ingresa el número correspondiente a la acción que deseas realizar.\n❌ Para cancelar, simplemente escribe *3* o *0*.\n📌 Si necesitas regresar al menú principal, escribe *Menu* o *99*.')
  })
  .addAction({ capture: true }, async (ctx, { flowDynamic, endFlow, gotoFlow }) => {
    const opcion = parseInt(ctx.body);
    switch (opcion) {
      case 1: return gotoFlow(flowProductos);
      case 2: return gotoFlow(flowServicios);
      case 0: case 3: return endFlow('Has cancelado la operación, Hasta luego !')
      default: return await flowDynamic('Lo siento, no entendí esa opción. Por favor, envia menu para ver todas nuestra opciones');
    }
  });



const flowPrincipal = addKeyword(['hola', 'ole', 'alo', '99', 'Menu'])
  .addAnswer('🚗 ¡Hola! Bienvenido al Autolavado Express. 🌟 ¿Cómo puedo ayudarte hoy?')
  .addAnswer(
    [
      'Te ofrecemos nuestros servicios de autolavado 🚗:',
      '👉 *1. Agendar cita*',
      '👉 *2. Cancelar cita*',
      '👉 *3. Horarios y ubicaciones*',
      '👉 *4. Servicios y productos*',
      '*Ingresa un numero para continuar*'
    ],
    {

    }, null, [flowBienvenida, flowHorariosYubicaciones, flowFormularioServiciosYProductos]
  );





const main = async () => {
  const adapterDB = new MockAdapter()
  const adapterFlow = createFlow([flowPrincipal, flowReserva, flowFormulario])
  const adapterProvider = createProvider(BaileysProvider)

  createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  })

  QRPortalWeb()
}

main()
