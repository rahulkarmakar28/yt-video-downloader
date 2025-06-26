import ytdl from "@distube/ytdl-core";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const url = searchParams.get("url");

        if (!url || !ytdl.validateURL(url)) {
            console.warn("Invalid URL:", url);
            return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
        }

        const info = await ytdl.getInfo(url);
        console.log("Fetched info for:", info.videoDetails.title);

        const formats = info.formats
            .filter((f) => f.hasAudio && f.qualityLabel)
            .map((f) => ({
                quality: f.qualityLabel,
                format: f.container || "mp4",
                filesize: f.contentLength
                    ? `${(parseInt(f.contentLength) / (1024 * 1024)).toFixed(1)} MB`
                    : undefined,
            }));

        return NextResponse.json({
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails.at(-1)?.url || "",
            duration: `${Math.floor(+info.videoDetails.lengthSeconds / 60)}:${(
                +info.videoDetails.lengthSeconds % 60
            )
                .toString()
                .padStart(2, "0")}`,
            formats,
        });
    } catch (err) {
        console.error("Failed to fetch info:", err);
        return NextResponse.json({
            error: "Could not parse video – try a different link or wait for an update.",
        }, { status: 500 });
    }
}
