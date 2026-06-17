import React from 'react';
import { useStudio } from './StudioContext';

export function TickerCustomizer() {
  const { ticker, setTicker, wsRef } = useStudio();

  const handleUpdate = (field, value) => {
    const newTicker = { ...ticker, [field]: value };
    setTicker(newTicker);
    // Send state update via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'UPDATE_TICKER', payload: newTicker }));
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
      <h3 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
        <span>On-Screen Ticker</span>
        <label className="flex items-center cursor-pointer">
          <div className="relative">
            <input type="checkbox" className="sr-only" checked={ticker.visible} onChange={e => handleUpdate('visible', e.target.checked)} />
            <div className={`block w-8 h-5 rounded-full ${ticker.visible ? 'bg-green-500' : 'bg-gray-700'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition ${ticker.visible ? 'transform translate-x-3' : ''}`}></div>
          </div>
        </label>
      </h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Prefix Label</label>
          <input 
            type="text" 
            value={ticker.label} 
            onChange={e => handleUpdate('label', e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Scrolling Text</label>
          <textarea 
            value={ticker.text} 
            onChange={e => handleUpdate('text', e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white h-20 resize-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 flex justify-between mb-1">
            <span>Scroll Speed</span>
            <span>{ticker.speed}%</span>
          </label>
          <input 
            type="range" min="10" max="100" 
            value={ticker.speed} 
            onChange={e => handleUpdate('speed', parseInt(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

export function ThemeDesigner() {
  const { theme, setTheme, wsRef } = useStudio();

  const handleUpdate = (field, value) => {
    const newTheme = { ...theme, [field]: value };
    setTheme(newTheme);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'UPDATE_THEME', payload: newTheme }));
    }
  };

  const backgrounds = [
    { id: 'gradient-1', name: 'Cosmic Purple' },
    { id: 'gradient-2', name: 'Emerald Ocean' },
    { id: 'dark', name: 'Solid Dark' }
  ];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
      <h3 className="text-sm font-bold text-white mb-3">Theme & Branding</h3>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-gray-500 block mb-2">Background Style</label>
          <div className="grid grid-cols-3 gap-2">
            {backgrounds.map(bg => (
              <button 
                key={bg.id}
                onClick={() => handleUpdate('backgroundId', bg.id)}
                className={`py-2 px-1 text-xs rounded-lg border ${theme.backgroundId === bg.id ? 'border-indigo-500 bg-indigo-900/20 text-white' : 'border-gray-800 bg-gray-950 text-gray-400 hover:border-gray-600'}`}
              >
                {bg.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-500">Watermark Logo URL</label>
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={theme.logoVisible} onChange={e => handleUpdate('logoVisible', e.target.checked)} />
                <div className={`block w-6 h-3.5 rounded-full ${theme.logoVisible ? 'bg-green-500' : 'bg-gray-700'}`}></div>
                <div className={`dot absolute left-0.5 top-0.5 bg-white w-2.5 h-2.5 rounded-full transition ${theme.logoVisible ? 'transform translate-x-2.5' : ''}`}></div>
              </div>
            </label>
          </div>
          <input 
            type="text" 
            placeholder="https://.../logo.png"
            value={theme.logoUrl} 
            onChange={e => handleUpdate('logoUrl', e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white"
          />
        </div>
      </div>
    </div>
  );
}

export function ChannelController() {
  const { channels, setChannels, wsRef, persistChannel, setChannelsModalOpen } = useStudio();

  const toggleChannel = (id) => {
    let toggled = null;
    const updated = channels.map(c => {
      if (c.id !== id) return c;
      toggled = { ...c, active: !c.active };
      return toggled;
    });
    setChannels(updated);
    if (toggled) persistChannel(toggled);
    
    // Notify server of armed destinations
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const activeTargets = updated.filter(c => c.active).map(c => ({ platform: c.platform, key: c.key }));
      wsRef.current.send(JSON.stringify({ type: 'UPDATE_DESTINATIONS', payload: activeTargets }));
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white">Broadcast Destinations</h3>
        <span className="text-[10px] font-bold text-gray-500 uppercase">{channels.filter(c => c.active).length} armed</span>
      </div>
      <div className="space-y-2">
        {channels.length === 0 && (
          <div className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-4 text-xs text-gray-500">
            Add destinations below in Manual Destinations to arm multicast targets.
          </div>
        )}
        {channels.map(channel => (
          <div key={channel.id} className="flex items-center justify-between bg-gray-950 border border-gray-800 rounded-lg p-2.5">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${channel.active ? 'bg-green-500 animate-pulse' : 'bg-gray-700'}`}></div>
              <div className="min-w-0">
                <span className="block text-sm text-white font-medium truncate">{channel.name}</span>
                <span className="block text-[10px] text-gray-600 uppercase">{channel.platform}</span>
              </div>
            </div>
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={channel.active} onChange={() => toggleChannel(channel.id)} />
                <div className={`block w-8 h-5 rounded-full ${channel.active ? 'bg-green-500' : 'bg-gray-700'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition ${channel.active ? 'transform translate-x-3' : ''}`}></div>
              </div>
            </label>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setChannelsModalOpen(true)}
        className="mt-3 w-full rounded-lg border border-red-700/60 bg-red-950/20 px-3 py-2 text-xs font-bold text-red-100 hover:bg-red-900/30"
      >
        Open Channel Hub
      </button>
    </div>
  );
}

export function SidebarControls() {
  return (
    <div className="w-80 flex flex-col gap-4 overflow-y-auto pr-2">
      <ChannelController />
      <TickerCustomizer />
      <ThemeDesigner />
    </div>
  );
}

export function ChannelsModal({ children }) {
  const { channels, channelsModalOpen, setChannelsModalOpen } = useStudio();

  if (!channelsModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-5xl max-h-[86vh] overflow-hidden rounded-xl border border-gray-800 bg-gray-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-white">Channels Hub</h3>
            <p className="text-xs text-gray-500">{channels.length} configured multicast target{channels.length === 1 ? '' : 's'}</p>
          </div>
          <button
            type="button"
            onClick={() => setChannelsModalOpen(false)}
            className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-xs font-bold text-gray-300 hover:text-white"
          >
            Close
          </button>
        </div>
        <div className="max-h-[calc(86vh-76px)] overflow-y-auto p-5">
          <div className="mb-5 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {channels.map((channel) => (
              <div key={channel.id} className="rounded-lg border border-gray-800 bg-gray-900 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{channel.name}</p>
                    <p className="text-[10px] uppercase text-gray-500">{channel.platform}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${channel.active ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    {channel.active ? 'Armed' : 'Saved'}
                  </span>
                </div>
              </div>
            ))}
            {channels.length === 0 && (
              <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 text-sm text-gray-500">
                No multicast targets configured.
              </div>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
