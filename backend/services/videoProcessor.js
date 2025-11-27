const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const ffprobeStatic = require("@ffprobe-installer/ffprobe").path;
const fs = require("fs");
const path = require("path");
const https = require("https");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client } = require("../config/s3-v3");

// Set paths
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic);

class VideoProcessor {
  constructor() {
    this.tempDir = path.join(__dirname, "../temp");

    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /* ======================================================
     DOWNLOAD A FILE FROM URL → TEMP
  ====================================================== */
  async downloadTempFile(url, extension = ".mp4") {
    return new Promise((resolve, reject) => {
      const tmpPath = path.join(this.tempDir, `${Date.now()}${extension}`);
      const file = fs.createWriteStream(tmpPath);

      https
        .get(url, (response) => {
          response.pipe(file);
          file.on("finish", () => file.close(() => resolve(tmpPath)));
        })
        .on("error", (err) => {
          fs.unlinkSync(tmpPath);
          reject(err);
        });
    });
  }

  /* ======================================================
     UPLOAD FILE TO S3 (NO ACL → bucket policy handles access)
  ====================================================== */
  async uploadToS3(buffer, key, contentType) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
  }

  /* ======================================================
    GET VIDEO DURATION
  ====================================================== */
  async getVideoDuration(videoUrl) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoUrl, (err, metadata) => {
        if (err) return reject(err);

        const duration = Math.floor(metadata.format.duration);
        resolve(duration);
      });
    });
  }

  /* ======================================================
     GENERATE THUMBNAIL
  ====================================================== */
  async generateThumbnail(videoUrl, videoKey) {
    try {
      const tempVideo = await this.downloadTempFile(videoUrl, ".mp4");
      const tempThumb = path.join(this.tempDir, `thumb_${Date.now()}.jpg`);

      await new Promise((resolve, reject) => {
        ffmpeg(tempVideo)
          .on("error", reject)
          .on("end", resolve)
          .screenshots({
            folder: this.tempDir,
            filename: path.basename(tempThumb),
            timemarks: ["10%"],
            size: "640x360",
          });
      });

      const buffer = fs.readFileSync(tempThumb);
      const key = `thumbnails/${Date.now()}-${path.basename(videoKey, path.extname(videoKey))}.jpg`;

      const url = await this.uploadToS3(buffer, key, "image/jpeg");

      fs.unlinkSync(tempVideo);
      fs.unlinkSync(tempThumb);

      return url;
    } catch (err) {
      console.error("Thumbnail error:", err);
      throw err;
    }
  }

  /* ======================================================
     TRANSCODE MULTIPLE RESOLUTIONS
  ====================================================== */
  async transcodeVideo(videoUrl, videoKey) {
    const resolutions = [
      { name: "1080p", size: "1920x1080", bitrate: "3000k" },
      { name: "720p", size: "1280x720", bitrate: "1500k" },
      { name: "480p", size: "854x480", bitrate: "800k" },
    ];

    const results = {};

    for (const res of resolutions) {
      try {
        const output = await this.transcodeToResolution(videoUrl, videoKey, res);
        results[res.name] = output;
      } catch (err) {
        console.log(`⚠ Failed ${res.name}:`, err.message);
      }
    }

    return results;
  }

  /* ======================================================
     TRANSCODE ONE RESOLUTION
  ====================================================== */
  async transcodeToResolution(videoUrl, videoKey, res) {
    return new Promise(async (resolve, reject) => {
      try {
        const tempVideo = await this.downloadTempFile(videoUrl, ".mp4");
        const tempOutput = path.join(this.tempDir, `out_${Date.now()}.mp4`);

        ffmpeg(tempVideo)
          .videoCodec("libx264")
          .audioCodec("aac")
          .size(res.size)
          .videoBitrate(res.bitrate)
          .audioBitrate("128k")
          .outputOptions(["-preset fast", "-crf 23", "-movflags +faststart"])
          .output(tempOutput)
          .on("end", async () => {
            try {
              const buffer = fs.readFileSync(tempOutput);
              const base = path.basename(videoKey, path.extname(videoKey));

              const key = `videos/${base}_${res.name}.mp4`;

              const url = await this.uploadToS3(buffer, key, "video/mp4");

              fs.unlinkSync(tempVideo);
              fs.unlinkSync(tempOutput);

              resolve(url);
            } catch (err) {
              reject(err);
            }
          })
          .on("error", (err) => reject(err))
          .run();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = new VideoProcessor();
