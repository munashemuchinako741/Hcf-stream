"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, Video, AlertCircle, CheckCircle, X } from "lucide-react"
import { useRouter } from "next/navigation"

interface VideoUploadProps {
  onUploadSuccess?: () => void
}

export function VideoUpload({ onUploadSuccess }: VideoUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [speaker, setSpeaker] = useState("")
  const [series, setSeries] = useState("")
  const [category, setCategory] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.type.startsWith("video/")) {
        setError("Please select a valid video file")
        return
      }
      if (selectedFile.size > 500 * 1024 * 1024) {
        setError("File size must be less than 500MB")
        return
      }

      setFile(selectedFile)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      setError("Please select a video file and enter a title")
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      const token = localStorage.getItem("token")
      if (!token) throw new Error("Authentication required")

      const formData = new FormData()
      formData.append("video", file)
      formData.append("title", title.trim())
      formData.append("description", description.trim())
      formData.append("speaker", speaker.trim())
      formData.append("series", series.trim())
      formData.append("category", category)

      // FIXED: Correct endpoint
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}` // REQUIRED
        },
        body: formData
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || "Upload failed")
      }

      setSuccess(true)

      // Reset form
      setFile(null)
      setTitle("")
      setDescription("")
      setSpeaker("")
      setSeries("")
      setCategory("")
      if (fileInputRef.current) fileInputRef.current.value = ""

      if (onUploadSuccess) onUploadSuccess()

      setTimeout(() => {
        router.push("/archive")
      }, 2000)

    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const clearFile = () => {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Sermon Video
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Video uploaded successfully! Processing will begin shortly.
            </AlertDescription>
          </Alert>
        )}

        {/* File Upload */}
        <div className="space-y-2">
          <Label>Video File *</Label>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <Video className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={clearFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Video className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="font-medium">Click to select a video file</p>
                <p className="text-sm text-muted-foreground">Max size: 500MB</p>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Choose File
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Speaker</Label>
            <Input value={speaker} onChange={(e) => setSpeaker(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Series</Label>
            <Input value={series} onChange={(e) => setSeries(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sunday Service">Sunday Service</SelectItem>
                <SelectItem value="Special Event">Special Event</SelectItem>
                <SelectItem value="Bible Study">Bible Study</SelectItem>
                <SelectItem value="Youth Service">Youth Service</SelectItem>
                <SelectItem value="Prayer Meeting">Prayer Meeting</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!file || !title.trim() || isUploading}
          size="lg"
          className="w-full"
        >
          {isUploading ? (
            <>
              <div className="animate-spin h-4 w-4 border-b-2 border-white mr-2"></div>
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Video
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
