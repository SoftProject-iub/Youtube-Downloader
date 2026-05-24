import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
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
    phoneNumber: "923376201542",
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

client.on("qr", qr => {

    console.clear();

    console.log("\nSCAN QR CODE BELOW:\n");

    qrcode.generate(qr, {
        small: true
    });
});

client.on("code", code => {

    console.log("\nPAIRING CODE:\n");

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

client.on("disconnected", reason => {

    console.log("DISCONNECTED:", reason);
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

        const process = ytDlp.exec(
            video.url,
            {

                output: filePath,

                format:
                    type === "audio"
                        ? "bestaudio"
                        : "bestvideo+bestaudio",

                extractAudio:
                    type === "audio",

                audioFormat: "mp3",

                ffmpegLocation:
                    CONFIG.ffmpegPath
            }
        );

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

        await client.sendMessage(
            message.from,
            media,
            {
                sendAudioAsVoice: false
            }
        );

        /* DELETE FILE */

        await fs.remove(filePath);

        console.log(
            `SENT TO ${message.from}`
        );

    } catch (err) {

        console.log(
            "DOWNLOAD ERROR:",
            err
        );

        await message.reply(
            "❌ Download failed"
        );
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

await client.initialize();

/* ─────────────────────────────────────────────
   REQUEST PAIRING CODE
───────────────────────────────────────────── */

try {

    const state =
        await client.getState()
            .catch(() => null);

    if (!state) {

        const pairingCode =
            await client.requestPairingCode(
                CONFIG.phoneNumber
            );

        console.log(
            "\nPAIRING CODE:\n"
        );

        console.log(pairingCode);

        console.log(
            "\nUse on WhatsApp Linked Devices\n"
        );
    }

} catch (err) {

    console.log(
        "PAIRING ERROR:",
        err
    );
}
