const { createBot, createProvider, createFlow, addKeyword, EVENTS, addAnswer } = require('@bot-whatsapp/bot')
const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require('@bot-whatsapp/database/mock')
const FormData = require('form-data');


/////////////////////////////////////////////////////////

const axios = require('axios');
const consultaDatosCliente = async (numero) => {
  try {
    let res = await axios.post('http://127.0.0.1:5000/api_consultaDatosCliente', { celular: numero })
    // Aquí están los servicios
    let datosCliente = res.data;
    return datosCliente;
  }
  catch (error) {
    console.log(error);
  }
}

const obtenerCategorias = async () => {
  try {

    let res = await axios.get('http://127.0.0.1:5000/api/getcategorias');
    // Aquí están los servicios
    let servicios = res.data;

    return servicios;

  } catch (err) {
    console.error(err);
  }
};
const obtenermetodos = async () => {
  try {

    let res = await axios.get('http://127.0.0.1:5000/api/metododepago');
    // Aquí están los servicios
    let servicios = res.data;

    return servicios;

  } catch (err) {
    console.error(err);
  }
};
const obtenerServicios = async (id) => {
  try {
    let res = await axios.get(`http://127.0.0.1:5000/api/getservicios/${id}`);
    // Aquí están los servicios
    let servicios = res.data;
    return servicios;
  } catch (err) {
    console.error(err);
  }
};

const insertarReserva = async (id_cliente, codigo_cliente, id_Persona, nombre, apellidos, correo, telefono, fecha, nombre_servicio, servicio_realizacion, bloque_horario, metodo) => {
  try {
    let data = {
      datos_personales: {
        id_cliente: id_cliente !== undefined ? codigo_cliente : null,
        codigo_cliente: codigo_cliente !== undefined ? codigo_cliente : null,
        id_persona: id_Persona !== undefined ? id_Persona : null,
        nombre: nombre,
        apellidos: apellidos,
        correo: correo,
        celular: telefono
      },
      datos_reserva: {
        fecha: fecha,
        nombre_servicio: nombre_servicio,
        servicio_realizacion: servicio_realizacion,
        bloque_horario: bloque_horario,
        metodo: metodo
      }
    };
    console.log(nombre_servicio)
    console.log(data)
    let res = await axios.post('http://127.0.0.1:5000/api_agregar_reserva', data);
    console.log(`Estado: ${res.status}`);
    console.log('Cuerpo: ', res.data);
    // Aquí está tu código de cliente
    let codigo_reservacion = res.data.codigo_reservacion;
    console.log(codigo_reservacion)
    return codigo_reservacion;
  } catch (err) {
    console.error(err);
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

/**Flow de registro de usuario */
let nombre;
let apellidos;
let correo;
let telefono;
const flowFormulario = addKeyword(EVENTS.ACTION)
  .addAnswer(
    ['¡Hola! Para enviar el formulario, necesito algunos datos...',
      'Escribe tu *Nombre*. Envía *0* para cancelar la solicitud.'],
    { capture: true },
    async (ctx, { flowDynamic, endFlow, fallBack, state }) => {
      if (ctx.body.toLowerCase() === '0') {
        return endFlow('❌ Se ha cancelado el proceso ❌');
      }

      if (ctx.body.length < 3 || ctx.body.length > 50) {
        return fallBack('Por favor, ingresa un nombre válido.');
      }

      nombre = ctx.body;
      await state.update({ nombre });
      return await flowDynamic(`Encantado, *${nombre}*, continuamos...`);
    }
  )
  .addAnswer(
    ['Si gustas, puedes escribir tus apellidos. Si no deseas compartirlo, escribe *omitir*. O escribe *0* para cancelar.'],
    { capture: true },
    async (ctx, { flowDynamic, endFlow, state }) => {
      if (ctx.body.toLowerCase() === '0') {
        return endFlow('❌ Se ha cancelado el proceso ❌');
      }

      apellidos = ctx.body.toLowerCase().includes('omitir') ? '' : ctx.body;
      await state.update({ apellidos });

      return await flowDynamic(apellidos ? `Perfecto, *${nombre} ${apellidos}*, por último...` : 'Has omitido los apellidos.');
    }
  )
  .addAnswer(
    ['Si gustas, puedes escribir tu correo electrónico. Si no deseas compartirlo, escribe *omitir*. O escribe *0* para cancelar.'],
    { capture: true },
    async (ctx, { endFlow, state }) => {
      if (ctx.body.toLowerCase() === '0') {
        return endFlow('❌ Se ha cancelado el proceso ❌');
      }

      correo = ctx.body.toLowerCase().includes('omitir') ? '' : ctx.body;
      await state.update({ correo });
      telefono = ctx.from;
      await state.update({ telefono });
    }
  )
  .addAction(async (ctx, { gotoFlow, flowDynamic }) => {
    return gotoFlow(confirmacionReserva);
  });


/** Flow de gestion */
const enviar_duracion_dia = async (servicioObj, fechaObj) => {
  try {
    const resultado = {
      fecha: fechaObj.fecha,
      nombre: servicioObj.servicio.nombre,
      realizacion: servicioObj.servicio.realizacion
    };
    console.log("Fecha seleccionada")
    console.log(fechaObj.fecha);
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
let metodos;
let idcategoria;
let metodoObj;
const flowReserva = addKeyword('1')
  .addAnswer(['👀 Planfica tu agenda con nostros'])
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
  .addAnswer(['👀 *Escribe el número del día que deseas.*\n *Si deseas terminar la solicitud envía 0*'], { capture: true }, async (ctx, { fallBack, state, endFlow }) => {
    fechaObj = fechas.find(fechaObj => fechaObj.index === parseInt(ctx.body));

    console.log(fechaObj)
    if (parseInt(ctx.body) < 1) {
      return endFlow("Se ha cancelado tu proceso, esperamos poder contar con su presencia en futuras citas.")
    }
    if (!fechaObj) {
      return fallBack()
    }
    await state.update({ fechaObj: fechaObj })
    console.log('mensaje entrante: ', ctx.body)
  })
  .addAnswer(['Estos son nuestras categorias de nuestros servicios de lavados : '], null, async (ctx, { flowDynamic }) => {

    const CategoriaOriginales = await obtenerCategorias();

    // Formatear la respuesta
    let formattedResponse = '';
    let index = 1;

    categorias = CategoriaOriginales.map(categoria => {
      formattedResponse += `*${index}. ${categoria.nombre}*\n`;
      formattedResponse += `😶‍🌫️ Descripción: *${categoria.descripcion}*\n`;
      return { index: index++, categoria };
    });

    return await flowDynamic(formattedResponse);


  })
  .addAnswer(['👀 *Escribe el número de la categoría que deseas:*\n*Si deseas terminar la solicitud envía 0*'], { capture: true }, async (ctx, { fallBack, state, endFlow }) => {
    // Encuentra la categoria correspondiente
    const categoriasObj = categorias.find(categoriaObj => categoriaObj.index === parseInt(ctx.body));
    console.log(categoriasObj);

    if (parseInt(ctx.body) < 1) {
      return endFlow('Se ha cancelado tu proceso, esperamos poder contar con su presencia en futuras citas.');
    }

    if (!categoriasObj) {
      return fallBack();
    }
    idcategoria = categoriasObj.categoria.id;
    await state.update({ idcategoria: idcategoria })

  })
  .addAnswer(['Estos son nuestros servicios de lavados de la categoría seleccionada: '], null, async (ctx, { flowDynamic }) => {
    const serviciosOriginales = await obtenerServicios(idcategoria);

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
  .addAnswer(['👀 *Escribe el número del servicio que deseas:*\n*Si deseas terminar la solicitud envía 0*'], { capture: true }, async (ctx, { fallBack, state, endFlow }) => {
    // Encuentra el servicio correspondiente
    servicioObj = servicios.find(servicioObj => servicioObj.index === parseInt(ctx.body));
    console.log(servicioObj);
    if (parseInt(ctx.body) < 1) {
      return endFlow('Se ha cancelado tu proceso, esperamos poder contar con su presencia en futuras citas.')
    }
    if (!servicioObj) {
      return fallBack();
    }
    console.log('mensaje entrante: ', ctx.body);
    await state.update({ servicioObj: servicioObj })
  })
  .addAnswer(['*Estos son los horarios disponibles:* '], null, async (ctx, { flowDynamic, gotoFlow }) => {
    const bloquesOriginales = await enviar_duracion_dia(servicioObj, fechaObj);
    if (bloquesOriginales.length === 0) {
      // Si no hay bloques disponibles, devuelve un mensaje de disculpa
      await flowDynamic('Lo sentimos, 😔 no tenemos disponible ningún horario para el servicio que has seleccionado. 🕰️ Te invitamos a escoger otro día. 📅');
      return gotoFlow(flowPrincipal)
    }
    // Formatear la respuesta
    let formattedResponse = '';
    let index = 1;
    bloques = bloquesOriginales.map(bloque => {
      formattedResponse += `*${index}. ${bloque}*\n\n`;
      return { index: index++, bloque };
    });
    return await flowDynamic(formattedResponse);
  })
  .addAnswer(['👀 *Escribe el número del horario que deseas:*\n*Si deseas terminar la solicitud envía 0*'], { capture: true }, async (ctx, { fallBack, gotoFlow, endFlow, state }) => {
    bloqueObj = bloques.find(bloqueObj => bloqueObj.index === parseInt(ctx.body));
    console.log(bloqueObj);
    if (parseInt(ctx.body) < 1) {
      return endFlow('Se ha cancelado tu proceso, esperamos poder contar con su presencia en futuras citas.');
    }
    if (!bloqueObj) {
      return fallBack();
    }
    await state.update({ bloqueObj: bloqueObj })

  })
  .addAnswer(['*¿Como desea pagar?: *'], null, async (ctx, { flowDynamic }) => {
    const metodosOriginales = await obtenermetodos();
    // Formatear la respuesta
    let formattedResponse = '';
    let index = 1;

    metodos = metodosOriginales.map(metodo => {
      formattedResponse += `*${index}. ${metodo.nombre}*\n`;
      formattedResponse += `😶‍🌫️ Descripción: *${metodo.descripcion}*\n`;
      return { index: index++, metodo };
    });

    return await flowDynamic(formattedResponse);
  })
  .addAnswer(['👀 *Escribe el número del método que deseas:*\n*Si deseas terminar la solicitud envía 0*'], { capture: true }, async (ctx, { fallBack, gotoFlow, state }) => {
    metodoObj = metodos.find(metodo => metodo.index === parseInt(ctx.body));
    console.log(metodoObj);
    if (parseInt(ctx.body) < 1) {
      return endFlow('Se ha cancelado tu proceso, esperamos poder contar con su presencia en futuras citas.');
    }
    if (!metodoObj) {
      return fallBack();
    }
    console.log('mensaje entrante: ', ctx.body);
    await state.update({ metodoObj: metodoObj });

    return gotoFlow(flowConsultaCliente);
  });





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
  .addAction(async (ctx, { gotoFlow, flowDynamic, state }) => {

    const numero = ctx.from;
    console.log(numero);
    try {
      const existeNumeroCelular = await validarNumeroCelularExistente(numero);

      if (existeNumeroCelular) {
        console.log('El número de celular ya existe en la tabla de personas.');

        const datosCliente = await consultaDatosCliente(numero);
        console.log('Datos del cliente: ');
        console.log(datosCliente);

        await state.update({ nombre: datosCliente.nombre })
        await state.update({ apellidos: datosCliente.apellido })
        await state.update({ correo: datosCliente.correo })
        await state.update({ telefono: numero })
        await state.update({ tipo: datosCliente.tipo_persona })
        await state.update({ id_cliente: datosCliente.id_cliente })
        await state.update({ codigo_cliente: datosCliente.codigo })
        await state.update({ id_persona: datosCliente.id_persona })

        return gotoFlow(confirmacionReserva);
      } else {
        console.log('El número de celular no existe en la tabla de personas.');
        return gotoFlow(flowFormulario);
      }
    } catch (error) {
      console.error(error);
    }

    return await flowDynamic('Un último paso, para reservar!')

  })

const confirmacionReserva = addKeyword(EVENTS.ACTION)
  .addAnswer('Muy bien, ahora confirmaremos unos datos ☝️🤓')
  .addAnswer('Te dejo el resumen de tu formulario de reserva', null, async (_, { flowDynamic, state }) => {
    const datosUsuario = state.getMyState()
    await flowDynamic(`*Datos personales* \n- Nombre y apellidos: *${datosUsuario.nombre} ${datosUsuario.apellidos}*\n- Correo: *${datosUsuario.correo}*\n- Teléfono: *${datosUsuario.telefono}*\n\n *Datos de la reserva:* \n\n- Fecha: *${datosUsuario.fechaObj.fecha}*\n- Servicio: *${datosUsuario.servicioObj.servicio.nombre}*\n- Duración: *${datosUsuario.servicioObj.servicio.realizacion}*\n- Hora: *${datosUsuario.bloqueObj.bloque}* \n-Método de pago: *${datosUsuario.metodoObj.metodo.nombre}*`)
  })

  .addAction(async (ctx, { gotoFlow, flowDynamic }) => {
    return gotoFlow(flowConsultaConfirmacion);

  })

const flowConsultaConfirmacion = addKeyword(EVENTS.ACTION)
  .addAnswer('Digita \n 1. Sí estás de acuerdo \n 2. Sí no estás de acuerdo', { capture: true, delay: 3000 }, async (ctx, { gotoFlow, flowDynamic, endFlow }) => {
    if (ctx.body === '1') {
      return gotoFlow(FlowReservaFinal);
    } else if (ctx.body === '2') {
      await flowDynamic("Se ha cancelado tu proceso, esperamos poder contar con su presencia en futuras citas.");
      return gotoFlow(flowPrincipal)
    }
  })


const FlowReservaFinal = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, { gotoFlow, flowDynamic, endFlow, state }) => {
    const numero = ctx.from;
    const datosUsuario = state.getMyState()
    const codigo_reservacion = await insertarReserva(
      datosUsuario.id_cliente,
      datosUsuario.codigo_cliente,
      datosUsuario.id_persona,
      datosUsuario.nombre,
      datosUsuario.apellidos,
      datosUsuario.correo,
      datosUsuario.telefono,
      datosUsuario.fechaObj.fecha,
      datosUsuario.servicioObj.servicio.nombre,
      datosUsuario.servicioObj.servicio.realizacion,
      datosUsuario.bloqueObj.bloque,
      datosUsuario.metodoObj.metodo.id)
    console.log(codigo_reservacion)

    return await flowDynamic(`Tú reserva ha sido registrada! \n El código de reserva es el siguiente: *${codigo_reservacion}*`)

  })
  .addAction(async (_, { flowDynamic }) => {
    return await flowDynamic('Esto es todo. ¡Gracias por confiar en nuestros servicios! Le esperamos.')
  });

const flowHorariosYubicaciones = addKeyword('2', {
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
      formattedResponse += '\n📌 Si necesitas regresar al menú principal, envia *99*.';
    });

    await flowDynamic(formattedResponse);
  })





//////////////////////////////////////////////////////////////////////////////////////

// Función para consumir la ruta /cotizacionproducto en el servidor Flask
async function getCotizacionProducto() {
  try {
    // Reemplaza la URL con la dirección de tu servidor Flask
    const apiUrl = 'http://127.0.0.1:5000/cotizacionproducto';

    // Realiza la solicitud GET a la API de Flask
    const response = await axios.get(apiUrl);

    // Retorna los datos obtenidos
    console.log(response.data);
    return response.data;

  } catch (error) {
    // Maneja errores
    console.error('Error al llamar a la API:', error.response ? error.response.data : error.message);
    throw error;
  }
}
async function enviarCodigoProducto(codigoProducto, numero) {
  try {
    console.log(numero)
    const apiUrl = 'http://127.0.0.1:5000/cotizacionproducto'; // Reemplaza con tu dirección y puerto reales
    const response = await axios.post(apiUrl, { codigoProducto, numero });
    console.log('Respuesta del servidor:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error al enviar el código del producto:', error.response ? error.response.data : error.message);
    throw error;
  }
}
const flowhumano = addKeyword('97', { sensitive: true })
  .addAnswer('Para optimizar nuestra comunicación y proporcionarte una atención personalizada, por favor, comparte el código del producto que encuentras en el PDF. Estamos aquí para brindarte el mejor servicio posible.\n Si en algún momento deseas cancelar el proceso, simplemente envía *0*. Estamos aquí para adaptarnos a tus necesidades y brindarte la mejor experiencia posible.', { capture: true },
    async (ctx, { flowDynamic, endFlow, fallBack, state }) => {
      if (ctx.body.toLowerCase() === '0') {
        return endFlow('❌ Se ha cancelado el proceso ❌');
      }
      const opcion = parseInt(ctx.body);
      let numero = ctx.from;
      const cotizaciones = await getCotizacionProducto();
      console.log(cotizaciones);
      if (isNaN(opcion) || opcion < 1 || opcion > cotizaciones.length) {
        return fallBack();
      }


      try {
        const cotizacionSeleccionada = cotizaciones[opcion - 1];
        console.log(numero);
        await enviarCodigoProducto(cotizacionSeleccionada.id, numero);
        await flowDynamic(`Detalles del producto para asesoramiento:\nNombre del Producto: ${cotizacionSeleccionada.nombre}\nCódigo del Producto: ${cotizacionSeleccionada.index}`);
      } catch (error) {
        // Manejar el error utilizando flowDynamic
        await flowDynamic('Ocurrió un error al procesar la solicitud. Por favor, inténtalo de nuevo.');
      }
    });
/** Flow 4. Servicios y productos  */
const flowProductos = addKeyword('1', {
  sensitive: true
})
  .addAnswer('Está bien! 🫡 te enviaré un PDF con los productos que ofrecemos: 📄')
  .addAnswer('📄', {
    // URL para descargar el PDF de SERVICIOS
    media: 'http://127.0.0.1:5000/static/pdf/productos/Productos.pdf'
  })
  .addAnswer('Si deseas recibir asesoramiento personalizado, por favor, selecciona la opción *97* para comunicarte con nuestro experimentado equipo.\n Si deseas regresar al menú principal en cualquier momento, simplemente envía *99*.\n Estamos aquí para asistirte en lo que necesites.');

const flowServicios = addKeyword('2', {
  sensitive: true
})
  .addAnswer('🧽🚿Nuestros servicios:')
  .addAnswer('Te dejó un PDF con más información de los servicios 👀📄:')
  .addAnswer('📄', {
    // URL para descargar el PDF de SERVICIOS
    media: 'http://127.0.0.1:5000/static/pdf/servicios/Servicios.pdf'
  })
  .addAnswer('Para volver al inicio 🏠 envia 99')

const flowFormularioServiciosYProductos = addKeyword('3', {
  sensitive: true
})
  .addAction(async (_, { flowDynamic }) => {
    return await flowDynamic('🫡 ¿Qué información necesitas sobre nuestros servicios de autolavado?\n1. 🛒 Consultar Productos \n2. 🚗 Solicitar Servicios\n✍️ Ingresa el número correspondiente a la acción que deseas realizar.\n❌ Para cancelar, simplemente escribe *3* o *0*.\n📌 Si necesitas regresar al menú principal, envia  *99*.')
  })
  .addAction({ capture: true }, async (ctx, { flowDynamic, endFlow, gotoFlow }) => {
    const opcion = parseInt(ctx.body);
    switch (opcion) {
      case 1: return gotoFlow(flowProductos);
      case 2: return gotoFlow(flowServicios);
      case 0: case 3: return endFlow('Has cancelado la operación, Hasta luego !')
      default: return await flowDynamic('Lo siento, no entendí esa opción. Por favor, envia 99 para ver todas nuestra opciones');
    }
  });
const obtenerReservaciones = async (telefono) => {
  try {
    const apiUrl = 'http://127.0.0.1:5000/obtener_reservaciones_estado_1'; // Reemplaza con la URL real de tu API
    const response = await axios.get(`${apiUrl}/${telefono}`);

    return response.data;
  } catch (error) {
    console.error('Error al llamar a la API:', error.response ? error.response.data : error.message);
    throw error;
  }
};
const cancelarReserva = async (codigoReserva) => {
  try {
    const apiUrl = `http://127.0.0.1:5000/cancelar_reserva/${codigoReserva}`;
    const response = await axios.post(apiUrl);

    return response.data;
  } catch (error) {
    console.error('Error al llamar a la API:', error.response ? error.response.data : error.message);
    throw error;
  }
};

const cancelarReservaFlow = addKeyword('4', {
  sensitive: true
})
  .addAnswer('¡Entendido! Aquí están tus reservas pendientes:\n', null, async (ctx, { flowDynamic, fallBack, endFlow }) => {
    const reservaciones = await obtenerReservaciones(ctx.from);

    if (reservaciones.length === 0) {
      // No hay reservas pendientes
      await flowDynamic('No tienes reservas pendientes en este momento.');
      return endFlow('Gracias por utilizar nuestro servicios los esperamos pronto')
    }

    let formattedResponse = 'Estas son tus reservas pendientes:\n\n';
    reservaciones.forEach((reserva, index) => {
      formattedResponse += `${index + 1}. Código: ${reserva.codigo}\n-Fecha: ${reserva.fecha}\n-Hora de inicio ${reserva.hora_inicio}\n-Hora de finalización ${reserva.hora_fin}`;
    });

    formattedResponse += '\nPor favor, responde con el número de la reserva que deseas cancelar, si deseas cancelar esta operación envía *0*.';
    await flowDynamic(formattedResponse);
  })
  .addAction({ capture: true }, async (ctx, { flowDynamic, gotoFlow, fallBack, endFlow }) => {
    const opcion = parseInt(ctx.body);
    const reservaciones = await obtenerReservaciones(ctx.from);
    if (ctx.body === "0") {
      return endFlow('Se ha cancelado tu proceso, esperamos poder contar con su presencia en futuras citas.')
    }
    if (isNaN(opcion) || opcion < 1 || opcion > reservaciones.length) {
      return fallBack('Por favor, responde con un número válido de reserva o envía *0* para cancelar la operación.');
    }

    const reservaSeleccionada = reservaciones[opcion - 1];

    try {
      await cancelarReserva(reservaSeleccionada.codigo);
      await flowDynamic(`La reserva con código ${reservaSeleccionada.codigo} ha sido cancelada. ¡Gracias!`);
    } catch (error) {
      await flowDynamic('Error al cancelar la reserva. Por favor, inténtalo de nuevo.');
    }
  });
  const enviarImagenAServidorFlask = async (imageBuffer, telefono) => {
    try {
      const formData = new FormData();
  
      // Agregar la imagen al FormData
      formData.append('foto', imageBuffer, { filename: 'file.jpeg' });
  
      // Agregar el número de teléfono al FormData
      formData.append('telefono', telefono);
  
      // Realizar la solicitud HTTP POST al servidor Flask
      const response = await axios.post('http://127.0.0.1:5000/sinpe', formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });
  
      return response.data;
    } catch (error) {
      throw error;
    }
  };
  
  
  function generarNombreTemporal() {
    const timestamp = new Date().getTime();
    const randomString = Math.random().toString(36).substring(7);
    return `imagen_${timestamp}_${randomString}.jpeg`;
  }
   
  const flowSinpe = addKeyword('5', { sensitive: true })
  .addAnswer("Hola, envía tu foto del pago hecho en Sinpe")
  .addAction({ capture: true }, async (ctx, { flowDynamic, gotoFlow, fallBack, endFlow }) => {
    // Tu código para descargar y guardar la imagen aquí
    const { downloadMediaMessage } = require("@whiskeysockets/baileys");
    const fs = require('fs');
    const numerotelefono=ctx.from;
    try {
      const buffer = await downloadMediaMessage(ctx, "buffer");
      fs.writeFileSync(generarNombreTemporal(), buffer);
      const telefono = ctx.from;
      const response = await enviarImagenAServidorFlask(buffer, telefono);
      
      // Capturar el mensaje del servidor y enviarlo al usuario
      const mensajeServidor = response.mensaje;
      await flowDynamic(mensajeServidor);
       
      // Aquí puedes realizar cualquier otra acción necesaria después de guardar la imagen
    } catch (error) {
      console.error("Error al descargar o guardar la imagen:", error);
      // Puedes manejar el error de alguna manera apropiada, por ejemplo:
      // return ctx.reply("Hubo un error al procesar tu imagen. Por favor, inténtalo de nuevo.");
    }
  });


async function obtenerReservacionesHoyAdmin() {
  try {
    // Reemplaza la URL con la dirección de tu servidor Flask
    const apiUrl = 'http://127.0.0.1:5000/reservaciones_hoy_admin';

    // Realiza la solicitud GET a la API de Flask
    const response = await axios.get(apiUrl);

    // Retorna los datos obtenidos
    return response.data;
  } catch (error) {
    // Maneja errores
    console.error('Error al llamar a la API:', error.response ? error.response.data : error.message);
    throw error;
  }
}
async function obtenerReservacionesHoyAdminestado() {
  try {
    // Reemplaza la URL con la dirección de tu servidor Flask
    const apiUrl = 'http://127.0.0.1:5000/reservaciones_hoy_admin_estado';

    // Realiza la solicitud GET a la API de Flask
    const response = await axios.get(apiUrl);

    // Retorna los datos obtenidos
    return response.data;
  } catch (error) {
    // Maneja errores
    console.error('Error al llamar a la API:', error.response ? error.response.data : error.message);
    throw error;
  }
}

const flowVerCitas = addKeyword('1', {
  sensitive: true
})
  .addAnswer('¡Claro! Aquí están las reservaciones de hoy:', null, async (ctx, { flowDynamic }) => {
    try {
      // Llama a la función que obtiene las reservaciones de hoy para el administrador
      const reservaciones = await obtenerReservacionesHoyAdmin();

      // Formatear la respuesta
      let formattedResponse = '';
      reservaciones.forEach(reserva => {
        formattedResponse += `*Código:* ${reserva.codigo}\n`;
        formattedResponse += `*Fecha:* ${reserva.fecha}\n`;
        formattedResponse += `*Hora de inicio:* ${reserva.hora_inicio}\n\n`;
        formattedResponse += `*Hora de finalización:* ${reserva.hora_fin}\n\n`;
      });

      // Muestra la respuesta formateada usando flowDynamic
      await flowDynamic(formattedResponse);
    } catch (error) {
      console.error('Error al obtener reservaciones:', error.message);
      await flowDynamic('Hubo un error al obtener las reservaciones. Por favor, inténtalo de nuevo.');
    }
  });

async function cambiarEstadoReserva(codigoReserva) {
  try {
    const apiUrl = 'http://127.0.0.1:5000/cambiar_estado_reserva'; // Reemplaza con la URL real de tu API

    // Realiza la solicitud POST a la API de Flask con el código de reserva
    const response = await axios.post(apiUrl, { codigo_reserva: codigoReserva });

    // Retorna la respuesta obtenida
    return response.data;
  } catch (error) {
    console.error('Error al llamar a la API:', error.response ? error.response.data : error.message);
    throw error;
  }
}
const flowempezarlavado = addKeyword('2', {
  sensitive: true
})
  .addAnswer('¡Entendido! Aquí están tus reservas para comenzar:\n', null, async (ctx, { flowDynamic }) => {
    const reservaciones = await obtenerReservacionesHoyAdmin();

    if (reservaciones.length === 0) {
      // No hay reservas pendientes
      return await flowDynamic('No tienes reservas  en este momento.');
    }

    let formattedResponse = 'Estas son tus reservas para lavar:\n\n';
    reservaciones.forEach((reserva, index) => {
      formattedResponse += `${index + 1}. Código: ${reserva.codigo}, Fecha: ${reserva.fecha}\n , Hora de inicio: ${reserva.hora_inicio}\n , Hora finalizacion: ${reserva.hora_fin}\n`;
    });

    formattedResponse += '\nPor favor, responde con el número de la reserva que deseas empezar.';
    await flowDynamic(formattedResponse);
  })
  .addAction({ capture: true }, async (ctx, { flowDynamic, gotoFlow, endFlow }) => {
    const opcion = parseInt(ctx.body);
    const reservaciones = await obtenerReservacionesHoyAdmin();

    if (isNaN(opcion) || opcion < 1 || opcion > reservaciones.length) {
      return await flowDynamic('Por favor, responde con un número válido de reserva o envía *Cancelar* para cancelar la operación.');
    }

    const reservaSeleccionada = reservaciones[opcion - 1];

    try {
      await cambiarEstadoReserva(reservaSeleccionada.codigo);
      await flowDynamic(`La reserva con código ${reservaSeleccionada.codigo} ha sido empezada. ¡Gracias!`);
    } catch (error) {
      await flowDynamic('Error al cancelar la reserva. Por favor, inténtalo de nuevo.');
    }
  });

const realizarVenta = async (codigo) => {
  try {
    const response = await axios.post('http://127.0.0.1:5000/realizar_venta', {
      codigo: codigo,
    });

    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error(error.response.data);
    throw error.response.data;
  }
};
let FechaJ;
let dateobj;
let codigo;
const flowterminarlavado = addKeyword('3', {
  sensitive: true
})
  .addAnswer(['👀 Es hora de terminar el lavado'])
  .addAnswer(['📅 Estos son los lavados en proceso:'], null, async (ctx, { flowDynamic }) => {
    try {
      // Obtener las reservaciones
      const reservas = await obtenerReservacionesHoyAdminestado();

      // Formatear la respuesta
      let formattedResponse = '';
      let indice = 1;

      // Mapear las reservaciones y construir la respuesta formateada
      FechaJ = reservas.map((reserva, index) => {
        formattedResponse += `*${index + 1}. Código:* ${reserva.codigo}\n` +
          `*Fecha:* ${reserva.fecha}\n` +
          `*Hora de inicio:* ${reserva.hora_inicio}\n\n` +
          `*Hora de finalización:* ${reserva.hora_fin}\n\n` +
          `*Total:* ${reserva.subtotal}\n\n`;
        return { index: indice++, formattedResponse, codigo: reserva.codigo, idcliente: reserva.idcliente, precios: reserva.subtotal };
      });

      // Enviar la respuesta formateada
      await flowDynamic(formattedResponse);
    } catch (error) {
      console.error('Error al obtener las reservaciones:', error);
      // Manejar el error según tus necesidades
    }
  })
  .addAnswer(['👀 *Escribe el número de la cita*'], { capture: true }, async (ctx, { flowDynamic, fallBack, state }) => {
    try {
      // Buscar la fecha seleccionada por el usuario
      dateobj = FechaJ.find(reserva => reserva.index === parseInt(ctx.body));

      console.log(dateobj);

      if (!dateobj) {
        return fallBack();
      }
      codigo = dateobj.codigo;


      // Actualizar el estado con la variable dateobj, codigo, idcliente y precios
      await state.update({ dateobj: dateobj, codigo: codigo });
      console.log('mensaje entrante: ', ctx.body);
      try {
        const response = await realizarVenta(codigo);
        const idventa = response.id_venta; // Obtén el ID de la venta desde la respuesta

        // Ejecuta el flujo para éxito
        await flowDynamic(`Se ha generado la venta con éxito con el  código de venta es: V-${idventa}`);
      } catch (error) {
        // Ejecuta el flujo para error
        await flowDynamic('Error al generar la venta. Por favor, inténtalo de nuevo.');
      }
    } catch (error) {
      console.error('Error al procesar la respuesta:', error);
      // Manejar el error según tus necesidades
    }
  });
const validaradmin = async (numeroCelular) => {
  try {
    const apiUrl = 'http://127.0.0.1:5000'; // Reemplaza con la URL real de tu API

    const response = await axios.post(apiUrl + '/validar_usuario_por_telefono', {
      telefono: numeroCelular
    });

    // Manejar la respuesta del servidor
    if (response.status === 200) {
      const data = response.data;
      console.log('Respuesta del servidor:', data);
      return data.nombre;
    } else {
      console.error('Error al validar el número de celular:', response.data);
      return null;
    }
  } catch (error) {
    console.error('Error al llamar a la API:', error.message);
    throw error;
  }
};
const flowPrincipaladmin = addKeyword('11', {
  sensitive: true
})
  .addAction(async (ctx, { gotoFlow }) => {
    const numero = ctx.from;
    console.log(numero);
    try {
      const nombreUsuario = await validaradmin(numero);

      if (nombreUsuario) {
        //  await flowDynamic("Un gusto verte por aquí de nuevo, " + nombreUsuario);
        //return gotoFlow(flowPrincipaladmins);
      } else {
        console.log('El número de celular no existe en la tabla de personas.');
        return gotoFlow(flowPrincipal);
      }
    } catch (error) {
      console.error(error);
    }


  })
  .addAnswer(
    [
      'Nuestras opciones 🚗:',
      '👉 *1. Ver citas hoy*',
      '👉 *2. Empezar lavado*',
      '👉 *3. Finalizar lavado*',
      '*Ingresa un numero para continuar*'
    ],
    {

    }, null, [flowVerCitas, flowempezarlavado, flowterminarlavado]
  );



//////////////////////////////////////////////////////////////////////////////////////
const flowNotaDeVoz = addKeyword(EVENTS.VOICE_NOTE)
  .addAnswer('🚗 ¡Hola! Bienvenido LAVACAR ASOCATIE. 🌟 ¿Cómo puedo ayudarte hoy?')
  .addAnswer(
    [
      'Te ofrecemos nuestros servicios de autolavado 🚗:',
      '👉 *1. Agendar cita*',
      '👉 *2. Horarios y ubicaciones*',
      '👉 *3. Servicios y productos*',
      '👉 *4. Cancelar reserva*',
      '👉 *5. Enviar comprobante de pago sinpe*',
      '*Ingresa un número para continuar*'
    ],
    {

    }, null, [flowReserva, flowHorariosYubicaciones, flowFormularioServiciosYProductos, flowConsultaConfirmacion, cancelarReservaFlow, flowSinpe]
  );

const flowVideos = addKeyword(EVENTS.MEDIA)
  .addAnswer('🚗 ¡Hola! Bienvenido LAVACAR ASOCATIE. 🌟 ¿Cómo puedo ayudarte hoy?')
  .addAnswer(
    [
      'Te ofrecemos nuestros servicios de autolavado 🚗:',
      '👉 *1. Agendar cita*',
      '👉 *2. Horarios y ubicaciones*',
      '👉 *3. Servicios y productos*',
      '👉 *4. Cancelar reserva*',
      '👉 *5. Enviar comprobante de pago sinpe*',
      '*Ingresa un número para continuar*'
    ],
    {

    }, null, [flowReserva, flowHorariosYubicaciones, flowFormularioServiciosYProductos, flowConsultaConfirmacion, cancelarReservaFlow, flowSinpe]
  );

const flowPDF = addKeyword(EVENTS.DOCUMENT)
  .addAnswer('🚗 ¡Hola! Bienvenido LAVACAR ASOCATIE. 🌟 ¿Cómo puedo ayudarte hoy?')
  .addAnswer(
    [
      'Te ofrecemos nuestros servicios de autolavado 🚗:',
      '👉 *1. Agendar cita*',
      '👉 *2. Horarios y ubicaciones*',
      '👉 *3. Servicios y productos*',
      '👉 *4. Cancelar reserva*',
      '👉 *5. Enviar comprobante de pago sinpe*',
      '*Ingresa un número para continuar*'
    ],
    {

    }, null, [flowReserva, flowHorariosYubicaciones, flowFormularioServiciosYProductos, flowConsultaConfirmacion, cancelarReservaFlow, flowSinpe]
  );


const flowPrincipal = addKeyword(EVENTS.WELCOME)
  .addAnswer('🚗 ¡Hola! Bienvenido LAVACAR ASOCATIE. 🌟 ¿Cómo puedo ayudarte hoy?')
  .addAnswer(
    [
      'Te ofrecemos nuestros servicios de autolavado 🚗:',
      '👉 *1. Agendar cita*',
      '👉 *2. Horarios y ubicaciones*',
      '👉 *3. Servicios y productos*',
      '👉 *4. Cancelar reserva*',
      '👉 *5. Enviar comprobante de pago sinpe*',
      '*Ingresa un número para continuar*'
    ],
    {

    }, null, [flowReserva, flowHorariosYubicaciones, flowFormularioServiciosYProductos, flowConsultaConfirmacion, cancelarReservaFlow, flowSinpe]
  );
const obtenerListaNegra = async () => {
  try {
    const apiUrl = 'http://127.0.0.1:5000'; // Reemplaza con la URL real de tu API

    const response = await axios.get(apiUrl + '/lista_negra');

    // Manejar la respuesta del servidor
    if (response.status === 200) {
      const data = response.data;
      return data.lista_negra;
    } else {
      console.error('Error al obtener la lista negra:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Error al llamar a la API:', error.message);
    throw error;
  }
};

const main = async () => {
  const adapterDB = new MockAdapter();
  const adapterFlow = createFlow([flowVideos, flowPDF, flowNotaDeVoz, flowPrincipaladmin, flowPrincipal, flowConsultaCliente, flowFormulario, confirmacionReserva, FlowReservaFinal]);
  const adapterProvider = createProvider(BaileysProvider);
  let blackLists = []; // Inicializar blackLists

  try {


    const listaNegra = await obtenerListaNegra();
    console.log(listaNegra);
    blackLists = listaNegra.map(registro => registro.telefono);
    console.log(`Teléfonos en la lista negra: ${blackLists}`);
    // Crear el bot con la lista negra actualizada
    await createBot({
      flow: adapterFlow,
      provider: adapterProvider,
      database: adapterDB,
    }, {
      blackList: blackLists
    });

  }
  catch (error) {
    console.error('Error:', error);
  }
  QRPortalWeb();

}

main();
