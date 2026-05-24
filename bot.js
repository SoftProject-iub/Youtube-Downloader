import pkg from "whatsapp-web.js";
import yts from "yt-search";
import ytDlp from "yt-dlp-exec";
import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const { Client, LocalAuth, MessageMedia } = pkg;

/* ─────────────────────────────────────────────
   EXPRESS SERVER FOR RAILWAY
───────────────────────────────────────────── */

const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {

    res.send("SHEEZZI BOT RUNNING");
});

app.listen(PORT, () => {

    console.log(`SERVER RUNNING ON ${PORT}`);
});

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
   CREATE FOLDERS
───────────────────────────────────────────── */

await fs.ensureDir(CONFIG.tempPath);
await fs.ensureDir(CONFIG.sessionPath);

/* ─────────────────────────────────────────────
   KILL OLD CHROMIUM PROCESSES
───────────────────────────────────────────── */

try {

    execSync("pkill -f chromium || true");
    execSync("pkill -f chrome || true");

    console.log(
        "KILLED OLD CHROMIUM PROCESSES"
    );

} catch {}

/* ─────────────────────────────────────────────
   REMOVE LOCK FILES
───────────────────────────────────────────── */

const lockNames = [
    "SingletonLock",
    "SingletonCookie",
    "SingletonSocket"
];

async function removeLocks(dir) {

    try {

        const entries =
            await fs.readdir(dir, {
                withFileTypes: true
            });

        for (const entry of entries) {

            const fullPath =
                path.join(
                    dir,
                    entry.name
                );

            if (
                entry.isFile() &&
                lockNames.includes(
                    entry.name
                )
            ) {

                await fs.remove(fullPath);

                console.log(
                    `REMOVED LOCK: ${fullPath}`
                );

            } else if (
                entry.isDirectory()
            ) {

                await removeLocks(
                    fullPath
                );
            }
        }

    } catch {}
}

await removeLocks(CONFIG.sessionPath);

/* ─────────────────────────────────────────────
   HELPER
───────────────────────────────────────────── */

const sleep = ms =>
    new Promise(resolve =>
        setTimeout(resolve, ms)
    );

function progressBar(percent) {

    const filled =
        Math.floor(percent / 10);

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

client.on(
    "authenticated",
    () => {

        console.log(
            "AUTHENTICATED"
        );
    }
);

client.on(
    "ready",
    () => {

        console.log(
            "BOT IS READY"
        );
    }
);

client.on(
    "auth_failure",
    msg => {

        console.log(
            "AUTH FAILED:",
            msg
        );
    }
);

client.on(
    "disconnected",
    reason => {

        console.log(
            "DISCONNECTED:",
            reason
        );
    }
);

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

        const search =
            await yts(query);

        if (
            !search.videos.length
        ) {

            return message.reply(
                "❌ No results found"
            );
        }

        const video =
            search.videos[0];

        if (
            video.seconds > 1800
        ) {

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

        const filePath =
            path.join(
                CONFIG.tempPath,
                `${Date.now()}.${extension}`
            );

        /* YT-DLP OPTIONS */

        const options = {

            output: filePath,

            format:
                type === "audio"
                    ? "bestaudio"
                    : "bestvideo+bestaudio",

            ffmpegLocation:
                CONFIG.ffmpegPath
        };

        /* AUDIO SETTINGS */

        if (
            type === "audio"
        ) {

            options.extractAudio = true;

            options.audioFormat = "mp3";
        }

        const process =
            ytDlp.exec(
                video.url,
                options
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
                        parseInt(
                            match[1]
                        );

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

        const exists =
            await fs.pathExists(
                filePath
            );

        if (!exists) {

            throw new Error(
                "Downloaded file missing"
            );
        }

        await message.reply(
            "✅ Download completed"
        );

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

client.initialize();

/* ─────────────────────────────────────────────
   REQUEST PAIRING CODE
───────────────────────────────────────────── */

setTimeout(async () => {

    try {

        console.log(
            "\nREQUESTING PAIRING CODE...\n"
        );

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
            "\nWhatsApp > Linked Devices > Link with phone number\n"
        );

    } catch (err) {

        console.log(
            "PAIRING CODE ERROR:",
            err
        );
    }

}, 30000);
