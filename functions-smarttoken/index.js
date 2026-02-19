const functions = require("firebase-functions");
const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");

const app = express();
app.use(bodyParser.json());

// Twilio credentials
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_NUMBER;
const client = twilio(accountSid, authToken);

// API route to send SMS + Call
app.post("/notify", async (req, res) => {
  const { name, phone, department } = req.body;

  try {
    // Send SMS
    await client.messages.create({
      body: `Hello ${name}, your turn is coming in ${department} department.`,
      from: twilioNumber,
      to: phone
    });

    // Make Call
    await client.calls.create({
      url: "http://demo.twilio.com/docs/voice.xml",
      from: twilioNumber,
      to: phone
    });

    res.send({ success: true, message: "SMS & Call sent!" });
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, error: err.message });
  }
});

// Test route
app.get("/", (req, res) => {
  res.send("✅ Backend is running correctly!");
});


// Export express app as Firebase Function
exports.api = functions.https.onRequest(app);
