import { baseProcedure, createTRPCRouter } from "../init";
import { jobsRouter } from "./jobs";

export const appRouter = createTRPCRouter({
  healthcheck: baseProcedure.query(() => {
    return { status: "ok" };
  }),
  jobs: jobsRouter,
});

export type AppRouter = typeof appRouter;
