"use client";

import { useState, useEffect } from "react";
import { JaaSMeeting } from "@jitsi/react-sdk";
import { useAuth } from "@/contexts/auth-context";
import api from "@/lib/interceptor";
import Loader from "@/components/ui/loader";

interface JitsiVideoCallProps {
  roomName: string;
  displayName: string;
  isModerator?: boolean;
  onClose?: () => void;
}

export default function JitsiVideoCall({
  roomName,
  displayName,
  isModerator = false,
  onClose,
}: JitsiVideoCallProps) {
  const { user } = useAuth();
  const [jitsiToken, setJitsiToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const cleanRoomName = roomName.replace(/[^a-zA-Z0-9]/g, "") || "PillsureRoom";
  const appId = process.env.NEXT_PUBLIC_JAAS_APP_ID;

  useEffect(() => {
    const fetchJitsiToken = async () => {
      if (!user || !appId) {
        setError("Authentication or configuration missing");
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/jitsi/token', {
          params: {
            roomName: cleanRoomName,
            isModerator: isModerator ? 'true' : 'false',
          },
        });

        if (response.data?.data?.token) {
          setJitsiToken(response.data.data.token);
        } else {
          setError("Failed to get Jitsi token");
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to get Jitsi token");
      } finally {
        setLoading(false);
      }
    };

    fetchJitsiToken();
  }, [user, cleanRoomName, isModerator, appId]);

  if (!appId) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <p className="text-muted-foreground">JaaS App ID not configured. Please set NEXT_PUBLIC_JAAS_APP_ID in your environment variables.</p>
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

  if (error || !jitsiToken) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{error || "Failed to initialize meeting"}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <JaaSMeeting
        appId={appId}
        roomName={cleanRoomName}
        jwt={jitsiToken}
        useStaging={true}
        userInfo={{
          displayName,
          email: "",
        }}
        configOverwrite={{
          startWithAudioMuted: true,
          startWithVideoMuted: true,
        }}
        interfaceConfigOverwrite={{
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        }}
        getIFrameRef={(iframe) => {
          iframe.style.height = "100%";
          iframe.style.width = "100%";
        }}
      />
    </div>
  );
}
