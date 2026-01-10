import { Router, Request, Response, NextFunction } from 'express';
import { verifyToken } from '../middleware/jwt.handler';
import { BadRequestError } from '../middleware/error.handler';
import { ApiResponse } from '../core/api-response';
import { jitsiService } from '../services/jitsi.service';

export class JitsiRoute {
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get('/token', verifyToken, this.getJitsiToken);
  }

  private getJitsiToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const roomName = req.query.roomName as string;
      const isModerator = req.query.isModerator === 'true' || req.query.isModerator === '1';

      if (!roomName) {
        return next(BadRequestError('Room name is required'));
      }

      if (!user || !user.userId || !user.email) {
        return next(BadRequestError('User information is missing'));
      }

      const token = jitsiService.generateJitsiToken(
        {
          userId: user.userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        roomName,
        isModerator
      );

      res.status(200).json(ApiResponse({ token }, 'Jitsi token generated successfully'));
    } catch (error: any) {
      next(error);
    }
  };

  public getRouter(): Router {
    return this.router;
  }
}

export default JitsiRoute;

