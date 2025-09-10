const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const axios = require("axios");

// Group name must match exactly your WhatsApp group name
const GROUP_NAME = "My swadhyay";
const BIRTHDAY_API = "https://m.sampark369.org/v1/sam2api/member/birthdays";

const client = new Client({
  authStrategy: new LocalAuth() // keeps you logged in after first QR scan
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", async () => {
  console.log("✅ WhatsApp bot is ready!");

  try {
    const loginResult = await axios.post('https://m.sampark369.org/v1/auth/user/login', {
        userName: "8446699127",
      passCode: "3600"
    });
    const authToken = loginResult.data.result.token;
    const response = await axios.get(BIRTHDAY_API, {
        headers: {
          'token': authToken,
          'Content-Type': 'application/json',
        }
      });
    const birthdays = response.data.data || [];

    let message = "";
    if (birthdays.length === 0) {
      message = "🎂 No birthdays today 🙏";
    } else {
      message = "🎂 Today's Birthdays 🎂\n\n";
      birthdays.forEach((p) => {
        message += `- ${p.firstName} ${p.lastName} - (${p.mobile} - lastSabha: ${p.lastSabha})\n`;
      });
      message += "\nLet's wish them 🙏";
    }

    // Find the group
    const chats = await client.getChats();
    const group = chats.find((chat) => chat.name === GROUP_NAME);

    if (group) {
      await client.sendMessage(group.id._serialized, message);
      console.log("✅ Birthday message sent to group!");
    } else {
      console.log("❌ Group not found. Check GROUP_NAME.");
    }

    const verifyResult = await axios.get(`https://m.sampark369.org/v1/auth/8446699127/verify`);
    console.log("logout done", verifyResult.data);
  } catch (err) {
    console.error("❌ Error fetching/sending birthdays:", err.message);
  }
});

client.initialize();
