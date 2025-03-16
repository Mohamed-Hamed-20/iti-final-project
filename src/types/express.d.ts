
import { Iuser } from "../DB/interfaces/user.interface";

declare global {
  namespace Express {
    interface Request {
      user?: Iuser;
    }
  }
}
