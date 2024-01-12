const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot')
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

/***Metodo de registro */
const generarCodigoCliente = (nombre, idPersona, telefono) => {
  const nombreNormalizado = nombre.toLowerCase();
  const nombreSinEspacios = nombreNormalizado.replace(/\s/g, '_'); // o '-' si prefieres guiones
  const codigo = `CL_${nombreSinEspacios}_${idPersona}_${telefono}`;
  return codigo;
};

const insertarCliente = async (nombre, correo, apellido, celular, tipo) => {
  try {
    // Insertar en la tabla persona y obtener el ID
    const resultPersona = await pool.query(`
      INSERT INTO persona (nombre, correo, direccion, celular)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [nombre, correo, null, celular]);

    const idPersona = resultPersona.rows[0].id;
    console.log('ID PERSONA', idPersona)
    const resultPersonaNatural = await pool.query(`
    INSERT INTO persona_natural (id_persona, apellido,tipo_persona)
    VALUES ($1, $2,$3)
    RETURNING id
  `, [idPersona, apellido, tipo]);
    console.log('Id persona Natural', resultPersonaNatural.rows[0].id)
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

const validarNumeroCelularExistente = async (numeroCelular) => {
  try {
    const apiUrl = 'http://127.0.0.1:5000'; // Reemplaza con la URL real de tu API

    const response = await axios.post(apiUrl + '/api/validarnumerocelular', {
      numero_celular: numeroCelular,
    });

    // Puedes acceder a los datos de la respuesta
    console.log('Número de celular existe:', response.data.existe);

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




/**Flow de registro de usuario */
let nombre;
let apellidos;
let correo;
let tipo;
let telefono;
const flowFormulario = addKeyword(['1'])
  .addAnswer(
    ['Hola!', 'Para enviar el formulario necesito unos datos...', 'Escriba su *Nombre*\n', ' envia *0* para Cancelar solicitud'],
    { capture: true },

    async (ctx, { flowDynamic, endFlow }) => {
      if (ctx.body.toLowerCase() === '0') {
        return endFlow('❌Se ha cancelando su proceso❌');
      }
      nombre = ctx.body;
      return await flowDynamic(`Encantado *${nombre}*, continuamos...`); // Add 'await' here
    }
  )
  .addAnswer(
    ['También necesito tus dos apellidos'],
    { capture: true },

    async (ctx, { flowDynamic, endFlow }) => {
      if (ctx.body.toLowerCase() === 'x') {
        return endFlow('❌Se ha cancelando su proceso❌');
      }
      apellidos = ctx.body;
      return await flowDynamic(`Perfecto *${nombre}*, por último...`); // Add 'await' here
    }
  )
  .addAnswer(
    'Ingresa tu correo electronico',
    { capture: true },

    async (ctx, { endFlow }) => {
      if (ctx.body.toLowerCase() === 'x') {
        return endFlow('❌Se ha cancelando su proceso❌');

      }

      correo = ctx.body;

    }

  )
  .addAnswer(
    ['Si ere persona juridica envia J en caso contrario N'],
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
        const codigoCliente = await insertarCliente(nombre, correo, telefono, apellidos, tipo);
        return await flowDynamic(`Estupendo *${nombre} ${apellidos}*! Te dejo el resumen de tu formulario\n- Nombre y apellidos: *${nombre} ${apellidos}*\n- Correo: *${correo}*\n- Teléfono: *${telefono}*\n- Tipo de persona: *${tipo}*\n- Código de Cliente: *${codigoCliente}*`);
      } catch (error) {
        console.error('Error:', error.message);
        return await flowDynamic('Hubo un error al procesar tu formulario. Por favor, inténtalo de nuevo.');
      }
    }

  );

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
let servicioObj; // Definir 'servicioObj' aquí
let fechaObj; // Definir 'fechaObj' aquí
let bloques; // Definir 'bloques' aquí


const flowReserva = addKeyword('1')
  .addAnswer(['👀 Primero, lo primero'])
  .addAnswer(['📅 Estos son nuestros horarios disponibles:'], null, async (ctx, { flowDynamic }) => {

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

    bloquesOriginales.forEach(bloque => {
      formattedResponse += `*${index}. ${bloque}*\n\n`;
      index++;
    });


    return await flowDynamic(formattedResponse);
  })



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



const flowHorariosYubicaciones = addKeyword('3', {
  sensitive: true
})
  .addAnswer('📅⏱️ El horario de nuestras sucursales son los siguientes:', null, async (ctx, { flowDynamic }) => {
    const data = await obtenerHorariosSucursalesUbicaciones();

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



///////////////////////////////////////////////////////////////////////////////////////




//////////////////////////////////////////////////////////////////////////////////////

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

    }, null, [flowReserva, flowHorariosYubicaciones, flowFormularioServiciosYProductos]
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
