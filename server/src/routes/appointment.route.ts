import { Router, Request, Response, NextFunction } from 'express';
import { appointmentService } from '../services/appointment.service';
import { verifyToken } from '../middleware/jwt.handler';
import { BadRequestError } from '../middleware/error.handler';
import { createSuccessResponse } from '../core/api-response';

export class AppointmentRoute {
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post('/', verifyToken, this.createAppointment);
    this.router.get('/patient', verifyToken, this.getPatientAppointments);
    this.router.get('/doctor/:doctorId', verifyToken, this.getDoctorAppointments);
    this.router.get('/doctor/:doctorId/stats', verifyToken, this.getDoctorAppointmentStats);
    this.router.get('/doctor/:doctorId/yearly-stats', verifyToken, this.getDoctorYearlyStats);
    this.router.get('/booked-slots/:doctorId/:date', this.getBookedSlots);
    this.router.get('/:id', verifyToken, this.getAppointmentById);
    this.router.put('/:id/status', verifyToken, this.updateAppointmentStatus);
    this.router.put('/:id/notes', verifyToken, this.updateAppointmentNotes);
    this.router.delete('/:id', verifyToken, this.deleteAppointment);
  }

  private createAppointment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = (req as any).user.userId;
      const data = req.body;

      if (!data.doctorId || !data.appointmentDate || !data.appointmentTime || !data.consultationMode) {
        return next(BadRequestError("Missing required fields"));
      }

      const result = await appointmentService.createAppointment(patientId, data);
      res.status(201).json(createSuccessResponse(result, "Appointment created successfully"));
    } catch (error) {
      next(error);
    }
  };

  private getPatientAppointments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = (req as any).user.userId;
      const status = req.query.status as string;

      const result = await appointmentService.getAppointmentsByPatient(patientId, status);
      res.status(200).json(createSuccessResponse(result, "Appointments retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private getDoctorAppointments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doctorId = req.params.doctorId;
      const status = req.query.status as string;

      const result = await appointmentService.getAppointmentsByDoctor(doctorId, status);
      res.status(200).json(createSuccessResponse(result, "Appointments retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private getDoctorAppointmentStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doctorId = req.params.doctorId;

      const result = await appointmentService.getAppointmentStats(doctorId);
      res.status(200).json(createSuccessResponse(result, "Appointment statistics retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private getDoctorYearlyStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doctorId = req.params.doctorId;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;

      const result = await appointmentService.getYearlyAppointmentStats(doctorId, year);
      res.status(200).json(createSuccessResponse(result, "Yearly appointment statistics retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private getAppointmentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const appointmentId = req.params.id;
      const userId = (req as any).user.userId;

      const result = await appointmentService.getAppointmentById(appointmentId, userId);
      res.status(200).json(createSuccessResponse(result, "Appointment retrieved successfully"));
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

      const validStatuses = ["pending", "confirmed", "cancelled", "completed", "no-show"];
      if (!validStatuses.includes(status)) {
        return next(BadRequestError("Invalid status"));
      }

      const result = await appointmentService.updateAppointmentStatus(appointmentId, userId, status, reason);
      res.status(200).json(createSuccessResponse(result, "Appointment status updated successfully"));
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
      res.status(200).json(createSuccessResponse(result, "Appointment notes updated successfully"));
    } catch (error) {
      next(error);
    }
  };

  private deleteAppointment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const appointmentId = req.params.id;
      const userId = (req as any).user.userId;

      const result = await appointmentService.deleteAppointment(appointmentId, userId);
      res.status(200).json(createSuccessResponse(result, "Appointment deleted successfully"));
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
      res.status(200).json(createSuccessResponse(result, "Booked slots retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  public getRouter(): Router {
    return this.router;
  }
}

export default AppointmentRoute;

