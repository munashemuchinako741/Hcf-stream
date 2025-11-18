import { VideoUpload } from "@/components/video-upload"

export default function UploadPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Upload Sermon Video</h1>
          <p className="text-muted-foreground">
            Share your church sermons and messages with the congregation
          </p>
        </div>

        <VideoUpload />
      </div>
    </div>
  )
}
