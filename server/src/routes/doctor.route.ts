import { Router, Request, Response } from 'express';
import { doctorService } from '../services/doctor.service';

export class DoctorRoute {
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Get all specializations (public endpoint)
    this.router.get('/specializations', this.getSpecializations);
  }

  private getSpecializations = async (req: Request, res: Response) => {
    try {
      const result = await doctorService.getAllSpecializations();
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get specializations"
      });
    }
  };


  public getRouter(): Router {
    return this.router;
  }
}

export default DoctorRoute;
