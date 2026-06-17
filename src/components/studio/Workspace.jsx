import React from 'react';
import { StreamMonitor } from './MonitorComponents';
import { SidebarControls } from './SidebarComponents';
import { StudioProvider } from './StudioContext';

export function Workspace({ videoKey, isSuspended = false }) {
  return (
    <StudioProvider>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_20rem] gap-6">
        <StreamMonitor videoKey={videoKey} isSuspended={isSuspended} />
        <SidebarControls />
      </div>
    </StudioProvider>
  );
}

export default Workspace;
