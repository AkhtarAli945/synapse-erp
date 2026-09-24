import "dotenv/config";
import mongoose from "mongoose";
import { Employee, Leave, Invoice, Project } from "./models.js";

const d = (n) => new Date(Date.now() + n * 864e5);

export async function seed(force = false) {
  if (!force && (await Invoice.countDocuments())) return;
  await Promise.all([Employee, Leave, Invoice, Project].map((m) => m.deleteMany({})));
  const names = ["Ali Raza", "Sara Khan", "Bilal Ahmed", "Hina Malik", "Usman Tariq", "Ayesha Noor", "Zain Abbas", "Fatima Shah", "Hamza Iqbal", "Maryam Ali", "Omar Farooq", "Nida Hassan"];
  await Employee.insertMany(names.map((name, i) => ({ name, role: ["Engineer", "Designer", "Accountant", "HR", "PM"][i % 5], dept: ["Tech", "Design", "Finance", "HR", "Ops"][i % 5] })));
  await Leave.insertMany([
    { employee: "Ali Raza", type: "Casual", from: d(18), to: d(20), status: "Pending" },
    { employee: "Hina Malik", type: "Casual", from: d(21), to: d(21), status: "Pending" },
    { employee: "Sara Khan", type: "Annual", from: d(25), to: d(29), status: "Approved" },
    { employee: "Bilal Ahmed", type: "Sick", from: d(-1), to: d(1), status: "Approved" },
    { employee: "Omar Farooq", type: "Casual", from: d(-2), to: d(0), status: "Approved" },
  ]);
  await Invoice.insertMany([
    { number: "INV-2038", client: "Techno Traders", amount: 320000, due: d(-6) },
    { number: "INV-2035", client: "Delta Logistics", amount: 150000, due: d(-2) },
    { number: "INV-2041", client: "Karachi Foods", amount: 240000, due: d(11) },
    { number: "INV-2043", client: "Nexa Labs", amount: 410000, due: d(18) },
    { number: "INV-2044", client: "Bright Edu", amount: 120000, due: d(25) },
    { number: "INV-2030", client: "Bright Edu", amount: 180000, due: d(-30), status: "Paid", paidAt: d(-24) },
    { number: "INV-2031", client: "Nexa Labs", amount: 260000, due: d(-20), status: "Paid", paidAt: d(-17) },
    { number: "INV-2033", client: "Karachi Foods", amount: 390000, due: d(-12), status: "Paid", paidAt: d(-9) },
    { number: "INV-2034", client: "Techno Traders", amount: 470000, due: d(-6), status: "Paid", paidAt: d(-2) },
  ]);
  await Project.insertMany([
    { name: "Client Portal", status: "todo", progress: 20, risk: "Low", owner: "Sara Khan" },
    { name: "API Docs", status: "todo", progress: 10, risk: "Low", owner: "Usman Tariq" },
    { name: "Website Revamp", status: "progress", progress: 55, risk: "High", owner: "Ali Raza" },
    { name: "Mobile App v2", status: "progress", progress: 70, risk: "Medium", owner: "Zain Abbas" },
    { name: "Payroll Automation", status: "progress", progress: 35, risk: "High", owner: "Ayesha Noor" },
    { name: "HR Module", status: "done", progress: 100, risk: "Low", owner: "Hina Malik" },
  ]);
  console.log("Demo data seeded.");
}

if (process.argv[1]?.endsWith("seed.js")) {
  await mongoose.connect(process.env.MONGODB_URI);
  await seed(true);
  await mongoose.disconnect();
}
