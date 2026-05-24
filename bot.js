import pkg from "whatsapp-web.js";
import yts from "yt-search";
import ytDlp from "yt-dlp-exec";
import fs from "fs-extra";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const { Client, LocalAuth, MessageMedia } = pkg;

/* ─────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────── */

const CONFIG = {
    phoneNumber: "923288616670",
    clientId: "sheezzi-bot",
    sessionPath: "./session",
    tempPath: "./tmp",
    ffmpegPath: "/usr/bin/ffmpeg"
};

/* ─────────────────────────────────────────────
   CREATE TMP FOLDER
───────────────────────────────────────────── */

await fs.ensureDir(CONFIG.tempPath);

/* ─────────────────────────────────────────────
   WHATSAPP CLIENT
───────────────────────────────────────────── */

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

client.on("qr", () => {

    /* QR suppressed — pairing code requested after initialize */
});

client.on("code", code => {

    console.log(
        "\nWhatsApp > Linked Devices > Link with phone number\n"
    );

    console.log("PAIRING CODE:\n");

    console.log(code);

    console.log(
        "\nWhatsApp > Linked Devices > Link with phone number\n"
    );
});

client.on("authenticated", () => {

    console.log("AUTHENTICATED");
});

client.on("ready", () => {

    console.log("BOT IS READY");
});

client.on("auth_failure", msg => {

    console.log("AUTH FAILED:", msg);
});

client.on("disconnected", async reason => {

    console.log("DISCONNECTED:", reason);

    console.log("RECONNECTING IN 5 SECONDS...");

    await new Promise(r => setTimeout(r, 5000));

    try {

        await client.initialize();

    } catch (err) {

        console.log("RECONNECT FAILED:", err.message || err);
    }
});

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

function progressBar(percent) {

    const filled = Math.floor(percent / 10);

    return (
        "[" +
        "=".repeat(filled) +
        " ".repeat(10 - filled) +
        `] ${percent}%`
    );
}

function cleanQuery(text) {

    return text
        .replace("download", "")
        .replace("audio", "")
        .replace("video", "")
        .trim();
}

/* ─────────────────────────────────────────────
   DOWNLOAD FUNCTION
───────────────────────────────────────────── */

async function downloadMedia(
    message,
    type,
    query
) {

    try {

        await message.reply(
            `🔍 Searching "${query}"...`
        );

        const search = await yts(query);

        if (!search.videos.length) {

            return message.reply(
                "❌ No results found"
            );
        }

        const video = search.videos[0];

        /* LIMIT LARGE VIDEOS */

        if (video.seconds > 1800) {

            return message.reply(
                "❌ Video too long"
            );
        }

        await message.reply(
`🎵 FOUND:

${video.title}

⏱ Duration: ${video.timestamp}

⬇ Downloading ${type}...`
        );

        const extension =
            type === "audio"
                ? "mp3"
                : "mp4";

        const filePath = path.join(
            CONFIG.tempPath,
            `${Date.now()}.${extension}`
        );

        /* YT-DLP */

        const ytDlpOptions =
            type === "audio"
                ? {
                      output: filePath,
                      format: "bestaudio",
                      extractAudio: true,
                      audioFormat: "mp3",
                      ffmpegLocation: CONFIG.ffmpegPath
                  }
                : {
                      output: filePath,
                      format: "bestvideo+bestaudio",
                      mergeOutputFormat: "mp4",
                      ffmpegLocation: CONFIG.ffmpegPath
                  };

        const process = ytDlp.exec(video.url, ytDlpOptions);

        /* PROGRESS */

        let sent25 = false;
        let sent50 = false;
        let sent75 = false;

        process.stderr.on(
            "data",
            async data => {

                try {

                    const text =
                        data.toString();

                    const match =
                        text.match(
                            /(\d{1,3}\.\d)%/
                        );

                    if (!match) return;

                    const percent =
                        parseInt(match[1]);

                    if (
                        percent >= 25 &&
                        !sent25
                    ) {

                        sent25 = true;

                        await message.reply(
                            progressBar(25)
                        ).catch(() => {});
                    }

                    if (
                        percent >= 50 &&
                        !sent50
                    ) {

                        sent50 = true;

                        await message.reply(
                            progressBar(50)
                        ).catch(() => {});
                    }

                    if (
                        percent >= 75 &&
                        !sent75
                    ) {

                        sent75 = true;

                        await message.reply(
                            progressBar(75)
                        ).catch(() => {});
                    }

                } catch {}
            }
        );

        await process;

        /* CHECK FILE */

        const exists =
            await fs.pathExists(filePath);

        if (!exists) {

            throw new Error(
                "Downloaded file missing"
            );
        }

        await message.reply(
            "✅ Download completed"
        );

        /* SEND MEDIA */

        const media =
            MessageMedia.fromFilePath(
                filePath
            );

        /* Retry send up to 3 times if browser drops */

        let sent = false;

        for (let attempt = 1; attempt <= 3; attempt++) {

            try {

                await client.sendMessage(
                    message.from,
                    media,
                    {
                        sendAudioAsVoice: false
                    }
                );

                sent = true;

                break;

            } catch (sendErr) {

                console.log(
                    `SEND ATTEMPT ${attempt} FAILED:`,
                    sendErr.message || sendErr
                );

                if (attempt < 3) {

                    await new Promise(r =>
                        setTimeout(r, 3000)
                    );
                }
            }
        }

        /* DELETE FILE */

        await fs.remove(filePath);

        if (sent) {

            console.log(
                `SENT TO ${message.from}`
            );

        } else {

            console.log(
                `SEND FAILED TO ${message.from}`
            );
        }

    } catch (err) {

        console.log(
            "DOWNLOAD ERROR:",
            err.message || err
        );

        try {

            await message.reply(
                "❌ Download failed — please try again"
            );

        } catch {}
    }
}

/* ─────────────────────────────────────────────
   MESSAGE HANDLER
───────────────────────────────────────────── */

client.on(
    "message",
    async message => {

        try {

            const body =
                message.body
                    .trim()
                    .toLowerCase();

            console.log(
                `MESSAGE FROM ${message.from}:`,
                body
            );

            /* MENU */

            if (
                body === "menu" ||
                body === "song" ||
                body === "help"
            ) {

                return message.reply(
`🎵 *SHEEZZI BOT*

━━━━━━━━━━━━━━━

📥 COMMANDS:

download pasoori audio

download pasoori video

━━━━━━━━━━━━━━━

✅ HD QUALITY
✅ FAST DOWNLOAD
✅ YOUTUBE SEARCH
✅ AUDIO + VIDEO
✅ PAIRING LOGIN
✅ RAILWAY READY`
                );
            }

            /* DOWNLOAD */

            if (
                body.startsWith(
                    "download"
                )
            ) {

                const isAudio =
                    body.includes(
                        "audio"
                    );

                const isVideo =
                    body.includes(
                        "video"
                    );

                if (
                    !isAudio &&
                    !isVideo
                ) {

                    return message.reply(
                        "❌ Specify audio or video"
                    );
                }

                const query =
                    cleanQuery(body);

                if (!query) {

                    return message.reply(
                        "❌ Song name missing"
                    );
                }

                return downloadMedia(
                    message,
                    isAudio
                        ? "audio"
                        : "video",
                    query
                );
            }

        } catch (err) {

            console.log(
                "MESSAGE ERROR:",
                err
            );
        }
    }
);

/* ─────────────────────────────────────────────
   START BOT
───────────────────────────────────────────── */

console.log(
    "STARTING SHEEZZI BOT..."
);

/* Request pairing code BEFORE initialize so WhatsApp
   uses phone-link flow instead of QR */

client.pupPage?.once("load", async () => {

    await new Promise(r => setTimeout(r, 2000));

    try {

        await client.requestPairingCode(CONFIG.phoneNumber);

    } catch {}
});

await client.initialize();

/* Fallback: request after initialize if code event not fired */

await new Promise(r => setTimeout(r, 8000));

try {

    const state = await client.getState().catch(() => null);

    if (state !== "CONNECTED") {

        const code = await client.requestPairingCode(
            CONFIG.phoneNumber
        );

        console.log(
            "\nWhatsApp > Linked Devices > Link with phone number\n"
        );

        console.log("PAIRING CODE:\n");

        console.log(code);

        console.log(
            "\nWhatsApp > Linked Devices > Link with phone number\n"
        );
    }

} catch (err) {

    console.log("PAIRING ERROR:", err.message || err);
}
