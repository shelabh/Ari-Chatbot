const express = require('express');
  
const app = express();
const PORT = 3000;
  
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { Configuration, OpenAIApi } = require("openai");
require('dotenv').config()


const client = new Client();

client.on('qr', (qr) => {
	qrcode.generate(qr, {small: true});
});
    
client.on('ready', () => {
	console.log('Client is ready!');
});

const configuration = new Configuration({
	apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function runCompletion (message) {
	const completion = await openai.createCompletion({
	    model: "text-davinci-003",
	    prompt: message,
	    max_tokens: 200,
	});
	return completion.data.choices[0].text;
}

client.on('message', message => {
	console.log(message.body);
    
	if(message.body.startsWith("#")) {
	    runCompletion(message.body.substring(1)).then(result => message.reply(result));
	}
});

client.initialize();


app.listen(PORT, (error) =>{
	if(!error)
		console.log("Server is Successfully Running, and App is listening on port "+ PORT)
	else 
		console.log("Error occurred, server can't start", error);
	}
);