const express = require('express');
// import prisma from '../lib/prisma';

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
  
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

async function runCompletion (message, sessionId) {
	
	const conversationHistory = await prisma.conversation.findMany({
		where: {
		    	sessionId: sessionId
		},
	});
	const history = conversationHistory.slice(-5);
	
	const basePrompt = "The following is a converstaion with an friendly AI Travel assistant which answers travel queries inside India. The assistant has a casual tone. The assistant can help with all the travel-related queries, from booking transportation and accommodation to providing information about the best places to visit in a particular location. Do not complete the users's message and provide some random answer. Provide all information on restaurants, cafes, parks, museums, monuments, arcade places, markets, malls, street vendors, or anything else. Provide reviews and address. ";
	let prompt = basePrompt + history + message;

	const completion = await openai.createCompletion({
	    model: "text-davinci-003",
	    prompt: prompt,
	    temperature: 0.6,
	    max_tokens: 1500,
	});
	return completion.data.choices[0].text;
}



client.on('message', async message => {
	const sessionId = message.from;
	console.log(message.body);
	
	if(message.body && message.body !== undefined) {	
		if (message.body.startsWith('#')) {
			
			
			const botResponse = await runCompletion(message.body);
			client.sendMessage(message.from, botResponse);
			const conversation = await prisma.conversation.create({
				data: {
					userMessage: message.body,
					sessionId,
					botResponse: botResponse
				}
			});
		};
		
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