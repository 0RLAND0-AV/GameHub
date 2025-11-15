import { Router } from "express";
import { healthCheck } from "./helthCheck.controller";

const router = Router();

router.get("/healthCheck", healthCheck);

export default router;
