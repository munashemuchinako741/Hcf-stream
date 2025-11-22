# Enhanced Migration Plan to Ant Media Server Community Edition

## Background
You experienced higher latency with your current Nginx RTMP + Express backend setup. To reduce latency and leverage Ant Media's features, you want to use Ant Media's viewer count, stream status, and other streaming-related metrics instead of your current custom-coded backend logic.

## 1. Ant Media Server Setup
Follow the original MigrationPlanToAntMediaServer.md for installation and basic migration steps to deploy the Ant Media Server Community Edition.

## 2. Leveraging Ant Media APIs for Streaming Data
- Ant Media provides REST APIs and WebSocket events that expose:
  - Live stream status and metadata
  - Viewer counts and viewer lists
  - Stream health and statistics
- These APIs can replace your existing backend routes for:
  - `/api/live-stream/current-stream`
  - `/api/live-stream/viewer-count`
  - `/api/live-stream/stream-status`

## 3. Integration Strategy
- Adjust your Express backend to:
  - Proxy or directly call Ant Media REST APIs for streaming data.
  - Listen to Ant Media WebSocket events for real-time updates where needed.
- Deprecate or remove your existing database-driven viewer count and stream metadata management.
- Optionally, cache some Ant Media API data in your backend for performance or extended features.

## 4. Streaming Source Migration
- Change RTMP stream URLs in broadcasting software (OBS etc.) to Ant Media's RTMP ingest URL.
- Ant Media supports WebRTC endpoints for ultra-low latency playback, improving viewer experience.

## 5. Testing Recommendations
- Test streaming with Ant Media RTMP ingest.
- Verify APIs that fetch viewer counts, stream status, and metadata are accurately integrated.
- Monitor latency improvements, stream health, and scaling behavior.
- Conduct both critical path and thorough testing of streaming and backend integrations.

## 6. Rollout and Deployment
- Run Ant Media alongside your existing Nginx RTMP server during transition.
- Gradually update clients to new streaming URLs and APIs.
- Cut over only after stability and latency meet requirements.

## 7. Additional Considerations
- Review authentication and access control flows in new API integrations.
- Consider enterprise edition if clustering and advanced features become necessary.

---

This enhanced plan focuses on replacing your current backend's streaming-related API logic with Ant Media Server's robust and low-latency capabilities for viewer counts, stream status, and more.
