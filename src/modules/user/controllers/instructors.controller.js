// import userModel from "../DB/models/user.model";
import userModel from "../../../DB/models/user.model";

export const instructor = async (req,res)=>{
    try {
        const users = await userModel.find({role: "instructor"}).select("-password");
        res.status(200).json({message: "all instructors" , status: "success" , data: users});
    } catch (error) {
        res.status(400).json({message: "error" , status: "Failed" , error});
    }
}
