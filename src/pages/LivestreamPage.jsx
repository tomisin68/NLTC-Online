import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, onSnapshot, addDoc, collection, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useBackendFetch } from '../hooks/useBackendFetch';
import { showToast } from '../contexts/ToastContext';
import '../styles/livestream.css';

const REACTIONS = ['👏','🔥','❤️','😮','😂'];

export default function LivestreamPage() {
  const { sessionId } = useParams();
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const backendFetch = useBackendFetch();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [panel, setPanel] = useState('chat'); // 'chat' | 'people' | 'hands'
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [handRaised, setHandRaised] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [flyingReactions, setFlyingReactions] = useState([]);
  const [muted, setMuted] = useState(true);
  const [camOff, setCamOff] = useState(true);
  const [networkQuality, setNetworkQuality] = useState(null);

  const clientRef = useRef(null);
  const localTracksRef = useRef({ audio: null, video: null });
  const remoteUsersRef = useRef({});
  const chatEndRef = useRef(null);
  const xpAwardedRef = useRef(false);
  const reactionIdRef = useRef(0);

  const isHost = userData?.role === 'admin';
  const AGORA_APP_ID = '5eae75b2cc3d48cc84446b94d3877f88';

  // Load session
  useEffect(() => {
    if (!sessionId) return;
    const unsub = onSnapshot(doc(db, 'liveSessions', sessionId), snap => {
      if (!snap.exists()) { navigate('/dashboard'); return; }
      setSession({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
    return unsub;
  }, [sessionId, navigate]);

  // Real-time chat
  useEffect(() => {
    if (!sessionId) return;
    const unsub = onSnapshot(
      collection(db, 'liveSessions', sessionId, 'messages'),
      snap => {
        const msgs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
        setMessages(msgs);
      }
    );
    return unsub;
  }, [sessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const joinStream = useCallback(async () => {
    if (joining || joined) return;
    setJoining(true);
    try {
      const { data } = await backendFetch('POST', '/agora/token', {
        channel: session.channel,
        role: isHost ? 'host' : 'audience',
      });

      const AgoraRTC = window.AgoraRTC;
      if (!AgoraRTC) throw new Error('Agora SDK not loaded');

      const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
      clientRef.current = client;

      await client.setClientRole(isHost ? 'host' : 'audience');

      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        remoteUsersRef.current[user.uid] = user;
        if (mediaType === 'video') {
          const container = document.getElementById(`remote-${user.uid}`);
          if (container) user.videoTrack?.play(container);
        }
        if (mediaType === 'audio') user.audioTrack?.play();
        setParticipants(prev => {
          const exists = prev.find(p => p.uid === user.uid);
          return exists ? prev : [...prev, { uid: user.uid, name: `Student ${user.uid}` }];
        });
      });

      client.on('user-unpublished', (user) => {
        setParticipants(prev => prev.filter(p => p.uid !== user.uid));
      });

      client.on('network-quality', (stats) => {
        setNetworkQuality(stats.uplinkNetworkQuality);
      });

      await client.join(AGORA_APP_ID, session.channel, data.token, currentUser.uid);

      if (isHost) {
        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        localTracksRef.current = { audio: audioTrack, video: videoTrack };
        await client.publish([audioTrack, videoTrack]);
        videoTrack.play('local-video');
        setMuted(false);
        setCamOff(false);
      }

      setJoined(true);
      await updateDoc(doc(db, 'liveSessions', sessionId), { viewerCount: increment(1) });

      if (!xpAwardedRef.current && !isHost) {
        xpAwardedRef.current = true;
        backendFetch('POST', '/gamification/xp', { action: 'join_live' }).catch(() => {});
      }
    } catch (err) {
      showToast(err.message || 'Failed to join stream', 'error');
    } finally {
      setJoining(false);
    }
  }, [session, isHost, joined, joining, currentUser, backendFetch, sessionId]);

  const leaveStream = useCallback(async () => {
    try {
      const { audio, video } = localTracksRef.current;
      audio?.stop(); audio?.close();
      video?.stop(); video?.close();
      await clientRef.current?.leave();
    } catch {}
    await updateDoc(doc(db, 'liveSessions', sessionId), { viewerCount: increment(-1) }).catch(() => {});
    setJoined(false);
    navigate('/dashboard');
  }, [sessionId, navigate]);

  useEffect(() => {
    return () => {
      const { audio, video } = localTracksRef.current;
      audio?.stop(); audio?.close();
      video?.stop(); video?.close();
      clientRef.current?.leave().catch(() => {});
    };
  }, []);

  const toggleMic = async () => {
    const { audio } = localTracksRef.current;
    if (!audio) return;
    if (muted) { await audio.setEnabled(true); setMuted(false); }
    else { await audio.setEnabled(false); setMuted(true); }
  };

  const toggleCam = async () => {
    const { video } = localTracksRef.current;
    if (!video) return;
    if (camOff) { await video.setEnabled(true); setCamOff(false); }
    else { await video.setEnabled(false); setCamOff(true); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');
    try {
      await addDoc(collection(db, 'liveSessions', sessionId, 'messages'), {
        text,
        uid: currentUser.uid,
        name: currentUser.displayName || userData?.name || 'Student',
        avatar: currentUser.photoURL || null,
        createdAt: serverTimestamp(),
        type: 'chat',
      });
    } catch { showToast('Failed to send message', 'error'); }
  };

  const sendReaction = async (emoji) => {
    const id = ++reactionIdRef.current;
    setFlyingReactions(prev => [...prev, { id, emoji }]);
    setTimeout(() => setFlyingReactions(prev => prev.filter(r => r.id !== id)), 2000);
    await addDoc(collection(db, 'liveSessions', sessionId, 'messages'), {
      text: emoji,
      uid: currentUser.uid,
      name: currentUser.displayName || userData?.name || 'Student',
      createdAt: serverTimestamp(),
      type: 'reaction',
    }).catch(() => {});
  };

  const raiseHand = async () => {
    const next = !handRaised;
    setHandRaised(next);
    if (next) {
      await addDoc(collection(db, 'liveSessions', sessionId, 'messages'), {
        text: '✋ raised their hand',
        uid: currentUser.uid,
        name: currentUser.displayName || userData?.name || 'Student',
        createdAt: serverTimestamp(),
        type: 'system',
      }).catch(() => {});
    }
  };

  if (loading) return (
    <div className="ls-loading">
      <div className="ls-loading-spinner" />
      <p>Loading session…</p>
    </div>
  );

  if (!session) return null;

  const isLive = session.status === 'live';

  return (
    <div className="ls-root">
      {/* Flying reactions */}
      <div className="ls-reactions-overlay" aria-hidden>
        {flyingReactions.map(r => (
          <span key={r.id} className="ls-fly-reaction">{r.emoji}</span>
        ))}
      </div>

      {/* Main area */}
      <div className="ls-main">
        {/* Video stage */}
        <div className="ls-stage">
          <div className="ls-stage-inner">
            {isHost ? (
              <div id="local-video" className="ls-video-slot ls-local" />
            ) : (
              Object.keys(remoteUsersRef.current).length > 0 ? (
                Object.values(remoteUsersRef.current).map(u => (
                  <div key={u.uid} id={`remote-${u.uid}`} className="ls-video-slot" />
                ))
              ) : (
                <div className="ls-no-video">
                  <div className="ls-host-avatar">
                    {session.hostName?.[0] || 'T'}
                  </div>
                  <p>{joined ? 'Waiting for host video…' : 'Ready to join'}</p>
                </div>
              )
            )}

            {/* Overlay badges */}
            <div className="ls-stage-overlays">
              <div className="ls-live-badge">
                {isLive ? <><span className="ls-pulse" />LIVE</> : 'ENDED'}
              </div>
              <div className="ls-viewer-count">
                <i className="fas fa-eye" /> {session.viewerCount || 0}
              </div>
              {networkQuality !== null && (
                <div className={`ls-net-badge ls-net-${networkQuality}`}>
                  <i className="fas fa-wifi" />
                </div>
              )}
            </div>

            {/* Session info bar */}
            <div className="ls-info-bar">
              <div className="ls-info-title">{session.title}</div>
              <div className="ls-info-subject">{session.subject}</div>
            </div>
          </div>

          {/* Controls */}
          <div className="ls-controls">
            <div className="ls-controls-left">
              <button className="ls-ctrl-btn ls-ctrl-exit" onClick={leaveStream} title="Leave">
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="ls-controls-center">
              {isHost && (
                <>
                  <button className={`ls-ctrl-btn${muted ? ' ls-ctrl-off' : ''}`} onClick={toggleMic} title={muted ? 'Unmute' : 'Mute'}>
                    <i className={`fas fa-microphone${muted ? '-slash' : ''}`} />
                  </button>
                  <button className={`ls-ctrl-btn${camOff ? ' ls-ctrl-off' : ''}`} onClick={toggleCam} title={camOff ? 'Start cam' : 'Stop cam'}>
                    <i className={`fas fa-video${camOff ? '-slash' : ''}`} />
                  </button>
                </>
              )}
              {!isHost && (
                <button className={`ls-ctrl-btn${handRaised ? ' ls-ctrl-active' : ''}`} onClick={raiseHand} title="Raise hand">
                  ✋
                </button>
              )}
              <div className="ls-reactions-bar">
                {REACTIONS.map(r => (
                  <button key={r} className="ls-react-btn" onClick={() => sendReaction(r)}>{r}</button>
                ))}
              </div>
            </div>

            <div className="ls-controls-right">
              {!joined && isLive && (
                <button className="ls-join-btn" onClick={joinStream} disabled={joining}>
                  {joining ? <><span className="ls-join-spin" />Joining…</> : <><i className="fas fa-play" /> Join</>}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="ls-panel">
          <div className="ls-panel-tabs">
            {['chat','people','hands'].map(t => (
              <button
                key={t}
                className={`ls-panel-tab${panel === t ? ' active' : ''}`}
                onClick={() => setPanel(t)}
              >
                {t === 'chat' && <><i className="fas fa-comments" /> Chat</>}
                {t === 'people' && <><i className="fas fa-users" /> People ({participants.length + 1})</>}
                {t === 'hands' && <>✋ Hands</>}
              </button>
            ))}
          </div>

          {panel === 'chat' && (
            <div className="ls-chat">
              <div className="ls-chat-messages">
                {messages.filter(m => m.type !== 'reaction').map(m => (
                  <div key={m.id} className={`ls-chat-msg${m.type === 'system' ? ' ls-system-msg' : ''}${m.uid === currentUser.uid ? ' ls-chat-mine' : ''}`}>
                    {m.type !== 'system' && m.uid !== currentUser.uid && (
                      <div className="ls-chat-avatar">
                        {m.avatar
                          ? <img src={m.avatar} alt="" />
                          : <span>{(m.name||'?')[0]}</span>
                        }
                      </div>
                    )}
                    <div className="ls-chat-bubble">
                      {m.type !== 'system' && m.uid !== currentUser.uid && (
                        <div className="ls-chat-name">{m.name}</div>
                      )}
                      {m.type === 'system'
                        ? <span className="ls-sys-text"><b>{m.name}</b> {m.text}</span>
                        : <span>{m.text}</span>
                      }
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              {joined ? (
                <form className="ls-chat-form" onSubmit={sendMessage}>
                  <input
                    className="ls-chat-input"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Type a message…"
                    maxLength={300}
                  />
                  <button className="ls-chat-send" type="submit">
                    <i className="fas fa-paper-plane" />
                  </button>
                </form>
              ) : (
                <div className="ls-chat-join-prompt">Join the class to chat</div>
              )}
            </div>
          )}

          {panel === 'people' && (
            <div className="ls-people">
              <div className="ls-person ls-person-host">
                <div className="ls-person-avatar ls-person-host-avatar">
                  {session.hostName?.[0] || 'T'}
                </div>
                <div className="ls-person-info">
                  <div className="ls-person-name">{session.hostName || 'Host'}</div>
                  <div className="ls-person-role">Host</div>
                </div>
                <i className="fas fa-crown ls-host-crown" />
              </div>
              {joined && (
                <div className="ls-person ls-person-me">
                  <div className="ls-person-avatar">
                    {currentUser.photoURL
                      ? <img src={currentUser.photoURL} alt="" />
                      : (currentUser.displayName || userData?.name || 'Y')[0]
                    }
                  </div>
                  <div className="ls-person-info">
                    <div className="ls-person-name">{currentUser.displayName || userData?.name || 'You'} (You)</div>
                    <div className="ls-person-role">Student</div>
                  </div>
                </div>
              )}
              {participants.map(p => (
                <div key={p.uid} className="ls-person">
                  <div className="ls-person-avatar">{p.name[0]}</div>
                  <div className="ls-person-info">
                    <div className="ls-person-name">{p.name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {panel === 'hands' && (
            <div className="ls-hands">
              {messages.filter(m => m.type === 'system' && m.text?.includes('raised their hand')).length === 0 ? (
                <div className="ls-hands-empty">No hands raised yet</div>
              ) : (
                messages.filter(m => m.type === 'system' && m.text?.includes('raised their hand')).map(m => (
                  <div key={m.id} className="ls-person">
                    <div className="ls-person-avatar">{(m.name||'?')[0]}</div>
                    <div className="ls-person-info">
                      <div className="ls-person-name">{m.name}</div>
                    </div>
                    <span style={{ fontSize: '1.2rem' }}>✋</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pre-join overlay */}
      {!joined && (
        <div className="ls-prejoin">
          <div className="ls-prejoin-card">
            <div className="ls-prejoin-icon">📡</div>
            <h2 className="ls-prejoin-title">{session.title}</h2>
            <p className="ls-prejoin-subject">{session.subject}</p>
            {isLive ? (
              <>
                <div className="ls-prejoin-live"><span className="ls-pulse" /> Live now • {session.viewerCount || 0} watching</div>
                <button className="btn-gold ls-prejoin-btn" onClick={joinStream} disabled={joining}>
                  {joining ? 'Joining…' : 'Join Class'}
                </button>
              </>
            ) : (
              <div className="ls-prejoin-ended">This session has ended.</div>
            )}
            <button className="btn-outline ls-prejoin-back" onClick={() => navigate('/dashboard')}>
              <i className="fas fa-arrow-left" /> Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
