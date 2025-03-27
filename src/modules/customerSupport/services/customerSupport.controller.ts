import { NextFunction, Request, Response } from "express";

import { CustomerSupportService } from "./customerSupport.service";

export class CustomerSupportController {
  private service = new CustomerSupportService();

  async createTicket(req: Request, res: Response, next: NextFunction) {
    const ticket = await this.service.createTicket(req.body);
    return res.status(201).json({
      message: "Ticket created successfully",
      success: true,
      data: {
        ticket,
        user: req.user 
      }
    });
  }

  async createTicketWithoutAuth(req: Request, res: Response, next: NextFunction) {
    const ticket = await this.service.createTicketWithoutAuth(req.body);
    return res.status(201).json({
      message: "Ticket created successfully",
      success: true,
      data: {
        ticket
      }
    });
  }

  async getAllTickets(req: Request, res: Response, next: NextFunction) {
    const tickets = await this.service.getAllTickets();
    return res.status(200).json({
      success: true,
      data: {
        tickets,
        user: req.user
      }
    });
  }

  async getTicketById(req: Request, res: Response, next: NextFunction) {
    const ticket = await this.service.getTicketById(req.params.id);
    return res.status(200).json({
      success: true,
      data: {
        ticket,
        user: req.user
      }
    });
  }

  async updateTicket(req: Request, res: Response, next: NextFunction) {
    const ticket = await this.service.updateTicket(req.params.id, req.body);
    return res.status(200).json({
      message: "Ticket updated successfully",
      success: true,
      data: {
        ticket,
        user: req.user
      }
    });
  }
}
