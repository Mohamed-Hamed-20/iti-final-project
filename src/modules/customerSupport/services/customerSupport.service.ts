import { ICustomerSupport } from "../../../DB/interfaces/customerSupport.interface";
import customerSupportModel from "../../../DB/models/customerSupport.model";
import { CustomError } from "../../../utils/errorHandling";

export class CustomerSupportService {
  async createTicket(ticketData: ICustomerSupport) {
    const ticket = await customerSupportModel.create(ticketData);
    if (!ticket) throw new CustomError("Failed to create ticket", 400);
    return ticket;
  }

  async createTicketWithoutAuth(ticketData: ICustomerSupport) {
    const ticket = await customerSupportModel.create({
      ...ticketData,
      status: "open", // Set default status
      createdAt: new Date(),
      isAuthenticated: false // Flag to indicate non-authenticated ticket
    });
    
    if (!ticket) throw new CustomError("Failed to create ticket", 400);
    return ticket;
  }

  async getAllTickets() {
    const tickets = await customerSupportModel.find().populate("assignedTo");
    if (!tickets) throw new CustomError("No tickets found", 404);
    return tickets;
  }
  async getTicketById(id: string) {
    const ticket = await customerSupportModel.findById(id).populate("assignedTo");
    if (!ticket) throw new CustomError("Ticket not found", 404);
    return ticket;
  }

  async updateTicket(id: string, updateData: Partial<ICustomerSupport>) {
    const ticket = await customerSupportModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate("assignedTo");
    if (!ticket) throw new CustomError("Ticket not found", 404);
    return ticket;
  }
}
