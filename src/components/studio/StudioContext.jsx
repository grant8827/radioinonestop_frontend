import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const StudioContext = createContext();

export function useStudio() {
  return useContext(StudioContext);
}

export function StudioProvider({ children }) {
  const { token } = useAuth();
  const [ticker, setTicker] = useState({
    text: 'LIVE UPDATE: Broadcasting now...',
    speed: 50,
    label: 'BREAKING',
    visible: true,
  });

  const [theme, setTheme] = useState({
    backgroundId: 'gradient-1',
    logoUrl: '',
    logoVisible: false,
  });

  const [channels, setChannels] = useState([]);

  const [broadcast, setBroadcast] = useState({
    isLive: false,
    webrtcStatus: 'idle', // idle, connecting, live, error
    startedAt: null,
    viewerCount: 0,
  });

  const [channelsModalOpen, setChannelsModalOpen] = useState(false);
  
  const [devices, setDevices] = useState({
    videoDeviceId: '',
    audioDeviceId: '',
    cameraEnabled: true,
    micEnabled: true,
  });

  // WebSocket signaling simulation (to be wired to Go backend later)
  const wsRef = useRef(null);

  useEffect(() => {
    // In a real implementation, we connect to ws://.../studio
    // wsRef.current = new WebSocket('ws://localhost:8080/ws/studio');
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setChannels([]);
      return;
    }
    fetch('/api/destinations', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const destinations = Array.isArray(data?.destinations) ? data.destinations : [];
        setChannels(destinations.map((d) => ({
          id: d.id,
          name: d.name || d.label || d.platform || 'Destination',
          platform: d.platform || 'custom',
          key: d.streamKey || '',
          serverUrl: d.serverUrl || '',
          active: !!(d.enabled ?? d.active),
        })));
      })
      .catch(() => setChannels([]));
  }, [token]);

  const persistChannel = async (channel) => {
    if (!token || !channel?.id) return;
    await fetch(`/api/destinations/${encodeURIComponent(channel.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: channel.name,
        serverUrl: channel.serverUrl,
        streamKey: channel.key,
        enabled: !!channel.active,
        platform: channel.platform,
      }),
    }).catch(() => {});
  };

  const value = {
    ticker, setTicker,
    theme, setTheme,
    channels, setChannels,
    broadcast, setBroadcast,
    channelsModalOpen, setChannelsModalOpen,
    devices, setDevices,
    wsRef,
    persistChannel,
  };

  return (
    <StudioContext.Provider value={value}>
      {children}
    </StudioContext.Provider>
  );
}
