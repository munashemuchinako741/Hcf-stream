import { NextApiRequest, NextApiResponse } from '@/node_modules/next'

export interface FacebookLiveStream {
  id: string
  title: string
  description: string
  status: 'LIVE' | 'SCHEDULED' | 'ENDED'
  stream_url: string
  embed_html: string
  scheduled_start_time?: string
  actual_start_time?: string
  live_views?: number
  start_time?: string
}

export class FacebookLiveAPI {
  private accessToken: string
  private pageId: string

  constructor(accessToken: string, pageId: string) {
    this.accessToken = accessToken
    this.pageId = pageId
  }

  async getLiveVideos(): Promise<FacebookLiveStream[]> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.pageId}/live_videos?access_token=${this.accessToken}&fields=id,title,description,status,stream_url,embed_html,scheduled_start_time,live_views`
      )

      if (!response.ok) {
        throw new Error(`Facebook API error: ${response.status}`)
      }

      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error('Error fetching Facebook live videos:', error)
      throw error
    }
  }

  async getCurrentLiveStream(): Promise<FacebookLiveStream | null> {
    try {
      const liveStreams = await this.getLiveVideos()
      const currentLive = liveStreams.find(stream => stream.status === 'LIVE')
      return currentLive || null
    } catch (error) {
      console.error('Error fetching current live stream:', error)
      return null
    }
  }

  async getEmbedCode(videoId: string): Promise<string> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${videoId}?access_token=${this.accessToken}&fields=embed_html`
      )

      if (!response.ok) {
        throw new Error(`Facebook API error: ${response.status}`)
      }

      const data = await response.json()
      return data.embed_html || ''
    } catch (error) {
      console.error('Error fetching embed code:', error)
      return ''
    }
  }
}

// Server-side function to get Facebook live streams
export async function getFacebookLiveStreams(accessToken: string, pageId: string): Promise<FacebookLiveStream[]> {
  const api = new FacebookLiveAPI(accessToken, pageId)
  return await api.getLiveVideos()
}

// Server-side function to get current live stream
export async function getCurrentFacebookLiveStream(accessToken: string, pageId: string): Promise<FacebookLiveStream | null> {
  const api = new FacebookLiveAPI(accessToken, pageId)
  return await api.getCurrentLiveStream()
}

// API route handler for Facebook live streams
export async function handleFacebookLiveAPI(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { accessToken, pageId } = req.query

    if (!accessToken || !pageId) {
      return res.status(400).json({ error: 'Missing accessToken or pageId' })
    }

    const api = new FacebookLiveAPI(accessToken as string, pageId as string)
    const liveStreams = await api.getLiveVideos()

    res.status(200).json({ liveStreams })
  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Failed to fetch live streams' })
  }
}
