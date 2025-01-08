'use strict'

//-------------

require('dotenv').config();

//--
const express = require('express');
const bodyParser = require('body-parser')
const app = express();
require('express-ws')(app);

const webSocket = require('ws');

app.use(bodyParser.json());

const fsp = require('fs').promises;
const moment = require('moment');

//---- CORS policy - Update this section as needed ----

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "OPTIONS,GET,POST,PUT,DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
  next();
});

//----- OpenAI info ----

const openAiApiKey = process.env.OPENAI_API_KEY;
const openAiEndpoint = process.env.OPENAI_ENDPOINT;
const openAiModel = process.env.OPENAI_MODEL;
const openAiVoiceName = process.env.OPENAI_VOICE_NAME;
const openAiSystemMessage = process.env.OPENAI_SYTEM_MESSAGE;
const openAiInputAudioTranscription = process.env.OPENAI_INPUT_AUDIO_TRANSCRIPTION;
const openAiTurnDetectionType = process.env.OPENAI_TURN_DETECTION_TYPE;

const openAiSessionSettings = {
  type: "session.update",
  session: {
    input_audio_format: "pcm16",
    output_audio_format: "pcm16",
    turn_detection: {
      type: openAiTurnDetectionType,
      // threshold: 0.5,
      // prefix_padding_ms: 300,
      silence_duration_ms: 300
    },
    input_audio_transcription: {
      model: openAiInputAudioTranscription
    },
    voice: openAiVoiceName,
    instructions: openAiSystemMessage,
    modalities: ["text", "audio"],
    temperature: 0.8,
    // max_response_output_tokens: "inf",
    // "tools": [
    //   {
    //     type: "function",
    //     name: "get_weather",
    //     description: "Get the current weather...",
    //     parameters: {
    //       type: "object",
    //       properties: {
    //         location: { "type": "string" }
    //       },
    //       required: ["location"]
    //     }
    //   }
    // ],
    // tool_choice: "auto",
  }
};

//--- Linear 16-bit raw audio sampling frequency resamplers ---
const l16AudioDownsampler = require('./l16audio-downsampler.cjs');
const l16AudioUpsampler = require('./l16audio-upsampler.cjs');

//--- Audio silence payload for linear 16-bit, 16 kHz, mono ---
const hexSilencePayload = "f8ff".repeat(320);
// console.log('hexSilencePayload:', hexSilencePayload);
const silenceAudioPayload = Buffer.from(hexSilencePayload, "hex"); // 640-byte payload for silence - 16 bits - 16 kHz - PCM
// console.log('silenceMsg:', silenceMsg);

//--- Record all audio ? --
let recordAllAudio = false;
if (process.env.RECORD_ALL_AUDIO == "true") { recordAllAudio = true };

//==========================================================================

app.ws('/socket', async (ws, req) => {

  let wsOAIOpen = false; // WebSocket to OpenAI ready for binary audio payload?
  let wsVgOpen = true; // WebSocket to Vonage ready for binary audio payload?

  const peerUuid = req.query.peer_uuid;

  console.log('>>> Websocket connected with');
  console.log('original call uuid:', peerUuid);

  //-- audio recording files -- 
  const audioFromVgFileName = './recordings/' + peerUuid + '_rec_from_vg_' + moment(Date.now()).format('YYYY_MM_DD_HH_mm_ss_SSS') + '.raw'; // using local time
  const audioToOAiFileName = './recordings/' + peerUuid + '_rec_to_oai_' + moment(Date.now()).format('YYYY_MM_DD_HH_mm_ss_SSS') + '.raw'; // using local time
  const audioFromOAiFileName = './recordings/' + peerUuid + '_rec_from_oai_' + moment(Date.now()).format('YYYY_MM_DD_HH_mm_ss_SSS') + '.raw'; // using local time
  const audioToVg1FileName = './recordings/' + peerUuid + '_rec_to_vg_1_' + moment(Date.now()).format('YYYY_MM_DD_HH_mm_ss_SSS') + '.raw'; // using local time
  const audioToVg2FileName = './recordings/' + peerUuid + '_rec_to_vg_2_' + moment(Date.now()).format('YYYY_MM_DD_HH_mm_ss_SSS') + '.raw'; // using local time

  let file;

  if (recordAllAudio) {

    try {
      file = await fsp.writeFile(audioToOAiFileName, '');
    } catch(e) {
      console.log("Error creating file", audioToOAiFileName, e);
    }
    console.log('File created:', audioToOAiFileName);

    try {
      file = await fsp.writeFile(audioFromVgFileName, '');
    } catch(e) {
      console.log("Error creating file", audioFromVgFileName, e);
    }
    console.log('File created:', audioFromVgFileName);

    try {
      file = await fsp.writeFile(audioFromOAiFileName, '');
    } catch(e) {
      console.log("Error creating file", audioFromOAiFileName, e);
    }
    console.log('File created:', audioFromOAiFileName);

    try {
      file = await fsp.writeFile(audioToVg1FileName, '');
    } catch(e) {
      console.log("Error creating file", audioToVg1FileName, e);
    }
    console.log('File created:', audioToVg1FileName);

    try {
      file = await fsp.writeFile(audioToVg2FileName, '');
    } catch(e) {
      console.log("Error creating file", audioToVg2FileName, e);
    }
    console.log('File created:', audioToVg2FileName);

  }  

  //-- stream audio to VG --

  let oAIPayload = Buffer.alloc(0);
  let streamToVgIndex = 0;

  //-

  const streamTimer = setInterval ( () => {

    if (oAIPayload.length != 0) {

      const streamToVgPacket = Buffer.from(oAIPayload).subarray(streamToVgIndex, streamToVgIndex + 640);  // 640-byte packet for linear16 / 16 kHz
      streamToVgIndex = streamToVgIndex + 640;

      if (streamToVgPacket.length != 0) {
        if (wsVgOpen && streamToVgPacket.length == 640) {
            ws.send(streamToVgPacket);

            if (recordAllAudio) {
              try {
                fsp.appendFile(audioToVg2FileName, streamToVgPacket, 'binary');
              } catch(e) {
                console.log("error writing to file", audioToVg2FileName, e);
              }
            }  

        };
      } else {
        streamToVgIndex = streamToVgIndex - 640; // prevent index from increasing for ever as it is beyond buffer current length
        ws.send(silenceAudioPayload);
      }

    }  

  }, 20);

  //--

  console.log('Opening WebSocket connection to OpenAI Realtime');

  const wsOAI = new webSocket("wss://" + openAiEndpoint + '?model=' + openAiModel, {
    headers: {
      authorization: "Bearer " + openAiApiKey,
      "OpenAI-Beta": "realtime=v1" }
  });

  //--

  wsOAI.on('error', async (event) => {

    console.log('WebSocket to OpenAI error:', event);

  });  

  //-- 

  wsOAI.on('open', () => {
      console.log('WebSocket to OpenAI opened');
      wsOAI.send(JSON.stringify(openAiSessionSettings));
      wsOAIOpen = true;
  });

  //--

  wsOAI.on('message', async(msg, isBinary) =>  {

    const response = JSON.parse(msg);

    switch(response.type) {

      case 'response.done':

        console.log('>>>', Date.now(), response);

        if (response.response.status_details && response.response.status_details.type == 'failed') {
          console.log('>>> error:',response.response.status_details.error )
        }

        break;

      //--  

      case 'response.audio.delta':

        //-- do not display full msg, too large to display

        if (response.delta) {
          const payloadInFromOAi = Buffer.from(response.delta, 'base64');
          // console.log('>>> Raw audio payload from OpenAI', Date.now(), 'length', payloadInFromOAi.length);
  
          if (recordAllAudio) {
            try {
              fsp.appendFile(audioFromOAiFileName, payloadInFromOAi, 'binary');
            } catch(e) {
              console.log("error writing to file", audioFromOAiFileName, e);
            }
          }      
     
          //-- downsampling  --
          const payloadToVg = await l16AudioDownsampler(payloadInFromOAi, 24000, 16000);
          // console.log('>>>', Date.now(), 'Audio to Vonage payload length:', payloadToVg.length);

          if (recordAllAudio) {
            try {
              fsp.appendFile(audioToVg1FileName, payloadToVg, 'binary');
            } catch(e) {
              console.log("error writing to file", audioToVg1FileName, e);
            }
          }  

          if(wsVgOpen) {
            oAIPayload = Buffer.concat([oAIPayload, payloadToVg]);
          }

        }  
       
        break;  

      //--  

      case 'input_audio_buffer.speech_started':

        console.log('>>>', Date.now(), response);
      
        // barge-in handling
        oAIPayload = Buffer.alloc(0);  // reset stream buffer to VG
        streamToVgIndex = 0;   

        break;

      //--  

      default:

        console.log('>>>', Date.now(), response);
      
        // console.log('>>> response.type:', response.type);  

    }

  });

  //--

  wsOAI.on('close', async () => {

    wsOAIOpen = false; // stop sending audio payload to OAI platform
    
    console.log("OpenAI WebSocket closed");
  });

  //---------------

  ws.on('message', async (msg) => {
    
    if (typeof msg === "string") {
    
      console.log("\n>>> Vonage WebSocket text message:", msg);
    
    } else {

      if (recordAllAudio) {
        try {
          fsp.appendFile(audioFromVgFileName, msg, 'binary');
        } catch(e) {
          console.log("error writing to file", audioFromVgFileName, e);
        }
      }  

      //---  

      if(wsOAIOpen) {

        //-- upsampling --
        const processedAudio = await l16AudioUpsampler(msg, 16000, 24000);

        if (recordAllAudio) {
          try {
            fsp.appendFile(audioToOAiFileName, processedAudio, 'binary');
          } catch(e) {
            console.log("error writing to file", audioToOAiFileName, e);
          }
        }  

        // console.log('>>>', Date.now(), 'Audio to OpenAI payload length:', processedAudio.length);

        const payloadToRtOpenAi = {
          type: 'input_audio_buffer.append',
          audio: processedAudio.toString('base64')
        }

        wsOAI.send(JSON.stringify(payloadToRtOpenAi));

      }

    }

  });

  //--

  ws.on('close', async () => {

    clearInterval(streamTimer);

    wsVgOpen = false; // can no longer send audio payload to VG platform
    wsOAIOpen = false; // stop sending audio payload to OpenAI platform

    wsOAI.close(); // close WebSocket to OpenAI
    
    console.log("Vonage WebSocket closed");
  });

});

//================ For Vonage Cloud Runtime (VCR) only ==============
//--- If this application is hosted on VCR  --------

app.get('/_/health', async(req, res) => {

  res.status(200).send('Ok');

});

//=====================================================================

const port = process.env.NERU_APP_PORT || process.env.PORT || 6000;
app.listen(port, () => console.log(`OpenAI Connector server application listening on local port ${port}.`));

//------------