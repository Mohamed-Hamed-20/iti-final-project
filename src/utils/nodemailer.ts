import dotenv from "dotenv";
import nodemailer, { Transporter } from "nodemailer";
dotenv.config({ path: "../.env" });

interface IEmail {
  from?: string;
  to: string | string[];
  subject?: string;
  text?: string;
  html: string;
  message: string;
}
class EmailService implements IEmail {
  from: string;
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  message: string;
  private static transporterInstance: Transporter | null = null;

  constructor({
    to,
    subject = "No Subject",
    text = "",
    html = "<p>No Content</p>",
    message = "Please confirm your email",
  }: Partial<IEmail> & { to: string | string[] }) {
    this.from = String(process.env.EMAIL);
    this.to = to;
    this.subject = subject;
    this.text = text;
    this.html = html;
    this.message = message;
  }

  public static createTransporter(): Transporter {
    if (!this.transporterInstance) {
      this.transporterInstance = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL,
          pass: process.env.PASSWORD,
        },
      });
    }
    return this.transporterInstance;
  }

  public async send(): Promise<boolean> {
    try {
      const transporter = EmailService.createTransporter();
      const info = await transporter.sendMail({
        from: `${this.message} <${this.from}>`,
        to: this.to,
        subject: this.subject,
        text: this.text,
        html: this.html,
      });

      console.log("Email sent:", info.messageId);
      return info.accepted.length > 0;
    } catch (error) {
      console.error("Error sending email:", error);
      return false;
    }
  }
}

export default EmailService;
