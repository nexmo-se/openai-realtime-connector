# Vonage API - OpenAI Speech-to-Speech Realtime API Connector

You may use this Connector server application to connect voice calls managed by a Vonage Voice API application to OpenAI's Speech-to-Speech Realtime API engine.

Voice calls may be from/to PSTN (cell phones, landline phones, fixed phones),  WebRTC (iOS/Android/JavaScript Vonage API Client SDK), SIP connections/trunks.

## About this Connector code

This connector makes use of the [WebSockets feature](https://developer.vonage.com/en/voice/voice-api/concepts/websockets) of Vonage Voice API.</br>
When a voice call is established, the peer Voice API application triggers a WebSocket connection to this Connector application then streams audio in both directions between the voice call and OpenAI engine in real time. 

You may deploy this [**sample Voice API application**]https://github.com/nexmo-se/voice-to-ai-engines to use this Connector code to bi-directionally stream audio between voice calls and OpenAI Speech-to-Speech engine running an LLM.

## Set up

### Get your credentials from OpenAI

Sign up with or log in to [OpenAI](https://platform.openai.com/).</br>

Create or use an existing OpenAI API key,
take note of it (as it will be needed as **`OPENAI_API_KEY`** in the next section).</br>

### Local deployment

#### Ngrok

For a `local deployment`, you may use ngrok (an Internet tunneling service) for both this Connector application and the [Voice API application](https://github.com/nexmo-se/voice-to-ai-engines) with [multiple ngrok endpoints](https://ngrok.com/docs/agent/config/v3/#multiple-endpoints).

To do that, [install ngrok](https://ngrok.com/downloads).</br>
Log in or sign up with [ngrok](https://ngrok.com/), from the ngrok web UI menu, follow the **Setup and Installation** guide.

Set up two domains, one to forward to the local port 6000 (as this Connector application will be listening on port 6000), the other one to the local port 8000 for the [Voice API application](https://github.com/nexmo-se/voice-to-ai-engines).

Start ngrok to start both tunnels that forward to local ports 6000 and 8000,</br>
please take note of the ngrok **Enpoint URL** that forwards to local port 6000 as it will be needed when setting the [Voice API application](https://github.com/nexmo-se/voice-to-ai-engines),
that URL looks like:</br>
`xxxxxxxx.ngrok.io` (for ngrok), `xxxxxxxx.herokuapp.com`, `myserver.mycompany.com:32000`  (as **`PROCESSOR_SERVER`** in the .env file of the [Voice API application](https://github.com/nexmo-se/voice-to-ai-engines)),</br>
no `port` is necessary with ngrok or heroku as public hostname,</br>
that host name to specify must not have leading protocol text such as https://, wss://, nor trailing /.

Copy the `.env.example` file over to a new file called `.env`:
```bash
cp .env.example .env
```

Update the argument of the parameter **`OPENAI_API_KEY`** in .env file<br>

Update the arguments of the following parameters as needed per your use case:
**`OPENAI_MODEL`**
**`OPENAI_VOICE_NAME`**
**`OPENAI_SYSTEM_MESSAGE`**
**`OPENAI_INPUT_AUDIO_TRANSCRIPTION`**

Do not change the arguments of parameters:
**`OPENAI_ENDPOINT`**
**`OPENAI_TURN_DETECTION_TYPE`** (used for barge-in, i.e. it stops playing the reponse when participant resumes speaking).

#### Node.js - This Connector application

Have Node.js installed on your system, this application has been tested with Node.js version 18.19<br>

Install node modules with the command:<br>
 ```bash
npm install
```

Launch the application:<br>
```bash
node openai-realtime-connector.cjs
```

Default local (not public!) of this application server `port` is: 8000.

#### Voice API application

Set up the samplle peer Voice API application per the instructions in its [repository](https://https://github.com/nexmo-se/voice-to-ai-engines).

Call in to phone number as set up in that application to interact with the OpenAI Speech-to-Speech engine.

### Cloud deployment

Instructions on how to deploy both this Connector application as well as the peer Voice API application to [Vonage Cloud Runtime](https://developer.vonage.com/en/vonage-cloud-runtime/getting-started/technical-details) serverless infrastructure will be posted here soon.

## Additional resources

If you have questions, join our [Community Slack](https://developer.vonage.com/community/slack) or message us on [X](https://twitter.com/VonageDev?adobe_mc=MCMID%3D61117212728348884173699984659581708157%7CMCORGID%3DA8833BC75245AF9E0A490D4D%2540AdobeOrg%7CTS%3D1740259490).
