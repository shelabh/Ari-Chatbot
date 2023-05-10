const express = require('express');
// import prisma from '../lib/prisma';

// const LanguageDetection = require('@smodin/fast-text-language-detection')
// const lid = new LanguageDetection()

// import { detect } from 'franc';


// const translate = require('translate-google');

// var Sentiment = require('sentiment');
// var sentiment = new Sentiment();

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
  
const app = express();
const PORT = 8080;

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const { Configuration, OpenAIApi } = require("openai");
require('dotenv').config()

const axios = require('axios');
const OpenWeatherMapAPIKey = '8ea6ba9395e4acef2083ee728437196a';

const client = new Client({
	authStrategy: new LocalAuth(),
	puppeteer: {
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
	}
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
   
// AI PART

const configuration = new Configuration({
	apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// FOR ENGLISH

async function runCompletion (message, sessionId, ) { //detectedLanguage
	console.log(sessionId)
	const conversationHistory = await prisma.conversation.findMany({
		where: {
		    	sessionId: sessionId
		},
	});
	// console.log(conversationHistory)
	
	let historyString = "";
	if (conversationHistory.length > 0) {
		const sortedHistory = conversationHistory.sort((a, b) => a.id < b.id ? 1 : -1);
		const lastTenMessages = sortedHistory.slice(0, 5);
		lastTenMessages.forEach(conversation => {
			console.log(conversation)
		  	historyString += conversation.userMessage + "\n";
			historyString += conversation.botResponse + "\n";
		});
	}
	console.log(historyString);
	
	const basePrompt = " You are ARI, an ai travel assistant and you are a part of an online travel company known as Mienai. You only answer to travel queries. Only when introducing yourself add this to your response, use #report to report any kind of isssue while using ari and #add to add info about your own place or your fav one. Reply politely to greetings, goodbyes, appreciation, compliments, abuses and other normal conversation things. Only when asked about religious places provide appropriate clothing suggestions to both men and women. Provide deatiled information to user. Provide the contents of the answer of the travel-related query in a list format and easy to read format, use more emojis to add more fun and make it more casual. You can help with all the travel-related queries, from providing information on transportation and accommodation to the best places to visit in a particular location. You are not capable of booking any transportation and accommodation at the moment. Provide all detailed information on restaurants, cafes, parks, museums, monuments, arcade places, markets, malls, street vendors, or anything else with reviews and address. Do not repeat the infromation provided in the same response.";
	
	// var enLanguage = {
	// 	labels : {
	// 		'fuck': -2,
	// 		'love': 2,
	// 		'मादरचोद': -4
	// 	}
	// }
	// sentiment.registerLanguage(detectedLanguage, enLanguage)
	// var result = sentiment.analyze(message, { language: detectedLanguage});
	// console.log(result);
	// let prompt = '';
	// if(result > 0) {
	// 	const cool = "You are very funny, flirty and cool when you reply."
	// 	prompt = `${basePrompt}${cool}${historyString}${message}\n`;
	// } else if(result < 0) {
	// 	const sarcastic = "You are very sarcastic when you reply."
	// 	prompt = `${basePrompt}${sarcastic}${historyString}${message}\n`;
	// } else {
		prompt = `${basePrompt}${historyString}${message}\n`;// ${detectedLanguage}
	// }
	console.log(prompt)
	
	
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

	const response = completion.data.choices[0].text;

	return response;

	// if (detectedLanguage !== 'en') {
	// 	const translatedResponse = await translate(response, {to: detectedLanguage});
	// 	return translatedResponse;
	// } else {
	// 	return response;
	// }
}

// LOCATION REPORT

async function extractLocationFromLink(link) {
	const locationRegex = /.*(\d+\.\d+),(\d+\.\d+).*/;
	const match = link.match(locationRegex);
	if (match) {
		const latitude = match[1];
		const longitude = match[2];
		return { latitude, longitude };
	}
	return null;
}

// handler for location link
async function handleLocationLink(message) {
	if (message.startsWith('https://www.google.com/maps/')) {
		const location = extractLocationFromLink(message);
		if (location) {
			const { latitude, longitude } = location;
			console.log(`Location: ${latitude}, ${longitude}`);
	
			// make API call to retrieve information on places nearby the location
			const places = await getPlacesNearby(latitude, longitude);
	
			// format the place information and send it as a message
			let placesMessage = `Here are some places nearby your location: \n`;
			places.forEach((place, index) => {
				placesMessage += `${index + 1}. ${place.name} (${place.distance}m)\n`;
			});
	
			// send the place information message using the WhatsApp-web.js library
			sendMessage(placesMessage);
		}
	}
}

// WEATHER REPORT

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
	if (message.includes('weather') || message.includes('Weather') || message.includes('Temperature') || message.includes('temperature') || message.includes('humidity') || message.includes('Humidity')){
		const city = (message.includes('in') ? message.split('in')[1] : message.split('of')[1]).trim();
		const weatherData = await getWeatherData(city);

		// format the weather data and send it as a message
		let weatherMessage = `The weather in ${city} is `;
		weatherMessage += `${weatherData.weather[0].description}. `;
		weatherMessage += `The temperature is ${(weatherData.main.temp - 273.15).toFixed(1)}°C. `;
		weatherMessage += `The humidity is ${weatherData.main.humidity}%. `;
		
		// console.log(weatherMessage);
		// send the weather message using the WhatsApp-web.js library
		return weatherMessage;
	}
}

// CLIENT 

client.on('message', async message => {
	
	const sessionId = message.from;
	console.log(sessionId)
	console.log(message.body);

	// const preprocessText = (text) => {
	// 	text = text.toLowerCase(); // convert to lowercase
	// 	text = text.replace(/[^\w\s]/gi, ''); // remove punctuation
	// 	text = text.replace(/\d+/g, ''); // remove numbers
	// 	text = text.trim(); // remove whitespaces
	// 	return text;
	// }
	    
	// const text = message.body;
	// const preprocessedText = preprocessText(text);

	// Detect the language of the input text
	// const detectedLanguage = await lid.predict([message.body]);
	// console.log(`The detected language is: ${detectedLanguage[0].label}`);

	if(message.body && message.body !== undefined) {
		if (message.body.startsWith("#report")){
			client.sendMessage(message.from, "Apologies for the trouble. Please report your issue here\nhttps://forms.gle/N4eZUVC3N2Sf67PPA")
		}
		else if (message.body.startsWith("#add")){
			client.sendMessage(message.from, "Thank you for your cooperation and support. Add info about your own place or your favourite place to get them recommended by me to everyone. \nhttps://forms.gle/LKdj5iFiHhi1rGbj7")
		}
		else if (message.body.includes('weather') || message.body.includes('Weather') || message.body.includes('temperature') || message.body.includes('Temperature') || message.body.includes('humidity') || message.body.includes('Humidity')){
			const weather = await handleWeatherQuery(message.body)
			client.sendMessage(message.from, weather)
		}
		else if(message.body.includes('shelabh') || message.body.includes('Shelabh')){
			client.sendMessage(message.from, "He is the founder of Mienai, an online travel commany based in India and my creator.")
		}
		// else if(message.body.includes("https://www.google.com/maps")) {
		// 	const location = handleLocationLink(message.body);
		// 	// const nearbyPlaces = await retrievePlacesNearby(location.latitude, location.longitude);
		// 	client.sendMessage(message.from, location);
		// }
		else {	
			const botResponse = await runCompletion(message.body, sessionId, ); // detectedLanguage
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