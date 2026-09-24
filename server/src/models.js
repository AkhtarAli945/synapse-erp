import mongoose from "mongoose";
const { Schema, model } = mongoose;

export const User = model("User", new Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: String,
  perms: {
    leaveSignoff: { type: Boolean, default: true },
    paymentSignoff: { type: Boolean, default: true },
  },
}, { timestamps: true }));

export const Employee = model("Employee", new Schema({ name: String, role: String, dept: String }));
export const Leave = model("Leave", new Schema({
  employee: String, type: String, from: Date, to: Date,
  status: { type: String, default: "Pending" },
}));
export const Invoice = model("Invoice", new Schema({
  number: String, client: String, amount: Number, due: Date,
  status: { type: String, default: "Unpaid" }, paidAt: Date,
}));
export const Project = model("Project", new Schema({
  name: String, status: String, progress: Number, risk: String, owner: String,
}));
export const Approval = model("Approval", new Schema({
  user: Schema.Types.ObjectId, tool: String, args: Object, summary: String,
  agent: String, risk: String, status: { type: String, default: "Pending" },
}, { timestamps: true }));
export const Run = model("Run", new Schema({
  user: Schema.Types.ObjectId, prompt: String, route: String,
  steps: Array, ms: Number, status: String,
}, { timestamps: true }));
