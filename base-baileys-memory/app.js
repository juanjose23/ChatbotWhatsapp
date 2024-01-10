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

const axios = require('axios');
const { Events } = require('pg')

const obtenerServicios = async () => {
  try {
    
    let res = await axios.get('https://27hqppfl-5000.use.devtunnels.ms/api/getservicios');

    console.log(`Estado: ${res.status}`);
    console.log('Cuerpo: ', res.data);

    // Aquí están los servicios
    let servicios = res.data;

    return servicios;

  } catch (err) {
    console.error(err);
  }
};



/***Metodo de registro */
const generarCodigoCliente = (nombre, idPersona, telefono) => {
  const nombreNormalizado = nombre.toLowerCase();
  const nombreSinEspacios = nombreNormalizado.replace(/\s/g, '_'); // o '-' si prefieres guiones
  const codigo = `CL_${nombreSinEspacios}_${idPersona}_${telefono}`;
  return codigo;
};

const insertarCliente = async (nombre, correo,apellido, celular,tipo) => {
  try {
    // Insertar en la tabla persona y obtener el ID
    const resultPersona = await pool.query(`
      INSERT INTO persona (nombre, correo, direccion, celular)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [nombre, correo,null, celular]);

    const idPersona = resultPersona.rows[0].id;
    console.log('ID PERSONA',idPersona)
    const resultPersonaNatural = await pool.query(`
    INSERT INTO persona_natural (id_persona, apellido,tipo_persona)
    VALUES ($1, $2,$3)
    RETURNING id
  `, [idPersona,apellido,tipo]);
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
/**Flow de registro de usuario */
let nombre;
let apellidos;
let correo;
let tipo;
let telefono;
const flowFormulario = addKeyword(['soy nuevo', 'nuevo', 'soy'])
  .addAnswer(
    ['Hola!', 'Para enviar el formulario necesito unos datos...', 'Escriba su *Nombre*\n', ' escribe ❌  para Cancelar solicitud'],
    { capture: true },

    async (ctx, { flowDynamic, gotoFlow }) => {
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

    async (ctx, { flowDynamic, gotoFlow }) => {
      if (ctx.body.toLowerCase() === 'x') {
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

    async (ctx, { flowDynamic, gotoFlow }) => {
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
        const codigoCliente = await insertarCliente(nombre, correo,telefono,apellidos, tipo);
        return await flowDynamic(`Estupendo *${nombre} ${apellidos}*! Te dejo el resumen de tu formulario\n- Nombre y apellidos: *${nombre} ${apellidos}*\n- Correo: *${correo}*\n- Teléfono: *${telefono}*\n- Tipo de persona: *${tipo}*\n- Código de Cliente: *${codigoCliente}*`);
      } catch (error) {
        console.error('Error:', error.message);
        return await flowDynamic('Hubo un error al procesar tu formulario. Por favor, inténtalo de nuevo.');
      }
    }

  );

/////////////////////////////////////////////////////////////////////////////////



//////////////////////////////////////////////////////////////////////////////////////




//////////////////////////////////////////////////////////////////////////////////////
/** Flow de gestion */
const flowBienvenida = addKeyword('1')
  .addAnswer('Bievenidos!', null, async (ctx, { gotoFlow }) => {
    const numero = ctx.from;
    try {
      const existeNumeroCelular = await validarNumeroCelularExistente(numero);

      if (existeNumeroCelular) {
        console.log('El número de celular ya existe en la tabla de personas.');
        return gotoFlow(flowAgenda);
      } else {
        console.log('El número de celular no existe en la tabla de personas.');
        return gotoFlow(flowRegistrarse);
      }
    } catch (error) {
      console.error(error);
    } finally {
      pool.end(); // Cierra la conexión de la piscina después de que todo esté completo
    }
  });


//////////////////////////////////////////////////////////////////////////////////////
/** Flow 3. Horarios y ubicaciones */

const obtenerHorariosSucursalesUbicaciones = async () => {
  try {
    
    let res = await axios.get('https://27hqppfl-5000.use.devtunnels.ms/api/obtener_sucursales_horarios');

    console.log(`Estado: ${res.status}`);
    console.log('Cuerpo: ', res.data);

    // Aquí están los servicios
    let horariosSucursalesUbicaciones = res.data;

    return horariosSucursalesUbicaciones;

  } catch (err) {
    console.error(err);
  }
};



const flowHorariosYubicaciones = addKeyword('3',{
  sensitive:true
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
  });
  
  await flowDynamic(formattedResponse);
})





//////////////////////////////////////////////////////////////////////////////////////
/** Flow 4. Servicios y productos  */

/** Flow de productos y servicios */

const flowProductos = addKeyword('1',{
  sensitive:true
})
.addAnswer('Nuestros productos son:')


let servicios;

const flowServicios = addKeyword('2',{
  sensitive:true
})

.addAnswer('🧽🚿Nuestros servicios son:', null, async (ctx, { flowDynamic }) => {
  const data = await obtenerServicios();
  
  // Formatear la respuesta
  let formattedResponse = '';
  
  data.forEach(servicio => {
    formattedResponse += `*${servicio.nombre}*\n`;
    formattedResponse += `😶‍🌫️ Descripción: *${servicio.descripcion}*\n`;
    formattedResponse += `💵 Precio: *${servicio.precio}*\n\n`;
  });
  
  await flowDynamic(formattedResponse);
})

.addAnswer('Te dejó un PDF con más información de los servicios 👀📄:')

.addAnswer('📄',{
  media:'https://27hqppfl-5000.use.devtunnels.ms/static/pdf/temp.pdf'
})


const flowFormularioServiciosYProductos = addKeyword('4',{
  sensitive:true
})
  .addAnswer(
    '🫡 ¿Qué información necesitas?')
  .addAnswer(
    [
      'Te ofrecemos nuestros servicios de autolavado 🚗:',
      '👉 *1. Productos*',
      '👉 *2. Servicios*',
      '✍️*Digita el número o la oración de la acción que necesitas*'
    ])
  .addAnswer(
    '❌ *Si desea ir al menú principal digite *0* o *Cancelar*"*',{
      
    }, null, [flowProductos, flowServicios])


///////////////////////////////////////////////////////////////////////////////////////
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
          console.log('Horarios de hoy:',formattedHorasDisponiblesHoy)
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

const flowPrincipal = addKeyword(['hola', 'ole', 'alo'])
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
    null,
    null,
    [flowBienvenida, flowHorariosYubicaciones, flowFormularioServiciosYProductos]
  );





const main = async () => {
  const adapterDB = new MockAdapter()
  const adapterFlow = createFlow([flowPrincipal, flowFormulario, flowVerHorarioshoy,flowHorariosYubicaciones, flowFormularioServiciosYProductos])
  const adapterProvider = createProvider(BaileysProvider)

  createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  })

  QRPortalWeb()
}

main()
