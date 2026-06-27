import { deezerAPI, audioAPI } from '@/lib/api';
import { YTTrack } from '@/components/YouTubePlayer';

export async function resolveDeezerToYT(
  track: any,
  saveToLibrary: boolean
): Promise<YTTrack | null> {
  try {
    const res = await deezerAPI.getYoutubeId(track.artist.name, track.title);
    if (!res.data?.videoId) return null;

    const ytTrack: YTTrack = {
      videoId: res.data.videoId,
      title: track.title,
      artist: track.artist.name,
      thumbnail: track.album?.cover_medium || track.album?.cover || '',
      duration: track.duration,
    };

    if (saveToLibrary) {
      try {
        const uploadRes = await audioAPI.createExternal({
          videoId: res.data.videoId,
          title: track.title,
          artist: track.artist.name,
          album: track.album?.title || '',
          coverArt: track.album?.cover_medium || track.album?.cover || '',
          duration: track.duration || 0,
        });
        if (uploadRes.data?.audio?.id) {
          ytTrack.audioId = uploadRes.data.audio.id;
        }
      } catch {
        // continue without saving
      }
    }

    return ytTrack;
  } catch {
    return null;
  }
}
