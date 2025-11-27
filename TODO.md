# TODO: Enhance AntMediaPlayer Integration

## Steps to complete:

1. Update `frontend/components/ant-media-player.tsx`:
   - Add support for additional props: autoplay, mute, playOrder, playType, targetLatency, is360.
   - Improve error handling during player initialization and play.
   - Use these props to configure the WebPlayer instance accordingly.

2. Update `frontend/app/live/page.tsx`:
   - Add state or config variables to pass new props to AntMediaPlayer.
   - Pass the new configuration options from environment variables or hardcoded values to AntMediaPlayer.

3. Test the player integration locally:
   - Verify player initializes and plays the stream correctly.
   - Validate support for new config options (e.g. mute & autoplay toggling).

4. Optional:
   - Add documentation about new props or environment variables.

---

Next step: Implement step 1 (enhance AntMediaPlayer).
