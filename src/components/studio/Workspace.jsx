import React from 'react';
import { StreamMonitor } from './MonitorComponents';
import { ChannelsModal, SidebarControls } from './SidebarComponents';
import { StudioProvider, useStudio } from './StudioContext';

function formatDuration(ms) {
  if (!ms || ms < 0) return '00:00:00';
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function StudioHeader() {
  const { broadcast, channels, setChannelsModalOpen } = useStudio();
  const [now, setNow] = React.useState(Date.now());

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const armedCount = channels.filter((channel) => channel.active).length;
  const elapsed = broadcast.startedAt ? formatDuration(now - broadcast.startedAt) : '00:00:00';

  return (
    <div className="mb-5 flex flex-col gap-3 rounded-xl border border-gray-800 bg-gray-900 p-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-white">Cloud Production Studio</h2>
        <p className="text-xs uppercase tracking-wide text-gray-500">{String(broadcast.webrtcStatus || 'idle')} ingest</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2">
          <p className="text-[10px] font-bold uppercase text-gray-500">Clock</p>
          <p className="font-mono text-sm font-bold text-white">{elapsed}</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2">
          <p className="text-[10px] font-bold uppercase text-gray-500">Viewers</p>
          <p className="font-mono text-sm font-bold text-white">{broadcast.viewerCount || 0}</p>
        </div>
        <button
          type="button"
          onClick={() => setChannelsModalOpen(true)}
          className="rio-logo-gradient rounded-lg px-4 py-3 text-xs font-bold text-white shadow-lg shadow-red-900/20"
        >
          {armedCount} Armed
        </button>
      </div>
    </div>
  );
}

function WorkspaceLayout({ videoKey, isSuspended, channelManager }) {
  return (
    <>
      <StudioHeader />
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_20rem] gap-6">
        <StreamMonitor videoKey={videoKey} isSuspended={isSuspended} />
        <SidebarControls />
      </div>
      <ChannelsModal>{channelManager}</ChannelsModal>
    </>
  );
}

export function Workspace({ videoKey, isSuspended = false, channelManager = null }) {
  return (
    <StudioProvider>
      <WorkspaceLayout videoKey={videoKey} isSuspended={isSuspended} channelManager={channelManager} />
    </StudioProvider>
  );
}

export default Workspace;
