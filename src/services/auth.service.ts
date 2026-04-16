// src/services/auth.service.ts

import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import type { RegisterInput, LoginInput } from "@/validators/auth.validator";
import type { AuthUser, LoginResponse } from "@/types";

export class AuthService {
  // ─── Register ─────────────────────────────────────────────
  async register(input: RegisterInput): Promise<LoginResponse> {
    // Check email uniqueness
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existing) {
      throw new Error("Email already registered");
    }

    const passwordHash = await hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        phone: input.phone,
        passwordHash,
        role: "CUSTOMER",
      },
    });

    const token = await signToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    };
  }

  // ─── Login ─────────────────────────────────────────────────
  async login(input: LoginInput): Promise<LoginResponse> {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      throw new Error("Invalid email or password");
    }

    const isValid = await compare(input.password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    const token = await signToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    };
  }

  // ─── Get profile ───────────────────────────────────────────
  async getProfile(userId: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });
    return user;
  }
}

export const authService = new AuthService();
