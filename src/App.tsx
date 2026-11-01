import { useEffect, useMemo, useRef, useState } from 'react';
import { Share } from '@capacitor/share';

type MediaKind = 'audio' | 'video';

type MediaItem = {
  id: string;
  name: string;
  kind: MediaKind;
  src: string;
  duration: number;
  size: number;
};

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export function App() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'audio' | 'video'>('all');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId) ?? items[0] ?? null,
    [items, activeId]
  );

  const filteredItems = useMemo(
    () =>
      items.filter((item) => (selectedFilter === 'all' ? true : item.kind === selectedFilter)),
    [items, selectedFilter]
  );

  const addLocalFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    const newItems = Array.from(fileList)
      .filter((file) => /audio|video/i.test(file.type) || /\.(mp3|wav|aac|m4a|mp4|m4v|webm|ogg)$/i.test(file.name))
      .map((file) => {
        const kind: MediaKind = file.type.startsWith('video') ? 'video' : 'audio';
        const url = URL.createObjectURL(file);
        return {
          id: `${file.name}-${file.size}-${Date.now()}`,
          name: file.name,
          kind,
          src: url,
          duration: 0,
          size: file.size
        };
      });

    if (newItems.length === 0) {
      alert('No supported audio or video files were selected.');
      return;
    }

    setItems((prev) => [...prev, ...newItems]);
    setActiveId((prev) => prev ?? newItems[0].id);
  };

  useEffect(() => {
    const stored = localStorage.getItem('offline-player-library');
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as MediaItem[];
      if (Array.isArray(parsed)) {
        setItems(parsed);
        if (parsed[0]) setActiveId(parsed[0].id);
      }
    } catch {
      console.warn('Library cache is invalid.');
    }
  }, []);

  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem('offline-player-library', JSON.stringify(items));
    }
  }, [items]);

  useEffect(() => {
    if (!activeItem) return;

    const handleMetadata = () => {
      const mediaElem = activeItem.kind === 'video' ? videoRef.current : audioRef.current;
      if (!mediaElem) return;
      if (mediaElem.readyState >= 1) {
        setProgress(mediaElem.duration ? (mediaElem.currentTime / mediaElem.duration) * 100 : 0);
      }
    };

    const mediaElem = activeItem.kind === 'video' ? videoRef.current : audioRef.current;
    if (!mediaElem) return;

    mediaElem.addEventListener('loadedmetadata', handleMetadata);
    mediaElem.addEventListener('timeupdate', handleMetadata);

    return () => {
      mediaElem.removeEventListener('loadedmetadata', handleMetadata);
      mediaElem.removeEventListener('timeupdate', handleMetadata);
    };
  }, [activeItem]);

  useEffect(() => {
    const mediaElem = activeItem?.kind === 'video' ? videoRef.current : audioRef.current;
    if (!mediaElem) return;

    mediaElem.src = activeItem.src;
    mediaElem.load();
    if (isPlaying) {
      mediaElem.play().catch(() => setIsPlaying(false));
    }
  }, [activeItem, isPlaying]);

  useEffect(() => {
    const media = activeItem?.kind === 'video' ? videoRef.current : audioRef.current;
    if (!media) return;

    const handleTime = () => {
      setCurrentTime(media.currentTime);
      setProgress(media.duration ? (media.currentTime / media.duration) * 100 : 0);
    };

    media.addEventListener('timeupdate', handleTime);
    media.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      media.removeEventListener('timeupdate', handleTime);
      media.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, [activeItem]);

  const togglePlayPause = async () => {
    const media = activeItem?.kind === 'video' ? videoRef.current : audioRef.current;
    if (!media) return;

    if (isPlaying) {
      media.pause();
      setIsPlaying(false);
      return;
    }

    media.src = activeItem.src;
    media.load();
    await media.play();
    setIsPlaying(true);
  };

  const choosePrevious = () => {
    if (!filteredItems.length) return;
    const currentIndex = filteredItems.findIndex((item) => item.id === activeItem?.id);
    const prevIndex = currentIndex <= 0 ? filteredItems.length - 1 : currentIndex - 1;
    setActiveId(filteredItems[prevIndex].id);
    setIsPlaying(true);
  };

  const chooseNext = () => {
    if (!filteredItems.length) return;
    const currentIndex = filteredItems.findIndex((item) => item.id === activeItem?.id);
    const nextIndex = currentIndex >= filteredItems.length - 1 ? 0 : currentIndex + 1;
    setActiveId(filteredItems[nextIndex].id);
    setIsPlaying(true);
  };

  const handleSeek = (value: number) => {
    const media = activeItem?.kind === 'video' ? videoRef.current : audioRef.current;
    if (!media || !Number.isFinite(media.duration)) return;
    media.currentTime = (value / 100) * media.duration;
    setProgress(value);
  };

  const shareCurrent = async () => {
    if (!activeItem) return;

    try {
      await Share.share({
        title: activeItem.name,
        text: `Listen to ${activeItem.name} offline from my media collection.`,
        url: activeItem.src
      });
    } catch {
      // Share is optional; ignore if unavailable.
    }
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      return next;
    });
    if (activeId === id) setActiveId(null);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Offline media</p>
          <h1>Media Player</h1>
        </div>
        <button className="primary" onClick={() => inputRef.current?.click()}>
          Add files
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.mp4,.m4v,.webm,.ogg"
          multiple
          hidden
          onChange={(event) => addLocalFiles(event.target.files)}
        />
      </header>

      <div className="chip-row">
        {(['all', 'audio', 'video'] as const).map((filter) => (
          <button
            key={filter}
            className={selectedFilter === filter ? 'chip active' : 'chip'}
            onClick={() => setSelectedFilter(filter)}
          >
            {filter === 'all' ? 'All' : filter === 'audio' ? 'Audio' : 'Videos'}
          </button>
        ))}
      </div>

      <main className="content-grid">
        <section className="player-panel">
          <div className="art-card">
            {activeItem?.kind === 'video' ? (
              <video
                ref={videoRef}
                src={activeItem?.src}
                playsInline
                controls
                className="media-surface"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            ) : (
              <div className="media-surface audio-card">
                <div className="vinyl">
                  <span className="vinyl-core" />
                </div>
              </div>
            )}
          </div>

          {activeItem && (
            <>
              <div className="track-meta">
                <div>
                  <p className="tag">Now playing</p>
                  <h2>{activeItem.name}</h2>
                </div>
                <button className="ghost" onClick={shareCurrent}>Share</button>
              </div>

              <div className="slider-wrap">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(event) => handleSeek(Number(event.target.value))}
                />
                <div className="time-row">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(activeItem.duration || 0)}</span>
                </div>
              </div>

              <div className="controls">
                <button className="icon-btn" onClick={choosePrevious} aria-label="Previous track">
                  ⏮
                </button>
                <button className="play-btn" onClick={togglePlayPause}>
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button className="icon-btn" onClick={chooseNext} aria-label="Next track">
                  ⏭
                </button>
              </div>
            </>
          )}

          {!activeItem && (
            <div className="empty-state">
              <h3>Nothing loaded yet</h3>
              <p>Add audio or video files from your device to start playing offline.</p>
            </div>
          )}
        </section>

        <aside className="library-panel">
          <h3>Library</h3>
          <div className="library-list">
            {filteredItems.length === 0 ? (
              <p className="muted">No media in this filter.</p>
            ) : (
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  className={item.id === activeId ? 'library-item selected' : 'library-item'}
                  onClick={() => {
                    setActiveId(item.id);
                    setIsPlaying(true);
                  }}
                >
                  <div className="library-main">
                    <span className="type-badge">{item.kind}</span>
                    <div>
                      <strong>{item.name}</strong>
                      <small>{formatFileSize(item.size)}</small>
                    </div>
                  </div>
                  <span className="delete" onClick={(event) => {
                    event.stopPropagation();
                    removeItem(item.id);
                  }}>
                    Remove
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>
      </main>

      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
      />
    </div>
  );
}
