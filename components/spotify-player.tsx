'use client';

import React, { useState, useMemo } from 'react';
import { Music, ExternalLink } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { PlaylistData, Track, SpotifyPlayerProps as SpotifyPlayerPropsType } from '@/lib/spotify-player-types';
import '../styles/playlist-card.css';

export function SpotifyPlayer({
  playlist,
  isPlaying: externalIsPlaying,
  onPlayPause,
  onSkipBack,
  onSkipForward,
  onSpotifyLink,
  className = ''
}: SpotifyPlayerPropsType) {
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Use external isPlaying if provided, otherwise use internal state
  const isPlaying = externalIsPlaying !== undefined ? externalIsPlaying : internalIsPlaying;

  // Fallback cover image
  const albumArtwork = playlist.coverUrl || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop";
  
  // Fallback to curator photo if no album artwork
  const submitterPhoto = playlist.curatorPhotoUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face";


  const handleSpotifyLink = () => {
    if (onSpotifyLink) {
      onSpotifyLink();
    } else if (playlist.spotifyUrl) {
      window.open(playlist.spotifyUrl, '_blank');
    }
  };


  // Derive now playing text
  const nowPlayingText = useMemo(() => {
    if (playlist.nowPlaying) return playlist.nowPlaying;
    const firstTrack = playlist.tracks?.[0];
    if (firstTrack) {
      return `Now Playing: "${firstTrack.name}" – ${firstTrack.artist}`;
    }
    return `Now Playing: "${playlist.title}"`;
  }, [playlist]);

  // Derive artists list
  const artistsList = useMemo(() => {
    if (playlist.artistsList) return playlist.artistsList;
    if (playlist.tracks && playlist.tracks.length > 0) {
      const artists = Array.from(new Set(
        playlist.tracks
          .map((t: Track) => t.artist)
          .filter(Boolean)
      ));
      return artists.join(', ');
    }
    return playlist.description || '';
  }, [playlist]);

  // Derive track count and duration
  const trackInfo = useMemo(() => {
    const count = playlist.trackCount || playlist.tracks?.length || 0;
    const duration = playlist.totalDuration || '';
    if (count && duration) {
      return `${count} tracks | ${duration}`;
    } else if (count) {
      return `${count} track${count !== 1 ? 's' : ''}`;
    }
    return '';
  }, [playlist]);

  return (
    <section 
      aria-labelledby="playlist-heading" 
      className={`playlist-card w-full h-full min-h-[520px] p-5 md:p-6 relative ${className}`}
      style={{
        ['--cover' as any]: '180px',
        ['--vinyl-gap' as any]: '24px'
      }}
    >
      {/* Skip link for keyboard users */}
      <a href="#playlist-controls" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-emerald-900 focus:text-white focus:px-3 focus:py-2 focus:rounded">
        Skip to playback controls
      </a>

      {/* Media Row: cover and vinyl with proper overlap */}
      <div className="media mb-2">
        <div className="mediaGroup">
          {/* Cover - positioned on top */}
          <img
            src={albumArtwork || submitterPhoto}
            alt={playlist.title || "Playlist cover"}
            className="object-cover w-[var(--cover)] h-[var(--cover)] rounded-none ring-2 ring-emerald-300/30 relative z-10"
          />
          {/* Vinyl - positioned behind cover */}
          <div className="vinylWrap">
            <div className="vinyl rounded-full bg-black/90 ring-1 ring-black/40 pointer-events-none">
              {/* center label avatar */}
              {submitterPhoto && (
                <img
                  src={submitterPhoto}
                  alt=""
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 md:w-12 md:h-12 rounded-full ring-2 ring-emerald-400"
                  aria-hidden="true"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content below media row */}
      <motion.header
        className="content text-left mt-5 md:mt-6 mb-2 relative z-20 space-y-1.5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <motion.div 
          role="heading"
          aria-level={4}
          id="playlist-heading"
          className="text-2xl md:text-[28px] leading-tight font-semibold text-foreground"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {playlist.title || 'Playlist'}
        </motion.div>
        <p className="text-[12px] md:text-sm text-foreground/80">by {playlist.curator || 'Unknown'}</p>
      </motion.header>

      {/* Now Playing */}
      <motion.div 
        className="text-left mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <motion.p 
          className="text-sm md:text-[15px] text-foreground/85"
          aria-live="polite"
          aria-atomic="true"
          animate={{ 
            opacity: shouldReduceMotion ? 1 : (isPlaying ? [0.7, 1, 0.7] : 1)
          }}
          transition={{ duration: 2, repeat: shouldReduceMotion ? 0 : (isPlaying ? Infinity : 0) }}
        >
          {nowPlayingText}
        </motion.p>
      </motion.div>

      {/* Spotify Link Button Only */}
      <motion.div 
        id="playlist-controls"
        className="flex items-start mb-2"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        {/* Spotify pill */}
        <motion.button 
          type="button"
          aria-label="Open in Spotify"
          onClick={handleSpotifyLink}
          className="h-12 px-5 md:px-6 rounded-full inline-flex items-center gap-2 bg-emerald-800/70 ring-1 ring-emerald-500/20 text-white relative focus:outline-none focus:ring-2 focus:ring-emerald-400 hover:bg-emerald-700/70"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Music className="w-5 h-5" aria-hidden="true" />
          <span className="font-medium tracking-wide">Spotify</span>
          <ExternalLink className="w-4 h-4 ml-2" aria-hidden="true" />
        </motion.button>
      </motion.div>

      {/* Equalizer row - CSS animated bars */}
      <div className="eq-container">
        <div className="eq">
          {Array.from({ length: 16 }, (_, i) => (
            <div key={i} className="eq-bar" />
          ))}
        </div>
      </div>

      {/* Track Info */}
      {trackInfo && (
        <motion.div 
          className="text-left mb-2 font-sans mt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          <motion.p 
            className="text-[11px] md:text-xs text-foreground/70"
          >
            {trackInfo}
          </motion.p>
        </motion.div>
      )}

      {/* Artists List - Left Aligned */}
      {artistsList && (
        <motion.div 
          className="text-foreground/80 text-[15px] md:text-base leading-7 text-left px-4 font-normal tracking-tight max-w-2xl mt-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.4 }}
        >
          <motion.p
            className="break-normal whitespace-normal line-clamp-6 md:line-clamp-7"
            animate={{ 
              opacity: [0.8, 1, 0.8]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            {artistsList}
          </motion.p>
        </motion.div>
      )}

    </section>
  );
}
