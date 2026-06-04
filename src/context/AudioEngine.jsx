import { createContext, useContext, useRef, useCallback, useState, useEffect } from 'react'

const AudioEngineCtx = createContext(null)

export function AudioEngineProvider({ children }) {
  const acRef         = useRef(null)   // AudioContext
  const masterRef     = useRef(null)   // GainNode → destination + streamDest
  const streamDestRef = useRef(null)   // MediaStreamDestinationNode
  const conferenceSendDestRef = useRef(null) // MediaStreamDestinationNode (mix-minus send to conference)
  const conferenceSendBusRef = useRef(null)  // GainNode fed by channel send taps
  const conferenceSendAnalyserRef = useRef(null)
  const conferenceSendMutedRef = useRef(false)
  const conferenceReturnAnalyserRef = useRef(null) // Raw incoming caller audio, before mixer controls
  const conferencePgmAnalyserRef = useRef(null)
  const conferenceCueAnalyserRef = useRef(null)
  const conferenceReturnDestRef = useRef(null)
  const conferenceNodesRef = useRef(null) // Dedicated mixer return strip for caller audio

  // channelId → { gainNode, hiEQ, midEQ, loEQ, panNode, faderNode, analyserNode }
  const channelNodes  = useRef({})

  // 'dj-a' | 'dj-b' → HTMLMediaElement
  const mediaElements = useRef({})

  // 'dj-a' | 'dj-b' → MediaElementSourceNode (created once per element)
  const mediaSources  = useRef({})

  // 'dj-a' | 'dj-b' → AnalyserNode tapped right off the deck source
  const deckAnalysers = useRef({})

  // 'dj-a' | 'dj-b' → { hi, mid, lo } BiquadFilterNodes (per-deck EQ)
  const deckEqNodes = useRef({})

  // 'dj-a' | 'dj-b' → GainNode — pre-EQ fader/crossfader mix (keeps element.volume=1 so CUE taps pure signal)
  const deckMixNodes = useRef({})

  // Master output AnalyserNode
  const masterAnalyserRef = useRef(null)

  // 3-band EQ on the master bus (between master gain and master analyser)
  const masterEqRef = useRef(null)  // { hi, mid, lo } BiquadFilterNodes

  // Headphone phones gain — sits between masterAnalyser and ac.destination (local only, stream unaffected)
  const phonesGainRef = useRef(null)

  // Gain node between masterAnalyser and phonesGain — set to 0 when CUE is held (switches phones to cue)
  const mainToPhonesGainRef = useRef(null)

  // Cue bus — deck signals are routed here when CUE is held; feeds into phonesGain
  const cueBusRef = useRef(null)

  // deckKey → GainNode (cue send per deck, created lazily)
  const cueSendNodes = useRef({})

  // channelId → { stream: MediaStream, sourceNode: MediaStreamSourceNode }
  const micStreams     = useRef({})

  // participant identity → { route: 'pgm' | 'cue', gain: 0..1, muted: boolean }
  const conferenceControlsRef = useRef(new Map())

  // track.sid → conference source wiring
  const confSourcesRef   = useRef(new Map())
  // channelId of the line channel that has 'conference' as its source (or null)
  const confChannelIdRef = useRef(null)

  // channelId to connect once both dj-a and dj-b elements are registered
  const pendingDjChannel = useRef(null)

  // true once a Mixer channel has DJ Player assigned
  const [djConnected, setDjConnected] = useState(false)

  // current duck state (true = mics on-air, line channels at 10%)
  const isDuckedRef = useRef(false)

  // channelId → { on, mute, fader } — cached so setMicOnAir can act without Mixer mounted
  const channelStateRef = useRef({})

  // ── Lazy AudioContext init ────────────────────────────────────────────────
  const getAC = useCallback(() => {
    if (!acRef.current) {
      const ac = new AudioContext()
      acRef.current = ac

      const master = ac.createGain()
      master.gain.value = 0.85
      masterRef.current = master

      const streamDest = ac.createMediaStreamDestination()
      streamDestRef.current = streamDest

      // Dedicated conference send bus (mix-minus). Channels tap into this bus,
      // and the conference return channel is excluded dynamically.
      const conferenceSendBus = ac.createGain()
      conferenceSendBus.gain.value = 1.0
      conferenceSendBusRef.current = conferenceSendBus

      const conferenceSendDest = ac.createMediaStreamDestination()
      conferenceSendDestRef.current = conferenceSendDest

      const conferenceSendAnalyser = ac.createAnalyser()
      conferenceSendAnalyser.fftSize = 256
      conferenceSendAnalyser.smoothingTimeConstant = 0.85
      conferenceSendAnalyserRef.current = conferenceSendAnalyser

      conferenceSendBus.connect(conferenceSendAnalyser)
      conferenceSendAnalyser.connect(conferenceSendDest)

      // Raw conference return meter. This is intentionally separate from the
      // mixer channel analyser so it shows whether caller audio is arriving even
      // when the selected channel is muted, off, or has its fader down.
      const conferenceReturnAnalyser = ac.createAnalyser()
      conferenceReturnAnalyser.fftSize = 256
      conferenceReturnAnalyser.smoothingTimeConstant = 0.85
      conferenceReturnAnalyserRef.current = conferenceReturnAnalyser

      const conferencePgmAnalyser = ac.createAnalyser()
      conferencePgmAnalyser.fftSize = 256
      conferencePgmAnalyser.smoothingTimeConstant = 0.85
      conferencePgmAnalyserRef.current = conferencePgmAnalyser

      const conferenceCueAnalyser = ac.createAnalyser()
      conferenceCueAnalyser.fftSize = 256
      conferenceCueAnalyser.smoothingTimeConstant = 0.85
      conferenceCueAnalyserRef.current = conferenceCueAnalyser

      const conferenceReturnDest = ac.createMediaStreamDestination()
      conferenceReturnDestRef.current = conferenceReturnDest
      conferenceReturnAnalyser.connect(conferenceReturnDest)

      const savedConference = (() => {
        try { return JSON.parse(localStorage.getItem('mixer_conference') || 'null') || {} } catch { return {} }
      })()
      const confGain = ac.createGain()
      confGain.gain.value = (savedConference.gain ?? 0.5) * 2
      const confFader = ac.createGain()
      const confOn = savedConference.on ?? true
      const confMute = savedConference.mute ?? false
      const confFaderValue = savedConference.fader ?? 0.8
      confFader.gain.value = confOn && !confMute ? confFaderValue * confFaderValue : 0
      const confAnalyser = ac.createAnalyser()
      confAnalyser.fftSize = 256
      confAnalyser.smoothingTimeConstant = 0.8
      confGain.connect(confFader)
      confFader.connect(confAnalyser)
      confAnalyser.connect(master)
      conferenceNodesRef.current = { gainNode: confGain, faderNode: confFader, analyserNode: confAnalyser }

      // 3-band master EQ — inserted between master gain and master analyser
      const masterHi  = ac.createBiquadFilter()
      masterHi.type  = 'highshelf'; masterHi.frequency.value  = 8000; masterHi.gain.value  = 0
      const masterMid = ac.createBiquadFilter()
      masterMid.type = 'peaking';   masterMid.frequency.value = 1000; masterMid.Q.value    = 0.8; masterMid.gain.value = 0
      const masterLo  = ac.createBiquadFilter()
      masterLo.type  = 'lowshelf';  masterLo.frequency.value  = 200;  masterLo.gain.value  = 0
      master.connect(masterHi); masterHi.connect(masterMid); masterMid.connect(masterLo)
      masterEqRef.current = { hi: masterHi, mid: masterMid, lo: masterLo }

      // Master analyser — tap after the master EQ, before destination
      const masterAnalyser = ac.createAnalyser()
      masterAnalyser.fftSize = 256
      masterAnalyser.smoothingTimeConstant = 0.85
      masterAnalyserRef.current = masterAnalyser
      masterLo.connect(masterAnalyser)

      // Phones gain: local headphone/speaker path only — stream is NOT affected
      const phonesGain = ac.createGain()
      phonesGain.gain.value = 0.8   // default headphone level
      phonesGainRef.current = phonesGain
      phonesGain.connect(ac.destination)

      // mainToPhonesGain: switched OFF (gain=0) when CUE is held so only cue signal heard
      const mainToPhonesGain = ac.createGain()
      mainToPhonesGain.gain.value = 1.0
      mainToPhonesGainRef.current = mainToPhonesGain
      masterAnalyser.connect(mainToPhonesGain)
      mainToPhonesGain.connect(phonesGain)

      // Cue bus: deck signals tap here when CUE button held; feeds into phonesGain
      const cueBus = ac.createGain()
      cueBus.gain.value = 0.8   // cue level knob initial value
      cueBusRef.current = cueBus
      cueBus.connect(phonesGain)

      // Stream path — completely separate, never touched by phones/cue changes
      masterAnalyser.connect(streamDest)

      // Auto-resume if the OS suspends the context mid-playback
      ac.addEventListener('statechange', () => {
        if (ac.state === 'suspended') {
          ac.resume().catch(() => {})
        }
      })
    }
    return acRef.current
  }, [])

  // Resume suspended context (required after user gesture)
  const resume = useCallback(async () => {
    if (acRef.current?.state === 'suspended') {
      await acRef.current.resume()
    }
  }, [])

  // ── Auto-resume after sleep / tab-hidden / OS audio power events ─────────
  useEffect(() => {
    const tryResume = () => {
      const ac = acRef.current
      if (ac && ac.state === 'suspended') {
        ac.resume().catch(() => {})
      }
    }

    // When the tab becomes visible again (e.g. wake from sleep, switch back)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tryResume()
    }

    // When the window regains focus
    const onFocus = () => tryResume()

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  // ── Build/rebuild a channel's node chain ─────────────────────────────────
  const setupChannelNodes = useCallback((channelId, { gain, hi, mid, lo, pan, fader, on, mute }) => {
    const ac = getAC()

    // Disconnect old fader node from master bus if it exists
    if (channelNodes.current[channelId]) {
      try { channelNodes.current[channelId].faderNode.disconnect() } catch { /* ignore */ }
    }

    const gainNode = ac.createGain()
    gainNode.gain.value = (gain ?? 0.5) * 2

    const hiEQ = ac.createBiquadFilter()
    hiEQ.type = 'highshelf'
    hiEQ.frequency.value = 8000
    hiEQ.gain.value = ((hi ?? 0.5) - 0.5) * 24

    const midEQ = ac.createBiquadFilter()
    midEQ.type = 'peaking'
    midEQ.frequency.value = 1000
    midEQ.Q.value = 0.8
    midEQ.gain.value = ((mid ?? 0.5) - 0.5) * 24

    const loEQ = ac.createBiquadFilter()
    loEQ.type = 'lowshelf'
    loEQ.frequency.value = 200
    loEQ.gain.value = ((lo ?? 0.5) - 0.5) * 24

    const panNode = ac.createStereoPanner()
    panNode.pan.value = ((pan ?? 0.5) - 0.5) * 2

    const faderNode = ac.createGain()
    const isActive = (on ?? false) && !(mute ?? false)
    faderNode.gain.value = isActive ? (fader ?? 0) * (fader ?? 0) : 0

    // Chain: gainNode → hiEQ → midEQ → loEQ → pan → fader → master
    gainNode.connect(hiEQ)
    hiEQ.connect(midEQ)
    midEQ.connect(loEQ)
    loEQ.connect(panNode)
    panNode.connect(faderNode)

    // Per-channel analyser — post-fader so VU reflects what actually hits the bus
    const analyserNode = ac.createAnalyser()
    analyserNode.fftSize = 256
    analyserNode.smoothingTimeConstant = 0.8
    faderNode.connect(analyserNode)

    // Duck node — sits between analyser and master; reduced during mic on-air for
    // non-mic channels, except the conference return which must stay conversational.
    const isMicChannel = channelId <= 3
    const isConferenceChannel = confChannelIdRef.current === channelId
    const duckNode = ac.createGain()
    duckNode.gain.value = (!isMicChannel && !isConferenceChannel && isDuckedRef.current) ? 0.1 : 1.0
    analyserNode.connect(duckNode)
    duckNode.connect(masterRef.current)

    // Per-channel tap into conference send bus; excluded for conference return channel.
    const confSendNode = ac.createGain()
    confSendNode.gain.value = confChannelIdRef.current === channelId ? 0 : 1
    duckNode.connect(confSendNode)
    if (conferenceSendBusRef.current) {
      confSendNode.connect(conferenceSendBusRef.current)
    }

    const nodes = { gainNode, hiEQ, midEQ, loEQ, panNode, faderNode, analyserNode, duckNode, confSendNode }
    channelNodes.current[channelId] = nodes

    // Legacy support for older saved layouts that assigned Conference Room to a
    // line channel. The dedicated CONF strip is now the primary return.
    if (confChannelIdRef.current === channelId) {
      confSourcesRef.current.forEach((entry, sid) => {
        if (entry.sourceNode) { try { entry.sourceNode.disconnect() } catch { /* ignore */ } }
        const sourceNode = ac.createMediaStreamSource(entry.stream)
        sourceNode.connect(conferenceReturnAnalyserRef.current)
        sourceNode.connect(nodes.gainNode)
        confSourcesRef.current.set(sid, { stream: entry.stream, sourceNode })
      })
    }
  }, [getAC])

  // ── Smooth-update a single parameter on an existing channel ──────────────
  const updateChannelParam = useCallback((channelId, param, value) => {
    const nodes = channelNodes.current[channelId]
    if (!nodes || !acRef.current) return
    const t = acRef.current.currentTime
    switch (param) {
      case 'gain': nodes.gainNode.gain.setTargetAtTime(value * 2,            t, 0.01); break
      case 'hi':   nodes.hiEQ.gain.setTargetAtTime((value - 0.5) * 24,       t, 0.01); break
      case 'mid':  nodes.midEQ.gain.setTargetAtTime((value - 0.5) * 24,      t, 0.01); break
      case 'lo':   nodes.loEQ.gain.setTargetAtTime((value - 0.5) * 24,       t, 0.01); break
      case 'pan':  nodes.panNode.pan.setTargetAtTime((value - 0.5) * 2,      t, 0.01); break
    }
  }, [])

  // ── Gate the fader (called when on/mute/fader changes) ───────────────────
  const setChannelActive = useCallback((channelId, on, mute, fader) => {
    // Cache state so setMicOnAir can act without Mixer mounted
    channelStateRef.current[channelId] = { on, mute, fader }
    const nodes = channelNodes.current[channelId]
    if (!nodes || !acRef.current) return
    const target = (on && !mute) ? fader * fader : 0
    nodes.faderNode.gain.setTargetAtTime(target, acRef.current.currentTime, 0.02)
  }, [])

  // ── Per-deck EQ ──────────────────────────────────────────────────────────
  // ── Per-deck mix gain (fader × crossfader) — applied in graph so element.volume stays 1 ──
  const updateDeckMix = useCallback((key, value) => {
    const node = deckMixNodes.current[key]
    if (!node || !acRef.current) return
    node.gain.setTargetAtTime(Math.max(0, Math.min(1, value)), acRef.current.currentTime, 0.01)
  }, [])

  const updateDeckEq = useCallback((key, band, value) => {
    const eq = deckEqNodes.current[key]
    if (!eq || !acRef.current) return
    const t  = acRef.current.currentTime
    const dB = (value - 0.5) * 24
    switch (band) {
      case 'hi':  eq.hi.gain.setTargetAtTime(dB,  t, 0.01); break
      case 'mid': eq.mid.gain.setTargetAtTime(dB, t, 0.01); break
      case 'lo':  eq.lo.gain.setTargetAtTime(dB,  t, 0.01); break
    }
  }, [])

  // ── Master fader ─────────────────────────────────────────────────────────
  const updateMasterFader = useCallback((value) => {
    if (!masterRef.current || !acRef.current) return
    masterRef.current.gain.setTargetAtTime(value, acRef.current.currentTime, 0.02)
  }, [])

  // ── Pad bus — connect a sample pad directly to the master gain ───────────
  const connectPadAudio = useCallback((element) => {
    const ac = acRef.current
    if (!ac || !masterRef.current) return null
    try {
      const src = ac.createMediaElementSource(element)
      src.connect(masterRef.current)
      return src
    } catch { return null }
  }, [])

  // ── Master bus 3-band EQ ─────────────────────────────────────────────────
  const updateMasterEq = useCallback((band, value) => {
    const eq = masterEqRef.current
    if (!eq || !acRef.current) return
    const t  = acRef.current.currentTime
    const dB = (value - 0.5) * 24
    switch (band) {
      case 'hi':  eq.hi.gain.setTargetAtTime(dB,  t, 0.01); break
      case 'mid': eq.mid.gain.setTargetAtTime(dB, t, 0.01); break
      case 'lo':  eq.lo.gain.setTargetAtTime(dB,  t, 0.01); break
    }
  }, [])

  // ── Headphone / phones output level (local only — stream is never touched) ─
  const updatePhonesVol = useCallback((value) => {
    if (!phonesGainRef.current || !acRef.current) return
    phonesGainRef.current.gain.setTargetAtTime(value, acRef.current.currentTime, 0.02)
  }, [])

  // ── Cue bus level (how loud the cued deck is in headphones) ─────────────
  const updateCueVol = useCallback((value) => {
    if (!cueBusRef.current || !acRef.current) return
    cueBusRef.current.gain.setTargetAtTime(value, acRef.current.currentTime, 0.02)
  }, [])

  // ── Route a deck into / out of the cue bus (true switch: mutes main from phones while held) ─
  const setCueSend = useCallback((deckKey, active) => {
    const ac = acRef.current
    if (!ac || !cueBusRef.current || !mainToPhonesGainRef.current) return
    const src = mediaSources.current[deckKey]
    if (!src) return   // deck not yet connected — nothing to monitor

    // Create the per-deck cue send GainNode lazily
    if (!cueSendNodes.current[deckKey]) {
      const send = ac.createGain()
      send.gain.value = 0
      src.connect(send)
      send.connect(cueBusRef.current)
      cueSendNodes.current[deckKey] = send
    }

    const t = ac.currentTime
    if (active) {
      // Switch: silence main mix in headphones, open cue deck
      mainToPhonesGainRef.current.gain.setTargetAtTime(0,   t, 0.01)
      cueSendNodes.current[deckKey].gain.setTargetAtTime(1.0, t, 0.01)
    } else {
      // Switch back: close cue deck, restore main mix to headphones
      cueSendNodes.current[deckKey].gain.setTargetAtTime(0,   t, 0.01)
      mainToPhonesGainRef.current.gain.setTargetAtTime(1.0, t, 0.01)
    }
  }, [])

  // ── Register a media element so AudioEngine can create a source from it ──
  const registerMediaElement = useCallback((key, element) => {
    if (!element) return
    mediaElements.current[key] = element
    // Complete any pending DJ connection once both decks are available
    if (
      pendingDjChannel.current !== null &&
      mediaElements.current['dj-a'] &&
      mediaElements.current['dj-b']
    ) {
      const channelId = pendingDjChannel.current
      pendingDjChannel.current = null
      setDjConnected(true)
      const nodes = channelNodes.current[channelId]
      if (nodes) {
        const ac = getAC()
        ;['dj-a', 'dj-b'].forEach(k => {
          const el = mediaElements.current[k]
          if (!mediaSources.current[k]) {
            mediaSources.current[k] = ac.createMediaElementSource(el)
          }
          if (!deckAnalysers.current[k]) {
            const da = ac.createAnalyser()
            da.fftSize = 256
            da.smoothingTimeConstant = 0.8
            deckAnalysers.current[k] = da
          }
          if (!deckEqNodes.current[k]) {
            const ac2 = getAC()
            const hi  = ac2.createBiquadFilter(); hi.type  = 'highshelf'; hi.frequency.value  = 8000; hi.gain.value  = 0
            const mid = ac2.createBiquadFilter(); mid.type = 'peaking';   mid.frequency.value = 1000; mid.Q.value    = 0.8; mid.gain.value = 0
            const lo  = ac2.createBiquadFilter(); lo.type  = 'lowshelf';  lo.frequency.value  = 200;  lo.gain.value  = 0
            hi.connect(mid); mid.connect(lo)
            deckEqNodes.current[k] = { hi, mid, lo }
          }
          // deckMixNode: gain-controls the channel path pre-EQ so element.volume stays 1 (CUE taps pure pre-fader signal)
          if (!deckMixNodes.current[k]) {
            const mx = ac.createGain()
            mx.gain.value = 1.0
            deckMixNodes.current[k] = mx
          }
          const src = mediaSources.current[k]
          const dmx = deckMixNodes.current[k]
          const deq = deckEqNodes.current[k]
          const dka = deckAnalysers.current[k]
          try { src.disconnect(dmx) } catch { /* ignore */ }   // only unplug channel path; cueSendNode stays connected
          try { dmx.disconnect() } catch { /* ignore */ }
          try { deq.lo.disconnect() } catch { /* ignore */ }
          try { dka.disconnect() } catch { /* ignore */ }
          src.connect(dmx)
          dmx.connect(deq.hi)
          deq.lo.connect(dka)
          dka.connect(nodes.gainNode)
        })
      }
    }
  }, [getAC])

  // ── Auto-restore saved mixer config on mount ────────────────────────────
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mixer_channels') || '{}')
      Object.entries(saved).forEach(([id, ch]) => {
        if (parseInt(id) > 3 && ch?.sourceType === 'conference') saved[id] = { ...ch, sourceType: 'none' }
      })
      localStorage.setItem('mixer_channels', JSON.stringify(saved))

      Object.entries(saved).forEach(([idStr, ch]) => {
        if (!ch) return
        const id = parseInt(idStr)
        if (!isFinite(id)) return
        setupChannelNodes(id, ch)
        channelStateRef.current[id] = { on: ch.on ?? false, mute: ch.mute ?? false, fader: ch.fader ?? 0 }
        // Queue the DJ player connection — wiring completes in registerMediaElement once
        // both dj-a and dj-b elements are registered by Player
        const isMic = id <= 3
        if (!isMic && (ch.sourceType === 'dj' || ch.sourceType === 'podcast')) {
          pendingDjChannel.current = id
          setDjConnected(true)
        }
      })
    } catch { /* ignore */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Connect a DJ / media source to a mixer channel ─────────────────────────
  const connectSourceToChannel = useCallback((sourceType, channelId) => {
    const nodes = channelNodes.current[channelId]
    if (!nodes) return

    // 'dj' connects both decks (A and B) so the crossfader blend comes through
    // 'podcast' connects only deck A (the video/podcast element)
    const keys = sourceType === 'dj' ? ['dj-a', 'dj-b'] : sourceType === 'podcast' ? ['dj-a'] : [sourceType]
    if (!keys.every(k => k === 'dj-a' || k === 'dj-b')) return

    // Mark DJ as connected (user's intent is set — playback now allowed)
    setDjConnected(true)

    const ac = getAC()
    let anyMissing = false

    keys.forEach(key => {
      const el = mediaElements.current[key]
      if (!el) {
        anyMissing = true
        console.warn('[AudioEngine] media element not yet registered for', key)
        return
      }
      if (!mediaSources.current[key]) {
        mediaSources.current[key] = ac.createMediaElementSource(el)
      }
      // Create a deck-level analyser once per deck key
      if (!deckAnalysers.current[key]) {
        const da = ac.createAnalyser()
        da.fftSize = 256
        da.smoothingTimeConstant = 0.8
        deckAnalysers.current[key] = da
      }
      if (!deckEqNodes.current[key]) {
        const hi  = ac.createBiquadFilter(); hi.type  = 'highshelf'; hi.frequency.value  = 8000; hi.gain.value  = 0
        const mid = ac.createBiquadFilter(); mid.type = 'peaking';   mid.frequency.value = 1000; mid.Q.value    = 0.8; mid.gain.value = 0
        const lo  = ac.createBiquadFilter(); lo.type  = 'lowshelf';  lo.frequency.value  = 200;  lo.gain.value  = 0
        hi.connect(mid); mid.connect(lo)
        deckEqNodes.current[key] = { hi, mid, lo }
      }
      // deckMixNode: gain-controls the channel path pre-EQ so element.volume stays 1 (CUE taps pure pre-fader signal)
      if (!deckMixNodes.current[key]) {
        const mx = ac.createGain()
        mx.gain.value = 1.0
        deckMixNodes.current[key] = mx
      }
      const src = mediaSources.current[key]
      const dmx = deckMixNodes.current[key]
      const deq = deckEqNodes.current[key]
      const dka = deckAnalysers.current[key]
      try { src.disconnect(dmx) } catch { /* not yet connected */ }   // only unplug channel path; cueSendNode stays connected
      try { dmx.disconnect() } catch { /* not yet connected */ }
      try { deq.lo.disconnect() } catch { /* not yet connected */ }
      try { dka.disconnect() } catch { /* not yet connected */ }
      src.connect(dmx)
      dmx.connect(deq.hi)
      deq.lo.connect(dka)
      dka.connect(nodes.gainNode)
    })
  }, [getAC])

  // ── Enable / disable DJ-connect gate ─────────────────────────────────────
  const setDjActive = useCallback((active) => {
    setDjConnected(active)
  }, [])

  // ── Connect a physical mic/line-in device to a mixer channel ─────────────
  const connectMicToChannel = useCallback(async (channelId, deviceId) => {
    const nodes = channelNodes.current[channelId]
    if (!nodes) return
    const ac = getAC()

    // Tear down any existing stream on this channel
    const prev = micStreams.current[channelId]
    if (prev) {
      try { prev.sourceNode.disconnect() } catch { /* ignore */ }
      prev.stream.getTracks().forEach(t => t.stop())
      delete micStreams.current[channelId]
    }

    if (!deviceId) return

    try {
      if (ac.state === 'suspended') await ac.resume()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      const sourceNode = ac.createMediaStreamSource(stream)
      sourceNode.connect(nodes.gainNode)
      micStreams.current[channelId] = { stream, sourceNode }
    } catch (err) {
      console.warn('[AudioEngine] mic/line-in connect failed:', err)
    }
  }, [getAC])

  // connectLineInToChannel is the same as connectMicToChannel
  const connectLineInToChannel = connectMicToChannel

  const applyConferenceControl = useCallback((entry, nextControl = {}) => {
    if (!entry || !acRef.current) return
    const t = acRef.current.currentTime
    const control = {
      route: nextControl.route === 'pgm' ? 'pgm' : 'cue',
      gain: Number.isFinite(nextControl.gain) ? Math.max(0, Math.min(1, nextControl.gain)) : 0.8,
      muted: !!nextControl.muted,
    }
    const openGain = control.muted ? 0 : control.gain
    entry.pgmGainNode?.gain.setTargetAtTime(control.route === 'pgm' ? openGain : 0, t, 0.02)
    entry.cueGainNode?.gain.setTargetAtTime(control.route === 'cue' ? openGain : 0, t, 0.02)
    entry.control = control
  }, [])

  // ── Conference stream management ─────────────────────────────────────────
  // Connect one remote participant track (keyed by sid to prevent duplicates)
  const connectConferenceStream = useCallback((sid, mediaStreamTrack, meta = {}) => {
    if (!sid || !mediaStreamTrack) return

    // LiveKit can re-deliver a track with the same SID after reconnects.
    // Replace existing wiring so we don't keep a stale/silent source node.
    const existing = confSourcesRef.current.get(sid)
    if (existing?.sourceNode) {
      try { existing.sourceNode.disconnect() } catch {}
    }
    if (existing?.pgmGainNode) {
      try { existing.pgmGainNode.disconnect() } catch {}
    }
    if (existing?.cueGainNode) {
      try { existing.cueGainNode.disconnect() } catch {}
    }

    const participantId = meta.participantId || sid
    const stream = new MediaStream([mediaStreamTrack])
    const ac = getAC()
    const sourceNode = ac.createMediaStreamSource(stream)
    const pgmGainNode = ac.createGain()
    const cueGainNode = ac.createGain()

    sourceNode.connect(conferenceReturnAnalyserRef.current)
    sourceNode.connect(pgmGainNode)
    sourceNode.connect(cueGainNode)

    pgmGainNode.connect(conferencePgmAnalyserRef.current)
    if (conferenceNodesRef.current?.gainNode) {
      pgmGainNode.connect(conferenceNodesRef.current.gainNode)
    }
    if (confChannelIdRef.current !== null) {
      const nodes = channelNodes.current[confChannelIdRef.current]
      if (nodes) {
        pgmGainNode.connect(nodes.gainNode)
      }
    }
    cueGainNode.connect(conferenceCueAnalyserRef.current)
    if (cueBusRef.current) {
      cueGainNode.connect(cueBusRef.current)
    }

    const control = conferenceControlsRef.current.get(participantId) || { route: 'pgm', gain: 0.8, muted: false }
    const entry = { stream, sourceNode, pgmGainNode, cueGainNode, participantId, control }
    confSourcesRef.current.set(sid, entry)
    applyConferenceControl(entry, control)
  }, [applyConferenceControl, getAC])

  // Disconnect one track (participant left)
  const disconnectConferenceStream = useCallback((sid) => {
    const entry = confSourcesRef.current.get(sid)
    if (!entry) return
    if (entry.sourceNode) { try { entry.sourceNode.disconnect() } catch {} }
    if (entry.pgmGainNode) { try { entry.pgmGainNode.disconnect() } catch {} }
    if (entry.cueGainNode) { try { entry.cueGainNode.disconnect() } catch {} }
    confSourcesRef.current.delete(sid)
  }, [])

  // Disconnect all remote tracks, but keep the selected mixer return channel.
  // The channel assignment belongs to Mixer state; clearing it here makes the UI
  // say "Conference Room" while AudioEngine has no route for incoming callers.
  const disconnectAllConferenceStreams = useCallback(() => {
    confSourcesRef.current.forEach(({ sourceNode }) => {
      if (sourceNode) { try { sourceNode.disconnect() } catch {} }
    })
    confSourcesRef.current.forEach(({ pgmGainNode, cueGainNode }) => {
      if (pgmGainNode) { try { pgmGainNode.disconnect() } catch {} }
      if (cueGainNode) { try { cueGainNode.disconnect() } catch {} }
    })
    confSourcesRef.current.clear()
  }, [])

  // Disconnect conference from a channel (called when sourceType changes away)
  const disconnectConferenceFromChannel = useCallback((channelId) => {
    if (confChannelIdRef.current !== channelId) return
    confSourcesRef.current.forEach((entry) => {
      if (entry.sourceNode) { try { entry.sourceNode.disconnect() } catch {} }
      entry.sourceNode = null
      if (entry.pgmGainNode) { try { entry.pgmGainNode.disconnect() } catch {} }
      if (entry.cueGainNode) { try { entry.cueGainNode.disconnect() } catch {} }
      entry.pgmGainNode = null
      entry.cueGainNode = null
    })
    if (channelNodes.current[channelId]?.confSendNode && acRef.current) {
      channelNodes.current[channelId].confSendNode.gain.setTargetAtTime(1, acRef.current.currentTime, 0.02)
    }
    if (channelNodes.current[channelId]?.duckNode && acRef.current) {
      channelNodes.current[channelId].duckNode.gain.setTargetAtTime(isDuckedRef.current ? 0.1 : 1, acRef.current.currentTime, 0.02)
    }
    confChannelIdRef.current = null
  }, [])

  // ── Analyser getters ─────────────────────────────────────────────────────
  const getAnalyser = useCallback((channelId) => {
    return channelNodes.current[channelId]?.analyserNode ?? null
  }, [])

  const getMasterAnalyser = useCallback(() => {
    return masterAnalyserRef.current
  }, [])

  const getDeckAnalyser = useCallback((key) => {
    return deckAnalysers.current[key] ?? null
  }, [])

  // ── Get the stream output track (for WebRTC/recording) ───────────────────
  const getStreamTrack = useCallback(() => {
    getAC()
    return streamDestRef.current?.stream ?? null
  }, [getAC])

  // Separate mix-minus stream for conference publishing.
  const getConferenceSendTrack = useCallback(() => {
    getAC()
    return conferenceSendDestRef.current?.stream ?? null
  }, [getAC])

  const getConferenceSendAnalyser = useCallback(() => {
    getAC()
    return conferenceSendAnalyserRef.current
  }, [getAC])

  const getConferenceReturnAnalyser = useCallback(() => {
    getAC()
    return conferenceReturnAnalyserRef.current
  }, [getAC])

  const getConferencePgmAnalyser = useCallback(() => {
    getAC()
    return conferencePgmAnalyserRef.current
  }, [getAC])

  const getConferenceCueAnalyser = useCallback(() => {
    getAC()
    return conferenceCueAnalyserRef.current
  }, [getAC])

  const getConferenceAnalyser = useCallback(() => {
    getAC()
    return conferenceNodesRef.current?.analyserNode ?? null
  }, [getAC])

  const setupConferenceChannel = useCallback(() => {
    getAC()
    confSourcesRef.current.forEach((entry) => {
      if (entry.sourceNode && conferenceNodesRef.current?.gainNode) {
        try { entry.pgmGainNode?.connect(conferenceNodesRef.current.gainNode) } catch { /* already connected */ }
      }
    })
  }, [getAC])

  const setConferenceParticipantControl = useCallback((participantId, control) => {
    if (!participantId) return
    const current = conferenceControlsRef.current.get(participantId) || { route: 'pgm', gain: 0.8, muted: false }
    const next = {
      ...current,
      ...control,
      route: control?.route === 'pgm' ? 'pgm' : control?.route === 'cue' ? 'cue' : current.route,
      gain: Number.isFinite(control?.gain) ? Math.max(0, Math.min(1, control.gain)) : current.gain,
      muted: typeof control?.muted === 'boolean' ? control.muted : current.muted,
    }
    conferenceControlsRef.current.set(participantId, next)
    confSourcesRef.current.forEach((entry, sid) => {
      if (entry.participantId === participantId || sid === participantId) {
        applyConferenceControl(entry, next)
      }
    })
  }, [applyConferenceControl])

  const setConferenceActive = useCallback((on, mute, fader) => {
    getAC()
    const nodes = conferenceNodesRef.current
    if (!nodes || !acRef.current) return
    const target = on && !mute ? fader * fader : 0
    nodes.faderNode.gain.setTargetAtTime(target, acRef.current.currentTime, 0.02)
  }, [getAC])

  const updateConferenceGain = useCallback((gain) => {
    getAC()
    const nodes = conferenceNodesRef.current
    if (!nodes || !acRef.current) return
    nodes.gainNode.gain.setTargetAtTime(gain * 2, acRef.current.currentTime, 0.01)
  }, [getAC])

  const setConferenceSendMuted = useCallback((muted) => {
    getAC()
    conferenceSendMutedRef.current = !!muted
    if (!conferenceSendBusRef.current || !acRef.current) return
    conferenceSendBusRef.current.gain.setTargetAtTime(muted ? 0 : 1, acRef.current.currentTime, 0.02)
  }, [getAC])

  const getConferenceSendMuted = useCallback(() => {
    return !!conferenceSendMutedRef.current
  }, [])

  const getConferenceChannelId = useCallback(() => {
    if (conferenceNodesRef.current) {
      try {
        const saved = JSON.parse(localStorage.getItem('mixer_conference') || 'null') || {}
        const on = saved.on ?? true
        const mute = saved.mute ?? false
        return (on && !mute) ? 'dedicated' : null
      } catch {
        return 'dedicated'
      }
    }
    return confChannelIdRef.current
  }, [])

  // ── On-Air mic tracking (shared across NowPlaying + Mixer) ───────────────
  const [micOnAirMap, setMicOnAirMap] = useState({})

  // Duck/unduck non-mic program channels. The conference return stays full
  // level so callers remain audible while the station microphone is open.
  const duckLineChannels = useCallback((duck) => {
    isDuckedRef.current = duck
    if (!acRef.current) return
    const t = acRef.current.currentTime
    Object.entries(channelNodes.current).forEach(([id, nodes]) => {
      if (parseInt(id) <= 3) return // mic channels — never duck
      if (parseInt(id) === confChannelIdRef.current) return
      nodes.duckNode?.gain.setTargetAtTime(duck ? 0.1 : 1.0, t, 0.08)
    })
  }, [])

  const setMicOnAir = useCallback((channelId, bool) => {
    setMicOnAirMap(prev => {
      if (prev[channelId] === bool) return prev
      const next = { ...prev, [channelId]: bool }
      const anyMicOn = Object.values(next).some(v => v)
      duckLineChannels(anyMicOn)
      // Directly open/close the fader — works even when Mixer is not mounted
      const state = channelStateRef.current[channelId] ?? { mute: false, fader: 0.8 }
      setChannelActive(channelId, bool, state.mute, bool ? state.fader : state.fader)
      return next
    })
  }, [duckLineChannels, setChannelActive])

  // ── Recording ─────────────────────────────────────────────────────────────
  const recDirHandleRef = useRef(null)
  const [recDirName, setRecDirName] = useState(() => localStorage.getItem('recDirName') || '')
  const [recording, setRecording] = useState(false)
  const [recTime, setRecTime] = useState(0)
  const recMrRef     = useRef(null)
  const recChunksRef = useRef([])
  const recTimerRef  = useRef(null)

  const setRecDirHandle = useCallback((handle) => {
    recDirHandleRef.current = handle
    setRecDirName(handle.name)
    localStorage.setItem('recDirName', handle.name)
  }, [])

  const clearRecDirHandle = useCallback(() => {
    recDirHandleRef.current = null
    setRecDirName('')
    localStorage.removeItem('recDirName')
  }, [])

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  const startRec = useCallback((format = 'webm') => {
    getAC()
    const stream = streamDestRef.current?.stream ?? null
    if (!stream || stream.getAudioTracks().length === 0) return 'no-stream'

    const mimeType = format === 'ogg' ? 'audio/ogg; codecs=opus' : 'audio/webm; codecs=opus'
    let mr
    try {
      mr = new MediaRecorder(stream, { mimeType })
    } catch {
      try { mr = new MediaRecorder(stream) } catch { return 'unsupported' }
    }

    recChunksRef.current = []
    mr.ondataavailable = (e) => { if (e.data.size > 0) recChunksRef.current.push(e.data) }
    mr.onstop = async () => {
      clearInterval(recTimerRef.current)
      const actualMime = mr.mimeType || mimeType
      const blob = new Blob(recChunksRef.current, { type: actualMime })
      const ext = actualMime.includes('ogg') ? 'ogg' : 'webm'
      const filename = `mix-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`
      if (recDirHandleRef.current) {
        try {
          const fh = await recDirHandleRef.current.getFileHandle(filename, { create: true })
          const writable = await fh.createWritable()
          await writable.write(blob)
          await writable.close()
        } catch { downloadBlob(blob, filename) }
      } else {
        downloadBlob(blob, filename)
      }
      setRecTime(0)
      setRecording(false)
    }

    recMrRef.current = mr
    mr.start(1000)
    setRecording(true)
    setRecTime(0)
    recTimerRef.current = setInterval(() => setRecTime((t) => t + 1), 1000)
    return 'ok'
  }, [getAC])

  const stopRec = useCallback(() => {
    recMrRef.current?.stop()
  }, [])

  return (
    <AudioEngineCtx.Provider value={{
      setupChannelNodes,
      updateChannelParam,
      setChannelActive,
      updateMasterFader,
      connectPadAudio,
      updateMasterEq,
      updatePhonesVol,
      updateCueVol,
      setCueSend,
      registerMediaElement,
      connectSourceToChannel,
      connectMicToChannel,
      connectLineInToChannel,
      getStreamTrack,
      getConferenceSendTrack,
      getConferenceSendAnalyser,
      getConferenceReturnAnalyser,
      getConferencePgmAnalyser,
      getConferenceCueAnalyser,
      getConferenceAnalyser,
      setupConferenceChannel,
      setConferenceActive,
      updateConferenceGain,
      setConferenceParticipantControl,
      setConferenceSendMuted,
      getConferenceSendMuted,
      getConferenceChannelId,
      resume,
      djConnected,
      getAnalyser,
      getMasterAnalyser,
      getDeckAnalyser,
      updateDeckMix,
      updateDeckEq,
      setDjActive,
      micOnAirMap,
      setMicOnAir,
      // Recording
      recording,
      recTime,
      recDirName,
      setRecDirHandle,
      clearRecDirHandle,
      startRec,
      stopRec,
      // Conference streams
      connectConferenceStream,
      disconnectConferenceStream,
      disconnectAllConferenceStreams,
      disconnectConferenceFromChannel,
    }}>
      {children}
    </AudioEngineCtx.Provider>
  )
}

export function useAudioEngine() {
  return useContext(AudioEngineCtx)
}
