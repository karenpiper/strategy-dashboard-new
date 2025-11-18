'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlaylistData, Track } from '@/lib/spotify-player-types'
import { Plus, Trash2, Save, Music } from 'lucide-react'

export default function PlaylistsAdmin() {
  const [playlist, setPlaylist] = useState<PlaylistData>({
    title: 'Halloween Prom',
    curator: 'Rebecca Smith',
    curatorPhotoUrl: '/placeholder-user.jpg',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b273c5649add07ed3720be9d5526',
    description: 'macabre mingling, bone-chilling bops, spooky sl dances, and spiked punch - vampy vibes include',
    spotifyUrl: 'https://open.spotify.com/playlist/example',
    trackCount: 20,
    totalDuration: '73:48',
    tracks: [
      { name: 'Thriller', artist: 'Michael Jackson', duration: '5:57' },
      { name: 'Monster Mash', artist: 'Bobby Pickett', duration: '3:12' },
      { name: 'Ghostbusters', artist: 'Ray Parker Jr.', duration: '4:05' },
      { name: 'This Is Halloween', artist: 'Danny Elfman', duration: '3:16' },
      { name: 'Time Warp', artist: 'Richard O\'Brien', duration: '3:19' },
    ],
  })

  const addTrack = () => {
    setPlaylist({
      ...playlist,
      tracks: [...playlist.tracks, { name: '', artist: '', duration: '' }],
    })
  }

  const removeTrack = (index: number) => {
    setPlaylist({
      ...playlist,
      tracks: playlist.tracks.filter((_, i) => i !== index),
    })
  }

  const updateTrack = (index: number, field: keyof Track, value: string) => {
    const updatedTracks = [...playlist.tracks]
    updatedTracks[index] = { ...updatedTracks[index], [field]: value }
    setPlaylist({ ...playlist, tracks: updatedTracks })
  }

  const handleSave = () => {
    // TODO: Save to database/API
    console.log('Saving playlist:', playlist)
    alert('Playlist saved! (This will connect to your backend)')
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Manage Playlists</h1>
        <p className="text-muted-foreground">Edit playlist information, tracks, and metadata</p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          {/* Basic Info */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Playlist Title</label>
                <Input
                  value={playlist.title}
                  onChange={(e) => setPlaylist({ ...playlist, title: e.target.value })}
                  placeholder="Halloween Prom"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Curator</label>
                <Input
                  value={playlist.curator}
                  onChange={(e) => setPlaylist({ ...playlist, curator: e.target.value })}
                  placeholder="Rebecca Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Cover Image URL</label>
                <Input
                  value={playlist.coverUrl || ''}
                  onChange={(e) => setPlaylist({ ...playlist, coverUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Curator Photo URL</label>
                <Input
                  value={playlist.curatorPhotoUrl || ''}
                  onChange={(e) => setPlaylist({ ...playlist, curatorPhotoUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                <Input
                  value={playlist.description || ''}
                  onChange={(e) => setPlaylist({ ...playlist, description: e.target.value })}
                  placeholder="Playlist description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Spotify URL</label>
                <Input
                  value={playlist.spotifyUrl || ''}
                  onChange={(e) => setPlaylist({ ...playlist, spotifyUrl: e.target.value })}
                  placeholder="https://open.spotify.com/playlist/..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Total Duration</label>
                <Input
                  value={playlist.totalDuration || ''}
                  onChange={(e) => setPlaylist({ ...playlist, totalDuration: e.target.value })}
                  placeholder="73:48"
                />
              </div>
            </div>
          </div>

          {/* Tracks */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Tracks</h2>
              <Button onClick={addTrack} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Track
              </Button>
            </div>
            <div className="space-y-3">
              {playlist.tracks.map((track, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-5">
                      <Input
                        value={track.name}
                        onChange={(e) => updateTrack(index, 'name', e.target.value)}
                        placeholder="Track name"
                      />
                    </div>
                    <div className="col-span-5">
                      <Input
                        value={track.artist}
                        onChange={(e) => updateTrack(index, 'artist', e.target.value)}
                        placeholder="Artist name"
                      />
                    </div>
                    <div className="col-span-1">
                      <Input
                        value={track.duration || ''}
                        onChange={(e) => updateTrack(index, 'duration', e.target.value)}
                        placeholder="3:45"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        onClick={() => removeTrack(index)}
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-border">
            <Button onClick={handleSave} size="lg">
              <Save className="w-4 h-4 mr-2" />
              Save Playlist
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

