import { AccessToken, VideoGrant } from 'livekit-server-sdk';

export class LiveKitService {
  async generateAccessToken(
    user: { userId: string; email: string; firstName?: string; lastName?: string },
    roomName: string,
    isModerator: boolean = false
  ): Promise<string> {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error('LiveKit configuration missing: LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set');
    }

    const cleanRoomName = roomName.replace(/[^a-zA-Z0-9]/g, '') || 'PillsureRoom';
    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    const identity = user.userId;

    // Create access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: identity,
      name: userName,
    });

    // Grant permissions
    const grant: VideoGrant = {
      room: cleanRoomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    };

    // If moderator, grant additional permissions
    if (isModerator) {
      grant.canUpdateOwnMetadata = true;
    }

    at.addGrant(grant);

    const token = await at.toJwt();

    console.log('[LiveKit] Generated token:', token);

    return token;
  }
}

export const livekitService = new LiveKitService();
