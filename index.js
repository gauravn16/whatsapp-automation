require("dotenv").config();
const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const axios = require("axios");
const cron = require("node-cron");
const qrcode = require("qrcode-terminal");

const BIRTHDAY_API = "https://m.sampark369.org/v1/sam2api/member/birthdays";

async function fetchBirthdays() {
  const loginResp = await axios.post(
    "https://m.sampark369.org/v1/auth/user/login",
    {
      userName: process.env.API_USER_NAME,
      passCode: process.env.API_PASS_CODE,
    }
  );

  const token = loginResp.data?.result?.token;
  const resp = await axios.get(BIRTHDAY_API, {
    headers: { token },
  });

  return resp.data?.data || [];
}

function formatMessage(birthdays) {
  if (!birthdays.length) return "🎂 No birthdays today 🙏";
  let msg = "🎂 Today's Birthdays 🎂\n\n";
  msg += birthdays
    .map(
      (p) =>
        `- ${p.firstName} ${p.lastName} (📱${p.mobile}, lastSabha: ${p.lastSabha})`
    )
    .join("\n");
  return msg + "\n\nLet's wish them 🙏";
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true, // shows QR in terminal
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) qrcode.generate(qr, { small: true });

    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect.error = new Boom(lastDisconnect.error)?.output?.statusCode !==
        401);
      console.log("connection closed, reconnect:", shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === "open") {
      console.log("✅ WhatsApp bot connected!");
      scheduleBirthdayJob(sock);
    }
  });
}

function scheduleBirthdayJob(sock) {
  // run immediately (for testing)
  sendBirthdayMessage(sock);

  // schedule daily 6 AM IST
  cron.schedule(
    "0 6 * * *",
    () => {
      console.log("⏰ Sending daily birthday message...");
      sendBirthdayMessage(sock);
    },
    { timezone: "Asia/Kolkata" }
  );
}

async function sendBirthdayMessage(sock) {
  try {
    const birthdays = await fetchBirthdays();
    const msg = formatMessage(birthdays);

    // find group by name
    const groups = await sock.groupFetchAllParticipating();
    const group = Object.values(groups).find(
      (g) => g.subject === "My swadhyay"
    );

    if (group) {
      await sock.sendMessage(group.id, { text: msg });
      console.log("✅ Birthday message sent!");
    } else {
      console.log("❌ Group not found:", process.env.GROUP_NAME);
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

startBot();
