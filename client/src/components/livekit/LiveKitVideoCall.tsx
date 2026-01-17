"use client";

import { useState, useEffect, useMemo } from "react";
import { RoomOptions, VideoPresets } from "livekit-client";
import { 
  LiveKitRoom, 
  RoomAudioRenderer,
  useRoomContext,
  useTracks,
  ParticipantTile,
  ControlBar,
  useParticipants,
  useLocalParticipant,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import { useAuth } from "@/contexts/auth-context";
import api from "@/lib/interceptor";
import Loader from "@/components/ui/loader";

interface LiveKitVideoCallProps {
  roomName: string;
  displayName: string;
  isModerator?: boolean;
  onClose?: () => void;
}

export default function LiveKitVideoCall({
  roomName,
  displayName,
  isModerator = false,
  onClose,
}: LiveKitVideoCallProps) {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const cleanRoomName = roomName.replace(/[^a-zA-Z0-9]/g, "") || "PillsureRoom";
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  useEffect(() => {
    const fetchLiveKitToken = async () => {
      if (!user || !serverUrl) {
        setError("Authentication or configuration missing");
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/livekit/token', {
          params: {
            roomName: cleanRoomName,
            isModerator: isModerator ? 'true' : 'false',
          },
        });

        if (response.data?.data?.token) {
          setToken(response.data.data.token);
        } else {
          setError("Failed to get LiveKit token");
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to get LiveKit token");
      } finally {
        setLoading(false);
      }
    };

    fetchLiveKitToken();
  }, [user, cleanRoomName, isModerator, serverUrl]);

  if (!serverUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <p className="text-muted-foreground">
          LiveKit URL not configured. Please set NEXT_PUBLIC_LIVEKIT_URL in your environment variables.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading meeting...</p>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
        <p className="text-white">{error || "Failed to initialize meeting"}</p>
      </div>
    );
  }

  const roomOptions: RoomOptions = {
    videoCaptureDefaults: {
      resolution: VideoPresets.h720.resolution,
    },
    publishDefaults: {
      videoSimulcastLayers: [VideoPresets.h90, VideoPresets.h216],
    },
  };

  return (
    <div 
      className="w-full h-full bg-[#1a1a1a]" 
      data-lk-theme="default"
      style={{
        '--lk-bg': '#1a1a1a',
      } as React.CSSProperties}
    >
      <LiveKitRoom
        video={false}
        audio={false}
        token={token}
        serverUrl={serverUrl}
        connect={true}
        options={roomOptions}
        onDisconnected={() => {
          if (onClose) {
            onClose();
          }
        }}
        className="w-full h-full"
      >
        <RoomAudioRenderer />
        <VideoConference displayName={displayName} onClose={onClose} />
      </LiveKitRoom>
    </div>
  );
}

function VideoConference({ displayName, onClose }: { displayName: string; onClose?: () => void }) {
  const room = useRoomContext();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks(
    [Track.Source.Camera, Track.Source.ScreenShare],
    { onlySubscribed: false }
  );

  // Get all participants including local, avoiding duplicates
  // This must be called before any conditional returns (Rules of Hooks)
  const allParticipants = useMemo(() => {
    const participantMap = new Map();
    
    // Add local participant first if it exists
    if (localParticipant) {
      participantMap.set(localParticipant.identity || localParticipant.sid, localParticipant);
    }
    
    // Add remote participants, skipping if already added (local participant)
    participants.forEach((participant) => {
      const key = participant.identity || participant.sid;
      if (!participantMap.has(key)) {
        participantMap.set(key, participant);
      }
    });
    
    return Array.from(participantMap.values());
  }, [localParticipant, participants]);

  // Check if anyone is sharing their screen
  // MUST be called before any conditional returns (Rules of Hooks)
  const activeScreenShare = useMemo(() => {
    for (const participant of allParticipants) {
      const screenShareTrack = participant.getTrackPublication(Track.Source.ScreenShare);
      if (screenShareTrack && (screenShareTrack.track || screenShareTrack.isSubscribed)) {
        return {
          participant,
          publication: screenShareTrack,
        };
      }
    }
    return null;
  }, [allParticipants]);

  // Ensure screen share tracks are subscribed when published
  useEffect(() => {
    if (room.state === 'connected') {
      const subscribeToRemoteTracks = () => {
        participants.forEach((participant) => {
          participant.trackPublications.forEach((publication) => {
            // Only subscribe to remote tracks (not local)
            if ('setSubscribed' in publication && publication.kind === 'video' && !publication.isSubscribed) {
              try {
                (publication as any).setSubscribed(true);
              } catch (error) {
                console.error('Error subscribing to track:', error);
              }
            }
          });
        });
      };

      // Subscribe immediately
      subscribeToRemoteTracks();

      // Listen for track published events (including screen shares)
      const handleTrackPublished = () => {
        subscribeToRemoteTracks();
      };

      room.on('trackPublished', handleTrackPublished);

      return () => {
        room.off('trackPublished', handleTrackPublished);
      };
    }
  }, [room, room.state, participants]);

  // Disable camera and mic on connect
  useEffect(() => {
    if (room.state === 'connected' && localParticipant) {
      localParticipant.setCameraEnabled(false).catch(console.error);
      localParticipant.setMicrophoneEnabled(false).catch(console.error);
    }
  }, [room.state, localParticipant]);

  const handleLeave = () => {
    room.disconnect();
    if (onClose) {
      onClose();
    }
  };

  if (room.state === 'connecting' || room.state === 'reconnecting') {
    return (
      <div className="flex items-center justify-center h-full w-full bg-[#1a1a1a]">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Connecting to meeting...</p>
        </div>
      </div>
    );
  }

  if (room.state !== 'connected') {
    return (
      <div className="flex items-center justify-center h-full w-full bg-[#1a1a1a]">
        <div className="text-center text-white">
          <p className="text-lg">Connection error. Please try again.</p>
        </div>
      </div>
    );
  }

  // Calculate optimal grid columns based on participant count (Teams/Meet style)
  const getGridCols = (count: number) => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 9) return 'grid-cols-3';
    if (count <= 16) return 'grid-cols-4';
    return 'grid-cols-5';
  };

  return (
    <div 
      className="flex flex-col h-full w-full bg-[#1a1a1a]"
      style={{
        '--lk-bg': '#1a1a1a',
      } as React.CSSProperties}
    >
      {/* Video Grid Area - Teams/Meet Style */}
      <div className="flex-1 overflow-hidden relative min-h-0 bg-[#1a1a1a]">
        {activeScreenShare ? (
          // Full screen view when someone is sharing
          <div className="w-full h-full bg-[#1a1a1a]">
            <ParticipantTile
              trackRef={{
                participant: activeScreenShare.participant,
                publication: activeScreenShare.publication,
                source: Track.Source.ScreenShare,
              }}
              className="w-full h-full"
            />
          </div>
        ) : allParticipants.length > 0 ? (
          // Normal grid layout when no screen share
          <div className={`grid ${getGridCols(allParticipants.length)} gap-1 w-full h-full p-1`}>
            {allParticipants.map((participant) => {
              const cameraTrack = participant.getTrackPublication(Track.Source.Camera);
              const screenShareTrack = participant.getTrackPublication(Track.Source.ScreenShare);
              
              // Show camera track (or placeholder if no camera)
              const trackRef = cameraTrack?.track && cameraTrack.isSubscribed
                ? {
                    participant,
                    publication: cameraTrack,
                    source: Track.Source.Camera,
                  }
                : cameraTrack
                ? {
                    participant,
                    publication: cameraTrack,
                    source: Track.Source.Camera,
                  }
                : {
                    participant,
                    publication: undefined,
                    source: Track.Source.Camera,
                  };
              
              return (
                <div 
                  key={participant.identity || participant.sid} 
                  className="relative w-full h-full bg-[#2d2d2d] rounded overflow-hidden"
                >
                  <ParticipantTile
                    trackRef={trackRef}
                    className="w-full h-full"
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-[#1a1a1a]">
            <p className="text-white">Waiting for participants to join...</p>
          </div>
        )}
      </div>
      
      {/* Control Bar - Teams/Meet Style */}
      <div className="bg-[#1a1a1a] border-t border-gray-800">
        <ControlBar
          controls={{
            microphone: true,
            camera: true,
            screenShare: true,
            chat: false,
            leave: true,
          }}
        />
      </div>
    </div>
  );
}