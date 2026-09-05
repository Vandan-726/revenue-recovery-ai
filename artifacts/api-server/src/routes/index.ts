import { Router, type IRouter } from "express";
import healthRouter from "./health";
import revenueRecoveryRouter from "./revenue-recovery";
import phase4Router from "./phase4";
import phase5Router from "./phase5";

const router: IRouter = Router();

router.use(healthRouter);
router.use(revenueRecoveryRouter);
router.use(phase4Router);
router.use(phase5Router);

export default router;
