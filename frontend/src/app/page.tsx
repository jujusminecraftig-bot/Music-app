'use client';

import { useEffect, useState } from 'react';
import { audioAPI, recentAPI, recommendationsAPI, favoritesAPI } from '@/lib/api';
import TrackCard from '@/components/TrackCard';
import Link from 'next/link';
import { Compass, TrendingUp, Clock, Sparkles, ArrowRight, Radio, Play } from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';
import { useAuthStore } from '@/store/authStore';

interface Audio {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  coverArt?: string;
  createdAt: string;
  filePath: string;
}

interface TasteProfile {
  topGenres: string[];
  topArtists: string[];
  basedOn: number;
  favoriteCount?: number;
  recentCount?: number;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', emoji: '☀️' };
  if (hour < 17) return { text: 'Good afternoon', emoji: '🎵' };
  if (hour < 21) return { text: 'Good evening', emoji: '🌙' };
  return { text: 'Good night', emoji: '🌟' };
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-3.5 glass border border-white/5">
      <div className="aspect-square rounded-xl shimmer mb-3" />
      <div className="space-y-2">
        <div className="h-3 rounded shimmer w-4/5" />
        <div className="h-2.5 rounded shimmer w-3/5" />
      </div>
    </div>
  );
}

export default function Home() {
  const [recentTracks, setRecentTracks] = useState<Audio[]>([]);
  const [trendingTracks, setTrendingTracks] = useState<Audio[]>([]);
  const [dailyMix, setDailyMix] = useState<Audio[]>([]);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [tasteProfile, setTasteProfile] = useState<TasteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { setQueue, setCurrentTrack, setIsPlaying } = usePlayerStore();
  const { isAuthenticated } = useAuthStore();
  const greeting = getGreeting();

  useEffect(() => {
    fetchData();

    const onFocus = () => fetchData();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const requests: Promise<unknown>[] = [
        recentAPI.getAll().catch(() => ({ data: { recentPlays: [] } })),
        audioAPI.getAll({ limit: 10 }).catch(() => ({ data: { audio: [] } })),
      ];
      if (isAuthenticated) {
        requests.push(
          recommendationsAPI.getDailyMix().catch(() => ({ data: { tracks: [], tasteProfile: null } })),
          favoritesAPI.getAll().catch(() => ({ data: { favorites: [] } })),
        );
      }

      const results = await Promise.all(requests);
      const recentResponse = results[0] as { data: { recentPlays: { audio: Audio }[] } };
      const trendingResponse = results[1] as { data: { audio: Audio[] } };

      setRecentTracks(recentResponse.data.recentPlays.map((rp) => rp.audio).filter(Boolean));
      setTrendingTracks(trendingResponse.data.audio || []);

      if (isAuthenticated) {
        const mixResponse = (results[2] ?? { data: { tracks: [], tasteProfile: null } }) as {
          data: { tracks: Audio[]; tasteProfile: TasteProfile | null };
        };
        const favResponse = (results[3] ?? { data: { favorites: [] } }) as {
          data: { favorites: unknown[] };
        };
        setDailyMix(mixResponse.data.tracks || []);
        setTasteProfile(mixResponse.data.tasteProfile);
        setFavoriteCount(favResponse.data.favorites?.length ?? 0);
      } else {
        setDailyMix([]);
        setTasteProfile(null);
        setFavoriteCount(0);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayDailyMix = () => {
    if (dailyMix.length === 0) return;
    setQueue(dailyMix, 0, 'custom');
    setCurrentTrack(dailyMix[0]);
    setIsPlaying(true);
  };

  const hasTasteData = recentTracks.length > 0 || favoriteCount > 0;
  const showDailyMixSection = isAuthenticated;

  const isEmpty = !loading && recentTracks.length === 0 && trendingTracks.length === 0;

  return (
    <div className="space-y-10 animate-fade-in">

      {/* Hero Greeting */}
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{greeting.emoji}</span>
              <span className="text-sm font-medium text-muted uppercase tracking-widest">Welcome back</span>
            </div>
            <h1 className="text-4xl font-bold gradient-text-lltm mb-2 leading-tight">
              {greeting.text}
            </h1>
            <p className="text-muted text-base">
              What do you want to listen to today?
            </p>
          </div>

          <div className="flex gap-2 mt-2">
            <div className="glass rounded-2xl px-4 py-2 text-center border border-white/5">
              <p className="text-lg font-bold gradient-text">{trendingTracks.length}</p>
              <p className="text-[10px] text-muted uppercase tracking-wider">Tracks</p>
            </div>
            <div className="glass rounded-2xl px-4 py-2 text-center border border-white/5">
              <p className="text-lg font-bold gradient-text">{recentTracks.length}</p>
              <p className="text-[10px] text-muted uppercase tracking-wider">Recent</p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Mix */}
      {showDailyMixSection && (
        <section>
          {dailyMix.length > 0 || loading ? (
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-violet-900 to-fuchsia-900" />
            <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="absolute -bottom-10 right-10 w-56 h-56 rounded-full bg-pink-500/15 blur-3xl" />
            <div className="absolute inset-0 bg-black/25" />

            <div className="relative p-8">
              <div className="flex items-start justify-between gap-6 mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                    <Radio size={28} className="text-violet-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles size={13} className="text-violet-300" />
                      <span className="text-xs font-semibold text-violet-300 uppercase tracking-widest">Made for you</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-1">Your Daily Mix</h2>
                    {tasteProfile ? (
                      <p className="text-white/60 text-sm">
                        Curated from your vibe
                        {tasteProfile.topGenres.length > 0 && (
                          <> — {tasteProfile.topGenres.slice(0, 3).join(', ')}</>
                        )}
                        {(tasteProfile.favoriteCount ?? 0) > 0 && (
                          <> · {tasteProfile.favoriteCount} favorites</>
                        )}
                      </p>
                    ) : (
                      <p className="text-white/60 text-sm">Refreshing every day based on what you listen to</p>
                    )}
                  </div>
                </div>

                {dailyMix.length > 0 && !loading && (
                  <button
                    onClick={handlePlayDailyMix}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl btn-gradient text-white font-semibold shadow-glow hover:scale-105 transition-transform flex-shrink-0"
                  >
                    <Play size={18} fill="white" />
                    Play Mix
                  </button>
                )}
              </div>

              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {dailyMix.slice(0, 10).map((track) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      queueContext="custom"
                      queueTracks={dailyMix}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          ) : (
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/80 via-violet-900/80 to-fuchsia-900/80" />
            <div className="absolute inset-0 bg-black/30" />
            <div className="relative p-8 text-center">
              <Radio size={40} className="text-violet-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Your Daily Mix</h2>
              {hasTasteData ? (
                <>
                  <p className="text-white/60 text-sm max-w-md mx-auto mb-4">
                    We&apos;re learning your taste! Keep listening — your mix updates as you explore more music.
                  </p>
                  <button
                    onClick={fetchData}
                    className="px-5 py-2.5 rounded-xl glass border border-violet-500/30 text-violet-300 text-sm font-semibold hover:bg-violet-500/10 transition-colors"
                  >
                    Refresh Mix
                  </button>
                </>
              ) : (
                <p className="text-white/60 text-sm max-w-md mx-auto">
                  Play a few songs or heart some tracks in Discover — we&apos;ll build a personalized mix from your listens and favorites.
                </p>
              )}
            </div>
          </div>
          )}
        </section>
      )}

      {/* Discover Banner */}
      <Link href="/discover" className="block group">
        <div className="relative rounded-3xl overflow-hidden h-40 cursor-pointer transition-transform duration-300 group-hover:scale-[1.01]">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-900 via-purple-800 to-pink-900" />
          <div className="absolute -top-6 -right-6 w-40 h-40 rounded-full bg-violet-500/30 blur-2xl group-hover:scale-125 transition-transform duration-700" />
          <div className="absolute -bottom-6 right-20 w-32 h-32 rounded-full bg-pink-500/20 blur-2xl group-hover:scale-125 transition-transform duration-700 delay-100" />
          <div className="absolute top-4 left-40 w-24 h-24 rounded-full bg-purple-400/20 blur-2xl" />
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative h-full flex items-center px-8 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0 float-anim">
              <Compass size={28} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={13} className="text-violet-300" />
                <span className="text-xs font-semibold text-violet-300 uppercase tracking-widest">Free Music</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Discover</h2>
              <p className="text-white/60 text-sm">Millions of songs, zero cost. Powered by YouTube.</p>
            </div>
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/10 border border-white/20 group-hover:bg-white/20 transition-colors duration-200">
              <span className="text-sm font-semibold text-white">Explore</span>
              <ArrowRight size={15} className="text-white group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </Link>

      {/* Recently Played */}
      {(loading || recentTracks.length > 0) && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-violet-400" />
              <h2 className="text-xl font-bold text-white">Recently Played</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
              : recentTracks.slice(0, 10).map((track) => (
                  <TrackCard key={track.id} track={track} onDelete={fetchData} queueContext="library" queueTracks={recentTracks} />
                ))
            }
          </div>
        </section>
      )}

      {/* Trending */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-pink-400" />
            <h2 className="text-xl font-bold text-white">Your Library</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {loading
            ? Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
            : trendingTracks.map((track) => (
                <TrackCard key={track.id} track={track} onDelete={fetchData} queueContext="library" queueTracks={trendingTracks} />
              ))
          }
        </div>
      </section>

      {isEmpty && (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-3xl btn-gradient flex items-center justify-center mx-auto mb-5 float-anim shadow-glow">
            <Sparkles size={36} className="text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Your library is empty</h3>
          <p className="text-muted mb-6">Upload some music or discover free tracks below</p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/upload" className="px-5 py-2.5 rounded-xl btn-gradient text-white text-sm font-semibold shadow-glow hover:scale-105 transition-transform">
              Upload Music
            </Link>
            <Link href="/discover" className="px-5 py-2.5 rounded-xl glass border border-violet-500/30 text-violet-300 text-sm font-semibold hover:bg-violet-500/10 transition-colors">
              Discover Free Music
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
