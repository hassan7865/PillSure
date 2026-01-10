"use client";

import { JitsiMeeting } from "@jitsi/react-sdk";

interface JitsiVideoCallProps {
  roomName: string;
  displayName: string;
  onClose?: () => void;
  domain?: string;
}

export default function JitsiVideoCall({
  roomName,
  displayName,
  onClose,
  domain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si",
}: JitsiVideoCallProps) {
  const cleanRoomName =
    roomName.split(":")[0].replace(/[^a-zA-Z0-9]/g, "") || "PillsureRoom";

  return (
    <div className="w-full h-full">
      <JitsiMeeting
        domain={domain}
        roomName={cleanRoomName}
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
