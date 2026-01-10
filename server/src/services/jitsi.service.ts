import jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

export class JitsiService {
  private privateKey: string | null = null;

  private getPrivateKey(): string {
    if (this.privateKey) {
      return this.privateKey;
    }

    const keyPath = path.join(process.cwd(), 'pillsure.pk');
    
    if (!fs.existsSync(keyPath)) {
      throw new Error(`Private key file not found at ${keyPath}`);
    }

    this.privateKey = fs.readFileSync(keyPath, 'utf8');
    return this.privateKey;
  }

  generateJitsiToken(user: { userId: string; email: string; firstName?: string; lastName?: string }, roomName: string, isModerator: boolean = false) {
    const appId = process.env.JITSI_APP_ID;
    const apiKey = process.env.JITSI_API_KEY;

    if (!appId || !apiKey) {
      throw new Error('Jitsi configuration missing: JITSI_APP_ID and JITSI_API_KEY must be set');
    }

    const privateKey = this.getPrivateKey();
    const cleanRoomName = roomName && roomName !== '*' ? roomName.replace(/[^a-zA-Z0-9]/g, '') : '*';
    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    const subValue = appId;
    const kidValue = `${appId}/${apiKey}`;

    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 60 * 60;
    const nbf = iat - 5;

    const payload: any = {
      aud: 'jitsi',
      iss: 'chat',
      iat: iat,
      exp: exp,
      nbf: nbf,
      sub: subValue,
      context: {
        features: {
          livestreaming: false,
          'file-upload': false,
          'outbound-call': false,
          'sip-outbound-call': false,
          transcription: false,
          'list-visitors': false,
          recording: false,
          flip: false,
        },
        user: {
          'hidden-from-recorder': false,
          moderator: isModerator,
          name: userName,
          id: user.userId,
          avatar: '',
          email: user.email,
        },
      },
      room: cleanRoomName,
    };

    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: kidValue,
    };

    return jwt.sign(payload, privateKey, { 
      algorithm: 'RS256',
      header: header,
    });
  }
}

export const jitsiService = new JitsiService();

