import { baseProcedure, createTRPCRouter } from "../init";

export const appRouter = createTRPCRouter({
  healthcheck: baseProcedure.query(() => {
    return { status: "ok" };
  }),
});

export type AppRouter = typeof appRouter;
