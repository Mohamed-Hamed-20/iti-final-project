import { NextFunction, Request, Response } from "express";
import { createNotification } from "../../notification/notification.controller";
import { CustomerSupportService } from "./customerSupport.service";
import S3Instance from "../../../utils/aws.sdk.s3";

export class CustomerSupportController {
  private service = new CustomerSupportService();

  async createTicket(req: Request, res: Response, next: NextFunction) {
    const createdBy = req.user?._id;
    const ticket = await this.service.createTicket({...req.body, createdBy});
    
    // Create notification for the ticket
    if (req.user?._id) {
      await createNotification(req.user._id.toString(), ticket._id.toString());
    }
    const s3Instance = new S3Instance();
    if (ticket.createdBy?.avatar) {
      ticket.createdBy.url = await s3Instance.getFile(
        ticket.createdBy.avatar
      );
    }

    

    return res.status(201).json({
      message: "Ticket created successfully",
      success: true,
      data: {
        ...ticket,
        createdBy: {
          ...ticket.createdBy,
          url: ticket.createdBy?.url || null,
        },
        user: req.user,
      },
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
      ticket,
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
