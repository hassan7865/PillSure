import { Router, Request, Response, NextFunction } from "express";
import { ragService } from "../services/rag.service";
import { BadRequestError } from "../middleware/error.handler";
import { ApiResponse } from "../core/api-response";

export class RAGRoute {
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // POST /api/rag/recommend - Get medicine recommendations with full details
    this.router.post("/recommend", this.getRecommendations);
  }

  private getRecommendations = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { query } = req.body;

      if (!query || typeof query !== "string" || query.trim().length === 0) {
        return next(BadRequestError("Query is required and must be a non-empty string"));
      }

      if (query.trim().length < 3) {
        return next(BadRequestError("Query must be at least 3 characters long"));
      }

      if (query.length > 500) {
        return next(BadRequestError("Query must be less than 500 characters"));
      }

      const recommendations = await ragService.getRecommendationsWithMedicineDetails(
        query.trim()
      );

      res
        .status(200)
        .json(
          ApiResponse(
            recommendations,
            "Medicine recommendations retrieved successfully"
          )
        );
    } catch (error: any) {
      next(error);
    }
  };

  public getRouter(): Router {
    return this.router;
  }
}

export default RAGRoute;
