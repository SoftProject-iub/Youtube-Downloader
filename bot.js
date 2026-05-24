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

        if (!search.videos.length) {

            return message.reply(
                "❌ No results found"
            );
        }

        const video =
            search.videos[0];

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

        const filePath =
            path.join(
                CONFIG.tempPath,
                `${Date.now()}.${extension}`
            );

        /* OPTIONS */

        let options = {

            output: filePath,

            ffmpegLocation:
                CONFIG.ffmpegPath
        };

        /* AUDIO */

        if (type === "audio") {

            options.format =
                "bestaudio";

            options.extractAudio =
                true;

            options.audioFormat =
                "mp3";
        }

        /* VIDEO */

        else {

            options.format =
                "bestvideo+bestaudio";
        }

        /* DOWNLOAD */

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
