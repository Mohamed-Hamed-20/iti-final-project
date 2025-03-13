import dotenv from "dotenv";

dotenv.config();



export const databaseConfigration = {
    DB_URL: process.env.DB_URL || "mongodb://localhost:27017/app",
}

export const NODE_ENV = process.env.NODE_ENV || "development";


export const PORT = Number(process.env.PORT) || 5000;

export const ApiDocumentation = process.env.ApiDocumentation || "https://www.youtube.com/watch?v=tpv35Uia4tc";


export const TokenConfigration = {
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  ACCESS_EXPIRE: process.env.ACCESS_EXPIRE,
  REFRESH_EXPIRE: process.env.REFRESH_EXPIRE,
};


export const EmailSendConfigration = {
  EMAIL: process.env.EMAIL,
  PASSWORD: process.env.PASSWORD,
};