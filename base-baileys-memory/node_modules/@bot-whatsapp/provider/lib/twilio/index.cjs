/** 
* NO TOCAR ESTE ARCHIVO: Es generado automaticamente, si sabes lo que haces adelante ;)
* de lo contrario mejor ir a la documentacion o al servidor de discord link.codigoencasa.com/DISCORD
*/
'use strict';

var require$$0$1 = require('twilio');
var require$$1$1 = require('@bot-whatsapp/bot');
var require$$0 = require('node:events');
var require$$1 = require('node:fs');
var require$$2 = require('mime-types');
var require$$3 = require('polka');
var require$$4 = require('body-parser');

const parseNumber$2 = (number) => {
    return `${number}`.replace('whatsapp:', '').replace('+', '')
};

var utils = { parseNumber: parseNumber$2 };

const { EventEmitter } = require$$0;
const { existsSync, createReadStream } = require$$1;
const mime = require$$2;
const polka = require$$3;
const { urlencoded, json } = require$$4;
const { parseNumber: parseNumber$1 } = utils;

/**
 * Encargado de levantar un servidor HTTP con una hook url
 * [POST] /twilio-hook
 */
let TwilioWebHookServer$1 = class TwilioWebHookServer extends EventEmitter {
    twilioServer
    twilioPort
    constructor(_twilioPort) {
        super();
        this.twilioServer = this.buildHTTPServer();
        this.twilioPort = _twilioPort;
    }

    /**
     * Mensaje entrante
     * emit: 'message'
     * @param {*} req
     * @param {*} res
     */
    incomingMsg = (req, res) => {
        const { body } = req;
        this.emit('message', {
            ...body,
            from: parseNumber$1(body.From),
            to: parseNumber$1(body.To),
            body: body.Body,
        });
        const json = JSON.stringify({ body });
        res.end(json);
    }

    /**
     * Manejar los local media como
     * C\\Projects\\bot-restaurante\\tmp\\menu.png
     * para que puedas ser llevar a una url online
     * @param {*} req
     * @param {*} res
     */
    handlerLocalMedia = (req, res) => {
        const { query } = req;
        const file = query?.path;
        if (!file) return res.end(`path: invalid`)
        const decodeFile = decodeURIComponent(file);
        if (!existsSync(decodeFile)) return res.end(`not exits: ${decodeFile}`)
        const fileStream = createReadStream(decodeFile);
        const mimeType = mime.lookup(decodeFile);
        res.writeHead(200, { 'Content-Type': mimeType });
        fileStream.pipe(res);
    }

    /**
     * Contruir HTTP Server
     * @returns
     */
    buildHTTPServer = () => {
        return polka()
            .use(urlencoded({ extended: true }))
            .use(json())
            .post('/twilio-hook', this.incomingMsg)
            .get('/tmp', this.handlerLocalMedia)
    }

    /**
     * Puerto del HTTP
     * @param {*} port default 3000
     */
    start = () => {
        this.twilioServer.listen(this.twilioPort, () => {
            console.log(``);
            console.log(`[Twilio]: Agregar esta url "WHEN A MESSAGE COMES IN"`);
            console.log(`[Twilio]: POST http://localhost:${this.twilioPort}/twilio-hook`);
            console.log(`[Twilio]: Más información en la documentacion`);
            console.log(``);
        });
        this.emit('ready');
    }
};

var server = TwilioWebHookServer$1;

const twilio = require$$0$1;
const { ProviderClass } = require$$1$1;

const TwilioWebHookServer = server;
const { parseNumber } = utils;

/**
 * ⚙️TwilioProvider: Es un provedor que te ofrece enviar
 * mensaje a Whatsapp via API
 * info: https://www.twilio.com/es-mx/messaging/whatsapp
 * video: https://youtu.be/KoOmsHylxUw
 *
 * Necesitas las siguientes tokens y valores
 * { accountSid, authToken, vendorNumber }
 */

const PORT = process.env.PORT || 3000;

class TwilioProvider extends ProviderClass {
    twilioServer
    vendor
    vendorNumber
    publicUrl
    constructor({ accountSid, authToken, vendorNumber, port = PORT, publicUrl = '' }) {
        super();
        this.publicUrl = publicUrl;
        this.vendor = new twilio(accountSid, authToken);
        this.twilioServer = new TwilioWebHookServer(port);
        this.vendorNumber = parseNumber(vendorNumber);

        this.twilioServer.start();
        const listEvents = this.busEvents();

        for (const { event, func } of listEvents) {
            this.twilioServer.on(event, func);
        }
    }

    /**
     * Mapeamos los eventos nativos de  whatsapp-web.js a los que la clase Provider espera
     * para tener un standar de eventos
     * @returns
     */
    busEvents = () => [
        {
            event: 'auth_failure',
            func: (payload) => this.emit('error', payload),
        },
        {
            event: 'ready',
            func: () => this.emit('ready', true),
        },
        {
            event: 'message',
            func: (payload) => {
                this.emit('message', payload);
            },
        },
    ]

    /**
     * Enviar un archivo multimedia
     * https://www.twilio.com/es-mx/docs/whatsapp/tutorial/send-and-receive-media-messages-whatsapp-nodejs
     * @private
     * @param {*} number
     * @param {*} mediaInput
     * @returns
     */
    sendMedia = async (number, message, mediaInput = null) => {
        if (!mediaInput) throw new Error(`MEDIA_INPUT_NULL_: ${mediaInput}`)
        const urlEncode = `${this.publicUrl}/tmp?path=${encodeURIComponent(mediaInput)}`;
        const regexUrl = /^(?!https?:\/\/)[^\s]+$/;

        const urlNotice = [
            `[NOTA]: Estas intentando enviar una fichero que esta en local.`,
            `[NOTA]: Para que esto funcione con Twilio necesitas que el fichero este en una URL publica`,
            `[NOTA]: más informacion aqui https://bot-whatsapp.netlify.app/docs/provider-twilio/`,
            `[NOTA]: Esta es la url que se enviara a twilio (debe ser publica) ${urlEncode}`,
        ].join('\n');

        if (
            mediaInput.includes('localhost') ||
            mediaInput.includes('127.0.0.1') ||
            mediaInput.includes('0.0.0.0') ||
            regexUrl.test(mediaInput)
        ) {
            console.log(urlNotice);
            mediaInput = urlEncode;
        }

        number = parseNumber(number);
        return this.vendor.messages.create({
            mediaUrl: [`${mediaInput}`],
            body: message,
            from: `whatsapp:+${this.vendorNumber}`,
            to: `whatsapp:+${number}`,
        })
    }

    /**
     * Enviar botones
     * https://www.twilio.com/es-mx/docs/whatsapp/buttons
     * @private
     * @param {*} number
     * @param {*} message
     * @param {*} buttons []
     * @returns
     */
    sendButtons = async () => {
        this.emit(
            'notice',
            [
                `[NOTA]: Actualmente enviar botons con Twilio esta en desarrollo`,
                `[NOTA]: https://www.twilio.com/es-mx/docs/whatsapp/buttons`,
            ].join('\n')
        );
    }

    /**
     *
     * @param {*} number
     * @param {*} message
     * @param {*} param2
     * @returns
     */
    sendMessage = async (number, message, { options } = { options: {} }) => {
        number = parseNumber(number);
        if (options?.buttons?.length) this.sendButtons(number, message, options.buttons);
        if (options?.media) return this.sendMedia(number, message, options.media)
        return this.vendor.messages.create({
            body: message,
            from: `whatsapp:+${this.vendorNumber}`,
            to: `whatsapp:+${number}`,
        })
    }
}

var twilio_1 = TwilioProvider;

module.exports = twilio_1;
