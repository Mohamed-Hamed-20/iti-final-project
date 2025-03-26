import { NextFunction, Request, Response } from "express";
import { CustomerSupportService } from "./customerSupport.service";
import { CustomError } from "../../../utils/errorHandling";

export class CustomerSupportController {
  private service = new CustomerSupportService();

  async createTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await this.service.createTicket(req.body);
      return res.status(201).json({
        message: "Ticket created successfully",
        success: true,
        ticket
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const tickets = await this.service.getAllTickets();
      return res.status(200).json({
        success: true,
        tickets
      });
    } catch (error) {
      next(error);
    }
  }

  async getTicketById(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await this.service.getTicketById(req.params.id);
      return res.status(200).json({
        success: true,
        ticket
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await this.service.updateTicket(req.params.id, req.body);
      return res.status(200).json({
        message: "Ticket updated successfully",
        success: true,
        ticket
      });
    } catch (error) {
      next(error);
    }
  }
}
