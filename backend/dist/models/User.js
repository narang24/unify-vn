import { Schema, model, models } from "mongoose";
const userSchema = new Schema({
    fullName: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    authProvider: { type: String, enum: ["local", "google", "github", "gitlab"], default: "local" },
}, { timestamps: true });
export const User = models.User ?? model("User", userSchema);
