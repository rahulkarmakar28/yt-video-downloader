// app/api/download/route.ts
import ytdl from "@distube/ytdl-core";
import ffmpeg from "fluent-ffmpeg"
import ffmpegPath from "ffmpeg-static"
import { Readable } from "stream";
import { NextRequest } from "next/server";

ffmpeg.setFfmpegPath(ffmpegPath!) // Type assertion since it can be null

export const dynamic = "force-dynamic"

function streamToWebReadable(stream: Readable): ReadableStream {
  return new ReadableStream({
    start(controller) {
      stream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    },
  });
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const format = req.nextUrl.searchParams.get("format") || "mp4";

  if (!url || !ytdl.validateURL(url)) {
    return new Response("Invalid YouTube URL", { status: 400 });
  }

  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();

    const headers = {
      "Content-Disposition": `attachment; filename="${title}.${format}"`,
      "Content-Type": format === "mp3" ? "audio/mpeg" : "video/mp4",
    };

    if (format === "mp3") {
      const audioStream = ytdl(url, {
        quality: "highestaudio",
        filter: "audioonly",
      });

      const mp3Stream = ffmpeg(audioStream)
        .audioBitrate(128)
        .format("mp3")
        .pipe() as unknown as Readable

      return new Response(streamToWebReadable(mp3Stream), { headers });
    }

    const videoStream = ytdl(url, {
      quality: "highest",
      filter: "videoandaudio",
    });

    return new Response(streamToWebReadable(videoStream), { headers });
  } catch (e) {
    console.error("Download error:", e);
    return new Response("Failed to download", { status: 500 });
  }
}
