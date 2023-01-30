const express = require('express');
const app = express();
var request = require('request');
const bodyParser = require('body-parser');
const sdk = require('api')('@writesonic/v2.2#4enbxztlcbti48j');
const MessagingResponse = require('twilio').twiml.MessagingResponse;

const accountSid = "ACabd308843c36fed46eade14232b08b07";
const authToken = "92ba71a0baab3f9dac6ae8d64aa710c2";
const client = require('twilio')(accountSid, authToken);
sdk.auth('c5d7825b-dd81-420d-8fa5-719502f1353c');


app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.post('/incoming', async (req, res) => {
  const twiml = new MessagingResponse();
   let response;
    await sdk.chatsonic_V2BusinessContentChatsonic_post({
        enable_google_results: true,
        enable_memory: false,
        input_text: req.body.Body
      }, {engine: 'premium'})
        .then(({ data }) => {
            response = data.message;
        })
        .catch(err => {
            response = err;
        });
  console.log(response);
  await twiml.message(response);
  await res.writeHead(200, {'Content-Type': 'text/xml'});
  await res.end(twiml.toString());
  console.log("Message sent! ")
});

app.listen(3000, () => console.log('server started'));