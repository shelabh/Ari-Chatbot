const express = require('express');
// import prisma from '../lib/prisma';
const puppeteer = require('puppeteer');
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
  
const app = express();
const PORT = 3000;
  

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { Configuration, OpenAIApi } = require("openai");
require('dotenv').config()

const axios = require('axios');
const OpenWeatherMapAPIKey = '8ea6ba9395e4acef2083ee728437196a';




const client = new Client({
	authStrategy: new LocalAuth()
});


(async () => {
	const browser = await puppeteer.launch({
		args: ['--no-sandbox'],
		headless: true
	});
	// rest of your code here
	await browser.close();
})();

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
	console.log(sessionId)
	const conversationHistory = await prisma.conversation.findMany({
		where: {
		    	sessionId: sessionId
		},
	});
	// console.log(conversationHistory)
	
	let historyString = "";
	if (conversationHistory.length > 0) {
		const lastTenMessages = conversationHistory.slice(-10);
		lastTenMessages.forEach(conversation => {
			console.log(conversation)
		  	historyString += conversation.userMessage + "\n";
			historyString += conversation.botResponse + "\n";
		});
	}
	console.log(historyString);
	
	
	const basePrompt = " You are ARI, an ai travel assistant and you are a part of an online travel company known as Mienai. Only when introducing yourself add this to your response, use #report-to report any kind of isssue while using ari. Reply politely to greetings, goodbyes, appreciation, compliments, abuses and other normal conversation things. Only when asked about religious places provide appropriate clothing suggestions to both men and women. Provide deatiled information to user. Provide the contents of the answer of the travel-related query in a list format and easy to read format, use emojis to add more fun and make it more casual. You can help with all the travel-related queries, from providing information on transportation and accommodation to the best places to visit in a particular location. You are not capable of booking any transportation and accommodation at the moment. Provide all detailed information on restaurants, cafes, parks, museums, monuments, arcade places, markets, malls, street vendors, or anything else with reviews and address. Do not repeat the infromation provided in the same response.";
	const prompt = `${basePrompt}${historyString}${message}\n`;
	
	// The following is a converstaion with an AI Travel assistant named Ari which answers travel queries inside India. The assistant is helpful, creative, clever, and very friendly. Reply politely to greetings and goodbyes. The assistant can help with all the travel-related queries, from booking transportation and accommodation to providing information about the best places to visit in a particular location. Provide all information on restaurants, cafes, parks, museums, monuments, arcade places, markets, malls, street vendors, or anything else. Provide reviews and address.
	
	const completion = await openai.createCompletion({
		model: "text-davinci-003",
		prompt: prompt,
		temperature: 0.5,
		max_tokens: 1500,
		top_p: 1,
		frequency_penalty: 0,
		presence_penalty: 0,
	});
	
	return completion.data.choices[0].text;
}

// function to retrieve weather data for a given city
async function getWeatherData(city) {
	try {
		const res = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OpenWeatherMapAPIKey}`);
		const weatherData = res.data;
		return weatherData;
	} catch (error) {
		console.error(error);
		return error;
	}
}
// handler for weather related queries
async function handleWeatherQuery(message) {
	if (message.includes('weather') || message.includes('Weather') || message.includes('Temperature') || message.includes('temperature') || message.includes('humidity') || message.includes('Humidity') || message.includes('temp') || message.includes('Temp')){
		const city = (message.includes('in') ? message.split('in')[1] : message.split('of')[1]).trim();
		const weatherData = await getWeatherData(city);
	
	
		// format the weather data and send it as a message
		let weatherMessage = `The weather in ${city} is `;
		weatherMessage += `${weatherData.weather[0].description}. `;
		weatherMessage += `The temperature is ${(weatherData.main.temp - 273.15).toFixed(1)}°C. `;
		weatherMessage += `The humidity is ${weatherData.main.humidity}%. `;
		
		console.log(weatherMessage);
		// send the weather message using the WhatsApp-web.js library
		return weatherMessage;
	}
}


client.on('message', async message => {
	
	const sessionId = message.from;
	console.log(sessionId)
	console.log(message.body);

	
	if(message.body && message.body !== undefined) {
		if (message.body.startsWith("#report")){
			client.sendMessage(message.from, "Apologies for the trouble. Please report your issue here\nhttps://forms.gle/N4eZUVC3N2Sf67PPA")
		}
		else if (message.body.includes('weather') || message.body.includes('Weather') || message.body.includes('temperature') || message.body.includes('Temperature') || message.body.includes('temp') || message.body.includes('Temp') || message.body.includes('humidity') || message.body.includes('Humidity')){
			const weather = await handleWeatherQuery(message.body)
			client.sendMessage(message.from, weather)
		}
		else {
			const botResponse = await runCompletion(message.body, sessionId);
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