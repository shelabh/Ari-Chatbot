const express = require('express');
// import prisma from '../lib/prisma';
const browser = await puppeteer.launch({args: ['--no-sandbox']});
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
  
const app = express();
const PORT = 3000;
  

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { Configuration, OpenAIApi } = require("openai");
require('dotenv').config()


const client = new Client({
	authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
	qrcode.generate(qr, {small: true});
});
client.on('authenticated', (session) => {
	console.log('ARI => Authenticated');
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
	let historyString = "";
	conversationHistory.forEach(conversation => {
	    historyString = conversation.text + "\n";
	});
	
	
	const basePrompt = " You are ARI, an ai travel assistant. Reply politely to greetings, goodbyes, appreciation, compliments, abuses and other normal conversation things. Provide deatiled information to user. Provide the contents of the answer of the travel-related query in a list format and easy to read format, use emojis to add more fun and make it more casual. You can help with all the travel-related queries, from booking transportation and accommodation to providing information about the best places to visit in a particular location. Provide all information on restaurants, cafes, parks, museums, monuments, arcade places, markets, malls, street vendors, or anything else. Provide reviews and address. Do not repeat the infromation provided in the same response.";
	const prompt = `${basePrompt}${historyString}${message}\n`;
	
	// The following is a converstaion with an AI Travel assistant named Ari which answers travel queries inside India. The assistant is helpful, creative, clever, and very friendly. Reply politely to greetings and goodbyes. The assistant can help with all the travel-related queries, from booking transportation and accommodation to providing information about the best places to visit in a particular location. Provide all information on restaurants, cafes, parks, museums, monuments, arcade places, markets, malls, street vendors, or anything else. Provide reviews and address.
	
	const completion = await openai.createCompletion({
		model: "text-davinci-003",
		prompt: prompt,
		temperature: 0.3,
		max_tokens: 1500,
		top_p: 1,
		frequency_penalty: 0,
		presence_penalty: 0,
	});
	
	return completion.data.choices[0].text;
}



client.on('message', async message => {
	const sessionId = message.from;
	console.log(message.body);
	
	if(message.body && message.body !== undefined) {
		if (message.body.startsWith("#report")){
			client.sendMessage(message.from, "Apologies for the trouble. Please report your issue here\nhttps://forms.gle/N4eZUVC3N2Sf67PPA")
		}
		else {
			const botResponse = await runCompletion(message.body);
			client.sendMessage(message.from, botResponse.trim());
			const conversation = await prisma.conversation.create({
				data: {
					userMessage: message.body,
					sessionId,
					botResponse: botResponse
				}
			});
		}
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