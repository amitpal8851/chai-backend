import e from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = e();


//for cors
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(e.json({limit: "16kb"}));
app.use(e.urlencoded({extended: true, limit: "16kb"}));
app.use(e.static("public"));
app.use(cookieParser())


// routes import

import userRouter from "./routes/user.routes.js";

//routes declaration

app.use("/api/v1/users", userRouter)



export { app };