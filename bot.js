import pkg from "whatsapp-web.js";
import yts from "yt-search";
import ytDlp from "yt-dlp-exec";
import fs from "fs-extra";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const { Client, LocalAuth, MessageMedia } = pkg;

const CONFIG = {
    phoneNumber: "923376201542",
    clientId: "sheezzi-bot",
    sessionPath: "./session",
    tempPath: "./tmp",
    ffmpegPath: "/usr/bin/ffmpeg"
};

await fs.ensureDir(CONFIG.tempPath);

const client = new Client({

    authStrategy: new LocalAuth({
        clientId: CONFIG.clientId,
        dataPath: CONFIG.sessionPath
    }),

    puppeteer: {

        headless: true,

        executablePath:
            process.env.PUPPETEER_EXECUTABLE_PATH,

        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--disable-gpu",
            "--single-process",
            "--no-zygote"
        ]
    }
});

/* ─────────────────────────────────────────────
   EVENTS
───────────────────────────────────────────── */

client.on("authenticated", () => {

    console.log("AUTHENTICATED");
});

client.on("ready", () => {

    console.log("BOT IS READY");
});

client.on("auth_failure", msg => {

    console.log("AUTH FAILED:", msg);
});

client.on("disconnected", reason => {

    console.log("DISCONNECTED:", reason);
});

/* ─────────────────────────────────────────────
   PAIRING CODE LOGIN
───────────────────────────────────────────── */

client.on("loading_screen", async () => {

    try {

        const state =
            await client.getState()
                .catch(() => null);

        if (!state) {

            const code =
                await client.requestPairingCode(
                    CONFIG.phoneNumber
                );

            console.log(
                "\n━━━━━━━━━━━━━━━━━━━━━━"
            );

            console.log(
                "PAIRING CODE:\n"
            );

            console.log(code);

            console.log(
                "\n━━━━━━━━━━━━━━━━━━━━━━"
            );

            console.log(
                "\nWhatsApp → Linked Devices → Link with phone number\n"
            );
        }

    } catch (err) {

        console.log(
            "PAIRING ERROR:",
            err
        );
    }
});

/* ─────────────────────────────────────────────
   START BOT
───────────────────────────────────────────── */

console.log(
    "STARTING SHEEZZI BOT..."
);

client.initialize();
