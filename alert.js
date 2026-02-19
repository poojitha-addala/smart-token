
const admin = require("firebase-admin");
const twilio = require("twilio");
const serviceAccount = require("./serviceAccountKey.json");

// Initialize Firebase Realtime Database
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://smarttoken-5a261-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = admin.database();

const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_NUMBER;


const client = twilio(accountSid, authToken);

console.log("👂 Starting token check and alert process...");

async function checkTokensAndAlert() {
  try {
    const snapshot = await db.ref("tokens").once("value");
    let tokens = [];

    snapshot.forEach(child => {
      tokens.push({ key: child.key, ...child.val() });
    });

    console.log(`ℹ️ Total tokens fetched: ${tokens.length}`);

    // Sort tokens by tokenTime ascending (or tokenNumber if you have that)
    tokens.sort((a, b) => a.tokenTime - b.tokenTime);

    for (let index = 0; index < tokens.length; index++) {
      const alertIndex = index + 2; // person 2 places after current

      if (!tokens[index].served) {
        console.log(`ℹ️ Token [${index}] Patient: ${tokens[index].name} (waiting)`);

        if (tokens[alertIndex] && !tokens[alertIndex].served) {
          const patientToAlert = tokens[alertIndex];

          if (!patientToAlert.phone) {
            console.warn(`⚠️ Patient ${patientToAlert.name} has no phone number, skipping alert.`);
            continue;
          }

          const message = `Hello ${patientToAlert.name}, please get ready. Your turn is after 2 patients.`;
          console.log(`🚨 Sending alert to ${patientToAlert.name} at ${patientToAlert.phone}`);

          // Send SMS
          try {
            const sms = await client.messages.create({
              body: message,
              from: twilioNumber,
              to: patientToAlert.phone,
            });
            console.log(`✅ SMS sent to ${patientToAlert.phone}, SID: ${sms.sid}`);
          } catch (smsErr) {
            console.error(`❌ SMS error for ${patientToAlert.phone}:`, smsErr.message);
          }

          // Make Call
          try {
            const call = await client.calls.create({
              twiml: `<Response><Say>${message}</Say></Response>`,
              from: twilioNumber,
              to: patientToAlert.phone,
            });
            console.log(`📞 Call initiated to ${patientToAlert.phone}, SID: ${call.sid}`);
          } catch (callErr) {
            console.error(`❌ Call error for ${patientToAlert.phone}:`, callErr.message);
          }
        } else {
          console.log(`ℹ️ No patient to alert after 2 positions for token index ${index}`);
        }
      } else {
        console.log(`ℹ️ Token [${index}] Patient: ${tokens[index].name} already served, skipping`);
      }
    }
  } catch (err) {
    console.error("❌ Error fetching tokens:", err.message);
  }
}

// Run every 30 seconds
setInterval(() => {
  console.log("\n⏰ Running token alert check...");
  checkTokensAndAlert();
}, 30000);

// Initial run
checkTokensAndAlert();
