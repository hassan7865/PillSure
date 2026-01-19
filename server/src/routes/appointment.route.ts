import { Router, Request, Response, NextFunction } from 'express';
import { appointmentService } from '../services/appointment.service';
import { doctorService } from '../services/doctor.service';
import { verifyToken } from '../middleware/jwt.handler';
import { BadRequestError } from '../middleware/error.handler';
import { ApiResponse } from '../core/api-response';

export class AppointmentRoute {
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post('/', verifyToken, this.createAppointment);
    this.router.get('/patient', verifyToken, this.getPatientAppointments);
    this.router.get('/patient/:patientId/completed', verifyToken, this.getCompletedAppointmentsByPatientId);
    this.router.get('/patient/status/stream', verifyToken, this.streamPatientAppointmentStatus);
    // Endpoints for current doctor (uses JWT userId)
    this.router.get('/doctor/appointments', verifyToken, this.getCurrentDoctorAppointments);
    this.router.get('/doctor/stats', verifyToken, this.getCurrentDoctorAppointmentStats);
    this.router.get('/doctor/yearly-stats', verifyToken, this.getCurrentDoctorYearlyStats);
    this.router.get('/booked-slots/:doctorId/:date', this.getBookedSlots);
    this.router.get('/:id', verifyToken, this.getAppointmentById);
    this.router.put('/:id/status', verifyToken, this.updateAppointmentStatus);
    this.router.put('/:id/notes', verifyToken, this.updateAppointmentNotes);
    this.router.delete('/:id', verifyToken, this.deleteAppointment);
    this.router.get('/:id/prescription', verifyToken, this.getPrescriptionByAppointmentId);
  }

  private createAppointment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = (req as any).user.userId;
      const data = req.body;

      if (!data.doctorId || !data.appointmentDate || !data.appointmentTime || !data.consultationMode) {
        return next(BadRequestError("Missing required fields"));
      }

      const result = await appointmentService.createAppointment(patientId, data);
      res.status(201).json(ApiResponse(result, "Appointment created successfully"));
    } catch (error) {
      next(error);
    }
  };

  private getPatientAppointments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = (req as any).user.userId;
      const status = req.query.status as string;

      const result = await appointmentService.getAppointmentsByPatient(patientId, status);
      res.status(200).json(ApiResponse(result, "Appointments retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private getCompletedAppointmentsByPatientId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = req.params.patientId;

      if (!patientId) {
        return next(BadRequestError("Patient ID is required"));
      }

      const result = await appointmentService.getCompletedAppointmentsByPatientId(patientId);
      res.status(200).json(ApiResponse(result, "Completed appointments retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private getCurrentDoctorAppointments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const userRole = (req as any).user.role;
      
      if (userRole !== 'doctor') {
        return next(BadRequestError("This endpoint is only available for doctors"));
      }

      const status = req.query.status as string;
      const result = await appointmentService.getAppointmentsByDoctorUserId(userId, status);
      res.status(200).json(ApiResponse(result, "Appointments retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private getCurrentDoctorAppointmentStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const userRole = (req as any).user.role;
      
      if (userRole !== 'doctor') {
        return next(BadRequestError("This endpoint is only available for doctors"));
      }

      const result = await appointmentService.getAppointmentStatsByUserId(userId);
      res.status(200).json(ApiResponse(result, "Appointment statistics retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private getCurrentDoctorYearlyStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const userRole = (req as any).user.role;
      
      if (userRole !== 'doctor') {
        return next(BadRequestError("This endpoint is only available for doctors"));
      }

      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const result = await appointmentService.getYearlyAppointmentStatsByUserId(userId, year);
      res.status(200).json(ApiResponse(result, "Yearly appointment statistics retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private getAppointmentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const appointmentId = req.params.id;
      const userId = (req as any).user.userId;

      const result = await appointmentService.getAppointmentById(appointmentId, userId);
      res.status(200).json(ApiResponse(result, "Appointment retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private updateAppointmentStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const appointmentId = req.params.id;
      const userId = (req as any).user.userId;
      const { status, reason } = req.body;

      if (!status) {
        return next(BadRequestError("Status is required"));
      }

      const validStatuses = ["pending", "confirmed", "cancelled", "completed", "no-show", "in_progress"];
      if (!validStatuses.includes(status)) {
        return next(BadRequestError("Invalid status"));
      }

      const result = await appointmentService.updateAppointmentStatus(appointmentId, userId, status, reason);
      res.status(200).json(ApiResponse(result, "Appointment status updated successfully"));
    } catch (error) {
      next(error);
    }
  };

  private updateAppointmentNotes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const appointmentId = req.params.id;
      const doctorId = (req as any).user.userId;
      const data = req.body;

      const result = await appointmentService.updateAppointmentNotes(appointmentId, doctorId, data);
      res.status(200).json(ApiResponse(result, "Appointment notes updated successfully"));
    } catch (error) {
      next(error);
    }
  };

  private deleteAppointment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const appointmentId = req.params.id;
      const userId = (req as any).user.userId;

      const result = await appointmentService.deleteAppointment(appointmentId, userId);
      res.status(200).json(ApiResponse(result, "Appointment deleted successfully"));
    } catch (error) {
      next(error);
    }
  };

  private getBookedSlots = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { doctorId, date } = req.params;

      if (!doctorId || !date) {
        return next(BadRequestError("Doctor ID and date are required"));
      }

      const result = await appointmentService.getBookedSlots(doctorId, date);
      res.status(200).json(ApiResponse(result, "Booked slots retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private streamPatientAppointmentStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      
      if (!user || !user.userId || user.role !== 'patient') {
        res.status(403).end();
        return;
      }

      const patientId = user.userId;
      const { addSSEConnection, removeSSEConnection } = await import('../config/sse');
      
      addSSEConnection(patientId, res);
      
      req.on('close', () => {
        removeSSEConnection(patientId);
      });
      
      req.on('aborted', () => {
        removeSSEConnection(patientId);
      });
    } catch (error) {
      next(error);
    }
  };

  private getPrescriptionByAppointmentId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const appointmentId = req.params.id;
      const userId = (req as any).user.userId;
      // Optionally, validate user access to this appointment
      const prescription = await appointmentService.getPrescriptionByAppointmentId(appointmentId);
      res.status(200).json(ApiResponse(prescription, "Prescription retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  public getRouter(): Router {
    return this.router;
  }
}

export default AppointmentRoute;

