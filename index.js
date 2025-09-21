require("dotenv").config();
const { default: makeWASocket, useMultiFileAuthState } = require("@adiwajshing/baileys");
const qrcode = require("qrcode-terminal");
const axios = require("axios");
const cron = require("node-cron");

const GROUP_NAME = "My swadhyay";
const BIRTHDAY_API = "https://m.sampark369.org/v1/sam2api/member/birthdays";

// Function to fetch birthdays and send WhatsApp message
async function sendBirthdayMessage(sock) {
  try {
    // Login to your API
    const loginResult = await axios.post("https://m.sampark369.org/v1/auth/user/login", {
      userName: process.env.API_USER_NAME,
      passCode: process.env.API_PASS_CODE,
    });

    const authToken = loginResult.data.result.token;
    const response = await axios.get(BIRTHDAY_API, {
      headers: {
        token: authToken,
        "Content-Type": "application/json",
      },
    });
    const birthdays = response.data.data || [];

    // Prepare message
    let message = "";
    if (birthdays.length === 0) {
      message = "🎂 No birthdays today 🙏";
    } else {
      message = "🎂 Today's Birthdays 🎂\n\n";
      birthdays.forEach((p) => {
        message += `- ${p.firstName} ${p.lastName} (${p.mobile}, lastSabha: ${p.lastSabha})\n`;
      });
      message += "\nLet's wish them 🙏";
    }

    // Get all groups
    const groups = await sock.groupFetchAllParticipating();
    const group = Object.values(groups).find((g) => g.subject === GROUP_NAME);

    if (group) {
      await sock.sendMessage(group.id, { text: message });
      console.log("✅ Birthday message sent to group!");
    } else {
      console.log("❌ Group not found. Check GROUP_NAME.");
    }
  } catch (err) {
    console.error("❌ Error fetching/sending birthdays:", err.message);
  }
}

// Start WhatsApp client with Baileys
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true, // QR will show in Termux
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection } = update;
    if (connection === "open") {
      console.log("✅ WhatsApp bot is ready!");

      // Run immediately once
      sendBirthdayMessage(sock);

      // Schedule daily at 6:00 AM IST
      cron.schedule(
        "0 6 * * *",
        async () => {
          console.log("⏰ Running daily birthday job...");
          await sendBirthdayMessage(sock);
        },
        { timezone: "Asia/Kolkata" }
      );
    }
  });
}

startBot();
