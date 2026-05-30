import { useState, useEffect, useCallback } from 'react'

/**
 * Base component for displaying ads
 * Handles fetching active campaigns, tracking impressions, and click-throughs
 */
export function useAdCampaign(placementId) {
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tracked, setTracked] = useState(false)

  useEffect(() => {
    async function fetchCampaign() {
      try {
        const res = await fetch(`/api/ads/campaigns?placementId=${placementId}&status=active`)
        if (res.ok) {
          const campaigns = await res.json()
          // Select first active campaign (could add rotation logic later)
          if (campaigns.length > 0) {
            setCampaign(campaigns[0])
          }
        }
      } catch (err) {
        console.error('Failed to fetch ad campaign:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCampaign()
  }, [placementId])

  // Track impression when ad is displayed
  useEffect(() => {
    if (campaign && !tracked) {
      trackImpression(campaign.id)
      setTracked(true)
    }
  }, [campaign, tracked])

  const trackClick = useCallback(() => {
    if (campaign) {
      trackAdClick(campaign.id)
    }
  }, [campaign])

  return { campaign, loading, trackClick }
}

async function trackImpression(campaignId) {
  try {
    await fetch('/api/ads/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId,
        eventType: 'impression',
      }),
    })
  } catch (err) {
    console.error('Failed to track impression:', err)
  }
}

async function trackAdClick(campaignId) {
  try {
    await fetch('/api/ads/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId,
        eventType: 'click',
      }),
    })
  } catch (err) {
    console.error('Failed to track click:', err)
  }
}

/**
 * Player Overlay Ad - Shows over the audio/video player
 */
export function PlayerOverlayAd() {
  const { campaign, loading, trackClick } = useAdCampaign('player-overlay')

  if (loading || !campaign) return null

  const handleClick = () => {
    trackClick()
    if (campaign.targetUrl) {
      window.open(campaign.targetUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div
      className="absolute bottom-4 right-4 max-w-xs cursor-pointer group"
      onClick={handleClick}
    >
      <div className="bg-black/80 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-2xl hover:border-purple-500 transition-colors">
        {campaign.assetType === 'Flyer' && campaign.assetUrl && (
          <img
            src={campaign.assetUrl}
            alt={campaign.advertiserName}
            className="w-full h-auto rounded mb-2"
          />
        )}
        <div className="flex gap-3 items-start">
          {!campaign.assetUrl && (
            <div className="w-16 h-16 bg-purple-600 rounded flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">📢</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white mb-1">{campaign.advertiserName}</div>
            {campaign.assetName && (
              <div className="text-xs text-gray-300">{campaign.assetName}</div>
            )}
            <div className="text-xs text-gray-400 mt-1">Sponsored</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Header Banner Ad - Shows at the top of the page
 */
export function HeaderBannerAd() {
  const { campaign, loading, trackClick } = useAdCampaign('header-banner')
  const [closed, setClosed] = useState(false)

  if (loading || !campaign || closed) return null

  const handleClick = () => {
    trackClick()
    if (campaign.targetUrl) {
      window.open(campaign.targetUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto relative">
        <button
          onClick={() => setClosed(true)}
          className="absolute top-2 right-2 text-gray-400 hover:text-white z-10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div
          className="cursor-pointer hover:opacity-90 transition-opacity"
          onClick={handleClick}
        >
          {campaign.assetType === 'Flyer' && campaign.assetUrl ? (
            <img
              src={campaign.assetUrl}
              alt={campaign.advertiserName}
              className="w-full h-auto max-h-32 object-cover"
            />
          ) : (
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-center">
              <div className="text-white font-bold text-lg mb-1">{campaign.advertiserName}</div>
              {campaign.assetName && (
                <div className="text-purple-100 text-sm">{campaign.assetName}</div>
              )}
              <div className="text-xs text-purple-200 mt-2">Sponsored Content</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Sidebar Ad - Shows in the sidebar
 */
export function SidebarAd() {
  const { campaign, loading, trackClick } = useAdCampaign('sidebar')

  if (loading || !campaign) return null

  const handleClick = () => {
    trackClick()
    if (campaign.targetUrl) {
      window.open(campaign.targetUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div
      className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-purple-500 transition-colors"
      onClick={handleClick}
    >
      <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Sponsored</div>
      
      {campaign.assetType === 'Flyer' && campaign.assetUrl ? (
        <img
          src={campaign.assetUrl}
          alt={campaign.advertiserName}
          className="w-full h-auto rounded-lg mb-3"
        />
      ) : (
        <div className="aspect-square bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg mb-3 flex items-center justify-center">
          <span className="text-6xl">📢</span>
        </div>
      )}
      
      <div className="text-white font-semibold mb-1">{campaign.advertiserName}</div>
      {campaign.assetName && (
        <div className="text-sm text-gray-400 mb-2">{campaign.assetName}</div>
      )}
      {campaign.targetUrl && (
        <div className="text-xs text-purple-400 hover:text-purple-300">
          Learn More →
        </div>
      )}
    </div>
  )
}

/**
 * Audio Preroll Ad - Plays before stream starts
 * Note: Actual audio playback would need to be integrated with the audio player
 */
export function AudioPrerollAd({ onComplete }) {
  const { campaign, loading, trackClick } = useAdCampaign('audio-pre')
  const [playing, setPlaying] = useState(false)
  const [skipped, setSkipped] = useState(false)

  useEffect(() => {
    if (campaign && !playing && !skipped) {
      setPlaying(true)
      
      // Auto-complete after 15 seconds (or actual audio duration)
      const timer = setTimeout(() => {
        setPlaying(false)
        if (onComplete) onComplete()
      }, 15000)

      return () => clearTimeout(timer)
    }
  }, [campaign, playing, skipped, onComplete])

  if (loading || !campaign || skipped) {
    if (onComplete && !loading && !campaign) onComplete()
    return null
  }

  const handleSkip = () => {
    setSkipped(true)
    setPlaying(false)
    if (onComplete) onComplete()
  }

  const handleClick = () => {
    trackClick()
    if (campaign.targetUrl) {
      window.open(campaign.targetUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-24 h-24 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-5xl">🔊</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{campaign.advertiserName}</h3>
          {campaign.assetName && (
            <p className="text-gray-400">{campaign.assetName}</p>
          )}
        </div>

        {campaign.assetType === 'Audio' && campaign.assetUrl && (
          <audio
            src={campaign.assetUrl}
            autoPlay
            onEnded={handleSkip}
            className="w-full mb-4"
            controls
          />
        )}

        {campaign.targetUrl && (
          <button
            onClick={handleClick}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 rounded-lg mb-3 transition-colors"
          >
            Learn More
          </button>
        )}

        <button
          onClick={handleSkip}
          className="w-full text-gray-400 hover:text-white text-sm"
        >
          Skip Ad
        </button>

        <div className="text-center text-xs text-gray-500 mt-4">
          Stream will begin shortly
        </div>
      </div>
    </div>
  )
}

export default {
  PlayerOverlayAd,
  HeaderBannerAd,
  SidebarAd,
  AudioPrerollAd,
}
