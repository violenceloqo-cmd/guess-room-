import { z } from "zod";
import { ROOM_COUNT } from "@knock-knock/shared";

export const guessSchema = z.object({
  wallet: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a 0x-prefixed EVM address"),
  room: z.number().int().min(1).max(ROOM_COUNT),
});
export type GuessBody = z.infer<typeof guessSchema>;

export const configSchema = z
  .object({
    poolEth: z.number().nonnegative().optional(),
    durationSeconds: z.number().int().positive().max(3600).optional(),
    lockBufferSeconds: z.number().int().nonnegative().max(60).optional(),
    rolloverOnNoWinner: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Provide at least one config field to update",
  });
export type ConfigBody = z.infer<typeof configSchema>;
