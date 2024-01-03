const pool = require('../db');
const { addKeyword } = require("@bot-whatsapp/bot");
const FlowHorarios = addKeyword('3','horario','orario')
.addAnswer('Esto es una prueba de horarios');


module.export={FlowHorarios}