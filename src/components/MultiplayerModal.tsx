import React, { useState, useEffect } from 'react';
import {
  Users,
  Copy,
  Check,
  Radio,
  ArrowRight,
  Clock,
  Shield,
  Wifi,
  X,
  Sparkles,
} from 'lucide-react';
import { PlayerColor, MultiplayerRoomState } from '../types';

interface MultiplayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomState: MultiplayerRoomState;
  onCreateRoom: (timeControl: number, preferredColor: PlayerColor | 'random') => void;
  onJoinRoom: (roomCode: string) => void;
  onLeaveRoom: () => void;
  initialRoomCode?: string;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  isOpen,
  onClose,
  roomState,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  initialRoomCode = '',
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [selectedColor, setSelectedColor] = useState<PlayerColor | 'random'>('random');
  const [selectedTime, setSelectedTime] = useState<number>(300); // 5 min default
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (initialRoomCode) {
      setTab('join');
      setJoinCodeInput(initialRoomCode.toUpperCase().trim());
    }
  }, [initialRoomCode]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    if (!roomState.roomId) return;
    navigator.clipboard.writeText(roomState.roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!roomState.roomId) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${roomState.roomId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const isRoomActive = !!roomState.roomId;

  return (
    <div
      id="multiplayer-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        id="multiplayer-modal-dialog"
        className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col text-neutral-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                Online Multiplayer
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Peer-to-Peer
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Play in real-time with a friend on separate computers
              </p>
            </div>
          </div>
          <button
            id="multiplayer-modal-close"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {/* Active Room View (Host waiting or Guest connecting) */}
          {isRoomActive ? (
            <div className="flex flex-col items-center text-center py-4 space-y-6">
              {roomState.opponentConnected ? (
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <Wifi size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Opponent Connected!</h3>
                    <p className="text-sm text-neutral-400 mt-1">
                      Starting your match. You are playing as{' '}
                      <strong className="text-white">
                        {roomState.myColor === 'w' ? 'White' : 'Black'}
                      </strong>
                      .
                    </p>
                  </div>
                  <button
                    id="multiplayer-start-game-btn"
                    onClick={onClose}
                    className="mt-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition shadow-lg shadow-emerald-900/30"
                  >
                    Enter Match
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <Radio size={36} className="animate-pulse" />
                    </div>
                    <span className="absolute top-0 right-0 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {roomState.role === 'host'
                        ? 'Waiting for Opponent to Join...'
                        : 'Connecting to Host...'}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                      Share this Room Code or direct link with your friend on another computer.
                    </p>
                  </div>

                  {/* Room Code Card */}
                  <div className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col items-center gap-3">
                    <div className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">
                      Room Code
                    </div>
                    <div className="font-mono text-3xl font-extrabold tracking-wider text-indigo-400 select-all">
                      {roomState.roomId}
                    </div>

                    <div className="flex items-center gap-2 w-full pt-2">
                      <button
                        id="copy-room-code-btn"
                        onClick={handleCopyCode}
                        className="flex-1 py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-2 transition"
                      >
                        {copiedCode ? (
                          <>
                            <Check size={14} className="text-emerald-400" />
                            <span>Code Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Copy Code</span>
                          </>
                        )}
                      </button>

                      <button
                        id="copy-invite-link-btn"
                        onClick={handleCopyLink}
                        className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
                      >
                        {copiedLink ? (
                          <>
                            <Check size={14} className="text-emerald-200" />
                            <span>Link Copied!</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            <span>Copy Share Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {roomState.errorMessage && (
                    <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 px-3 py-2 rounded-lg w-full">
                      {roomState.errorMessage}
                    </div>
                  )}

                  <button
                    id="cancel-room-btn"
                    onClick={onLeaveRoom}
                    className="text-xs text-neutral-400 hover:text-neutral-200 underline transition"
                  >
                    Cancel Room & Return
                  </button>
                </>
              )}
            </div>
          ) : (
            /* Creation / Joining Tabs */
            <div>
              {/* Tab Selector */}
              <div className="grid grid-cols-2 gap-1 bg-neutral-950 p-1 rounded-xl mb-5 border border-neutral-800">
                <button
                  id="tab-create-room"
                  onClick={() => setTab('create')}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    tab === 'create'
                      ? 'bg-neutral-800 text-white shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Create Room
                </button>
                <button
                  id="tab-join-room"
                  onClick={() => setTab('join')}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    tab === 'join'
                      ? 'bg-neutral-800 text-white shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Join Room
                </button>
              </div>

              {tab === 'create' ? (
                <div className="space-y-4">
                  {/* Color Preference */}
                  <div>
                    <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider block mb-2">
                      Play As
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'w', label: 'White', desc: 'Moves first' },
                        { id: 'random', label: 'Random', desc: '50/50 chance' },
                        { id: 'b', label: 'Black', desc: 'Moves second' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setSelectedColor(opt.id as any)}
                          className={`p-3 rounded-xl border text-left transition ${
                            selectedColor === opt.id
                              ? 'bg-indigo-600/20 border-indigo-500 text-white'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          <div className="text-xs font-bold text-white">{opt.label}</div>
                          <div className="text-[10px] text-neutral-500">{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Control */}
                  <div>
                    <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                      <Clock size={14} /> Time Control
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { sec: 0, label: 'None' },
                        { sec: 180, label: '3 min' },
                        { sec: 300, label: '5 min' },
                        { sec: 600, label: '10 min' },
                      ].map((tc) => (
                        <button
                          key={tc.sec}
                          onClick={() => setSelectedTime(tc.sec)}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition ${
                            selectedTime === tc.sec
                              ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          {tc.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Host Button */}
                  <button
                    id="confirm-create-room-btn"
                    onClick={() => onCreateRoom(selectedTime, selectedColor)}
                    className="w-full mt-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-900/30"
                  >
                    <span>Generate Room Code</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider block mb-2">
                      Enter Friend's Room Code
                    </label>
                    <div className="relative">
                      <input
                        id="join-room-input"
                        type="text"
                        maxLength={8}
                        placeholder="e.g. 7X2M9K"
                        value={joinCodeInput}
                        onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-lg font-mono tracking-widest text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>

                  {roomState.errorMessage && (
                    <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 px-3 py-2 rounded-lg">
                      {roomState.errorMessage}
                    </div>
                  )}

                  <button
                    id="confirm-join-room-btn"
                    disabled={!joinCodeInput.trim()}
                    onClick={() => onJoinRoom(joinCodeInput.trim())}
                    className="w-full mt-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-600 text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-900/20"
                  >
                    <Shield size={16} />
                    <span>Connect & Play</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
