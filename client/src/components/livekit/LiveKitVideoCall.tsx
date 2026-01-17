"use client";

import { useState, useEffect } from "react";
import { RoomOptions, VideoPresets } from "livekit-client";
import { 
  LiveKitRoom, 
  RoomAudioRenderer,
  useRoomContext,
  useTracks,
  ParticipantTile,
  GridLayout,
  ControlBar,
  useParticipants,
  useLocalParticipant,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import { useAuth } from "@/contexts/auth-context";
import api from "@/lib/interceptor";
import Loader from "@/components/ui/loader";
import Image from "next/image";

interface LiveKitVideoCallProps {
  roomName: string;
  displayName: string;
  isModerator?: boolean;
  avatarUrl?: string | null;
  onClose?: () => void;
}

export default function LiveKitVideoCall({
  roomName,
  displayName,
  isModerator = false,
  avatarUrl: propAvatarUrl,
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
      <div className="w-full h-full flex items-center justify-center bg-background">
        <Loader 
          title="Loading Meeting"
          description="Initializing video call..."
        />
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{error || "Failed to initialize meeting"}</p>
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
    <div className="w-full h-full bg-black" data-lk-theme="default">
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
        <VideoConference displayName={displayName} avatarUrl={propAvatarUrl} onClose={onClose} />
      </LiveKitRoom>
    </div>
  );
}

function VideoConference({ displayName, avatarUrl, onClose }: { displayName: string; avatarUrl?: string | null; onClose?: () => void }) {
  const room = useRoomContext();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks(
    [Track.Source.Camera, Track.Source.ScreenShare],
    { onlySubscribed: false }
  );

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
      <div className="flex items-center justify-center h-full w-full bg-black">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Connecting to meeting...</p>
        </div>
      </div>
    );
  }

  if (room.state !== 'connected') {
    return (
      <div className="flex items-center justify-center h-full w-full bg-black">
        <div className="text-center text-white">
          <p className="text-lg">Connection error. Please try again.</p>
        </div>
      </div>
    );
  }

  const allParticipants = [...participants, localParticipant].filter(Boolean);

  return (
    <div className="flex flex-col h-full w-full bg-black">
      {/* Video Grid Area */}
      <div className="flex-1 overflow-hidden relative min-h-0">
        {tracks.length > 0 ? (
          <GridLayout 
            tracks={tracks} 
            className="h-full w-full"
            style={{ padding: '0.5rem', gap: '0.5rem' }}
          >
            <ParticipantTile />
          </GridLayout>
        ) : (
          <div className="flex items-center justify-center h-full w-full">
            <div className="text-center text-white">
              {avatarUrl ? (
                <div className="w-32 h-32 rounded-full overflow-hidden mx-auto mb-4 border-4 border-primary/30">
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 bg-gradient-to-br from-primary/40 to-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-primary/30">
                  <span className="text-5xl font-bold text-white">
                    {displayName?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <p className="text-lg mb-2 font-semibold">You're in the meeting</p>
              <p className="text-sm text-gray-400">Enable your camera to start video</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar - Always visible when connected */}
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
  );
}