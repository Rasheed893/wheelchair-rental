import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);
export const from = new Resend(process.env.EMAIL_FROM);
