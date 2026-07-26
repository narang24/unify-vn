import { membersRouter } from "./routes/members.js";
app.use(env.apiPrefix, membersRouter);