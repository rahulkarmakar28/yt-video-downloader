"use client"

import React, { ChangeEvent, KeyboardEvent, useState } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Download, Loader2, Play, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"

interface VideoFormat {
  quality: string
  format: string
  filesize?: string
}

interface VideoInfo {
  title: string
  thumbnail: string
  duration?: string
  formats: VideoFormat[]
}

export default function YouTubeDownloader() {
  const [url, setUrl] = useState("")
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchVideoInfo = async () => {
    if (!url.trim()) {
      setError("Please enter a YouTube URL")
      return
    }

    setLoading(true)
    setError(null)
    setVideoInfo(null)

    try {
      const response = await fetch(`/api/info?url=${encodeURIComponent(url)}`);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      console.log(data)
      setVideoInfo(data);
    } catch (err) {
      console.error("Frontend Error:", err);
      // setError(err instanceof Error ? err.message : "An unknown error occurred");
      setError("An unknown error occurred");

    } finally {
      setLoading(false)
    }
  }

  const downloadVideo = async (format: "mp4" | "mp3") => {
    if (!url.trim()) return

    setDownloading(format)
    setError(null)
    try {
      const response = await fetch(`/api/download?url=${encodeURIComponent(url)}&format=${format}`)

      if (!response.ok) {
        let errorMessage = "Failed to download"

        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          const text = await response.text()
          if (text && !text.startsWith("{")) errorMessage = text
        }

        throw new Error(errorMessage)
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = `${videoInfo?.title || "video"}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

    } catch (err) {
      const friendlyMessage = err instanceof Error ? err.message : "Something went wrong"
      setError(friendlyMessage)  // this is used in your Alert component
    } finally {
      setDownloading(null)
    }

  }

  const isValidYouTubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/
    return youtubeRegex.test(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">YouTube Downloader</h1>
          <p className="text-gray-600">Download your favorite YouTube videos in MP4 or MP3 format</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-red-500" />
              Enter YouTube URL
            </CardTitle>
            <CardDescription>Paste a YouTube video URL to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                className="flex-1"
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter") fetchVideoInfo();
                }}
              />
              <Button
                onClick={fetchVideoInfo}
                disabled={loading || !url.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  "Fetch Info"
                )}
              </Button>
            </div>

            {url && !isValidYouTubeUrl(url) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Please enter a valid YouTube URL</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {videoInfo && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Video Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <Image
                    src={videoInfo.thumbnail || "/placeholder.svg"}
                    alt={videoInfo.title}
                    width={320}
                    height={180}
                    className="rounded-lg object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2 line-clamp-2">{videoInfo.title}</h3>
                  {videoInfo.duration && (
                    <Badge variant="secondary" className="mb-4">
                      Duration: {videoInfo.duration}
                    </Badge>
                  )}

                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Available Formats:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {videoInfo.formats.map((format, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm">
                            {format.quality} - {format.format.toUpperCase()}
                          </span>
                          {format.filesize && (
                            <Badge variant="outline" className="text-xs">
                              {format.filesize}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {videoInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5 text-green-600" />
                Download Options
              </CardTitle>
              <CardDescription>Choose your preferred format to download</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                  onClick={() => downloadVideo("mp4")}
                  disabled={downloading !== null}
                  className="h-16 text-lg bg-blue-600 hover:bg-blue-700 cursor-pointer"
                >
                  {downloading === "mp4" ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Downloading MP4...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      Download MP4
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => downloadVideo("mp3")}
                  disabled={downloading !== null}
                  className="h-16 text-lg bg-green-600 hover:bg-green-700 cursor-pointer"
                >
                  {downloading === "mp3" ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Downloading MP3...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      Download MP3
                    </>
                  )}
                </Button>
              </div>

              <Separator className="my-4" />

              <div className="text-sm text-gray-500 space-y-1">
                <p>• MP4: Download the video with audio</p>
                <p>• MP3: Download audio only</p>
                <p>• Downloads will start automatically once processed</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Please respect copyright laws and only download content you have permission to use.</p>
        </div>
      </div>
    </div>
  )
}
