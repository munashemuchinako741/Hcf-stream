const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('@ffmpeg-installer/ffmpeg').path;
const fs = require('fs');
const path = require('path');
const { s3Client } = require('../config/s3-v3');

// Set ffmpeg paths
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic);

class VideoProcessor {
  constructor() {
    this.tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Generate thumbnail from video
   * @param {string} videoUrl - S3 URL of the video
   * @param {string} videoKey - S3 key of the video
   * @returns {Promise<string>} - S3 URL of the generated thumbnail
   */
  async generateThumbnail(videoUrl, videoKey) {
    return new Promise((resolve, reject) => {
      const tempVideoPath = path.join(this.tempDir, `temp_${Date.now()}.mp4`);
      const tempThumbnailPath = path.join(this.tempDir, `thumb_${Date.now()}.jpg`);

      // Download video from S3 temporarily
      const videoStream = fs.createWriteStream(tempVideoPath);
      const https = require('https');
      const url = require('url');

      https.get(videoUrl, (response) => {
        response.pipe(videoStream);
        videoStream.on('finish', () => {
          videoStream.close();

          // Generate thumbnail at 10% of video duration
          ffmpeg(tempVideoPath)
            .screenshots({
              count: 1,
              folder: this.tempDir,
              filename: path.basename(tempThumbnailPath, '.jpg'),
              timemarks: ['10%'],
              size: '640x360'
            })
            .on('end', async () => {
              try {
                // Upload thumbnail to S3
                const thumbnailBuffer = fs.readFileSync(tempThumbnailPath);
                const thumbnailKey = `thumbnails/${Date.now()}-${path.basename(videoKey, path.extname(videoKey))}.jpg`;

                const { PutObjectCommand } = require('@aws-sdk/client-s3');
                await s3Client.send(new PutObjectCommand({
                  Bucket: process.env.AWS_S3_BUCKET_NAME,
                  Key: thumbnailKey,
                  Body: thumbnailBuffer,
                  ContentType: 'image/jpeg',
                  ACL: 'public-read'
                }));
                const uploadResult = { Location: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${thumbnailKey}` };

                // Clean up temp files
                fs.unlinkSync(tempVideoPath);
                fs.unlinkSync(tempThumbnailPath);

                resolve(uploadResult.Location);
              } catch (error) {
                reject(error);
              }
            })
            .on('error', (err) => {
              // Clean up temp files
              if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
              if (fs.existsSync(tempThumbnailPath)) fs.unlinkSync(tempThumbnailPath);
              reject(err);
            });
        });
      }).on('error', (err) => {
        if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
        reject(err);
      });
    });
  }

  /**
   * Transcode video to multiple formats/resolutions
   * @param {string} videoUrl - S3 URL of the original video
   * @param {string} videoKey - S3 key of the original video
   * @returns {Promise<Object>} - Object containing transcoded video URLs
   */
  async transcodeVideo(videoUrl, videoKey) {
    const transcodedVersions = {};
    const resolutions = [
      { name: '1080p', size: '1920x1080', bitrate: '3000k' },
      { name: '720p', size: '1280x720', bitrate: '1500k' },
      { name: '480p', size: '854x480', bitrate: '800k' }
    ];

    for (const res of resolutions) {
      try {
        const transcodedUrl = await this.transcodeToResolution(videoUrl, videoKey, res);
        transcodedVersions[res.name] = transcodedUrl;
      } catch (error) {
        console.error(`Failed to transcode to ${res.name}:`, error);
        // Continue with other resolutions even if one fails
      }
    }

    return transcodedVersions;
  }

  /**
   * Transcode video to specific resolution
   * @param {string} videoUrl - S3 URL of the original video
   * @param {string} videoKey - S3 key of the original video
   * @param {Object} resolution - Resolution config
   * @returns {Promise<string>} - S3 URL of transcoded video
   */
  async transcodeToResolution(videoUrl, videoKey, resolution) {
    return new Promise((resolve, reject) => {
      const tempVideoPath = path.join(this.tempDir, `temp_${Date.now()}.mp4`);
      const tempTranscodedPath = path.join(this.tempDir, `transcoded_${Date.now()}.mp4`);

      // Download video from S3 temporarily
      const videoStream = fs.createWriteStream(tempVideoPath);
      const https = require('https');

      https.get(videoUrl, (response) => {
        response.pipe(videoStream);
        videoStream.on('finish', () => {
          videoStream.close();

          // Transcode video
          ffmpeg(tempVideoPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .size(resolution.size)
            .videoBitrate(resolution.bitrate)
            .audioBitrate('128k')
            .outputOptions([
              '-preset fast',
              '-crf 22',
              '-movflags +faststart'
            ])
            .output(tempTranscodedPath)
            .on('end', async () => {
              try {
                // Upload transcoded video to S3
                const transcodedBuffer = fs.readFileSync(tempTranscodedPath);
                const baseName = path.basename(videoKey, path.extname(videoKey));
                const transcodedKey = `videos/${baseName}_${resolution.name}.mp4`;

                const { PutObjectCommand } = require('@aws-sdk/client-s3');
                await s3Client.send(new PutObjectCommand({
                  Bucket: process.env.AWS_S3_BUCKET_NAME,
                  Key: transcodedKey,
                  Body: transcodedBuffer,
                  ContentType: 'video/mp4',
                  ACL: 'public-read'
                }));
                const uploadResult = { Location: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${transcodedKey}` };

                // Clean up temp files
                fs.unlinkSync(tempVideoPath);
                fs.unlinkSync(tempTranscodedPath);

                resolve(uploadResult.Location);
              } catch (error) {
                reject(error);
              }
            })
            .on('error', (err) => {
              // Clean up temp files
              if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
              if (fs.existsSync(tempTranscodedPath)) fs.unlinkSync(tempTranscodedPath);
              reject(err);
            })
            .run();
        });
      }).on('error', (err) => {
        if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
        reject(err);
      });
    });
  }

  /**
   * Get video duration
   * @param {string} videoUrl - S3 URL of the video
   * @returns {Promise<number>} - Duration in seconds
   */
  async getVideoDuration(videoUrl) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoUrl, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(Math.floor(metadata.format.duration));
        }
      });
    });
  }
}

module.exports = new VideoProcessor();
