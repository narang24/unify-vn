import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import { env } from "./config/env.js";
import { User } from "./models/User.js";
const app = express();
app.use(cors({
    origin: env.frontendUrl,
    credentials: true,
}));
app.use(express.json());
app.get("/health", (_request, response) => {
    response.json({
        service: env.serviceName,
        status: "ok",
        environment: env.nodeEnv,
        apiPrefix: env.apiPrefix,
        timestamp: new Date().toISOString(),
    });
});
app.post(`${env.apiPrefix}/auth/signup`, async (request, response) => {
    const { fullName, email, password } = request.body;
    if (!email || !password) {
        response.status(400).json({ error: "Email and password are required." });
        return;
    }
    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
        response.status(409).json({ error: "An account with this email already exists." });
        return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const createdUser = await User.create({
        fullName,
        email: normalizedEmail,
        passwordHash,
        authProvider: "local",
    });
    response.status(201).json({
        message: "Signup successful.",
        user: {
            id: createdUser._id,
            fullName: createdUser.fullName,
            email: createdUser.email,
            authProvider: createdUser.authProvider,
        },
    });
});
app.post(`${env.apiPrefix}/auth/signin`, async (request, response) => {
    const { email, password } = request.body;
    if (!email || !password) {
        response.status(400).json({ error: "Email and password are required." });
        return;
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
        response.status(404).json({ error: "No account found for this email." });
        return;
    }
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
        response.status(401).json({ error: "Invalid password." });
        return;
    }
    response.json({
        message: "Signin successful.",
        user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            authProvider: user.authProvider,
        },
    });
});
app.post(`${env.apiPrefix}/auth/social/:provider`, (request, response) => {
    const provider = request.params.provider;
    if (!["google", "github", "gitlab"].includes(provider)) {
        response.status(400).json({ error: "Unsupported provider." });
        return;
    }
    response.json({
        message: `${provider} sign-in triggered. Connect this route to OAuth later.`,
    });
});
async function startServer() {
    await mongoose.connect(env.mongoUri);
    app.listen(env.port, () => {
        console.log(`${env.serviceName} listening on http://localhost:${env.port}`);
    });
}
startServer().catch((error) => {
    console.error("Failed to start backend:", error);
    process.exit(1);
});
